import React, { useState } from 'react';
import DropZone from './DropZone';
import { TraversedFile } from '@/lib/folderTraversal';

const DropZoneDemo: React.FC = () => {
  const [files, setFiles] = useState<TraversedFile[]>([]);

  const handleFilesLoaded = (loadedFiles: TraversedFile[]) => {
    setFiles(loadedFiles);
    console.log('Files loaded:', loadedFiles);
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
                {file.size > 0 ? `${(file.size / 1024).toFixed(2)} KB` : '0 KB'} - 
                {file.type || 'unknown type'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DropZoneDemo;