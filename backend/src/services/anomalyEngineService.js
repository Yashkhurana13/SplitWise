// backend/src/services/anomalyEngineService.js

// Simple Levenshtein distance for string similarity
const getSimilarity = (s1, s2) => {
  const a = s1.toLowerCase();
  const b = s2.toLowerCase();
  if (a === b) return 1;
  // A very crude similarity for "Dinner at Thalassa" vs "Thalassa dinner"
  const aWords = a.split(/[\s-]+/);
  const bWords = b.split(/[\s-]+/);
  const common = aWords.filter(w => bWords.includes(w)).length;
  return common / Math.max(aWords.length, bWords.length);
};

const detectAnomalies = async (parsedRows, existingExpenses, groupMembers) => {
  const anomalies = []; // Array of { rowIndex, type, description, severity }
  
  for (let i = 0; i < parsedRows.length; i++) {
    const row = parsedRows[i];

    // 1. MISSING_DATA (Currency or Payer)
    if (!row.currency) {
      anomalies.push({ rowIndex: i, type: 'MISSING_DATA', severity: 'Medium', description: 'Currency is missing. Will fallback to INR.' });
    }
    if (!row.paid_by) {
      anomalies.push({ rowIndex: i, type: 'MISSING_DATA', severity: 'High', description: 'Paid_by is missing. Cannot process expense.' });
    }

    // 2. ZERO or NEGATIVE AMOUNTS
    if (row.amount === 0) {
      anomalies.push({ rowIndex: i, type: 'ZERO_AMOUNT', severity: 'High', description: 'Amount is 0.' });
    } else if (row.amount < 0) {
      anomalies.push({ rowIndex: i, type: 'NEGATIVE_AMOUNT', severity: 'High', description: `Amount is negative (${row.amount}). Is this a refund?` });
    }

    // 3. MATH_ERROR (Percentages > 100)
    if (row.split_type === 'PERCENTAGE' && row.split_details) {
      // e.g. "Aisha 30%; Rohan 30%; Priya 30%; Meera 20%"
      const parts = row.split_details.match(/\d+(\.\d+)?%/g) || [];
      let totalPct = 0;
      parts.forEach(p => totalPct += parseFloat(p));
      if (Math.abs(totalPct - 100) > 0.01) {
        anomalies.push({ rowIndex: i, type: 'MATH_ERROR', severity: 'High', description: `Percentages sum to ${totalPct}% instead of 100%.` });
      }
    }

    // 4. CONFLICTING_SPLIT
    if (row.split_type === 'EQUAL' && row.split_details && !row.split_details.includes('%')) {
      // It says equal but details are provided (often means shares)
      anomalies.push({ rowIndex: i, type: 'CONFLICTING_SPLIT', severity: 'Medium', description: 'Split type is EQUAL but custom split details are provided.' });
    }

    // 5. SETTLEMENT
    const isSettlementNote = row.description.toLowerCase().includes('paid back') || row.description.toLowerCase().includes('deposit');
    if ((row.split_with.length === 1 && !row.split_type) || isSettlementNote) {
      anomalies.push({ rowIndex: i, type: 'SETTLEMENT', severity: 'High', description: 'Appears to be a direct settlement repayment rather than a shared expense.' });
    }

    // 6. MEMBERSHIP VIOLATIONS
    // Check if payer or split_with users are not in groupMembers
    const involvedNames = new Set([row.paid_by, ...row.split_with]);
    for (const name of involvedNames) {
      if (!name) continue; // Skip empty
      // Find member by name roughly
      const member = groupMembers.find(m => m.user.name.toLowerCase() === name.toLowerCase() || m.user.name.toLowerCase().startsWith(name.toLowerCase()));
      if (!member) {
        anomalies.push({ rowIndex: i, type: 'MEMBER_UNKNOWN', severity: 'High', description: `User '${name}' is not in the system or group.` });
      } else {
        // Timeline validation
        const rowTime = row.date.getTime();
        const joinedTime = new Date(member.joinedAt).getTime();
        const leftTime = member.leftAt ? new Date(member.leftAt).getTime() : Infinity;
        if (rowTime < joinedTime || rowTime > leftTime) {
          anomalies.push({ rowIndex: i, type: 'MEMBER_INACTIVE', severity: 'High', description: `User '${name}' was inactive on ${row.date.toISOString().split('T')[0]}.` });
        }
      }
    }

    // 7. DUPLICATES (Compare against existing AND parsed rows)
    // Check against existing database
    let foundDup = false;
    for (const ex of existingExpenses) {
      const exTime = new Date(ex.createdAt).getTime(); // Wait, Expense has createdAt, but we need transaction date. For now assume createdAt is transaction date
      const rowTime = row.date.getTime();
      const diffHours = Math.abs(exTime - rowTime) / (1000 * 60 * 60);
      
      if (diffHours <= 48 && Math.abs(Number(ex.originalAmount || ex.amount) - row.amount) < 1) {
        const sim = getSimilarity(ex.title, row.description);
        if (sim > 0.6) {
          anomalies.push({ rowIndex: i, type: 'DUPLICATE', severity: 'High', description: `Possible duplicate of existing expense ID: ${ex.id}.` });
          foundDup = true;
        }
      }
    }
    
    // Check against rows parsed *before* this one in the same CSV
    if (!foundDup) {
      for (let j = 0; j < i; j++) {
        const prevRow = parsedRows[j];
        const diffHours = Math.abs(prevRow.date.getTime() - row.date.getTime()) / (1000 * 60 * 60);
        if (diffHours <= 48 && Math.abs(prevRow.amount - row.amount) < 1) {
          const sim = getSimilarity(prevRow.description, row.description);
          if (sim > 0.6) {
            anomalies.push({ rowIndex: i, type: 'DUPLICATE_CONFLICT', severity: 'High', description: `Conflicts with row ${j + 1} (${prevRow.description}).` });
          }
        }
      }
    }
  }

  return anomalies;
};

module.exports = {
  detectAnomalies
};
