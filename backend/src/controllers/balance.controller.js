const prisma = require('../utils/prisma');
const { calculateBalances } = require('../services/balance.service');

const getGroupBalances = async (req, res) => {
  const { id } = req.params;
  try {
    // Fetch all group expenses and splits
    const expenses = await prisma.expense.findMany({
      where: { groupId: id, status: 'APPROVED' },
      include: { splits: true }
    });
    
    // Fetch all group settlements
    const settlements = await prisma.settlement.findMany({
      where: { groupId: id }
    });

    const rawBalances = calculateBalances(expenses, settlements);

    // Map user names for display
    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId: id },
      include: { user: { select: { id: true, name: true } } }
    });
    const userMap = {};
    groupMembers.forEach(m => userMap[m.user.id] = m.user.name);

    const displayBalances = rawBalances.map(b => ({
      fromUserId: b.fromUserId,
      fromUserName: userMap[b.fromUserId] || 'Unknown',
      toUserId: b.toUserId,
      toUserName: userMap[b.toUserId] || 'Unknown',
      amount: b.amount.toFixed(2)
    }));

    res.json(displayBalances);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch group balances' });
  }
};

const getUserDashboard = async (req, res) => {
  try {
    // Find all groups the user is part of
    const groupMemberships = await prisma.groupMember.findMany({
      where: { userId: req.user.id }
    });
    const groupIds = groupMemberships.map(g => g.groupId);

    let youOwe = 0;
    let youAreOwed = 0;

    // Calculate balances for each group
    for (const groupId of groupIds) {
      const expenses = await prisma.expense.findMany({
        where: { groupId, status: 'APPROVED' },
        include: { splits: true }
      });
      const settlements = await prisma.settlement.findMany({
        where: { groupId }
      });

      const balances = calculateBalances(expenses, settlements);

      balances.forEach(b => {
        if (b.fromUserId === req.user.id) {
          youOwe += b.amount;
        } else if (b.toUserId === req.user.id) {
          youAreOwed += b.amount;
        }
      });
    }

    const netBalance = (youAreOwed - youOwe).toFixed(2);

    res.json({
      youOwe: youOwe.toFixed(2),
      youAreOwed: youAreOwed.toFixed(2),
      netBalance,
      groupsCount: groupIds.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard balances' });
  }
};

module.exports = { getGroupBalances, getUserDashboard };
