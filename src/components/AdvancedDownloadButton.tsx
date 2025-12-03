import React, { useState } from 'react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { DownloadIcon, CheckIcon, XIcon } from 'lucide-react';
import { downloadFile } from '../lib/utils';
import { downloadManager } from '../lib/downloadManager';

interface AdvancedDownloadButtonProps {
  path: string;
  filename: string;
  className?: string;
  children?: React.ReactNode;
}

const AdvancedDownloadButton: React.FC<AdvancedDownloadButtonProps> = ({ 
  path, 
  filename, 
  className,
  children 
}) => {
  const [status, setStatus] = useState<'idle' | 'downloading' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const handleDownload = async () => {
    if (status === 'downloading') return;
    
    setStatus('downloading');
    setProgress(0);
    setError(null);
    
    try {
      // Add to download manager for tracking
      const downloadId = downloadManager.addDownload(path, filename);
      
      // Perform the download with progress tracking
      await downloadFile(path, filename, (progress) => {
        setProgress(progress);
      });
      
      setStatus('completed');
      
      // Reset to idle after 2 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 2000);
    } catch (err) {
      console.error('Download failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStatus('error');
      
      // Reset to idle after 3 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 3000);
    }
  };

  const renderButtonContent = () => {
    switch (status) {
      case 'downloading':
        return (
          <>
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
            {progress > 0 ? `${progress}%` : 'Starting...'}
          </>
        );
      case 'completed':
        return (
          <>
            <CheckIcon className="mr-2 h-4 w-4" />
            Completed
          </>
        );
      case 'error':
        return (
          <>
            <XIcon className="mr-2 h-4 w-4" />
            Failed
          </>
        );
      default:
        return (
          <>
            <DownloadIcon className="mr-2 h-4 w-4" />
            {children || 'Download'}
          </>
        );
    }
  };

  return (
    <div className="flex flex-col items-start gap-2 w-full">
      <Button 
        onClick={handleDownload} 
        disabled={status === 'downloading'}
        className={`${className} w-full`}
      >
        {renderButtonContent()}
      </Button>
      
      {status === 'downloading' && (
        <Progress value={progress} className="w-full" />
      )}
      
      {error && (
        <div className="text-sm text-red-500 mt-1">
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default AdvancedDownloadButton;