import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DownloadIcon, XIcon, RotateCcwIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { downloadManager, DownloadItem } from "@/lib/downloadManager";
import { useDownloadManager } from "@/hooks/useDownloadManager";
import { invoke } from "@tauri-apps/api/core";

const Downloads = () => {
  const navigate = useNavigate();
  const { downloads, stats, clearCompleted } = useDownloadManager();
  const [filter, setFilter] = useState<"all" | "today">("all");

  // Filter downloads based on selected filter
  const filteredDownloads = filter === "today" 
    ? downloadManager.getTodayDownloads() 
    : downloads;

  const cancelDownload = (id: string) => {
    downloadManager.cancelDownload(id);
  };

  const retryDownload = async (download: DownloadItem) => {
    // Remove the failed download
    downloadManager.cancelDownload(download.id);
    
    // Add a new download with the same parameters
    downloadManager.addDownload(download.url, download.filename);
  };

  // Function to open a downloaded file's folder
  const openDownloadedFile = async (path: string) => {
    try {
      await invoke("open_file_in_folder", { path });
    } catch (error) {
      console.error("Failed to open file folder:", error);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Downloads</h1>
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Back to Files
            </Button>
          </div>
          
          <Card className="mb-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl text-gray-900 dark:text-white">Download History</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    View and manage your download history
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={filter === "all" ? "default" : "outline"}
                    onClick={() => setFilter("all")}
                  >
                    All Downloads
                  </Button>
                  <Button 
                    variant={filter === "today" ? "default" : "outline"}
                    onClick={() => setFilter("today")}
                  >
                    Today
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={clearCompleted}
                    disabled={stats.completed + stats.failed + stats.cancelled === 0}
                  >
                    Clear Completed
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-6">
              {filteredDownloads.length === 0 ? (
                <div className="text-center py-12">
                  <DownloadIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No downloads</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {filter === "today" 
                      ? "You haven't downloaded any files today." 
                      : "You haven't downloaded any files yet."}
                  </p>
                  <div className="mt-6">
                    <Button onClick={() => navigate("/")}>
                      Browse Files
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDownloads.map((download) => (
                    <div 
                      key={download.id} 
                      className="p-4 border rounded-lg bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {download.filename}
                        </div>
                        <div className="flex gap-1">
                          {download.status === 'failed' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                retryDownload(download);
                              }}
                            >
                              <RotateCcwIcon className="h-4 w-4" />
                            </Button>
                          )}
                          {(download.status === 'queued' || download.status === 'downloading') && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelDownload(download.id);
                              }}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <span className="capitalize">{download.status}</span>
                        {download.status === 'downloading' && download.progress > 0 && (
                          <span className="ml-2">{download.progress}%</span>
                        )}
                        {download.status === 'completed' && download.endTime && download.startTime && (
                          <span className="ml-2">
                            {Math.round((download.endTime.getTime() - download.startTime.getTime()) / 1000)}s
                          </span>
                        )}
                        {download.endTime && (
                          <span className="ml-auto">
                            {new Date(download.endTime).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      
                      {(download.status === 'downloading' || download.status === 'completed') && (
                        <Progress 
                          value={download.status === 'completed' ? 100 : download.progress} 
                          className="h-2"
                        />
                      )}
                      
                      {download.status === 'failed' && (
                        <div className="text-sm text-red-500 dark:text-red-400 truncate">
                          {download.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Downloads;