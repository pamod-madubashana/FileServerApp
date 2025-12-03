# Download System Documentation

## Overview

The download system in this application provides a robust, cross-platform solution for downloading files in both browser and Tauri environments. It includes advanced features like progress tracking, download queuing, retry logic, and persistent history.

## Architecture

The system consists of several key components:

1. **Download Utilities** (`utils.ts`) - Core download functions with cross-platform support
2. **Download Manager** (`downloadManager.ts`) - Centralized download queue and state management
3. **UI Components** - Visual elements for initiating and monitoring downloads
4. **Hooks** - React hooks for integrating download functionality into components

## Key Features

### 1. Cross-Platform Compatibility

The system automatically detects whether it's running in a Tauri environment or a standard browser and uses the appropriate APIs:

- **Tauri Environment**: Uses `@tauri-apps/plugin-dialog` for file selection and `@tauri-apps/plugin-fs` for file writing
- **Browser Environment**: Uses standard browser APIs with `fetch` and `URL.createObjectURL`

### 2. Progress Tracking

Downloads can report real-time progress through an optional callback function:

```typescript
await downloadFile('/path/to/file', 'filename.txt', (progress) => {
  console.log(`Download progress: ${progress}%`);
});
```

### 3. Retry Logic

The system includes automatic retry functionality with exponential backoff:

```typescript
// By default, retries 3 times with increasing delays
await downloadFile('/path/to/file', 'filename.txt');

// Custom retry count
await downloadFile('/path/to/file', 'filename.txt', undefined, 5);
```

### 4. Download Management

The `DownloadManager` class provides centralized control over downloads:

```typescript
import { downloadManager } from '@/lib/downloadManager';

// Add a download to the queue
const downloadId = downloadManager.addDownload('/path/to/file', 'filename.txt');

// Cancel a download
downloadManager.cancelDownload(downloadId);

// Clear completed downloads
downloadManager.clearCompleted();
```

### 5. Persistent History

Download history is automatically saved to localStorage and restored on application startup.

## UI Components

### DownloadButton

A simple button component that initiates a download when clicked:

```tsx
<DownloadButton 
  path="/dl/sample-image.jpg" 
  filename="sample-image.jpg"
>
  Download Image
</DownloadButton>
```

### AdvancedDownloadButton

An enhanced button with progress tracking and status indicators:

```tsx
<AdvancedDownloadButton 
  path="/dl/sample-video.mp4" 
  filename="sample-video.mp4"
>
  Download Video
</AdvancedDownloadButton>
```

### DownloadQueue

A floating panel that displays the status of all downloads:

```tsx
<DownloadQueue />
```

## Hooks

### useDownloadManager

A React hook for integrating download functionality into custom components:

```tsx
import { useDownloadManager } from '@/hooks/useDownloadManager';

const MyComponent = () => {
  const { 
    downloads, 
    stats, 
    hasActiveDownloads, 
    addDownload, 
    cancelDownload 
  } = useDownloadManager();

  return (
    <div>
      <p>Total downloads: {stats.total}</p>
      <button onClick={() => addDownload('/path/file.txt', 'file.txt')}>
        Download File
      </button>
    </div>
  );
};
```

## Integration Guide

### Adding Download Functionality to a Component

1. Import the necessary components or hooks:

```tsx
import { downloadFile } from '@/lib/utils';
import { downloadManager } from '@/lib/downloadManager';
```

2. Use the download function:

```tsx
const handleDownload = async () => {
  try {
    // Add to download manager for tracking
    downloadManager.addDownload('/path/to/file', 'filename.txt');
    
    // Perform the download
    await downloadFile('/path/to/file', 'filename.txt');
  } catch (error) {
    console.error('Download failed:', error);
  }
};
```

### Customizing Download Behavior

You can customize various aspects of the download system:

1. **Maximum Concurrent Downloads**: Modify the `maxConcurrentDownloads` property in `DownloadManager`
2. **Retry Count**: Pass a custom retry count to `downloadFile`
3. **Progress Callback**: Provide a progress callback to track download progress

## Error Handling

The system provides comprehensive error handling:

- Network errors are caught and retried automatically
- File system errors are reported to the user
- Failed downloads can be retried manually through the UI

## Performance Considerations

- Downloads are queued to prevent overwhelming the system
- Large files are streamed to minimize memory usage
- Progress updates are throttled to prevent UI lag

## Future Enhancements

Planned improvements include:

- Pause/resume functionality
- Download scheduling
- Bandwidth limiting
- Integration with system download managers