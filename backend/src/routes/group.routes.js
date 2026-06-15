const express = require('express');
const { createGroup, getMyGroups, getGroupDetails, addMember, removeMember } = require('../controllers/group.controller');
const { protect } = require('../middleware/auth.middleware');
const expenseRoutes = require('./expense.routes');
const { groupBalanceRouter } = require('./balance.routes');
const { groupSettlementRouter } = require('./settlement.routes');

const router = express.Router();

router.use('/:groupId/expenses', expenseRoutes);
router.use('/:id/balances', groupBalanceRouter);
router.use('/:id/settlements', groupSettlementRouter);

router.route('/').post(protect, createGroup).get(protect, getMyGroups);
router.route('/:id').get(protect, getGroupDetails);
router.route('/:id/members').post(protect, addMember);
router.route('/:id/members/:userId').delete(protect, removeMember);

module.exports = router;
