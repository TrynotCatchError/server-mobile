const express = require('express');
const cors = require('cors');
const path = require('path');

// Import database connection
const db = require('./config/database');

// Import routes
const productRoutes = require('./routes/productRoutes');
const qrRoutes = require('./routes/qrRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const debugRoutes = require('./routes/debugRoutes');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const reportRoutes = require('./routes/reportRoutes'); 
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Recommended - Consistent approach
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static(path.join(__dirname, 'assets', 'uploads')));
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Routes with mobile prefix
app.use('/api/mobile/products', productRoutes);
app.use('/api/mobile/qr', qrRoutes);
app.use('/api/mobile/dashboard', dashboardRoutes);
app.use('/api/mobile/debug', debugRoutes);
app.use('/api/mobile/auth', authRoutes);
app.use('/api/mobile/categories', categoryRoutes); 
app.use('/api/mobile/reports', reportRoutes); // Add this line

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).send('Internal Server Error');
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Mobile API Server running at http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('- GET  /health');
  console.log('- GET  /api/mobile/products');
  console.log('- GET  /api/mobile/products/search');
  console.log('- GET  /api/mobile/products/search/suggestions');
  console.log('- GET  /api/mobile/products/:id');
  console.log('- GET  /api/mobile/qr/generate/:productId');
  console.log('- POST /api/mobile/qr/scan');
  console.log('- GET  /api/mobile/dashboard');
  console.log('- GET  /api/mobile/debug/tables');
  console.log('- POST /api/mobile/auth/register');
  console.log('- POST /api/mobile/auth/login');
  console.log('- POST /api/mobile/auth/logout');
  console.log('- GET  /api/mobile/auth/profile');
  console.log('- PUT  /api/mobile/auth/profile');
  console.log('');
  console.log('📊 Reports endpoints:');
  console.log('- GET  /api/mobile/reports/sales/daily');
  console.log('- GET  /api/mobile/reports/sales/monthly');
  console.log('- GET  /api/mobile/reports/sales/summary');
  console.log('- GET  /api/mobile/reports/sales/top-products');
  console.log('- GET  /api/mobile/reports/inventory/stock-levels');
  console.log('- GET  /api/mobile/reports/inventory/low-stock');
  console.log('- GET  /api/mobile/reports/inventory/warehouse-stock');
  console.log('- GET  /api/mobile/reports/financial/profit-loss');
  console.log('- GET  /api/mobile/reports/financial/payments');
  console.log('- GET  /api/mobile/reports/customers/top-customers');
  console.log('- GET  /api/mobile/reports/customers/sales-by-customer');
  console.log('- GET  /api/mobile/reports/products/performance');
  console.log('- GET  /api/mobile/reports/products/category-sales');
});


// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  console.log('Shutting down gracefully...');
  
  try {
    await db.end();
    console.log('Database connections closed');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}
