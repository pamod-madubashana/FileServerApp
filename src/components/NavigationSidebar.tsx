import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, FolderOpen, User, Settings, LogOut, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import logger from "@/lib/logger";

interface NavigationSidebarProps {
  className?: string;
}

export const NavigationSidebar = ({ className }: NavigationSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(isOpen);
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();

  // Update ref when state changes
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Close sidebar when resizing from mobile to desktop
  useEffect(() => {
    const handleResize = () => {
      if (!isMobile && isOpenRef.current) {
        setIsOpen(false);
      }
    };

    // Listen for toggle event from the header icon
    const handleToggleEvent = () => {
      setIsOpen(!isOpenRef.current);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("toggleNavigationSidebar", handleToggleEvent);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("toggleNavigationSidebar", handleToggleEvent);
    };
  }, [isMobile]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Files", path: "/files", icon: FolderOpen },
    { name: "Profile", path: "/profile", icon: User },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  const handleMenuClick = (item: string, path?: string) => {
    if (item === "Profile") {
      navigate("/profile");
    } else if (path) {
      navigate(path);
    } else {
      console.log(`${item} clicked`);
    }
    
    if (isMobile) {
      setIsOpen(false);
    }
  };

  // For mobile/desktop behavior
  useEffect(() => {
    if (!isMobile) {
      setIsOpen(false);
    }
  }, [isMobile]);

  // Handle clicks outside the sidebar to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && !isMobile) {
        // Close sidebar when clicking outside, but not on the profile icon
        const profileIcon = document.querySelector('.rounded-full.bg-primary.p-1.5.cursor-pointer');
        if (profileIcon && profileIcon.contains(event.target as Node)) {
          return; // Don't close if clicking the profile icon
        }
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isMobile]);

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="fixed inset-0 z-40 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
          )}
        </AnimatePresence>
      )}

      {/* Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={cn(
              "fixed left-0 top-0 z-50 h-full bg-sidebar shadow-lg",
              isMobile 
                ? "w-64" 
                : "w-80"
            )}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-sidebar-border py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary p-1.5">
                  <User className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold text-sidebar-foreground">User Profile</h2>
                  <p className="text-sm text-muted-foreground">Online</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 hover:bg-sidebar-accent"
              >
                <X className="h-5 w-5 text-sidebar-foreground" />
              </button>
            </div>

            {/* Menu Items */}
            <nav className="py-2">
              <button
                onClick={() => handleMenuClick("Profile", "/profile")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </button>
              <button
                onClick={() => handleMenuClick("Settings", "/settings")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
              <button
                onClick={() => handleMenuClick("Usage")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
              >
                <Info className="h-4 w-4" />
                <span>Usage</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};