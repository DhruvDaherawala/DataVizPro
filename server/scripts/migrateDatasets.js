/**
 * Migration script to update existing datasets with the 'analyzed' field
 * 
 * This script should be run after adding the 'analyzed' field to the Dataset schema.
 * It sets the 'analyzed' field to false for all existing datasets that don't have this field.
 * 
 * Run with: node server/scripts/migrateDatasets.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const Dataset = require('../models/Dataset');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected for migration'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function migrateDatasets() {
  try {
    console.log('Starting dataset migration...');
    
    // Find all datasets that don't have the 'analyzed' field set
    const datasets = await Dataset.find({ analyzed: { $exists: false } });
    
    console.log(`Found ${datasets.length} datasets to migrate`);
    
    // Update each dataset to set analyzed = false
    for (const dataset of datasets) {
      dataset.analyzed = false;
      await dataset.save();
      console.log(`Updated dataset: ${dataset._id} - ${dataset.name}`);
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateDatasets(); 