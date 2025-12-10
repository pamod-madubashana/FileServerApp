import { logger } from './logger';
import { getApiBaseUrl } from './api';

/**
 * Authentication Service
 * Centralized authentication management for the application
 */

// Check if we're running in Tauri
const isTauri = !!(window as any).__TAURI__;

/**
 * Get authentication headers for requests
 */
export function getAuthHeaders(): Record<string, string> {
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
    
    const response = await fetch(`${apiUrl}/user/profile`, {
      method: 'GET',
      credentials: isTauri ? undefined : 'include',
      headers: getAuthHeaders(),
    });
    
    return response.ok;
  } catch (error) {
    logger.error('Authentication check failed:', error);
    return false;
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser() {
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
      id: data.id,
      username: data.username,
      email: data.email,
      telegramUserId: data.telegram_user_id,
      telegramUsername: data.telegram_username,
      permissions: data.permissions,
      createdAt: data.created_at,
      lastActive: data.last_active,
      userType: data.user_type,
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
  try {
    const baseUrl = getApiBaseUrl();
    const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
    
    const response = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      credentials: isTauri ? undefined : 'include',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      logger.warn('Token refresh failed:', response.statusText);
      return false;
    }
    
    // Handle token refresh response
    const data = await response.json();
    
    if (isTauri && data.auth_token) {
      // Store new token for Tauri environment
      localStorage.setItem('tauri_auth_token', JSON.stringify({
        auth_token: data.auth_token,
        expires_at: data.expires_at
      }));
    }
    
    logger.info('Token refreshed successfully');
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