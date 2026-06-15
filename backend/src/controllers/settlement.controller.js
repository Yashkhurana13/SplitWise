const prisma = require('../utils/prisma');
const { calculateBalances } = require('../services/balance.service');

const createSettlement = async (req, res) => {
  const { groupId, payerId, payeeId, amount } = req.body;

  if (!groupId || !payerId || !payeeId || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const settleAmount = Number(amount);
  if (settleAmount <= 0) {
    return res.status(400).json({ error: 'Settlement amount must be greater than 0' });
  }

  if (payerId === payeeId) {
    return res.status(400).json({ error: 'Payer and payee must be different users' });
  }

  try {
    // 1. Validate both users belong to the group
    const members = await prisma.groupMember.findMany({
      where: { groupId, userId: { in: [payerId, payeeId] } }
    });
    if (members.length !== 2) {
      return res.status(400).json({ error: 'Both users must belong to the group' });
    }

    // 2. Calculate current debt using the Balance Engine
    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: { splits: true }
    });
    const settlements = await prisma.settlement.findMany({
      where: { groupId }
    });

    const currentBalances = calculateBalances(expenses, settlements);
    
    // Find how much payerId owes payeeId
    const debtRecord = currentBalances.find(b => b.fromUserId === payerId && b.toUserId === payeeId);
    const maxOwed = debtRecord ? debtRecord.amount : 0;

    // 3. Amount cannot exceed current outstanding debt
    if (settleAmount > maxOwed) {
      return res.status(400).json({ 
        error: `Settlement amount (${settleAmount}) exceeds current outstanding debt (${maxOwed})` 
      });
    }

    // 4. Create the settlement record
    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        payerId,
        payeeId,
        amount: settleAmount
      }
    });

    res.status(201).json(settlement);
  } catch (err) {
    res.status(500).json({ error: 'Failed to record settlement' });
  }
};

const getGroupSettlements = async (req, res) => {
  const { id } = req.params;
  try {
    const settlements = await prisma.settlement.findMany({
      where: { groupId: id },
      include: {
        payer: { select: { name: true } },
        payee: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(settlements);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settlements' });
  }
};

module.exports = { createSettlement, getGroupSettlements };
