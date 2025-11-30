import { BrowserRouter, HashRouter } from 'react-router-dom';
import { ReactNode } from 'react';

// Detect if running in Tauri
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Adaptive Router: HashRouter in Tauri, BrowserRouter in web
interface AdaptiveRouterProps {
  children: ReactNode;
}

export const AdaptiveRouter = ({ children }: AdaptiveRouterProps) => {
  const Router = isTauri() ? HashRouter : BrowserRouter;
  return <Router>{children}</Router>;
};