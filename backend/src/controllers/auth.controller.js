const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });

const register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Please provide all required fields' });
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) return res.status(400).json({ error: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({ data: { name, email, passwordHash } });
    res.status(201).json({ id: user.id, name: user.name, email: user.email, token: generateToken(user.id) });
  } catch (error) {
    res.status(500).json({ error: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Please provide email and password' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      res.json({ id: user.id, name: user.name, email: user.email, token: generateToken(user.id) });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
};

const me = async (req, res) => {
  res.json({ id: req.user.id, name: req.user.name, email: req.user.email });
};
module.exports = { register, login, me };
