const config = {
  development: {
    database: {
      host: 'karinssk.com',
      user: 'karinssk_mobile',
      password: 'Z7qn@!rI1cQ2oasl',
      database: 'karinssk_mobile'
    },
    server: {
      port: process.env.PORT || 3000
    },
    assets: {
      uploadsPath: '/Users/dreamimac/Desktop/M2/server/assets/uploads',
      logoPath: '/Users/dreamimac/Desktop/M2/server/assets/logs/logo-rb.png'
    }
  },
  production: {
    database: {
      host: process.env.DB_HOST || 'karinssk.com',
      user: process.env.DB_USER || 'karinssk_mobile',
      password: process.env.DB_PASSWORD || 'Z7qn@!rI1cQ2oasl',
      database: process.env.DB_NAME || 'karinssk_mobile'
    },
    server: {
      port: process.env.PORT || 3000
    },
    assets: {
      uploadsPath: process.env.UPLOADS_PATH || '/Users/dreamimac/Desktop/M2/server/assets/uploads',
      logoPath: process.env.LOGO_PATH || '/Users/dreamimac/Desktop/M2/server/assets/logs/logo-rb.png'
    }
  }
};

const environment = process.env.NODE_ENV || 'development';

module.exports = config[environment];