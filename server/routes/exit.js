const express = require('express');
const router = express.Router();
const exitController = require('../controllers/exitController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.post('/', optionalAuth, exitController.exitTicket);

module.exports = router;