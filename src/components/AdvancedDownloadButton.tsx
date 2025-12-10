import React, { useState } from 'react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { DownloadIcon, CheckIcon, XIcon } from 'lucide-react';
import { downloadFile } from '../lib/utils';
import { downloadManager, DownloadItem } from '../lib/downloadManager';

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
  const [downloadInfo, setDownloadInfo] = useState<Pick<DownloadItem, 'speed' | 'eta'>>({});
  const [error, setError] = React.useState<string | null>(null);

  const handleDownload = async () => {
    if (status === 'downloading') return;
    
    setStatus('downloading');
    setProgress(0);
    setDownloadInfo({});
    setError(null);
    
    try {
      // Add to download manager for tracking - this will automatically start the download
      const downloadId = downloadManager.addDownload(path, filename);
      
      // The download is now handled by the download manager's queue system
      // We don't need to call downloadFile directly
      
      // Set up a listener to update the UI progress
      const unsubscribe = downloadManager.subscribe((downloads) => {
        const download = downloads.find(d => d.id === downloadId);
        if (download) {
          setProgress(download.progress);
          
          // Update speed and ETA information
          if (download.status === 'downloading' && (download.speed || download.eta)) {
            setDownloadInfo({
              speed: download.speed,
              eta: download.eta
            });
          }
          
          // Update status based on download state
          if (download.status === 'completed') {
            setStatus('completed');
            setTimeout(() => {
              setStatus('idle');
            }, 2000);
            unsubscribe();
          } else if (download.status === 'failed') {
            setError(download.error || 'Unknown error occurred');
            setStatus('error');
            setTimeout(() => {
              setStatus('idle');
            }, 3000);
            unsubscribe();
          }
        }
      });
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

  // Helper functions for formatting speed and ETA
  const formatSpeed = (bytesPerSecond?: number): string => {
    if (!bytesPerSecond || bytesPerSecond <= 0) return '';
    
    if (bytesPerSecond < 1024) {
      return `${Math.round(bytesPerSecond)} B/s`;
    } else if (bytesPerSecond < 1024 * 1024) {
      return `${Math.round(bytesPerSecond / 1024)} KB/s`;
    } else {
      return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
    }
  };

  const formatETA = (seconds?: number): string => {
    if (!seconds || seconds <= 0) return '';
    
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m${remainingSeconds > 0 ? `${remainingSeconds}s` : ''}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h${minutes > 0 ? `${minutes}m` : ''}`;
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
        <div className="w-full space-y-1">
          <Progress value={progress} className="w-full" />
          {(downloadInfo.speed || downloadInfo.eta) && (
            <div className="text-xs text-muted-foreground flex justify-between">
              {downloadInfo.speed ? <span>{formatSpeed(downloadInfo.speed)}</span> : <span></span>}
              {downloadInfo.eta ? <span>{formatETA(downloadInfo.eta)}</span> : <span></span>}
            </div>
          )}
        </div>
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