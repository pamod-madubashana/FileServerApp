import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, FolderOpen, User, Settings, LogOut, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import logger from "@/lib/logger";

interface NavigationSidebarProps {
  className?: string;
}

export const NavigationSidebar = ({ className }: NavigationSidebarProps) => {
  // Initialize sidebar as closed by default
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(isOpen);
  const location = useLocation();
  const navigate = useNavigate();
  const manuallyOpenedRef = useRef(false); // Track if sidebar was manually opened
  const hasBeenOpenedRef = useRef(false); // Track if sidebar has ever been opened

  // Update ref when state changes
  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      hasBeenOpenedRef.current = true;
    }
  }, [isOpen]);

  // Close sidebar when resizing from mobile to desktop
  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 768; // Standard mobile breakpoint
      
      // Close sidebar when switching to desktop mode unless manually opened
      if (!newIsMobile && !manuallyOpenedRef.current) {
        setIsOpen(false);
      }
      // Close sidebar on mobile unless manually opened
      else if (newIsMobile && !manuallyOpenedRef.current) {
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const toggleSidebar = () => {
    manuallyOpenedRef.current = true;
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
      // Dispatch event to show profile in file explorer area
      const event = new CustomEvent('showProfile');
      window.dispatchEvent(event);
      // Also navigate to the profile route
      navigate("/profile");
    } else if (item === "Settings") {
      // Dispatch event to show settings in file explorer area
      const event = new CustomEvent('showSettings');
      window.dispatchEvent(event);
      // Also navigate to the settings route
      navigate("/settings");
    } else if (path) {
      navigate(path);
    }
    
    // Close sidebar on mobile after navigation
    if (isMobile) {
      setIsOpen(false);
    }
  };

  // For mobile/desktop behavior
  useEffect(() => {
    // Close sidebar on mobile unless manually opened
    if (isMobile && !manuallyOpenedRef.current) {
      setIsOpen(false);
    }
  }, [isMobile]);

  // Handle manual toggle events
  useEffect(() => {
    const handleToggleEvent = () => {
      manuallyOpenedRef.current = true;
      setIsOpen(!isOpenRef.current);
    };

    window.addEventListener("toggleNavigationSidebar", handleToggleEvent);
    return () => {
      window.removeEventListener("toggleNavigationSidebar", handleToggleEvent);
    };
  }, []);

  // Handle clicks outside the sidebar to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && !isMobile) {
        // Get the sidebar element
        const sidebar = document.querySelector('[data-navigation-sidebar]');
        if (sidebar && sidebar.contains(event.target as Node)) {
          return; // Don't close if clicking inside the sidebar
        }
        
        // Check if the click was on the profile trigger icon
        const profileTrigger = document.querySelector('[data-sidebar-trigger]');
        if (profileTrigger && profileTrigger.contains(event.target as Node)) {
          return; // Don't close if clicking the profile trigger icon
        }
        
        // Don't close sidebar when on profile or settings pages
        if (location.pathname === '/profile' || location.pathname === '/settings') {
          return;
        }
        
        // Close sidebar when clicking outside
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isMobile, location.pathname]);

  // Add data attribute to identify this sidebar component
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
              onClick={() => {
                // Don't close sidebar when on profile or settings pages
                if (location.pathname === '/profile' || location.pathname === '/settings') {
                  return;
                }
                setIsOpen(false);
              }}
            />
          )}
        </AnimatePresence>
      )}

      {/* Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={cn(
              "fixed left-0 top-0 z-50 h-full bg-sidebar shadow-lg select-none",
              isMobile 
                ? "w-64" 
                : "w-64"
            )}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            data-navigation-sidebar="true"
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