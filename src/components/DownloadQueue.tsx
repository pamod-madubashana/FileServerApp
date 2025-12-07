import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download as DownloadIcon, X as XIcon, RotateCcw as RotateCcwIcon } from "lucide-react";
import { downloadManager, DownloadItem } from "@/lib/downloadManager";

// Import Tauri opener plugin for opening files
import { openPath } from '@tauri-apps/plugin-opener';

interface DownloadQueueProps {
  className?: string;
  isOpen?: boolean; // Make isOpen controllable from outside
  onToggle?: () => void; // Callback for when the toggle is clicked
}

const DownloadQueue: React.FC<DownloadQueueProps> = ({ className, isOpen: externalIsOpen, onToggle }) => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Use external isOpen if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  
  // Use external onToggle if provided, otherwise use internal toggle
  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  useEffect(() => {
    // Subscribe to download updates
    const unsubscribe = downloadManager.subscribe((updatedDownloads) => {
      setDownloads(updatedDownloads);
    });

    return () => {
      unsubscribe();
    };
  }, []);

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

  return (
    <div className={`${className}`}>
      {/* Collapsed view - show download count */}
      {!isOpen && (
        <Button 
          onClick={handleToggle}
          className="rounded-full w-12 h-12 p-0 shadow-lg backdrop-blur-md bg-primary/80 hover:bg-primary/90 transition-all duration-200 hover:scale-110"
          variant="default"
        >
          <DownloadIcon className="h-5 w-5" />
          {hasActiveDownloads && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center backdrop-blur-sm">
              {activeDownloads.length + queuedDownloads.length}
            </span>
          )}
        </Button>
      )}

      {/* Expanded view */}
      {isOpen && (
        <Card className="w-80 shadow-xl backdrop-blur-md bg-background/80 border border-border/50">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Downloads</CardTitle>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearCompleted}
                  disabled={completedDownloads.length === 0}
                  className="hover:bg-accent/50 transition-all duration-200"
                >
                  Clear
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleToggle}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              {activeDownloads.length} active, {queuedDownloads.length} queued
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 max-h-96 overflow-y-auto overflow-x-hidden custom-scrollbar">
            {downloads.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No downloads in queue
              </div>
            ) : (
              <div className="divide-y">
                {[...activeDownloads, ...queuedDownloads, ...completedDownloads, ...failedDownloads].map((download) => (
                  <div key={download.id} className="p-3 hover:bg-muted/50 transition-all duration-200 hover:scale-[1.01] backdrop-blur-sm bg-background/30 rounded-lg border border-border/20 mb-1">
                    <div 
                      className="flex justify-between items-start mb-1 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Open file when clicking on completed downloads
                        if (download.status === 'completed') {
                          // Check if we're in Tauri environment
                          const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;
                          console.log('Download item clicked:', { isTauri, filePath: download.filePath, download });
                          
                          if (isTauri) {
                            // For Tauri, use the file path to open with system default app
                            if (download.filePath) {
                              console.log('Opening file in Tauri:', download.filePath);
                              openPath(download.filePath).catch(err => {
                                console.error('Failed to open file:', err);
                              });
                            } else {
                              console.log('No filePath available for download:', download);
                            }
                          } else {
                            console.log('Not in Tauri environment, skipping file open');
                          }
                          // For browser, do nothing as we cannot directly open files
                          // The user can access downloaded files through their browser's download manager
                        }
                      }}
                      onContextMenu={(e) => {
                        // Prevent default right-click context menu
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <div className="font-medium text-sm truncate">{download.filename}</div>
                      <div className="flex gap-1">
                        {download.status === 'failed' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              retryDownload(download);
                            }}
                          >
                            <RotateCcwIcon className="h-3 w-3" />
                          </Button>
                        )}
                        {(download.status === 'queued' || download.status === 'downloading') && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelDownload(download.id);
                            }}
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