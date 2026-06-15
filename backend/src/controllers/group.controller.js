const prisma = require('../utils/prisma');

const createGroup = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Group name is required' });

  try {
    const group = await prisma.group.create({
      data: {
        name,
        members: {
          create: { userId: req.user.id }
        }
      },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } }
    });
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create group' });
  }
};

const getMyGroups = async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
      where: { members: { some: { userId: req.user.id } } },
      include: { members: { include: { user: { select: { name: true } } } } }
    });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

const getGroupDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const isMember = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: id, userId: req.user.id } } });
    if (!isMember) return res.status(403).json({ error: 'Access denied' });

    const group = await prisma.group.findUnique({
      where: { id },
      include: { 
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        expenses: { include: { payer: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }
      }
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch group details' });
  }
};

const addMember = async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;

  try {
    const isMember = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: id, userId: req.user.id } } });
    if (!isMember) return res.status(403).json({ error: 'Access denied' });

    const userToAdd = await prisma.user.findUnique({ where: { email } });
    if (!userToAdd) return res.status(404).json({ error: 'User not found in system' });

    const newMember = await prisma.groupMember.create({
      data: { groupId: id, userId: userToAdd.id },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    res.status(201).json(newMember);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'User is already a member' });
    res.status(500).json({ error: 'Failed to add member' });
  }
};

const removeMember = async (req, res) => {
  const { id, userId } = req.params;
  
  try {
    const isMember = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: id, userId: req.user.id } } });
    if (!isMember) return res.status(403).json({ error: 'Access denied' });

    await prisma.groupMember.delete({ where: { groupId_userId: { groupId: id, userId } } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

module.exports = { createGroup, getMyGroups, getGroupDetails, addMember, removeMember };
