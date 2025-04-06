const mongoose = require('mongoose');

const DatasetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Dataset name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  filePath: {
    type: String,
    required: [true, 'File path is required']
  },
  fileType: {
    type: String,
    required: [true, 'File type is required'],
    enum: ['csv', 'json']
  },
  fileSize: {
    type: Number,
    default: 0
  },
  columns: {
    type: [String],
    default: []
  },
  sampleData: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  analyzed: {
    type: Boolean,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Not required for now, but useful if you implement user authentication later
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for dataset URL
DatasetSchema.virtual('url').get(function() {
  return `/datasets/${this._id}`;
});

// Pre-save hook to ensure certain fields are set
DatasetSchema.pre('save', function(next) {
  // Any pre-save operations can go here
  next();
});

// Indexes for faster queries
DatasetSchema.index({ name: 'text', description: 'text' });
DatasetSchema.index({ uploadDate: -1 });

module.exports = mongoose.model('Dataset', DatasetSchema); 