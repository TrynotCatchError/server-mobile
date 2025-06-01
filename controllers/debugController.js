const db = require('../config/database');

// Get table structures
const getTableStructures = (req, res) => {
  const queries = [
    'DESCRIBE sma_companies',
    'DESCRIBE sma_sales',
    'DESCRIBE sma_products',
    'DESCRIBE sma_sale_items'
  ];

  Promise.all(queries.map(query => 
    new Promise((resolve, reject) => {
      db.query(query, (err, results) => {
        if (err) {
          resolve({ table: query.split(' ')[1], error: err.message });
        } else {
          resolve({ table: query.split(' ')[1], columns: results });
        }
      });
    })
  )).then(results => {
    res.json({
      message: 'Table structure information',
      tables: results
    });
  }).catch(error => {
    res.status(500).json({
      error: 'Failed to get table info',
      message: error.message
    });
  });
};

module.exports = {
  getTableStructures
};