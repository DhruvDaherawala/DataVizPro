/**
 * API Module Index
 * Exports all services and configuration
 */

// Import configuration
import { API_BASE_URL } from './config/apiConfig';

// Log API URL in development
if (import.meta.env.DEV) {
  console.log('Using API URL:', API_BASE_URL);
}

// Export services
export { default as datasetService } from './datasetService';
export { default as httpClient } from './httpClient';

// Export configuration
export * from './config/apiConfig'; 