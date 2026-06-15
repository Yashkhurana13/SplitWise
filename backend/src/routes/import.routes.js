const express = require('express');
const router = express.Router();
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const { parseImportedCSV } = require('../services/csvParserService');
const { detectAnomalies } = require('../services/anomalyEngineService');
const { convertToBaseCurrency } = require('../services/currencyService');

const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/:groupId', upload.single('csvFile'), async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // 1. Create Import Job
    const importJob = await prisma.importJob.create({
      data: {
        groupId,
        fileName: req.file.originalname,
        status: 'PARSING'
      }
    });

    // 2. Fetch dependencies for Anomaly Engine
    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId },
      include: { user: true }
    });
    
    // For simplicity, we fetch all expenses in the group to check duplicates
    const existingExpenses = await prisma.expense.findMany({
      where: { groupId }
    });

    // 3. Parse CSV
    let parsedRows;
    try {
      parsedRows = parseImportedCSV(req.file.buffer);
    } catch (err) {
      await prisma.importJob.update({
        where: { id: importJob.id },
        data: { status: 'FAILED' }
      });
      return res.status(400).json({ error: 'Failed to parse CSV format.', details: err.message });
    }

    // 4. Run Anomaly Engine
    const rawAnomalies = await detectAnomalies(parsedRows, existingExpenses, groupMembers);

    // 5. Build Expenses and map Anomalies
    const createdExpenses = [];
    const createdAnomalies = [];

    // First map User names to IDs to create splits correctly
    const nameToId = {};
    groupMembers.forEach(m => {
      nameToId[m.user.name.toLowerCase()] = m.userId;
    });

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const rowAnomalies = rawAnomalies.filter(a => a.rowIndex === i);
      
      // Determine SplitMethod
      let splitMethod = 'EQUAL';
      if (row.split_type === 'PERCENTAGE') splitMethod = 'PERCENTAGE';
      else if (row.split_type === 'UNEQUAL') splitMethod = 'UNEQUAL';
      else if (row.split_type === 'SHARE' || row.split_type === 'SHARES') splitMethod = 'SHARES';

      // Currency Conversion
      const currencyResult = convertToBaseCurrency(row.amount, row.currency, 'INR');

      // Attempt to resolve payerId
      const payerId = nameToId[row.paid_by?.toLowerCase()] || groupMembers[0]?.userId;

      // Save Expense as PENDING
      const newExpense = await prisma.expense.create({
        data: {
          groupId,
          payerId,
          amount: currencyResult.convertedAmount,
          title: row.description || 'Untitled Expense',
          description: row.notes,
          splitMethod,
          status: 'PENDING',
          originalAmount: row.amount,
          originalCurrency: currencyResult.originalCurrency,
          exchangeRate: currencyResult.exchangeRate,
          rawCSVRow: row.rawRow,
          importJobId: importJob.id,
          createdAt: row.date // Use the CSV date
        }
      });
      createdExpenses.push(newExpense);

      // Save associated anomalies
      for (const anomaly of rowAnomalies) {
        createdAnomalies.push({
          expenseId: newExpense.id,
          importJobId: importJob.id,
          type: anomaly.type,
          description: anomaly.description,
          severity: anomaly.severity
        });
      }
    }

    if (createdAnomalies.length > 0) {
      await prisma.anomaly.createMany({ data: createdAnomalies });
    }

    // 6. Update Import Job Status
    await prisma.importJob.update({
      where: { id: importJob.id },
      data: { status: 'AWAITING_APPROVAL' }
    });

    // 7. Generate Import Report
    const report = {
      importJobId: importJob.id,
      fileName: req.file.originalname,
      timestamp: new Date(),
      totalRows: parsedRows.length,
      importedRows: parsedRows.length,
      pendingRows: parsedRows.length,
      rejectedRows: 0,
      approvedRows: 0,
      anomaliesDetected: createdAnomalies.length,
      anomaliesDetails: createdAnomalies
    };

    res.json(report);

  } catch (error) {
    console.error('Import Error:', error);
    res.status(500).json({ error: 'Internal server error during import' });
  }
});

// GET Import Report
router.get('/:jobId/report', async (req, res) => {
  try {
    const job = await prisma.importJob.findUnique({
      where: { id: req.params.jobId },
      include: {
        expenses: {
          include: { anomalies: true }
        },
        anomalies: true
      }
    });
    if (!job) return res.status(404).json({ error: 'Import Job not found' });

    let pendingRows = 0, rejectedRows = 0, approvedRows = 0;
    job.expenses.forEach(ex => {
      if (ex.status === 'PENDING') pendingRows++;
      if (ex.status === 'REJECTED') rejectedRows++;
      if (ex.status === 'APPROVED') approvedRows++;
    });

    res.json({
      importJobId: job.id,
      fileName: job.fileName,
      timestamp: job.uploadedAt,
      totalRows: job.expenses.length,
      importedRows: job.expenses.length,
      pendingRows,
      rejectedRows,
      approvedRows,
      anomaliesDetected: job.anomalies.length,
      anomaliesDetails: job.anomalies
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
