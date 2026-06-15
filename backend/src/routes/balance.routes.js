const express = require('express');
const { getGroupBalances, getUserDashboard } = require('../controllers/balance.controller');
const { protect } = require('../middleware/auth.middleware');

const groupBalanceRouter = express.Router({ mergeParams: true });
groupBalanceRouter.route('/').get(protect, getGroupBalances);

const globalBalanceRouter = express.Router();
globalBalanceRouter.route('/').get(protect, getUserDashboard);

module.exports = { groupBalanceRouter, globalBalanceRouter };
