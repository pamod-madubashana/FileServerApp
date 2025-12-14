import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { getApiBaseUrl, resetApiBaseUrl } from "@/lib/api";
import { getPlayerPreference, setPlayerPreference, PlayerPreference } from "@/lib/playerSettings";
import { toast } from "sonner";

export const SettingsWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [tempServerUrl, setTempServerUrl] = useState("");
  const [error, setError] = useState("");
  const [playerPreference, setPlayerPreferenceState] = useState<PlayerPreference>("built-in");
  const [playerPreferenceChanged, setPlayerPreferenceChanged] = useState(false);

  // Load server URL and player preference from localStorage on component mount
  useEffect(() => {
    const currentUrl = getApiBaseUrl();
    // If the current URL is the default "/api", construct the full URL assuming backend is on port 8000
    let displayUrl = currentUrl;
    if (currentUrl === "/api") {
      // Construct full URL based on current origin but with port 8000
      const url = new URL(window.location.origin);
      url.port = "8000";
      displayUrl = url.origin; // Changed from `${url.origin}/api` to just `url.origin`
    }
    setServerUrl(displayUrl);
    setTempServerUrl(displayUrl);
    
    // Load player preference
    const loadedPreference = getPlayerPreference();
    console.log("Loaded player preference:", loadedPreference);
    setPlayerPreferenceState(loadedPreference);
    setPlayerPreferenceChanged(false);
  }, []);

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

  const handleSave = () => {
    console.log("handleSave function called");
    console.log("Current player preference state:", playerPreference);
    
    // Validate the URL before saving
    if (!validateUrl(tempServerUrl)) {
      setError("Please enter a valid URL (e.g., http://localhost:8148)");
      return;
    }

    // Clear any previous error
    setError("");

    // Save server URL to localStorage
    // If the user entered the full URL that matches the default backend URL, save as "/"
    const defaultBackendUrl = (() => {
      const url = new URL(window.location.origin);
      url.port = "8148";
      return url.origin; // Changed from `${url.origin}/api` to just `url.origin`
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
        
        // Show a success message with toast
        toast.success("Settings saved successfully!", {
          description: "Your settings have been saved",
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
      console.error("Error saving settings:", error);
      toast.error("Error saving settings", {
        description: error instanceof Error ? error.message : String(error),
        duration: 5000,
      });
    }
    
    setIsOpen(false);
  };

  const handleReset = () => {
    // Reset to the default full URL (port 8148)
    const url = new URL(window.location.origin);
    url.port = "8148";
    const defaultUrl = url.origin; // Changed from `${url.origin}/api` to just `url.origin`
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <Card className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle>Server Configuration</CardTitle>
            <CardDescription>
              Configure the backend server URL for API connections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="server-url">Backend Server URL</Label>
              <Input
                id="server-url"
                value={tempServerUrl}
                onChange={(e) => {
                  setTempServerUrl(e.target.value);
                  if (error) setError(""); // Clear error when user types
                }}
                placeholder="https://your-server.com"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <p className="text-sm text-muted-foreground">
                Enter the full URL to your backend server. Current default is {((): string => {
                  const url = new URL(window.location.origin);
                  url.port = "8148";
                  return url.origin; // Changed from `${url.origin}/api` to just `url.origin`
                })()}
              </p>
              <p className="text-sm text-muted-foreground">
                Tip: Press Ctrl+Alt+R anywhere to reset to default settings
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              Reset to Default
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </CardFooter>
        </Card>
        
        {/* Player Preference Settings */}
        <Card className="rounded-lg border bg-card text-card-foreground shadow-sm mt-4">
          <CardHeader>
            <CardTitle>Player Settings</CardTitle>
            <CardDescription>
              Choose your preferred media player for videos and audio files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Video/Audio Player</Label>
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
                    className="form-radio"
                  />
                  <span className="text-sm">Built-in Player (Plyr)</span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Built-in Player: Uses the integrated Plyr media player within the application
              </p>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};