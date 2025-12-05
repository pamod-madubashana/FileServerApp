import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, getApiBaseUrl, fetchWithTimeout } from "@/lib/api";
import logger from "@/lib/logger";

interface UserProfile {
  username: string;
  email?: string;
  telegram_user_id?: number;
  telegram_username?: string;
  telegram_first_name?: string;
  telegram_last_name?: string;
  telegram_profile_picture?: string;
}

interface ProfileOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileOverlay = ({ isOpen, onClose }: ProfileOverlayProps) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationData, setVerificationData] = useState<{ botUsername: string; link: string; code: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUserProfile();
    }
  }, [isOpen]);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      const profileData = await api.fetchUserProfile();
      setUserProfile(profileData);
    } catch (error) {
      logger.error("Failed to fetch user profile", error);
      // Try fallback method
      try {
        const baseUrl = getApiBaseUrl();
        const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
        
        const authResponse = await fetchWithTimeout(`${apiUrl}/auth/check`, {
          method: 'GET',
          credentials: 'include',
        }, 5000);

        if (authResponse.ok) {
          const authData = await authResponse.json();
          if (authData.authenticated) {
            setUserProfile({
              username: authData.username,
              email: authData.user_email,
              telegram_user_id: undefined,
              telegram_username: undefined,
              telegram_first_name: undefined,
              telegram_last_name: undefined,
              telegram_profile_picture: undefined
            });
          }
        }
      } catch (fallbackError) {
        logger.error("Fallback method also failed", fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTelegram = async () => {
    if (!userProfile) return;
    
    setIsVerifying(true);
    try {
      const baseUrl = getApiBaseUrl();
      const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
      
      // Request a verification code
      const response = await fetchWithTimeout(`${apiUrl}/telegram/generate-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userProfile.username, // Using username as user_id for now
        }),
      }, 5000);

      if (response.ok) {
        const data = await response.json();
        setVerificationData({
          botUsername: data.bot_username,
          link: data.verification_link,
          code: data.code
        });
        setShowVerificationDialog(true);
      } else {
        throw new Error("Failed to generate verification link");
      }
    } catch (error) {
      logger.error("Failed to generate Telegram verification link", error);
      alert("Failed to generate verification link. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerificationConfirm = () => {
    if (verificationData) {
      window.open(verificationData.link, '_blank');
      setShowVerificationDialog(false);
    }
  };

  const handleVerificationCancel = () => {
    setShowVerificationDialog(false);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              className="bg-background/80 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-border/50"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-bold">User Profile</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    <span className="ml-3">Loading profile...</span>
                  </div>
                ) : !userProfile ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <p className="text-red-500 mb-4">Failed to load profile. Please try again later.</p>
                    <Button onClick={onClose}>Close</Button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Account Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Account Information</CardTitle>
                        <CardDescription>Your account details and authentication information</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Username</p>
                            <p className="font-medium">{userProfile.username}</p>
                          </div>
                          {userProfile.email && (
                            <div className="bg-muted p-4 rounded-lg">
                              <p className="text-sm text-muted-foreground mb-1">Email</p>
                              <p className="font-medium">{userProfile.email}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Telegram Integration */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Telegram Integration</CardTitle>
                        <CardDescription>Connect your Telegram account to enable additional features</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {userProfile.telegram_user_id ? (
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-muted p-4 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Telegram Username</p>
                                <p className="font-medium">{userProfile.telegram_username || 'N/A'}</p>
                              </div>
                              <div className="bg-muted p-4 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Telegram ID</p>
                                <p className="font-medium">{userProfile.telegram_user_id}</p>
                              </div>
                              <div className="bg-muted p-4 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">First Name</p>
                                <p className="font-medium">{userProfile.telegram_first_name || 'N/A'}</p>
                              </div>
                              <div className="bg-muted p-4 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Last Name</p>
                                <p className="font-medium">{userProfile.telegram_last_name || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="pt-4">
                              <Button 
                                variant="outline" 
                                onClick={handleVerifyTelegram} 
                                disabled={isVerifying}
                              >
                                {isVerifying ? (
                                  <>
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent"></div>
                                    Generating Link...
                                  </>
                                ) : (
                                  "Re-verify Telegram"
                                )}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <p className="text-muted-foreground">
                              Connect your Telegram account to enable additional features like notifications and direct file sharing.
                            </p>
                            <Button 
                              onClick={handleVerifyTelegram} 
                              disabled={isVerifying}
                              className="bg-primary hover:bg-primary/90"
                            >
                              {isVerifying ? (
                                <>
                                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                                  Generating Link...
                                </>
                              ) : (
                                <>
                                  <Bot className="mr-2 h-4 w-4" />
                                  Connect Telegram
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end p-6 border-t">
                <Button variant="outline" onClick={onClose}>Close</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Telegram Verification</DialogTitle>
            <DialogDescription>
              Complete your Telegram verification to enable additional features.
            </DialogDescription>
          </DialogHeader>
          {verificationData && (
            <div className="space-y-4 py-4">
              <div className="bg-primary/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Verification Code</p>
                <p className="font-mono text-lg font-bold text-primary">{verificationData.code}</p>
              </div>
              <p>
                Click "Verify" to open Telegram and complete the verification process with bot @{verificationData.botUsername}.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleVerificationCancel}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerificationConfirm}
            >
              Verify on Telegram
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};