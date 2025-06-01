const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Mobile Dashboard Routes
// GET /api/mobile/dashboard
router.get('/', dashboardController.getDashboardData);

module.exports = router;