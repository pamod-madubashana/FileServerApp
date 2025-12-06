import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiBaseUrl, resetApiBaseUrl, api } from "@/lib/api";
import { X } from "lucide-react";
import { getPlayerPreference, setPlayerPreference, PlayerPreference } from "@/lib/playerSettings";
import { toast } from "sonner";

export default function Settings() {
  const navigate = useNavigate();
  const [serverUrl, setServerUrl] = useState("");
  const [tempServerUrl, setTempServerUrl] = useState("");
  const [error, setError] = useState("");
  const [playerPreference, setPlayerPreferenceState] = useState<PlayerPreference>("built-in");
  const [playerPreferenceChanged, setPlayerPreferenceChanged] = useState(false);
  const [indexChatId, setIndexChatId] = useState<number | null>(null);
  const [tempIndexChatId, setTempIndexChatId] = useState<string>("");

  // Load server URL, player preference, and index chat ID from API on component mount
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
    
    // Load player preference
    const loadedPreference = getPlayerPreference();
    console.log("Loaded player preference:", loadedPreference);
    setPlayerPreferenceState(loadedPreference);
    setPlayerPreferenceChanged(false);
    
    // Load index chat ID
    loadIndexChatId();
  }, []);

  const loadIndexChatId = async () => {
    try {
      const response = await api.getUserIndexChat();
      setIndexChatId(response.index_chat_id);
      setTempIndexChatId(response.index_chat_id?.toString() || "");
    } catch (error) {
      console.error("Error loading index chat ID:", error);
      toast.error("Error loading index chat ID", {
        description: error instanceof Error ? error.message : String(error),
        duration: 5000,
      });
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

  const handleSave = async () => {
    console.log("handleSave function called");
    console.log("Current player preference state:", playerPreference);
    
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
      
      // Save player preference
      console.log("About to save player preference:", playerPreference);
      setPlayerPreference(playerPreference);
      // Verify it was saved
      const savedValue = localStorage.getItem("playerPreference");
      console.log("Verified saved value in localStorage:", savedValue);
      if (savedValue === playerPreference) {
        console.log("Player preference saved successfully");
        setPlayerPreferenceChanged(false);
      } else {
        console.error("Player preference was not saved correctly");
        console.log("Expected:", playerPreference);
        console.log("Actual:", savedValue);
      }
      
      // Save index chat ID if it has changed
      const newIndexChatId = tempIndexChatId ? parseInt(tempIndexChatId, 10) : null;
      if (newIndexChatId !== indexChatId) {
        await api.updateUserIndexChat({ index_chat_id: newIndexChatId });
        setIndexChatId(newIndexChatId);
        toast.success("Index chat ID saved successfully!", {
          duration: 3000,
        });
      }
      
      // Show a success message with toast
      toast.success("Settings saved successfully!", {
        description: "Your settings have been saved",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Error saving settings", {
        description: error instanceof Error ? error.message : String(error),
        duration: 5000,
      });
    }
  };

  const handleReset = () => {
    // Reset to the default full URL (port 8000)
    const url = new URL(window.location.origin);
    url.port = "8000";
    const defaultUrl = url.origin;
    setTempServerUrl(defaultUrl);
    setError(""); // Clear any error when resetting
    
    // Reset player preference to default
    setPlayerPreferenceState("built-in");
    setPlayerPreferenceChanged(true);
  };

  const handleSavePlayerPreference = () => {
    console.log("handleSavePlayerPreference function called");
    console.log("Current player preference state:", playerPreference);

    // Save player preference
    console.log("About to save player preference:", playerPreference);
    try {
      setPlayerPreference(playerPreference);
      // Verify it was saved
      const savedValue = localStorage.getItem("playerPreference");
      console.log("Verified saved value in localStorage:", savedValue);
      if (savedValue === playerPreference) {
        console.log("Player preference saved successfully");
        setPlayerPreferenceChanged(false);
        
        // Show a success message with toast
        toast.success("Player preference saved successfully!", {
          description: `Player mode: ${playerPreference}`,
          duration: 3000,
        });
      } else {
        console.error("Player preference was not saved correctly");
        console.log("Expected:", playerPreference);
        console.log("Actual:", savedValue);
        toast.error("Error: Player preference was not saved correctly.", {
          description: `Expected: ${playerPreference}, Actual: ${savedValue}`,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error saving player preference:", error);
      toast.error("Error saving player preference", {
        description: error instanceof Error ? error.message : String(error),
        duration: 5000,
      });
    }
  };

  // Auto-save player preference when it changes
  useEffect(() => {
    if (playerPreferenceChanged) {
      const timer = setTimeout(() => {
        handleSavePlayerPreference();
      }, 500); // Auto-save after 500ms of no changes
      
      return () => clearTimeout(timer);
    }
  }, [playerPreference, playerPreferenceChanged]);

  // Auto-save URL configuration when it changes
  useEffect(() => {
    // Only auto-save if the URL has actually changed and is valid
    if (tempServerUrl !== serverUrl && tempServerUrl !== "") {
      // Validate the URL before auto-saving
      if (validateUrl(tempServerUrl)) {
        const timer = setTimeout(() => {
          handleSave();
        }, 1000); // Auto-save after 1 second of no changes
        
        return () => clearTimeout(timer);
      }
    }
  }, [tempServerUrl, serverUrl]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-6 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <Button 
              variant="outline" 
              onClick={() => {
                navigate("/");
                // Dispatch event to show file explorer and close navigation sidebar
                window.dispatchEvent(new CustomEvent('showFiles'));
              }}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 h-8 text-sm px-3"
            >
              Back to Files
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
            {/* Server Configuration Card */}
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg">
              <CardHeader className="pb-4 pt-5 px-6">
                <CardTitle className="text-xl text-gray-900 dark:text-white">Server Configuration</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 text-sm">
                  Configure the backend server URL for API connections
                </CardDescription>
              </CardHeader>
              <CardContent className="py-4 px-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="server-url" className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                      Backend Server URL
                    </Label>
                    <Input
                      id="server-url"
                      value={tempServerUrl}
                      onChange={(e) => {
                        setTempServerUrl(e.target.value);
                        if (error) setError(""); // Clear error when user types
                      }}
                      placeholder="https://your-server.com"
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-sm h-9"
                    />
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Enter the full URL to your backend server. Current default is {((): string => {
                        const url = new URL(window.location.origin);
                        url.port = "8000";
                        return url.origin;
                      })()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Tip: Press Ctrl+Alt+R anywhere to reset to default settings
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pb-5 px-6 pt-4">
                <Button 
                  variant="outline" 
                  onClick={handleReset} 
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 h-8 text-sm px-3"
                >
                  Reset to Default
                </Button>
                <Button 
                  onClick={handleSave} 
                  className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-sm px-3"
                >
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
            
            {/* Index Chat Settings Card */}
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg">
              <CardHeader className="pb-4 pt-5 px-6">
                <CardTitle className="text-xl text-gray-900 dark:text-white">Index Chat Settings</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 text-sm">
                  Configure the Telegram chat ID used for indexing files
                </CardDescription>
              </CardHeader>
              <CardContent className="py-4 px-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="index-chat-id" className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                      Index Chat ID
                    </Label>
                    <Input
                      id="index-chat-id"
                      type="number"
                      value={tempIndexChatId}
                      onChange={(e) => {
                        setTempIndexChatId(e.target.value);
                      }}
                      placeholder="Enter Telegram chat ID"
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-sm h-9"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Enter the Telegram chat ID where files should be indexed from. 
                      If you've previously started indexing, this will be pre-filled.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Leave empty to use the default behavior.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end pb-5 px-6 pt-4">
                <Button 
                  onClick={handleSave} 
                  className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-sm px-3"
                >
                  Save Index Chat
                </Button>
              </CardFooter>
            </Card>
            
            {/* Player Preference Settings Card */}
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg mb-6">
              <CardHeader className="pb-4 pt-5 px-6">
                <CardTitle className="text-xl text-gray-900 dark:text-white">Player Settings</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 text-sm">
                  Choose your preferred media player for videos and audio files
                </CardDescription>
              </CardHeader>
              <CardContent className="py-4 px-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                      Video/Audio Player
                    </Label>
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="playerPreference"
                          checked={playerPreference === "built-in"}
                          onChange={() => {
                            console.log("Changing to built-in player");
                            setPlayerPreferenceState("built-in");
                            setPlayerPreferenceChanged(true);
                          }}
                          className="form-radio h-4 w-4 text-blue-600"
                        />
                        <span className="text-gray-700 dark:text-gray-300 text-sm">Built-in Player (Plyr)</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="playerPreference"
                          checked={playerPreference === "external"}
                          onChange={() => {
                            console.log("Changing to external player");
                            setPlayerPreferenceState("external");
                            setPlayerPreferenceChanged(true);
                          }}
                          className="form-radio h-4 w-4 text-blue-600"
                        />
                        <span className="text-gray-700 dark:text-gray-300 text-sm">External Player</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Built-in Player: Uses the integrated Plyr media player within the application
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      External Player: Opens media files in your system's default media player
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
