import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getPlayerPreference, setPlayerPreference, PlayerPreference } from "@/lib/playerSettings";

export const PlayerSettingsDebug = () => {
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

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
      <h3 className="text-lg font-semibold mb-4">Player Settings Debug</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Player Preference</label>
          <div className="flex flex-col space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="debugPlayerPreference"
                checked={playerPreference === "built-in"}
                onChange={() => setPlayerPreferenceState("built-in")}
              />
              <span>Built-in Player (Plyr)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="debugPlayerPreference"
                checked={playerPreference === "external"}
                onChange={() => setPlayerPreferenceState("external")}
              />
              <span>External Player</span>
            </label>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button onClick={handleSave}>Save Preference</Button>
          <Button variant="outline" onClick={handleCheck}>Check Current</Button>
        </div>
        
        <div className="text-sm">
          <p>Current state: {playerPreference}</p>
          <p>Saved value: {savedValue}</p>
          <p>LocalStorage value: {localStorage.getItem("playerPreference") || "null"}</p>
        </div>
      </div>
    </div>
  );
};