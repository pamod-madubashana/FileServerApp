import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/api';

// This hook monitors the backend API connection
// and shows toast notifications when the connection is lost/regained
export const useBackendConnection = () => {
  const connectionLostRef = useRef(false);
  const connectingToastIdRef = useRef<string | number | undefined>(undefined);
  const intervalIdRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // Only run in development mode
    if (import.meta.env.DEV) {
      // Store original console.error to restore later
      const originalConsoleError = console.error;
      
      // Temporarily suppress specific network errors
      console.error = function(...args) {
        // Check if this is a network error we want to suppress
        if (args[0] && typeof args[0] === 'string' && 
            (args[0].includes('net::ERR_CONNECTION_REFUSED') || 
             args[0].includes('Failed to fetch'))) {
          // Suppress these specific errors to reduce console noise
          return;
        }
        // For all other errors, use the original console.error
        originalConsoleError.apply(console, args);
      };

      // Function to check backend connection status
      const checkBackendConnection = async () => {
        try {
          const baseUrl = getApiBaseUrl();
          // Use the health endpoint that should always be available
          const healthUrl = baseUrl ? `${baseUrl}/api/health` : '/api/health';
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
          
          const response = await fetch(healthUrl, {
            method: 'GET',
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            // Backend is reachable
            if (connectionLostRef.current) {
              connectionLostRef.current = false;
              // Dismiss the connecting toast
              if (connectingToastIdRef.current) {
                toast.dismiss(connectingToastIdRef.current);
                connectingToastIdRef.current = undefined;
              }
              // Show connected toast
              toast.success('Connected', {
                duration: 5000,
              });
            }
          } else {
            // Backend returned an error status
            handleConnectionLost();
          }
        } catch (error) {
          // Network error or timeout - this is when we show the connecting toast
          handleConnectionLost();
        }
      };
      
      // Function to handle connection lost state
      const handleConnectionLost = () => {
        if (!connectionLostRef.current) {
          connectionLostRef.current = true;
          // Show connecting toast
          connectingToastIdRef.current = toast.loading('Connecting...', {
            duration: Infinity,
          });
        }
      };
      
      // Check connection immediately
      checkBackendConnection();
      
      // Poll backend status every 5 seconds
      intervalIdRef.current = setInterval(checkBackendConnection, 5000);

      // Clean up
      return () => {
        // Restore original console.error
        console.error = originalConsoleError;
        
        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
        }
        if (connectingToastIdRef.current) {
          toast.dismiss(connectingToastIdRef.current);
        }
      };
    }
  }, []);
};