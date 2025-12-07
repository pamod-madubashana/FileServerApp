import React, { useState, useRef, useCallback } from 'react';
import { useDropScanner } from '@/hooks/useDropScanner';
import { TraversedFile } from '@/lib/folderTraversal';

interface DropZoneProps {
  onFilesLoaded: (files: TraversedFile[]) => void;
  children: React.ReactNode;
}

const DropZone: React.FC<DropZoneProps> = ({ onFilesLoaded, children }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dragCounter = useRef(0);
  const { scanDropItems } = useDropScanner();

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
    
    console.log('DropZone drop event received');
    console.log('Data transfer types:', e.dataTransfer.types);
    console.log('Items length:', e.dataTransfer.items?.length);
    console.log('Files length:', e.dataTransfer.files?.length);
    
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
    
    // First, try to get files directly from dataTransfer.files if available
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
      
      // Call onFilesLoaded directly
      onFilesLoaded(traversedFiles);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Process dropped items using our scanner
      console.log('Passing items to scanDropItems:', e.dataTransfer.items);
      const files = await scanDropItems(e.dataTransfer.items);
      console.log('DropZone got files:', files.length);
      
      // Log details of each file
      files.forEach((file, index) => {
        console.log(`File ${index}: name=${file.name}, fullPath=${file.fullPath}, size=${file.size}`);
      });
      
      // Check if we got any files
      if (files.length === 0) {
        // No files were processed, show a message to the user
        alert('Unable to process the dropped files. Please try dragging files directly from your file manager.');
      }
      
      // Always call onFilesLoaded, even if no files were processed
      onFilesLoaded(files);
    } catch (error) {
      console.error('Error processing dropped files:', error);
      alert('Failed to process dropped files. Please try again.');
      // Still call onFilesLoaded with empty array to indicate completion
      onFilesLoaded([]);
    } finally {
      setIsLoading(false);
    }
  }, [onFilesLoaded, scanDropItems]);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`drop-zone ${isDragging ? 'drag-over' : ''} ${isLoading ? 'loading' : ''}`}
    >
      {isLoading ? (
        <div className="drop-zone-loading">Processing files...</div>
      ) : (
        children
      )}
    </div>
  );
};

export default DropZone;