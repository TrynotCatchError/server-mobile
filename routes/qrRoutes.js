const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');

// Mobile QR Routes
// GET /api/mobile/qr/generate/:productId
router.get('/generate/:productId', qrController.generateQR);

// POST /api/mobile/qr/scan
router.post('/scan', qrController.scanQR);

module.exports = router;