import httpClient from '../config/httpClient';
import { ENDPOINTS } from '../config/apiConfig';

/**
 * Dataset API Service
 * Handles all API calls related to datasets
 */
const datasetService = {
  /**
   * Get all datasets
   * @returns {Promise} Promise with the datasets data
   */
  getAllDatasets: async () => {
    try {
      const response = await httpClient.get(ENDPOINTS.DATASETS);
      return response.data;
    } catch (error) {
      console.error('Error fetching datasets:', error);
      throw error;
    }
  },

  /**
   * Get dataset by ID
   * @param {string} id - Dataset ID
   * @returns {Promise} Promise with the dataset data
   */
  getDatasetById: async (id) => {
    try {
      const response = await httpClient.get(ENDPOINTS.DATASET_DETAIL(id));
      return response.data;
    } catch (error) {
      console.error(`Error fetching dataset ${id}:`, error);
      throw error;
    }
  },

  /**
   * Upload a new dataset
   * @param {FormData} formData - FormData containing file and metadata
   * @param {Function} onUploadProgress - Optional callback for tracking upload progress
   * @returns {Promise} Promise with the upload response
   */
  uploadDataset: async (formData, onUploadProgress) => {
    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      };
      
      // Add progress tracking if provided
      if (onUploadProgress && typeof onUploadProgress === 'function') {
        config.onUploadProgress = onUploadProgress;
      }
      
      const response = await httpClient.post(ENDPOINTS.UPLOAD, formData, config);
      return response.data;
    } catch (error) {
      console.error('Error uploading dataset:', error);
      throw error;
    }
  },

  /**
   * Delete a dataset
   * @param {string} id - Dataset ID
   * @returns {Promise} Promise with the deletion response
   */
  deleteDataset: async (id) => {
    try {
      const response = await httpClient.delete(ENDPOINTS.DATASET_DETAIL(id));
      return response.data;
    } catch (error) {
      console.error(`Error deleting dataset ${id}:`, error);
      throw error;
    }
  },

  /**
   * Analyze a dataset
   * @param {string} id - Dataset ID
   * @returns {Promise} Promise with the analysis results
   */
  analyzeDataset: async (id) => {
    try {
      const response = await httpClient.get(ENDPOINTS.DATASET_ANALYZE(id));
      return response.data;
    } catch (error) {
      console.error(`Error analyzing dataset ${id}:`, error);
      throw error;
    }
  },
};

export default datasetService; 