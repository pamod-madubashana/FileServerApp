import { useState, useRef } from "react";
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

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Upload options when open */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-2 mb-2">
          <Button
            onClick={() => {
              if (onUploadFiles) onUploadFiles();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 bg-background border border-border hover:bg-accent shadow-lg"
            variant="outline"
          >
            <File className="w-4 h-4" />
            Upload Files
          </Button>
          <Button
            onClick={() => {
              if (onUploadFolder) onUploadFolder();
              setIsOpen(false);
            }}
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