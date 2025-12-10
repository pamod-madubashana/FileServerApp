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
  filePath?: string;
  // Add new fields for speed and ETA
  speed?: number; // bytes per second
  eta?: number; // seconds remaining
  lastUpdate?: Date; // timestamp of last progress update
  lastDownloaded?: number; // downloaded bytes at last update
  // Add cancellation support
  cancellationToken?: AbortController;
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
      // Trigger cancellation if we have a cancellationToken
      if (download.cancellationToken) {
        download.cancellationToken.abort();
      }
      
      // Mark as cancelled
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
      
      // Initialize speed tracking fields
      download.lastUpdate = new Date();
      download.lastDownloaded = 0;
      download.speed = 0;
      download.eta = undefined;
      
      // Create cancellation token for this download
      const cancellationToken = new AbortController();
      download.cancellationToken = cancellationToken;
      
      // Download with progress tracking
      const filePath = await downloadFile(download.url, download.filename, (progress, details) => {
        // Check if download was cancelled
        if (cancellationToken.signal.aborted) {
          return;
        }
        
        // Update progress
        download.progress = progress;
        
        // Update speed and ETA from detailed information if available
        if (details) {
          if (details.speed !== undefined) {
            download.speed = details.speed;
          }
          if (details.eta !== undefined) {
            download.eta = details.eta;
          }
          if (details.total !== undefined) {
            download.size = details.total;
          }
          if (details.downloaded !== undefined) {
            download.downloaded = details.downloaded;
          }
        } else {
          // Fallback to calculating speed and ETA if no detailed information provided
          const now = new Date();
          const timeElapsed = (now.getTime() - (download.lastUpdate?.getTime() || now.getTime())) / 1000; // seconds
          const bytesDownloaded = (progress / 100) * (download.size || 0);
          const bytesSinceLastUpdate = bytesDownloaded - (download.lastDownloaded || 0);
          
          // Calculate speed (bytes per second)
          if (timeElapsed > 0) {
            download.speed = bytesSinceLastUpdate / timeElapsed;
            
            // Calculate ETA (seconds remaining) if we know the total size
            if (download.size && download.speed > 0) {
              const bytesRemaining = download.size - bytesDownloaded;
              download.eta = bytesRemaining / download.speed;
            }
          }
          
          // Update tracking fields
          download.lastUpdate = now;
          download.lastDownloaded = bytesDownloaded;
        }
        
        this.notifyListeners();
      }, 3, cancellationToken);
      
      // Check if download was cancelled before completion
      if (cancellationToken.signal.aborted) {
        download.status = 'cancelled';
        download.endTime = new Date();
        logger.info('[DownloadManager] Download cancelled before completion', { id });
        return;
      }
      
      // Update status
      download.status = 'completed';
      download.progress = 100;
      download.endTime = new Date();
      
      // Store file path/blob URL for opening later
      if (filePath && typeof filePath === 'string') {
        download.filePath = filePath;
        console.log('Stored filePath for download:', { id, filePath, download });
      } else {
        console.log('No filePath to store for download:', { id, filePath });
      }
      
      logger.info('[DownloadManager] Download completed', { id });
    } catch (error) {
      // Check if this is a cancellation error
      if (error instanceof Error && error.name === 'AbortError') {
        download.status = 'cancelled';
        download.endTime = new Date();
        logger.info('[DownloadManager] Download cancelled', { id });
        return;
      }
      
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

  // Get downloads from today
  getTodayDownloads(limit?: number): DownloadItem[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayDownloads = Array.from(this.downloads.values()).filter(download => {
      // Include active downloads (those without endTime)
      if (!download.endTime) {
        // For active downloads, check if they were started today
        if (download.startTime) {
          const startDate = new Date(download.startTime);
          startDate.setHours(0, 0, 0, 0);
          return startDate.getTime() === today.getTime();
        }
        // If no startTime either, include them for now
        return true;
      }
      
      // For completed downloads, check if they ended today
      const downloadDate = new Date(download.endTime);
      downloadDate.setHours(0, 0, 0, 0);
      return downloadDate.getTime() === today.getTime();
    });
    
    // Sort by endTime descending (most recent first), with active downloads at the top
    todayDownloads.sort((a, b) => {
      // Active downloads (no endTime) should be at the top
      if (!a.endTime && b.endTime) return -1;
      if (a.endTime && !b.endTime) return 1;
      if (!a.endTime && !b.endTime) {
        // Both active, sort by startTime
        if (!a.startTime || !b.startTime) return 0;
        return b.startTime.getTime() - a.startTime.getTime();
      }
      
      // Both completed, sort by endTime
      if (!a.endTime || !b.endTime) return 0;
      return b.endTime.getTime() - a.endTime.getTime();
    });
    
    // Apply limit if specified
    if (limit !== undefined) {
      return todayDownloads.slice(0, limit);
    }
    
    return todayDownloads;
  }

  // Get a specific download by ID
  getDownloadById(id: string): DownloadItem | undefined {
    return this.downloads.get(id);
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
          // filePath is preserved as-is (string)
          
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