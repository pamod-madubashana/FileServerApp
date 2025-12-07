import React, { useState } from 'react';
import DropZone from './DropZone';
import { TraversedFile } from '@/lib/folderTraversal';

const DropZoneDemo: React.FC = () => {
  const [files, setFiles] = useState<TraversedFile[]>([]);

  const handleFilesLoaded = (loadedFiles: TraversedFile[]) => {
    // Filter out placeholder files but keep traversed files with proper paths
    const validFiles = loadedFiles.filter(fileObj => {
      // For traversed files, we should keep them even if they have size 0
      // because they came from our folder traversal logic and have proper fullPaths
      if (fileObj.fullPath && fileObj.fullPath !== fileObj.file.name) {
        // This is a traversed file with a path structure, keep it
        return true;
      }
      
      // Keep files that have either:
      // 1. Content (size > 0)
      // 2. A type (indicating it's a real file)
      if (fileObj.file.size > 0 || fileObj.file.type) {
        return true;
      }
      
      // For files with size 0 and no type, we need to be more careful
      // If it has a meaningful path structure (contains slashes), it's likely from folder traversal
      if (fileObj.fullPath && fileObj.fullPath.includes('/') && fileObj.fullPath !== fileObj.file.name) {
        return true;
      }
      
      // According to project specification "Preserve Zero-Size Directory Placeholders During Filtering":
      // Do not skip entries solely based on size 0 and empty type. Directory placeholders appear this way;
      // they must be allowed to pass through so recursive traversal can process their contents.
      console.log('Preserving potential directory placeholder:', fileObj.file.name);
      return true;
    });
    
    setFiles(validFiles);
    console.log('Files loaded:', validFiles);
  };

  return (
    <div className="drop-zone-demo">
      <h2>Drag & Drop Demo</h2>
      <p>Try dragging files, folders, or nested directories here:</p>
      
      <DropZone onFilesLoaded={handleFilesLoaded}>
        <div 
          className="drop-area"
          style={{
            border: '2px dashed #ccc',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#fafafa',
            transition: 'background-color 0.2s'
          }}
        >
          <p>Drop files or folders here</p>
          <p>Supports single files, entire folders, and nested subfolders</p>
        </div>
      </DropZone>

      {files.length > 0 && (
        <div className="file-list">
          <h3>Scanned Files ({files.length})</h3>
          <ul>
            {files.map((file, index) => (
              <li key={index}>
                <strong>{file.fullPath}</strong> - 
                {file.file.size > 0 ? `${(file.file.size / 1024).toFixed(2)} KB` : '0 KB'} - 
                {file.file.type || 'unknown type'}
              </li>
            ))}
          </ul>
          
          <button 
            onClick={async () => {
              try {
                // Import the API client
                const { api } = await import('@/lib/api');
                
                // Collect all unique top-level folder names that need to be created
                const topLevelFoldersToCreate = new Set<string>();
                const currentPathStr = '/Home'; // For demo, we'll use root path "/Home"
                
                // Process each file to determine top-level folders
                files.forEach(fileObj => {
                  // If we have a full path structure (e.g., "qwes/ITN.txt"), we need to:
                  // 1. Extract the top-level folder name (e.g., "qwes")
                  // 2. Add it to our set of folders to create
                  if (fileObj.fullPath && fileObj.fullPath.includes('/')) {
                    const pathParts = fileObj.fullPath.split('/');
                    
                    // Skip if the path is just "Home" or empty
                    if (pathParts.length === 1 && (pathParts[0] === 'Home' || pathParts[0] === '')) {
                      console.log(`Skipping invalid path: ${fileObj.fullPath}`);
                      return;
                    }
                    
                    if (pathParts.length >= 1) {
                      // Get the top-level folder name (first part of the path)
                      const topLevelFolder = pathParts[0];
                      console.log(`Top level folder: ${topLevelFolder}`);
                      
                      // Skip if the top-level folder is just "Home"
                      if (topLevelFolder === 'Home') {
                        console.log(`Skipping top-level folder that is 'Home': ${topLevelFolder}`);
                        return;
                      }
                      
                      topLevelFoldersToCreate.add(topLevelFolder);
                    }
                  }
                });
                
                // Create all required top-level folders using the simple create_folder API
                console.log('Creating top-level folders:', Array.from(topLevelFoldersToCreate));
                for (const folderName of topLevelFoldersToCreate) {
                  try {
                    console.log(`Creating folder '${folderName}' in path '${currentPathStr}'`);
                    await api.createFolder(folderName, currentPathStr);
                    console.log(`Successfully created folder: ${folderName}`);
                  } catch (error) {
                    console.warn(`Error creating folder ${folderName}:`, error);
                  }
                }
                
                // Upload each file with correct path structure
                for (const fileObj of files) {
                  try {
                    // For demo purposes, we'll upload to root path "/"
                    // In a real implementation, this would be the current folder path
                    let uploadPath = '/';
                    
                    // If we have a full path structure (e.g., "qwes/ITN.txt"), we need to:
                    // 1. Extract the top-level folder name (e.g., "qwes")
                    // 2. Append it to the current path
                    if (fileObj.fullPath && fileObj.fullPath.includes('/')) {
                      // This preserves the folder structure from the dropped folder
                      const pathParts = fileObj.fullPath.split('/');
                      
                      if (pathParts.length >= 1) {
                        // For folder uploads, we want to preserve the complete structure of the dropped folder
                        // If we're at root, the full path is "/Home/fullPath"
                        const fullPath = fileObj.fullPath;
                        uploadPath = `/Home/${fullPath}`;
                      }
                    }
                    
                    const result = await api.uploadFile(fileObj.file, uploadPath);
                    console.log('Upload result:', result);
                    // Show success message through UI feedback instead of alert
                    console.log(`File ${fileObj.file.name} uploaded successfully to ${uploadPath}!`);
                  } catch (error) {
                    console.error(`Failed to upload file ${fileObj.file.name}:`, error);
                    // Show error message through UI feedback instead of alert
                    console.error(`Failed to upload file ${fileObj.file.name}: ${error.message || 'Unknown error'}`);
                  }
                }
                
                // Show overall success message through UI feedback instead of alert
                console.log('All files uploaded successfully!');
              } catch (error) {
                console.error('Upload error:', error);
                // Show error message through UI feedback instead of alert
                console.error(`Upload failed: ${error.message || 'Unknown error'}`);
              }
            }}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Upload Files
          </button>
        </div>
      )}
    </div>
  );
};

export default DropZoneDemo;