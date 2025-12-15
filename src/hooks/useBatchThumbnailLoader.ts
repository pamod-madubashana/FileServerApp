import { useState, useEffect, useCallback } from "react";
import { FileItem } from "@/components/types";

/**
 * Hook for loading thumbnails in batches to improve performance
 */
export function useBatchThumbnailLoader(items: FileItem[], batchSize: number = 5) {
  const [loadedThumbnails, setLoadedThumbnails] = useState<Record<string, string>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, 'loading' | 'loaded' | 'error'>>({});
  
  // Reset states when items change
  useEffect(() => {
    setLoadedThumbnails({});
    setLoadingStates({});
  }, [items]);

  /**
   * Load thumbnails in batches to prevent overwhelming the browser
   */
  const loadThumbnailsInBatches = useCallback(async () => {
    // Get items that have thumbnails and aren't already loaded
    const itemsToLoad = items.filter(
      item => item.thumbnail && !loadedThumbnails[item.thumbnail] && !loadingStates[item.thumbnail]
    );

    if (itemsToLoad.length === 0) return;

    // Process items in batches
    for (let i = 0; i < itemsToLoad.length; i += batchSize) {
      const batch = itemsToLoad.slice(i, i + batchSize);
      
      // Update loading states for this batch
      const batchLoadingStates: Record<string, 'loading'> = {};
      batch.forEach(item => {
        if (item.thumbnail) {
          batchLoadingStates[item.thumbnail] = 'loading';
        }
      });
      
      setLoadingStates(prev => ({ ...prev, ...batchLoadingStates }));

      // Load all thumbnails in the batch in parallel
      await Promise.all(
        batch.map(async (item) => {
          if (!item.thumbnail) {
            return;
          }

          const thumbnailId = item.thumbnail;
          
          try {
            // Import the API client dynamically
            const { fetchWithTimeout, getApiBaseUrl } = await import('@/lib/api');
            
            // Check if we're in Tauri environment
            const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
            
            // Construct the thumbnail URL
            // For browser environments, use relative path to avoid CORS issues
            // For Tauri environments, use the full API base URL
            let thumbnailUrl: string;
            if (isTauri) {
              const baseUrl = getApiBaseUrl();
              thumbnailUrl = baseUrl 
                ? `${baseUrl}/files/thumbnail/${thumbnailId}` 
                : `/files/thumbnail/${thumbnailId}`;
            } else {
              // Use relative path for browser to avoid CORS issues
              thumbnailUrl = `/files/thumbnail/${thumbnailId}`;
            }
              
            // Fetch the thumbnail using our authenticated API client
            const response = await fetchWithTimeout(thumbnailUrl, { method: 'GET' }, 5000);
            
            if (!response.ok) {
              throw new Error(`Failed to fetch thumbnail: ${response.statusText}`);
            }
            
            // Convert response to blob and create object URL
            const blob = await response.blob();
            const dataUrl = URL.createObjectURL(blob);
            
            setLoadedThumbnails(prev => ({ ...prev, [thumbnailId]: dataUrl }));
            setLoadingStates(prev => ({ ...prev, [thumbnailId]: 'loaded' }));
          } catch (error) {
            console.error('Error loading thumbnail:', error);
            setLoadingStates(prev => ({ ...prev, [thumbnailId]: 'error' }));
          }
        })
      );
    }
  }, [items, loadedThumbnails, loadingStates, batchSize]);

  // Load thumbnails when items change
  useEffect(() => {
    loadThumbnailsInBatches();
  }, [loadThumbnailsInBatches]);

  return {
    loadedThumbnails,
    loadingStates,
    retryLoad: loadThumbnailsInBatches
  };
}