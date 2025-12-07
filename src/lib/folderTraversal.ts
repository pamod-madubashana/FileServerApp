// Types for our file objects
export interface TraversedFile {
  file: File;
  name: string;
  fullPath: string;
  size: number;
  type: string;
  lastModified: number;
}

// Extend global types for FileSystem APIs
declare global {
  interface DataTransferItem {
    getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
  }
  
  interface FileSystemDirectoryHandle {
    keys(): AsyncIterable<string>;
    values(): AsyncIterable<FileSystemHandle>;
    entries(): AsyncIterable<[string, FileSystemHandle]>;
  }
}

// Type guard for FileSystemHandle
const isFileSystemFileHandle = (handle: unknown): handle is FileSystemFileHandle => {
  return handle && typeof handle === 'object' && 'kind' in handle && (handle as FileSystemFileHandle).kind === 'file';
};

const isFileSystemDirectoryHandle = (handle: unknown): handle is FileSystemDirectoryHandle => {
  return handle && typeof handle === 'object' && 'kind' in handle && (handle as FileSystemDirectoryHandle).kind === 'directory';
};

// Traverse directory using FileSystemDirectoryHandle (Modern API)
const traverseDirectoryWithHandle = async (
  handle: FileSystemDirectoryHandle,
  basePath: string = ''
): Promise<TraversedFile[]> => {
  const files: TraversedFile[] = [];
  
  try {
    // Using entries() to iterate through directory contents
    for await (const [name, entry] of handle.entries()) {
      const fullPath = basePath ? `${basePath}/${name}` : name;
      
      if (isFileSystemFileHandle(entry)) {
        try {
          const file = await entry.getFile();
          files.push({
            file,
            name: file.name,
            fullPath,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
          });
        } catch (error) {
          console.warn(`Failed to get file ${fullPath}:`, error);
        }
      } else if (isFileSystemDirectoryHandle(entry)) {
        try {
          const subFiles = await traverseDirectoryWithHandle(entry, fullPath);
          files.push(...subFiles);
        } catch (error) {
          console.warn(`Failed to traverse directory ${fullPath}:`, error);
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to read directory entries for ${handle.name}:`, error);
  }
  
  return files;
};

// Traverse directory using FileSystemEntry (File and Directory Entries API - Fallback)
const traverseDirectoryWithEntry = async (
  entry: unknown,
  basePath: string = ''
): Promise<TraversedFile[]> => {
  const files: TraversedFile[] = [];

  const readEntriesPromise = (): Promise<unknown[]> => {
    return new Promise((resolve, reject) => {
      const dirReader = (entry as any).createReader();
      const entries: unknown[] = [];
      
      const readBatch = () => {
        dirReader.readEntries((batch: unknown[]) => {
          if (batch.length === 0) {
            resolve(entries);
          } else {
            entries.push(...batch);
            readBatch();
          }
        }, reject);
      };
      
      readBatch();
    });
  };

  try {
    const entries = await readEntriesPromise();
    
    for (const childEntry of entries as any[]) {
      const fullPath = basePath ? `${basePath}/${(childEntry as any).name}` : (childEntry as any).name;
      
      if ((childEntry as any).isFile) {
        try {
          const file = await new Promise<File>((resolve, reject) => {
            (childEntry as any).file(resolve, reject);
          });
          
          const finalFullPath = basePath ? `${basePath}/${(childEntry as any).name}` : (childEntry as any).name;
          
          files.push({
            file,
            name: file.name,
            fullPath: finalFullPath,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
          });
        } catch (error) {
          console.warn(`Failed to get file ${fullPath}:`, error);
        }
      } else if ((childEntry as any).isDirectory) {
        try {
          const subFiles = await traverseDirectoryWithEntry(childEntry, fullPath);
          files.push(...subFiles);
        } catch (error) {
          console.warn(`Failed to traverse directory ${fullPath}:`, error);
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to read directory entries for ${(entry as any).name}:`, error);
  }

  return files;
};

// Process DataTransferItems using the modern FileSystemHandle API
const processDropItemsWithHandle = async (items: DataTransferItemList): Promise<TraversedFile[] | null> => {
  const allFiles: TraversedFile[] = [];
  let hasHandles = false;
  
  for (const item of Array.from(items)) {
    // Try modern FileSystemHandle API
    if (item.getAsFileSystemHandle) {
      try {
        const handle = await item.getAsFileSystemHandle();
        hasHandles = true;
        
        if (handle) {
          if (isFileSystemFileHandle(handle)) {
            try {
              const file = await handle.getFile();
              allFiles.push({
                file,
                name: file.name,
                fullPath: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
              });
            } catch (error) {
              console.warn(`Failed to get file from handle ${(handle as any).name}:`, error);
            }
          } else if (isFileSystemDirectoryHandle(handle)) {
            try {
              const files = await traverseDirectoryWithHandle(handle);
              allFiles.push(...files);
            } catch (error) {
              console.warn(`Failed to traverse directory ${(handle as any).name}:`, error);
            }
          }
        }
      } catch (error) {
        console.warn('Error getting FileSystemHandle:', error);
      }
    }
  }
  
  return hasHandles ? allFiles : null;
};

// Process DataTransferItems using the File and Directory Entries API (Fallback)
const processDropItemsWithEntry = async (items: DataTransferItemList): Promise<TraversedFile[]> => {
  const allFiles: TraversedFile[] = [];
  
  for (const item of Array.from(items)) {
    // Try File and Directory Entries API
    if ('webkitGetAsEntry' in item) {
      const entry = webkitGetAsEntryPromise(item);
      if (entry) {
        if ((entry as any).isFile) {
          try {
            const file = await new Promise<File>((resolve, reject) => {
              (entry as any).file(resolve, reject);
            });
            
            const fullPath = (entry as any).fullPath && (entry as any).fullPath.length > 1 
              ? (entry as any).fullPath.substring(1) // Remove leading slash
              : (entry as any).name;
              
            allFiles.push({
              file,
              name: file.name,
              fullPath,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified
            });
          } catch (error) {
            console.warn(`Failed to get file from entry ${(entry as any).name}:`, error);
          }
        } else if ((entry as any).isDirectory) {
          try {
            const files = await traverseDirectoryWithEntry(entry);
            allFiles.push(...files);
          } catch (error) {
            console.warn(`Failed to traverse directory ${(entry as any).name}:`, error);
          }
        }
        continue; // Successfully processed with File and Directory Entries API
      }
    }
    
    // Fallback to File API (for regular files)
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file) {
        allFiles.push({
          file,
          name: file.name,
          fullPath: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        });
      }
    }
  }
  
  return allFiles;
};

// Process DataTransferItems using the best available API
export const processDropItems = async (items: DataTransferItemList): Promise<TraversedFile[]> => {
  // Check if items is accessible
  if (!items || items.length === 0) {
    return [];
  }
  
  // Try modern API first
  try {
    const filesFromHandle = await processDropItemsWithHandle(items);
    if (filesFromHandle !== null) {
      return filesFromHandle;
    }
  } catch (error) {
    console.warn('Error processing with FileSystemHandle API:', error);
  }
  
  // Fallback to Entry API
  try {
    const filesFromEntry = await processDropItemsWithEntry(items);
    return filesFromEntry;
  } catch (error) {
    console.warn('Error processing with Entry API:', error);
    return [];
  }
};

// Promise wrapper for webkitGetAsEntry
const webkitGetAsEntryPromise = (item: DataTransferItem): unknown => {
  if ('webkitGetAsEntry' in item) {
    return (item as any).webkitGetAsEntry();
  }
  return null;

};
