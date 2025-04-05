import httpClient from './httpClient';
import { ENDPOINTS } from './config/apiConfig';

/**
 * Service for handling dataset operations
 */
export const datasetService = {
  /**
   * Get all datasets
   * @returns {Promise} - Promise that resolves to an array of datasets
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
   * Get a dataset by ID
   * @param {string} id - The dataset ID
   * @returns {Promise} - Promise that resolves to the dataset
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
   * @param {FormData} formData - The form data containing the file and metadata
   * @param {function} onProgress - Optional progress callback
   * @returns {Promise} - Promise that resolves to the created dataset
   */
  uploadDataset: async (formData, onProgress = null) => {
    try {
      const response = await httpClient.upload(ENDPOINTS.UPLOAD, formData, onProgress);
      return response.data;
    } catch (error) {
      console.error('Error uploading dataset:', error);
      throw error;
    }
  },

  /**
   * Delete a dataset by ID
   * @param {string} id - The dataset ID
   * @returns {Promise} - Promise that resolves to the deletion response
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
   * @param {string} id - The dataset ID
   * @returns {Promise} - Promise that resolves to the analysis results
   */
  analyzeDataset: async (id) => {
    try {
      const response = await httpClient.get(ENDPOINTS.DATASET_ANALYZE(id));
      return response.data;
    } catch (error) {
      console.error(`Error analyzing dataset ${id}:`, error);
      throw error;
    }
  }
};

export default datasetService; 