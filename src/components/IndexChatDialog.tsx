import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface IndexChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIndexChatSet: () => void;
}

export const IndexChatDialog = ({ open, onOpenChange, onIndexChatSet }: IndexChatDialogProps) => {
  const [indexChatId, setIndexChatId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const chatId = indexChatId ? parseInt(indexChatId, 10) : null;
      await api.updateUserIndexChat({ index_chat_id: chatId });
      
      toast.success("Index chat ID saved successfully!", {
        description: chatId ? `Chat ID: ${chatId}` : 'Index chat ID cleared',
        duration: 3000,
      });
      
      onIndexChatSet();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving index chat ID:", error);
      toast.error("Error saving index chat ID", {
        description: error instanceof Error ? error.message : String(error),
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900 dark:text-white">Set Index Chat ID</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Please enter your Telegram chat ID for indexing files. This is required before uploading files.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="index-chat-id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Telegram Chat ID
              </label>
              <Input
                id="index-chat-id"
                type="number"
                value={indexChatId}
                onChange={(e) => setIndexChatId(e.target.value)}
                placeholder="Enter Telegram chat ID"
                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enter the Telegram chat ID where files should be indexed from.
              </p>
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent align-[-0.125em]"></div>
                  Saving...
                </>
              ) : (
                "Save Chat ID"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};