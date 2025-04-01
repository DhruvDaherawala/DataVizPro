require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/datavizpro',
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret',
  jwtExpire: process.env.JWT_EXPIRE || '30d',
  fileUploadPath: process.env.FILE_UPLOAD_PATH || 'uploads',
  maxFileSize: process.env.MAX_FILE_SIZE || 10 * 1024 * 1024, // 10MB
  supportedFileTypes: ['csv', 'json'],
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
};

module.exports = config; 