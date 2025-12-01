import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiBaseUrl, resetApiBaseUrl } from "@/lib/api";
import { X } from "lucide-react";

interface SettingsContentProps {
  onBack: () => void;
}

export const SettingsContent = ({ onBack }: SettingsContentProps) => {
  const navigate = useNavigate();
  const [serverUrl, setServerUrl] = useState("");
  const [tempServerUrl, setTempServerUrl] = useState("");
  const [error, setError] = useState("");

  // Load server URL from localStorage on component mount
  useEffect(() => {
    const currentUrl = getApiBaseUrl();
    // If the current URL is the default "/api", construct the full URL assuming backend is on port 8000
    let displayUrl = currentUrl;
    if (currentUrl === "/api") {
      // Construct full URL based on current origin but with port 8000
      const url = new URL(window.location.origin);
      url.port = "8000";
      displayUrl = url.origin;
    }
    setServerUrl(displayUrl);
    setTempServerUrl(displayUrl);
  }, []);

  const validateUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      // Allow "/" as a special case for same-origin requests
      if (url === "/") return true;
      
      // For full URLs, validate the format
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = () => {
    // Validate the URL before saving
    if (!validateUrl(tempServerUrl)) {
      setError("Please enter a valid URL (e.g., http://localhost:8000)");
      return;
    }

    // Clear any previous error
    setError("");

    // Save to localStorage
    // If the user entered the full URL that matches the default backend URL, save as "/"
    const defaultBackendUrl = (() => {
      const url = new URL(window.location.origin);
      url.port = "8000";
      return url.origin;
    })();
    
    if (tempServerUrl === defaultBackendUrl) {
      resetApiBaseUrl(); // This removes the saved URL, reverting to default
    } else if (tempServerUrl !== "/") {
      localStorage.setItem("serverUrl", tempServerUrl);
    } else {
      resetApiBaseUrl(); // This removes the saved URL, reverting to default
    }
    
    setServerUrl(tempServerUrl);
    
    // Show a success message or trigger a refresh if needed
    window.location.reload();
  };

  const handleReset = () => {
    // Reset to the default full URL (port 8000)
    const url = new URL(window.location.origin);
    url.port = "8000";
    const defaultUrl = url.origin;
    setTempServerUrl(defaultUrl);
    setError(""); // Clear any error when resetting
  };

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <button
            onClick={() => {
              // Close the navigation sidebar
              window.dispatchEvent(new CustomEvent('toggleNavigationSidebar'));
              // Close the settings page and navigate back to file explorer
              onBack();
              // Update the browser history to reflect we're back on the main page
              window.history.pushState({ path: ["Home"] }, '', '/');
              // Dispatch event to show file explorer
              window.dispatchEvent(new CustomEvent('showFiles'));
            }}
            className="rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-900 dark:text-white" />
          </button>
        </div>
        
        <Card className="mb-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-900 dark:text-white">Server Configuration</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Configure the backend server URL for API connections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 py-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="server-url" className="text-gray-700 dark:text-gray-300">Backend Server URL</Label>
                <Input
                  id="server-url"
                  value={tempServerUrl}
                  onChange={(e) => {
                    setTempServerUrl(e.target.value);
                    if (error) setError(""); // Clear error when user types
                  }}
                  placeholder="https://your-server.com"
                  className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enter the full URL to your backend server. Current default is {((): string => {
                    const url = new URL(window.location.origin);
                    url.port = "8000";
                    return url.origin;
                  })()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tip: Press Ctrl+Alt+R anywhere to reset to default settings
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleReset} className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              Reset to Default
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};