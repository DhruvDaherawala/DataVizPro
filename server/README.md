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

## Setup and Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create an `.env` file based on `.env.example` and update the values.

3. Start the development server:
   ```bash
   npm start
   ```

## API Documentation

The server provides the following endpoints:

- `GET /api/datasets` - Get all datasets
- `GET /api/datasets/:id` - Get a specific dataset
- `POST /api/upload` - Upload a new dataset
- `GET /api/datasets/:id/analyze` - Analyze a dataset
- `GET /api/health` - Health check endpoint

## Deployment to Vercel

This API server is configured for easy deployment on Vercel:

1. Fork or clone this repository to your GitHub account

2. Connect to Vercel:
   - Sign up or log in to [Vercel](https://vercel.com)
   - Click "New Project" and import the repository
   - Select the server directory for deployment

3. Set up a MongoDB database:
   - You can use MongoDB Atlas for a cloud-hosted database
   - Create a new cluster and get the connection string

4. Configure Environment Variables in Vercel:
   - `MONGODB_URI`: Your MongoDB connection string
   - `CORS_ORIGIN`: URL of your frontend application
   - `NODE_ENV`: Set to `production`

5. Deploy:
   - Click "Deploy" and wait for the build to complete
   - Your API server should now be live at the provided Vercel URL

## Environment Variables

- `PORT`: The port the server will run on
- `NODE_ENV`: Environment (development, production)
- `MONGODB_URI`: MongoDB connection string
- `CORS_ORIGIN`: Allowed CORS origin
- `MAX_FILE_SIZE`: Maximum file upload size in bytes
- `ALLOWED_FILE_TYPES`: Comma-separated list of allowed file types
- `FILE_UPLOAD_PATH`: Path to upload files

## Dependencies

- express - Web framework
- mongoose - MongoDB ORM
- multer - File upload handling
- csv-parser - CSV file parsing
- bcryptjs - Password hashing
- cors - CORS middleware
- dotenv - Environment variables 