import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import logger from '@/lib/logger'

// Initialize logger
logger.info('Starting Telegram File Server frontend application')

// Check if we're running in Tauri
const isTauri = !!(window as any).__TAURI__
logger.info('Running in Tauri environment', isTauri)

// Test logging
logger.testLogging()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)