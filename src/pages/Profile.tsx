import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, getApiBaseUrl, fetchWithTimeout, UserProfile } from "@/lib/api";
import { NavigationSidebar } from "@/components/NavigationSidebar";
import logger from "@/lib/logger";

export default function Profile() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationLink, setVerificationLink] = useState<string | null>(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationData, setVerificationData] = useState<{ botUsername: string; link: string; code: string } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarOpenRef = useRef(false);

  // Check if sidebar is open and redirect if it's closed
  useEffect(() => {
    const checkSidebarStatus = () => {
      // Since we can't directly access the NavigationSidebar's state,
      // we'll use a different approach by checking if we're still on the profile page
      // and if not, redirect to home
    };

    // Listen for navigation events
    const handleNavigation = () => {
      // If we're no longer on the profile page, it means the sidebar was closed
      if (location.pathname !== '/profile' && location.pathname !== '/settings') {
        navigate("/");
      }
    };

    // Set up a timer to periodically check if we should redirect
    const interval = setInterval(() => {
      // This is a simplified approach - in a real app, you might want to use
      // a more sophisticated state management solution
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [location, navigate]);

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
      <div className="flex h-screen bg-background select-none">
        <NavigationSidebar />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex h-screen bg-background select-none">
        <NavigationSidebar />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background select-none">
      <NavigationSidebar />
    </div>
  );
}