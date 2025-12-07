import { useState, useEffect, useRef } from "react";
import { FileItem } from "./types";
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
  const [isDragOver, setIsDragOver] = useState(false); // Add drag over state
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
          setIsDragOver(true);
        });

        // Listen for Tauri drag over events
        unlistenDragOver = await eventModule.listen('tauri://drag-over', (event: Event<any>) => {
          // Keep drag over state
          setIsDragOver(true);
        });

        // Listen for Tauri drag drop events
        unlistenDragDrop = await eventModule.listen('tauri://drag-drop', (event: Event<any>) => {
          // Handle dropped files in Tauri
          setIsDragOver(false);
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
          setIsDragOver(false);
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

  // Add file upload handler
  const handleFileUpload = async (files: FileList | File[], isDirUpload: boolean = false) => {
    try {
      // Use the API path if available, otherwise construct it
      let currentPathStr = currentApiPath || `/${currentFolder}`;
      console.log('Current folder:', currentFolder);
      console.log('Current path array:', currentPath);
      console.log('Current API path:', currentApiPath);
      console.log('Using path for upload:', currentPathStr);
      console.log('Is directory upload:', isDirUpload);
      
      // Validate inputs
      if (!files || (Array.isArray(files) ? files.length === 0 : files.length === 0)) {
        throw new Error('No files selected for upload');
      }
      
      // Convert to array if it's a FileList
      const filesArray = Array.isArray(files) ? files : Array.from(files);
      
      // Log all files for debugging
      console.log('All files received:', filesArray.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        webkitRelativePath: 'webkitRelativePath' in f ? (f as any).webkitRelativePath : 'N/A'
      })));
      
      // Filter out clearly problematic files
      const validFiles = Array.from(files).filter(file => {
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
        
        // For directory uploads, be more permissive since we want to process all files
        if (isDirUpload) {
          // Skip entries that are clearly not files (have no webkitRelativePath)
          if (!('webkitRelativePath' in file) || !(file as any).webkitRelativePath) {
            console.warn('Skipping non-file entry in directory upload:', file.name);
            return false;
          }
          return true;
        }
        
        // For regular file uploads, skip entries that appear to be directories
        // Directories typically have:
        // - No file type
        // - 0 size
        // - No webkitRelativePath or empty webkitRelativePath
        if (file.size === 0 && !file.type && (!('webkitRelativePath' in file) || !(file as any).webkitRelativePath)) {
          console.warn('Skipping directory entry:', file.name);
          return false;
        }
        
        // Keep all other files
        return true;
      });
      
      // Log valid files for debugging
      console.log('Valid files after filtering:', validFiles.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        webkitRelativePath: 'webkitRelativePath' in f ? (f as any).webkitRelativePath : 'N/A'
      })));
      
      // If no valid files remain, show a message and exit
      if (validFiles.length === 0) {
        const allFileNames = filesArray.map(f => f.name).join(', ');
        alert(`No valid files to upload. Folder may be empty or contain only system files.\n\nFiles detected: ${allFileNames || 'None'}`);
        setUploadingFiles(null);
        setIsDirectoryUpload(false);
        return;
      }
      
      // Set uploading files state to show progress widget (only valid files)
      setUploadingFiles(validFiles);
      
      // Import the API utilities
      const { getApiBaseUrl, fetchWithTimeout } = await import('@/lib/api');
      
      // For directory uploads, create the entire folder structure at once
      if (isDirUpload) {
        // Collect all unique folder paths
        const folderPaths = new Set<string>();
        
        for (let i = 0; i < validFiles.length; i++) {
          const file = validFiles[i];
          
          if ('webkitRelativePath' in file) {
            const relativePath = (file as any).webkitRelativePath;
            if (relativePath) {
              // Extract the directory path from the relative path
              const pathParts = relativePath.split('/');
              if (pathParts.length > 1) {
                // Remove the filename (last part)
                const folderPathParts = pathParts.slice(0, -1);
                // Create full path by joining with current path
                const fullPath = `${currentPathStr}/${folderPathParts.join('/')}`;
                folderPaths.add(fullPath);
              }
            }
          }
        }
        
        // Log folder paths for debugging
        console.log('Folder paths to create:', Array.from(folderPaths));
        
        // Create all folder paths
        const baseUrl = getApiBaseUrl();
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        
        for (const folderPath of Array.from(folderPaths)) {
          try {
            await fetchWithTimeout(`${apiUrl}/folders/create-path`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                fullPath: folderPath,
              }),
            }).catch(err => {
              // Ignore errors for folder creation - it might already exist
              console.log(`Folder path ${folderPath} might already exist`);
            });
          } catch (err) {
            console.log('Error creating folder path (might already exist):', err);
          }
        }
      }
      
      // Upload each valid file
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        
        // Validate file
        if (!file) {
          throw new Error('Invalid file object');
        }
        
        console.log('Uploading file:', file.name, 'size:', file.size, 'type:', file.type);
        
        // Check if file is actually empty (not just reported as 0 size)
        if (file.size === 0) {
          try {
            // Try to read the file to see if it actually has content
            const fileArrayBuffer = await file.arrayBuffer();
            if (fileArrayBuffer.byteLength === 0) {
              console.warn('Skipping truly empty file:', file.name);
              continue; // Skip this file but continue with others
            }
          } catch (readError: any) {
            // Check if this is a directory or special file that can't be read
            if (readError.name === 'NotFoundError' || readError.message.includes('not found') || readError.message.includes('directory')) {
              console.warn('Skipping directory or unreadable file:', file.name);
              continue; // Skip this file but continue with others
            }
            
            console.warn('Error reading file, skipping:', file.name, readError);
            continue; // Skip this file but continue with others
          }
        }
        
        // Determine the target path for this file
        let targetPath = currentPathStr;
        
        // If this is a directory upload, we need to create the folder structure
        if (isDirUpload && 'webkitRelativePath' in file) {
          const relativePath = (file as any).webkitRelativePath;
          if (relativePath) {
            // Extract the directory path from the relative path
            const pathParts = relativePath.split('/');
            if (pathParts.length > 1) {
              // Remove the filename (last part)
              const folderPathParts = pathParts.slice(0, -1);
              // Join with the current path
              targetPath = `${currentPathStr}/${folderPathParts.join('/')}`;
            }
          }
        }
        
        const formData = new FormData();
        // For directory uploads, extract just the filename part (last part after the last slash)
        if (isDirUpload && 'webkitRelativePath' in file) {
          const relativePath = (file as any).webkitRelativePath;
          if (relativePath) {
            // Extract just the filename (last part after the last slash)
            const pathParts = relativePath.split('/');
            const actualFileName = pathParts[pathParts.length - 1];
            // Append with the clean filename
            formData.append('file', file, actualFileName);
          } else {
            formData.append('file', file);
          }
        } else {
          formData.append('file', file);
        }

        const baseUrl = getApiBaseUrl();
        const apiUrl = baseUrl ? `${baseUrl}/api/files/upload` : '/api/files/upload';
        
        // Use fetchWithTimeout to ensure proper auth header handling in Tauri
        // Properly encode the path parameter
        const encodedPath = encodeURIComponent(targetPath);
        console.log('Encoded path for upload:', encodedPath);
        
        const response = await fetchWithTimeout(`${apiUrl}?path=${encodedPath}`, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Upload failed with status:', response.status, 'and data:', errorData);
          
          // Try to get more detailed error information
          let errorMessage = `Failed to upload file: ${response.status} ${response.statusText}`;
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.errors) {
            // Handle validation errors
            errorMessage = 'Validation error: ' + JSON.stringify(errorData.errors);
          }
          
          throw new Error(errorMessage);
        }
        
        // Get the uploaded file data
        const result = await response.json();
        
        // Create a FileItem from the response
        const uploadedFile = {
          id: result.file.id,
          file_unique_id: result.file.file_unique_id,
          name: result.file.file_name,
          type: 'file',
          icon: '', // Will be set by the getFileIcon function
          extension: result.file.file_name.split('.').pop(),
          size: result.file.file_size,
          fileType: result.file.file_type,
          thumbnail: result.file.thumbnail,
          file_path: result.file.file_path,
          modified: result.file.modified,
        } as FileItem;
        
        // Don't add the uploaded file to the grid immediately
        // Instead, let the progress widget onComplete handler refresh the file list
        // when the progress reaches 100%
        
        // The onComplete handler in UploadProgressWidget will call onRefresh()
        // which will fetch the updated file list from the server
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error.message || 'Unknown error'}`);
      // Hide progress widget on error
      setUploadingFiles(null);
      setIsDirectoryUpload(false);
    }
  };

  // Handle drag enter event
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    
    // Only show drag overlay for actual files from OS, not internal item drags
    const hasInternalData = e.dataTransfer.types.includes('application/json');
    const hasFiles = e.dataTransfer.types.includes('Files');
    
    // Show upload overlay only for file drags from OS
    if (hasFiles && !hasInternalData) {
      setIsDragOver(true);
    }
  };

  // Handle drag leave event
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    
    // Only hide the drag overlay when we've left the container completely
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  };

  // Handle drag over event for files
  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Only show drag overlay for actual files from OS, not internal item drags
    const hasInternalData = e.dataTransfer.types.includes('application/json');
    const hasFiles = e.dataTransfer.types.includes('Files');
    
    // Show upload overlay only for file drags from OS
    if (hasFiles && !hasInternalData) {
      e.dataTransfer.dropEffect = "copy";
      setIsDragOver(true);
    }
  };

  // Handle drop event on files
  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0; // Reset counter
    setIsDragOver(false);

    try {
      // Check if this is a file drag from the OS (not an internal item drag)
      // Internal item drags will have application/json data
      const hasInternalData = e.dataTransfer.types.includes('application/json');
      
      // If it's an internal drag, don't treat as file upload regardless of other data types
      if (hasInternalData) {
        // This is an internal item drag, let the item drop handlers handle it
        // If no item drop handler caught it, it means it was dropped in an invalid location
        // In this case, we should just clear the drag state
        setDraggedItem(null);
        return;
      }
      
      // Check if we're in Tauri environment
      const isTauri = !!(window as any).__TAURI__;
      
      // Check for actual file data from OS
      const hasFiles = e.dataTransfer.types.includes('Files');
      
      // Log drag transfer data for debugging
      console.log('Drag transfer types:', e.dataTransfer.types);
      console.log('Number of files:', e.dataTransfer.files?.length);
      
      // Try to get items from the DataTransfer object (may include directories)
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        console.log('DataTransfer items:', e.dataTransfer.items.length);
        // Log item kinds and types
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          console.log(`Item ${i}: kind=${e.dataTransfer.items[i].kind}, type=${e.dataTransfer.items[i].type}`);
        }
      }
      
      // If it's a file drag from OS, handle as file upload
      if (hasFiles && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = e.dataTransfer.files;
        
        // Log all files for debugging
        console.log('Files in drop event:', Array.from(files).map(f => ({
          name: f.name,
          size: f.size,
          type: f.type,
          webkitRelativePath: 'webkitRelativePath' in f ? (f as any).webkitRelativePath : 'N/A'
        })));
        
        // In Tauri environment, we can try to handle folder drops natively
        if (isTauri) {
          // Check if this looks like a folder drop (single entry with no webkitRelativePath and 0 size)
          // This happens when a folder is dragged directly onto the drop zone
          if (files.length === 1 && files[0].size === 0 && !files[0].type && 
              (!('webkitRelativePath' in files[0]) || !(files[0] as any).webkitRelativePath)) {
            console.log('Detected folder drop in Tauri, using native folder scanning');
            // Use native Tauri folder scanning
            const tauriFs = await import('@/lib/tauri-fs');
            // For drag and drop, we would need to get the actual folder path
            // This is complex in Tauri, so we'll still use the dialog approach for now
            triggerDirectoryUpload();
            return;
          }
        }
        
        // Check if any of the files have webkitRelativePath (indicating folder upload)
        let isDirectoryUpload = false;
        for (let i = 0; i < files.length; i++) {
          if ('webkitRelativePath' in files[i] && (files[i] as any).webkitRelativePath) {
            isDirectoryUpload = true;
            break;
          }
        }
        
        console.log('Is directory upload detected:', isDirectoryUpload);
        
        // For directory uploads, set the flag and handle specially
        if (isDirectoryUpload) {
          setIsDirectoryUpload(true);
        }
        
        handleFileUpload(files, isDirectoryUpload);
        return;
      }
    } catch (error) {
      console.error('Error handling file drop:', error);
      alert('Failed to handle file drop. Please try again.');
    }
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

  const triggerDirectoryUpload = async () => {
    try {
      // Check if we're in Tauri environment
      const isTauri = !!(window as any).__TAURI__;
      
      if (isTauri) {
        // Use native Tauri folder scanning
        const tauriFs = await import('@/lib/tauri-fs');
        const files = await tauriFs.pickAndScanDirectory();
        
        if (files && files.length > 0) {
          // Convert scanned files to File-like objects for upload
          await handleNativeFolderUpload(files);
        }
        return;
      }
      
      // Fallback to web-based approach for non-Tauri environments
      directoryInputRef.current?.click();
    } catch (error) {
      console.error('Error triggering directory upload:', error);
      alert('Failed to select folder. Please try again.');
    }
  };

  // Handle native folder upload from Tauri file system
  const handleNativeFolderUpload = async (scannedFiles: any[]) => {
    try {
      // Use the API path if available, otherwise construct it
      let currentPathStr = currentApiPath || `/${currentFolder}`;
      console.log('Current folder:', currentFolder);
      console.log('Current path array:', currentPath);
      console.log('Current API path:', currentApiPath);
      console.log('Using path for upload:', currentPathStr);
      console.log('Scanned files count:', scannedFiles.length);

      // Validate inputs
      if (!scannedFiles || scannedFiles.length === 0) {
        throw new Error('No files selected for upload');
      }

      // Log all files for debugging
      console.log('All scanned files:', scannedFiles);

      // Filter out clearly problematic files
      const validFiles = scannedFiles.filter(file => {
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

        // Keep all other files
        return true;
      });

      // Log valid files for debugging
      console.log('Valid files after filtering:', validFiles);

      // If no valid files remain, show a message and exit
      if (validFiles.length === 0) {
        const allFileNames = scannedFiles.map(f => f.name).join(', ');
        alert(`No valid files to upload. Folder may be empty or contain only system files.\n\nFiles detected: ${allFileNames || 'None'}`);
        setUploadingFiles(null);
        setIsDirectoryUpload(false);
        return;
      }

      // Set uploading files state to show progress widget (only valid files)
      // Convert scanned files to File-like objects for the progress widget
      const fileLikeObjects = validFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: '', // We don't have type info from native scanning
      }));
      setUploadingFiles(fileLikeObjects as any);

      // Import the API utilities
      const { getApiBaseUrl, fetchWithTimeout } = await import('@/lib/api');

      // Collect all unique folder paths
      const folderPaths = new Set<string>();

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        if (file.relativePath) {
          // Extract the directory path from the relative path
          const pathParts = file.relativePath.split('/');
          if (pathParts.length > 1) {
            // Remove the filename (last part)
            const folderPathParts = pathParts.slice(0, -1);
            // Create full path by joining with current path
            const fullPath = `${currentPathStr}/${folderPathParts.join('/')}`;
            folderPaths.add(fullPath);
          }
        }
      }

      // Log folder paths for debugging
      console.log('Folder paths to create:', Array.from(folderPaths));

      // Create all folder paths
      const baseUrl = getApiBaseUrl();
      const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';

      for (const folderPath of Array.from(folderPaths)) {
        try {
          await fetchWithTimeout(`${apiUrl}/folders/create-path`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              fullPath: folderPath,
            }),
          }).catch(err => {
            // Ignore errors for folder creation - it might already exist
            console.log(`Folder path ${folderPath} might already exist`);
          });
        } catch (err) {
          console.log('Error creating folder path (might already exist):', err);
        }
      }

      // Upload each valid file
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];

        console.log('Uploading file:', file.name, 'size:', file.size);

        // Determine the target path for this file
        let targetPath = currentPathStr;

        // If this file has a relative path, we need to create the folder structure
        if (file.relativePath) {
          // Extract the directory path from the relative path
          const pathParts = file.relativePath.split('/');
          if (pathParts.length > 1) {
            // Remove the filename (last part)
            const folderPathParts = pathParts.slice(0, -1);
            // Join with the current path
            targetPath = `${currentPathStr}/${folderPathParts.join('/')}`;
          }
        }

        // Read the file content using Tauri fs
        const fs = await import('@tauri-apps/plugin-fs');
        // Try to read as binary first for proper file handling
        let fileContent: ArrayBuffer | string;
        try {
          // Use readFile with Uint8Array to get binary data
          fileContent = await fs.readFile(file.path);
        } catch (binaryError) {
          // Fallback to text reading
          console.warn('Failed to read as binary, trying text:', binaryError);
          fileContent = await fs.readTextFile(file.path);
        }
        
        // Create a Blob from the file content
        const blob = new Blob([fileContent]);
        
        // Create FormData
        const formData = new FormData();
        formData.append('file', blob, file.name);

        const baseUrl = getApiBaseUrl();
        const apiUrl = baseUrl ? `${baseUrl}/api/files/upload` : '/api/files/upload';

        // Use fetchWithTimeout to ensure proper auth header handling in Tauri
        // Properly encode the path parameter
        const encodedPath = encodeURIComponent(targetPath);
        console.log('Encoded path for upload:', encodedPath);

        const response = await fetchWithTimeout(`${apiUrl}?path=${encodedPath}`, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Upload failed with status:', response.status, 'and data:', errorData);

          // Try to get more detailed error information
          let errorMessage = `Failed to upload file: ${response.status} ${response.statusText}`;
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.errors) {
            // Handle validation errors
            errorMessage = 'Validation error: ' + JSON.stringify(errorData.errors);
          }

          throw new Error(errorMessage);
        }

        // Get the uploaded file data
        const result = await response.json();

        // Create a FileItem from the response
        const uploadedFile = {
          id: result.file.id,
          file_unique_id: result.file.file_unique_id,
          name: result.file.file_name,
          type: 'file',
          icon: '', // Will be set by the getFileIcon function
          extension: result.file.file_name?.split('.').pop(),
          size: result.file.file_size,
          fileType: result.file.file_type,
          thumbnail: result.file.thumbnail,
          file_path: result.file.file_path,
          modified: result.file.modified,
        } as FileItem;

        // Don't add the uploaded file to the grid immediately
        // Instead, let the progress widget onComplete handler refresh the file list
        // when the progress reaches 100%
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error.message || 'Unknown error'}`);
      // Hide progress widget on error
      setUploadingFiles(null);
      setIsDirectoryUpload(false);
    }
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
            handleFileUpload(e.target.files, false);
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
        {...({ webkitdirectory: "" } as any)} // TypeScript workaround with proper typing
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setIsDirectoryUpload(true);
            handleFileUpload(e.target.files, true);
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
        className={`flex-1 overflow-y-auto p-4 ${isDragOver ? 'bg-blue-50 border-2 border-dashed border-blue-500 rounded-lg' : ''}`}
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
        {isDragOver && (
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