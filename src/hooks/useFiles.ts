import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { apiFileToFileItem, FileItem } from '@/components/types';
import logger from '@/lib/logger';
import { handleApiError } from '@/lib/errorHandler';

export const useFiles = (path: string = '/') => {
    const query = useQuery({
        queryKey: ['files', path],  // Include path in query key for proper caching
        queryFn: async () => {
            logger.info("Fetching files", { path });
            try {
                const response = await api.fetchFiles(path);
                logger.info("Files fetched successfully", { path, count: response.files.length });
                return response.files.map(apiFileToFileItem);
            } catch (error) {
                logger.error("Failed to fetch files", { path, error });
                handleApiError(error, 'network');
                throw error;
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: true,
    });

    return {
        files: query.data || [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
};