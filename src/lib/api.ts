// API base URL - will use proxy in development
import logger from '@/lib/logger';

const getDefaultApiUrl = () => {
  const savedUrl = localStorage.getItem("serverUrl");
  if (savedUrl) {
    return savedUrl;
  }
  return import.meta.env.VITE_API_URL || '/api';
};

const API_BASE_URL = getDefaultApiUrl();

export interface ApiFile {
    id: string;
    chat_id: number;
    message_id: number;
    file_type: 'document' | 'video' | 'photo' | 'voice' | 'audio';
    thumbnail: string | null;
    file_unique_id: string;
    file_size: number;
    file_name: string | null;
    file_caption: string | null;
    file_path: string;  // Path where file is located
}

export interface FilesResponse {
    files: ApiFile[];
}

export interface UserProfile {
  username: string;
  email?: string;
  telegram_user_id?: number;
  telegram_username?: string;
  telegram_first_name?: string;
  telegram_last_name?: string;
  telegram_profile_picture?: string;
}

const SERVER_URL_KEY = "serverUrl";

// Function to get the API base URL
export const getApiBaseUrl = (): string => {
  // Check if there's a custom server URL in localStorage
  const customUrl = localStorage.getItem(SERVER_URL_KEY);
  if (customUrl) {
    return customUrl;
  }
  
  // Return default URL (port 8000)
  if (typeof window !== 'undefined') {
    // Check if running in Tauri
    const isTauri = !!(window as any).__TAURI__;
    if (isTauri) {
      // In Tauri, always use localhost:8000 by default
      return 'http://localhost:8000';
    }
    
    // Assume backend is on port 8000 for web
    const url = new URL(window.location.origin);
    url.port = "8000";
    return url.origin;
  }
  
  return import.meta.env.VITE_API_URL || '';
};

// Function to update the API base URL
export const updateApiBaseUrl = (url: string) => {
  if (url) {
    localStorage.setItem(SERVER_URL_KEY, url);
  } else {
    localStorage.removeItem(SERVER_URL_KEY);
  }
};

// Function to reset API base URL to default
export const resetApiBaseUrl = () => {
  localStorage.removeItem(SERVER_URL_KEY);
};

// Function to construct full API URLs
export const getFullApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  
  // If we have a custom base URL, append the endpoint
  if (baseUrl) {
    // Ensure the endpoint starts with a slash
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${formattedEndpoint}`;
  }
  
  // For same-origin requests, prepend /api to the endpoint
  const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  return apiEndpoint;
};

// Import Tauri HTTP plugin
let http: typeof import('@tauri-apps/plugin-http') | null = null;
let isTauriEnv = false;
let httpReady: Promise<void> | null = null;

// Check if we're running in Tauri
if (typeof window !== 'undefined' && (window as any).__TAURI__) {
  isTauriEnv = true;
  logger.info('[API] Detected Tauri environment');
  
  // Dynamically import the HTTP plugin only in Tauri environment
  httpReady = import('@tauri-apps/plugin-http').then((module) => {
    http = module;
    logger.info('[API] Tauri HTTP plugin loaded successfully');
  }).catch((error) => {
    logger.error('[API] Failed to load Tauri HTTP plugin:', error);
    httpReady = null;
  });
}

// Utility function to get auth headers for requests
const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};
  
  // Check if we're in Tauri and have an auth token
  const isTauri = !!(window as any).__TAURI__;
  if (isTauri) {
    try {
      const tauri_auth = localStorage.getItem('tauri_auth_token');
      if (tauri_auth) {
        const authData = JSON.parse(tauri_auth);
        if (authData.auth_token) {
          headers['X-Auth-Token'] = authData.auth_token;
          logger.info('[API] Adding auth token to request', { token: authData.auth_token.substring(0, 10) + '...' });
        } else {
          logger.warn('[API] tauri_auth_token exists but no auth_token field');
        }
      } else {
        logger.info('[API] No tauri_auth_token in localStorage');
      }
    } catch (e) {
      logger.error('[API] Failed to get auth token from localStorage:', e);
    }
  }
  
  return headers;
};

// Utility function to implement fetch with timeout
export const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout: number = 3000): Promise<Response> => {
  // Add auth headers to all requests
  const authHeaders = getAuthHeaders();
  const mergedOptions = {
    ...options,
    headers: {
      ...authHeaders,
      ...(options.headers as Record<string, string>)
    }
  };
  
  // Ensure credentials are properly handled
  if (options.credentials) {
    mergedOptions.credentials = options.credentials;
  }

  logger.info('[API] fetchWithTimeout called with:', { url, options, timeout });

  // Use Tauri HTTP plugin if available (in Tauri environment)
  if (isTauriEnv) {
    logger.info('[API] Running in Tauri environment');
    try {
      // Wait for Tauri HTTP plugin to load if it's still loading
      if (httpReady) {
        logger.info('[API] Waiting for Tauri HTTP plugin to load');
        await httpReady;
      }
      
      if (http) {
        logger.info('[API] Using Tauri HTTP plugin for request to:', url);
        // Make the request using Tauri's HTTP plugin
        const response = await http.fetch(url, {
          method: mergedOptions.method || 'GET',
          headers: mergedOptions.headers,
          body: typeof mergedOptions.body === 'string' ? mergedOptions.body : (mergedOptions.body ? JSON.stringify(mergedOptions.body) : undefined),
          credentials: mergedOptions.credentials === 'include' ? 'include' : 'omit',
        });
        
        logger.info('[API] Tauri HTTP response status:', response.status);
        // Return the response directly as it's already a standard Response object
        return response;
      } else {
        logger.warn('[API] Tauri HTTP plugin not available after waiting, falling back to standard fetch');
      }
    } catch (error) {
      logger.error('[API] Tauri HTTP request failed, falling back to standard fetch:', error);
    }
    
    // Fall back to standard fetch if Tauri HTTP plugin fails
    logger.info('[API] Falling back to standard fetch for request to:', url);
  }
  
  // Standard browser fetch with timeout (for non-Tauri environments)
  logger.info('[API] Using standard fetch for request to:', url);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    logger.info('[API] Making fetch request with options:', mergedOptions);
    const response = await fetch(url, {
      ...mergedOptions,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    logger.info('[API] Standard fetch response status:', response.status);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    logger.error('[API] Standard fetch error:', error);
    throw error;
  }
};

export const api = {
    async fetchFiles(path: string = '/'): Promise<FilesResponse> {
        const baseUrl = getApiBaseUrl();
        // For the default case, we need to append /api to the base URL
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        
        // Prepare fetch options
        const fetchOptions: RequestInit = {
            credentials: 'include', // Include cookies for session-based auth
        };
        
        // Add auth token for Tauri environment
        if ((window as any).__TAURI__) {
            const tauri_auth = localStorage.getItem('tauri_auth_token');
            if (tauri_auth) {
                try {
                    const authData = JSON.parse(tauri_auth);
                    if (authData.auth_token) {
                        fetchOptions.headers = {
                            ...fetchOptions.headers,
                            'X-Auth-Token': authData.auth_token
                        };
                    }
                } catch (e) {
                    logger.error('Failed to parse Tauri auth token:', e);
                }
            }
        }
        
        const response = await fetchWithTimeout(`${apiUrl}/files?path=${encodeURIComponent(path)}`, fetchOptions, 3000); // 3 second timeout

        if (!response.ok) {
            throw new Error(`Failed to fetch files: ${response.statusText}`);
        }

        return response.json();
    },

    async checkAuth() {
        const baseUrl = getApiBaseUrl();
        // For the default case, we need to append /api to the base URL
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        
        // Prepare fetch options
        const fetchOptions: RequestInit = {
            credentials: 'include',
        };
        
        // Add auth token for Tauri environment
        if ((window as any).__TAURI__) {
            const tauri_auth = localStorage.getItem('tauri_auth_token');
            if (tauri_auth) {
                try {
                    const authData = JSON.parse(tauri_auth);
                    if (authData.auth_token) {
                        fetchOptions.headers = {
                            ...fetchOptions.headers,
                            'X-Auth-Token': authData.auth_token
                        };
                    }
                } catch (e) {
                    logger.error('Failed to parse Tauri auth token:', e);
                }
            }
        }
        
        const response = await fetchWithTimeout(`${apiUrl}/auth/check`, fetchOptions, 3000); // 3 second timeout

        if (!response.ok) {
            throw new Error(`Failed to check auth: ${response.statusText}`);
        }

        return response.json();
    },

    async logout() {
        const baseUrl = getApiBaseUrl();
        // For the default case, we need to append /api to the base URL
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        const response = await fetchWithTimeout(`${apiUrl}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
        }, 3000); // 3 second timeout

        if (!response.ok) {
            throw new Error(`Failed to logout: ${response.statusText}`);
        }

        return response.json();
    },

    async fetchUserProfile(): Promise<UserProfile> {
        const baseUrl = getApiBaseUrl();
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        
        const response = await fetchWithTimeout(`${apiUrl}/user/profile`, {
            method: 'GET',
            credentials: 'include',
        }, 3000);

        if (!response.ok) {
            throw new Error(`Failed to fetch user profile: ${response.statusText}`);
        }

        return response.json();
    },

};
