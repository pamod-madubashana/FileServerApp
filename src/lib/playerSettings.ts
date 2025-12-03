// Utility functions for player settings

const PLAYER_PREFERENCE_KEY = "playerPreference";

export type PlayerPreference = "built-in" | "external";

// Get the player preference from localStorage
export const getPlayerPreference = (): PlayerPreference => {
  try {
    const preference = localStorage.getItem(PLAYER_PREFERENCE_KEY);
    console.log("Getting player preference from localStorage:", preference);
    
    // Validate and return the preference
    if (preference === "built-in" || preference === "external") {
      return preference;
    }
    
    // Default to built-in player
    return "built-in";
  } catch (error) {
    console.error("Error getting player preference:", error);
    // Default to built-in player
    return "built-in";
  }
};

// Set the player preference in localStorage (only built-in supported)
export const setPlayerPreference = (preference: PlayerPreference): void => {
  try {
    console.log("Setting player preference to localStorage:", preference);
    localStorage.setItem(PLAYER_PREFERENCE_KEY, preference);
    console.log("Player preference set successfully to:", preference);
    
    // Verify it was saved
    const savedValue = localStorage.getItem(PLAYER_PREFERENCE_KEY);
    console.log("Verified saved value in localStorage:", savedValue);
  } catch (error) {
    console.error("Error setting player preference:", error);
  }
};

// Reset player preference to default
export const resetPlayerPreference = (): void => {
  try {
    console.log("Resetting player preference");
    localStorage.removeItem(PLAYER_PREFERENCE_KEY);
    console.log("Player preference reset successfully");
  } catch (error) {
    console.error("Error resetting player preference:", error);
  }
};