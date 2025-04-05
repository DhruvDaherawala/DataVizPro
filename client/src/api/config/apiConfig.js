/**
 * API Configuration
 * Contains all API related configuration values
 */

// Base URL for all API calls
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// API endpoints
export const ENDPOINTS = {
  // Dataset endpoints
  DATASETS: '/api/datasets',
  DATASET_DETAIL: (id) => `/api/datasets/${id}`,
  DATASET_ANALYZE: (id) => `/api/datasets/${id}/analyze`,
  UPLOAD: '/api/upload',
};

// Check if we need to remove the duplicate /api prefix
// This handles cases where VITE_API_URL already includes /api
if (API_BASE_URL.endsWith('/api')) {
  console.log('API_BASE_URL already includes /api, adjusting endpoints');
  ENDPOINTS.DATASETS = '/datasets';
  ENDPOINTS.DATASET_DETAIL = (id) => `/datasets/${id}`;
  ENDPOINTS.DATASET_ANALYZE = (id) => `/datasets/${id}/analyze`;
  ENDPOINTS.UPLOAD = '/upload';
}

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
} else {
  // Also log in production to debug the issue
  console.log('Production API Configuration:', {
    API_BASE_URL,
    DATASETS_PATH: ENDPOINTS.DATASETS,
    DETAIL_PATH: ENDPOINTS.DATASET_DETAIL('example-id')
  });
}

export default {
  API_BASE_URL,
  ENDPOINTS,
  TIMEOUT,
  DEFAULT_HEADERS,
  ERROR_MESSAGES,
}; 