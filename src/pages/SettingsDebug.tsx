import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlayerPreference, setPlayerPreference, PlayerPreference } from "@/lib/playerSettings";

export default function SettingsDebug() {
  const navigate = useNavigate();
  const [playerPreference, setPlayerPreferenceState] = useState<PlayerPreference>("built-in");
  const [savedValue, setSavedValue] = useState<string>("");

  // Load player preference from localStorage on component mount
  useEffect(() => {
    const currentPreference = getPlayerPreference();
    setPlayerPreferenceState(currentPreference);
    setSavedValue(currentPreference);
  }, []);

  const handleSave = () => {
    // Save player preference
    setPlayerPreference(playerPreference);
    setSavedValue(playerPreference);
    
    // Show confirmation
    alert(`Player preference saved: ${playerPreference}`);
  };

  const handleCheck = () => {
    const currentPreference = getPlayerPreference();
    setPlayerPreferenceState(currentPreference);
    setSavedValue(currentPreference);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings Debug</h1>
            <Button 
              variant="outline" 
              onClick={() => {
                navigate("/");
                // Dispatch event to show file explorer and close navigation sidebar
                window.dispatchEvent(new CustomEvent('showFiles'));
              }}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Back to Files
            </Button>
          </div>
          
          <Card className="mb-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-900 dark:text-white">Settings Debug</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Debug the player preference settings functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 py-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Player Preference</label>
                  <div className="flex flex-col space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="debugPlayerPreference"
                        checked={playerPreference === "built-in"}
                        onChange={() => setPlayerPreferenceState("built-in")}
                      />
                      <span className="text-gray-700 dark:text-gray-300">Built-in Player (Plyr)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="debugPlayerPreference"
                        checked={playerPreference === "external"}
                        onChange={() => setPlayerPreferenceState("external")}
                      />
                      <span className="text-gray-700 dark:text-gray-300">External Player</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSave}>Save Preference</Button>
                  <Button variant="outline" onClick={handleCheck}>Check Current</Button>
                  <Button variant="outline" onClick={handleReload}>Reload Page</Button>
                </div>
                
                <div className="text-sm p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <p className="font-medium">Current Values:</p>
                  <p>State: {playerPreference}</p>
                  <p>Saved: {savedValue}</p>
                  <p>LocalStorage: {localStorage.getItem("playerPreference") || "null"}</p>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <h3 className="font-medium mb-2">Instructions:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Select a player preference option</li>
                    <li>Click "Save Preference" to save your choice</li>
                    <li>Click "Check Current" to verify the saved value</li>
                    <li>Click "Reload Page" to see if the setting persists</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}