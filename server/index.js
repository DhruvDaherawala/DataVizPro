const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processFile } = require('./utils/fileProcessor');
const { analyzeData } = require('./utils/dataAnalyzer');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /csv|json/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Only CSV and JSON files are allowed');
    }
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/datavizpro')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Models
const DatasetSchema = new mongoose.Schema({
  name: String,
  description: String,
  filePath: String,
  fileType: String,
  uploadDate: { type: Date, default: Date.now },
  columns: [String],
  sampleData: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed
});

const Dataset = mongoose.model('Dataset', DatasetSchema);

// Routes
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Create a new dataset entry
    const newDataset = new Dataset({
      name: req.body.name || req.file.originalname,
      description: req.body.description || '',
      filePath: req.file.path,
      fileType: path.extname(req.file.originalname).substring(1)
    });

    // Process the file to extract columns and sample data
    try {
      const { columns, sampleData, metadata } = await processFile(req.file.path);
      newDataset.columns = columns;
      newDataset.sampleData = sampleData;
      newDataset.metadata = metadata;
    } catch (processingError) {
      console.error('File processing error:', processingError);
      return res.status(400).json({ 
        message: 'Error processing file', 
        error: processingError.message 
      });
    }

    await newDataset.save();
    res.status(201).json({ 
      message: 'File uploaded successfully',
      dataset: newDataset
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading file', error: error.message });
  }
});

app.get('/api/datasets', async (req, res) => {
  try {
    const datasets = await Dataset.find().sort({ uploadDate: -1 });
    res.json(datasets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching datasets', error: error.message });
  }
});

app.get('/api/datasets/:id', async (req, res) => {
  try {
    const dataset = await Dataset.findById(req.params.id);
    if (!dataset) {
      return res.status(404).json({ message: 'Dataset not found' });
    }
    res.json(dataset);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dataset', error: error.message });
  }
});

// Add a new route for analyzing a dataset
app.get('/api/datasets/:id/analyze', async (req, res) => {
  try {
    const dataset = await Dataset.findById(req.params.id);
    if (!dataset) {
      return res.status(404).json({ message: 'Dataset not found' });
    }

    // Run the analysis on the dataset sample data
    const analysisResults = analyzeData(dataset.sampleData, dataset.columns);
    
    res.json({
      datasetId: dataset._id,
      datasetName: dataset.name,
      analysis: analysisResults
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ message: 'Error analyzing dataset', error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 