import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, FolderOpen, User, Settings, LogOut, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import logger from "@/lib/logger";
import { api } from "@/lib/api";

interface NavigationSidebarProps {
  className?: string;
}

export const NavigationSidebar = ({ className }: NavigationSidebarProps) => {
  // Initialize sidebar as closed by default
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const isOpenRef = useRef(isOpen);
  const location = useLocation();
  const navigate = useNavigate();
  const manuallyOpenedRef = useRef(false); // Track if sidebar was manually opened
  const isAutoOpenedRef = useRef(false); // Track if sidebar was auto-opened for profile/settings
  const hasBeenOpenedRef = useRef(false); // Track if sidebar has ever been opened

  // Update ref when state changes
  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      hasBeenOpenedRef.current = true;
    }
  }, [isOpen]);

  // Check if user is owner - now with dependency on location to recheck on navigation
  useEffect(() => {
    const checkOwnerStatus = async () => {
      try {
        const response = await api.isUserOwner();
        setIsOwner(response.is_owner);
      } catch (error) {
        logger.error("Failed to check owner status:", error);
        setIsOwner(false);
      }
    };

    checkOwnerStatus();
  }, [location]); // Re-run when location changes

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

  // List of pages that should keep the navigation sidebar open
  const pagesWithSidebarOpen = ['/profile', '/settings', '/users'];
  
  // Automatically open sidebar when on specific pages
  useEffect(() => {
    if (pagesWithSidebarOpen.includes(location.pathname)) {
      setIsOpen(true);
      // Mark as auto-opened to distinguish from manual opening
      isAutoOpenedRef.current = true;
    } else {
      // Reset auto-opened flag when not on specified pages
      isAutoOpenedRef.current = false;
    }
  }, [location.pathname]);

  const toggleSidebar = () => {
    manuallyOpenedRef.current = true;
    isAutoOpenedRef.current = false; // Reset auto-opened flag
    setIsOpen(!isOpen);
  };

  const baseNavItems = [
    { name: "Profile", path: "/profile", icon: User },
    { name: "Settings", path: "/settings", icon: Settings },
    { name: "Usage", path: "/usage", icon: Info },
  ];

  const ownerNavItems = [
    { name: "Users", path: "/users", icon: User },
  ];

  const navItems = isOwner ? [...baseNavItems, ...ownerNavItems] : baseNavItems;

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
    } else if (item === "Users") {
      // Dispatch event to show users in file explorer area
      const event = new CustomEvent('showUsers');
      window.dispatchEvent(event);
      // Also navigate to the users route
      navigate("/users");
    } else if (item === "Logout") {
      // Handle logout
      handleLogout();
    } else if (path) {
      navigate(path);
    }
    
    // Close sidebar on mobile after navigation
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      // Redirect to login page after successful logout
      navigate("/login");
    } catch (error) {
      // Still redirect to login page even if logout API call fails
      navigate("/login");
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
    const handleToggleEvent = (event: CustomEvent) => {
      // Check if this is a close action
      if (event.detail && event.detail.action === 'close') {
        // Close the sidebar
        setIsOpen(false);
      } else {
        // Normal toggle behavior
        manuallyOpenedRef.current = true;
        isAutoOpenedRef.current = false; // Reset auto-opened flag
        setIsOpen(!isOpenRef.current);
      }
    };

    window.addEventListener("toggleNavigationSidebar", handleToggleEvent as EventListener);
    return () => {
      window.removeEventListener("toggleNavigationSidebar", handleToggleEvent as EventListener);
    };
  }, []);

  // Handle showFiles event to close sidebar when profile/settings are closed
  useEffect(() => {
    const handleShowFiles = () => {
      // Close sidebar when returning to file view from profile/settings
      setIsOpen(false);
      // Reset flags when profile/settings are closed
      manuallyOpenedRef.current = false;
      isAutoOpenedRef.current = false;
    };

    window.addEventListener('showFiles', handleShowFiles);
    return () => {
      window.removeEventListener('showFiles', handleShowFiles);
    };
  }, []);

  // Handle clicks outside the sidebar to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen) {
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
        
        // Close sidebar when clicking outside (but not on mobile)
        // Only close if it was manually opened, not auto-opened for profile/settings
        if (!isMobile && manuallyOpenedRef.current && !isAutoOpenedRef.current) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isMobile]);

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
                // Close sidebar on mobile overlay click
                // Only close if it was manually opened, not auto-opened for profile/settings
                if (!isAutoOpenedRef.current) {
                  setIsOpen(false);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
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
              "fixed left-0 top-0 z-50 h-full bg-sidebar/80 backdrop-blur-md shadow-xl select-none border-r border-sidebar-border/50",
              isMobile 
                ? "w-64" 
                : "w-64"
            )}
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300, duration: 0.3 }}
            data-navigation-sidebar="true"
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between border-b border-sidebar-border py-3 px-4"
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
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
            <nav 
              className="py-2"
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {navItems.map((item, index) => (
                item.name !== "Logout" && (
                  <button
                    key={item.name}
                    onClick={() => handleMenuClick(item.name, item.path)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent hover:scale-[1.02] rounded-lg"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </button>
                )
              ))}
              {/* Logout button - positioned near the bottom but not at the very end */}
              <div className="pt-4 mt-4 border-t border-sidebar-border">
                <button
                  onClick={() => handleMenuClick("Logout")}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent hover:scale-[1.02] rounded-lg"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};