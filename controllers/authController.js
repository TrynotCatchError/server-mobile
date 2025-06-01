const db = require('../config/database');
const crypto = require('crypto');

// Helper function to hash password (for new users with salt)
const hashPasswordWithSalt = (password, salt = null) => {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
};

// Helper function to hash password (legacy SHA1 method for existing users)
const hashPasswordLegacy = (password) => {
  return crypto.createHash('sha1').update(password).digest('hex');
};

// Helper function to verify password
const verifyPassword = (password, storedHash, salt) => {
  console.log('🔍 Password verification debug:');
  console.log('Input password:', password);
  console.log('Stored hash:', storedHash);
  console.log('Stored salt:', salt);
  
  let computedHash;
  
  if (salt) {
    // New method with salt
    computedHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    console.log('Using PBKDF2 with salt');
  } else {
    // Legacy method without salt (SHA1)
    computedHash = crypto.createHash('sha1').update(password).digest('hex');
    console.log('Using legacy SHA1');
  }
  
  console.log('Generated hash:', computedHash);
  console.log('Hashes match:', storedHash === computedHash);
  
  return storedHash === computedHash;
};

// Register new user
const register = async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      first_name, 
      last_name, 
      phone, 
      company,
      line 
    } = req.body;

    console.log('📝 Registration attempt:', { username, email, first_name, last_name });

    // Validation
    if (!username || !email || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: username, email, password, first_name, last_name'
      });
    }

    // Check if username or email already exists
    const checkUserQuery = `
      SELECT id, username, email 
      FROM sma_users 
      WHERE username = ? OR email = ?
    `;

    db.query(checkUserQuery, [username, email], (err, existingUsers) => {
      if (err) {
        console.error('❌ Database error checking existing user:', err);
        return res.status(500).json({
          success: false,
          error: 'Database error during registration'
        });
      }

      if (existingUsers.length > 0) {
        const existingUser = existingUsers[0];
        const conflictField = existingUser.username === username ? 'username' : 'email';
        return res.status(409).json({
          success: false,
          error: `${conflictField} already exists`
        });
      }

      // Hash password with salt for new users
      const { hash, salt } = hashPasswordWithSalt(password);
      const created_on = Math.floor(Date.now() / 1000);

      // Insert new user
      const insertUserQuery = `
        INSERT INTO sma_users (
          username, email, password, salt, first_name, last_name, 
          phone, company, line, ip_address, created_on, active, group_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 3)
      `;

      const userValues = [
        username,
        email,
        hash,
        salt,
        first_name,
        last_name,
        phone || '',
        company || '',
        line || '',
        req.ip || '0.0.0.0',
        created_on
      ];

      db.query(insertUserQuery, userValues, (err, result) => {
        if (err) {
          console.error('❌ Database error creating user:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to create user account'
          });
        }

        const userId = result.insertId;
        console.log('✅ User registered successfully:', { userId, username, email });

        // Return user data (without password)
        res.status(201).json({
          success: true,
          message: 'User registered successfully',
          user: {
            id: userId,
            username,
            email,
            first_name,
            last_name,
            phone: phone || '',
            company: company || '',
            line: line || '',
            created_on
          }
        });
      });
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during registration'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('🔐 Login attempt:', { username });

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Find user by username or email
    const findUserQuery = `
      SELECT 
        id, username, email, password, salt, first_name, last_name, 
        phone, company, line, active, group_id, last_login
      FROM sma_users 
      WHERE (username = ? OR email = ?) AND active = 1
    `;

    db.query(findUserQuery, [username, username], (err, users) => {
      if (err) {
        console.error('❌ Database error during login:', err);
        return res.status(500).json({
          success: false,
          error: 'Database error during login'
        });
      }

      if (users.length === 0) {
        console.log('❌ User not found:', username);
        return res.status(401).json({
          success: false,
          error: 'Invalid username or password'
        });
      }

      const user = users[0];
      console.log('👤 User found:', { id: user.id, username: user.username, salt: user.salt });

      // Verify password (handles both legacy and new hashing methods)
      const isPasswordValid = verifyPassword(password, user.password, user.salt);

      if (!isPasswordValid) {
        console.log('❌ Invalid password for user:', username);
        return res.status(401).json({
          success: false,
          error: 'Invalid username or password'
        });
      }

      // Update last login
      const updateLoginQuery = `
        UPDATE sma_users 
        SET last_login = ?, last_ip_address = ? 
        WHERE id = ?
      `;

      const currentTime = Math.floor(Date.now() / 1000);

      db.query(updateLoginQuery, [currentTime, req.ip || '0.0.0.0', user.id], (err) => {
        if (err) {
          console.error('⚠️ Error updating last login:', err);
          // Continue anyway, don't fail the login
        }

        // Log the login attempt
        const logLoginQuery = `
          INSERT INTO sma_user_logins (user_id, ip_address, login, time)
          VALUES (?, ?, ?, NOW())
        `;

        db.query(logLoginQuery, [user.id, req.ip || '0.0.0.0', username], (err) => {
          if (err) {
            console.error('⚠️ Error logging login attempt:', err);
            // Continue anyway
          }
        });

        console.log('✅ User logged in successfully:', { userId: user.id, username: user.username });

        // Return user data (without password and salt)
        res.json({
          success: true,
          message: 'Login successful',
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            phone: user.phone || '',
            company: user.company || '',
            line: user.line || '',
            group_id: user.group_id,
            last_login: currentTime
          }
        });
      });
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during login'
    });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    // In a stateless API, logout is mainly client-side
    // But we can log the logout event if needed
    console.log('👋 User logout');
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during logout'
    });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const getUserQuery = `
      SELECT 
        id, username, email, first_name, last_name, 
        phone, company, line, group_id, created_on, last_login
      FROM sma_users 
      WHERE id = ? AND active = 1
    `;

    db.query(getUserQuery, [userId], (err, users) => {
      if (err) {
        console.error('❌ Database error getting profile:', err);
        return res.status(500).json({
          success: false,
          error: 'Database error getting profile'
        });
      }

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const user = users[0];

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone || '',
          company: user.company || '',
          line: user.line || '',
          group_id: user.group_id,
          created_on: user.created_on,
          last_login: user.last_login
        }
      });
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error getting profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      first_name, 
      last_name, 
      phone, 
      company, 
      line 
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const updateQuery = `
      UPDATE sma_users 
      SET first_name = ?, last_name = ?, phone = ?, company = ?, line = ?
      WHERE id = ? AND active = 1
    `;

    db.query(updateQuery, [first_name, last_name, phone || '', company || '', line || '', userId], (err, result) => {
      if (err) {
        console.error('❌ Database error updating profile:', err);
        return res.status(500).json({
          success: false,
          error: 'Database error updating profile'
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      console.log('✅ Profile updated successfully:', { userId });

      res.json({
        success: true,
        message: 'Profile updated successfully'
      });
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error updating profile'
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile
};
