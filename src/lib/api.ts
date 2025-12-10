// API base URL - will use proxy in development
import logger from '@/lib/logger';
import authService from './authService';

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

export interface UploadFileResponse {
    message: string;
    file: ApiFile;
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

export interface IsOwnerResponse {
  is_owner: boolean;
  owner_telegram_id?: number;
}

export interface UserPermission {
  read: boolean;
  write: boolean;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  telegramUserId?: number;
  telegramUsername?: string;
  permissions: UserPermission;
  createdAt: string;
  lastActive?: string;
  userType?: string;  // "local" or "google"
}

export interface UsersResponse {
  users: User[];
}

export interface AddUserRequest {
  username?: string;
  email?: string;
  password?: string;
  permissions: UserPermission;
}

export interface UpdateUserRequest {
  email?: string;
  permissions: UserPermission;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface IndexChatResponse {
  index_chat_id: number | null;
}

export interface UpdateIndexChatRequest {
  index_chat_id: number | null;
}

export interface CreateFolderRequest {
    folderName: string;
    currentPath: string;
}

export interface CreateFolderPathRequest {
    fullPath: string;
}

const getDefaultApiUrl = () => {
  const savedUrl = localStorage.getItem("serverUrl");
  if (savedUrl) {
    return savedUrl;
  }
  return import.meta.env.VITE_API_URL || '/api';
};

const API_BASE_URL = getDefaultApiUrl();

const SERVER_URL_KEY = "serverUrl";

// Function to get the API base URL
export const getApiBaseUrl = (): string => {
  // Check if there's a custom server URL in localStorage
  const customUrl = localStorage.getItem(SERVER_URL_KEY);
  console.log('[getApiBaseUrl] Checking for custom URL:', customUrl);
  
  if (customUrl) {
    return customUrl;
  }
  
  // Return default URL (port 8000)
  if (typeof window !== 'undefined') {
    // Check if running in Tauri
    const isTauri = !!(window as any).__TAURI__;
    console.log('[getApiBaseUrl] Tauri detection:', isTauri);
    
    if (isTauri) {
      // In Tauri, always use localhost:8000 by default
      console.log('[getApiBaseUrl] Returning Tauri default URL: http://localhost:8000');
      return 'http://localhost:8000';
    }
    
    // Assume backend is on port 8000 for web
    const url = new URL(window.location.origin);
    url.port = "8000";
    console.log('[getApiBaseUrl] Returning web default URL:', url.origin);
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
  console.log('[API] Detected Tauri environment with window.__TAURI__:', !!(window as any).__TAURI__);
}

// Dynamically import the HTTP plugin only in Tauri environment
httpReady = import('@tauri-apps/plugin-http').then((module) => {
  http = module;
  logger.info('[API] Tauri HTTP plugin loaded successfully');
}).catch((error) => {
  logger.error('[API] Failed to load Tauri HTTP plugin:', error);
  httpReady = null;
});

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

// Utility function to add auth headers to fetch options
function addAuthHeaders(options: RequestInit = {}): RequestInit {
  const headers = new Headers(options.headers || {});
  
  // Get authentication headers from authService
  const authHeaders = authService.getAuthHeaders();
  
  // Merge authentication headers
  Object.entries(authHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
  
  return {
    ...options,
    headers,
  };
}

// Utility function to implement fetch with timeout
export const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout: number = 3000): Promise<Response> => {
  // Add auth headers to all requests
  const mergedOptions = addAuthHeaders(options);
  
  // Ensure credentials are properly handled
  if (options.credentials) {
    mergedOptions.credentials = options.credentials;
  }
  
  // Check if we're running in Tauri
  const isTauri = !!(window as any).__TAURI__;
  
  // For Tauri environment, we don't want to send credentials as they don't work the same way
  if (isTauri && mergedOptions.credentials === 'include') {
    mergedOptions.credentials = undefined;
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
          body: mergedOptions.body instanceof FormData ? mergedOptions.body : (typeof mergedOptions.body === 'string' ? mergedOptions.body : (mergedOptions.body ? JSON.stringify(mergedOptions.body) : undefined)),
          credentials: isTauriEnv && mergedOptions.credentials === 'include' ? undefined : (mergedOptions.credentials === 'include' ? 'include' : 'omit'),
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
        
        // Check if we're running in Tauri
        const isTauri = !!(window as any).__TAURI__;
        
        // Prepare fetch options
        const fetchOptions: RequestInit = {
            credentials: isTauri ? undefined : 'include', // Include cookies for session-based auth
        };
        
        // Add auth headers to all requests
        const mergedOptions = addAuthHeaders(fetchOptions);
        
        const response = await fetchWithTimeout(`${apiUrl}/files?path=${encodeURIComponent(path)}`, mergedOptions, 3000); // 3 second timeout

        if (!response.ok) {
            throw new Error(`Failed to fetch files: ${response.statusText}`);
        }

        return response.json();
    },

    async checkAuth() {
        const baseUrl = getApiBaseUrl();
        // For the default case, we need to append /api to the base URL
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        
        // Check if we're running in Tauri
        const isTauri = !!(window as any).__TAURI__;
        
        // Prepare fetch options
        const fetchOptions: RequestInit = {
            credentials: isTauri ? undefined : 'include',
        };
        
        // Add auth headers to all requests
        const mergedOptions = addAuthHeaders(fetchOptions);
        
        const response = await fetchWithTimeout(`${apiUrl}/auth/check`, mergedOptions, 3000); // 3 second timeout

        if (!response.ok) {
            throw new Error(`Failed to check auth: ${response.statusText}`);
        }

        return response.json();
    },

    async logout() {
        const baseUrl = getApiBaseUrl();
        // For the default case, we need to append /api to the base URL
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        
        // Check if we're running in Tauri
        const isTauri = !!(window as any).__TAURI__;
        
        // Prepare fetch options
        const fetchOptions: RequestInit = {
            method: 'POST',
            credentials: isTauri ? undefined : 'include',
        };
        
        // Add auth headers to all requests
        const mergedOptions = addAuthHeaders(fetchOptions);
        
        const response = await fetchWithTimeout(`${apiUrl}/auth/logout`, mergedOptions, 3000); // 3 second timeout

        if (!response.ok) {
            throw new Error(`Failed to logout: ${response.statusText}`);
        }

        // Clear auth token from localStorage
        if (typeof window !== 'undefined') {
            localStorage.removeItem('authToken');
        }

        return response.json();
    },

    async fetchUserProfile(): Promise<UserProfile> {
        const baseUrl = getApiBaseUrl();
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        
        // Check if we're running in Tauri
        const isTauri = !!(window as any).__TAURI__;
        
        // Prepare fetch options
        const fetchOptions: RequestInit = {
            method: 'GET',
            credentials: isTauri ? undefined : 'include',
        };
        
        // Add auth headers to all requests
        const mergedOptions = addAuthHeaders(fetchOptions);
        
        const response = await fetchWithTimeout(`${apiUrl}/user/profile`, mergedOptions, 3000);

        if (!response.ok) {
            throw new Error(`Failed to fetch user profile: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Map snake_case fields to camelCase
        const userProfile: UserProfile = {
            username: data.username,
            email: data.email,
            telegram_user_id: data.telegram_user_id,
            telegram_username: data.telegram_username,
            telegram_first_name: data.telegram_first_name,
            telegram_last_name: data.telegram_last_name,
            telegram_profile_picture: data.telegram_profile_picture
        };
        
        return userProfile;
    },    async isUserOwner(): Promise<IsOwnerResponse> {
        const baseUrl = getApiBaseUrl();
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        
        // Check if we're running in Tauri
        const isTauri = !!(window as any).__TAURI__;
        
        // Check authentication before making request
        if (!(await authService.isAuthenticated())) {
          throw new Error('User not authenticated');
        }
        
        const response = await fetchWithTimeout(`${apiUrl}/user/is-owner`, {
            method: 'GET',
            credentials: isTauri ? undefined : 'include',
        }, 3000);

        if (!response.ok) {
            throw new Error(`Failed to check owner status: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Map snake_case fields to camelCase
        const isOwnerResponse: IsOwnerResponse = {
            is_owner: data.is_owner,
            owner_telegram_id: data.owner_telegram_id
        };
        
        return isOwnerResponse;
    },

    async getUsers(): Promise<UsersResponse> {
        const baseUrl = getApiBaseUrl();
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        
        // Check if we're running in Tauri
        const isTauri = !!(window as any).__TAURI__;
        
        // Prepare fetch options
        const fetchOptions: RequestInit = {
            method: 'GET',
            credentials: isTauri ? undefined : 'include',
        };
        
        // Add auth headers to all requests
        const mergedOptions = addAuthHeaders(fetchOptions);
        
        const response = await fetchWithTimeout(`${apiUrl}/users`, mergedOptions, 3000);

        if (!response.ok) {
            throw new Error(`Failed to fetch users: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Map snake_case fields to camelCase
        const usersResponse: UsersResponse = {
            users: data.users.map((user: any) => ({
                id: user.id,
                username: user.username,
                email: user.email,
                telegramUserId: user.telegram_user_id,
                telegramUsername: user.telegram_username,
                permissions: user.permissions,
                createdAt: user.created_at,
                lastActive: user.last_active,
                userType: user.user_type
            }))
        };
        
        return usersResponse;
    },
    async addUser(userData: AddUserRequest): Promise<User> {
        const baseUrl = getApiBaseUrl();
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        
        // Check if we're running in Tauri
        const isTauri = !!(window as any).__TAURI__;
        
        // Prepare fetch options
        const fetchOptions: RequestInit = {
            method: 'POST',
            credentials: isTauri ? undefined : 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        };
        
        // Add auth headers to all requests
        const mergedOptions = addAuthHeaders(fetchOptions);
        
        const response = await fetchWithTimeout(`${apiUrl}/users`, mergedOptions, 3000);

        if (!response.ok) {
            throw new Error(`Failed to add user: ${response.statusText}`);
        }

        return response.json();
    },

    async updateUser(userId: string, userData: UpdateUserRequest): Promise<User> {
        const baseUrl = getApiBaseUrl();
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        
        // Check if we're running in Tauri
        const isTauri = !!(window as any).__TAURI__;
        
        // Prepare fetch options
        const fetchOptions: RequestInit = {
            method: 'PUT',
            credentials: isTauri ? undefined : 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        };
        
        // Add auth headers to all requests
        const mergedOptions = addAuthHeaders(fetchOptions);
        
        const response = await fetchWithTimeout(`${apiUrl}/users/${userId}`, mergedOptions, 3000);

        if (!response.ok) {
            throw new Error(`Failed to update user: ${response.statusText}`);
        }

        return response.json();
    },

    async deleteUser(userId: string): Promise<void> {
        const baseUrl = getApiBaseUrl();
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        
        // Check if we're running in Tauri
        const isTauri = !!(window as any).__TAURI__;
        
        // Prepare fetch options
        const fetchOptions: RequestInit = {
            method: 'DELETE',
            credentials: isTauri ? undefined : 'include',
        };
        
        // Add auth headers to all requests
        const mergedOptions = addAuthHeaders(fetchOptions);
        
        const response = await fetchWithTimeout(`${apiUrl}/users/${userId}`, mergedOptions, 3000);

        if (!response.ok) {
            throw new Error(`Failed to delete user: ${response.statusText}`);
        }
    },

    async changeUserPassword(userId: string, passwordData: ChangePasswordRequest): Promise<{ message: string }> {
        const baseUrl = getApiBaseUrl();
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        
        // Check if we're running in Tauri
        const isTauri = !!(window as any).__TAURI__;
        
        // Prepare fetch options
        const fetchOptions: RequestInit = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: isTauri ? undefined : 'include',
            body: JSON.stringify(passwordData),
        };
        
        // Add auth headers to all requests
        const mergedOptions = addAuthHeaders(fetchOptions);
        
        const response = await fetchWithTimeout(`${apiUrl}/users/${userId}/password`, mergedOptions, 5000);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Failed to change user password: ${response.status}`);
        }

        return response.json();
    },

    async getUserIndexChat(): Promise<IndexChatResponse> {
        const baseUrl = getApiBaseUrl();
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        
        // Check if we're running in Tauri
        const isTauri = !!(window as any).__TAURI__;
        
        // Prepare fetch options
        const fetchOptions: RequestInit = {
            method: 'GET',
            credentials: isTauri ? undefined : 'include',
        };
        
        // Add auth headers to all requests
        const mergedOptions = addAuthHeaders(fetchOptions);
        
        const response = await fetchWithTimeout(`${apiUrl}/user/index-chat`, mergedOptions, 3000);

        if (!response.ok) {
            throw new Error(`Failed to fetch index chat: ${response.statusText}`);
        }

        return response.json();
    },

    async updateUserIndexChat(indexChatData: UpdateIndexChatRequest): Promise<IndexChatResponse> {
        const baseUrl = getApiBaseUrl();
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        
        // Check if we're running in Tauri
        const isTauri = !!(window as any).__TAURI__;
        
        // Prepare fetch options
        const fetchOptions: RequestInit = {
            method: 'PUT',
            credentials: isTauri ? undefined : 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(indexChatData),
        };
        
        // Add auth headers to all requests
        const mergedOptions = addAuthHeaders(fetchOptions);
        
        const response = await fetchWithTimeout(`${apiUrl}/user/index-chat`, mergedOptions, 3000);

        if (!response.ok) {
            throw new Error(`Failed to update index chat: ${response.statusText}`);
        }

        return response.json();
    },

    async uploadFile(file: File, path: string = '/'): Promise<UploadFileResponse> {
        const baseUrl = getApiBaseUrl();
        // For the default case, we need to append /api to the base URL
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', path);
        
        // Check if we're running in Tauri
        const isTauri = !!(window as any).__TAURI__;
        
        // Prepare fetch options
        const fetchOptions: RequestInit = {
            method: 'POST',
            credentials: isTauri ? undefined : 'include',
            body: formData,
        };
        
        // Add auth headers to all requests
        const mergedOptions = addAuthHeaders(fetchOptions);
        
        const response = await fetchWithTimeout(`${apiUrl}/files/upload`, mergedOptions, 30000); // 30 second timeout for file uploads

        if (!response.ok) {
            // Try to get the error message from the response body
            let errorMessage = `Failed to upload file: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.detail) {
                    errorMessage = errorData.detail;
                }
            } catch (e) {
                // If we can't parse the error response, use the generic message
            }
            throw new Error(errorMessage);
        }
        return response.json();
    },

    async createFolder(folderName: string, currentPath: string): Promise<{ message: string }> {
        const baseUrl = getApiBaseUrl();
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        
        // Check if we're running in Tauri
        const isTauri = !!(window as any).__TAURI__;
        
        // Prepare fetch options
        const fetchOptions: RequestInit = {
            method: 'POST',
            credentials: isTauri ? undefined : 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ folderName, currentPath }),
        };
        
        // Add auth headers to all requests
        const mergedOptions = addAuthHeaders(fetchOptions);
        
        const response = await fetchWithTimeout(`${apiUrl}/folders/create`, mergedOptions, 3000);

        if (!response.ok) {
            throw new Error(`Failed to create folder: ${response.statusText}`);
        }

        return response.json();
    },

    async createFolderPath(fullPath: string): Promise<{ message: string }> {
        const baseUrl = getApiBaseUrl();
        // For the default case, we need to append /api to the base URL
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        
        // Check if we're running in Tauri
        const isTauri = !!(window as any).__TAURI__;
        
        // Prepare fetch options
        const fetchOptions: RequestInit = {
            method: 'POST',
            credentials: isTauri ? undefined : 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fullPath }),
        };
        
        // Add auth headers to all requests
        const mergedOptions = addAuthHeaders(fetchOptions);
        
        const response = await fetchWithTimeout(`${apiUrl}/folders/create-path`, mergedOptions, 3000);

        if (!response.ok) {
            throw new Error(`Failed to create folder path: ${response.statusText}`);
        }

        return response.json();
    },
};
