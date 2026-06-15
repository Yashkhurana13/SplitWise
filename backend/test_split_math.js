const { calculateSplits } = require('./src/services/split.service');

const runTests = () => {
  console.log("--- Running Split Math Tests ---");

  // 1. EQUAL SPLIT
  let splits = calculateSplits(100, 'EQUAL', [{ userId: 'u1' }, { userId: 'u2' }, { userId: 'u3' }], 'u1');
  let sum = splits.reduce((acc, s) => acc + s.amountOwed, 0);
  console.log('EQUAL SPLIT (100 over 3 people, Payer: u1)');
  console.log(splits);
  console.log(`Total: ${sum.toFixed(2)}\n`);

  // 2. UNEQUAL SPLIT
  splits = calculateSplits(150, 'UNEQUAL', [{ userId: 'u1', amount: '50' }, { userId: 'u2', amount: '100' }], 'u1');
  sum = splits.reduce((acc, s) => acc + s.amountOwed, 0);
  console.log('UNEQUAL SPLIT (150 total, u1: 50, u2: 100)');
  console.log(splits);
  console.log(`Total: ${sum.toFixed(2)}\n`);

  // 3. PERCENTAGE SPLIT
  splits = calculateSplits(200, 'PERCENTAGE', [{ userId: 'u1', percentage: '30' }, { userId: 'u2', percentage: '30' }, { userId: 'u3', percentage: '40' }], 'u1');
  sum = splits.reduce((acc, s) => acc + s.amountOwed, 0);
  console.log('PERCENTAGE SPLIT (200 total, 30%/30%/40%)');
  console.log(splits);
  console.log(`Total: ${sum.toFixed(2)}\n`);

  // 4. SHARES SPLIT
  splits = calculateSplits(500, 'SHARES', [{ userId: 'u1', shares: '2' }, { userId: 'u2', shares: '3' }], 'u1');
  sum = splits.reduce((acc, s) => acc + s.amountOwed, 0);
  console.log('SHARES SPLIT (500 total, 2 shares vs 3 shares)');
  console.log(splits);
  console.log(`Total: ${sum.toFixed(2)}\n`);
};

runTests();
