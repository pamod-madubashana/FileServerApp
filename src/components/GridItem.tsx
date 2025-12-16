import React from 'react';
import { FileItem } from './types';
import { RenameInput } from './RenameInput';
import { Folder } from 'lucide-react';
import { Thumbnail } from './Thumbnail';
import { 
  useResponsiveGrid, 
  getGridItemClassNames, 
  getFileNameClassNames, 
  getItemIconClasses 
} from '@/hooks/useResponsiveGrid';
import { useBatchThumbnailLoader } from '@/hooks/useBatchThumbnailLoader';

interface GridItemProps {
  item: FileItem;
  index: number;
  viewMode: 'grid' | 'list';
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
}

export const GridItem: React.FC<GridItemProps> = ({
  item,
  index,
  viewMode,
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
  onRenameCancel
}) => {
  const gridConfig = useResponsiveGrid();
  const { loadedThumbnails, loadingStates } = useBatchThumbnailLoader([item]);

  const getFileIcon = () => {
    // For folders, use the Folder icon directly
    if (item.type === "folder") {
      // Use responsive size based on view mode
      const folderIconSize = getItemIconClasses(gridConfig, 'folder', viewMode);
      return <Folder className={`${folderIconSize} text-primary`} />;
    }
    
    // Use the new Thumbnail component with pre-loaded data for better performance
    const thumbnailData = item.thumbnail ? loadedThumbnails[item.thumbnail] : undefined;
    const loadingState = item.thumbnail ? loadingStates[item.thumbnail] : undefined;
    
    // Use responsive size based on view mode
    const thumbnailSize = viewMode === 'list' ? 'sm' : 'md';
    return <Thumbnail item={item} size={thumbnailSize} thumbnailSrc={thumbnailData} loadingState={loadingState} />;
  };

  return (
    <div
      key={index}
      draggable={!isRenaming}
      onDragStart={(e) => onDragStart(e, item)}
      onDragEnd={onDragEnd}
      onDragOver={item.type === "folder" ? (e) => onItemDragOver?.(e, item) : undefined}
      onDrop={item.type === "folder" ? (e) => onItemDrop?.(e, item) : undefined}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // Additional prevention of default context menu
        e.nativeEvent.preventDefault();
        !isRenaming && onContextMenu(e, item, index);
      }}
      className={getGridItemClassNames(gridConfig, `${isDragging ? "opacity-50 scale-95" : ""}
        ${isCut ? "opacity-50" : ""} // Apply fade effect to cut items
        ${item.type === "folder" && draggedItem && draggedItem.name !== item.name
          ? "scale-105 transition-all duration-200"
          : ""
        }`)}
    >
      <button
        onClick={() => !isRenaming && onItemClick(item)}
        className="flex flex-col items-center w-full hover:bg-accent rounded-md p-1.5 transition-all duration-200 group hover:scale-[1.02] active:scale-[0.98]"
      >
        <div className="mb-1">{getFileIcon()}</div>
        {isRenaming ? (
          <RenameInput
            initialName={item.name}
            onSave={onRenameConfirm}
            onCancel={onRenameCancel}
          />
        ) : (
          <span className={getFileNameClassNames(gridConfig)}>
            {item.name}
          </span>
        )}
      </button>
    </div>
  );
};