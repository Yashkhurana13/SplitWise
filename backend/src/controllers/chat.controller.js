const prisma = require('../utils/prisma');

const getMessages = async (req, res) => {
  const { id: expenseId } = req.params;

  try {
    // Validate user belongs to the group of the expense
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { group: { include: { members: true } } }
    });

    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    
    const isMember = expense.group.members.some(m => m.userId === req.user.id);
    if (!isMember) return res.status(403).json({ error: 'Not authorized to view messages' });

    const messages = await prisma.chatMessage.findMany({
      where: { expenseId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

const postMessage = async (req, res) => {
  const { id: expenseId } = req.params;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }
  if (content.length > 500) {
    return res.status(400).json({ error: 'Message exceeds 500 characters' });
  }

  try {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { group: { include: { members: true } } }
    });

    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    
    const isMember = expense.group.members.some(m => m.userId === req.user.id);
    if (!isMember) return res.status(403).json({ error: 'Not authorized to post messages' });

    const message = await prisma.chatMessage.create({
      data: {
        content,
        expenseId,
        userId: req.user.id
      },
      include: { user: { select: { id: true, name: true } } }
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Failed to post message' });
  }
};

module.exports = { getMessages, postMessage };
