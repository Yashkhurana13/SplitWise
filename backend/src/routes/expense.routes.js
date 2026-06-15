const express = require('express');
const { createExpense, getGroupExpenses } = require('../controllers/expense.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router({ mergeParams: true });

router.route('/')
  .post(protect, createExpense)
  .get(protect, getGroupExpenses);

module.exports = router;
