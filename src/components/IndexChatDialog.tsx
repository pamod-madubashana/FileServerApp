import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { getApiBaseUrl, fetchWithTimeout } from "@/lib/api";
import { openUrl } from "@/lib/tauri-fs";
import logger from "@/lib/logger";
import { Bot, Check, X } from "lucide-react";

interface IndexChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const IndexChatDialog = ({ open, onOpenChange }: IndexChatDialogProps) => {
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch bot username when dialog opens
  useEffect(() => {
    if (open) {
      fetchBotUsername();
    }
  }, [open]);

  const fetchBotUsername = async () => {
    setIsLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const apiUrl = baseUrl ? `${baseUrl}` : '';
      
      // Request a verification code to get the bot username
      const response = await fetchWithTimeout(`${apiUrl}/telegram/generate-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: "None"
        }),
      }, 5000);

      if (response.ok) {
        const data = await response.json();
        setBotUsername(data.bot_username);
      } else {
        throw new Error("Failed to fetch bot information");
      }
    } catch (error) {
      logger.error("Failed to fetch bot username", error);
      setBotUsername(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOk = () => {
    if (botUsername) {
      openUrl(`https://t.me/${botUsername}?startgroup=true`);
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-blue-500" />
            Add me to your Index chat
          </DialogTitle>
          <DialogDescription className="pt-2">
            To upload files, you need to add this bot to your Index chat.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button 
            onClick={handleOk}
            disabled={isLoading || !botUsername}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent align-[-0.125em]"></div>
                Loading...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                OK
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};