import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { invoke } from "@tauri-apps/api/core";
import authService from "@/lib/authService";

// Extend window interface to include __TAURI__
declare global {
  interface Window {
    __TAURI__: any;
  }
}

// Tauri imports (only available in Tauri environment)
let save: ((options: any) => Promise<string | null>) | null = null;
let httpFetch: ((url: string, options?: any) => Promise<any>) | null = null;

// Dynamically import Tauri modules only in Tauri environment
// Use a function for Tauri detection to ensure it's checked at runtime rather than module load time
const isTauriEnv = () => {
  // First check with authService
  if (authService.isTauri()) {
    return true;
  }
  
  // Then check directly
  if (typeof window !== 'undefined' && !!(window as any).__TAURI__) {
    return true;
  }
  
  // Finally, check if we're in a Tauri-like environment by checking for Tauri-specific globals
  if (typeof window !== 'undefined') {
    // Check for other Tauri indicators
    return !!(window as any).__TAURI_IPC__ || 
           !!(window as any).__TAURI_METADATA__ || 
           (typeof (window as any).ipc !== 'undefined');
  }
  
  return false;
};
console.log('[utils.ts] Tauri detection at module load:', { 
  isTauri: isTauriEnv(), 
  authServiceResult: typeof window !== 'undefined' ? authService.isTauri() : undefined,
  hasWindowTAURI: typeof window !== 'undefined' && window.__TAURI__ !== undefined, 
  TAURI: typeof window !== 'undefined' ? window.__TAURI__ : undefined 
});

// Function to ensure Tauri modules are loaded
async function ensureTauriModules() {
  // Check if we're in Tauri environment at runtime
  if (!isTauriEnv()) {
    throw new Error('Not running in Tauri environment');
  }
  
  // Load modules if not already loaded
  if (!save) {
    try {
      const dialogModule = await import('@tauri-apps/plugin-dialog');
      save = dialogModule.save;
    } catch (e) {
      console.error('Failed to load @tauri-apps/plugin-dialog:', e);
      throw new Error('Failed to load Tauri dialog plugin');
    }
  }
  
  if (!httpFetch) {
    try {
      const httpModule = await import('@tauri-apps/plugin-http');
      httpFetch = httpModule.fetch;
    } catch (e) {
      console.error('Failed to load @tauri-apps/plugin-http:', e);
      throw new Error('Failed to load Tauri HTTP plugin');
    }
  }
}

// Preload Tauri modules if we're in a Tauri environment
// But also handle the case where Tauri environment detection might be delayed
if (isTauriEnv()) {
  ensureTauriModules().catch(err => {
    console.error('Failed to preload Tauri modules:', err);
  });
}

/**
 * Downloads a file from a URL and saves it to the user's device.
 * Works in both browser and Tauri environments.
 * 
 * @param path - The URL path to the file (e.g., '/dl/Photo_AgADogxrGwUVGVU.jpg')
 * @param filename - The name to save the file as
 * @param onProgress - Optional callback to track download progress (0-100)
 * @param retries - Number of retry attempts (default: 3)
 * @returns Promise that resolves when the download is complete
 */
export async function downloadFile(
  path: string, 
  filename: string, 
  onProgress?: (progress: number, details?: { speed?: number; eta?: number; downloaded?: number; total?: number }) => void, 
  retries: number = 3,
  cancellationToken?: AbortController
): Promise<string | void> {
  try {
    // Construct full URL
    const url = path.startsWith('http') ? path : `${window.location.origin}${path}`;
    
    // Check if we're in a Tauri environment - more robust detection at runtime
    // Use both authService and direct window check for consistency
    const isTauriEnvResult = isTauriEnv(); // Use our improved detection function
    console.log('Download environment check:', { 
      isTauriEnv: isTauriEnvResult,
      authServiceResult: authService.isTauri(), 
      hasTAURI: typeof window !== 'undefined' && window.__TAURI__ !== undefined, 
      userAgent: navigator.userAgent, 
      path, 
      url 
    });
    
    if (isTauriEnvResult) {
      // Use Tauri APIs for downloading
      console.log('Using Tauri download API');
      return await downloadFileTauri(url, filename, onProgress, cancellationToken);
    } else {
      // Use browser APIs for downloading
      console.log('Using browser download API');
      return await downloadFileBrowser(url, filename, onProgress, cancellationToken);
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    
    // Retry logic
    if (retries > 0) {
      console.log(`Retrying download... (${retries} attempts left)`);
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
      return await downloadFile(path, filename, onProgress, retries - 1, cancellationToken);
    }
    
    throw new Error(`Failed to download file after retries: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Downloads a file using Tauri APIs
 */
async function downloadFileTauri(
  url: string, 
  filename: string, 
  onProgress?: (progress: number, details?: { speed?: number; eta?: number; downloaded?: number; total?: number }) => void,
  cancellationToken?: AbortController
): Promise<string> {
  // Ensure Tauri modules are loaded
  try {
    await ensureTauriModules();
  } catch (error) {
    console.error('Failed to ensure Tauri modules are loaded:', error);
    throw new Error(`Tauri environment setup failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  if (!invoke) {
    throw new Error('Tauri core module not available');
  }

  console.log('[downloadFileTauri] Starting download:', { url, filename });

  // Get download folder from settings
  const downloadFolder = localStorage.getItem('downloadFolder') || '';
  console.log('Download folder from settings:', downloadFolder);
  
  // Construct file path
  let filePath: string;
  if (downloadFolder) {
    // Use configured download folder
    // Ensure the path uses the correct separator for the platform
    // Use both authService and direct window check for consistency
    const isTauriEnvResult = isTauriEnv(); // Use our improved detection function
    const separator = isTauriEnvResult ? '\\' : '/';
    console.log('Constructing path with separator:', { downloadFolder, separator, endsWithSeparator: downloadFolder.endsWith(separator) });
    filePath = downloadFolder.endsWith(separator) ? `${downloadFolder}${filename}` : `${downloadFolder}${separator}${filename}`;
    console.log('Constructed filePath:', filePath);
  } else {
    // Ask user where to save the file (fallback behavior)
    console.log('No download folder set, asking user where to save');
    filePath = await save({
      filters: [{
        name: filename,
        extensions: [getFileExtension(filename)]
      }]
    });
    
    if (!filePath) {
      // User cancelled the save dialog
      throw new Error('Download cancelled by user');
    }
    console.log('User selected filePath:', filePath);
  }

  // Generate a unique download ID for tracking
  const downloadId = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Set up progress listener if callback provided
  let unlisten: (() => void) | null = null;
  let unlistenDetailed: (() => void) | null = null;
  
  if (onProgress) {
    // Listen for regular download progress events
    unlisten = await (window as any).__TAURI__.event.listen('download_progress', (event: any) => {
      onProgress(event.payload);
    });
    
    // Listen for detailed download progress events with speed and ETA
    unlistenDetailed = await (window as any).__TAURI__.event.listen('download_progress_detailed', (event: any) => {
      // Pass detailed information to the callback
      onProgress(event.payload.percentage, {
        speed: event.payload.speed,
        eta: event.payload.eta,
        downloaded: event.payload.downloaded,
        total: event.payload.total
      });
    });
  }

  try {
    // Get auth token for Tauri environment
    let authToken = null;
    // Use both authService and direct window check for consistency
    const isTauri = typeof window !== 'undefined' && (authService.isTauri() || !!(window as any).__TAURI__);
    if (isTauri) {
      try {
        const tauri_auth = localStorage.getItem('tauri_auth_token');
        console.log('[downloadFileTauri] Retrieved auth token from localStorage:', tauri_auth);
        if (tauri_auth) {
          const authData = JSON.parse(tauri_auth);
          if (authData.auth_token) {
            authToken = authData.auth_token;
          }
        }
      } catch (e) {
        console.error('Failed to get auth token from localStorage:', e);
      }
    }
    
    // Use our custom Tauri command to download the file
    console.log('[downloadFileTauri] Calling Tauri download command with:', { url, savePath: filePath, authToken, downloadId });
    
    // Call the Tauri download command with the download ID
    await invoke('download_file', { url, savePath: filePath, authToken, downloadId });
    
    // Check if download was cancelled
    if (cancellationToken?.signal.aborted) {
      // Cancel the download in the Rust backend
      try {
        await invoke('cancel_download', { downloadId });
      } catch (e) {
        console.warn('Failed to cancel download in backend:', e);
      }
      throw new Error('Download cancelled');
    }
    
    // Report completion
    if (onProgress) {
      onProgress(100);
    }
    
    // Return the file path so it can be stored
    console.log('Returning filePath from downloadFileTauri:', filePath);
    return filePath;
  } catch (error) {
    console.error('Download failed:', error);
    throw new Error(`Download failed: ${error}`);
  } finally {
    // Clean up event listeners
    if (unlisten) {
      unlisten();
    }
    if (unlistenDetailed) {
      unlistenDetailed();
    }
    
    // If the download was cancelled, make sure to cancel it in the backend
    if (cancellationToken?.signal.aborted) {
      try {
        await invoke('cancel_download', { downloadId });
      } catch (e) {
        console.warn('Failed to cancel download in backend:', e);
      }
    }
  }
}

/**
 * Downloads a file using browser APIs
 */
async function downloadFileBrowser(
  url: string, 
  filename: string, 
  onProgress?: (progress: number, details?: { speed?: number; eta?: number; downloaded?: number; total?: number }) => void,
  cancellationToken?: AbortController
): Promise<string> {
  console.log('[downloadFileBrowser] Starting download:', { url, filename });
  
  // Add authentication headers for browser environment
  const headers: Record<string, string> = {};
  
  // Check if we're in Tauri and have an auth token
  // Use both authService and direct window check for consistency
  const isTauri = isTauriEnv(); // Use our improved detection function
  console.log('[downloadFileBrowser] Environment check:', { 
    isTauri, 
    authServiceResult: authService.isTauri(), 
    hasTAURI: typeof window !== 'undefined' && window.__TAURI__ !== undefined 
  });
  
  if (isTauri) {
    try {
      const tauri_auth = localStorage.getItem('tauri_auth_token');
      console.log('[downloadFileBrowser] Tauri auth token:', tauri_auth);
      if (tauri_auth) {
        const authData = JSON.parse(tauri_auth);
        if (authData.auth_token) {
          headers['X-Auth-Token'] = authData.auth_token;
        }
      }
    } catch (e) {
      console.error('Failed to get auth token from localStorage:', e);
    }
  }
  
  // Fetch the file with progress tracking
  // Include credentials for browser environment to send cookies
  const fetchOptions: RequestInit = {
    headers,
    // For browser environments, we need to be careful about CORS
    // If we're in Tauri, no credentials needed as we use headers
    // If we're in browser, we might need to avoid credentials if CORS is misconfigured
    credentials: isTauri ? undefined : 'include', // Include cookies for authentication
    signal: cancellationToken?.signal // Add cancellation signal
  };
  
  console.log('[downloadFileBrowser] Fetching with options:', { url, fetchOptions });
  
  // Try the fetch with credentials first
  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (error) {
    // If we get a CORS error in browser mode, try without credentials
    if (!isTauri && error instanceof TypeError && error.message.includes('CORS')) {
      console.log('[downloadFileBrowser] CORS error detected, retrying without credentials');
      const fetchOptionsWithoutCredentials: RequestInit = {
        headers,
        credentials: 'omit',
        signal: cancellationToken?.signal
      };
      response = await fetch(url, fetchOptionsWithoutCredentials);
    } else {
      throw error;
    }
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // Get the content length if available
  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  
  // Read the response body as a stream
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Failed to get response body reader');
  }
  
  // Collect chunks as they arrive
  const chunks: Uint8Array[] = [];
  let receivedLength = 0;
  
  // Track timing for speed calculation
  const startTime = Date.now();
  let lastUpdateTime = startTime;
  let lastReceivedLength = 0;
  
  // Read the stream
  while (true) {
    // Check if download was cancelled
    if (cancellationToken?.signal.aborted) {
      throw new Error('Download cancelled');
    }
    
    const { done, value } = await reader.read();
    
    if (done) {
      break;
    }
    
    chunks.push(value);
    receivedLength += value.length;
    
    // Calculate speed and ETA periodically (every 500ms)
    const now = Date.now();
    if (now - lastUpdateTime >= 500) {
      const timeElapsed = (now - lastUpdateTime) / 1000; // seconds
      const bytesSinceLastUpdate = receivedLength - lastReceivedLength;
      
      if (timeElapsed > 0) {
        const speed = bytesSinceLastUpdate / timeElapsed; // bytes per second
        
        // Calculate ETA if we know the total size
        let eta: number | undefined;
        if (total > 0 && speed > 0) {
          const bytesRemaining = total - receivedLength;
          eta = bytesRemaining / speed;
        }
        
        // Report progress with detailed information
        if (onProgress) {
          const progress = total > 0 ? Math.floor((receivedLength / total) * 100) : 0;
          onProgress(progress, {
            speed,
            eta,
            downloaded: receivedLength,
            total
          });
        }
      }
      
      lastUpdateTime = now;
      lastReceivedLength = receivedLength;
    }
    
    // Report progress if callback provided and we know the total size
    if (onProgress && total > 0) {
      const progress = Math.floor((receivedLength / total) * 100);
      // Only call onProgress without details if we haven't called it with details recently
      if (now - lastUpdateTime >= 500) {
        onProgress(progress);
      }
    }
  }
  
  // Check if download was cancelled after the loop
  if (cancellationToken?.signal.aborted) {
    throw new Error('Download cancelled');
  }
  
  // Combine all chunks into a single Uint8Array
  const chunksAll = new Uint8Array(receivedLength);
  let position = 0;
  for (const chunk of chunks) {
    chunksAll.set(chunk, position);
    position += chunk.length;
  }
  
  // Create a blob from the data
  const blob = new Blob([chunksAll]);
  
  // Create a download link
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  
  // Return the blob URL so it can be stored and opened later
  return downloadUrl;
}

/**
 * Extracts file extension from filename
 */
function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
