const mysql = require('mysql2');

// MySQL connection
const db = mysql.createConnection({
  host: 'karinssk.com',
  user: 'karinssk_mobile',
  password: 'Z7qn@!rI1cQ2oasl',
  database: 'karinssk_mobile'
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

module.exports = db;