// src/lib/logger.ts
let log: typeof import('@tauri-apps/plugin-log') | null = null;
let isTauriEnv = false;
let logReady: Promise<void> | null = null;

// Check if we're running in Tauri
if (typeof window !== 'undefined' && (window as any).__TAURI__) {
  isTauriEnv = true;
  // Dynamically import the Log plugin only in Tauri environment
  logReady = import('@tauri-apps/plugin-log').then((module) => {
    log = module;
    console.log('[Logger] Tauri Log plugin loaded successfully');
  }).catch((error) => {
    console.error('[Logger] Failed to load Tauri Log plugin:', error);
    logReady = null;
  });
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

const formatMessage = (level: string, message: string, data?: any): string => {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level}] ${message}`;
  return data ? `${formattedMessage} ${JSON.stringify(data)}` : formattedMessage;
};

export const logger = {
  debug: async (message: string, data?: any) => {
    const formattedMessage = formatMessage(LogLevel.DEBUG, message, data);
    console.debug(formattedMessage);
    
    if (isTauriEnv && log) {
      try {
        if (logReady) await logReady;
        log.debug(formattedMessage);
      } catch (e) {
        console.error('[Logger] Error with Tauri debug logging:', e);
      }
    }
  },
  
  info: async (message: string, data?: any) => {
    const formattedMessage = formatMessage(LogLevel.INFO, message, data);
    console.info(formattedMessage);
    
    if (isTauriEnv && log) {
      try {
        if (logReady) await logReady;
        log.info(formattedMessage);
      } catch (e) {
        console.error('[Logger] Error with Tauri info logging:', e);
      }
    }
  },
  
  warn: async (message: string, data?: any) => {
    const formattedMessage = formatMessage(LogLevel.WARN, message, data);
    console.warn(formattedMessage);
    
    if (isTauriEnv && log) {
      try {
        if (logReady) await logReady;
        log.warn(formattedMessage);
      } catch (e) {
        console.error('[Logger] Error with Tauri warn logging:', e);
      }
    }
  },
  
  error: async (message: string, data?: any) => {
    const formattedMessage = formatMessage(LogLevel.ERROR, message, data);
    console.error(formattedMessage);
    
    if (isTauriEnv && log) {
      try {
        if (logReady) await logReady;
        log.error(formattedMessage);
      } catch (e) {
        console.error('[Logger] Error with Tauri error logging:', e);
      }
    }
  }
};

export default logger;