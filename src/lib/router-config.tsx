import { BrowserRouter, HashRouter } from 'react-router-dom';
import { ReactNode } from 'react';
import logger from '@/lib/logger';

// Detect if running in Tauri
export const isTauri = (): boolean => {
  const result = typeof window !== 'undefined' && '__TAURI__' in window;
  logger.info("Tauri detection", { isTauri: result });
  return result;
};

// Adaptive Router: HashRouter in Tauri, BrowserRouter in web
interface AdaptiveRouterProps {
  children: ReactNode;
}

export const AdaptiveRouter = ({ children }: AdaptiveRouterProps) => {
  const isTauriEnv = isTauri();
  logger.info("Using router", { router: isTauriEnv ? "HashRouter" : "BrowserRouter" });
  const Router = isTauriEnv ? HashRouter : BrowserRouter;
  return <Router>{children}</Router>;
};