const express = require('express');
const router = express.Router();
const { 
  getDatasets, 
  getDataset, 
  uploadDataset, 
  deleteDataset, 
  analyzeDataset 
} = require('../controllers/datasetController');

// Configure multer for file uploads
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const os = require('os');

// Determine if we're running on Vercel (production) or locally
const isVercel = process.env.VERCEL === '1';

// Set upload directory based on environment
let uploadDir;
if (isVercel) {
  // Use /tmp directory for Vercel (serverless) environment
  uploadDir = path.join(os.tmpdir(), 'uploads');
} else {
  // Use regular uploads directory for local development
  uploadDir = path.join(__dirname, '..', config.fileUploadPath);
}

// Create uploads directory if it doesn't exist and we're not on Vercel
// or if we are on Vercel but using the /tmp directory which is writable
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (error) {
  console.error(`Warning: Could not create uploads directory: ${error.message}`);
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Configure multer file filter
const fileFilter = (req, file, cb) => {
  const filetypes = /csv|json/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only CSV and JSON files are allowed'), false);
  }
};

// Configure multer upload
const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: config.maxFileSize }
});

// Routes
router.route('/datasets')
  .get(getDatasets);

router.route('/datasets/:id')
  .get(getDataset)
  .delete(deleteDataset);

router.route('/datasets/:id/analyze')
  .get(analyzeDataset);

router.route('/upload')
  .post(upload.single('file'), uploadDataset);

module.exports = router; 