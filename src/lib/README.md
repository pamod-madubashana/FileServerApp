# Frontend Utilities

This directory contains various utility functions and helpers used throughout the application.

## Download Utilities

The `download-utils.ts` file provides a universal file download function that works in both Tauri desktop apps and web browsers.

### Features

- Automatic environment detection (Tauri vs Browser)
- Native save dialogs in both environments
- Efficient handling of large files
- Support for all file types
- Comprehensive error handling

### Usage

```typescript
import { downloadFile } from './download-utils';

// Download a file from a relative path
await downloadFile('/dl/document.pdf', 'document.pdf');

// Download a file from a full URL
await downloadFile('https://example.com/files/image.jpg', 'image.jpg');
```

### How It Works

#### Tauri Implementation
1. Shows a native save dialog using `@tauri-apps/plugin-dialog`
2. Fetches the file using `@tauri-apps/plugin-http` for better performance
3. Writes the file to disk using `@tauri-apps/plugin-fs`

#### Browser Implementation
1. Uses the standard browser download mechanism
2. Fetches the file using the browser's native `fetch` API
3. Creates a Blob and uses `URL.createObjectURL` for download

### Requirements

For Tauri apps, ensure the following permissions are added to `src-tauri/capabilities/default.json`:

```json
{
  "permissions": [
    "dialog:allow-save",
    "fs:allow-write-file",
    "fs:allow-read-file",
    "http:allow-fetch",
    "http:allow-fetch-send",
    "http:allow-fetch-read-body"
  ]
}
```