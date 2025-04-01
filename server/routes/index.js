const express = require('express');
const router = express.Router();
const datasetRoutes = require('./datasetRoutes');

// Mount routes
router.use('/api', datasetRoutes);

// API documentation route
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to DataViz Pro API',
    version: '1.0.0',
    endpoints: {
      datasets: '/api/datasets',
      datasetDetail: '/api/datasets/:id',
      analyzeDataset: '/api/datasets/:id/analyze',
      uploadDataset: '/api/upload'
    }
  });
});

module.exports = router; 