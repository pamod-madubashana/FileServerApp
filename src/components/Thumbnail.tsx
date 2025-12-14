import { useState, useEffect, useRef } from "react";
import { FileItem } from "./types";
import { FileText, Image as ImageIcon, FileVideo, FileAudio, FileArchive } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api";

interface ThumbnailProps {
  item: FileItem;
  size?: 'sm' | 'md' | 'lg'; // Size variants for different views
}

// Simple cache to store loaded thumbnails
const thumbnailCache = new Map<string, string>();

// Queue to manage thumbnail loading
const loadingQueue: ((() => void) | null)[] = [];
let activeLoads = 0;
const MAX_CONCURRENT_LOADS = 6; // Limit concurrent loads to prevent browser overload

// Process the loading queue
function processQueue() {
  if (activeLoads >= MAX_CONCURRENT_LOADS) return;
  
  while (activeLoads < MAX_CONCURRENT_LOADS && loadingQueue.length > 0) {
    const job = loadingQueue.shift();
    if (job) {
      activeLoads++;
      job();
    }
  }
}

// Add a thumbnail load job to the queue
function queueThumbnailLoad(
  thumbnailId: string, 
  url: string,
  onLoad: (dataUrl: string) => void,
  onError: () => void
) {
  const job = () => {
    // Check cache first
    if (thumbnailCache.has(thumbnailId)) {
      onLoad(thumbnailCache.get(thumbnailId)!);
      activeLoads--;
      processQueue();
      return;
    }
    
    // Fetch the thumbnail using our authenticated API client
    import('@/lib/api').then(({ fetchWithTimeout }) => {
      fetchWithTimeout(url, { method: 'GET' }, 5000)
        .then(response => {
          if (!response.ok) throw new Error('Network response was not ok');
          return response.blob();
        })
        .then(blob => {
          const dataUrl = URL.createObjectURL(blob);
          thumbnailCache.set(thumbnailId, dataUrl);
          onLoad(dataUrl);
        })
        .catch(() => {
          onError();
        })
        .finally(() => {
          activeLoads--;
          processQueue();
        });
    }).catch((error) => {
      console.error('Failed to import API client:', error);
      onError();
      activeLoads--;
      processQueue();
    });
  };
  
  loadingQueue.push(job);
  processQueue();
}

export const Thumbnail = ({ item, size = 'lg' }: ThumbnailProps) => {
  // Define size classes based on the size prop
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-10 h-10',
    lg: 'w-20 h-20'
  };
  
  const currentSizeClass = sizeClasses[size];
  const [thumbnailError, setThumbnailError] = useState(false);
  const [thumbnailLoading, setThumbnailLoading] = useState(true);
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);
  const isMounted = useRef(true);

  // Reset error state when item changes
  useEffect(() => {
    setThumbnailError(false);
    setThumbnailLoading(true);
    setThumbnailSrc(null);
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, [item.thumbnail]);

  // Load thumbnail with queuing
  useEffect(() => {
    if (!item.thumbnail || thumbnailError) return;
    
    // Construct the full thumbnail URL using the API base URL
    const baseUrl = getApiBaseUrl();
    let thumbnailUrl = baseUrl 
      ? `${baseUrl}/file/${item.thumbnail}/thumbnail` 
      : `/file/${item.thumbnail}/thumbnail`;

    // For Tauri environment, the X-Auth-Token header is automatically added by the fetch implementation
    // No need to add auth token as query parameter
    
    // Queue the thumbnail load
    queueThumbnailLoad(
      item.thumbnail,
      thumbnailUrl,
      (dataUrl) => {
        if (isMounted.current) {
          setThumbnailSrc(dataUrl);
          setThumbnailLoading(false);
        }
      },
      () => {
        if (isMounted.current) {
          setThumbnailError(true);
          setThumbnailLoading(false);
        }
      }
    );
    
    return () => {
      // Cleanup function
    };
  }, [item.thumbnail, thumbnailError]);

  // If it's a folder, show folder icon
  if (item.type === "folder") {
    return (
      <div className={`${currentSizeClass} flex items-center justify-center transition-all duration-200 hover:scale-105`}>
        <div className={`${currentSizeClass} text-primary flex items-center justify-center transition-all duration-200 hover:scale-110`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
          </svg>
        </div>
      </div>
    );
  }

  // If no thumbnail or thumbnail already failed, show default icon
  if (!item.thumbnail || thumbnailError) {
    return (
      <div className={`${currentSizeClass} flex items-center justify-center transition-all duration-200 hover:scale-105`}>
        {getDefaultFileIcon(item)}
      </div>
    );
  }

  return (
    <div className={`relative ${currentSizeClass} flex items-center justify-center`}>
      {thumbnailLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          {getDefaultFileIcon(item)}
        </div>
      )}
      {thumbnailSrc && (
        <img
          src={thumbnailSrc}
          alt={item.name}
          className={`max-w-full max-h-full object-contain rounded-lg transition-all duration-300 ${thumbnailLoading ? 'opacity-0' : 'opacity-100'} hover:scale-105 hover:shadow-lg`}
          onLoad={() => {
            setThumbnailLoading(false);
          }}
          onError={() => {
            setThumbnailError(true);
            setThumbnailLoading(false);
          }}
        />
      )}
    </div>
  );
};

const getDefaultFileIcon = (item: FileItem) => {
  switch (item.fileType) {
    case 'photo':
      return <ImageIcon className="w-10 h-10 text-blue-500" />;
    case 'video':
      return <FileVideo className="w-10 h-10 text-purple-500" />;
    case 'audio':
    case 'voice':
      return <FileAudio className="w-10 h-10 text-green-500" />;
    case 'document':
      if (item.extension === 'pdf') {
        return <FileText className="w-10 h-10 text-red-500" />;
      } else if (['doc', 'docx'].includes(item.extension || '')) {
        return <FileText className="w-10 h-10 text-blue-700" />;
      } else if (['xls', 'xlsx'].includes(item.extension || '')) {
        return <FileText className="w-10 h-10 text-green-600" />;
      } else if (['zip', 'rar', '7z'].includes(item.extension || '')) {
        return <FileArchive className="w-10 h-10 text-yellow-500" />;
      }
      return <FileText className="w-10 h-10 text-muted-foreground" />;
    default:
      return <FileText className="w-10 h-10 text-muted-foreground" />;
  }
};