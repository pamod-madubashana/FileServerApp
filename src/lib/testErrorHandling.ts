// Test function to verify our error handling works correctly
import { handleApiError } from '@/lib/errorHandler';

// Mock function to simulate a 401 error response
export const simulate401Error = () => {
  const errorResponse = new Response(null, {
    status: 401,
    statusText: 'Unauthorized'
  });
  
  return handleApiError(errorResponse, 'auth');
};

// Mock function to simulate a network error
export const simulateNetworkError = () => {
  const networkError = new Error('Failed to fetch');
  return handleApiError(networkError, 'network');
};

// Mock function to simulate a server error
export const simulateServerError = () => {
  const serverError = new Response(null, {
    status: 500,
    statusText: 'Internal Server Error'
  });
  
  return handleApiError(serverError, 'server');
};