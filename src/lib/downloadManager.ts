import { downloadFile } from './utils';
import logger from '@/lib/logger';

export interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  status: 'queued' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  size?: number;
  downloaded?: number;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

export class DownloadManager {
  private downloads: Map<string, DownloadItem> = new Map();
  private queue: string[] = [];
  private activeDownloads: Set<string> = new Set();
  private maxConcurrentDownloads: number = 3;
  private listeners: Array<(downloads: DownloadItem[]) => void> = [];

  constructor() {
    // Load any persisted downloads
    this.loadFromStorage();
  }

  // Subscribe to download updates
  subscribe(listener: (downloads: DownloadItem[]) => void) {
    this.listeners.push(listener);
    // Send initial state
    listener(this.getDownloads());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all subscribers of changes
  private notifyListeners() {
    const downloads = this.getDownloads();
    this.listeners.forEach(listener => listener(downloads));
    // Persist to storage
    this.saveToStorage();
  }

  // Add a download to the queue
  addDownload(url: string, filename: string): string {
    const id = this.generateId();
    const download: DownloadItem = {
      id,
      url,
      filename,
      status: 'queued',
      progress: 0
    };
    
    this.downloads.set(id, download);
    this.queue.push(id);
    this.processQueue();
    this.notifyListeners();
    
    logger.info('[DownloadManager] Added download to queue', { id, url, filename });
    return id;
  }

  // Cancel a download
  cancelDownload(id: string) {
    const download = this.downloads.get(id);
    if (!download) return;
    
    if (download.status === 'downloading') {
      // Mark as cancelled - the actual cancellation would need to be handled in the download function
      download.status = 'cancelled';
      download.endTime = new Date();
      this.activeDownloads.delete(id);
    } else if (download.status === 'queued') {
      // Remove from queue
      this.queue = this.queue.filter(itemId => itemId !== id);
      download.status = 'cancelled';
      download.endTime = new Date();
    }
    
    this.notifyListeners();
    this.processQueue();
    
    logger.info('[DownloadManager] Cancelled download', { id });
  }

  // Process the download queue
  private async processQueue() {
    // Don't start more downloads than the limit
    while (this.queue.length > 0 && this.activeDownloads.size < this.maxConcurrentDownloads) {
      const id = this.queue.shift();
      if (!id) continue;
      
      const download = this.downloads.get(id);
      if (!download || download.status !== 'queued') continue;
      
      this.activeDownloads.add(id);
      download.status = 'downloading';
      download.startTime = new Date();
      this.notifyListeners();
      
      // Start the download
      this.executeDownload(id);
    }
  }

  // Execute a download
  private async executeDownload(id: string) {
    const download = this.downloads.get(id);
    if (!download) return;
    
    try {
      logger.info('[DownloadManager] Starting download', { id, url: download.url });
      
      // TODO: Implement actual download with progress tracking
      // For now, we'll use the existing downloadFile function
      await downloadFile(download.url, download.filename);
      
      // Update status
      download.status = 'completed';
      download.progress = 100;
      download.endTime = new Date();
      
      logger.info('[DownloadManager] Download completed', { id });
    } catch (error) {
      logger.error('[DownloadManager] Download failed', { id, error });
      
      download.status = 'failed';
      download.error = error instanceof Error ? error.message : String(error);
      download.endTime = new Date();
    } finally {
      this.activeDownloads.delete(id);
      this.notifyListeners();
      this.processQueue();
    }
  }

  // Get all downloads
  getDownloads(): DownloadItem[] {
    return Array.from(this.downloads.values());
  }

  // Get active downloads
  getActiveDownloads(): DownloadItem[] {
    return Array.from(this.activeDownloads).map(id => this.downloads.get(id)!).filter(Boolean);
  }

  // Clear completed downloads
  clearCompleted() {
    const idsToDelete: string[] = [];
    this.downloads.forEach((download, id) => {
      if (download.status === 'completed' || download.status === 'failed' || download.status === 'cancelled') {
        idsToDelete.push(id);
      }
    });
    
    idsToDelete.forEach(id => {
      this.downloads.delete(id);
    });
    
    this.notifyListeners();
    logger.info('[DownloadManager] Cleared completed downloads', { count: idsToDelete.length });
  }

  // Generate a unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Save downloads to localStorage
  private saveToStorage() {
    try {
      const downloads = this.getDownloads();
      localStorage.setItem('downloadManager_downloads', JSON.stringify(downloads));
    } catch (error) {
      logger.error('[DownloadManager] Failed to save downloads to storage', error);
    }
  }

  // Load downloads from localStorage
  private loadFromStorage() {
    try {
      const saved = localStorage.getItem('downloadManager_downloads');
      if (saved) {
        const downloads: DownloadItem[] = JSON.parse(saved);
        downloads.forEach(download => {
          // Convert date strings back to Date objects
          if (download.startTime) download.startTime = new Date(download.startTime);
          if (download.endTime) download.endTime = new Date(download.endTime);
          
          this.downloads.set(download.id, download);
          
          // Re-queue incomplete downloads
          if (download.status === 'queued' || download.status === 'downloading') {
            download.status = 'queued'; // Reset in-progress downloads to queued
            this.queue.push(download.id);
          }
        });
        
        logger.info('[DownloadManager] Loaded downloads from storage', { count: downloads.length });
      }
    } catch (error) {
      logger.error('[DownloadManager] Failed to load downloads from storage', error);
    }
  }
}

// Export a singleton instance
export const downloadManager = new DownloadManager();