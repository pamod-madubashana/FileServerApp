import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { downloadManager } from '../lib/downloadManager';
import { useDownloadManager } from '../hooks/useDownloadManager';

const TestDownload: React.FC = () => {
  const { downloads, stats, addDownload } = useDownloadManager();
  const [url, setUrl] = React.useState('/dl/sample-image.jpg');
  const [filename, setFilename] = React.useState('sample-image.jpg');

  const handleAddDownload = () => {
    if (url && filename) {
      addDownload(url, filename);
    }
  };

  const handleAddSampleDownloads = () => {
    addDownload('/dl/sample-image.jpg', 'sample-image.jpg');
    addDownload('/dl/sample-document.pdf', 'sample-document.pdf');
    addDownload('/dl/sample-video.mp4', 'sample-video.mp4');
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Download Test</CardTitle>
          <CardDescription>
            Test the download manager functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Add Download</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter file URL"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="filename">Filename</Label>
                <Input
                  id="filename"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="Enter filename"
                />
              </div>
            </div>
            
            <Button onClick={handleAddDownload}>
              Add Download
            </Button>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Quick Actions</h3>
            <Button onClick={handleAddSampleDownloads} variant="secondary">
              Add Sample Downloads
            </Button>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{stats.queued}</div>
                <div className="text-sm text-muted-foreground">Queued</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{stats.downloading}</div>
                <div className="text-sm text-muted-foreground">Downloading</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{stats.completed}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{stats.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          </div>
          
          {downloads.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Current Downloads</h3>
              <div className="space-y-3">
                {downloads.map((download) => (
                  <div key={download.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between">
                      <div className="font-medium">{download.filename}</div>
                      <div className="text-sm capitalize">{download.status}</div>
                    </div>
                    <div className="text-sm text-muted-foreground truncate">{download.url}</div>
                    {download.status === 'downloading' && (
                      <div className="text-sm mt-1">Progress: {download.progress}%</div>
                    )}
                    {download.status === 'failed' && (
                      <div className="text-sm text-red-500 mt-1">Error: {download.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TestDownload;