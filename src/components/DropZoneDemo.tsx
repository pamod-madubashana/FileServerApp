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
                
                // Upload each file
                for (const fileObj of files) {
                  try {
                    const result = await api.uploadFile(fileObj.file, '/');
                    console.log('Upload result:', result);
                    alert(`File ${fileObj.file.name} uploaded successfully!`);
                  } catch (error) {
                    console.error(`Failed to upload file ${fileObj.file.name}:`, error);
                    alert(`Failed to upload file ${fileObj.file.name}: ${error.message || 'Unknown error'}`);
                  }
                }
              } catch (error) {
                console.error('Upload error:', error);
                alert(`Upload failed: ${error.message || 'Unknown error'}`);
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