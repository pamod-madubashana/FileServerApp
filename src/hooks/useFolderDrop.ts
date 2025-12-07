import { useState, useCallback, useRef } from 'react';
import { TraversedFile, processDropItems } from '@/lib/folderTraversal';

interface UseFolderDropReturn {
  isDragging: boolean;
  isLoading: boolean;
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => Promise<void>;
}

export const useFolderDrop = (onFilesLoaded: (files: TraversedFile[]) => void): UseFolderDropReturn => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter.current++;
    
    // Check if the drag contains files
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter.current--;
    
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Necessary to allow drop events
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(false);
    dragCounter.current = 0;
    
    // Check if this is a file drop
    if (!e.dataTransfer.types.includes('Files')) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Process dropped items using our utility
      const files = await processDropItems(e.dataTransfer.items);
      
      // Always call onFilesLoaded, even if no files were processed
      onFilesLoaded(files);
    } catch (error) {
      console.error('Error processing dropped files:', error);
      // Still call onFilesLoaded with empty array to indicate completion
      onFilesLoaded([]);
    } finally {
      setIsLoading(false);
    }
  }, [onFilesLoaded]);

  return {
    isDragging,
    isLoading,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop
  };
};