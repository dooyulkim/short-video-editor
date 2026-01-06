/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import type { ApiError } from "@/types/api";

/**
 * Custom hook for handling API requests with loading and error states
 * @template T - The type of data returned by the API call
 */
export function useApi<T = any>() {
	const [data, setData] = useState<T | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<ApiError | null>(null);

	/**
	 * Execute an API call with automatic state management
	 * @param apiCall - The API function to call
	 */
	const execute = useCallback(async (apiCall: () => Promise<T>): Promise<T | null> => {
		setLoading(true);
		setError(null);

		try {
			const result = await apiCall();
			setData(result);
			return result;
		} catch (err) {
			const apiError = err as ApiError;
			setError(apiError);
			return null;
		} finally {
			setLoading(false);
		}
	}, []);

	/**
	 * Reset the hook state
	 */
	const reset = useCallback(() => {
		setData(null);
		setError(null);
		setLoading(false);
	}, []);

	return {
		data,
		loading,
		error,
		execute,
		reset,
	};
}

/**
 * Hook for tracking upload/export progress
 */
export function useProgress() {
	const [progress, setProgress] = useState(0);
	const [status, setStatus] = useState<"idle" | "active" | "completed" | "error">("idle");

	const startProgress = useCallback(() => {
		setProgress(0);
		setStatus("active");
	}, []);

	const updateProgress = useCallback((value: number) => {
		setProgress(Math.min(100, Math.max(0, value)));
	}, []);

	const completeProgress = useCallback(() => {
		setProgress(100);
		setStatus("completed");
	}, []);

	const errorProgress = useCallback(() => {
		setStatus("error");
	}, []);

	const resetProgress = useCallback(() => {
		setProgress(0);
		setStatus("idle");
	}, []);

	return {
		progress,
		status,
		startProgress,
		updateProgress,
		completeProgress,
		errorProgress,
		resetProgress,
	};
}

// Example usage:
/*
import { useApi, useProgress } from '@/hooks/useApi';
import { uploadMedia } from '@/services/api';

function MyComponent() {
  const { execute, loading, error } = useApi();
  const { progress, updateProgress } = useProgress();

  const handleUpload = async (file: File) => {
    const result = await execute(() =>
      uploadMedia(file, (progressEvent) => {
        updateProgress(progressEvent.progress);
      })
    );

    if (result) {
      console.log('Upload successful:', result);
    } else if (error) {
      console.error('Upload failed:', error.message);
    }
  };

  return (
    <div>
      <button onClick={() => handleUpload(file)} disabled={loading}>
        Upload
      </button>
      {loading && <progress value={progress} max={100} />}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
*/
