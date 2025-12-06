import { useState, useEffect, useRef } from "react";

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'failed';
  error?: string;
}

interface UploadProgressWidgetProps {
  files: File[];
  currentPath: string;
  onComplete: () => void;
  onCancel: () => void;
}

export const UploadProgressWidget = ({ 
  files, 
  currentPath, 
  onComplete, 
  onCancel 
}: UploadProgressWidgetProps) => {
  const [progress, setProgress] = useState<UploadProgress[]>(
    files.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    }))
  );
  const [isComplete, setIsComplete] = useState(false);
  const progressIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Update progress when files are provided
  useEffect(() => {
    setProgress(files.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    })));
    setIsComplete(false);
    
    // Clear any existing intervals
    progressIntervals.current.forEach(interval => clearInterval(interval));
    progressIntervals.current.clear();
    
    // Start progress simulation for each file
    files.forEach((file, index) => {
      const interval = setInterval(() => {
        setProgress(prev => {
          const updated = [...prev];
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
    };
  }, [files]);

  // Check if all files are completed
  useEffect(() => {
    const allCompleted = progress.every(p => p.status === 'completed' || p.status === 'failed');
    if (allCompleted && progress.length > 0 && !isComplete) {
      setIsComplete(true);
      setTimeout(() => {
        onComplete();
      }, 1000); // Auto-close after 1 second when complete
    }
  }, [progress, isComplete, onComplete]);

  const totalProgress = progress.length > 0 
    ? progress.reduce((sum, p) => sum + p.progress, 0) / progress.length 
    : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-background border border-border rounded-lg shadow-lg">
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">Uploading to {currentPath}</h3>
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
        
        <div className="space-y-2 max-h-60 overflow-y-auto">
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
                {fileProgress.fileName}
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