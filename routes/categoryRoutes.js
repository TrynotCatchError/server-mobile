const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Mobile Category Routes
// GET /api/mobile/categories/search
router.get('/search', categoryController.searchCategories);

// GET /api/mobile/categories/tree
router.get('/tree', categoryController.getCategoryTree);

// GET /api/mobile/categories/:id/products
router.get('/:id/products', categoryController.getProductsByCategory);

// GET /api/mobile/categories
router.get('/', categoryController.getAllCategories);

// GET /api/mobile/categories/:id
router.get('/:id', categoryController.getCategoryById);

module.exports = router;