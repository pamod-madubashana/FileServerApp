import { Toaster } from "@/components/ui/toaster";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation } from "react-router-dom";
import { AdaptiveRouter } from "@/lib/router-config";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import logger from "@/lib/logger";

const queryClient = new QueryClient();

// Debug component to log current route
const RouteDebugger = () => {
  const location = useLocation();
  logger.info("Current route", location.pathname);
  return null;
};

const AppRoutes = () => {
  logger.info("Rendering AppRoutes component");
  return (
    <>
      <RouteDebugger />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/" element={<Index />} />
        {/* Handle dynamic paths for file explorer */}
        <Route path="/:path/*" element={<Index />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  logger.info("Initializing App component");
  
  useEffect(() => {
    // Check system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
        logger.info("Dark mode enabled");
      } else {
        document.documentElement.classList.remove('dark');
        logger.info("Light mode enabled");
      }
    };

    // Initial check
    handleChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AdaptiveRouter>
          <div className="flex flex-col min-h-screen bg-background text-foreground">
            <AppRoutes />
            <Toaster />
            <Sonner />
          </div>
        </AdaptiveRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;