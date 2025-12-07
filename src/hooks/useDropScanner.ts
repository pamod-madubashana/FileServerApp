import { useCallback } from 'react';
import { TraversedFile, processDropItems } from '@/lib/folderTraversal';

interface UseDropScannerReturn {
  scanDropItems: (items: DataTransferItemList) => Promise<TraversedFile[]>;
}

export const useDropScanner = (): UseDropScannerReturn => {
  const scanDropItems = useCallback(async (items: DataTransferItemList): Promise<TraversedFile[]> => {
    return await processDropItems(items);
  }, []);

  return {
    scanDropItems
  };
};