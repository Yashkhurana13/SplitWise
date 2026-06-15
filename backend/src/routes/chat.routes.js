const express = require('express');
const { getMessages, postMessage } = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router({ mergeParams: true });

router.route('/')
  .get(protect, getMessages)
  .post(protect, postMessage);

module.exports = router;
