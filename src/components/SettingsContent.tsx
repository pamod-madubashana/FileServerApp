import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiBaseUrl, resetApiBaseUrl } from "@/lib/api";
import { X } from "lucide-react";
import { toast } from "sonner";

// Add the Tauri dialog import
import { open } from '@tauri-apps/plugin-dialog';

// Add Tauri path import for getting user profile directory
import { homeDir } from '@tauri-apps/api/path';

interface SettingsContentProps {
  onBack: () => void;
}

export const SettingsContent = ({ onBack }: SettingsContentProps) => {
  const navigate = useNavigate();
  const [serverUrl, setServerUrl] = useState("");
  const [tempServerUrl, setTempServerUrl] = useState("");
  const [downloadFolder, setDownloadFolder] = useState("");
  const [tempDownloadFolder, setTempDownloadFolder] = useState("");
  const [error, setError] = useState("");

  // Load server URL and download folder from localStorage on component mount
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
    
    // Load download folder setting
    const savedDownloadFolder = localStorage.getItem("downloadFolder") || "";
    setDownloadFolder(savedDownloadFolder);
    setTempDownloadFolder(savedDownloadFolder);
    
    // Set default download folder for Tauri app if not already set
    if (typeof window !== 'undefined' && window.__TAURI__ && !savedDownloadFolder) {
      setDefaultDownloadFolder();
    }
  }, []);

  // Function to set default download folder
  const setDefaultDownloadFolder = async () => {
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const homeDirectory = await homeDir();
        // Use correct path separator for Windows
        const defaultDownloadFolder = `${homeDirectory}Downloads\\fileServer`;
        setTempDownloadFolder(defaultDownloadFolder);
      }
    } catch (error) {
      console.error("Error setting default download folder:", error);
    }
  };

  const validateUrl = (url: string): boolean => {
    console.log("Validating URL:", url);
    if (!url) {
      console.log("URL is empty, validation failed");
      return false;
    }
    try {
      // Allow "/" as a special case for same-origin requests
      if (url === "/") {
        console.log("URL is '/', validation passed");
        return true;
      }
      
      // For full URLs, validate the format
      new URL(url);
      console.log("URL is valid, validation passed");
      return true;
    } catch {
      console.log("URL is invalid, validation failed");
      return false;
    }
  };

  // Function to select download folder (Tauri only)
  const selectDownloadFolder = async () => {
    try {
      // Check if we're in a Tauri environment
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const selected = await open({
          directory: true,
          multiple: false,
          title: "Select Download Folder"
        });
        
        if (selected) {
          setTempDownloadFolder(selected as string);
        }
      } else {
        // For browser environment, show a message
        toast.info("Folder selection is only available in the desktop app");
      }
    } catch (error) {
      console.error("Error selecting folder:", error);
      toast.error("Failed to select folder");
    }
  };

  const handleSave = () => {
    console.log("handleSave function called");
    
    // Validate the URL before saving
    if (!validateUrl(tempServerUrl)) {
      setError("Please enter a valid URL (e.g., http://localhost:8000)");
      return;
    }

    // Clear any previous error
    setError("");

    // Save server URL to localStorage
    // If the user entered the full URL that matches the default backend URL, save as "/"
    const defaultBackendUrl = (() => {
      const url = new URL(window.location.origin);
      url.port = "8000";
      return url.origin;
    })();
    
    console.log("Saving server URL:", tempServerUrl);
    try {
      if (tempServerUrl === defaultBackendUrl) {
        resetApiBaseUrl(); // This removes the saved URL, reverting to default
      } else if (tempServerUrl !== "/") {
        localStorage.setItem("serverUrl", tempServerUrl);
      } else {
        resetApiBaseUrl(); // This removes the saved URL, reverting to default
      }
      
      setServerUrl(tempServerUrl);
      
      // Show a success message with toast
      toast.success("Server settings saved successfully!", {
        description: `Server URL: ${tempServerUrl}`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error saving server URL:", error);
      toast.error("Error saving server URL", {
        description: error instanceof Error ? error.message : String(error),
        duration: 5000,
      });
    }
  };

  const handleReset = () => {
    // Reset to default server URL
    const defaultUrl = (() => {
      const url = new URL(window.location.origin);
      url.port = "8000";
      return url.origin;
    })();
    
    setTempServerUrl(defaultUrl);
    setTempDownloadFolder("");
    setError("");
    
    // Show confirmation
    toast.info("Settings reset to default", {
      description: `Default URL: ${defaultUrl}`,
      duration: 3000,
    });
  };

  // Function to save only the download folder settings
  const handleSaveDownloadFolder = () => {
    try {
      // Save download folder setting
      if (tempDownloadFolder) {
        localStorage.setItem("downloadFolder", tempDownloadFolder);
      } else {
        localStorage.removeItem("downloadFolder");
      }
      setDownloadFolder(tempDownloadFolder);
      
      // Show a success message with toast
      toast.success("Download folder saved successfully!", {
        description: tempDownloadFolder ? `Download Folder: ${tempDownloadFolder}` : 'Using default download location',
        duration: 3000,
      });
    } catch (error) {
      console.error("Error saving download folder:", error);
      toast.error("Error saving download folder", {
        description: error instanceof Error ? error.message : String(error),
        duration: 5000,
      });
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <button
            onClick={() => {
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
            <div className="space-y-6">
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
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tip: Press Ctrl+Alt+R anywhere to reset to default settings
              </p>
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
        
        {/* Download Folder Settings - Separated from Server Configuration */}
        <Card className="mb-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-900 dark:text-white">Download Settings</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Configure where downloaded files are saved
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 py-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="download-folder" className="text-gray-700 dark:text-gray-300">Download Folder</Label>
                <div className="flex gap-2">
                  <Input
                    id="download-folder"
                    value={tempDownloadFolder}
                    onChange={(e) => {
                      setTempDownloadFolder(e.target.value);
                    }}
                    placeholder="Click 'Browse' to select download folder"
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 flex-1"
                    readOnly
                  />
                  <Button 
                    onClick={selectDownloadFolder}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Browse
                  </Button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Files will be automatically downloaded to this folder. Leave empty to use the default download location.
                </p>
                
                {/* Show a note for browser users */}
                {typeof window !== 'undefined' && !window.__TAURI__ && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Note: Folder selection is only available in the desktop app. In browsers, files will be saved to your default download location.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleSaveDownloadFolder} className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default SettingsContent;