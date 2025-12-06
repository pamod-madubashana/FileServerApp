import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "react-router-dom";
import { FileItem } from "@/components/types";
import { ContextMenu } from "./ContextMenu";
import { useFiles } from "@/hooks/useFiles";
import { useFileOperations } from "@/hooks/useFileOperations";
import { toast } from "sonner";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { FileGrid } from "./FileGrid";
import { DeleteDialog } from "./DeleteDialog";
import { NewFolderDialog } from "./NewFolderDialog";
import { RenameInput } from "./RenameInput";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { ProfileContent } from "./ProfileContent";
import { SettingsContent } from "./SettingsContent";
import { UserManagementContent } from "./UserManagementContent";
import { getApiBaseUrl, resetApiBaseUrl, updateApiBaseUrl, fetchWithTimeout } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import logger from "@/lib/logger";
import { X as XIcon } from "lucide-react";
import DownloadQueue from "./DownloadQueue";
import { downloadManager } from "@/lib/downloadManager";
import { motion, AnimatePresence } from "framer-motion";

export const FileExplorer = () => {
  const location = useLocation();
  const { path } = useParams();

  // Initialize currentPath from URL or localStorage or default to ["Home"]
  const [currentPath, setCurrentPath] = useState<string[]>(() => {
    // First check if we have a path in the URL
    if (location.pathname && location.pathname !== "/") {
      // Split the path and filter out empty segments
      const pathSegments = location.pathname.split('/').filter(segment => segment.length > 0);
      if (pathSegments.length > 0) {
        // Decode each segment to handle URL encoding (e.g., %20 for spaces)
        const decodedSegments = pathSegments.map(segment => decodeURIComponent(segment));
        // If the first segment is not "Home", add it
        if (decodedSegments[0] !== "Home") {
          return ["Home", ...decodedSegments];
        }
        return decodedSegments;
      }
    }
    
    // Fallback to localStorage or default
    const savedPath = localStorage.getItem('fileExplorerPath');
    if (savedPath) {
      try {
        const parsedPath = JSON.parse(savedPath);
        if (Array.isArray(parsedPath)) {
          return parsedPath;
        }
      } catch (e) {
        logger.error('Failed to parse saved path', e);
      }
    }
    return ["Home"];
  });
  
  const [showProfile, setShowProfile] = useState(false); // State to track if profile should be shown
  const [showSettings, setShowSettings] = useState(false); // State to track if settings should be shown
  const [showUserManagement, setShowUserManagement] = useState(false); // State to track if user management should be shown
  const [showDownloadQueue, setShowDownloadQueue] = useState(false); // State to track if download queue should be shown
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null); // Timer for auto-closing widget
  const downloadWidgetRef = useRef<HTMLDivElement>(null); // Ref for download widget
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ item: FileItem; index: number } | null>(null);
  const [renamingItem, setRenamingItem] = useState<{ item: FileItem; index: number } | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [newBackendUrl, setNewBackendUrl] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemType: "file" | "folder" | "empty"; itemName: string; item?: FileItem; index?: number } | null>(null);  const queryClient = useQueryClient();

  // Handle clicks outside the download widget to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDownloadQueue && downloadWidgetRef.current && !downloadWidgetRef.current.contains(event.target as Node)) {
        setShowDownloadQueue(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDownloadQueue]);

  // Auto-close widget after 5 seconds when a download starts
  useEffect(() => {
    // Subscribe to download manager to detect when downloads start
    const unsubscribe = downloadManager.subscribe((downloads) => {
      const hasActiveDownloads = downloads.some(d => d.status === 'downloading' || d.status === 'queued');
      
      if (hasActiveDownloads && !showDownloadQueue) {
        // Open the widget when a download starts
        setShowDownloadQueue(true);
        
        // Clear any existing timer
        if (autoCloseTimer) {
          clearTimeout(autoCloseTimer);
          setAutoCloseTimer(null);
        }
        
        // Set timer to close the widget after 5 seconds
        const timer = setTimeout(() => {
          setShowDownloadQueue(false);
          setAutoCloseTimer(null);
        }, 5000);
        
        setAutoCloseTimer(timer);
      }
    });

    return () => {
      unsubscribe();
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
      }
    };
  }, [showDownloadQueue, autoCloseTimer]);

  // Save currentPath to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('fileExplorerPath', JSON.stringify(currentPath));
  }, [currentPath]);

  // Update browser history when currentPath changes
  useEffect(() => {
    // Update the browser history with the new path
    const pathString = currentPath.length === 1 && currentPath[0] === "Home" 
      ? "/" 
      : "/" + currentPath.slice(1).map(segment => encodeURIComponent(segment)).join('/');
    
    // Use replaceState for the initial load to avoid creating extra history entries
    if (window.history.state === null) {
      window.history.replaceState({ path: currentPath }, '', pathString);
    } else {
      window.history.pushState({ path: currentPath }, '', pathString);
    }
  }, [currentPath]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.path) {
        setCurrentPath(event.state.path);
      } else {
        // Parse the path from the URL
        const pathSegments = window.location.pathname.split('/').filter(segment => segment.length > 0);
        if (pathSegments.length === 0) {
          setCurrentPath(["Home"]);
        } else {
          // Decode each segment to handle URL encoding (e.g., %20 for spaces)
          const decodedSegments = pathSegments.map(segment => decodeURIComponent(segment));
          setCurrentPath(decodedSegments);
        }
      }
      
      // Also check if we should show profile, settings, or user management based on the new location
      if (window.location.pathname === '/profile') {
        setShowProfile(true);
        setShowSettings(false);
        setShowUserManagement(false);
      } else if (window.location.pathname === '/settings') {
        setShowSettings(true);
        setShowProfile(false);
        setShowUserManagement(false);
      } else if (window.location.pathname === '/users') {
        setShowUserManagement(true);
        setShowProfile(false);
        setShowSettings(false);
      } else {
        setShowProfile(false);
        setShowSettings(false);
        setShowUserManagement(false);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Log when the component mounts
  useEffect(() => {
    logger.info("FileExplorer component mounted", { currentPath, location: window.location.pathname });
  }, []);

  // Check current route and show appropriate content on mount
  useEffect(() => {
    if (location.pathname === '/profile') {
      setShowProfile(true);
      setShowSettings(false);
      setShowUserManagement(false);
    } else if (location.pathname === '/settings') {
      setShowSettings(true);
      setShowProfile(false);
      setShowUserManagement(false);
    } else if (location.pathname === '/users') {
      setShowUserManagement(true);
      setShowProfile(false);
      setShowSettings(false);
    } else {
      setShowProfile(false);
      setShowSettings(false);
      setShowUserManagement(false);
    }
  }, [location.pathname]);

  // Listen for showProfile event
  useEffect(() => {
    const handleShowProfile = () => {
      setShowProfile(true);
      setShowSettings(false);
      setShowUserManagement(false);
    };

    window.addEventListener('showProfile', handleShowProfile);
    return () => {
      window.removeEventListener('showProfile', handleShowProfile);
    };
  }, []);

  // Listen for showSettings event
  useEffect(() => {
    const handleShowSettings = () => {
      setShowSettings(true);
      setShowProfile(false);
      setShowUserManagement(false);
    };

    window.addEventListener('showSettings', handleShowSettings);
    return () => {
      window.removeEventListener('showSettings', handleShowSettings);
    };
  }, []);

  // Listen for showUsers event
  useEffect(() => {
    const handleShowUsers = () => {
      setShowUserManagement(true);
      setShowProfile(false);
      setShowSettings(false);
    };

    window.addEventListener('showUsers', handleShowUsers);
    return () => {
      window.removeEventListener('showUsers', handleShowUsers);
    };
  }, []);

  // Listen for showFiles event (when closing profile/settings/user management)
  useEffect(() => {
    const handleShowFiles = () => {
      setShowProfile(false);
      setShowSettings(false);
      setShowUserManagement(false);
      
      // Reset currentPath to Home when returning to file view
      setCurrentPath(["Home"]);
      
      // Close navigation sidebar when returning to file view
      const event = new CustomEvent('toggleNavigationSidebar', { detail: { action: 'close' } });
      window.dispatchEvent(event);
    };

    window.addEventListener('showFiles', handleShowFiles);
    return () => {
      window.removeEventListener('showFiles', handleShowFiles);
    };
  }, []);

  // Define virtual folders
  const virtualFolders: FileItem[] = [
    { name: "Images", type: "folder", icon: "📁", fileType: "photo" },
    { name: "Documents", type: "folder", icon: "📁", fileType: "document" },
    { name: "Videos", type: "folder", icon: "📁", fileType: "video" },
    { name: "Audio", type: "folder", icon: "📁", fileType: "audio" },
    { name: "Voice Messages", type: "folder", icon: "📁", fileType: "voice" },
  ];

  // Current folder name (last part of currentPath)
  const currentFolder = currentPath[currentPath.length - 1] || "Home";

  // Check if current folder is a virtual folder
  const isVirtualFolder = virtualFolders.some(f => f.name === currentFolder);

  // Convert currentPath to API path format
  // For virtual folders, we need to construct the proper path like /Home/Images
  // But for the actual API calls, we need to construct the proper path
  const currentApiPath = isVirtualFolder
    ? `/${currentPath.join('/')}`  // This will create paths like /Home/Images
    : currentPath.length === 1 && currentPath[0] === "Home"
      ? "/"
      : `/${currentPath.join('/')}`;  // For user folders, use the full path like /Home/Images/test

  const { files, isLoading, isError, error, refetch } = useFiles(currentApiPath);
  const { clipboard, copyItem, cutItem, clearClipboard, hasClipboard, isClipboardPasted, pasteItem, moveItem } = useFileOperations();

  // Filter files based on current path and search query
  const getFilteredItems = (): FileItem[] => {
    // If we're in Home and no filter is selected, show virtual folders and user-created folders
    if (currentFolder === "Home" && selectedFilter === "all") {
      const filteredFolders = virtualFolders.filter((folder) =>
        folder.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Add user-created folders (those with type 'folder')
      const userFolders = files.filter((f) => f.type === "folder");
      const filteredUserFolders = userFolders.filter((folder) =>
        folder.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      return [...filteredFolders, ...filteredUserFolders];
    }

    // If we're in a specific folder or have a filter, show files
    let filteredFiles = files;

    // Filter by folder/type
    if (currentFolder === "Images" || selectedFilter === "photo") {
      // For virtual folders, show only files with the exact path
      if (currentApiPath.startsWith("/Home/")) {
        filteredFiles = files.filter((f) => 
          (f.fileType === "photo" && f.file_path === currentApiPath) || 
          (f.type === "folder" && f.file_path === currentApiPath)
        );
      } else {
        // Fallback to original logic for safety
        filteredFiles = files.filter((f) => f.fileType === "photo" || f.type === "folder");
      }
    } else if (currentFolder === "Documents" || selectedFilter === "document") {
      // For virtual folders, show only files with the exact path
      if (currentApiPath.startsWith("/Home/")) {
        filteredFiles = files.filter((f) => 
          (f.fileType === "document" && f.file_path === currentApiPath) || 
          (f.type === "folder" && f.file_path === currentApiPath)
        );
      } else {
        // Fallback to original logic for safety
        filteredFiles = files.filter((f) => f.fileType === "document" || f.type === "folder");
      }
    } else if (currentFolder === "Videos" || selectedFilter === "video") {
      // For virtual folders, show only files with the exact path
      if (currentApiPath.startsWith("/Home/")) {
        filteredFiles = files.filter((f) => 
          (f.fileType === "video" && f.file_path === currentApiPath) || 
          (f.type === "folder" && f.file_path === currentApiPath)
        );
      } else {
        // Fallback to original logic for safety
        filteredFiles = files.filter((f) => f.fileType === "video" || f.type === "folder");
      }
    } else if (currentFolder === "Audio" || selectedFilter === "audio") {
      // For virtual folders, show only files with the exact path
      if (currentApiPath.startsWith("/Home/")) {
        filteredFiles = files.filter((f) => 
          (f.fileType === "audio" && f.file_path === currentApiPath) || 
          (f.type === "folder" && f.file_path === currentApiPath)
        );
      } else {
        // Fallback to original logic for safety
        filteredFiles = files.filter((f) => f.fileType === "audio" || f.type === "folder");
      }
    } else if (currentFolder === "Voice Messages" || selectedFilter === "voice") {
      // For virtual folders, show only files with the exact path
      if (currentApiPath.startsWith("/Home/")) {
        filteredFiles = files.filter((f) => 
          (f.fileType === "voice" && f.file_path === currentApiPath) || 
          (f.type === "folder" && f.file_path === currentApiPath)
        );
      } else {
        // Fallback to original logic for safety
        filteredFiles = files.filter((f) => f.fileType === "voice" || f.type === "folder");
      }
    } else if (currentFolder !== "Home") {
      // For user-created folders, we just show the files returned by the API
      // The API already filters by path, so we don't need to filter here
      filteredFiles = files;
    }

    // Apply search filter
    if (searchQuery) {
      filteredFiles = filteredFiles.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filteredFiles;
  };

  const filteredItems = getFilteredItems();

  const handleNavigate = (folderName: string) => {
    // Navigate into virtual folders OR user-created folders
    const isVirtualFolder = virtualFolders.some(f => f.name === folderName);
    const isUserFolder = files.some(f => f.type === "folder" && f.name === folderName);

    if (isVirtualFolder || isUserFolder) {
      setCurrentPath([...currentPath, folderName]);
      setSelectedFilter("all"); // Reset filter when navigating
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === 0) {
      // If clicking on Home, explicitly set to Home
      setCurrentPath(["Home"]);
    } else {
      setCurrentPath(currentPath.slice(0, index + 1));
    }
  };

  const handleCopy = (item: FileItem) => {
    // Construct the source path correctly
    let sourcePath = "/";
    if (currentPath.length > 1) {
      // For all folder types, we construct the path consistently
      sourcePath = `/${currentPath.join('/')}`;
    }
    copyItem(item, sourcePath);
    toast.success(`Copied "${item.name}"`);
  };

  const handleCut = (item: FileItem) => {
    // Construct the source path correctly
    let sourcePath = "/";
    if (currentPath.length > 1) {
      // For all folder types, we construct the path consistently
      sourcePath = `/${currentPath.join('/')}`;
    }
    cutItem(item, sourcePath);
    toast.success(`Cut "${item.name}"`);
  };

  const handlePaste = async () => {
    try {
      // Construct the target path
      let targetPath = "/";
      if (currentPath.length > 1) {
        // For all folder types, we construct the path consistently
        targetPath = `/${currentPath.join('/')}`;
      }
      
      await pasteItem(targetPath);
      toast.success("Operation completed successfully");
      // Refresh current location after paste
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to complete operation");
    }
  };

  const handleFilterChange = (filter: string) => {
    // Map filter to folder name
    const folderMap: Record<string, string> = {
      all: "Home",
      photo: "Images",
      document: "Documents",
      video: "Videos",
      audio: "Audio",
      voice: "Voice Messages"
    };
    
    const folderName = folderMap[filter] || "Home";
    // For virtual folders, we need to include the full path
    if (folderName !== "Home") {
      setCurrentPath(["Home", folderName]);
    } else {
      setCurrentPath([folderName]);
    }
    setSelectedFilter(filter);
  };

  const handleSidebarDrop = async (item: FileItem, targetFolderName: string) => {
    try {
      // Construct the source path correctly
      let sourcePath = "/";
      if (currentPath.length > 1) {
        // For all folder types, we construct the path consistently
        sourcePath = `/${currentPath.join('/')}`;
      }
      
      // Construct the target path
      let targetPath = "/";
      if (targetFolderName !== "Home") {
        // Map virtual folder names to their API paths
        const virtualFolderMap: Record<string, string> = {
          "Images": "/Home/Images",
          "Documents": "/Home/Documents",
          "Videos": "/Home/Videos",
          "Audio": "/Home/Audio",
          "Voice Messages": "/Home/Voice Messages"
        };
        
        targetPath = virtualFolderMap[targetFolderName] || `/${targetFolderName}`;
      }
      
      const baseUrl = getApiBaseUrl();
      // For the default case, we need to append /api to the base URL
      const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
      
      const response = await fetchWithTimeout(`${apiUrl}/files/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Add this to include cookies for authentication
        body: JSON.stringify({
          file_id: item.id,  // Use file_id instead of file_path
          target_path: targetPath,
        }),
      }, 3000); // 3 second timeout

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to move file");
      }

      toast.success(`Moved "${item.name}" to ${targetFolderName}`);
      // Refresh current location after drag and drop
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to move file");
    }
  };

  const handleNewFolder = async (folderName: string) => {
    try {
      // Construct the correct path for the backend
      let backendPath = "/";
      if (currentPath.length > 1) {
        // For all folder types, we construct the path consistently
        backendPath = `/${currentPath.join('/')}`;
      }
      
      const baseUrl = getApiBaseUrl();
      // For the default case, we need to append /api to the base URL
      const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
      
      const response = await fetchWithTimeout(`${apiUrl}/folders/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Add this to include cookies for authentication
        body: JSON.stringify({
          folderName,
          currentPath: backendPath,
        }),
      }, 3000); // 3 second timeout

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create folder");
      }

      toast.success(`Folder "${folderName}" created successfully`);
      setNewFolderDialogOpen(false);
      // Refresh current location after creating folder
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to create folder");
    }
  };

  // Show error state with recovery options
  useEffect(() => {
    if (isError) {
      const currentUrl = getApiBaseUrl();
      setErrorMessage(`Failed to connect to backend server at ${currentUrl}. Please check the URL and try again.`);
      setNewBackendUrl(currentUrl); // Pre-fill with current URL
      setErrorDialogOpen(true);
    }
  }, [isError]);

  const handleUrlChange = () => {
    // Validate and update the backend URL
    try {
      // Allow "/" as a special case for same-origin requests
      if (newBackendUrl === "/") {
        updateApiBaseUrl("/");
        window.location.reload();
        return;
      }
      
      // For full URLs, validate the format
      new URL(newBackendUrl);
      updateApiBaseUrl(newBackendUrl);
      window.location.reload();
    } catch {
      toast.error("Please enter a valid URL (e.g., http://localhost:8000)");
    }
  };

  // Add the missing functions
  const handleDelete = (item: FileItem, index: number) => {
    setDeleteDialog({ item, index });
  };

  const handleRename = (item: FileItem, index: number) => {
    setRenamingItem({ item, index });
  };

  const handleMove = async (item: FileItem, targetFolder: FileItem) => {
    try {
      // Construct the source path correctly
      let sourcePath = "/";
      if (currentPath.length > 1) {
        // For all folder types, we construct the path consistently
        sourcePath = `/${currentPath.join('/')}`;
      }
      
      // Construct the target path based on the target folder
      let targetPath = "/";
      
      // Handle moving to Home (root)
      if (targetFolder.name === "Home") {
        targetPath = "/";
      } 
      // Handle virtual folders
      else if (targetFolder.name === "Images" || 
               targetFolder.name === "Documents" || 
               targetFolder.name === "Videos" || 
               targetFolder.name === "Audio" || 
               targetFolder.name === "Voice Messages") {
        targetPath = `/Home/${targetFolder.name}`;
      }
      // Handle user-created folders
      else {
        // Construct the target path consistently
        if (currentPath.length > 1) {
          // For all cases, we join the currentPath and append the target folder name
          targetPath = `/${currentPath.join('/')}/${targetFolder.name}`;
        } else {
          // We're at root level
          targetPath = `/${targetFolder.name}`;
        }
      }
      
      // Ensure paths are properly formatted
      sourcePath = sourcePath.replace(/\/+/g, '/'); // Remove duplicate slashes
      targetPath = targetPath.replace(/\/+/g, '/'); // Remove duplicate slashes
      
      // Ensure targetPath doesn't end with a slash unless it's the root
      if (targetPath !== "/" && targetPath.endsWith("/")) {
        targetPath = targetPath.slice(0, -1);
      }
      
      await moveItem(item, targetPath, sourcePath);
      toast.success(`Moved "${item.name}" to ${targetFolder.name}`);
      // Refresh current location after move
      refetch();
    } catch (error: any) {
      logger.error("Error moving file", { error, item, targetFolder });
      toast.error(error.message || "Failed to move file");
    }
  };

  const handleDownload = async (item: FileItem) => {
    try {
      const baseUrl = getApiBaseUrl();
      // Construct the download URL - for the new path structure, we just need the file name
      // The backend will handle extracting the file name from paths like /Home/Images/filename.jpg
      const fileName = item.name;
      const downloadUrl = baseUrl 
        ? `${baseUrl}/dl/${fileName}` 
        : `/dl/${fileName}`;
      
      // Add to download manager for tracking - this will automatically start the download
      const downloadId = downloadManager.addDownload(downloadUrl, item.name);
      
      // The download is now handled by the download manager's queue system
      // We don't need to call downloadFile directly
    } catch (error) {
      logger.error("Failed to download file:", error);
      toast.error("Failed to download file");
    }
  };

  const confirmRename = async (newName: string) => {
    if (!renamingItem) return;

    try {
      const item = renamingItem.item;
      
      // Construct the correct path for the backend
      let backendPath = "/";
      if (currentPath.length > 1) {
        // For all folder types, we construct the path consistently
        backendPath = `/${currentPath.join('/')}`;
      }
      
      const baseUrl = getApiBaseUrl();
      // For the default case, we need to append /api to the base URL
      const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
      
      const response = await fetchWithTimeout(`${apiUrl}/files/rename`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Add this to include cookies for authentication
        body: JSON.stringify({
          file_id: item.id,  // Use file_id instead of file_path
          new_name: newName,
        }),
      }, 3000); // 3 second timeout

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to rename file");
      }

      toast.success(`Renamed "${item.name}" to "${newName}"`);
      setRenamingItem(null);
      // Refresh current location after renaming file
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to rename file");
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog) return;

    try {
      const item = deleteDialog.item;
      
      // Construct the correct path for the backend
      let backendPath = "/";
      if (currentPath.length > 1) {
        // For all folder types, we construct the path consistently
        backendPath = `/${currentPath.join('/')}`;
      }
      
      const baseUrl = getApiBaseUrl();
      // For the default case, we need to append /api to the base URL
      const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
      
      const response = await fetchWithTimeout(`${apiUrl}/files/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Add this to include cookies for authentication
        body: JSON.stringify({
          file_id: item.id,  // Use file_id instead of file_path
        }),
      }, 3000); // 3 second timeout

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete file");
      }

      toast.success(`Deleted "${item.name}"`);
      setDeleteDialog(null);
      // Refresh current location after deleting file
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete file");
    }
  };

  const cancelDelete = () => {
    setDeleteDialog(null);
  };

  // Determine the selected filter based on the current path
  useEffect(() => {
    // Map folder name to filter
    const folderMap: Record<string, string> = {
      "Home": "all",
      "Images": "photo",
      "Documents": "document",
      "Videos": "video",
      "Audio": "audio",
      "Voice Messages": "voice"
    };
    
    // If we're in a virtual folder, select the corresponding filter
    const currentFolderName = currentPath[currentPath.length - 1];
    const filter = folderMap[currentFolderName] || "all";
    
    // Only update if it's different to prevent infinite loops
    if (selectedFilter !== filter) {
      setSelectedFilter(filter);
    }
  }, [currentPath, selectedFilter]);

  return (
    <div className="flex h-screen bg-background text-foreground select-none">
      <Sidebar
        currentPath={currentPath}
        onNavigate={handleFilterChange}
        onDrop={handleSidebarDrop}
        files={files}
        selectedFilter={selectedFilter}
      />

      <div className="flex-1 flex flex-col">
        {showProfile ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            <ProfileContent onBack={() => setShowProfile(false)} />
          </motion.div>
        ) : showSettings ? (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            <SettingsContent onBack={() => setShowSettings(false)} />
          </motion.div>
        ) : showUserManagement ? (
          <motion.div
            key="user-management"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            <UserManagementContent onBack={() => {
              setShowUserManagement(false);
              // Dispatch event to show files
              const event = new CustomEvent('showFiles');
              window.dispatchEvent(event);
            }} />
          </motion.div>
        ) : (
          <div className="flex-1 flex flex-col">
            <TopBar
              currentPath={currentPath}
              searchQuery={searchQuery}
              viewMode={viewMode}
              onSearchChange={setSearchQuery}
              onViewModeChange={setViewMode}
              onBack={() => window.history.back()}
              onRefresh={refetch}
              onBreadcrumbClick={handleBreadcrumbClick}
              onPaste={hasClipboard && !isClipboardPasted() ? handlePaste : undefined}
              onToggleDownloadQueue={() => setShowDownloadQueue(!showDownloadQueue)} // Add this prop
              onToggleSidebar={() => {
                // Dispatch event to toggle sidebar
                const event = new CustomEvent('toggleNavigationSidebar');
                window.dispatchEvent(event);
              }}
            />

            <FileGrid
              items={filteredItems}
              viewMode={viewMode}
              onNavigate={handleNavigate}
              itemCount={filteredItems.length}
              onCopy={handleCopy}
              onCut={handleCut}
              onPaste={hasClipboard && !isClipboardPasted() ? handlePaste : undefined}
              onDelete={handleDelete}
              onRename={handleRename}
              onMove={handleMove}
              onDownload={handleDownload}
              renamingItem={renamingItem}
              onRenameConfirm={confirmRename}
              onRenameCancel={() => setRenamingItem(null)}
              currentFolder={currentFolder}
              onNewFolder={() => setNewFolderDialogOpen(true)}
              isLoading={isLoading}
              cutItem={clipboard?.operation === "cut" && !isClipboardPasted() ? clipboard.item : null}
              hasClipboard={hasClipboard}
              isClipboardPasted={isClipboardPasted()}
            />
          </div>
        )}
      </div>

      {/* Download Queue Widget - Show when showDownloadQueue is true */}
      {showDownloadQueue && (
        <div 
          ref={downloadWidgetRef}
          className="fixed top-28 right-4 z-50 mt-2"
        >
          <Card className="w-80 shadow-xl">
            <CardContent className="p-0">
              <DownloadQueue 
                isOpen={true}
                onToggle={() => setShowDownloadQueue(false)}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteDialog}
        itemName={deleteDialog?.item.name || ""}
        itemType={deleteDialog?.item.type || "file"}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <NewFolderDialog
        open={newFolderDialogOpen}
        currentPath={currentApiPath}  // Pass the full path, not just the folder name
        onClose={() => setNewFolderDialogOpen(false)}
        onConfirm={handleNewFolder}
      />

      {/* Custom Error Dialog with URL change option */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connection Error</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {errorMessage || "Failed to connect to the backend server. Please check your connection settings."}
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-backend-url">New Backend URL</Label>
                <Input
                  id="new-backend-url"
                  value={newBackendUrl}
                  onChange={(e) => setNewBackendUrl(e.target.value)}
                  placeholder="https://your-server.com"
                />
              </div>
              <p className="text-sm font-mono bg-muted p-2 rounded">
                Current URL: {getApiBaseUrl()}
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={handleUrlChange}>
                  Change URL and Continue
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetApiBaseUrl();
                    window.location.reload();
                  }}
                >
                  Reset to Default Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setErrorDialogOpen(false);
                    refetch();
                  }}
                >
                  Retry Connection
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Tip: Press Ctrl+Alt+R to reset settings from anywhere
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          itemType={contextMenu.itemType}
          itemName={contextMenu.itemName}
          onCopy={() => contextMenu.item && handleCopy(contextMenu.item)}
          onCut={() => contextMenu.item && handleCut(contextMenu.item)}
          onPaste={hasClipboard && !isClipboardPasted() ? handlePaste : undefined}
          onDelete={() => contextMenu.item && handleDelete(contextMenu.item, contextMenu.index || 0)}
          onRename={() => contextMenu.item && handleRename(contextMenu.item, contextMenu.index || 0)}
          onNewFolder={handleNewFolder ? () => handleNewFolder("New Folder") : undefined}
          onClose={() => setContextMenu(null)}
          isClipboardPasted={isClipboardPasted()} // Pass the clipboard pasted status
          hasClipboard={hasClipboard} // Pass the clipboard status function
        />
      )}
    </div>
  );
};