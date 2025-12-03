import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { invoke } from "@tauri-apps/api/core";

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
const isTauri = typeof window !== 'undefined' && window.__TAURI__;
if (isTauri) {
  import('@tauri-apps/plugin-dialog').then(module => save = module.save);
  import('@tauri-apps/plugin-http').then(module => httpFetch = module.fetch);
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
export async function downloadFile(path: string, filename: string, onProgress?: (progress: number) => void, retries: number = 3): Promise<string | void> {
  try {
    // Construct full URL
    const url = path.startsWith('http') ? path : `${window.location.origin}${path}`;
    
    // Check if we're in a Tauri environment
    if (typeof window !== 'undefined' && window.__TAURI__) {
      // Use Tauri APIs for downloading
      return await downloadFileTauri(url, filename, onProgress);
    } else {
      // Use browser APIs for downloading
      return await downloadFileBrowser(url, filename, onProgress);
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    
    // Retry logic
    if (retries > 0) {
      console.log(`Retrying download... (${retries} attempts left)`);
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
      return await downloadFile(path, filename, onProgress, retries - 1);
    }
    
    throw new Error(`Failed to download file after retries: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Downloads a file using Tauri APIs
 */
async function downloadFileTauri(url: string, filename: string, onProgress?: (progress: number) => void): Promise<string> {
  // Ensure Tauri modules are loaded
  if (!save || !invoke) {
    throw new Error('Tauri modules not loaded');
  }

  // Get download folder from settings
  const downloadFolder = localStorage.getItem('downloadFolder') || '';
  
  // Construct file path
  let filePath: string;
  if (downloadFolder) {
    // Use configured download folder
    // Ensure the path uses the correct separator for the platform
    const separator = window.__TAURI__ ? '\\' : '/';
    filePath = downloadFolder.endsWith(separator) ? `${downloadFolder}${filename}` : `${downloadFolder}${separator}${filename}`;
  } else {
    // Ask user where to save the file (fallback behavior)
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
  }

  // Set up progress listener if callback provided
  let unlisten: (() => void) | null = null;
  if (onProgress) {
    // Listen for download progress events
    unlisten = await (window as any).__TAURI__.event.listen('download_progress', (event: any) => {
      onProgress(event.payload);
    });
  }

  try {
    // Use our custom Tauri command to download the file
    await invoke('download_file', { url, savePath: filePath });
    
    // Report completion
    if (onProgress) {
      onProgress(100);
    }
    
    // Return the file path so it can be stored
    return filePath;
  } catch (error) {
    console.error('Download failed:', error);
    throw new Error(`Download failed: ${error}`);
  } finally {
    // Clean up the event listener
    if (unlisten) {
      unlisten();
    }
  }
}

/**
 * Downloads a file using browser APIs
 */
async function downloadFileBrowser(url: string, filename: string, onProgress?: (progress: number) => void): Promise<string> {
  // Fetch the file with progress tracking
  const response = await fetch(url);
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
  
  // Read the stream
  while (true) {
    const { done, value } = await reader.read();
    
    if (done) {
      break;
    }
    
    chunks.push(value);
    receivedLength += value.length;
    
    // Report progress if callback provided and we know the total size
    if (onProgress && total > 0) {
      const progress = Math.floor((receivedLength / total) * 100);
      onProgress(progress);
    }
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
