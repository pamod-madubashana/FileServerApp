import { useEffect, useState } from 'react';
import logger from '@/lib/logger';

interface ScreenResolution {
  width: number;
  height: number;
}

/**
 * Hook to detect screen resolution and automatically adjust zoom level
 * for better UI experience on different screen sizes.
 * 
 * For 720p screens, applies 75% zoom to make UI appear normal.
 * For 1080p screens and above, keeps default zoom (100%).
 */
export const useScreenResolution = () => {
  const [resolution, setResolution] = useState<ScreenResolution>({ width: 0, height: 0 });
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [is720p, setIs720p] = useState<boolean>(false);

  useEffect(() => {
    const detectResolution = () => {
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;
      
      setResolution({ width: screenWidth, height: screenHeight });
      
      // Check if screen resolution is 720p (common variants: 1280x720, 1366x768, etc.)
      // We consider anything with a height of ~720px as 720p
      const is720pResolution = screenHeight >= 720 && screenHeight <= 768;
      
      if (is720pResolution) {
        setIs720p(true);
        // Apply 75% zoom for 720p screens
        setZoomLevel(0.75);
        document.body.style.zoom = '0.75';
        logger.info('720p screen detected, applying 75% zoom', { screenWidth, screenHeight });
      } else {
        setIs720p(false);
        // Reset to default zoom for other resolutions
        setZoomLevel(1);
        document.body.style.zoom = '1';
        logger.info('Non-720p screen detected, using default zoom', { screenWidth, screenHeight });
      }
    };

    // Initial detection
    detectResolution();

    // Listen for screen resize events (in case of resolution changes)
    window.addEventListener('resize', detectResolution);

    // Cleanup event listener
    return () => {
      window.removeEventListener('resize', detectResolution);
    };
  }, []);

  return { resolution, zoomLevel, is720p };
};