import { useState, useEffect } from "react";
import { FileItem } from "./types";
import { Folder, FileText, Image as ImageIcon, FileArchive } from "lucide-react";
import { ContextMenu } from "./ContextMenu";
import { RenameInput } from "./RenameInput";
import { ImageViewer } from "./ImageViewer";
import { MediaPlayer } from "./MediaPlayer";
import { Thumbnail } from "./Thumbnail";
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
  onNewFolder?: () => void;
  isLoading?: boolean;
  cutItem?: FileItem | null; // Add prop to track cut item
  hasClipboard?: () => boolean; // Add prop to track if there's clipboard content
  isClipboardPasted?: boolean; // Add prop to track if clipboard item has been pasted
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
  isLoading,
  cutItem, // Destructure the new prop
  hasClipboard, // Destructure the new prop
  isClipboardPasted, // Destructure the new prop
}: FileGridProps) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [draggedItem, setDraggedItem] = useState<FileItem | null>(null);
  const [imageViewer, setImageViewer] = useState<{ url: string; fileName: string } | null>(null);
  const [mediaPlayer, setMediaPlayer] = useState<{
    url: string;
    fileName: string;
    fileType: "video" | "audio" | "voice";
  } | null>(null);

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
          // We don't need to prevent default here since we're just listening
          // The webview will still handle the events normally
        });

        // Listen for Tauri drag over events
        unlistenDragOver = await eventModule.listen('tauri://drag-over', (event: Event<any>) => {
          // We don't need to prevent default here since we're just listening
        });

        // Listen for Tauri drag drop events
        unlistenDragDrop = await eventModule.listen('tauri://drag-drop', (event: Event<any>) => {
          // We don't need to prevent default here since we're just listening
        });

        // Listen for Tauri drag leave events
        unlistenDragLeave = await eventModule.listen('tauri://drag-leave', (event: Event<any>) => {
          // We don't need to prevent default here since we're just listening
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
      const imageUrl = baseUrl 
        ? `${baseUrl}/dl/${encodeURIComponent(item.name)}` 
        : `/dl/${encodeURIComponent(item.name)}`;
      setImageViewer({ url: imageUrl, fileName: item.name });
    } else if ((item.fileType === "video" || item.fileType === "audio" || item.fileType === "voice") && item.file_unique_id) {
      // Always use built-in player (remove external player option)
      console.log("Opening media in built-in player");
      const baseUrl = getApiBaseUrl();
      const mediaUrl = baseUrl 
        ? `${baseUrl}/dl/${encodeURIComponent(item.name)}` 
        : `/dl/${encodeURIComponent(item.name)}`;
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetItem: FileItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || targetItem.type !== "folder" || draggedItem.name === targetItem.name) {
      return;
    }

    // Pass the target item (folder) to onMove instead of just the name
    onMove(draggedItem, targetItem);
    setDraggedItem(null);
  };

  const getFileIcon = (item: FileItem) => {
    // For folders, use the Folder icon directly
    if (item.type === "folder") {
      return <Folder className="w-20 h-20 text-primary" />;
    }
    
    // Use the new Thumbnail component for better error handling
    return <Thumbnail item={item} />;
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
    <div className="flex-1 flex flex-col bg-background select-none">
      <div
        className="flex-1 overflow-y-auto p-4"
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
                  onDragOver={item.type === "folder" ? handleDragOver : undefined}
                  onDrop={item.type === "folder" ? (e) => handleDrop(e, item) : undefined}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Additional prevention of default context menu
                    e.nativeEvent.preventDefault();
                    !isRenaming && handleContextMenu(e, item, index);
                  }}
                  className={`flex flex-col items-center p-3 rounded-lg transition-all ${isDragging ? "opacity-50 scale-95" : ""}
                    ${isCut ? "opacity-50" : ""} // Apply fade effect to cut items
                    ${item.type === "folder" && draggedItem && draggedItem.name !== item.name
                      ? "ring-2 ring-primary ring-offset-2"
                      : ""
                    }`}
                >
                  <button
                    onClick={() => !isRenaming && handleItemClick(item)}
                    className="flex flex-col items-center w-full hover:bg-accent rounded-lg p-2 transition-colors group"
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
          <div className="space-y-1">
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
                  onDragOver={item.type === "folder" ? handleDragOver : undefined}
                  onDrop={item.type === "folder" ? (e) => handleDrop(e, item) : undefined}
                  onContextMenu={(e) => !isRenaming && handleContextMenu(e, item, index)}
                  className={`transition-all ${isDragging ? "opacity-50" : ""} 
                    ${isCut ? "opacity-50" : ""} // Apply fade effect to cut items
                    ${item.type === "folder" && draggedItem && draggedItem.name !== item.name
                    ? "ring-2 ring-primary"
                    : ""
                    }`}
                >
                  <button
                    onClick={() => !isRenaming && handleItemClick(item)}
                    className="w-full flex items-center gap-3 p-2 rounded hover:bg-accent transition-colors group"
                  >
                    <div className="flex-shrink-0">{getFileIcon(item)}</div>
                    {isRenaming ? (
                      <div className="flex-1">
                        <RenameInput
                          initialName={item.name}
                          onSave={onRenameConfirm}
                          onCancel={onRenameCancel}
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-foreground group-hover:text-accent-foreground">
                        {item.name}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
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
          onClose={() => setContextMenu(null)}
          hasClipboard={hasClipboard}
          isClipboardPasted={isClipboardPasted}
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