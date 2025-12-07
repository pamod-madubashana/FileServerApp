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
  
  console.log('Traversing directory with handle:', handle.name, 'base path:', basePath);
  
  try {
    // Using entries() to iterate through directory contents
    for await (const [name, entry] of handle.entries()) {
      const fullPath = basePath ? `${basePath}/${name}` : name;
      console.log('Processing entry:', name, 'full path:', fullPath, 'kind:', entry.kind);
      
      if (isFileSystemFileHandle(entry)) {
        try {
          const file = await entry.getFile();
          console.log('Got file from handle:', file.name);
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
          console.log('Recursively traversing subdirectory:', name);
          const subFiles = await traverseDirectoryWithHandle(entry, fullPath);
          console.log('Subdirectory', name, 'returned', subFiles.length, 'files');
          files.push(...subFiles);
        } catch (error) {
          console.warn(`Failed to traverse directory ${fullPath}:`, error);
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to read directory entries for ${handle.name}:`, error);
  }
  
  console.log('Finished traversing directory', handle.name, 'found', files.length, 'files');
  return files;
};

// Traverse directory using FileSystemEntry (File and Directory Entries API - Fallback)
const traverseDirectoryWithEntry = async (
  entry: unknown,
  basePath: string = ''
): Promise<TraversedFile[]> => {
  const files: TraversedFile[] = [];

  console.log('Traversing directory with entry:', (entry as any).name, 'base path:', basePath);

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
    console.log('Directory reader returned', entries.length, 'entries');
    
    for (const childEntry of entries as any[]) {
      const fullPath = basePath ? `${basePath}/${(childEntry as any).name}` : (childEntry as any).name;
      console.log('Processing child entry:', (childEntry as any).name, 'full path:', fullPath);
      
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
          console.log('Recursively traversing subdirectory:', (childEntry as any).name);
          const subFiles = await traverseDirectoryWithEntry(childEntry, fullPath);
          console.log('Subdirectory', (childEntry as any).name, 'returned', subFiles.length, 'files');
          files.push(...subFiles);
        } catch (error) {
          console.warn(`Failed to traverse directory ${fullPath}:`, error);
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to read directory entries for ${(entry as any).name}:`, error);
  }

  console.log('Finished traversing directory', (entry as any).name, 'found', files.length, 'files');
  return files;
};

// Process DataTransferItems using the modern FileSystemHandle API
const processDropItemsWithHandle = async (items: DataTransferItemList): Promise<TraversedFile[] | null> => {
  const allFiles: TraversedFile[] = [];
  let hasHandles = false;
  
  console.log('Processing items with FileSystemHandle API, items count:', items.length);
  
  for (const item of Array.from(items)) {
    console.log('Checking item:', item);
    // Try modern FileSystemHandle API
    if (item.getAsFileSystemHandle) {
      console.log('Item has getAsFileSystemHandle');
      try {
        const handle = await item.getAsFileSystemHandle();
        console.log('Got handle:', handle);
        if (handle) {
          console.log('Handle kind:', (handle as any).kind);
        }
        hasHandles = true;
        
        if (handle) {
          if (isFileSystemFileHandle(handle)) {
            console.log('Handle is file');
            try {
              const file = await handle.getFile();
              console.log('Got file:', file);
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
            console.log('Handle is directory:', handle.name);
            try {
              // For directories, we need to traverse with the directory name as the base path
              console.log('Traversing directory with base path:', handle.name);
              const files = await traverseDirectoryWithHandle(handle, handle.name);
              console.log('Traversed directory files:', files.length);
              allFiles.push(...files);
            } catch (error) {
              console.warn(`Failed to traverse directory ${(handle as any).name}:`, error);
            }
          } else {
            console.log('Handle is neither file nor directory, kind:', (handle as any).kind);
          }
        } else {
          console.log('Handle is null');
        }
      } catch (error) {
        console.warn('Error getting FileSystemHandle:', error);
      }
    } else {
      console.log('Item does not have getAsFileSystemHandle');
    }
  }
  
  console.log('FileSystemHandle processing complete, files found:', allFiles.length, 'hasHandles:', hasHandles);
  return hasHandles ? allFiles : null;
};

// Process DataTransferItems using the File and Directory Entries API (Fallback)
const processDropItemsWithEntry = async (items: DataTransferItemList): Promise<TraversedFile[]> => {
  const allFiles: TraversedFile[] = [];
  
  console.log('Processing items with Entry API, items count:', items.length);
  
  for (const item of Array.from(items)) {
    console.log('Checking item for Entry API:', item);
    // Try File and Directory Entries API
    if ('webkitGetAsEntry' in item) {
      console.log('Item has webkitGetAsEntry');
      const entry = webkitGetAsEntryPromise(item);
      console.log('Got entry:', entry);
      if (entry) {
        console.log('Entry isFile:', (entry as any).isFile);
        console.log('Entry isDirectory:', (entry as any).isDirectory);
        if ((entry as any).isFile) {
          console.log('Entry is file');
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
          console.log('Entry is directory');
          try {
            // For directories, we need to traverse with the directory name as the base path
            const basePath = (entry as any).fullPath && (entry as any).fullPath.length > 1 
              ? (entry as any).fullPath.substring(1) // Remove leading slash
              : (entry as any).name;
            console.log('Traversing directory with base path:', basePath);
            const files = await traverseDirectoryWithEntry(entry, basePath);
            console.log('Traversed directory files with Entry API:', files.length);
            allFiles.push(...files);
          } catch (error) {
            console.warn(`Failed to traverse directory ${(entry as any).name}:`, error);
          }
        } else {
          console.log('Entry is neither file nor directory, isFile:', (entry as any).isFile, 'isDirectory:', (entry as any).isDirectory);
        }
        continue; // Successfully processed with File and Directory Entries API
      } else {
        console.log('Entry is null');
      }
    } else {
      console.log('Item does not have webkitGetAsEntry');
    }
    
    // Fallback to File API (for regular files)
    if (item.kind === 'file') {
      console.log('Item is file kind');
      const file = item.getAsFile();
      if (file) {
        console.log('Got file from getAsFile:', file);
        allFiles.push({
          file,
          name: file.name,
          fullPath: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        });
      } else {
        console.log('getAsFile returned null');
      }
    } else {
      console.log('Item is not file kind, kind:', item.kind);
    }
  }
  
  console.log('Entry API processing complete, files found:', allFiles.length);
  return allFiles;
};

// Export the helper functions
export { isFileSystemFileHandle, isFileSystemDirectoryHandle, traverseDirectoryWithHandle, traverseDirectoryWithEntry };

// Process DataTransferItems using the best available API
export const processDropItems = async (items: DataTransferItemList): Promise<TraversedFile[]> => {
  console.log('Starting processDropItems, items count:', items.length);
  
  // Check if items is accessible
  if (!items || items.length === 0) {
    console.log('No items available in DataTransferItemList');
    return [];
  }
  
  // Log each item for debugging
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`Item ${i}: kind=${item.kind}, type=${item.type}`);
    if (item.getAsFileSystemHandle) {
      console.log(`Item ${i} has getAsFileSystemHandle method`);
    }
    if ('webkitGetAsEntry' in item) {
      console.log(`Item ${i} has webkitGetAsEntry method`);
    }
  }
  
  // Try modern API first
  try {
    console.log('Trying modern FileSystemHandle API');
    const filesFromHandle = await processDropItemsWithHandle(items);
    console.log('FileSystemHandle API result:', filesFromHandle);
    if (filesFromHandle !== null) {
      console.log('Returning files from FileSystemHandle API, count:', filesFromHandle.length);
      return filesFromHandle;
    }
  } catch (error) {
    console.warn('Error processing with FileSystemHandle API:', error);
  }
  
  // Fallback to Entry API
  try {
    console.log('Trying Entry API fallback');
    const filesFromEntry = await processDropItemsWithEntry(items);
    console.log('Entry API result, count:', filesFromEntry.length);
    return filesFromEntry;
  } catch (error) {
    console.warn('Error processing with Entry API:', error);
    return [];
  }
};

// Promise wrapper for webkitGetAsEntry
const webkitGetAsEntryPromise = (item: DataTransferItem): unknown => {
  if ('webkitGetAsEntry' in item) {
    const entry = (item as any).webkitGetAsEntry();
    console.log('webkitGetAsEntry returned:', entry);
    if (entry) {
      console.log('Entry name:', (entry as any).name);
      console.log('Entry isFile:', (entry as any).isFile);
      console.log('Entry isDirectory:', (entry as any).isDirectory);
      console.log('Entry fullPath:', (entry as any).fullPath);
    }
    return entry;
  }
  return null;

};
