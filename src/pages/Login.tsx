import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiBaseUrl, fetchWithTimeout } from "@/lib/api";
import { FcGoogle } from "react-icons/fc";
import { BackendUrlUpdater } from "@/components/BackendUrlUpdater";
import logger from "@/lib/logger";
import authService from "@/lib/authService";
import { useError } from "@/contexts/ErrorHandlerContext"; // Import the error context

// Declare google.accounts for TypeScript
declare global {
  interface Window {
    google: any;
  }
}

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showBackendConfig, setShowBackendConfig] = useState(false);
  const navigate = useNavigate();
  const { showError } = useError(); // Use the error context

  useEffect(() => {
    logger.info("Login page mounted");
    
    // Dynamically load Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleCredentialResponse = async (response: any) => {
    logger.info("Google credential response received", response);
    setIsLoading(true);
    setError("");

    try {
      const baseUrl = getApiBaseUrl();
      const apiUrl = baseUrl ? `${baseUrl}` : '';
      
      logger.info("Attempting Google login with baseUrl", { baseUrl, apiUrl: `${apiUrl}/auth/google` });
      
      const res = await fetchWithTimeout(`${apiUrl}/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authService.getAuthHeaders()
        },
        credentials: authService.isTauri ? undefined : "include",
        body: JSON.stringify({ token: response.credential }),
      }, 5000);

      logger.info("Google login response", { status: res.status, headers: [...res.headers.entries()] });
      
      if (res.ok) {
        const responseData = await res.json();
        logger.info("Google login successful", responseData);
        // Force a small delay to ensure session is properly set
        await new Promise(resolve => setTimeout(resolve, 100));
        navigate("/");
      } else {
        const errorData = await res.json();
        logger.error("Google login failed", errorData);
        setError(errorData.detail || "Google authentication failed");
      }
    } catch (err) {
      logger.error("Google login error", err);
      // Use our error dialog instead of showing backend config
      showError(
        "Connection Error",
        "Unable to connect to the backend server. Please check your connection and try again.",
        "network",
        undefined, // No retry for now
        undefined, // Default dismiss behavior
        () => setShowBackendConfig(true) // On configure backend, show config
      );
    } finally {
      setIsLoading(false);
    }
  };

  const initializeGoogleSignIn = () => {
    if (window.google && window.google.accounts) {
      logger.info("Initializing Google Sign-In");
      window.google.accounts.id.initialize({
        client_id: "YOUR_GOOGLE_CLIENT_ID_HERE", // This should be replaced with actual client ID
        callback: handleCredentialResponse,
      });
      
      window.google.accounts.id.renderButton(
        document.getElementById("googleSignInButton"),
        { 
          theme: "outline", 
          size: "large",
          width: 250,
          text: "signin_with"
        }
      );
    } else {
      logger.warn("Google accounts not available yet");
    }
  };

  useEffect(() => {
    logger.info("Checking for Google accounts availability");
    if (window.google && window.google.accounts) {
      logger.info("Google accounts available, initializing");
      initializeGoogleSignIn();
    } else {
      // Retry initialization after a delay if google script hasn't loaded yet
      logger.warn("Google accounts not available, scheduling retry");
      const timer = setTimeout(() => {
        if (window.google && window.google.accounts) {
          logger.info("Google accounts available on retry, initializing");
          initializeGoogleSignIn();
        } else {
          logger.warn("Google accounts still not available after retry");
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.info("Login form submitted", { username, password });
    
    setIsLoading(true);
    setError("");

    try {
      const baseUrl = getApiBaseUrl();
      const apiUrl = baseUrl ? `${baseUrl}` : '';
      
      logger.info("Attempting login with baseUrl", { baseUrl, apiUrl: `${apiUrl}/auth/login` });
      
      // Prepare fetch options using authService
      const fetchOptions: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authService.getAuthHeaders()
        },
        credentials: authService.isTauri ? undefined : "include",
        body: JSON.stringify({ username, password }),
      };
      
      logger.info("Making login request to", `${apiUrl}/auth/login`);
      
      const response = await fetchWithTimeout(`${apiUrl}/auth/login`, fetchOptions, 5000);

      logger.info("Login response", { status: response.status, headers: [...response.headers.entries()] });
      
      if (response.ok) {
        const responseData = await response.json();
        logger.info("Login response data", responseData);
        
        // For Tauri, we might need to manually handle cookies
        if (authService.isTauri) {
          logger.info("In Tauri environment, storing auth state locally");
          localStorage.setItem('tauri_auth_token', JSON.stringify({ 
            authenticated: true, 
            username: responseData.username,
            auth_token: responseData.auth_token,
            timestamp: new Date().toISOString()
          }));
        }
        
        // Force a small delay to ensure session is properly set
        await new Promise(resolve => setTimeout(resolve, 100));
        logger.info("Navigating to home page after successful login");
        navigate("/");
      } else {
        const errorData = await response.json();
        logger.error("Login failed with error", errorData);
        setError(errorData.detail || "Login failed");
      }
    } catch (err) {
      logger.error("Login error", { error: err, type: typeof err, message: err.message || "Unknown error" });
      // Use our error dialog instead of showing backend config
      showError(
        "Connection Error",
        "Unable to connect to the backend server. Please check your connection and try again.",
        "network",
        undefined, // No retry for now
        undefined, // Default dismiss behavior
        () => setShowBackendConfig(true) // On configure backend, show config
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    logger.info("Google login initiated");
    
    if (window.google && window.google.accounts) {
      window.google.accounts.id.prompt();
    }
  };

  const handleBackendConfigSuccess = () => {
    setShowBackendConfig(false);
    setError("");
    // Refresh the page to apply the new backend URL
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      {!showBackendConfig ? (
        <Card className="w-full max-w-md shadow-2xl rounded-3xl border-0 bg-white/90 backdrop-blur-xl">
          <CardHeader className="space-y-1 text-center pt-8 pb-2">
            <CardTitle className="text-3xl font-bold text-gray-900">Welcome Back</CardTitle>
            <CardDescription className="text-gray-600">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-8 py-4">
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-700">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white border-gray-300 text-gray-900 placeholder-gray-500 pr-10"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
            
            <div className="flex flex-col space-y-3">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center space-x-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <FcGoogle className="h-5 w-5" />
                <span>Sign in with Google</span>
              </Button>
              
              <div className="text-center text-sm text-gray-600">
                <p>Don't have an account? Contact your administrator</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pb-8 px-8">
            <Button
              variant="ghost"
              className="w-full text-gray-600 hover:text-gray-900"
              onClick={() => setShowBackendConfig(true)}
            >
              Configure Backend URL
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="w-full max-w-md">
          <BackendUrlUpdater 
            onErrorUpdate={setError}
            onSuccess={handleBackendConfigSuccess}
          />
          {error && (
            <div className="mt-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Login;