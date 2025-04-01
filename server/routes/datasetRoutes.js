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

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', config.fileUploadPath);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
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