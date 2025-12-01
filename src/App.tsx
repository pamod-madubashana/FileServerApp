import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import { NavigationSidebar } from "@/components/NavigationSidebar";
import { AuthWrapper } from "@/components/AuthWrapper";
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
        <Route path="/settings" element={<Index />} />
        <Route path="/profile" element={<Index />} />
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
      <BrowserRouter>
        <div className="flex h-screen bg-background select-none">
          <NavigationSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <AppRoutes />
            <Toaster />
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;