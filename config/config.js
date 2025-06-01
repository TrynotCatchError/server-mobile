const path = require('path');

const config = {
  development: {
    database: {
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'sale',
      port: 3306,
      connectionLimit: 10,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true
    },
    server: {
      port: process.env.PORT || 3000,
      host: 'localhost',
      baseUrl: 'http://localhost:3000'
    },
    assets: {
      uploadsPath: path.join(__dirname, '..', 'assets', 'uploads'),
      imagesPath: path.join(__dirname, '..', 'assets', 'images'),
      logoPath: path.join(__dirname, '..', 'assets', 'images', 'ruby-logo.jpg'),
      baseUrl: 'http://localhost:3000/assets'
    },
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:8081', 'exp://192.168.1.100:8081'],
      credentials: true
    },
    logging: {
      level: 'debug',
      requests: true
    }
  },
  
  production: {
    database: {
      host: process.env.DB_HOST || 'karinssk.com',
      user: process.env.DB_USER || 'karinssk_mobile',
      password: process.env.DB_PASSWORD || 'Z7qn@!rI1cQ2oasl',
      database: process.env.DB_NAME || 'karinssk_mobile',
      port: process.env.DB_PORT || 3306,
      connectionLimit: 20,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true,
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false
    },
    server: {
      port: process.env.PORT || 3000,
      host: process.env.HOST || '0.0.0.0',
      baseUrl: process.env.BASE_URL || 'https://karinssk.com'
    },
    assets: {
      uploadsPath: process.env.UPLOADS_PATH || '/var/www/html/mobile-api/assets/uploads',
      imagesPath: process.env.IMAGES_PATH || '/var/www/html/mobile-api/assets/images',
      logoPath: process.env.LOGO_PATH || '/var/www/html/mobile-api/assets/images/ruby-logo.jpg',
      baseUrl: process.env.ASSETS_BASE_URL || 'https://karinssk.com/mobile-api/assets'
    },
    cors: {
      origin: process.env.ALLOWED_ORIGINS ? 
        process.env.ALLOWED_ORIGINS.split(',') : 
        ['https://karinssk.com', 'https://www.karinssk.com'],
      credentials: true
    },
    logging: {
      level: 'error',
      requests: false
    }
  },

  staging: {
    database: {
      host: process.env.DB_HOST || 'karinssk.com',
      user: process.env.DB_USER || 'karinssk_mobile',
      password: process.env.DB_PASSWORD || 'Z7qn@!rI1cQ2oasl',
      database: process.env.DB_NAME || 'karinssk_mobile_staging',
      port: process.env.DB_PORT || 3306,
      connectionLimit: 15,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true
    },
    server: {
      port: process.env.PORT || 3001,
      host: process.env.HOST || '0.0.0.0',
      baseUrl: process.env.BASE_URL || 'https://staging.karinssk.com'
    },
    assets: {
      uploadsPath: process.env.UPLOADS_PATH || '/var/www/html/staging-mobile-api/assets/uploads',
      imagesPath: process.env.IMAGES_PATH || '/var/www/html/staging-mobile-api/assets/images',
      logoPath: process.env.LOGO_PATH || '/var/www/html/staging-mobile-api/assets/images/ruby-logo.jpg',
      baseUrl: process.env.ASSETS_BASE_URL || 'https://staging.karinssk.com/mobile-api/assets'
    },
    cors: {
      origin: ['https://staging.karinssk.com', 'http://localhost:8081'],
      credentials: true
    },
    logging: {
      level: 'info',
      requests: true
    }
  }
};

const environment = process.env.NODE_ENV || 'development';
const currentConfig = config[environment];

if (!currentConfig) {
  throw new Error(`Configuration for environment "${environment}" not found`);
}

// Add environment info to config
currentConfig.environment = environment;
currentConfig.isDevelopment = environment === 'development';
currentConfig.isProduction = environment === 'production';
currentConfig.isStaging = environment === 'staging';

module.exports = currentConfig;
