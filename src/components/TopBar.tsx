import { ChevronLeft, ChevronRight, ChevronDown, Search, Grid3x3, List, MoreHorizontal, RefreshCw, Download } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface TopBarProps {
  currentPath: string[];
  searchQuery: string;
  viewMode: "grid" | "list";
  onSearchChange: (query: string) => void;
  onViewModeChange: (mode: "grid" | "list") => void;
  onBack: () => void;
  onRefresh: () => void;
  onBreadcrumbClick: (index: number) => void;
  onPaste?: () => void;
  onToggleDownloadQueue?: () => void; // Add this prop
  onToggleSidebar?: () => void; // Add sidebar toggle prop
}

export const TopBar = ({
  currentPath,
  searchQuery,
  viewMode,
  onSearchChange,
  onViewModeChange,
  onBack,
  onRefresh,
  onBreadcrumbClick,
  onPaste,
  onToggleDownloadQueue, // Add this prop
  onToggleSidebar, // Add sidebar toggle prop
}: TopBarProps) => {
  return (
    <div className="backdrop-blur-md bg-background/70 border-b border-border select-none sticky top-0 z-10">
      <div className="flex items-center gap-2 px-4 py-2">
        <div className="flex items-center gap-1">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="h-8 w-8 rounded-lg transition-all duration-200 hover:bg-accent hover:scale-105 md:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8 rounded-lg transition-all duration-200 hover:bg-accent hover:scale-105"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.history.forward()}
            className="h-8 w-8 rounded-lg transition-all duration-200 hover:bg-accent hover:scale-105"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            className="h-8 w-8 rounded-lg transition-all duration-200 hover:bg-accent hover:scale-105"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 flex-1 bg-muted/50 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm transition-all duration-200 hover:bg-muted/70">
          {currentPath.map((folder, index) => (
            <div key={index} className="flex items-center gap-1">
              <button
                onClick={() => onBreadcrumbClick(index)}
                className="hover:text-primary transition-colors px-1 py-0.5 rounded transition-all duration-200 hover:bg-accent/50"
              >
                {folder}
              </button>
              {index < currentPath.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        <div className="relative w-64 transition-all duration-200 hover:scale-[1.02]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${currentPath[currentPath.length - 1]}`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-9 bg-muted/50 border-0 backdrop-blur-sm rounded-lg transition-all duration-200 focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-xs rounded-lg transition-all duration-200 hover:bg-accent hover:scale-105">
            <span>New</span>
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs rounded-lg transition-all duration-200 hover:bg-accent hover:scale-105">
            <span>Sort</span>
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs rounded-lg transition-all duration-200 hover:bg-accent hover:scale-105">
            <span>View</span>
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
          {onPaste && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs rounded-lg transition-all duration-200 hover:bg-accent hover:scale-105"
              onClick={onPaste}
            >
              Paste
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg transition-all duration-200 hover:bg-accent hover:scale-105">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {/* Download button - always render but disable if no handler */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              console.log("Download button clicked");
              onToggleDownloadQueue && onToggleDownloadQueue();
            }}
            className="h-8 w-8 rounded-lg transition-all duration-200 hover:bg-accent hover:scale-105"
            title="Download Queue"
            disabled={!onToggleDownloadQueue}
          >
            <Download className="h-4 w-4" />
          </Button>
          
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onViewModeChange("grid")}
            className="h-8 w-8 rounded-lg transition-all duration-200 hover:bg-accent hover:scale-105"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onViewModeChange("list")}
            className="h-8 w-8 rounded-lg transition-all duration-200 hover:bg-accent hover:scale-105"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};