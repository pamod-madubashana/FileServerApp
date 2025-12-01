import { useState, useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { User, Settings, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TelegramSidebarProps {
  className?: string;
}

export const TelegramSidebar = ({ className }: TelegramSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(isOpen);
  const isMobile = useIsMobile();

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
    window.addEventListener("toggleTelegramSidebar", handleToggleEvent);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("toggleTelegramSidebar", handleToggleEvent);
    };
  }, [isMobile]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  // Since we're placing the icon directly in the header, we don't need a separate click handler here
  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSidebar();
  };

  // Remove the exposed toggle function since we're using events

  const handleMenuClick = (item: string) => {
    console.log(`${item} clicked`);
    if (isMobile) {
      setIsOpen(false);
    }
  };

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
                onClick={() => handleMenuClick("Profile")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </button>
              <button
                onClick={() => handleMenuClick("Settings")}
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