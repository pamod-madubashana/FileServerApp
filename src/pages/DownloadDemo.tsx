import React from 'react';
import DownloadButton from '../components/DownloadButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const DownloadDemo: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>File Download Demo</CardTitle>
          <CardDescription>
            This demo shows how to use the downloadFile utility function in both browser and Tauri environments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Example Downloads</h3>
            
            <div className="flex flex-col gap-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Sample Image</h4>
                  <p className="text-sm text-muted-foreground">Downloads a sample image file</p>
                </div>
                <DownloadButton 
                  path="/dl/sample-image.jpg" 
                  filename="sample-image.jpg"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Sample Document</h4>
                  <p className="text-sm text-muted-foreground">Downloads a sample PDF document</p>
                </div>
                <DownloadButton 
                  path="/dl/sample-document.pdf" 
                  filename="sample-document.pdf"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Sample Video</h4>
                  <p className="text-sm text-muted-foreground">Downloads a sample video file</p>
                </div>
                <DownloadButton 
                  path="/dl/sample-video.mp4" 
                  filename="sample-video.mp4"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Implementation Details</h3>
            <div className="text-sm space-y-2">
              <p>
                The <code className="bg-muted px-1 rounded">downloadFile</code> function automatically detects whether 
                it's running in a Tauri environment or a browser and uses the appropriate APIs:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>In Tauri: Uses <code className="bg-muted px-1 rounded">@tauri-apps/plugin-dialog</code> for file selection and <code className="bg-muted px-1 rounded">@tauri-apps/plugin-fs</code> for file writing</li>
                <li>In Browser: Uses standard browser APIs with <code className="bg-muted px-1 rounded">fetch</code> and <code className="bg-muted px-1 rounded">URL.createObjectURL</code></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DownloadDemo;