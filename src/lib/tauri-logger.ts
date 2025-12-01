// Tauri-based logger that calls Rust commands directly
import { invoke } from '@tauri-apps/api/core';

// Check if we're running in Tauri
const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;

export const tauriLogger = {
  debug: async (message: string) => {
    if (isTauri) {
      try {
        await invoke('log_debug', { message });
      } catch (error) {
        console.debug(`[Fallback] ${message}`);
      }
    } else {
      console.debug(`[Web] ${message}`);
    }
  },
  
  info: async (message: string) => {
    if (isTauri) {
      try {
        await invoke('log_info', { message });
      } catch (error) {
        console.info(`[Fallback] ${message}`);
      }
    } else {
      console.info(`[Web] ${message}`);
    }
  },
  
  warn: async (message: string) => {
    if (isTauri) {
      try {
        await invoke('log_warn', { message });
      } catch (error) {
        console.warn(`[Fallback] ${message}`);
      }
    } else {
      console.warn(`[Web] ${message}`);
    }
  },
  
  error: async (message: string) => {
    if (isTauri) {
      try {
        await invoke('log_error', { message });
      } catch (error) {
        console.error(`[Fallback] ${message}`);
      }
    } else {
      console.error(`[Web] ${message}`);
    }
  }
};

export default tauriLogger;