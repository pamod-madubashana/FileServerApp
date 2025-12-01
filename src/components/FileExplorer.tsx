import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "react-router-dom";
import { FileItem } from "@/components/types";
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
import { getApiBaseUrl, resetApiBaseUrl, updateApiBaseUrl, fetchWithTimeout } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfileOverlay } from "./ProfileOverlay"; // Import ProfileOverlay
import logger from "@/lib/logger";
import { TelegramSidebar } from "./TelegramSidebar";

export const FileExplorer = () => {
  const location = useLocation();
  const { path } = useParams();

  // Initialize currentPath from URL or localStorage or default to ["Home"]
  const [currentPath, setCurrentPath] = useState<string[]>(() => {
    // First check if we have a path in the URL
    if (path) {
      // Split the path and filter out empty segments
      const pathSegments = path.split('/').filter(segment => segment.length > 0);
      if (pathSegments.length > 0) {
        return ["Home", ...pathSegments];
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
  
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ item: FileItem; index: number } | null>(null);
  const [renamingItem, setRenamingItem] = useState<{ item: FileItem; index: number } | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [newBackendUrl, setNewBackendUrl] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false); // State for profile overlay
  const queryClient = useQueryClient();

  // Save currentPath to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('fileExplorerPath', JSON.stringify(currentPath));
  }, [currentPath]);

  // Update browser history when currentPath changes
  useEffect(() => {
    // Update the browser history with the new path
    const pathString = currentPath.length === 1 && currentPath[0] === "Home" 
      ? "/" 
      : "/" + currentPath.slice(1).join('/');
    
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
          setCurrentPath(pathSegments);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Log when the component mounts
  useEffect(() => {
    logger.info("FileExplorer component mounted", { currentPath, location: window.location.pathname });
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
      : `/${currentPath.slice(1).join('/')}`;

  const { files, isLoading, isError, error, refetch } = useFiles(currentApiPath);
  const { clipboard, copyItem, cutItem, clearClipboard, hasClipboard, pasteItem } = useFileOperations();

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
      // Show photos AND folders in the Images path
      filteredFiles = files.filter((f) => f.fileType === "photo" || f.type === "folder");
    } else if (currentFolder === "Documents" || selectedFilter === "document") {
      // Show documents AND folders in the Documents path
      filteredFiles = files.filter((f) => f.fileType === "document" || f.type === "folder");
    } else if (currentFolder === "Videos" || selectedFilter === "video") {
      // Show videos AND folders in the Videos path
      filteredFiles = files.filter((f) => f.fileType === "video" || f.type === "folder");
    } else if (currentFolder === "Audio" || selectedFilter === "audio") {
      // Show audio AND folders in the Audio path
      filteredFiles = files.filter((f) => f.fileType === "audio" || f.type === "folder");
    } else if (currentFolder === "Voice Messages" || selectedFilter === "voice") {
      // Show voice messages AND folders in the Voice Messages path
      filteredFiles = files.filter((f) => f.fileType === "voice" || f.type === "folder");
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

  const handleBack = () => {
    if (currentPath.length > 1) {
      const newPath = [...currentPath];
      newPath.pop();
      setCurrentPath(newPath);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    setCurrentPath(currentPath.slice(0, index + 1));
  };

  const handlePaste = useCallback(async () => {
    if (!hasClipboard) return;

    try {
      await pasteItem(currentApiPath);
      toast.success("Pasted successfully");
      clearClipboard();
      refetch();
    } catch (error) {
      logger.error("Failed to paste item", error);
      toast.error("Failed to paste item");
    }
  }, [hasClipboard, pasteItem, currentApiPath, clearClipboard, refetch]);

  const handleDrop = (item: any, targetFolder: string) => {
    // Handle file drop logic here
    logger.info("File dropped", { item, targetFolder });
  };

  const handleUrlChange = async () => {
    try {
      await updateApiBaseUrl(newBackendUrl);
      setErrorDialogOpen(false);
      setErrorMessage("");
      setNewBackendUrl("");
      // Refresh the file list with the new URL
      refetch();
    } catch (error) {
      logger.error("Failed to update backend URL", error);
      setErrorMessage("Failed to update backend URL. Please check the URL and try again.");
    }
  };

  const handleNewFolder = async (folderName: string) => {
    try {
      const baseUrl = getApiBaseUrl();
      const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
      
      const response = await fetchWithTimeout(`${apiUrl}/files/create-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          folderName: folderName,
          currentPath: currentApiPath
        }),
      }, 5000);

      if (response.ok) {
        toast.success("Folder created successfully");
        refetch();
        setNewFolderDialogOpen(false);
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || "Failed to create folder");
      }
    } catch (error) {
      logger.error("Failed to create folder", error);
      toast.error("Failed to create folder");
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar 
        currentPath={currentPath} 
        onNavigate={handleNavigate}
        onDrop={handleDrop}
        files={files}
        selectedFilter={selectedFilter}
      />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Bar */}
        <TopBar 
          currentPath={currentPath}
          searchQuery={searchQuery}
          viewMode={viewMode}
          onSearchChange={setSearchQuery}
          onViewModeChange={setViewMode}
          onBack={handleBack}
          onBreadcrumbClick={handleBreadcrumbClick}
          onPaste={hasClipboard ? handlePaste : undefined}
        />
        
        {/* File Grid */}
        <div className="flex-1 overflow-auto">
          <FileGrid 
            items={filteredItems}
            isLoading={isLoading}
            isError={isError}
            error={error}
            viewMode={viewMode}
            onNavigate={handleNavigate}
            onItemSelect={(item, index) => {
              if (item.type === "folder") {
                handleNavigate(item.name);
              }
            }}
            onItemDelete={(item, index) => setDeleteDialog({ item, index })}
            onItemRename={(item, index) => setRenamingItem({ item, index })}
            onRefresh={refetch}
          />
        </div>
      </div>
      
      {/* Telegram Sidebar */}
      <TelegramSidebar onProfileClick={() => setIsProfileOpen(true)} />
      
      {/* Profile Overlay */}
      <ProfileOverlay 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />

      {/* Dialogs */}
      <DeleteDialog 
        open={!!deleteDialog}
        onOpenChange={(open) => !open && setDeleteDialog(null)}
        item={deleteDialog?.item}
        onDelete={async () => {
          if (!deleteDialog) return;
          
          try {
            const baseUrl = getApiBaseUrl();
            const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
            
            const response = await fetchWithTimeout(`${apiUrl}/files/delete`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                file_id: deleteDialog.item.id
              }),
            }, 5000);

            if (response.ok) {
              toast.success("Deleted successfully");
              refetch();
            } else {
              const errorData = await response.json();
              toast.error(errorData.detail || "Failed to delete item");
            }
          } catch (error) {
            logger.error("Failed to delete item", error);
            toast.error("Failed to delete item");
          } finally {
            setDeleteDialog(null);
          }
        }}
      />
      
      <NewFolderDialog 
        open={newFolderDialogOpen}
        onOpenChange={setNewFolderDialogOpen}
        onConfirm={handleNewFolder}
      />
      
      <RenameInput 
        item={renamingItem?.item}
        open={!!renamingItem}
        onOpenChange={(open) => !open && setRenamingItem(null)}
        onRename={async (newName) => {
          if (!renamingItem) return;
          
          try {
            const baseUrl = getApiBaseUrl();
            const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
            
            const response = await fetchWithTimeout(`${apiUrl}/files/rename`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                file_id: renamingItem.item.id,
                new_name: newName
              }),
            }, 5000);

            if (response.ok) {
              toast.success("Renamed successfully");
              refetch();
            } else {
              const errorData = await response.json();
              toast.error(errorData.detail || "Failed to rename item");
            }
          } catch (error) {
            logger.error("Failed to rename item", error);
            toast.error("Failed to rename item");
          } finally {
            setRenamingItem(null);
          }
        }}
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
    </div>
  );
};