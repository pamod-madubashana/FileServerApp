import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download as DownloadIcon, X as XIcon, RotateCcw as RotateCcwIcon, ListOrdered, FolderOpen, Save } from "lucide-react";
import { downloadManager, DownloadItem } from "@/lib/downloadManager";
import { useNavigate } from "react-router-dom";

import { invoke } from "@tauri-apps/api/core";
import authService from "@/lib/authService";

interface DownloadQueueProps {
  className?: string;
  isOpen?: boolean; // Make isOpen controllable from outside
  onToggle?: () => void; // Callback for when the toggle is clicked
}

const DownloadQueue: React.FC<DownloadQueueProps> = ({ className, isOpen: externalIsOpen, onToggle }) => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const navigate = useNavigate();
  
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

  // Function to open a downloaded file's folder
  const openDownloadedFile = async (path: string) => {
    try {
      await invoke("open_file_in_folder", { path });
    } catch (error) {
      console.error("Failed to open file folder:", error);
    }
  };

  // Get today's downloads, limited to 6
  const recentDownloads = downloadManager.getTodayDownloads(6);
  
  // Filter downloads by status for the full list
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
              <CardTitle className="text-lg">Recent Downloads</CardTitle>
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
              {activeDownloads.length} active, {recentDownloads.length} recent
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 max-h-96 overflow-y-auto overflow-x-hidden custom-scrollbar">
            {recentDownloads.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No recent downloads
              </div>
            ) : (
              <div className="divide-y">
                {recentDownloads.map((download) => (
                  <div key={download.id} className="p-3 hover:bg-muted/50 transition-all duration-200 hover:scale-[1.01] backdrop-blur-sm bg-background/30 rounded-lg border border-border/20 mb-1">
                    <div 
                      className="flex justify-between items-start mb-1"
                      onContextMenu={(e) => {
                        // Prevent default right-click context menu
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <div 
                        className="font-medium text-sm truncate cursor-pointer hover:underline flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Open file when clicking on completed downloads
                          if (download.status === 'completed') {
                            // Check if we're in Tauri environment
                            const isTauri = authService.isTauri();
                            console.log('Download item clicked:', { isTauri, filePath: download.filePath, download });
                            
                            if (isTauri) {
                              // For Tauri, use the file path to open the folder containing the file
                              if (download.filePath) {
                                console.log('Opening file folder in Tauri:', download.filePath);
                                openDownloadedFile(download.filePath);
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
                      >
                        {download.filename}
                      </div>
                      {/* Folder icon - only show for Tauri app and completed downloads */}
                      {download.status === 'completed' && authService.isTauri() && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 ml-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Check if we're in Tauri environment
                            const isTauri = authService.isTauri();
                            if (isTauri && download.filePath) {
                              openDownloadedFile(download.filePath);
                            }
                          }}
                        >
                          <FolderOpen className="h-3 w-3" />
                        </Button>
                      )}
                      {/* Save icon - only show for browser and completed downloads */}
                      {download.status === 'completed' && !authService.isTauri() && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 ml-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            // For browser, trigger download again to show save dialog
                            if (download.url) {
                              const link = document.createElement('a');
                              link.href = download.url;
                              link.download = download.filename;
                              link.click();
                            }
                          }}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                      )}
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
                      {/* Display speed and ETA for active downloads */}
                      {download.status === 'downloading' && download.speed !== undefined && download.speed > 0 && (
                        <span className="ml-auto">
                          {formatSpeed(download.speed)}
                          {download.eta !== undefined && download.eta > 0 && (
                            <span className="ml-1">({formatETA(download.eta)})</span>
                          )}
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
            <div className="p-3 border-t">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  handleToggle();
                  navigate("/downloads");
                }}
              >
                <ListOrdered className="h-4 w-4 mr-2" />
                View All Downloads
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DownloadQueue;

// Add helper functions for formatting speed and ETA
function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) {
    return `${Math.round(bytesPerSecond)} B/s`;
  } else if (bytesPerSecond < 1024 * 1024) {
    return `${Math.round(bytesPerSecond / 1024)} KB/s`;
  } else {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }
}

function formatETA(seconds: number): string {
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
}
