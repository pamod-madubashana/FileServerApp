import { getPlayerPreference, setPlayerPreference, resetPlayerPreference } from './playerSettings';

// Simple test function to verify player settings utilities
function runTests() {
  console.log('Running player settings tests...');
  
  // Test 1: Default player preference
  localStorage.clear();
  const defaultPreference = getPlayerPreference();
  console.log('Test 1 - Default preference:', defaultPreference);
  console.assert(defaultPreference === 'built-in', 'Default preference should be built-in');
  
  // Test 2: Save and retrieve player preference
  setPlayerPreference('external');
  const savedPreference = getPlayerPreference();
  console.log('Test 2 - Saved preference:', savedPreference);
  console.assert(savedPreference === 'external', 'Saved preference should be external');
  
  // Test 3: Reset player preference
  resetPlayerPreference();
  const resetPreference = getPlayerPreference();
  console.log('Test 3 - Reset preference:', resetPreference);
  console.assert(resetPreference === 'built-in', 'Reset preference should be built-in');
  
  // Test 4: Handle invalid player preference
  localStorage.setItem('playerPreference', 'invalid-value');
  const invalidPreference = getPlayerPreference();
  console.log('Test 4 - Invalid preference handling:', invalidPreference);
  console.assert(invalidPreference === 'built-in', 'Invalid preference should default to built-in');
  
  console.log('All tests completed!');
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
  runTests();
}

export { runTests };