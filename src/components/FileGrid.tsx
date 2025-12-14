import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, 
  FileText, 
  Image, 
  Video, 
  Music, 
  Mic, 
  MoreHorizontal, 
  Download, 
  Eye,
  Copy,
  Scissors,
  Pencil,
  Share2,
  Trash2,
  Info,
  RefreshCw,
  FolderOpen,
  Clipboard,
  AlertCircle
} from 'lucide-react';
import { FileItem } from '@/types';
import ContextMenu from './ContextMenu';
import ImageViewer from './ImageViewer';
import MediaPlayer from './MediaPlayer';
import DropZone from './DropZone';
import UploadProgressWidget from './UploadProgressWidget';
import TelegramVerificationDialog from './TelegramVerificationDialog';
import IndexChatDialog from './IndexChatDialog';
import CustomErrorDialog from './CustomErrorDialog'; // Import the custom error dialog
import { api } from '@/lib/api';
import { useFileOperations } from '@/hooks/useFileOperations';
import logger from '@/lib/logger';
import { toast } from 'sonner';

interface FileGridProps {
  files: FileItem[];
  viewMode: 'grid' | 'list';
  onItemClick: (item: FileItem) => void;
  onItemDoubleClick: (item: FileItem) => void;
  onContextMenu: (e: React.MouseEvent, item: FileItem, index: number) => void;
  onItemsChange: () => void;
  onRefresh: () => void;
  currentPath: string[];
  currentApiPath: string;
}

const FileGrid: React.FC<FileGridProps> = ({
  files,
  viewMode,
  onItemClick,
  onItemDoubleClick,
  onContextMenu,
  onItemsChange,
  onRefresh,
  currentPath,
  currentApiPath,
}) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    itemType: 'file' | 'folder' | 'empty';
    item?: FileItem;
    index?: number;
  } | null>(null);

  const [draggedItem, setDraggedItem] = useState<FileItem | null>(null);
  const [dropTarget, setDropTarget] = useState<FileItem | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [imageViewer, setImageViewer] = useState<{
    url: string;
    fileName: string;
  } | null>(null);
  const [mediaPlayer, setMediaPlayer] = useState<{
    url: string;
    fileName: string;
    fileType: 'image' | 'video' | 'audio' | 'voice';
  } | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<File[] | null>(null);
  const [isDirectoryUpload, setIsDirectoryUpload] = useState(false);
  const [showTelegramVerificationDialog, setShowTelegramVerificationDialog] = useState(false);
  const [showIndexChatDialog, setShowIndexChatDialog] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    errorType: 'upload' | 'download' | 'network' | 'server' | 'auth' | 'unknown';
  }>({
    isOpen: false,
    title: '',
    message: '',
    errorType: 'unknown'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);

  const { createFolder, deleteItem, renameItem, moveItem, downloadItem } = useFileOperations();

  const handleFileDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragActive(true);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    try {
      const items = e.dataTransfer.items;
      const traversedFiles: TraversedFile[] = [];

      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            traversedFiles.push({
              file,
              fullPath: file.name,
            });
          }
        }
      }

      if (traversedFiles.length > 0) {
        handleFileUpload(traversedFiles);
      }
    } catch (error) {
      console.error('Failed to handle file drop:', error);
    }
  };

  const handleFileUpload = async (traversedFiles: TraversedFile[]) => {
    try {
      // Set uploading state
      setUploadingFiles(traversedFiles.map(tf => tf.file));
      
      // Get current path as string
      const currentPathStr = currentApiPath || (currentPath.length > 0 ? `/${currentPath.join('/')}` : '/');
      
      // Create upload promises for each file
      const uploadPromises = traversedFiles.map(async (traversedFile) => {
        const { file, fullPath } = traversedFile;
        
        if (!(file instanceof File)) {
          throw new Error('Invalid file object');
        }
        
        // For folder uploads, we need to construct the correct path
        let uploadPath = currentPathStr;
        // If we have a full path structure (e.g., "qwes/subfolder/file.txt"), we need to:
        // 1. Extract the folder structure relative to the dropped folder
        // 2. Append it to the current path
        if (fullPath && fullPath.includes('/')) {
          // This preserves the folder structure from the dropped folder
          // For example, if fullPath is "qwes/subfolder/file.txt" and currentPathStr is "/Home/Documents"
          // The final path should be "/Home/Documents/qwes/subfolder" (without the filename)
          
          const pathParts = fullPath.split('/');

          
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
          }
        }        
        
        try {
          // Upload the file
          const result = await api.uploadFile(file, uploadPath);
          return result;
        } catch (error) {
          throw error;
        }
      });
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      
      // Instead of immediately resetting state, let the progress widget handle completion
      // The progress widget will call onComplete which will reset the state

    } catch (error) {
      console.error('Upload error:', error);
      setUploadingFiles(null);
      setIsDirectoryUpload(false);
      
      // Show custom error dialog instead of alerts
      if (error.message && error.message.includes('TELEGRAM_NOT_VERIFIED')) {
        // Show custom Telegram verification dialog
        setShowTelegramVerificationDialog(true);
      } else if (error.message && error.message.includes('User index chat not found')) {
        // Show custom Index Chat dialog
        setShowIndexChatDialog(true);
      } else {
        // Show custom error dialog for other upload errors
        setErrorDialog({
          isOpen: true,
          title: 'Upload Failed',
          message: error.message || 'Failed to upload files. Please try again.',
          errorType: 'upload'
        });
      }
    }
  };

  const handleDownload = async (item: FileItem) => {
    try {
      const url = await downloadItem(item);
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file. Please try again.');
    }
  };

  const handleDoubleClick = (item: FileItem) => {
    if (item.type === 'folder') {
      onItemDoubleClick(item);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: FileItem, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, item, index);
  };

  const getFileIcon = (item: FileItem) => {
    if (item.type === 'folder') {
      return <Folder className="w-10 h-10 text-primary" />;
    }
    if (item.fileType === 'photo') {
      return <Image className="w-10 h-10 text-primary" />;
    }
    if (item.fileType === 'video') {
      return <Video className="w-10 h-10 text-primary" />;
    }
    if (item.fileType === 'audio') {
      return <Music className="w-10 h-10 text-primary" />;
    }
    if (item.fileType === 'voice') {
      return <Mic className="w-10 h-10 text-primary" />;
    }
    return <FileText className="w-10 h-10 text-primary" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div 
      className="flex-1 overflow-auto relative"
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
            // Refresh the file list after upload completes
            onRefresh();
          }}
        />
      )}
      
      {/* Custom Error Dialog */}
      <CustomErrorDialog
        isOpen={errorDialog.isOpen}
        onClose={() => setErrorDialog(prev => ({ ...prev, isOpen: false }))}
        title={errorDialog.title}
        message={errorDialog.message}
        errorType={errorDialog.errorType}
        onRetry={() => {
          // Optionally implement retry logic here
          setErrorDialog(prev => ({ ...prev, isOpen: false }));
        }}
      />
      
      {/* Telegram Verification Dialog */}
      <TelegramVerificationDialog
        isOpen={showTelegramVerificationDialog}
        onClose={() => setShowTelegramVerificationDialog(false)}
      />
      
      {/* Index Chat Dialog */}
      <IndexChatDialog
        isOpen={showIndexChatDialog}
        onClose={() => setShowIndexChatDialog(false)}
      />
      
      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          itemType={contextMenu.itemType}
          onClose={() => setContextMenu(null)}
          onNewFolder={() => {
            // Handle new folder creation
            const newFolderName = prompt('Enter folder name:');
            if (newFolderName) {
              createFolder(newFolderName);
            }
          }}
          onDownload={contextMenu.item ? () => handleDownload(contextMenu.item!) : undefined}
          onUploadFiles={() => fileInputRef.current?.click()}
          onUploadFolder={() => directoryInputRef.current?.click()}
          disableDelete={contextMenu.item ? 
            (contextMenu.item.name === "Images" || 
             contextMenu.item.name === "Documents" || 
             contextMenu.item.name === "Videos" || 
             contextMenu.item.name === "Audio" || 
             contextMenu.item.name === "Voice Messages") && 
            currentPath.length === 1 : false}
        />
      )}
      
      {/* Image Viewer */}
      {imageViewer && (
        <ImageViewer
          url={imageViewer.url}
          fileName={imageViewer.fileName}
          onClose={() => setImageViewer(null)}
        />
      )}
      
      {/* Media Player */}
      {mediaPlayer && (
        <MediaPlayer
          url={mediaPlayer.url}
          fileName={mediaPlayer.fileName}
          fileType={mediaPlayer.fileType}
          onClose={() => setMediaPlayer(null)}
        />
      )}
      
      {/* Drop Zone Overlay */}
      {isDragActive && (
        <DropZone 
          isActive={isDragActive}
          onDrop={handleFileDrop}
        />
      )}
      
      {/* File Grid/List Content */}
      <div className={`p-4 ${viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4' : 'space-y-2'}`}>
        {files.map((item, index) => (
          <motion.div
            key={index}
            className={`relative ${viewMode === 'grid' ? 'flex flex-col items-center p-3 rounded-xl transition-all duration-200 hover:scale-[1.03] hover:shadow-lg active:scale-[0.98]' : 'flex items-center justify-between p-2 rounded-lg transition-all duration-200 hover:bg-accent hover:shadow-lg active:scale-[0.98]'}`}
            draggable={item.type !== 'folder'}
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', JSON.stringify(item));
              setDraggedItem(item);
            }}
            onDragEnd={() => setDraggedItem(null)}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'move';
              setDropTarget(item);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (draggedItem && item.type === 'folder' && draggedItem.name !== item.name) {
                moveItem(draggedItem, item);
              }
              setDraggedItem(null);
              setDropTarget(null);
            }}
            onDoubleClick={() => handleDoubleClick(item)}
            onContextMenu={(e) => handleContextMenu(e, item, index)}
          >
            <button
              className={`flex flex-col items-center w-full hover:bg-accent rounded-lg p-2 transition-all duration-200 group hover:scale-[1.02] active:scale-[0.98]`}
              onClick={() => onItemClick(item)}
            >
              <div className="mb-2">{getFileIcon(item)}</div>
              <span className="text-sm text-center break-words w-full text-foreground group-hover:text-accent-foreground">
                {item.name}
              </span>
            </button>
            {viewMode === 'list' && (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-muted-foreground">
                  {item.modified ? new Date(item.modified).toLocaleDateString() : ''}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {item.type === 'folder' ? 'Folder' : (item.fileType || 'File')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.type === 'folder' ? '' : (item.size ? formatFileSize(item.size) : '')}
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default FileGrid;
