import { useState } from "react";
import { Upload, File, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingUploadButtonProps {
  onUploadFiles?: () => void;
  onUploadFolder?: () => void;
}

export const FloatingUploadButton = ({
  onUploadFiles,
  onUploadFolder,
}: FloatingUploadButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleFileUpload = () => {
    // Trigger file upload through FileGrid's ref or by exposing the function
    const fileGridElement = document.querySelector('[data-drag-container]');
    if (fileGridElement) {
      const fileInput = fileGridElement.querySelector('input[type="file"]:not([webkitdirectory])') as HTMLInputElement;
      fileInput?.click();
    }
    setIsOpen(false);
  };

  const handleFolderUpload = () => {
    // Trigger folder upload through FileGrid's ref or by exposing the function
    const fileGridElement = document.querySelector('[data-drag-container]');
    if (fileGridElement) {
      const directoryInput = fileGridElement.querySelector('input[type="file"][webkitdirectory]') as HTMLInputElement;
      directoryInput?.click();
    }
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Upload options when open */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-2 mb-2">
          <Button
            onClick={handleFileUpload}
            className="flex items-center gap-2 bg-background border border-border hover:bg-accent shadow-lg"
            variant="outline"
          >
            <File className="w-4 h-4" />
            Upload Files
          </Button>
          <Button
            onClick={handleFolderUpload}
            className="flex items-center gap-2 bg-background border border-border hover:bg-accent shadow-lg"
            variant="outline"
          >
            <Folder className="w-4 h-4" />
            Upload Folder
          </Button>
        </div>
      )}

      {/* Main floating button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow"
        size="icon"
      >
        <Upload className="w-6 h-6" />
      </Button>
    </div>
  );
};