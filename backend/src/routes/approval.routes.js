const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Approve an individual expense
router.post('/expenses/:id/approve', async (req, res) => {
  try {
    const expenseId = req.params.id;
    const { action, resolutionNote, overrideData } = req.body; 
    // action: "APPROVE", "REJECT", "CONVERT_TO_SETTLEMENT"

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { anomalies: true }
    });

    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    if (expense.status !== 'PENDING') return res.status(400).json({ error: 'Expense is not PENDING' });

    if (action === 'REJECT') {
      await prisma.expense.update({
        where: { id: expenseId },
        data: { status: 'REJECTED' }
      });
      await prisma.anomaly.updateMany({
        where: { expenseId },
        data: { resolved: true, resolutionNote: resolutionNote || 'Rejected by user' }
      });
      return res.json({ success: true, message: 'Expense rejected' });
    }

    if (action === 'CONVERT_TO_SETTLEMENT') {
      // In a full implementation, we'd delete the Expense and create a Settlement.
      // For this assignment, we mark the expense rejected, create the settlement, and mark anomaly resolved.
      const raw = JSON.parse(expense.rawCSVRow);
      // Assuming single split_with
      const payeeName = raw.split_with.split(';')[0].trim();
      
      const groupMembers = await prisma.groupMember.findMany({
        where: { groupId: expense.groupId },
        include: { user: true }
      });
      const payee = groupMembers.find(m => m.user.name.toLowerCase() === payeeName.toLowerCase());
      
      if (!payee) return res.status(400).json({ error: 'Payee not found for settlement' });

      await prisma.$transaction([
        prisma.settlement.create({
          data: {
            groupId: expense.groupId,
            payerId: expense.payerId,
            payeeId: payee.userId,
            amount: expense.amount
          }
        }),
        prisma.expense.update({
          where: { id: expenseId },
          data: { status: 'REJECTED' }
        }),
        prisma.anomaly.updateMany({
          where: { expenseId },
          data: { resolved: true, resolutionNote: 'Converted to Settlement' }
        })
      ]);
      return res.json({ success: true, message: 'Converted to settlement' });
    }

    if (action === 'APPROVE') {
      // Data overrides (like user fixed Math error)
      const finalAmount = overrideData?.amount || expense.amount;
      const finalTitle = overrideData?.title || expense.title;
      
      // We must generate the ExpenseSplits here so the Balance Engine can read them.
      // For simplicity in this demo, if EQUAL, we divide by N active members.
      const raw = JSON.parse(expense.rawCSVRow);
      const splitNames = raw.split_with ? raw.split_with.split(';').map(s=>s.trim()) : [];
      
      const groupMembers = await prisma.groupMember.findMany({
        where: { groupId: expense.groupId },
        include: { user: true }
      });

      const validMembers = groupMembers.filter(m => splitNames.some(n => n.toLowerCase() === m.user.name.toLowerCase()));
      if (validMembers.length === 0) return res.status(400).json({ error: 'No valid members to split with' });

      const splitAmount = Number(finalAmount) / validMembers.length;
      
      const splits = validMembers.map(m => ({
        expenseId: expense.id,
        userId: m.userId,
        amountOwed: splitAmount
      }));

      await prisma.$transaction([
        prisma.expense.update({
          where: { id: expenseId },
          data: { status: 'APPROVED', amount: finalAmount, title: finalTitle }
        }),
        prisma.expenseSplit.createMany({
          data: splits
        }),
        prisma.anomaly.updateMany({
          where: { expenseId },
          data: { resolved: true, resolutionNote: resolutionNote || 'Manually approved' }
        })
      ]);

      return res.json({ success: true, message: 'Expense approved and ledger updated' });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
