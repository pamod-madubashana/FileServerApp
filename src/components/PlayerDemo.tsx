import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlayerPreference } from "@/lib/playerSettings";

export const PlayerDemo = () => {
  const [mediaUrl, setMediaUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<"video" | "audio" | "voice">("video");

  const handleOpenMedia = () => {
    if (!mediaUrl) return;

    // Check player preference
    const preference = getPlayerPreference();
    
    if (preference === "external") {
      // Open in external player/system default
      const link = document.createElement('a');
      link.href = mediaUrl;
      link.target = '_blank';
      link.click();
    } else {
      // For demo purposes, we'll just show an alert
      alert(`Opening with built-in player: ${fileName}`);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Player Demo</CardTitle>
        <CardDescription>Demonstrate external vs built-in player functionality</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Media URL</label>
          <input
            type="text"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="Enter media URL"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">File Name</label>
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Enter file name"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">File Type</label>
          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value as "video" | "audio" | "voice")}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="voice">Voice</option>
          </select>
        </div>
        
        <Button onClick={handleOpenMedia} className="w-full">
          Open Media
        </Button>
        
        <div className="text-sm text-muted-foreground">
          <p>Current player preference: {getPlayerPreference()}</p>
          <p className="mt-2">
            Change your preference in Settings → Player Settings
          </p>
        </div>
      </CardContent>
    </Card>
  );
};