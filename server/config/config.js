require('dotenv').config();

const config = {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE,
  fileUploadPath: process.env.FILE_UPLOAD_PATH,
  maxFileSize: process.env.MAX_FILE_SIZE,
  supportedFileTypes: ['csv', 'json'],
  corsOrigin: process.env.CORS_ORIGIN.split(',')
};

module.exports = config; 