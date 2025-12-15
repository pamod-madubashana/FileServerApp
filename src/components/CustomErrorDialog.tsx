import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Wifi, Server, User, RefreshCw, Link } from 'lucide-react';

interface CustomErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  errorType: 'upload' | 'download' | 'network' | 'server' | 'auth' | 'unknown';
  onRetry?: () => void;
  onDismiss?: () => void;
  onConfigureBackend?: () => void; // New prop for backend configuration
}

const CustomErrorDialog: React.FC<CustomErrorDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  errorType,
  onRetry,
  onDismiss,
  onConfigureBackend // New prop
}) => {
  const getErrorIcon = () => {
    switch (errorType) {
      case 'upload':
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
      case 'download':
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
      case 'network':
        return <Wifi className="h-6 w-6 text-orange-500" />;
      case 'server':
        return <Server className="h-6 w-6 text-purple-500" />;
      case 'auth':
        return <User className="h-6 w-6 text-blue-500" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-gray-500" />;
    }
  };

  const getErrorTitle = () => {
    switch (errorType) {
      case 'upload':
        return 'Upload Failed';
      case 'download':
        return 'Download Failed';
      case 'network':
        return 'Network Error';
      case 'server':
        return 'Server Error';
      case 'auth':
        return 'Authentication Error';
      default:
        return title || 'Error Occurred';
    }
  };

  const getErrorMessage = () => {
    switch (errorType) {
      case 'upload':
        return message || 'Failed to upload the file. Please check your connection and try again.';
      case 'download':
        return message || 'Failed to download the file. Please check your connection and try again.';
      case 'network':
        return message || 'Network connection unavailable. Please check your internet connection.';
      case 'server':
        return message || 'Server is currently unavailable. Please try again later.';
      case 'auth':
        return message || 'Authentication failed. Please verify your credentials and try again.';
      default:
        return message || 'An unexpected error occurred. Please try again.';
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
    onClose();
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
    onClose();
  };

  const handleConfigureBackend = () => {
    if (onConfigureBackend) {
      onConfigureBackend();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getErrorIcon()}
            {getErrorTitle()}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {getErrorMessage()}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDismiss}>
            Dismiss
          </Button>
          {errorType === 'auth' && onConfigureBackend && (
            <Button variant="outline" onClick={handleConfigureBackend} className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Configure Backend
            </Button>
          )}
          {onRetry && (
            <Button onClick={handleRetry} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomErrorDialog;