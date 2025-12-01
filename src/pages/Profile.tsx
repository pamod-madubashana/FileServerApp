import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiBaseUrl, fetchWithTimeout } from "@/lib/api";
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
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
      
      // First get auth info
      const authResponse = await fetchWithTimeout(`${apiUrl}/auth/check`, {
        method: 'GET',
        credentials: 'include',
      }, 5000);

      if (authResponse.ok) {
        const authData = await authResponse.json();
        if (authData.authenticated) {
          // For now, we'll just show basic auth info
          // In a real implementation, you would fetch detailed user info from an endpoint
          setUserProfile({
            username: authData.username,
            email: authData.user_email,
            // These would come from a user info endpoint in a real implementation
            telegram_user_id: undefined,
            telegram_username: undefined,
            telegram_first_name: undefined,
            telegram_last_name: undefined,
            telegram_profile_picture: undefined
          });
        }
      }
    } catch (error) {
      logger.error("Failed to fetch user profile", error);
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
        setVerificationLink(data.verification_link);
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 dark:border-gray-100"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Failed to load profile. Please try again later.</p>
          <Button onClick={() => navigate("/")} className="mt-4">Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">User Profile</h1>
          <Button variant="outline" onClick={() => navigate("/")}>Back to Files</Button>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details and authentication information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Username</p>
                <p className="font-medium">{userProfile.username}</p>
              </div>
              {userProfile.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{userProfile.email}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Telegram Integration</CardTitle>
            <CardDescription>Connect your Telegram account to enable additional features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {userProfile.telegram_user_id ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Telegram Username</p>
                    <p className="font-medium">{userProfile.telegram_username || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telegram ID</p>
                    <p className="font-medium">{userProfile.telegram_user_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">First Name</p>
                    <p className="font-medium">{userProfile.telegram_first_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Name</p>
                    <p className="font-medium">{userProfile.telegram_last_name || 'N/A'}</p>
                  </div>
                </div>
                <div className="pt-4">
                  <Button variant="outline" onClick={handleVerifyTelegram} disabled={isVerifying}>
                    {isVerifying ? "Generating Link..." : "Re-verify Telegram"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Connect your Telegram account to enable additional features like notifications and direct file sharing.
                </p>
                {verificationLink ? (
                  <div className="space-y-4">
                    <p>
                      Click the button below to verify your Telegram account:
                    </p>
                    <a 
                      href={verificationLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <Button>Verify on Telegram</Button>
                    </a>
                    <p className="text-sm text-muted-foreground">
                      After verification, refresh this page to see your Telegram information.
                    </p>
                  </div>
                ) : (
                  <Button onClick={handleVerifyTelegram} disabled={isVerifying}>
                    {isVerifying ? "Generating Link..." : "Connect Telegram"}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}