import axios from 'axios';
import { API_BASE_URL, TIMEOUT, DEFAULT_HEADERS } from './config/apiConfig';

/**
 * Enhanced HTTP client for API requests
 * This is a wrapper around axios that provides consistent error handling and configuration
 */
class HttpClient {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: TIMEOUT,
      headers: DEFAULT_HEADERS,
    });

    // Add request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Log requests in development mode
        if (import.meta.env.DEV) {
          console.log(`REQUEST: ${config.method.toUpperCase()} ${config.url}`, config);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Log responses in development mode
        if (import.meta.env.DEV) {
          console.log(`RESPONSE: ${response.status} ${response.config.url}`, response.data);
        }
        return response;
      },
      (error) => {
        // Format error response
        let errorResponse = {
          message: error.message || 'Unknown error occurred',
          status: error.response?.status || 500,
          data: error.response?.data || null
        };

        // Log errors in development mode
        if (import.meta.env.DEV) {
          console.error('API ERROR:', errorResponse);
        }

        return Promise.reject(errorResponse);
      }
    );
  }

  /**
   * Make a GET request
   * @param {string} url - The URL to make the request to
   * @param {Object} params - URL parameters
   * @param {Object} config - Additional axios config
   * @returns {Promise} - The axios promise
   */
  get(url, params = {}, config = {}) {
    return this.axiosInstance.get(url, { ...config, params });
  }

  /**
   * Make a POST request
   * @param {string} url - The URL to make the request to
   * @param {Object} data - The data to send
   * @param {Object} config - Additional axios config
   * @returns {Promise} - The axios promise
   */
  post(url, data = {}, config = {}) {
    return this.axiosInstance.post(url, data, config);
  }

  /**
   * Make a PUT request
   * @param {string} url - The URL to make the request to
   * @param {Object} data - The data to send
   * @param {Object} config - Additional axios config
   * @returns {Promise} - The axios promise
   */
  put(url, data = {}, config = {}) {
    return this.axiosInstance.put(url, data, config);
  }

  /**
   * Make a DELETE request
   * @param {string} url - The URL to make the request to
   * @param {Object} config - Additional axios config
   * @returns {Promise} - The axios promise
   */
  delete(url, config = {}) {
    return this.axiosInstance.delete(url, config);
  }

  /**
   * Make a multipart/form-data POST request (for file uploads)
   * @param {string} url - The URL to make the request to
   * @param {FormData} formData - The FormData object
   * @param {function} onUploadProgress - Progress callback function
   * @returns {Promise} - The axios promise
   */
  upload(url, formData, onUploadProgress = null) {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    };
    
    // Add progress tracking if provided
    if (onUploadProgress && typeof onUploadProgress === 'function') {
      config.onUploadProgress = (progressEvent) => {
        // Calculate the upload percentage
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        
        // Call the progress callback with useful information
        onUploadProgress({
          loaded: progressEvent.loaded,
          total: progressEvent.total,
          percentage: percentCompleted,
          completed: percentCompleted === 100
        });
      };
    }
    
    return this.axiosInstance.post(url, formData, config);
  }
}

// Export a singleton instance
export default new HttpClient(); 