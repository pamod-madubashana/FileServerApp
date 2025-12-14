import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl, fetchWithTimeout } from "@/lib/api";
import { openUrl } from "@/lib/tauri-fs";

interface TelegramVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerificationComplete?: () => void;
}

export const TelegramVerificationDialog = ({ 
  open, 
  onOpenChange,
  onVerificationComplete
}: TelegramVerificationDialogProps) => {
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [verificationData, setVerificationData] = useState<{ 
    botUsername: string; 
    link: string; 
    code: string 
  } | null>(null);

  const handleGenerateLink = async () => {
    setIsGeneratingLink(true);
    try {
      const baseUrl = getApiBaseUrl();
      const apiUrl = baseUrl ? `${baseUrl}` : '';
      
      // Request a verification code
      const response = await fetchWithTimeout(`${apiUrl}/telegram/generate-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: "None"
        }),
      }, 5000);

      if (response.ok) {
        const data = await response.json();
        setVerificationData({
          botUsername: data.bot_username,
          link: data.verification_link,
          code: data.code
        });
      } else {
        throw new Error("Failed to generate verification link");
      }
    } catch (error) {
      console.error("Failed to generate Telegram verification link", error);
      alert("Failed to generate verification link. Please try again.");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleVerificationConfirm = () => {
    if (verificationData) {
      openUrl(verificationData.link);
      onOpenChange(false);
      if (onVerificationComplete) {
        onVerificationComplete();
      }
    }
  };

  const handleVerificationCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-gray-900 dark:text-white">Telegram Verification Required</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Please verify your Telegram account to enable file uploads.
          </DialogDescription>
        </DialogHeader>
        
        {!verificationData ? (
          <div className="space-y-4 py-4">
            <p className="text-gray-600 dark:text-gray-400">
              Connect your Telegram account to enable file uploads and additional features.
            </p>
            <Button 
              onClick={handleGenerateLink} 
              disabled={isGeneratingLink}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isGeneratingLink ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent align-[-0.125em]"></div>
                  Generating Link...
                </>
              ) : (
                "Generate Verification Link"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Verification Code</p>
              <p className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">{verificationData.code}</p>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Click "Verify" to open Telegram and complete the verification process with bot @{verificationData.botUsername}.
            </p>
          </div>
        )}
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleVerificationCancel}
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </Button>
          {verificationData && (
            <Button
              onClick={handleVerificationConfirm}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Verify on Telegram
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};