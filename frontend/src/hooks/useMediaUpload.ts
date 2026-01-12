import { useState, useCallback } from "react";
import { uploadMedia } from "@/services/api";
import type { MediaResource } from "@/types/media";

interface UseMediaUploadOptions {
	projectId: string;
}

interface UseMediaUploadReturn {
	uploadFile: (file: File) => Promise<MediaResource | null>;
	progress: number;
	isUploading: boolean;
	error: string | null;
	currentFileName: string | null;
}

export const useMediaUpload = ({ projectId }: UseMediaUploadOptions): UseMediaUploadReturn => {
	const [progress, setProgress] = useState<number>(0);
	const [isUploading, setIsUploading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [currentFileName, setCurrentFileName] = useState<string | null>(null);

	const uploadFile = useCallback(
		async (file: File): Promise<MediaResource | null> => {
			setIsUploading(true);
			setProgress(0);
			setError(null);
			setCurrentFileName(file.name);

			try {
				const response = await uploadMedia(file, projectId, (progressEvent) => {
					setProgress(progressEvent.progress);
				});

				setIsUploading(false);
				setProgress(100);
				setCurrentFileName(null);
				return response.media;
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";

				setError(errorMessage);
				setIsUploading(false);
				setProgress(0);
				setCurrentFileName(null);
				return null;
			}
		},
		[projectId]
	);

	return {
		uploadFile,
		progress,
		isUploading,
		error,
		currentFileName,
	};
};
