const prisma = require('../utils/prisma');
const { calculateSplits } = require('../services/split.service');

const createExpense = async (req, res) => {
  const { groupId } = req.params;
  const { title, description, amount, splitMethod, payerId, splitDetails } = req.body;

  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (Number(amount) <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });

  try {
    // Validate members
    const groupMembers = await prisma.groupMember.findMany({ where: { groupId } });
    const memberIds = groupMembers.map(m => m.userId);
    
    if (!memberIds.includes(payerId)) return res.status(400).json({ error: 'Payer must be a group member' });
    
    const allParticipantsValid = splitDetails.every(d => memberIds.includes(d.userId));
    if (!allParticipantsValid) return res.status(400).json({ error: 'All participants must be group members' });

    // Calculate splits
    let calculatedSplits;
    try {
      calculatedSplits = calculateSplits(amount, splitMethod, splitDetails, payerId);
    } catch (mathErr) {
      return res.status(400).json({ error: mathErr.message });
    }

    // Persist in transaction
    const expense = await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          title,
          description,
          amount,
          splitMethod,
          groupId,
          payerId,
          splits: {
            create: calculatedSplits.map(s => ({
              userId: s.userId,
              amountOwed: s.amountOwed
            }))
          }
        },
        include: { splits: true }
      });
      return exp;
    });

    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create expense' });
  }
};

const getGroupExpenses = async (req, res) => {
  const { groupId } = req.params;
  try {
    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: { 
        payer: { select: { name: true } },
        splits: { include: { user: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

module.exports = { createExpense, getGroupExpenses };
