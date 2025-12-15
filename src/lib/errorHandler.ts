import { toast } from "sonner";

export interface ApiError {
  status: number;
  message: string;
  detail?: string;
}

// Function to handle API errors and show appropriate dialogs
export const handleApiError = (
  error: any,
  errorType: 'upload' | 'download' | 'network' | 'server' | 'auth' | 'unknown' = 'unknown'
): ApiError => {
  let status = 0;
  let message = "An unexpected error occurred";
  let detail = "";

  if (error instanceof Response) {
    // Handle Response objects (from fetch)
    status = error.status;
    message = error.statusText || "HTTP Error";
    detail = `HTTP ${status}: ${message}`;
  } else if (error && typeof error === 'object' && 'status' in error) {
    // Handle error objects with status property
    status = error.status;
    message = error.message || error.detail || "API Error";
    detail = error.detail || error.message || "";
  } else if (error instanceof Error) {
    // Handle JavaScript Error objects
    message = error.message;
    detail = error.message;
  } else if (typeof error === 'string') {
    // Handle string errors
    message = error;
    detail = error;
  }

  // Special handling for different status codes
  switch (status) {
    case 401:
      message = "Authentication required";
      detail = "Your session has expired or you're not logged in. Please log in again.";
      errorType = 'auth';
      break;
    case 403:
      message = "Access denied";
      detail = "You don't have permission to perform this action.";
      errorType = 'auth';
      break;
    case 404:
      message = "Resource not found";
      detail = "The requested resource could not be found.";
      errorType = 'server';
      break;
    case 500:
      message = "Internal server error";
      detail = "Something went wrong on the server. Please try again later.";
      errorType = 'server';
      break;
    case 502:
    case 503:
      message = "Service unavailable";
      detail = "The server is temporarily unavailable. Please try again later.";
      errorType = 'server';
      break;
    default:
      if (status >= 400 && status < 500) {
        message = "Client error";
        detail = `HTTP ${status}: ${message}`;
        errorType = 'network';
      } else if (status >= 500) {
        message = "Server error";
        detail = `HTTP ${status}: ${message}`;
        errorType = 'server';
      }
  }

  // Show toast notification for the error
  toast.error(message, {
    description: detail,
    duration: 5000,
  });

  return {
    status,
    message,
    detail
  };
};

// Type guard to check if an error is a Response object
export const isResponseError = (error: any): error is Response => {
  return error instanceof Response;
};

// Type guard to check if an error has a status property
export const hasStatusProperty = (error: any): error is { status: number; message?: string; detail?: string } => {
  return error && typeof error === 'object' && 'status' in error;
};