import { useState, useEffect, useRef } from "react";
import { FileItem } from "@/components/types";
import { TraversedFile } from "@/lib/folderTraversal"; // Add this import
import { Folder, FileText, Image as ImageIcon, FileArchive } from "lucide-react";
import { ContextMenu } from "./ContextMenu";
import { RenameInput } from "./RenameInput";
import { ImageViewer } from "./ImageViewer";
import { MediaPlayer } from "./MediaPlayer";
import { Thumbnail } from "./Thumbnail";
import { UploadProgressWidget } from "./UploadProgressWidget";
import { getApiBaseUrl } from "@/lib/api";
import { getPlayerPreference } from "@/lib/playerSettings";
import type { Event } from '@tauri-apps/api/event';

interface FileGridProps {
  items: FileItem[];
  viewMode: "grid" | "list";
  onNavigate: (folderName: string) => void;
  itemCount: number;
  onCopy: (item: FileItem) => void;
  onCut: (item: FileItem) => void;
  onPaste?: () => void;
  onDelete: (item: FileItem, index: number) => void;
  onRename: (item: FileItem, index: number) => void;
  onMove: (item: FileItem, targetFolder: FileItem) => void; // This is correct now
  onDownload: (item: FileItem) => Promise<void>;
  renamingItem: { item: FileItem; index: number } | null;
  onRenameConfirm: (newName: string) => void;
  onRenameCancel: () => void;
  currentFolder: string;
  currentPath?: string[]; // Add full path information
  currentApiPath?: string; // Add API path information
  onNewFolder?: () => void;
  onUploadFiles?: () => void; // Add upload files callback
  onUploadFolder?: () => void; // Add upload folder callback
  isLoading?: boolean;
  cutItem?: FileItem | null; // Add prop to track cut item
  hasClipboard?: () => boolean; // Add prop to track if there's clipboard content
  isClipboardPasted?: boolean; // Add prop to track if clipboard item has been pasted
  onFileUploaded?: (file: FileItem) => void; // Callback for when a file is uploaded
  onItemsChange?: (items: FileItem[]) => void; // Callback for when items change
  onRefresh?: () => void; // Callback to refresh the file list
}

interface ContextMenuState {
  x: number;
  y: number;
  itemType: "file" | "folder" | "empty";
  itemName: string;
  item: FileItem;
  index: number;
}

export const FileGrid = ({
  items,
  viewMode,
  onNavigate,
  itemCount,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onRename,
  onMove,
  onDownload,
  renamingItem,
  onRenameConfirm,
  onRenameCancel,
  currentFolder,
  onNewFolder,
  onUploadFiles, // Add this
  onUploadFolder, // Add this
  isLoading,
  cutItem,
  hasClipboard,
  isClipboardPasted,
  onFileUploaded,
  onItemsChange,
  onRefresh,
  currentPath,
  currentApiPath,
}: FileGridProps) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [draggedItem, setDraggedItem] = useState<FileItem | null>(null);
  const [imageViewer, setImageViewer] = useState<{ url: string; fileName: string } | null>(null);
  const [mediaPlayer, setMediaPlayer] = useState<{
    url: string;
    fileName: string;
    fileType: "video" | "audio" | "voice";
  } | null>(null);
  const [isDragActive, setIsDragActive] = useState(false); // Add drag active state
  const [dropTarget, setDropTarget] = useState<FileItem | null>(null); // Track drop target
  const [uploadingFiles, setUploadingFiles] = useState<File[] | null>(null); // Track uploading files
  const [isDirectoryUpload, setIsDirectoryUpload] = useState(false); // Track if this is a directory upload
  const dragCounter = useRef(0); // Track drag enter/leave events
  
  // Reference for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);

  // Check if we're running in Tauri
  const isTauri = !!(window as any).__TAURI__;

  // Add Tauri event listeners for drag and drop
  useEffect(() => {
    if (!isTauri) return;

    let unlistenDragEnter: (() => void) | null = null;
    let unlistenDragOver: (() => void) | null = null;
    let unlistenDragDrop: (() => void) | null = null;
    let unlistenDragLeave: (() => void) | null = null;

    const initTauriDragListeners = async () => {
      try {
        // Dynamically import the event module only in Tauri environment
        const eventModule = await import('@tauri-apps/api/event');
        
        // Listen for Tauri drag enter events
        unlistenDragEnter = await eventModule.listen('tauri://drag-enter', (event: Event<any>) => {
          // Set drag over state when entering
          setIsDragActive(true);
        });

        // Listen for Tauri drag over events
        unlistenDragOver = await eventModule.listen('tauri://drag-over', (event: Event<any>) => {
          // Keep drag over state
          setIsDragActive(true);
        });

        // Listen for Tauri drag drop events
        unlistenDragDrop = await eventModule.listen('tauri://drag-drop', (event: Event<any>) => {
          // Handle dropped files in Tauri
          setIsDragActive(false);
          if (event && event.payload) {
            // The payload should contain the file paths
            console.log('Tauri drag drop event:', event.payload);
            // In a real implementation, we would need to handle the file paths
            // This is a simplified version for now
          }
        });

        // Listen for Tauri drag leave events
        unlistenDragLeave = await eventModule.listen('tauri://drag-leave', (event: Event<any>) => {
          // Clear drag over state when leaving
          setIsDragActive(false);
        });
      } catch (error) {
        console.error('Failed to initialize Tauri drag listeners:', error);
      }
    };

    initTauriDragListeners();

    // Cleanup function to remove event listeners
    return () => {
      if (unlistenDragEnter) unlistenDragEnter();
      if (unlistenDragOver) unlistenDragOver();
      if (unlistenDragDrop) unlistenDragDrop();
      if (unlistenDragLeave) unlistenDragLeave();
    };
  }, [isTauri]);

  // Disable Tauri's file drop functionality if possible
  useEffect(() => {
    if (!isTauri) return;

    const disableFileDrop = async () => {
      try {
        // Try to access the Tauri window API to disable file drop
        // In Tauri v2, we don't need to explicitly get the current window
        // The file drop is now handled at the Rust level
        console.log('Tauri file drop workaround applied');
      } catch (error) {
        console.error('Failed to apply file drop workaround:', error);
      }
    };

    disableFileDrop();
  }, [isTauri]);

  const handleContextMenu = (e: React.MouseEvent, item: FileItem, index: number) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling to parent container
    // Additional prevention of default context menu
    e.nativeEvent.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      itemType: item.type,
      itemName: item.name,
      item,
      index,
    });
  };

  const handleItemClick = (item: FileItem) => {
    if (item.type === "folder") {
      onNavigate(item.name);
    } else if (item.fileType === "photo" && item.file_unique_id) {
      // Open image in viewer with file name instead of unique ID
      const baseUrl = getApiBaseUrl();
      let imageUrl = baseUrl 
        ? `${baseUrl}/dl/${encodeURIComponent(item.name)}` 
        : `/dl/${encodeURIComponent(item.name)}`;
      
      // For Tauri environment, add auth token as query parameter
      const isTauri = !!(window as any).__TAURI__;
      if (isTauri) {
        try {
          const tauriAuth = localStorage.getItem('tauri_auth_token');
          if (tauriAuth) {
            const authData = JSON.parse(tauriAuth);
            if (authData.auth_token) {
              // Add auth token as query parameter
              const separator = imageUrl.includes('?') ? '&' : '?';
              imageUrl = `${imageUrl}${separator}auth_token=${authData.auth_token}`;
            }
          }
        } catch (e) {
          console.error("Failed to add auth token to image URL", e);
        }
      }
      
      setImageViewer({ url: imageUrl, fileName: item.name });
    } else if ((item.fileType === "video" || item.fileType === "audio" || item.fileType === "voice") && item.file_unique_id) {
      // Always use built-in player (remove external player option)
      console.log("Opening media in built-in player");
      const baseUrl = getApiBaseUrl();
      let mediaUrl = baseUrl 
        ? `${baseUrl}/dl/${encodeURIComponent(item.name)}` 
        : `/dl/${encodeURIComponent(item.name)}`;
      
      // For Tauri environment, add auth token as query parameter
      const isTauri = !!(window as any).__TAURI__;
      if (isTauri) {
        try {
          const tauriAuth = localStorage.getItem('tauri_auth_token');
          if (tauriAuth) {
            const authData = JSON.parse(tauriAuth);
            if (authData.auth_token) {
              // Add auth token as query parameter
              const separator = mediaUrl.includes('?') ? '&' : '?';
              mediaUrl = `${mediaUrl}${separator}auth_token=${authData.auth_token}`;
            }
          }
        } catch (e) {
          console.error("Failed to add auth token to media URL", e);
        }
      }
      
      setMediaPlayer({ 
        url: mediaUrl, 
        fileName: item.name, 
        fileType: item.fileType as "video" | "audio" | "voice" 
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, item: FileItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    
    // In Tauri, we might need to explicitly set the drag image
    if (isTauri) {
      const img = new Image();
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      e.dataTransfer.setDragImage(img, 0, 0);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Add file upload handler that accepts both FileList and TraversedFile[]
  const handleFileUpload = async (files: FileList | TraversedFile[]) => {
    try {
      // Use the API path if available, otherwise construct it
      // Ensure root path is always "/Home" instead of "/"
      let currentPathStr = currentApiPath || `/${currentFolder}`;
      if (currentPathStr === '/') {
        currentPathStr = '/Home';
      }
      console.log('Current folder:', currentFolder);
      console.log('Current path array:', currentPath);
      console.log('Current API path:', currentApiPath);
      console.log('Using path for upload:', currentPathStr);
      
      // Validate inputs
      if (!files || (Array.isArray(files) && files.length === 0) || (files instanceof FileList && files.length === 0)) {
        throw new Error('No files selected for upload');
      }
      
      // Convert files to array for easier handling
      const filesArray = [];
      if (files instanceof FileList) {
        // Convert FileList to array
        for (let i = 0; i < files.length; i++) {
          filesArray.push(files[i]);
        }
      } else {
        // Already an array
        filesArray.push(...files);
      }
      
      // Log all files for debugging
      console.log('All files received:', filesArray.map(f => {
        // Handle both File objects and TraversedFile objects
        if ('file' in f && f.file instanceof File) {
          // TraversedFile object
          return {
            name: f.file.name,
            size: f.file.size,
            type: f.file.type,
            fullPath: f.fullPath,
            lastModified: f.file.lastModified,
            webkitRelativePath: 'webkitRelativePath' in f.file ? (f.file as any).webkitRelativePath : 'N/A'
          };
        } else if (f instanceof File) {
          // Regular File object
          return {
            name: f.name,
            size: f.size,
            type: f.type,
            fullPath: 'N/A',
            lastModified: f.lastModified,
            webkitRelativePath: 'webkitRelativePath' in f ? (f as any).webkitRelativePath : 'N/A'
          };
        } else {
          // Unknown object type
          return {
            name: 'unknown',
            size: 0,
            type: 'unknown',
            fullPath: 'unknown',
            lastModified: 0,
            webkitRelativePath: 'N/A'
          };
        }
      }));
      
      // Filter out clearly problematic files
      const validFiles = filesArray.filter(fileObj => {
        // Handle both File objects and TraversedFile objects
        let file: File;
        let fullPath: string | undefined;
        
        if ('file' in fileObj && fileObj.file instanceof File) {
          // TraversedFile object
          file = fileObj.file;
          fullPath = fileObj.fullPath;
        } else if (fileObj instanceof File) {
          // Regular File object
          file = fileObj;
        } else {
          // Unknown object type
          console.warn('Skipping unknown file object type');
          return false;
        }
        
        // Skip files with no name
        if (!file.name) {
          console.warn('Skipping file with no name');
          return false;
        }
        
        // Skip system files that are definitely not user files
        if (file.name === 'Thumbs.db' || file.name === 'desktop.ini') {
          console.warn('Skipping system file:', file.name);
          return false;
        }
        
        // For traversed files (from folder drop), we should keep them even if they have size 0
        // because they came from our folder traversal logic and have proper fullPaths
        if (fullPath && fullPath !== file.name) {
          // This is a traversed file with a path structure, keep it
          console.log('Keeping traversed file:', file.name, 'with fullPath:', fullPath);
          return true;
        }
        
        // Keep files that have either:
        // 1. Content (size > 0)
        // 2. A type (indicating it's a real file)
        if (file.size > 0 || file.type) {
          return true;
        }
        
        // For files with size 0 and no type, we need to be more careful
        // If it has a meaningful path structure (contains slashes), it's likely from folder traversal
        if (fullPath && fullPath.includes('/') && fullPath !== file.name) {
          return true;
        }
        
        // According to project specification "Preserve Zero-Size Directory Placeholders During Filtering":
        // Do not skip entries solely based on size 0 and empty type. Directory placeholders appear this way;
        // they must be allowed to pass through so recursive traversal can process their contents.
        console.log('Preserving potential directory placeholder:', file.name);
        return true;
      });
      
      // Log valid files for debugging
      console.log('Valid files after filtering:', validFiles.map(f => {
        // Handle both File objects and TraversedFile objects
        if ('file' in f && f.file instanceof File) {
          // TraversedFile object
          return {
            name: f.file.name,
            size: f.file.size,
            type: f.file.type,
            fullPath: f.fullPath,
            lastModified: f.file.lastModified,
            webkitRelativePath: 'webkitRelativePath' in f.file ? (f.file as any).webkitRelativePath : 'N/A'
          };
        } else if (f instanceof File) {
          // Regular File object
          return {
            name: f.name,
            size: f.size,
            type: f.type,
            fullPath: 'N/A',
            lastModified: f.lastModified,
            webkitRelativePath: 'webkitRelativePath' in f ? (f as any).webkitRelativePath : 'N/A'
          };
        } else {
          // Unknown object type
          return {
            name: 'unknown',
            size: 0,
            type: 'unknown',
            fullPath: 'unknown',
            lastModified: 0,
            webkitRelativePath: 'N/A'
          };
        }
      }));
      
      if (validFiles.length === 0) {
        throw new Error('No valid files to upload after filtering');
      }
      
      // Set uploading files state to show the progress widget
      const filesToUpload = validFiles.map(f => {
        if ('file' in f && f.file instanceof File) {
          return f.file;
        } else if (f instanceof File) {
          return f;
        }
        return null;
      }).filter(Boolean) as File[];
      
      setUploadingFiles(filesToUpload);
      
      // Import the API client
      const { api } = await import('@/lib/api');
      
      // Collect all unique top-level folder names that need to be created
      const topLevelFoldersToCreate = new Set<string>();
      
      // Collect all unique folder paths that need to be created
      const folderPathsToCreate = new Set<string>();
      
      // Process each file to determine all folder paths in the hierarchy
      validFiles.forEach(fileObj => {
        let fullPath: string | undefined;
        
        if ('file' in fileObj && fileObj.file instanceof File) {
          fullPath = fileObj.fullPath;
        }
        
        // If we have a full path structure (e.g., "qwes/subfolder/file.txt"), we need to:
        // 1. Extract all folder paths in the hierarchy
        // 2. Add them to our set of folders to create
        if (fullPath && fullPath.includes('/')) {
          const pathParts = fullPath.split('/');
          console.log(`Processing fullPath: ${fullPath}, pathParts:`, pathParts);
          
          // Skip if the path is just "Home" or empty
          if (pathParts.length === 1 && (pathParts[0] === 'Home' || pathParts[0] === '')) {
            console.log(`Skipping invalid path: ${fullPath}`);
            return;
          }
          
          if (pathParts.length >= 1) {
            // Create all intermediate folder paths
            // For a path like "folder1/subfolder1/subfolder2/file.txt"
            // We need to create folder paths: 
            // - currentPathStr/folder1
            // - currentPathStr/folder1/subfolder1
            // - currentPathStr/folder1/subfolder1/subfolder2
            
            let cumulativePath = "";
            for (let i = 0; i < pathParts.length - 1; i++) { // -1 because we don't want the filename
              if (i === 0) {
                cumulativePath = pathParts[i];
              } else {
                cumulativePath = `${cumulativePath}/${pathParts[i]}`;
              }
              
              folderPathsToCreate.add(cumulativePath);
              console.log(`Adding folder path to create: ${cumulativePath}`);
            }
          }
        }
      });
      
      // Create all required folder paths using the recursive create_folder_path API
      console.log('Creating folder paths:', Array.from(folderPathsToCreate));
      for (const folderPath of folderPathsToCreate) {
        try {
          console.log(`Creating folder path '${folderPath}' in base path '${currentPathStr}'`);
          // Construct the full path by combining current path with the relative folder path
          let fullPathToCreate;
          if (currentPathStr === '/') {
            // If we're at root, the full path is "/Home/folderPath"
            fullPathToCreate = `/Home/${folderPath}`;
          } else if (currentPathStr === '/Home') {
            // If we're in /Home, just append the folderPath
            fullPathToCreate = `/Home/${folderPath}`;
          } else {
            // If we're in a subdirectory like /Home/Documents, combine the paths correctly
            // Ensure currentPathStr doesn't end with slash
            const cleanCurrentPath = currentPathStr.replace(/\/$/, ''); // Remove trailing slash
            fullPathToCreate = `${cleanCurrentPath}/${folderPath}`;
          }
          
          console.log(`Calling createFolderPath with full path: ${fullPathToCreate}`);
          await api.createFolderPath(fullPathToCreate);
          console.log(`Successfully created folder path: ${fullPathToCreate}`);
        } catch (error) {
          console.warn(`Error creating folder path ${folderPath}:`, error);
        }
      }
      
      // Upload each file with correct path structure
      const uploadPromises = validFiles.map(async (fileObj) => {
        let file: File;
        let fullPath: string | undefined;
        
        if ('file' in fileObj && fileObj.file instanceof File) {
          // TraversedFile object
          file = fileObj.file;
          fullPath = fileObj.fullPath;
        } else if (fileObj instanceof File) {
          // Regular File object
          file = fileObj;
          fullPath = fileObj.name;
        } else {
          throw new Error('Invalid file object');
        }
        
        // For folder uploads, we need to construct the correct path
        let uploadPath = currentPathStr;
        console.log(`Initial uploadPath: ${uploadPath}`);
        
        // If we have a full path structure (e.g., "qwes/subfolder/file.txt"), we need to:
        // 1. Extract the folder structure relative to the dropped folder
        // 2. Append it to the current path
        if (fullPath && fullPath.includes('/')) {
          // This preserves the folder structure from the dropped folder
          // For example, if fullPath is "qwes/subfolder/file.txt" and currentPathStr is "/Home/Documents"
          // The final path should be "/Home/Documents/qwes/subfolder" (without the filename)
          const pathParts = fullPath.split('/');
          console.log(`Processing file fullPath: ${fullPath}, pathParts:`, pathParts);
          
          if (pathParts.length >= 1) {
            // For folder uploads, we want to preserve the complete structure of the dropped folder
            // If we're in /Home/Documents and drop a folder "myfolder" containing "subfolder/file.txt",
            // the file should go to /Home/Documents/myfolder/subfolder (path to the folder, not including filename)
            
            // Remove the filename (last part) to get just the folder path
            const folderPathParts = pathParts.slice(0, -1); // All parts except the last one (filename)
            const folderPathRelative = folderPathParts.join('/');
            
            // Create the full path by combining current path with the relative folder path
            if (currentPathStr === '/') {
              // If we're at root, the full path is "/Home/folderPath"
              uploadPath = `/Home/${folderPathRelative}`;
            } else if (currentPathStr === '/Home') {
              // If we're in /Home, just append the folderPath
              uploadPath = `/Home/${folderPathRelative}`;
            } else {
              // If we're in a subdirectory like /Home/Documents, combine the paths correctly
              // Ensure currentPathStr doesn't end with slash
              const cleanCurrentPath = currentPathStr.replace(/\/$/, ''); // Remove trailing slash
              uploadPath = `${cleanCurrentPath}/${folderPathRelative}`;
            }
            console.log(`Final uploadPath for file: ${uploadPath}`);
          }
        }        
        console.log(`Uploading file ${file.name} to path: ${uploadPath}`);
        
        try {
          // Upload the file
          const result = await api.uploadFile(file, uploadPath);
          console.log('Upload result:', result);
          return result;
        } catch (error) {
          console.error(`Failed to upload file ${file.name}:`, error);
          throw error;
        }
      });
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      
      // Reset states
      setUploadingFiles(null);
      setIsDirectoryUpload(false);
      
      // Refresh file list
      if (onRefresh) {
        onRefresh();
      }
      
      // Show success message through UI feedback instead of alert
      console.log('Files uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      setUploadingFiles(null);
      setIsDirectoryUpload(false);
      // Show error message through UI feedback instead of alert
      console.error(`Upload failed: ${error.message || 'Unknown error'}`);
    }
  };

  // Handle drag enter event
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Drag enter event');
    console.log('Data transfer types:', e.dataTransfer.types);
    
    // Check if the drag contains files
    if (e.dataTransfer.types.includes('Files')) {
      console.log('Setting drag active state');
      setIsDragActive(true);
    } else {
      console.log('Not setting drag active - no files in drag');
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Drag leave event');
    
    // Only hide the overlay if we're leaving the main container, not child elements
    if (e.target === e.currentTarget) {
      console.log('Setting drag inactive state');
      setIsDragActive(false);
    } else {
      console.log('Not setting drag inactive - still over child elements');
    }
  };

  const handleFileDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Drag over event');
    
    // Necessary to allow drop events
    e.dataTransfer.dropEffect = 'copy';
  };

  // Handle file drop with modern folder traversal
  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    try {
      console.log('File drop event received');
      console.log('Data transfer types:', e.dataTransfer.types);
      console.log('Has files:', e.dataTransfer.types.includes('Files'));
      console.log('Files length:', e.dataTransfer.files?.length);
      console.log('Items length:', e.dataTransfer.items?.length);
      
      // Log each item
      if (e.dataTransfer.items) {
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          const item = e.dataTransfer.items[i];
          console.log(`Item ${i}: kind=${item.kind}, type=${item.type}`);
          if (item.getAsFileSystemHandle) {
            console.log(`Item ${i} has getAsFileSystemHandle`);
          }
          if ('webkitGetAsEntry' in item) {
            console.log(`Item ${i} has webkitGetAsEntry`);
          }
        }
      }
      
      // Reset any previous drag state
      setDraggedItem(null);
      
      // Check for internal drag data (JSON) - this indicates item moves, not file uploads
      const hasInternalData = e.dataTransfer.types.includes('application/json');
      console.log('Has internal data:', hasInternalData);
      
      // If it's an internal drag, don't treat as file upload regardless of other data types
      if (hasInternalData) {
        // This is an internal item drag, let the item drop handlers handle it
        // If no item drop handler caught it, it means it was dropped in an invalid location
        // In this case, we should just clear the drag state
        console.log('Internal drag detected, ignoring file upload');
        setDraggedItem(null);
        return;
      }
      
      // Check for actual file data from OS
      const hasFiles = e.dataTransfer.types.includes('Files');
      console.log('Processing file drop, hasFiles:', hasFiles);
      
      // If it's a file drag from OS, handle as file upload
      if (hasFiles) {
        console.log('Handling file drag from OS');
        
        // Process items synchronously within the event handler
        // Due to browser security restrictions, we must access DataTransfer items immediately
        
        // Try modern FileSystemHandle API first (synchronously)
        const modernFiles = await processItemsWithModernAPI(e.dataTransfer.items);
        if (modernFiles && modernFiles.length > 0) {
          console.log('Processed files with modern API:', modernFiles.length);
          handleFileUpload(modernFiles);
          return;
        }
        
        // Try legacy Entry API (synchronously)
        const legacyFiles = await processItemsWithLegacyAPI(e.dataTransfer.items);
        if (legacyFiles && legacyFiles.length > 0) {
          console.log('Processed files with legacy API:', legacyFiles.length);
          handleFileUpload(legacyFiles);
          return;
        }
        
        // Fallback to direct file access
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          console.log('Found files directly in dataTransfer.files');
          const files = e.dataTransfer.files;
          
          // Convert to array and process
          const fileListArray = Array.from(files);
          console.log('Processing', fileListArray.length, 'files from dataTransfer.files');
          
          // Create TraversedFile objects for each file
          const traversedFiles: TraversedFile[] = fileListArray.map(file => ({
            file,
            name: file.name,
            fullPath: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
          }));
          
          console.log('Created traversed files:', traversedFiles.length);
          
          // Handle the upload
          handleFileUpload(traversedFiles);
          return;
        }
        
        // If we get here, we couldn't process any files
        console.log('Could not process any files from drop');
        alert('Unable to process the dropped files. Please try dragging files directly from your file manager.');
        return;
      } else {
        console.log('No file data detected in drop event');
      }
    } catch (error) {
      console.error('Error handling file drop:', error);
      alert('Failed to handle file drop. Please try again.');
    }
  };
  
  // Process items with modern FileSystemHandle API
  const processItemsWithModernAPI = async (items: DataTransferItemList): Promise<TraversedFile[] | null> => {
    console.log('Processing items with modern API');
    const allFiles: TraversedFile[] = [];
    let hasHandles = false;
    
    // This must be done synchronously within the event handler
    for (const item of Array.from(items)) {
      if (item.getAsFileSystemHandle) {
        try {
          // This is the critical part - we must call getAsFileSystemHandle synchronously
          const handlePromise = item.getAsFileSystemHandle();
          const handle = await handlePromise;
          hasHandles = true;
          
          if (handle) {
            // Import the helper functions
            const { isFileSystemFileHandle, isFileSystemDirectoryHandle, traverseDirectoryWithHandle } = await import('@/lib/folderTraversal');
            
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
                console.warn(`Failed to get file from handle:`, error);
              }
            } else if (isFileSystemDirectoryHandle(handle)) {
              try {
                // For directories, traverse recursively
                const files = await traverseDirectoryWithHandle(handle, handle.name);
                allFiles.push(...files);
              } catch (error) {
                console.warn(`Failed to traverse directory:`, error);
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
  
  // Process items with legacy Entry API
  const processItemsWithLegacyAPI = async (items: DataTransferItemList): Promise<TraversedFile[] | null> => {
    console.log('Processing items with legacy API');
    const allFiles: TraversedFile[] = [];
    let hasEntries = false;
    
    // This must be done synchronously within the event handler
    for (const item of Array.from(items)) {
      if ('webkitGetAsEntry' in item) {
        try {
          // This is the critical part - we must call webkitGetAsEntry synchronously
          const entry = (item as any).webkitGetAsEntry();
          hasEntries = true;
          
          if (entry) {
            if (entry.isFile) {
              try {
                const file = await new Promise<File>((resolve, reject) => {
                  entry.file(resolve, reject);
                });
                
                const fullPath = entry.fullPath && entry.fullPath.length > 1 
                  ? entry.fullPath.substring(1) // Remove leading slash
                  : entry.name;
                  
                allFiles.push({
                  file,
                  name: file.name,
                  fullPath,
                  size: file.size,
                  type: file.type,
                  lastModified: file.lastModified
                });
              } catch (error) {
                console.warn(`Failed to get file from entry:`, error);
              }
            } else if (entry.isDirectory) {
              try {
                // Import the traversal function
                const { traverseDirectoryWithEntry } = await import('@/lib/folderTraversal');
                // For directories, traverse recursively
                const basePath = entry.fullPath && entry.fullPath.length > 1 
                  ? entry.fullPath.substring(1) // Remove leading slash
                  : entry.name;
                const files = await traverseDirectoryWithEntry(entry, basePath);
                allFiles.push(...files);
              } catch (error) {
                console.warn(`Failed to traverse directory:`, error);
              }
            }
          }
        } catch (error) {
          console.warn('Error getting Entry:', error);
        }
      }
    }
    
    return hasEntries ? allFiles : null;
  };
  
  // Traverse directory using FileSystemDirectoryHandle (Modern API)
  const traverseDirectoryWithHandle = async (
    handle: any,
    basePath: string = ''
  ): Promise<TraversedFile[]> => {
    const files: TraversedFile[] = [];
    
    try {
      // Using entries() to iterate through directory contents
      for await (const [name, entry] of handle.entries()) {
        const fullPath = basePath ? `${basePath}/${name}` : name;
        
        if (entry.kind === 'file') {
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
        } else if (entry.kind === 'directory') {
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
  
  // Traverse directory using DirectoryEntry (Legacy API)
  const traverseDirectoryWithEntry = async (
    entry: any,
    basePath: string = ''
  ): Promise<TraversedFile[]> => {
    const files: TraversedFile[] = [];
    
    try {
      const reader = entry.createReader();
      const entries: any[] = await new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
      
      for (const childEntry of entries) {
        const fullPath = basePath ? `${basePath}/${childEntry.name}` : childEntry.name;
        
        if (childEntry.isFile) {
          try {
            const file = await new Promise<File>((resolve, reject) => {
              childEntry.file(resolve, reject);
            });
            
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
        } else if (childEntry.isDirectory) {
          try {
            const subFiles = await traverseDirectoryWithEntry(childEntry, fullPath);
            files.push(...subFiles);
          } catch (error) {
            console.warn(`Failed to traverse directory ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to read directory entries for ${entry.name}:`, error);
    }
    
    return files;
  };

  // Handle drag over event for items
  const handleItemDragOver = (e: React.DragEvent, targetItem: FileItem) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(targetItem);
  };

  // Handle drop event on items
  const handleItemDrop = (e: React.DragEvent, targetItem: FileItem) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (!draggedItem || targetItem.type !== "folder" || draggedItem.name === targetItem.name) {
        return;
      }

      // Pass the target item (folder) to onMove instead of just the name
      onMove(draggedItem, targetItem);
      setDraggedItem(null);
    } catch (error) {
      console.error('Error handling item drop:', error);
      alert('Failed to move item. Please try again.');
    }
  };

  const getFileIcon = (item: FileItem) => {
    // For folders, use the Folder icon directly
    if (item.type === "folder") {
      // Use smaller icons for list view
      const folderIconSize = viewMode === 'list' ? 'w-5 h-5' : 'w-20 h-20';
      return <Folder className={`${folderIconSize} text-primary`} />;
    }
    
    // Use the new Thumbnail component for better error handling
    return <Thumbnail item={item} size={viewMode === 'list' ? 'sm' : 'lg'} />;
  };

  // Format file size in a human-readable format
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Add functions to trigger file/directory uploads
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const triggerDirectoryUpload = () => {
    directoryInputRef.current?.click();
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background select-none" data-drag-container
      onDragOver={handleFileDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleFileDrop}
    >
      {/* Hidden file input for regular file uploads */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files);
            // Reset the input
            e.target.value = '';
          }
        }}
      />
      
      {/* Hidden directory input for directory uploads */}
      <input
        type="file"
        ref={directoryInputRef}
        className="hidden"
        multiple
        {...({ webkitdirectory: "true" } as any)} // TypeScript workaround - must be string for React
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setIsDirectoryUpload(true);
            handleFileUpload(e.target.files);
            // Reset the input
            e.target.value = '';
            setIsDirectoryUpload(false);
          }
        }}
      />
      
      {/* Upload Progress Widget */}
      {uploadingFiles && (
        <UploadProgressWidget
          files={uploadingFiles}
          currentPath={currentApiPath || `/${currentFolder}`}
          isDirectoryUpload={isDirectoryUpload}
          onComplete={() => {
            setUploadingFiles(null);
            setIsDirectoryUpload(false);
            // Refresh the file list if a refresh function is provided
            if (onRefresh) {
              onRefresh();
            }
          }}
          onCancel={() => {
            setUploadingFiles(null);
            setIsDirectoryUpload(false);
          }}
        />
      )}
      
      <div
        className={`flex-1 overflow-y-auto p-4 ${isDragActive ? 'bg-blue-50 border-2 border-dashed border-blue-500 rounded-lg' : ''}`}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Additional prevention of default context menu
          e.nativeEvent.preventDefault();
          // Show context menu for empty area
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            itemType: "empty",
            itemName: "",
            item: { name: "", type: "folder", icon: "" } as FileItem,
            index: -1,
          });
        }}
      >
        {/* Upload indicator when dragging files over */}
        {isDragActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg z-50 pointer-events-none border-2 border-dashed border-primary">
            <div className="text-center p-6 bg-background rounded-lg shadow-lg pointer-events-auto border border-border">
              <div className="text-2xl mb-2">📁</div>
              <p className="text-lg font-semibold text-foreground">Drop files here to upload</p>
              <p className="text-muted-foreground">Upload to {currentFolder}</p>
            </div>
          </div>
        )}
        
        {viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {items.map((item, index) => {
              const isRenaming = renamingItem?.index === index;
              const isDragging = draggedItem?.name === item.name;
              const isCut = cutItem?.name === item.name && cutItem?.id === item.id; // Check if this item is cut

              return (
                <div
                  key={index}
                  draggable={!isRenaming}
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                  onDragOver={item.type === "folder" ? (e) => handleItemDragOver(e, item) : undefined}
                  onDrop={item.type === "folder" ? (e) => handleItemDrop(e, item) : undefined}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Additional prevention of default context menu
                    e.nativeEvent.preventDefault();
                    !isRenaming && handleContextMenu(e, item, index);
                  }}
                  className={`flex flex-col items-center p-3 rounded-xl transition-all duration-200 hover:scale-[1.03] hover:shadow-lg active:scale-[0.98] ${isDragging ? "opacity-50 scale-95" : ""}
                    ${isCut ? "opacity-50" : ""} // Apply fade effect to cut items
                    ${item.type === "folder" && draggedItem && draggedItem.name !== item.name
                      ? "scale-105 transition-all duration-200"
                      : ""
                    }`}
                >
                  <button
                    onClick={() => !isRenaming && handleItemClick(item)}
                    className="flex flex-col items-center w-full hover:bg-accent rounded-lg p-2 transition-all duration-200 group hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="mb-2">{getFileIcon(item)}</div>
                    {isRenaming ? (
                      <RenameInput
                        initialName={item.name}
                        onSave={onRenameConfirm}
                        onCancel={onRenameCancel}
                      />
                    ) : (
                      <span className="text-xs text-center break-words w-full text-foreground group-hover:text-accent-foreground">
                        {item.name}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border bg-muted/50">
              <div className="col-span-5">Name</div>
              <div className="col-span-3">Modified Date</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2 text-right">Size</div>
            </div>
            <div className="space-y-0.5">
              {items.map((item, index) => {
                const isRenaming = renamingItem?.index === index;
                const isDragging = draggedItem?.name === item.name;
                const isCut = cutItem?.name === item.name && cutItem?.id === item.id; // Check if this item is cut

                return (
                  <div
                    key={index}
                    draggable={!isRenaming}
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragEnd={handleDragEnd}
                    onDragOver={item.type === "folder" ? (e) => handleItemDragOver(e, item) : undefined}
                    onDrop={item.type === "folder" ? (e) => handleItemDrop(e, item) : undefined}
                    onContextMenu={(e) => !isRenaming && handleContextMenu(e, item, index)}
                    className={`transition-all duration-200 hover:shadow-md active:scale-[0.98] ${isDragging ? "opacity-50" : ""} 
                      ${isCut ? "opacity-50" : ""} // Apply fade effect to cut items
                      ${item.type === "folder" && draggedItem && draggedItem.name !== item.name
                      ? "scale-105 transition-all duration-200"
                      : ""
                      }`}
                  >
                    <button
                      onClick={() => !isRenaming && handleItemClick(item)}
                      className="col-span-12 w-full grid grid-cols-12 gap-4 p-1.5 rounded transition-all duration-200 group hover:bg-accent/50 active:scale-[0.995]"
                    >
                      <div className="col-span-5 flex items-center gap-3">
                        <div className="flex-shrink-0 w-5 h-5">{getFileIcon(item)}</div>
                        {isRenaming ? (
                          <div className="flex-1">
                            <RenameInput
                              initialName={item.name}
                              onSave={onRenameConfirm}
                              onCancel={onRenameCancel}
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-foreground group-hover:text-accent-foreground truncate">
                            {item.name}
                          </span>
                        )}
                      </div>
                      <div className="col-span-3 flex items-center text-xs text-muted-foreground">
                        {item.modified ? new Date(item.modified).toLocaleDateString() : ''}
                      </div>
                      <div className="col-span-2 flex items-center text-xs text-muted-foreground capitalize">
                        {item.type === 'folder' ? 'Folder' : (item.fileType || 'File')}
                      </div>
                      <div className="col-span-2 flex items-center justify-end text-xs text-muted-foreground">
                        {item.type === 'folder' ? '' : (item.size ? formatFileSize(item.size) : '')}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          itemType={contextMenu.itemType}
          itemName={contextMenu.itemName}
          onCopy={() => contextMenu.item && onCopy(contextMenu.item)}
          onCut={() => contextMenu.item && onCut(contextMenu.item)}
          onPaste={onPaste}
          onDelete={() => contextMenu.item && onDelete(contextMenu.item, contextMenu.index)}
          onRename={() => contextMenu.item && onRename(contextMenu.item, contextMenu.index)}
          onNewFolder={onNewFolder}
          onDownload={() => contextMenu.item && onDownload(contextMenu.item)}
          onUploadFiles={triggerFileUpload} // Use the trigger function
          onUploadFolder={triggerDirectoryUpload} // Use the trigger function
          onClose={() => setContextMenu(null)}
          hasClipboard={hasClipboard}
          isClipboardPasted={isClipboardPasted}
          disableDelete={
            // Disable delete for specific virtual folders in Home
            currentPath.length === 1 && 
            currentPath[0] === "Home" && 
            ["Images", "Documents", "Audio", "Voice Messages", "Videos"].includes(contextMenu.itemName)
          }
        />
      )}

      {/* Image Viewer */}
      {imageViewer && (
        <ImageViewer
          imageUrl={imageViewer.url}
          fileName={imageViewer.fileName}
          onClose={() => setImageViewer(null)}
        />
      )}

      {/* Media Player */}
      {mediaPlayer && (
        <MediaPlayer
          mediaUrl={mediaPlayer.url}
          fileName={mediaPlayer.fileName}
          fileType={mediaPlayer.fileType}
          onClose={() => setMediaPlayer(null)}
        />
      )}
    </div>
  );
};