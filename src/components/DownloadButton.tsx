import React from 'react';
import { Button } from './ui/button';
import { DownloadIcon } from 'lucide-react';
import { downloadFile } from '../lib/utils';
import { downloadManager } from '../lib/downloadManager';

interface DownloadButtonProps {
  path: string;
  filename: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * A button component that triggers a file download when clicked.
 * Works in both browser and Tauri environments.
 */
const DownloadButton: React.FC<DownloadButtonProps> = ({ 
  path, 
  filename, 
  className,
  children 
}) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleDownload = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Add to download manager for better tracking - this will automatically start the download
      downloadManager.addDownload(path, filename);
    } catch (err) {
      console.error('Download failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button 
        onClick={handleDownload} 
        disabled={loading}
        className={className}
      >
        {loading ? (
          <>
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
            Downloading...
          </>
        ) : (
          <>
            <DownloadIcon className="mr-2 h-4 w-4" />
            {children || 'Download'}
          </>
        )}
      </Button>
      
      {error && (
        <div className="text-sm text-red-500 mt-1">
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default DownloadButton;