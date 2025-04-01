import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dataset services
export const datasetService = {
  // Get all datasets
  getAllDatasets: async () => {
    try {
      const response = await apiClient.get('/datasets');
      return response.data;
    } catch (error) {
      console.error('Error fetching datasets:', error);
      throw error;
    }
  },

  // Get dataset by ID
  getDatasetById: async (id) => {
    try {
      const response = await apiClient.get(`/datasets/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching dataset ${id}:`, error);
      throw error;
    }
  },

  // Upload a new dataset
  uploadDataset: async (formData) => {
    try {
      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading dataset:', error);
      throw error;
    }
  },

  // Analyze a dataset
  analyzeDataset: async (id) => {
    try {
      const response = await apiClient.get(`/datasets/${id}/analyze`);
      return response.data;
    } catch (error) {
      console.error(`Error analyzing dataset ${id}:`, error);
      throw error;
    }
  }
};

export default apiClient; 