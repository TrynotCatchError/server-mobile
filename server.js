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

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static('/Users/dev-ops/Desktop/store/server/assets/uploads'));

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
