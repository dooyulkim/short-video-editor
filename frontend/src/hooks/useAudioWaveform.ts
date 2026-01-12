import { useState, useEffect, useRef } from "react";
import { getWaveform } from "@/services/api";

interface UseAudioWaveformReturn {
	waveformData: number[] | null;
	isLoading: boolean;
	error: string | null;
}

// Cache for storing waveform data (keyed by projectId:audioId)
const waveformCache = new Map<string, number[]>();

// Export function to clear cache (useful for testing)
export const clearWaveformCache = () => {
	waveformCache.clear();
};

const useAudioWaveform = (projectId: string | null, audioId: string | null): UseAudioWaveformReturn => {
	const [waveformData, setWaveformData] = useState<number[] | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	// Track if component is mounted to prevent state updates after unmount
	const isMountedRef = useRef(true);

	useEffect(() => {
		isMountedRef.current = true;

		return () => {
			isMountedRef.current = false;
		};
	}, []);

	useEffect(() => {
		// Reset state if no audioId or projectId
		if (!audioId || !projectId) {
			setWaveformData(null);
			setError(null);
			setIsLoading(false);
			return;
		}

		// Create cache key with projectId and audioId
		const cacheKey = `${projectId}:${audioId}`;

		// Check cache first
		const cachedData = waveformCache.get(cacheKey);
		if (cachedData) {
			setWaveformData(cachedData);
			setIsLoading(false);
			setError(null);
			return;
		}

		// Fetch waveform data from backend
		const fetchWaveform = async () => {
			setIsLoading(true);
			setError(null);

			try {
				const response = await getWaveform(projectId, audioId);

				if (!isMountedRef.current) return;

				const data = response.waveform;

				// Validate that we received an array
				if (Array.isArray(data)) {
					// Cache the waveform data
					waveformCache.set(cacheKey, data);
					setWaveformData(data);
				} else {
					throw new Error("Invalid waveform data format");
				}
			} catch (err) {
				if (!isMountedRef.current) return;

				const errorMessage = err instanceof Error ? err.message : "Failed to fetch waveform data";
				setError(errorMessage);
				setWaveformData(null);
			} finally {
				if (isMountedRef.current) {
					setIsLoading(false);
				}
			}
		};

		fetchWaveform();
	}, [projectId, audioId]);

	return { waveformData, isLoading, error };
};

export default useAudioWaveform;
