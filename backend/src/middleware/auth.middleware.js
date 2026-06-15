const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      req.user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, email: true, name: true } });
      if (!req.user) {
        return res.status(401).json({ error: 'User not found' });
      }
      next();
    } catch (error) {
      res.status(401).json({ error: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ error: 'Not authorized, no token' });
  }
};
module.exports = { protect };
