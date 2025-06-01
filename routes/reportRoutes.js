const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Sales Reports
router.get('/sales/daily', reportController.getDailySalesReport);
router.get('/sales/monthly', reportController.getMonthlySalesReport);
router.get('/sales/summary', reportController.getSalesSummaryReport);
router.get('/sales/top-products', reportController.getTopSellingProducts);

// Inventory Reports
router.get('/inventory/stock-levels', reportController.getStockLevelsReport);
router.get('/inventory/low-stock', reportController.getLowStockReport);
router.get('/inventory/warehouse-stock', reportController.getWarehouseStockReport);

// Financial Reports
router.get('/financial/profit-loss', reportController.getProfitLossReport);
router.get('/financial/payments', reportController.getPaymentsReport);

// Customer Reports
router.get('/customers/top-customers', reportController.getTopCustomersReport);
router.get('/customers/sales-by-customer', reportController.getSalesByCustomerReport);

// Product Reports
router.get('/products/performance', reportController.getProductPerformanceReport);
router.get('/products/category-sales', reportController.getCategorySalesReport);

module.exports = router;