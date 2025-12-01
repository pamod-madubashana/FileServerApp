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
  const manuallyOpenedRef = useRef(false); // Track if sidebar was manually opened
  const hasBeenOpenedRef = useRef(false); // Track if sidebar has ever been opened

  // Update ref when state changes
  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      hasBeenOpenedRef.current = true;
    }
  }, [isOpen]);

  // Close sidebar when resizing from mobile to desktop, but keep it open on profile/settings pages
  useEffect(() => {
    const handleResize = () => {
      // Automatically open sidebar when on profile or settings pages
      if ((location.pathname === '/profile' || location.pathname === '/settings') && !isOpenRef.current) {
        manuallyOpenedRef.current = false; // Reset manual flag when auto-opening
        setIsOpen(true);
      }
      // Keep sidebar open on profile or settings pages, regardless of device size
      // But only close if it was not manually opened
      else if (!manuallyOpenedRef.current && !isMobile && isOpenRef.current && location.pathname !== '/profile' && location.pathname !== '/settings') {
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isMobile, location.pathname]);

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
    } else if (path) {
      navigate(path);
    }
    
    // Close sidebar on mobile after navigation
    if (isMobile) {
      setIsOpen(false);
    }
  };

  // For mobile/desktop behavior - keep sidebar open on profile/settings pages
  useEffect(() => {
    // Automatically open sidebar when navigating to profile or settings pages
    if ((location.pathname === '/profile' || location.pathname === '/settings') && !isOpen) {
      manuallyOpenedRef.current = false; // Reset manual flag when auto-opening
      setIsOpen(true);
    }
    // Close sidebar when navigating away from profile/settings pages to other pages
    // But only if it was not manually opened
    else if (!manuallyOpenedRef.current && location.pathname !== '/profile' && location.pathname !== '/settings' && isOpen) {
      setIsOpen(false);
    }
    // Reset manual flag when closing sidebar automatically
    else if (!isOpen) {
      manuallyOpenedRef.current = false;
    }
  }, [isMobile, location.pathname, isOpen]);
  
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

  // Notify when sidebar closes
  useEffect(() => {
    // Only redirect if the sidebar has actually been opened and then closed
    // Redirect when sidebar closes while on profile or settings pages
    if (hasBeenOpenedRef.current && !isOpen && (location.pathname === '/profile' || location.pathname === '/settings')) {
      // When sidebar closes while on profile or settings page, redirect to home
      navigate("/");
    }
  }, [isOpen, location.pathname, navigate]);

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
              <button 
                onClick={() => {
                  // Don't close sidebar when on profile or settings pages
                  if (location.pathname === '/profile' || location.pathname === '/settings') {
                    return;
                  }
                  setIsOpen(false);
                }}
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