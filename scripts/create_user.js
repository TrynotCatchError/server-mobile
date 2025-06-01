
const mysql = require('mysql2');
const crypto = require('crypto');

// Database configuration - update these with your actual database settings
const dbConfig = {
  host: 'karinssk.com',
  user: 'karinssk_mobile',
  password: 'Z7qn@!rI1cQ2oasl',
  database: 'karinssk_mobile'
};

// Helper function to hash password using SHA1 (legacy method)
const hashPasswordLegacy = (password) => {
  return crypto.createHash('sha1').update(password).digest('hex');
};

// Update data
const updateData = {
  email: 'rungarun.ruby@gmail.com',
  newPassword: '123456789'
};

// Create database connection
const connection = mysql.createConnection(dbConfig);

// Update user password
const updatePassword = () => {
  console.log('🔄 Connecting to database...');
  
  connection.connect((err) => {
    if (err) {
      console.error('❌ Database connection failed:', err);
      return;
    }
    
    console.log('✅ Connected to database');
    
    // Find user by email
    const findUserQuery = 'SELECT id, username, email FROM sma_users WHERE email = ?';
    
    connection.query(findUserQuery, [updateData.email], (err, results) => {
      if (err) {
        console.error('❌ Error finding user:', err);
        connection.end();
        return;
      }
      
      if (results.length === 0) {
        console.log('❌ User not found with email:', updateData.email);
        connection.end();
        return;
      }
      
      const user = results[0];
      console.log('👤 User found:', { id: user.id, username: user.username, email: user.email });
      
      // Hash the new password using SHA1 (legacy method)
      const hashedPassword = hashPasswordLegacy(updateData.newPassword);
      
      console.log('🔐 New password hash:', hashedPassword);
      
      // Update user password
      const updateQuery = `
        UPDATE sma_users 
        SET password = ?, salt = NULL 
        WHERE email = ?
      `;
      
      connection.query(updateQuery, [hashedPassword, updateData.email], (err, result) => {
        if (err) {
          console.error('❌ Error updating password:', err);
        } else {
          console.log('✅ Password updated successfully!');
          console.log('📋 Update details:');
          console.log('   - User ID:', user.id);
          console.log('   - Username:', user.username);
          console.log('   - Email:', user.email);
          console.log('   - New Password:', updateData.newPassword);
          console.log('   - New Hash:', hashedPassword);
          console.log('   - Affected Rows:', result.affectedRows);
        }
        
        connection.end();
      });
    });
  });
};

// Run the script
updatePassword();
