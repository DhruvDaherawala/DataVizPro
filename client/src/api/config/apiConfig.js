/**
 * API Configuration
 * Contains all API related configuration values
 */

// Base URL for all API calls
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// API endpoints
export const ENDPOINTS = {
  // Dataset endpoints
  DATASETS: '/datasets',
  DATASET_DETAIL: (id) => `/datasets/${id}`,
  DATASET_ANALYZE: (id) => `/datasets/${id}/analyze`,
  UPLOAD: '/upload',
};

// Request timeout in milliseconds
export const TIMEOUT = 30000;

// Default headers for API requests
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

// Error messages
export const ERROR_MESSAGES = {
  GENERAL: 'Something went wrong. Please try again later.',
  NETWORK: 'Network error. Please check your internet connection.',
  NOT_FOUND: 'The requested resource was not found.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  VALIDATION: 'Validation error. Please check your input.',
  SERVER: 'Server error. Please try again later.',
  TIMEOUT: 'Request timed out. Please try again.',
};

// Log API configuration in development mode
if (import.meta.env.DEV) {
  console.log('API Configuration:', {
    API_BASE_URL,
    ENV: import.meta.env.MODE
  });
}

export default {
  API_BASE_URL,
  ENDPOINTS,
  TIMEOUT,
  DEFAULT_HEADERS,
  ERROR_MESSAGES,
}; 