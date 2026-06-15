const express = require('express');
const { createSettlement, getGroupSettlements } = require('../controllers/settlement.controller');
const { protect } = require('../middleware/auth.middleware');

const globalSettlementRouter = express.Router();
globalSettlementRouter.route('/').post(protect, createSettlement);

const groupSettlementRouter = express.Router({ mergeParams: true });
groupSettlementRouter.route('/').get(protect, getGroupSettlements);

module.exports = { globalSettlementRouter, groupSettlementRouter };
