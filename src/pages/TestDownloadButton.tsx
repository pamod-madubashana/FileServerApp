import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import AdvancedDownloadButton from '../components/AdvancedDownloadButton';
import DownloadButton from '../components/DownloadButton';

const TestDownloadButton: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Download Button Test</CardTitle>
          <CardDescription>
            Test the download button components
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Download Button</h3>
            <div className="p-4 border rounded-lg">
              <DownloadButton 
                path="/dl/sample-image.jpg" 
                filename="sample-image.jpg"
              >
                Download Sample Image
              </DownloadButton>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Advanced Download Button</h3>
            <div className="p-4 border rounded-lg">
              <AdvancedDownloadButton 
                path="/dl/sample-document.pdf" 
                filename="sample-document.pdf"
              >
                Download Sample Document
              </AdvancedDownloadButton>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Multiple Downloads</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AdvancedDownloadButton 
                path="/dl/sample-image.jpg" 
                filename="image.jpg"
              >
                Image
              </AdvancedDownloadButton>
              
              <AdvancedDownloadButton 
                path="/dl/sample-document.pdf" 
                filename="document.pdf"
              >
                Document
              </AdvancedDownloadButton>
              
              <AdvancedDownloadButton 
                path="/dl/sample-video.mp4" 
                filename="video.mp4"
              >
                Video
              </AdvancedDownloadButton>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestDownloadButton;