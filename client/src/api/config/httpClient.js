import axios from 'axios';
import { API_BASE_URL, TIMEOUT, DEFAULT_HEADERS, ERROR_MESSAGES } from './apiConfig';

/**
 * Creates and configures an Axios instance for API requests
 */
const createHttpClient = () => {
  // Create new Axios instance
  const httpClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: TIMEOUT,
    headers: DEFAULT_HEADERS,
  });

  // Request interceptor - runs before each request
  httpClient.interceptors.request.use(
    (config) => {
      // Get token from localStorage if needed for authentication
      // const token = localStorage.getItem('token');
      // if (token) {
      //   config.headers.Authorization = `Bearer ${token}`;
      // }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - runs after each response
  httpClient.interceptors.response.use(
    (response) => {
      // Any status code in the range of 2xx will trigger this function
      return response;
    },
    (error) => {
      // Any status codes outside the range of 2xx will trigger this function
      let errorMessage = ERROR_MESSAGES.GENERAL;

      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        switch (error.response.status) {
          case 400:
            errorMessage = error.response.data?.error || ERROR_MESSAGES.VALIDATION;
            break;
          case 401:
            errorMessage = ERROR_MESSAGES.UNAUTHORIZED;
            // Optionally handle token expiration
            // localStorage.removeItem('token');
            // window.location.href = '/login';
            break;
          case 404:
            errorMessage = ERROR_MESSAGES.NOT_FOUND;
            break;
          case 500:
            errorMessage = ERROR_MESSAGES.SERVER;
            break;
          default:
            errorMessage = error.response.data?.error || ERROR_MESSAGES.GENERAL;
        }
      } else if (error.request) {
        // The request was made but no response was received
        if (error.code === 'ECONNABORTED') {
          errorMessage = ERROR_MESSAGES.TIMEOUT;
        } else {
          errorMessage = ERROR_MESSAGES.NETWORK;
        }
      }

      // Enhance error object with a friendly message
      error.friendlyMessage = errorMessage;
      return Promise.reject(error);
    }
  );

  return httpClient;
};

// Export the configured Axios instance
export default createHttpClient(); 