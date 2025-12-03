import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { DownloadIcon } from 'lucide-react';
import { downloadFile } from '../lib/utils';
import { downloadManager } from '../lib/downloadManager';

/**
 * A simple example component demonstrating how to use the downloadFile function
 */
const DownloadExample: React.FC = () => {
  const handleDownloadImage = async () => {
    try {
      // Add to download manager
      downloadManager.addDownload('/dl/sample-image.jpg', 'sample-image.jpg');
      
      // Example: Download an image file
      await downloadFile('/dl/sample-image.jpg', 'sample-image.jpg');
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDownloadDocument = async () => {
    try {
      // Add to download manager
      downloadManager.addDownload('/dl/sample-document.pdf', 'sample-document.pdf');
      
      // Example: Download a document file
      await downloadFile('/dl/sample-document.pdf', 'sample-document.pdf');
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDownloadVideo = async () => {
    try {
      // Add to download manager
      downloadManager.addDownload('/dl/sample-video.mp4', 'sample-video.mp4');
      
      // Example: Download a video file
      await downloadFile('/dl/sample-video.mp4', 'sample-video.mp4');
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Download Example</CardTitle>
        <CardDescription>
          Click the buttons below to download sample files using the cross-platform download function.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          <Button onClick={handleDownloadImage} className="w-full">
            <DownloadIcon className="mr-2 h-4 w-4" />
            Download Sample Image
          </Button>
          
          <Button onClick={handleDownloadDocument} variant="secondary" className="w-full">
            <DownloadIcon className="mr-2 h-4 w-4" />
            Download Sample Document
          </Button>
          
          <Button onClick={handleDownloadVideo} variant="outline" className="w-full">
            <DownloadIcon className="mr-2 h-4 w-4" />
            Download Sample Video
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground mt-4">
          <p className="font-medium mb-2">How it works:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Automatically detects Tauri vs browser environment</li>
            <li>Uses appropriate APIs for each platform</li>
            <li>Handles large files efficiently</li>
            <li>Works with any file type</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default DownloadExample;