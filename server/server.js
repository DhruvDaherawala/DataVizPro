const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const errorHandler = require('./middleware/errorHandler');
const connectDB = require('./config/db');
const config = require('./config/config');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Initialize Express app
const app = express();

// Middlewares
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount routers
app.use('/', require('./routes'));

// Error handler middleware
app.use(errorHandler);

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${config.env} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

module.exports = app; 