# Cross-Platform File Download Utility

This utility provides a reusable TypeScript function `downloadFile` that works seamlessly in both browser and Tauri environments.

## Features

- ✅ Works in both browser and Tauri 2.x environments
- ✅ Handles large files efficiently
- ✅ Supports all file types (images, videos, documents, archives, etc.)
- ✅ Proper error handling
- ✅ Asks user where to save files in Tauri (uses native save dialog)
- ✅ Triggers standard browser download dialog in web environments
- ✅ Reusable across any TypeScript project

## Installation

Ensure you have the required dependencies installed:

```bash
npm install @tauri-apps/plugin-dialog @tauri-apps/plugin-fs @tauri-apps/plugin-http
```

## Tauri Configuration

### Capabilities

Add these permissions to your `src-tauri/capabilities/default.json`:

```json
{
  "permissions": [
    "dialog:default",
    "fs:default",
    "fs:write-all",
    "fs:read-all",
    "http:allow-fetch",
    "http:allow-fetch-send",
    "http:allow-fetch-read-body",
    "http:allow-fetch-cancel"
  ]
}
```

## Usage

### Basic Usage

```typescript
import { downloadFile } from './utils';

// Download a file
await downloadFile('/dl/Photo_AgADogxrGwUVGVU.jpg', 'my-photo.jpg');

// Or with full URL
await downloadFile('http://localhost:8000/dl/document.pdf', 'document.pdf');
```

### Function Signature

```typescript
async function downloadFile(path: string, filename: string): Promise<void>
```

**Parameters:**
- `path`: The URL path to the file (can be relative or absolute)
- `filename`: The name to save the file as

**Returns:** A Promise that resolves when the download is complete or rejects with an error.

## How It Works

### Browser Environment Detection

The function automatically detects the environment:

```typescript
if (typeof window !== 'undefined' && window.__TAURI__) {
  // Tauri environment
} else {
  // Browser environment
}
```

### Browser Implementation

1. Uses `fetch()` to retrieve the file
2. Converts response to Blob
3. Creates object URL with `URL.createObjectURL()`
4. Triggers download with temporary anchor element

### Tauri Implementation

1. Uses `@tauri-apps/plugin-dialog` to show save dialog
2. Uses `@tauri-apps/plugin-http` to fetch the file
3. Uses `@tauri-apps/plugin-fs` to write file to disk

## Components

### DownloadButton

A ready-to-use button component:

```tsx
import DownloadButton from '../components/DownloadButton';

<DownloadButton 
  path="/dl/sample-image.jpg" 
  filename="sample-image.jpg"
>
  Download Image
</DownloadButton>
```

### DownloadContextItem

A context menu item for downloading files:

```tsx
import DownloadContextItem from '../components/DownloadContextItem';

<ContextMenu>
  <ContextMenuTrigger>Right click me</ContextMenuTrigger>
  <ContextMenuContent>
    <DownloadContextItem 
      path="/dl/document.pdf" 
      filename="document.pdf" 
    />
  </ContextMenuContent>
</ContextMenu>
```

## Error Handling

The function includes comprehensive error handling for:
- Network errors
- HTTP errors (non-2xx responses)
- File system errors (in Tauri)
- User cancellation (in Tauri)

All errors are thrown as JavaScript Error objects with descriptive messages.

## Large File Support

The implementation handles large files efficiently by:
- Using `arrayBuffer()` for binary data transfer
- Streaming data directly to disk in Tauri
- Using Blob URLs in browsers to avoid memory issues

## Supported File Types

Works with any file type:
- Images (JPEG, PNG, GIF, etc.)
- Videos (MP4, WebM, etc.)
- Documents (PDF, DOCX, etc.)
- Archives (ZIP, TAR, etc.)
- Any other binary file format

## Customization

You can customize the behavior by modifying the `downloadFile` function in `src/lib/utils.ts`:
- Change the file dialog filters
- Modify error handling
- Add progress tracking
- Implement retry logic

## Integration Example

Here's how to integrate the download functionality into an existing component:

```typescript
const handleDownload = async (item: FileItem) => {
  try {
    const baseUrl = getApiBaseUrl();
    const fileName = item.name;
    const downloadUrl = baseUrl 
      ? `${baseUrl}/dl/${fileName}` 
      : `/dl/${fileName}`;
    
    // Use our unified download function
    await downloadFile(downloadUrl, item.name);
  } catch (error) {
    console.error("Failed to download file:", error);
    // Handle error appropriately
  }
};
```

## Troubleshooting

### Tauri Modules Not Loading

Ensure the Tauri plugins are properly installed and the capabilities are configured correctly.

### Permission Errors

Check that all required permissions are added to the capabilities file.

### Network Errors

Verify that the URL is accessible and CORS is properly configured if needed.

## API Reference

### `downloadFile(path: string, filename: string): Promise<void>`

Main download function that works in both environments.

### `downloadFileTauri(url: string, filename: string): Promise<void>`

Internal function for Tauri-specific downloads.

### `downloadFileBrowser(url: string, filename: string): Promise<void>`

Internal function for browser-specific downloads.

### `getFileExtension(filename: string): string`

Utility function to extract file extension.