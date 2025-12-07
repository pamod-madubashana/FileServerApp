// Tauri file system utilities for native folder scanning
import logger from '@/lib/logger';

// Check if we're running in Tauri environment
export const isTauriEnvironment = () => {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
};

// Type definition for scanned files
export interface ScannedFile {
  name: string;
  path: string;
  size: number;
  modified: Date;
  relativePath: string; // Relative path within the folder structure
}

/**
 * Recursively scan a directory and return all files with their relative paths
 * @param dirPath The directory path to scan
 * @param basePath The base path to calculate relative paths from
 * @returns Promise resolving to array of ScannedFile objects
 */
export const scanDirectory = async (dirPath: string, basePath: string = dirPath): Promise<ScannedFile[]> => {
  if (!isTauriEnvironment()) {
    throw new Error('scanDirectory can only be used in Tauri environment');
  }

  try {
    // Dynamically import the fs plugin only when needed
    const fs = await import('@tauri-apps/plugin-fs');
    
    const files: ScannedFile[] = [];
    // Read directory without recursive option
    const entries = await fs.readDir(dirPath);
    
    // Process each entry
    for (const entry of entries) {
      const fullPath = `${dirPath}/${entry.name}`;
      
      if (entry.isDirectory) {
        // This is a directory, process its children recursively
        const subFiles = await scanDirectory(fullPath, basePath);
        files.push(...subFiles);
      } else {
        // This is a file, add it to our list
        try {
          const stats = await fs.stat(fullPath);
          const relativePath = fullPath.replace(basePath, '').replace(/^\/+/, '');
          
          files.push({
            name: entry.name || '',
            path: fullPath,
            size: stats.size || 0,
            modified: stats.mtime ? new Date(stats.mtime) : new Date(),
            relativePath: relativePath
          });
        } catch (statError) {
          logger.warn(`Failed to get file stats for: ${fullPath}`, statError as Error);
          // Still include the file even if we can't get stats
          const relativePath = fullPath.replace(basePath, '').replace(/^\/+/, '');
          files.push({
            name: entry.name || '',
            path: fullPath,
            size: 0,
            modified: new Date(),
            relativePath: relativePath
          });
        }
      }
    }
    
    return files;
  } catch (error) {
    logger.error(`Error scanning directory: ${dirPath}`, error as Error);
    throw error;
  }
};

/**
 * Open a directory picker dialog and scan the selected directory
 * @returns Promise resolving to array of ScannedFile objects or null if cancelled
 */
export const pickAndScanDirectory = async (): Promise<ScannedFile[] | null> => {
  if (!isTauriEnvironment()) {
    throw new Error('pickAndScanDirectory can only be used in Tauri environment');
  }

  try {
    // Dynamically import the dialog plugin
    const dialog = await import('@tauri-apps/plugin-dialog');
    
    // Open directory picker
    const selected = await dialog.open({
      directory: true,
      multiple: false,
      title: 'Select folder to upload'
    });
    
    if (!selected) {
      // User cancelled the dialog
      return null;
    }
    
    // Scan the selected directory
    const files = await scanDirectory(selected as string);
    return files;
  } catch (error) {
    logger.error('Error picking and scanning directory', error as Error);
    throw error;
  }
};

export default {
  isTauriEnvironment,
  scanDirectory,
  pickAndScanDirectory
};