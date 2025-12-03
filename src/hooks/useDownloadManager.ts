import { useState, useEffect } from 'react';
import { downloadManager, DownloadItem } from '@/lib/downloadManager';

export const useDownloadManager = () => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Subscribe to download updates
    const unsubscribe = downloadManager.subscribe((updatedDownloads) => {
      setDownloads(updatedDownloads);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const addDownload = (url: string, filename: string) => {
    return downloadManager.addDownload(url, filename);
  };

  const cancelDownload = (id: string) => {
    downloadManager.cancelDownload(id);
  };

  const clearCompleted = () => {
    downloadManager.clearCompleted();
  };

  // Calculate statistics
  const stats = {
    total: downloads.length,
    queued: downloads.filter(d => d.status === 'queued').length,
    downloading: downloads.filter(d => d.status === 'downloading').length,
    completed: downloads.filter(d => d.status === 'completed').length,
    failed: downloads.filter(d => d.status === 'failed').length,
    cancelled: downloads.filter(d => d.status === 'cancelled').length,
  };

  const hasActiveDownloads = stats.queued > 0 || stats.downloading > 0;

  return {
    downloads,
    stats,
    hasActiveDownloads,
    isLoading,
    addDownload,
    cancelDownload,
    clearCompleted,
  };
};