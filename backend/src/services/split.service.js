const calculateSplits = (amount, splitMethod, splitDetails, payerId) => {
  const total = Number(amount);
  if (total <= 0) throw new Error('Expense amount must be greater than 0');
  if (!splitDetails || splitDetails.length === 0) throw new Error('At least one participant is required');

  const splits = [];
  let calculatedSum = 0;

  switch (splitMethod) {
    case 'EQUAL':
      const equalBase = Math.floor((total / splitDetails.length) * 100) / 100;
      splitDetails.forEach(member => {
        splits.push({ userId: member.userId, amountOwed: equalBase });
        calculatedSum += equalBase;
      });
      break;

    case 'UNEQUAL':
      let unequalSum = 0;
      splitDetails.forEach(member => {
        const amt = Number(member.amount);
        splits.push({ userId: member.userId, amountOwed: amt });
        unequalSum += amt;
      });
      if (Math.abs(unequalSum - total) > 0.001) throw new Error('Sum of unequal amounts must equal total expense amount');
      calculatedSum = unequalSum; // no remainder
      break;

    case 'PERCENTAGE':
      let percentSum = 0;
      splitDetails.forEach(member => {
        percentSum += Number(member.percentage);
        const amt = Math.floor((total * (Number(member.percentage) / 100)) * 100) / 100;
        splits.push({ userId: member.userId, amountOwed: amt });
        calculatedSum += amt;
      });
      if (Math.abs(percentSum - 100) > 0.001) throw new Error('Total percentage must equal 100');
      break;

    case 'SHARES':
      let totalShares = 0;
      splitDetails.forEach(member => totalShares += Number(member.shares));
      if (totalShares <= 0) throw new Error('Total shares must be greater than zero');
      
      splitDetails.forEach(member => {
        const amt = Math.floor((total * (Number(member.shares) / totalShares)) * 100) / 100;
        splits.push({ userId: member.userId, amountOwed: amt });
        calculatedSum += amt;
      });
      break;

    default:
      throw new Error('Invalid split method');
  }

  // Handle rounding remainder (add to payer, or first user if payer not involved)
  const remainder = Math.round((total - calculatedSum) * 100) / 100;
  if (remainder > 0) {
    let targetSplit = splits.find(s => s.userId === payerId);
    if (!targetSplit) targetSplit = splits[0];
    targetSplit.amountOwed = Math.round((targetSplit.amountOwed + remainder) * 100) / 100;
  }

  return splits;
};

module.exports = { calculateSplits };
