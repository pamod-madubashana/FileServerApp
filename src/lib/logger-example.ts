// Example of how to use the logger module in other parts of the application
import logger from '@/lib/logger';

// Example usage in a service or utility function
export class FileService {
  static async uploadFile(file: File) {
    logger.info('Starting file upload', { fileName: file.name, fileSize: file.size });
    
    try {
      // Simulate file upload
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
      
      const result = await response.json();
      logger.info('File uploaded successfully', result);
      return result;
    } catch (error) {
      logger.error('File upload failed', { error, fileName: file.name });
      throw error;
    }
  }
  
  static async deleteFile(fileId: string) {
    logger.info('Deleting file', { fileId });
    
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }
      
      logger.info('File deleted successfully', { fileId });
      return true;
    } catch (error) {
      logger.error('File deletion failed', { error, fileId });
      throw error;
    }
  }
}

// Example usage in a hook
export const useFileOperations = () => {
  const uploadFile = async (file: File) => {
    logger.info('useFileOperations: uploadFile called', { fileName: file.name });
    return FileService.uploadFile(file);
  };
  
  const deleteFile = async (fileId: string) => {
    logger.info('useFileOperations: deleteFile called', { fileId });
    return FileService.deleteFile(fileId);
  };
  
  return { uploadFile, deleteFile };
};

// Example of direct usage
export const exampleDirectUsage = async () => {
  logger.debug('This is a debug message');
  logger.info('This is an info message');
  logger.warn('This is a warning message');
  logger.error('This is an error message');
  
  // With data
  logger.info('User logged in', { userId: 123, username: 'john_doe' });
  
  // In an async context
  try {
    logger.info('Starting async operation');
    await new Promise(resolve => setTimeout(resolve, 1000));
    logger.info('Async operation completed');
  } catch (error) {
    logger.error('Async operation failed', error);
  }
};