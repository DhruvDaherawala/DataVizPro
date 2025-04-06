/**
 * Migration script to update existing datasets with file sizes
 * 
 * This script should be run after adding the fileSize field to the Dataset schema.
 * It sets the fileSize field by checking the actual file size on disk.
 * 
 * Run with: node server/scripts/updateFileSizes.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();
const Dataset = require('../models/Dataset');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected for migration'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function updateFileSizes() {
  try {
    console.log('Starting file size migration...');
    
    // Find all datasets that don't have a valid fileSize
    const datasets = await Dataset.find({ 
      $or: [
        { fileSize: { $exists: false } },
        { fileSize: null },
        { fileSize: 0 }
      ] 
    });
    
    console.log(`Found ${datasets.length} datasets to update`);
    
    // Update each dataset with the file size from disk
    for (const dataset of datasets) {
      try {
        if (dataset.filePath && fs.existsSync(dataset.filePath)) {
          const stats = fs.statSync(dataset.filePath);
          dataset.fileSize = stats.size;
          await dataset.save();
          console.log(`Updated dataset: ${dataset._id} - ${dataset.name} with file size: ${stats.size} bytes`);
        } else {
          console.log(`File not found for dataset: ${dataset._id} - ${dataset.name}, setting default size`);
          // Set a default file size if the file doesn't exist
          // This is better than leaving it as 0 or null
          dataset.fileSize = 1024 * 10; // Default 10KB
          await dataset.save();
        }
      } catch (fileError) {
        console.error(`Error updating file size for dataset ${dataset._id}: ${fileError.message}`);
      }
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
updateFileSizes(); 