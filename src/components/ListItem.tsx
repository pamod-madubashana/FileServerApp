import React from 'react';
import { FileItem } from './types';
import { RenameInput } from './RenameInput'; // Add this import
import { Folder, FileText, Image as ImageIcon, FileArchive, Film, Music, Mic } from 'lucide-react';
import { Thumbnail } from './Thumbnail';
import { useBatchThumbnailLoader } from '@/hooks/useBatchThumbnailLoader';

interface ListItemProps {
  item: FileItem;
  index: number;
  isRenaming: boolean;
  isDragging: boolean;
  isCut: boolean;
  draggedItem: FileItem | null;
  onContextMenu: (e: React.MouseEvent, item: FileItem, index: number) => void;
  onDragStart: (e: React.DragEvent, item: FileItem) => void;
  onDragEnd: () => void;
  onItemDragOver?: (e: React.DragEvent, item: FileItem) => void;
  onItemDrop?: (e: React.DragEvent, item: FileItem) => void;
  onItemClick: (item: FileItem) => void;
  onRenameConfirm: (newName: string) => void;
  onRenameCancel: () => void;
  formatFileSize: (bytes: number) => string;
}

export const ListItem: React.FC<ListItemProps> = ({
  item,
  index,
  isRenaming,
  isDragging,
  isCut,
  draggedItem,
  onContextMenu,
  onDragStart,
  onDragEnd,
  onItemDragOver,
  onItemDrop,
  onItemClick,
  onRenameConfirm,
  onRenameCancel,
  formatFileSize
}) => {
  const { loadedThumbnails, loadingStates } = useBatchThumbnailLoader([item]);

  // Get appropriate icon based on file type
  const getListItemIcon = () => {
    if (item.type === "folder") {
      return <Folder className="w-5 h-5 text-primary" />;
    }

    // Use thumbnail if available
    if (item.thumbnail) {
      const thumbnailData = loadedThumbnails[item.thumbnail];
      const loadingState = loadingStates[item.thumbnail];
      return <Thumbnail item={item} size="sm" thumbnailSrc={thumbnailData} loadingState={loadingState} />;
    }

    // Fallback to file type icons
    switch (item.fileType) {
      case "photo":
        return <ImageIcon className="w-5 h-5 text-primary" />;
      case "video":
        return <Film className="w-5 h-5 text-primary" />;
      case "audio":
        return <Music className="w-5 h-5 text-primary" />;
      case "voice":
        return <Mic className="w-5 h-5 text-primary" />;
      case "document":
        // Check if it's a zip/rar archive
        if (item.extension && ['zip', 'rar', '7z'].includes(item.extension.toLowerCase())) {
          return <FileArchive className="w-5 h-5 text-primary" />;
        }
        return <FileText className="w-5 h-5 text-primary" />;
      default:
        // Check if it's a zip/rar archive
        if (item.extension && ['zip', 'rar', '7z'].includes(item.extension.toLowerCase())) {
          return <FileArchive className="w-5 h-5 text-primary" />;
        }
        return <FileText className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div
      key={index}
      draggable={!isRenaming}
      onDragStart={(e) => onDragStart(e, item)}
      onDragEnd={onDragEnd}
      onDragOver={item.type === "folder" ? (e) => onItemDragOver?.(e, item) : undefined}
      onDrop={item.type === "folder" ? (e) => onItemDrop?.(e, item) : undefined}
      onContextMenu={(e) => !isRenaming && onContextMenu(e, item, index)}
      className={`transition-all duration-200 hover:shadow-md active:scale-[0.98] ${isDragging ? "opacity-50" : ""} 
        ${isCut ? "opacity-50" : ""} // Apply fade effect to cut items
        ${item.type === "folder" && draggedItem && draggedItem.name !== item.name
        ? "scale-105 transition-all duration-200"
        : ""
        }`}
    >
      <button
        onClick={() => !isRenaming && onItemClick(item)}
        className="col-span-12 w-full grid grid-cols-12 gap-4 p-1.5 rounded transition-all duration-200 group hover:bg-accent/50 active:scale-[0.995]"
      >
        <div className="col-span-5 flex items-center gap-3">
          <div className="flex-shrink-0 w-5 h-5">{getListItemIcon()}</div>
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
};