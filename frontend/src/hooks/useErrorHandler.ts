import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

/**
 * Custom hook for handling errors throughout the application
 * Provides centralized error handling with toast notifications
 */
export function useErrorHandler() {
  const { toast } = useToast();

  const handleError = (error: unknown, context?: string) => {
    console.error('Error:', error, 'Context:', context);
    
    let title = 'Error';
    let description = 'An unexpected error occurred';

    if (error instanceof Error) {
      description = error.message;
    } else if (typeof error === 'string') {
      description = error;
    }

    if (context) {
      title = `Error: ${context}`;
    }

    toast({
      title,
      description,
      variant: 'destructive',
    });
  };

  const handleSuccess = (message: string, title: string = 'Success') => {
    toast({
      title,
      description: message,
      variant: 'success',
    });
  };

  const handleWarning = (message: string, title: string = 'Warning') => {
    toast({
      title,
      description: message,
      variant: 'default',
    });
  };

  // Global error handler for unhandled errors
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      event.preventDefault();
      handleError(event.error, 'Unhandled Error');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      handleError(event.reason, 'Unhandled Promise Rejection');
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return {
    handleError,
    handleSuccess,
    handleWarning,
  };
}

/**
 * Common error messages for different scenarios
 */
export const ErrorMessages = {
  UPLOAD_FAILED: 'Failed to upload file. Please try again.',
  INVALID_FILE: 'Invalid file format. Please check supported formats.',
  FILE_TOO_LARGE: 'File size exceeds maximum limit (500MB).',
  EXPORT_FAILED: 'Failed to export video. Please try again.',
  SAVE_FAILED: 'Failed to save project. Please check your storage.',
  LOAD_FAILED: 'Failed to load project. File may be corrupted.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  PLAYBACK_ERROR: 'Playback error. Media file may be corrupted.',
  CUT_FAILED: 'Failed to cut clip. Please try again.',
  TRIM_FAILED: 'Failed to trim clip. Please check clip boundaries.',
  TRANSITION_FAILED: 'Failed to apply transition. Please try again.',
  AUDIO_FAILED: 'Failed to process audio. Please check audio file.',
};

/**
 * Utility function to get user-friendly error message
 */
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    // Map technical errors to user-friendly messages
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return ErrorMessages.NETWORK_ERROR;
    }
    if (error.message.includes('file') || error.message.includes('upload')) {
      return ErrorMessages.UPLOAD_FAILED;
    }
    if (error.message.includes('export')) {
      return ErrorMessages.EXPORT_FAILED;
    }
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}
