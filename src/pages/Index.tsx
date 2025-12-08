import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { FileExplorer } from "@/components/FileExplorer";
import { AuthWrapper } from "@/components/AuthWrapper";
import Downloads from "./Downloads";
import logger from "@/lib/logger";

const Index = () => {
  const location = useLocation();
  const [showDownloads, setShowDownloads] = useState(false);

  useEffect(() => {
    // Check if we should show the downloads page
    if (location.pathname === '/downloads') {
      setShowDownloads(true);
    } else {
      setShowDownloads(false);
    }
    
    // Listen for custom events to show/hide downloads
    const handleShowDownloads = () => setShowDownloads(true);
    const handleShowFiles = () => setShowDownloads(false);
    
    window.addEventListener('showDownloads', handleShowDownloads);
    window.addEventListener('showFiles', handleShowFiles);
    
    return () => {
      window.removeEventListener('showDownloads', handleShowDownloads);
      window.removeEventListener('showFiles', handleShowFiles);
    };
  }, [location.pathname]);

  logger.info("Index page rendered");
  return (
    <AuthWrapper>
      <div className="flex h-screen bg-background select-none">
        <div className="flex-1 flex flex-col overflow-hidden">
          {showDownloads ? <Downloads /> : <FileExplorer />}
        </div>
      </div>
    </AuthWrapper>
  );
};

export default Index;