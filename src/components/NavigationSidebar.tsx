import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, FolderOpen, User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import logger from "@/lib/logger";

interface NavigationSidebarProps {
  className?: string;
}

export const NavigationSidebar = ({ className }: NavigationSidebarProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const isMobile = useIsMobile();
  const location = useLocation();

  // Hide sidebar on mobile by default
  if (isMobile && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-primary text-primary-foreground"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
    );
  }

  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Files", path: "/files", icon: FolderOpen },
    { name: "Profile", path: "/profile", icon: User },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${className || ""} ${isMobile && isOpen ? "fixed inset-y-0 left-0 z-50" : "relative"} w-64 bg-sidebar border-r border-sidebar-border flex flex-col`}>
        <div className="py-4 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold text-sidebar-foreground">File Server</span>
          </div>
        </div>

        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-md transition-colors ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`}
                    onClick={() => isMobile && setIsOpen(false)}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <Button variant="outline" className="w-full justify-start gap-3">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </Button>
        </div>

        {/* Close button for mobile */}
        {isMobile && (
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 p-1 rounded-md hover:bg-sidebar-accent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>
    </>
  );
};