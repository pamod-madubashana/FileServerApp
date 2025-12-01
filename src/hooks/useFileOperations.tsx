import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileItem } from "@/components/types";
import { getApiBaseUrl, fetchWithTimeout } from "@/lib/api";
import logger from "@/lib/logger";

// Define the request interface
interface CopyMoveRequest {
  file_id: string;
  target_path: string;
}

interface ClipboardItem {
  item: FileItem;
  operation: "copy" | "cut";
  sourcePath: string;
}

export const useFileOperations = () => {
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);
  const queryClient = useQueryClient();

  const copyItem = (item: FileItem, sourcePath: string) => {
    logger.info("Copying item", { item, sourcePath });
    setClipboard({ item, operation: "copy", sourcePath });
  };

  const cutItem = (item: FileItem, sourcePath: string) => {
    logger.info("Cutting item", { item, sourcePath });
    setClipboard({ item, operation: "cut", sourcePath });
  };

  const clearClipboard = () => {
    logger.info("Clearing clipboard");
    setClipboard(null);
  };

  const hasClipboard = () => clipboard !== null;

  const pasteItem = async (targetPath: string) => {
    if (!clipboard) {
      logger.warn("No item in clipboard to paste");
      return;
    }

    logger.info("Pasting item", { 
      operation: clipboard.operation, 
      item: clipboard.item.name, 
      sourcePath: clipboard.sourcePath, 
      targetPath 
    });

    try {
      const baseUrl = getApiBaseUrl();
      // For the default case, we need to append /api to the base URL
      const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
      const request: CopyMoveRequest = {
        file_id: clipboard.item.id || "",
        target_path: targetPath
      };

      if (clipboard.operation === "copy") {
        logger.info("Performing copy operation", { request });
        const response = await fetchWithTimeout(`${apiUrl}/files/copy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(request),
        }, 3000); // 3 second timeout

        if (!response.ok) {
          const errorText = await response.text();
          logger.error("Failed to copy file", { status: response.status, error: errorText });
          throw new Error(`Failed to copy file: ${errorText}`);
        }
        
        logger.info("File copied successfully");
        // For copy operations, we only need to refresh the target path
        queryClient.invalidateQueries({ queryKey: ['files', targetPath] });
      } else {
        // Move operation
        logger.info("Performing move operation", { request });
        const response = await fetchWithTimeout(`${apiUrl}/files/move`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(request),
        }, 3000); // 3 second timeout

        if (!response.ok) {
          const errorText = await response.text();
          logger.error("Failed to move file", { status: response.status, error: errorText });
          throw new Error(`Failed to move file: ${errorText}`);
        }
        
        logger.info("File moved successfully");
        // For move operations, refresh both source and target paths
        queryClient.invalidateQueries({ queryKey: ['files', clipboard.sourcePath] });
        queryClient.invalidateQueries({ queryKey: ['files', targetPath] });
        
        // Force a refetch of the source path data to immediately update the UI
        queryClient.refetchQueries({ queryKey: ['files', clipboard.sourcePath] });
      }

      // Clear clipboard after successful operation
      clearClipboard();
      return true;
    } catch (error) {
      logger.error("Error during paste operation", error);
      throw error;
    }
  };

  return {
    clipboard,
    copyItem,
    cutItem,
    clearClipboard,
    hasClipboard,
    pasteItem,
  };
};