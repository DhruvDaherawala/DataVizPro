# DataVizPro - Modern Data Visualization Platform

DataVizPro is a comprehensive web application designed to simplify data exploration and visualization. It allows users without technical expertise to upload data files, automatically analyze them, and generate insightful visualizations with just a few clicks.

## Project Overview

DataVizPro transforms the way users interact with their data by removing the technical barriers typically associated with data visualization. The platform offers:

- **Intuitive User Interface** - Clean, modern design that guides users through the visualization process
- **Automated Analysis** - Built-in intelligence to detect patterns, correlations, and interesting insights
- **Interactive Visualization** - Dynamic, responsive charts that can be customized and explored
- **AI-Powered Recommendations** - Smart suggestions for the most appropriate visualization types based on data characteristics
- **Cross-Platform Accessibility** - Fully responsive design works on desktop and mobile devices

The application is built as a full-stack solution with a React frontend and Node.js backend, featuring RESTful API architecture and MongoDB for data storage.

## Key Features

- **Data Upload and Processing**
  - Support for CSV and JSON file formats
  - Automatic data type detection and validation
  - Preprocessing capabilities for data cleaning
  
- **Visualization Dashboard**
  - Multiple chart types (Bar, Line, Pie, Scatter)
  - Custom chart creation with intuitive controls
  - Responsive layout with adjustable chart sizes
  - Interactive elements (tooltips, zooming, filtering)
  
- **Advanced Filtering**
  - Multi-condition filters that can be combined
  - Real-time data filtering with immediate visual feedback
  - Save and reuse filter combinations
  
- **Export and Sharing**
  - Download visualizations as images
  - Share links to specific chart views
  - Embed options for charts

## Tech Stack Used

### Frontend
- **React.js** (v19.0.0) - Core UI library
- **Vite** - Build tool and development server
- **React Router** - For application routing and navigation
- **Chart.js & React-Chartjs-2** - Visualization libraries
- **Axios** - HTTP client for API communication
- **PapaParse** - CSV parsing utility
- **React Colorful** - Color picker for chart customization
- **React Toastify** - Notification system
- **SweetAlert2** - Enhanced dialog boxes
- **HTML2Canvas** - For exporting charts as images
- **D3.js** - Advanced data visualization capabilities

### Backend
- **Node.js** - Server runtime
- **Express** - Web framework
- **MongoDB** - NoSQL database for data storage
- **Mongoose** - MongoDB object modeling
- **Multer** - File upload handling
- **CSV-Parser** - For processing CSV files
- **CORS** - Cross-Origin Resource Sharing middleware
- **Dotenv** - Environment variable management
- **Bcryptjs** - Password hashing (for future authentication features)

### DevOps & Deployment
- **Vercel** - Hosting and deployment platform
- **Git/GitHub** - Version control

## Setup and Installation Instructions

### Prerequisites
- Node.js (v14+ recommended)
- MongoDB (local installation or MongoDB Atlas account)
- Git

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/DataVizPro.git
   cd DataVizPro
   ```

2. **Set up the backend**
   ```bash
   cd server
   npm install
   ```
   
   Create a `.env` file in the server directory:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/datavizpro
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173
   MAX_FILE_SIZE=10485760
   ALLOWED_FILE_TYPES=csv,json
   FILE_UPLOAD_PATH=uploads
   ```

3. **Set up the frontend**
   ```bash
   cd ../client
   npm install
   ```
   
   Create a `.env` file in the client directory:
   ```
   VITE_API_URL=http://localhost:5000/api
   VITE_APP_NAME=DataVizPro
   VITE_MAX_UPLOAD_SIZE=10485760
   ```

4. **Start development servers**
   
   In the server directory:
   ```bash
   npm run dev
   ```
   
   In the client directory (new terminal):
   ```bash
   npm run dev
   ```

5. **Access the application**
   
   Open your browser and navigate to `http://localhost:5173`

### Deployment Instructions

The application is configured for easy deployment on Vercel:

1. **Backend Deployment**
   - Fork or clone the repository to your GitHub account
   - Connect to Vercel and create a new project
   - Select the server directory for deployment
   - Configure environment variables (see server README.md)
   - Deploy

2. **Frontend Deployment**
   - Connect to Vercel and create a new project
   - Select the client directory for deployment
   - Set the VITE_API_URL to point to your deployed backend
   - Deploy

## Live Deployment Links

- **Frontend Application**: [https://data-viz-pro-frontend.vercel.app](https://data-viz-pro-frontend.vercel.app)
- **Backend API**: [https://data-viz-pro-backend.vercel.app](https://data-viz-pro-backend.vercel.app)