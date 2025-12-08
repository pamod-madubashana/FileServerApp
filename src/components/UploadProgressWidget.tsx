import { useState, useEffect, useRef } from "react";

interface UploadProgress {
  fileName: string;
  filePath: string; // Add filePath to show directory structure
  progress: number;
  status: 'uploading' | 'completed' | 'failed';
  error?: string;
}

interface UploadProgressWidgetProps {
  files: File[];
  currentPath: string;
  isDirectoryUpload?: boolean; // Add prop to indicate directory upload
  onComplete: () => void;
  onCancel: () => void;
}

export const UploadProgressWidget = ({ 
  files, 
  currentPath, 
  isDirectoryUpload = false,
  onComplete, 
  onCancel 
}: UploadProgressWidgetProps) => {
  const [progress, setProgress] = useState<UploadProgress[]>(
    files.map(file => {
      // For directory uploads, show the relative path
      let filePath = file.name;
      if (isDirectoryUpload && 'webkitRelativePath' in file) {
        filePath = (file as any).webkitRelativePath || file.name;
      }
      
      return {
        fileName: file.name,
        filePath,
        progress: 0,
        status: 'uploading'
      };
    })
  );
  const [isComplete, setIsComplete] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const progressIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const completionTimer = useRef<NodeJS.Timeout | null>(null);
  const closeTimer = useRef<NodeJS.Timeout | null>(null);

  // Update progress when files are provided
  useEffect(() => {
    setProgress(files.map(file => {
      // For directory uploads, show the relative path
      let filePath = file.name;
      if (isDirectoryUpload && 'webkitRelativePath' in file) {
        filePath = (file as any).webkitRelativePath || file.name;
      }
      
      return {
        fileName: file.name,
        filePath,
        progress: 0,
        status: 'uploading'
      };
    }));
    setIsComplete(false);
    setIsVisible(true);
    
    // Clear any existing intervals
    progressIntervals.current.forEach(interval => clearInterval(interval));
    progressIntervals.current.clear();
    
    // Clear any existing timers
    if (completionTimer.current) {
      clearTimeout(completionTimer.current);
      completionTimer.current = null;
    }
    
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    
    // Start progress simulation for each file
    files.forEach((file, index) => {
      const interval = setInterval(() => {
        setProgress(prev => {
          const updated = [...prev];
          // Find by fileName since that's what we use as key
          const fileIndex = updated.findIndex(p => p.fileName === file.name);
          
          if (fileIndex !== -1 && updated[fileIndex].status === 'uploading') {
            // Simulate realistic progress (faster at start, slower at end)
            const currentProgress = updated[fileIndex].progress;
            const increment = Math.max(1, 10 - (currentProgress / 10));
            const newProgress = Math.min(currentProgress + increment, 100);
            
            updated[fileIndex] = {
              ...updated[fileIndex],
              progress: newProgress,
              status: newProgress >= 100 ? 'completed' : 'uploading'
            };
          }
          
          return updated;
        });
      }, 200 + Math.random() * 300); // Random interval between 200-500ms
      
      progressIntervals.current.set(file.name, interval);
    });
    
    return () => {
      // Clean up intervals
      progressIntervals.current.forEach(interval => clearInterval(interval));
      progressIntervals.current.clear();
      
      // Clean up timers
      if (completionTimer.current) {
        clearTimeout(completionTimer.current);
        completionTimer.current = null;
      }
      
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
    };
  }, [files, isDirectoryUpload]);

  // Check if all files are completed
  useEffect(() => {
    const allCompleted = progress.every(p => p.status === 'completed' || p.status === 'failed');
    if (allCompleted && progress.length > 0 && !isComplete) {
      setIsComplete(true);
      // Instead of calling onComplete immediately, wait for progress to visually reach 100%
      // and add a small delay for animation to complete
      completionTimer.current = setTimeout(() => {
        // Start the closing animation
        setIsVisible(false);
        // Wait for animation to complete before calling onComplete
        closeTimer.current = setTimeout(() => {
          onComplete();
        }, 300); // Match the CSS transition duration
      }, 500); // 500ms delay to allow visual completion
    }
  }, [progress, isComplete, onComplete]);

  const totalProgress = progress.length > 0 
    ? progress.reduce((sum, p) => sum + p.progress, 0) / progress.length 
    : 0;

  return (
    <div className={`fixed bottom-4 right-4 z-50 w-80 bg-background border border-border rounded-lg shadow-lg transition-all duration-300 ease-in-out ${
      isVisible ? 'transform translate-y-0 opacity-100' : 'transform translate-y-full opacity-0'
    }`}>
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">
            {isDirectoryUpload ? 'Uploading folder to' : 'Uploading to'} {currentPath}
          </h3>
          <button 
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
        
        <div className="w-full bg-secondary rounded-full h-2 mb-4">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300" 
            style={{ width: `${totalProgress}%` }}
          ></div>
        </div>
        
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {progress.map((fileProgress, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="flex-shrink-0 w-4">
                {fileProgress.status === 'uploading' && (
                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                )}
                {fileProgress.status === 'completed' && (
                  <span className="text-green-500">✓</span>
                )}
                {fileProgress.status === 'failed' && (
                  <span className="text-red-500">✗</span>
                )}
              </div>
              <div className="flex-1 truncate">
                {fileProgress.filePath}
              </div>
              <div className="text-muted-foreground">
                {fileProgress.status === 'uploading' && `${Math.round(fileProgress.progress)}%`}
                {fileProgress.status === 'completed' && 'Done'}
                {fileProgress.status === 'failed' && 'Failed'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};