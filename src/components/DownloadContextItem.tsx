import React from 'react';
import { DropdownMenuItem } from './ui/dropdown-menu';
import { DownloadIcon } from 'lucide-react';
import { downloadFile } from '../lib/utils';
import { downloadManager } from '../lib/downloadManager';

interface DownloadContextItemProps {
  path: string;
  filename: string;
  onClose?: () => void;
}

/**
 * A context menu item that triggers a file download when clicked.
 * Works in both browser and Tauri environments.
 */
const DownloadContextItem: React.FC<DownloadContextItemProps> = ({ 
  path, 
  filename,
  onClose
}) => {
  const [loading, setLoading] = React.useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    
    setLoading(true);
    
    try {
      // Add to download manager for better tracking - this will automatically start the download
      const downloadId = downloadManager.addDownload(path, filename);
      
      // The download is now handled by the download manager's queue system
      // We don't need to call downloadFile directly
      onClose?.();
    } catch (err) {
      console.error('Download failed:', err);
      // In a real app, you might want to show a toast notification here
      alert(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenuItem 
      onClick={handleDownload}
      disabled={loading}
      className="cursor-pointer"
    >
      {loading ? (
        <>
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
          Downloading...
        </>
      ) : (
        <>
          <DownloadIcon className="mr-2 h-4 w-4" />
          Download
        </>
      )}
    </DropdownMenuItem>
  );
};

export default DownloadContextItem;