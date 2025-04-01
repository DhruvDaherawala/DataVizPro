# DataViz Pro - Automated Data Visualization Tool

DataViz Pro is a web-based tool that helps you visualize and analyze data without technical expertise. Simply upload a CSV or JSON file, and the tool automatically detects patterns, correlations, and recommends the best visualization types for your data.

## Features

- Upload and process CSV/JSON files
- Automated data analysis
- Pattern and correlation detection
- Dynamic visualization generation
- Interactive charts with customization options
- AI-driven chart recommendation system

## Tech Stack

- **Frontend**: React.js with Vite, Chart.js for visualizations
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Data Processing**: Custom analysis utilities

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/dataviz-pro.git
   cd dataviz-pro
   ```

2. Install dependencies:
   ```
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. Create a `.env` file in the server directory:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/datavizpro
   NODE_ENV=development
   ```

4. Start the development servers:
   ```
   # Start the backend server
   cd server
   npm run dev

   # In a new terminal, start the frontend
   cd client
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Usage

1. **Upload Data**: Click on the "Upload" button to upload your CSV or JSON file
2. **Explore Datasets**: View all your uploaded datasets in the dashboard
3. **Visualize Data**: Select a dataset to view detailed analysis and visualizations
4. **Customize Charts**: Filter data and try different chart types for your visualization

## License

This project is licensed under the MIT License - see the LICENSE file for details. 