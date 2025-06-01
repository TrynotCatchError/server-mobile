const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Mobile Product Routes
// GET /api/mobile/products/search
router.get('/search', productController.searchProducts);

// GET /api/mobile/products/search/suggestions
router.get('/search/suggestions', productController.getSearchSuggestions);

// GET /api/mobile/products
router.get('/', productController.getAllProducts);

// GET /api/mobile/products/:id
router.get('/:id', productController.getProductById);

module.exports = router;