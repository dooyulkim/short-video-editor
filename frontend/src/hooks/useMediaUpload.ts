import { useState, useCallback } from 'react';
import axios, { type AxiosProgressEvent } from 'axios';
import type { MediaResource } from '@/types/media';

interface UseMediaUploadReturn {
  uploadFile: (file: File) => Promise<MediaResource | null>;
  progress: number;
  isUploading: boolean;
  error: string | null;
}

export const useMediaUpload = (): UseMediaUploadReturn => {
  const [progress, setProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File): Promise<MediaResource | null> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post<MediaResource>(
        '/media/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setProgress(percentCompleted);
            }
          },
        }
      );

      setIsUploading(false);
      setProgress(100);
      return response.data;
    } catch (err) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : 'An unknown error occurred';
      
      setError(errorMessage);
      setIsUploading(false);
      setProgress(0);
      return null;
    }
  }, []);

  return {
    uploadFile,
    progress,
    isUploading,
    error,
  };
};
