import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getApiBaseUrl, fetchWithTimeout } from "@/lib/api";
import logger from "@/lib/logger";
import authService from "@/lib/authService";
import { useError } from "@/contexts/ErrorHandlerContext"; // Import the error context

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper = ({ children }: AuthWrapperProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendError, setBackendError] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { showError } = useError(); // Use the error context

  useEffect(() => {
    logger.info("AuthWrapper mounted, checking authentication...");
    
    // Skip auth check on login page
    if (location.pathname === "/login") {
      logger.info("On login page, skipping auth check");
      setIsLoading(false);
      setIsAuthenticated(false);
      return;
    }
    
    const checkAuth = async () => {
      logger.info("Running in Tauri environment", authService.isTauri);
      
      try {
        
        // In Tauri, first check localStorage for auth token
        if (authService.isTauri) {
          const tauri_auth = localStorage.getItem('tauri_auth_token');
          if (tauri_auth) {
            try {
              const authData = JSON.parse(tauri_auth);
              if (authData.authenticated) {
                logger.info("Found valid auth token in Tauri localStorage", authData);
                setIsAuthenticated(true);
                setBackendError(false);
                setIsLoading(false);
                return;
              }
            } catch (e) {
              logger.error("Failed to parse Tauri auth token", e);
            }
          }
        }
        
        const baseUrl = getApiBaseUrl();
        const apiUrl = baseUrl ? `${baseUrl}` : '';
        
        logger.info("Checking authentication", { url: `${apiUrl}/auth/check`, baseUrl });
        
        // Prepare fetch options using authService
        const fetchOptions: RequestInit = {
          method: 'GET',
          credentials: authService.isTauri ? undefined : 'include',
          cache: 'no-cache',
          headers: {
            ...authService.getAuthHeaders()
          }
        };
        
        const response = await fetchWithTimeout(`${apiUrl}/auth/check`, fetchOptions, 3000);

        logger.info("Auth check response", { status: response.status, headers: [...response.headers.entries()] });
        
        if (response.ok) {
          const data = await response.json();
          logger.info("Auth check response data", data);
          setIsAuthenticated(data.authenticated);
          setBackendError(false);
          
          // If not authenticated, redirect to login
          if (!data.authenticated) {
            logger.info("Not authenticated, redirecting to login");
            // Clear Tauri auth token if it exists
            if (authService.isTauri) {
              localStorage.removeItem('tauri_auth_token');
            }
            navigate("/login");
            return;
          } else {
            logger.info("User is authenticated, showing content");
            // Update Tauri auth token
            if (authService.isTauri) {
              localStorage.setItem('tauri_auth_token', JSON.stringify({ 
                authenticated: true, 
                username: data.username,
                user_picture: data.user_picture || null,
                is_admin: data.is_admin || false,
                timestamp: new Date().toISOString()
              }));
            }
          }
        } else {
          logger.warn("Auth check failed with status", response.status);
          // Handle 401 specifically with our error dialog
          if (response.status === 401) {
            showError(
              "Authentication Required",
              "Your session has expired or you're not logged in. Please log in again.",
              "auth",
              undefined, // No retry
              () => navigate("/login"), // On dismiss, go to login
              () => navigate("/login") // On configure backend, go to login
            );
          } else {
            // For other errors, redirect to login but indicate there might be a backend issue
            setIsAuthenticated(false);
            // Clear Tauri auth token on failure
            if (authService.isTauri) {
              localStorage.removeItem('tauri_auth_token');
            }
            setBackendError(response.status !== 401 && response.status !== 403);
            navigate("/login");
          }
          return;
        }
      } catch (error) {
        logger.error("Auth check failed with error", error);
        // Handle network errors with our error dialog
        showError(
          "Connection Error",
          "Failed to connect to the backend server. Please check your connection and try again.",
          "network",
          undefined, // No retry for now
          () => navigate("/login"), // On dismiss, go to login
          () => navigate("/login") // On configure backend, go to login
        );
        // Redirect to login and indicate there's a backend connectivity issue
        setIsAuthenticated(false);
        // Clear Tauri auth token on error
        if (authService.isTauri) {
          localStorage.removeItem('tauri_auth_token');
        }
        setBackendError(true);
        navigate("/login");
        return;
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate, location.pathname, showError]);

  // Show loading state while checking authentication
  if (isLoading || isAuthenticated === null) {
    logger.info("Showing loading state");
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 dark:border-gray-100"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  logger.info("Rendering children", { isAuthenticated });
  // If authenticated, render children; otherwise, redirect handled by useEffect
  return isAuthenticated ? <>{children}</> : null;
};