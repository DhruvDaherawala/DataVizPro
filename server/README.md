# DataViz Pro - Backend API

The backend API for DataViz Pro, an automated data visualization tool. This API handles file uploads, data processing, and analysis.

## Project Structure

```
server/
│
├── config/              # Configuration files
│   ├── config.js        # General app config
│   └── db.js            # Database connection
│
├── controllers/         # Route controllers
│   └── datasetController.js    # Dataset endpoints
│
├── middleware/          # Express middleware
│   ├── asyncHandler.js  # Async handler for routes
│   └── errorHandler.js  # Error handling middleware
│
├── models/              # Mongoose models
│   ├── Analysis.js      # Analysis model
│   ├── Dataset.js       # Dataset model 
│   ├── User.js          # User model
│   └── index.js         # Models export
│
├── routes/              # API routes
│   ├── datasetRoutes.js # Dataset routes
│   └── index.js         # Routes export
│
├── services/            # Business logic services
│   ├── analysisService.js # Data analysis logic
│   └── fileService.js     # File processing logic
│
├── utils/               # Utility functions
│   └── errorResponse.js # Custom error class
│
├── uploads/             # File uploads storage
├── public/              # Static files
├── .env                 # Environment variables
├── .env.example         # Example env file
├── server.js            # App entry point
└── package.json         # Dependencies
```

## API Endpoints

- **GET /api/datasets** - Get all datasets
- **GET /api/datasets/:id** - Get single dataset
- **POST /api/upload** - Upload a new dataset
- **DELETE /api/datasets/:id** - Delete a dataset
- **GET /api/datasets/:id/analyze** - Analyze a dataset

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy the `.env.example` file to `.env` and update the values
4. Start the server: `npm run dev`

## Dependencies

- express - Web framework
- mongoose - MongoDB ORM
- multer - File upload handling
- csv-parser - CSV file parsing
- bcryptjs - Password hashing
- cors - CORS middleware
- dotenv - Environment variables 