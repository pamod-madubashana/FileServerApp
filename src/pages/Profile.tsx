import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

export default function Profile() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationLink, setVerificationLink] = useState<string | null>(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationData, setVerificationData] = useState<{ botUsername: string; link: string; code: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
          <p className="text-red-500 text-lg">Failed to load profile. Please try again later.</p>
          <Button onClick={() => navigate("/")} className="mt-6 bg-blue-600 hover:bg-blue-700">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Profile</h1>
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Back to Files
          </Button>
        </div>
        
        <Card className="mb-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-2xl text-gray-900 dark:text-white">Account Information</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Your account details and authentication information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Username</p>
                <p className="font-medium text-gray-900 dark:text-white">{userProfile.username}</p>
              </div>
              {userProfile.email && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email</p>
                  <p className="font-medium text-gray-900 dark:text-white">{userProfile.email}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-2xl text-gray-900 dark:text-white">Telegram Integration</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Connect your Telegram account to enable additional features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 py-6">
            {userProfile.telegram_user_id ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Telegram Username</p>
                    <p className="font-medium text-gray-900 dark:text-white">{userProfile.telegram_username || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Telegram ID</p>
                    <p className="font-medium text-gray-900 dark:text-white">{userProfile.telegram_user_id}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">First Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">{userProfile.telegram_first_name || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Last Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">{userProfile.telegram_last_name || 'N/A'}</p>
                  </div>
                </div>
                <div className="pt-4">
                  <Button 
                    variant="outline" 
                    onClick={handleVerifyTelegram} 
                    disabled={isVerifying}
                    className="border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50"
                  >
                    {isVerifying ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent align-[-0.125em]"></div>
                        Generating Link...
                      </>
                    ) : (
                      "Re-verify Telegram"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-gray-600 dark:text-gray-400">
                  Connect your Telegram account to enable additional features like notifications and direct file sharing.
                </p>
                <Button 
                  onClick={handleVerifyTelegram} 
                  disabled={isVerifying}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  {isVerifying ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent align-[-0.125em]"></div>
                      Generating Link...
                    </>
                  ) : (
                    "Connect Telegram"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900 dark:text-white">Telegram Verification</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Complete your Telegram verification to enable additional features.
            </DialogDescription>
          </DialogHeader>
          {verificationData && (
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
            <Button
              onClick={handleVerificationConfirm}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Verify on Telegram
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}