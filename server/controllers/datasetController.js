const path = require('path');
const { Dataset, Analysis } = require('../models');
const FileService = require('../services/fileService');
const AnalysisService = require('../services/analysisService');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all datasets
// @route   GET /api/datasets
// @access  Public (could be Private if authentication is implemented)
exports.getDatasets = asyncHandler(async (req, res, next) => {
  const datasets = await Dataset.find().sort({ uploadDate: -1 });
  res.status(200).json(datasets);
});

// @desc    Get single dataset
// @route   GET /api/datasets/:id
// @access  Public (could be Private if authentication is implemented)
exports.getDataset = asyncHandler(async (req, res, next) => {
  const dataset = await Dataset.findById(req.params.id);
  
  if (!dataset) {
    return next(new ErrorResponse(`Dataset not found with id of ${req.params.id}`, 404));
  }
  
  // Make sure the totalRows property is included for the client 
  if (dataset.metadata && dataset.metadata.totalRows) {
    dataset.totalRows = dataset.metadata.totalRows;
  } else if (dataset.sampleData) {
    dataset.totalRows = dataset.sampleData.length;
  }
  
  res.status(200).json(dataset);
});

// @desc    Create new dataset (upload file)
// @route   POST /api/upload
// @access  Public (could be Private if authentication is implemented)
exports.uploadDataset = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse('Please upload a file', 400));
  }

  // Create a new dataset entry
  const newDataset = new Dataset({
    name: req.body.name || req.file.originalname,
    description: req.body.description || '',
    filePath: req.file.path,
    fileType: path.extname(req.file.originalname).substring(1),
    fileSize: req.file.size // Set file size from the uploaded file
  });

  // Process the file to extract columns and sample data
  try {
    const { columns, sampleData, metadata } = await FileService.processFile(req.file.path);
    newDataset.columns = columns;
    newDataset.sampleData = sampleData;
    newDataset.metadata = metadata;
  } catch (processingError) {
    return next(new ErrorResponse(`Error processing file: ${processingError.message}`, 400));
  }

  await newDataset.save();
  
  res.status(201).json({ 
    success: true,
    message: 'File uploaded successfully',
    dataset: newDataset
  });
});

// @desc    Delete dataset
// @route   DELETE /api/datasets/:id
// @access  Private
exports.deleteDataset = asyncHandler(async (req, res, next) => {
  try {
    const dataset = await Dataset.findById(req.params.id);
    
    if (!dataset) {
      return next(new ErrorResponse(`Dataset not found with id of ${req.params.id}`, 404));
    }
    
    // Delete the file from the filesystem - but don't let file issues block dataset deletion
    try {
      await FileService.deleteFile(dataset.filePath);
    } catch (fileError) {
      console.error(`Error deleting file: ${fileError.message}`);
      // Continue with deletion of database record even if file deletion fails
    }
    
    // Use deleteOne() instead of the deprecated remove()
    const result = await Dataset.deleteOne({ _id: req.params.id });
    
    if (result.deletedCount === 0) {
      return next(new ErrorResponse(`Failed to delete dataset with id ${req.params.id}`, 500));
    }
    
    res.status(200).json({ 
      success: true,
      message: 'Dataset deleted successfully' 
    });
  } catch (err) {
    console.error(`Error in deleteDataset controller: ${err.message}`);
    return next(new ErrorResponse('Server error while deleting dataset', 500));
  }
});

// @desc    Analyze dataset
// @route   GET /api/datasets/:id/analyze
// @access  Public (could be Private if authentication is implemented)
exports.analyzeDataset = asyncHandler(async (req, res, next) => {
  const dataset = await Dataset.findById(req.params.id);
  
  if (!dataset) {
    return next(new ErrorResponse(`Dataset not found with id of ${req.params.id}`, 404));
  }

  // Run the analysis on the complete dataset data
  const analysisResults = AnalysisService.analyzeData(dataset.sampleData, dataset.columns);
  
  // Update the dataset to mark it as analyzed
  dataset.analyzed = true;
  await dataset.save();
  
  res.status(200).json({
    success: true,
    datasetId: dataset._id,
    datasetName: dataset.name,
    analysis: analysisResults
  });
}); 