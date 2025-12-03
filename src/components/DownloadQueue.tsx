import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { DownloadIcon, XIcon, RotateCcwIcon } from 'lucide-react';
import { downloadManager, DownloadItem } from '../lib/downloadManager';
import { downloadFile } from '../lib/utils';

interface DownloadQueueProps {
  className?: string;
}

const DownloadQueue: React.FC<DownloadQueueProps> = ({ className }) => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Subscribe to download updates
    const unsubscribe = downloadManager.subscribe((updatedDownloads) => {
      setDownloads(updatedDownloads);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const cancelDownload = (id: string) => {
    downloadManager.cancelDownload(id);
  };

  const retryDownload = async (download: DownloadItem) => {
    // Remove the failed download
    downloadManager.cancelDownload(download.id);
    
    // Add a new download with the same parameters
    downloadManager.addDownload(download.url, download.filename);
  };

  const clearCompleted = () => {
    downloadManager.clearCompleted();
  };

  // Filter downloads by status
  const queuedDownloads = downloads.filter(d => d.status === 'queued');
  const activeDownloads = downloads.filter(d => d.status === 'downloading');
  const completedDownloads = downloads.filter(d => d.status === 'completed');
  const failedDownloads = downloads.filter(d => d.status === 'failed');

  const totalDownloads = downloads.length;
  const hasActiveDownloads = activeDownloads.length > 0 || queuedDownloads.length > 0;

  if (totalDownloads === 0) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {/* Collapsed view - show download count */}
      {!isOpen && (
        <Button 
          onClick={toggleOpen}
          className="rounded-full w-12 h-12 p-0 shadow-lg"
          variant="default"
        >
          <DownloadIcon className="h-5 w-5" />
          {hasActiveDownloads && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {activeDownloads.length + queuedDownloads.length}
            </span>
          )}
        </Button>
      )}

      {/* Expanded view */}
      {isOpen && (
        <Card className="w-80 shadow-xl">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Downloads</CardTitle>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearCompleted}
                  disabled={completedDownloads.length === 0}
                >
                  Clear
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={toggleOpen}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              {activeDownloads.length} active, {queuedDownloads.length} queued
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 max-h-96 overflow-y-auto">
            {downloads.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No downloads in queue
              </div>
            ) : (
              <div className="divide-y">
                {[...activeDownloads, ...queuedDownloads, ...completedDownloads, ...failedDownloads].map((download) => (
                  <div key={download.id} className="p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-medium text-sm truncate">{download.filename}</div>
                      <div className="flex gap-1">
                        {download.status === 'failed' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => retryDownload(download)}
                          >
                            <RotateCcwIcon className="h-3 w-3" />
                          </Button>
                        )}
                        {(download.status === 'queued' || download.status === 'downloading') && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => cancelDownload(download.id)}
                          >
                            <XIcon className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center text-xs text-muted-foreground mb-2">
                      <span className="capitalize">{download.status}</span>
                      {download.status === 'downloading' && download.progress > 0 && (
                        <span className="ml-2">{download.progress}%</span>
                      )}
                      {download.status === 'completed' && download.endTime && download.startTime && (
                        <span className="ml-2">
                          {Math.round((download.endTime.getTime() - download.startTime.getTime()) / 1000)}s
                        </span>
                      )}
                    </div>
                    
                    {(download.status === 'downloading' || download.status === 'completed') && (
                      <Progress 
                        value={download.status === 'completed' ? 100 : download.progress} 
                        className="h-1.5"
                      />
                    )}
                    
                    {download.status === 'failed' && (
                      <div className="text-xs text-red-500 truncate">
                        {download.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DownloadQueue;