import { logger } from './logger';
import { getApiBaseUrl } from './api';

// Type definitions
interface AuthHeaders {
  [key: string]: string;
}

interface UserProfile {
  username: string;
  email?: string;
  telegramUserId?: number;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
  telegramProfilePicture?: string;
}

interface AuthCheckResponse {
  authenticated: boolean;
  username?: string;
  user_picture?: string;
  is_admin?: boolean;
}

/**
 * Authentication Service
 * Centralized authentication management for the application
 */

// Check if we're running in Tauri
const isTauri = !!(window as any).__TAURI__;

/**
 * Get authentication headers for requests
 */
export function getAuthHeaders(): AuthHeaders {
  const headers: Record<string, string> = {};
  
  if (isTauri) {
    // For Tauri environment, use auth token from localStorage
    try {
      const tauriAuth = localStorage.getItem('tauri_auth_token');
      if (tauriAuth) {
        const authData = JSON.parse(tauriAuth);
        if (authData.auth_token) {
          headers['X-Auth-Token'] = authData.auth_token;
        }
      }
    } catch (e) {
      logger.error('Failed to get auth token from localStorage:', e);
    }
  } else {
    // For browser environment, cookies are handled automatically with credentials
    // No additional headers needed here
  }
  
  return headers;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
    
    const response = await fetch(`${apiUrl}/auth/check`, {
      method: 'GET',
      credentials: isTauri ? undefined : 'include',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data: AuthCheckResponse = await response.json();
    return data.authenticated === true;
  } catch (error) {
    logger.error('Authentication check failed:', error);
    return false;
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<UserProfile> {
  try {
    const baseUrl = getApiBaseUrl();
    const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
    
    const response = await fetch(`${apiUrl}/user/profile`, {
      method: 'GET',
      credentials: isTauri ? undefined : 'include',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get user profile: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Map snake_case fields to camelCase
    const userProfile = {
      username: data.username,
      email: data.email,
      telegramUserId: data.telegram_user_id,
      telegramUsername: data.telegram_username,
      telegramFirstName: data.telegram_first_name,
      telegramLastName: data.telegram_last_name,
      telegramProfilePicture: data.telegram_profile_picture
    };
    
    return userProfile;
  } catch (error) {
    logger.error('Failed to get current user:', error);
    throw error;
  }
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  try {
    const baseUrl = getApiBaseUrl();
    const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
    
    const response = await fetch(`${apiUrl}/auth/logout`, {
      method: 'POST',
      credentials: isTauri ? undefined : 'include',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Logout failed: ${response.statusText}`);
    }
    
    // Clear local storage items
    if (isTauri) {
      localStorage.removeItem('tauri_auth_token');
    }
    
    logger.info('User logged out successfully');
  } catch (error) {
    logger.error('Logout failed:', error);
    throw error;
  }
}

/**
 * Refresh authentication token (if needed)
 */
export async function refreshToken(): Promise<boolean> {
  // Since there's no refresh endpoint in the backend, we'll just check if the user is still authenticated
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      // If not authenticated, clear any stored tokens
      if (isTauri) {
        localStorage.removeItem('tauri_auth_token');
      }
      return false;
    }
    
    logger.info('Authentication is still valid');
    return true;
  } catch (error) {
    logger.error('Token refresh failed:', error);
    return false;
  }
}

/**
 * Check if token needs refresh
 */
export function isTokenExpired(): boolean {
  if (isTauri) {
    try {
      const tauriAuth = localStorage.getItem('tauri_auth_token');
      if (tauriAuth) {
        const authData = JSON.parse(tauriAuth);
        if (authData.expires_at) {
          const expirationTime = new Date(authData.expires_at).getTime();
          const currentTime = new Date().getTime();
          // Refresh if token expires in less than 5 minutes
          return (expirationTime - currentTime) < 5 * 60 * 1000;
        }
      }
      return true; // If we can't determine expiration, assume it's expired
    } catch (e) {
      logger.error('Failed to check token expiration:', e);
      return true;
    }
  }
  // For browser environment, cookie expiration is handled by the browser
  return false;
}

export default {
  getAuthHeaders,
  isAuthenticated,
  getCurrentUser,
  logout,
  refreshToken,
  isTokenExpired,
  isTauri
};