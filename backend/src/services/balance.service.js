const calculateBalances = (expenses, settlements = []) => {
  // Conceptually, we build a ledger of debt entries: ledger[fromUserId][toUserId] = amount
  const ledger = {};

  const addDebt = (fromId, toId, amount) => {
    if (fromId === toId) return;
    if (!ledger[fromId]) ledger[fromId] = {};
    if (!ledger[fromId][toId]) ledger[fromId][toId] = 0;
    ledger[fromId][toId] += Number(amount);
  };

  // 1. Expenses create debt entries
  expenses.forEach(exp => {
    exp.splits.forEach(split => {
      // The split user owes the expense payer
      addDebt(split.userId, exp.payerId, split.amountOwed);
    });
  });

  // 2. Settlements reduce debt entries
  settlements.forEach(settlement => {
    // A settlement is the payer paying the payee, reducing their debt
    addDebt(settlement.payerId, settlement.payeeId, -Number(settlement.amount));
  });

  // 3. Pairwise netting produces final balances
  const netBalances = [];
  const processedPairs = new Set();

  for (const fromId in ledger) {
    for (const toId in ledger[fromId]) {
      const pairKey = [fromId, toId].sort().join('-');
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const debtFromTo = ledger[fromId][toId] || 0;
      const debtToFrom = (ledger[toId] && ledger[toId][fromId]) ? ledger[toId][fromId] : 0;

      // Net difference
      const net = Math.round((debtFromTo - debtToFrom) * 100) / 100;

      if (net > 0) {
        netBalances.push({ fromUserId: fromId, toUserId: toId, amount: net });
      } else if (net < 0) {
        netBalances.push({ fromUserId: toId, toUserId: fromId, amount: Math.abs(net) });
      }
    }
  }

  return netBalances;
};

module.exports = { calculateBalances };
