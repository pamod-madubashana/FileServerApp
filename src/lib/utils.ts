import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Extend window interface to include __TAURI__
declare global {
  interface Window {
    __TAURI__: any;
  }
}

// Tauri imports (only available in Tauri environment)
let save: ((options: any) => Promise<string | null>) | null = null;
let writeFile: ((path: string, data: Uint8Array) => Promise<void>) | null = null;
let httpFetch: ((url: string, options?: any) => Promise<any>) | null = null;

// Dynamically import Tauri modules only in Tauri environment
const isTauri = typeof window !== 'undefined' && window.__TAURI__;
if (isTauri) {
  import('@tauri-apps/plugin-dialog').then(module => save = module.save);
  import('@tauri-apps/plugin-fs').then(module => writeFile = module.writeFile);
  import('@tauri-apps/plugin-http').then(module => httpFetch = module.fetch);
}

/**
 * Downloads a file from a URL and saves it to the user's device.
 * Works in both browser and Tauri environments.
 * 
 * @param path - The URL path to the file (e.g., '/dl/Photo_AgADogxrGwUVGVU.jpg')
 * @param filename - The name to save the file as
 * @returns Promise that resolves when the download is complete
 */
export async function downloadFile(path: string, filename: string): Promise<void> {
  try {
    // Construct full URL
    const url = path.startsWith('http') ? path : `${window.location.origin}${path}`;
    
    // Check if we're in a Tauri environment
    if (typeof window !== 'undefined' && window.__TAURI__) {
      // Use Tauri APIs for downloading
      return await downloadFileTauri(url, filename);
    } else {
      // Use browser APIs for downloading
      return await downloadFileBrowser(url, filename);
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error(`Failed to download file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Downloads a file using Tauri APIs
 */
async function downloadFileTauri(url: string, filename: string): Promise<void> {
  // Ensure Tauri modules are loaded
  if (!save || !writeFile || !httpFetch) {
    throw new Error('Tauri modules not loaded');
  }

  // Ask user where to save the file
  const filePath = await save({
    filters: [{
      name: filename,
      extensions: [getFileExtension(filename)]
    }]
  });

  if (!filePath) {
    // User cancelled the save dialog
    return;
  }

  // Fetch the file
  const response = httpFetch ? await httpFetch(url) : await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // Get the file data as ArrayBuffer
  const buffer = await response.arrayBuffer();
  
  // Write file to disk
  await writeFile(filePath, new Uint8Array(buffer));
}

/**
 * Downloads a file using browser APIs
 */
async function downloadFileBrowser(url: string, filename: string): Promise<void> {
  // Fetch the file
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // Get the file data as blob
  const blob = await response.blob();
  
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
  URL.revokeObjectURL(downloadUrl);
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
