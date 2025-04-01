const mongoose = require('mongoose');

const AnalysisSchema = new mongoose.Schema({
  datasetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dataset',
    required: [true, 'Dataset ID is required']
  },
  columnTypes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  statistics: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  correlations: {
    type: Array,
    default: []
  },
  chartRecommendations: {
    type: Array,
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Set the updatedAt parameter equal to the current time
AnalysisSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Analysis', AnalysisSchema); 