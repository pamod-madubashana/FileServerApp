import { useState, useEffect, useCallback } from "react";
import { FileItem } from "@/components/types";

/**
 * Hook for loading thumbnails in batches to improve performance
 */
export function useBatchThumbnailLoader(items: FileItem[], batchSize: number = 5) {
  const [loadedThumbnails, setLoadedThumbnails] = useState<Record<string, boolean>>({});
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
        batch.map(item => {
          return new Promise<void>((resolve) => {
            if (!item.thumbnail) {
              resolve();
              return;
            }

            const img = new Image();
            const thumbnailId = item.thumbnail;
            
            img.onload = () => {
              setLoadedThumbnails(prev => ({ ...prev, [thumbnailId]: true }));
              setLoadingStates(prev => ({ ...prev, [thumbnailId]: 'loaded' }));
              resolve();
            };
            
            img.onerror = () => {
              setLoadingStates(prev => ({ ...prev, [thumbnailId]: 'error' }));
              resolve();
            };
            
            // Construct the thumbnail URL
            const baseUrl = typeof window !== 'undefined' ? 
              (window as any).api_base_url || '' : '';
            let thumbnailUrl = baseUrl 
              ? `${baseUrl}/file/${thumbnailId}/thumbnail` 
              : `/file/${thumbnailId}/thumbnail`;
              
            // For Tauri environment, the X-Auth-Token header is automatically added by the fetch implementation
            // No need to add auth token as query parameter
            
            img.src = thumbnailUrl;
          });
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