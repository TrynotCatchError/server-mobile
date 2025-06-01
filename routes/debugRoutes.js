const express = require('express');
const router = express.Router();
const debugController = require('../controllers/debugController');

// Mobile Debug Routes
// GET /api/mobile/debug/tables
router.get('/tables', debugController.getTableStructures);

module.exports = router;