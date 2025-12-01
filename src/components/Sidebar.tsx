import { useState } from "react";
import { FileText, Image, Music, Video, Mic, FolderOpen } from "lucide-react";
import { FileItem } from "./types";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarProps {
  currentPath: string[];
  onNavigate: (filter: string) => void;
  onDrop: (item: any, targetFolder: string) => void;
  files: FileItem[];
  selectedFilter: string;
}

export const Sidebar = ({ currentPath, onNavigate, onDrop, files, selectedFilter }: SidebarProps) => {
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleDragOver = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(folderPath);
  };

  const handleDragLeave = () => {
    setDragOverFolder(null);
  };

  const handleDrop = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const itemData = e.dataTransfer.getData("application/json");
      if (itemData) {
        const item = JSON.parse(itemData);
        onDrop(item, folderPath);
      }
    } catch (error) {
      console.error("Failed to parse dropped item:", error);
    }

    setDragOverFolder(null);
  };

  const filters = [
    { name: "Home", icon: FolderOpen, filter: "all" },
    { name: "Images", icon: Image, filter: "photo" },
    { name: "Documents", icon: FileText, filter: "document" },
    { name: "Videos", icon: Video, filter: "video" },
    { name: "Audio", icon: Music, filter: "audio" },
    { name: "Voice Messages", icon: Mic, filter: "voice" },
  ];

  // Hide sidebar on mobile since NavigationSidebar will be used instead
  if (isMobile) {
    return null;
  }

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col relative select-none">
      <div className="py-4 px-4 border-b border-sidebar-border flex items-center">
        <div 
          className="rounded-full bg-primary p-1.5 cursor-pointer" 
          onClick={() => {
            // Dispatch event to toggle Navigation sidebar
            const event = new CustomEvent('toggleNavigationSidebar');
            window.dispatchEvent(event);
          }}
          data-sidebar-trigger="true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-primary-foreground">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sidebar-foreground text-lg">File Server</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {filters.map((filter) => {
          const Icon = filter.icon;
          const isActive = selectedFilter === filter.filter;
          const isDragOver = dragOverFolder === filter.filter;

          return (
            <button
              key={filter.filter}
              onClick={() => onNavigate(filter.filter)}
              onDragOver={(e) => handleDragOver(e, filter.filter)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, filter.filter)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                } ${isDragOver ? "ring-2 ring-primary ring-inset" : ""}`}
            >
              <Icon className="w-4 h-4" />
              <span>{filter.name}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};