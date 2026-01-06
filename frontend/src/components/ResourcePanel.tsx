import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import type { MediaResource } from "@/types/media";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { listMedia, deleteMedia } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, Video, Music, Image as ImageIcon, Clock, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResourcePanelProps {
	onResourcesChange?: (resources: MediaResource[]) => void;
	onResourceSelect?: (resource: MediaResource) => void;
	selectedResource?: MediaResource | null;
	onSelectedResourceClear?: () => void;
}

type FilterType = "all" | "video" | "audio" | "image";

export const ResourcePanel: React.FC<ResourcePanelProps> = ({
	onResourcesChange,
	onResourceSelect,
	selectedResource,
	onSelectedResourceClear,
}) => {
	const [resources, setResources] = useState<MediaResource[]>([]);
	const [filter, setFilter] = useState<FilterType>("all");
	const [hoveredResource, setHoveredResource] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [resourceToDelete, setResourceToDelete] = useState<MediaResource | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const { uploadFile, progress, isUploading, error } = useMediaUpload();

	// Fetch existing resources on mount
	useEffect(() => {
		const fetchResources = async () => {
			try {
				setIsLoading(true);
				const mediaList = await listMedia();
				setResources(mediaList);
				onResourcesChange?.(mediaList);
			} catch (err) {
				console.error("Failed to load resources:", err);
			} finally {
				setIsLoading(false);
			}
		};

		fetchResources();
	}, [onResourcesChange]);

	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			for (const file of acceptedFiles) {
				const uploadedResource = await uploadFile(file);
				if (uploadedResource) {
					setResources((prev) => {
						const updated = [...prev, uploadedResource];
						onResourcesChange?.(updated);
						return updated;
					});
				}
			}
		},
		[uploadFile, onResourcesChange]
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"video/*": [".mp4", ".mov", ".avi", ".mkv", ".webm"],
			"audio/*": [".mp3", ".wav", ".ogg", ".m4a"],
			"image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
		},
		multiple: true,
	});

	const filteredResources = resources.filter((resource) => {
		if (filter === "all") return true;
		return resource.type === filter;
	});

	const formatDuration = (seconds?: number): string => {
		if (!seconds) return "N/A";
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const formatFileSize = (bytes: number): string => {
		const mb = bytes / (1024 * 1024);
		return `${mb.toFixed(2)} MB`;
	};

	const handleDragStart = (e: React.DragEvent, resource: MediaResource) => {
		e.dataTransfer.setData("application/json", JSON.stringify(resource));
		e.dataTransfer.effectAllowed = "copy";
	};

	const handleDeleteClick = (e: React.MouseEvent, resource: MediaResource) => {
		e.stopPropagation(); // Prevent card click event
		setResourceToDelete(resource);
		setDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (!resourceToDelete) return;

		try {
			setIsDeleting(true);
			await deleteMedia(resourceToDelete.id);

			// Clear selection if the deleted resource was selected
			if (selectedResource?.id === resourceToDelete.id) {
				onSelectedResourceClear?.();
			}

			// Remove from local state
			setResources((prev) => {
				const updated = prev.filter((r) => r.id !== resourceToDelete.id);
				onResourcesChange?.(updated);
				return updated;
			});

			setDeleteDialogOpen(false);
			setResourceToDelete(null);
		} catch (err) {
			console.error("Failed to delete resource:", err);
			// You could add error toast notification here
		} finally {
			setIsDeleting(false);
		}
	};

	const handleDeleteCancel = () => {
		setDeleteDialogOpen(false);
		setResourceToDelete(null);
	};

	const getResourceIcon = (type: string) => {
		switch (type) {
			case "video":
				return <Video className="w-4 h-4" />;
			case "audio":
				return <Music className="w-4 h-4" />;
			case "image":
				return <ImageIcon className="w-4 h-4" />;
			default:
				return null;
		}
	};

	return (
		<div className="h-full flex flex-col p-4 bg-background">
			<div className="mb-4">
				<h2 className="text-2xl font-bold mb-2">Resources</h2>
				<p className="text-sm text-muted-foreground">Upload media files or drag them to the timeline</p>
			</div>

			{/* Upload Area */}
			<div
				{...getRootProps()}
				className={cn(
					"border-2 border-dashed rounded-lg p-6 mb-4 cursor-pointer transition-colors",
					isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50",
					isUploading && "opacity-50 pointer-events-none"
				)}>
				<input {...getInputProps()} />
				<div className="flex flex-col items-center justify-center gap-2">
					<Upload className="w-8 h-8 text-muted-foreground" />
					<p className="text-sm font-medium">{isDragActive ? "Drop files here" : "Drag & drop files here"}</p>
					<p className="text-xs text-muted-foreground">or click to browse (Video, Audio, Images)</p>
				</div>
			</div>

			{/* Upload Progress */}
			{isUploading && (
				<div className="mb-4">
					<div className="flex justify-between text-sm mb-2">
						<span>Uploading...</span>
						<span>{progress}%</span>
					</div>
					<Progress value={progress} />
				</div>
			)}

			{/* Error Message */}
			{error && (
				<div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded-md">
					<p className="text-sm text-destructive">{error}</p>
				</div>
			)}

			{/* Filter Tabs */}
			<Tabs
				value={filter}
				onValueChange={(value: string) => setFilter(value as FilterType)}
				className="flex-1 flex flex-col">
				<TabsList className="grid w-full grid-cols-4 mb-4">
					<TabsTrigger value="all">All</TabsTrigger>
					<TabsTrigger value="video">Video</TabsTrigger>
					<TabsTrigger value="audio">Audio</TabsTrigger>
					<TabsTrigger value="image">Images</TabsTrigger>
				</TabsList>

				<TabsContent value={filter} className="flex-1 overflow-y-auto">
					{isLoading ? (
						<div className="flex items-center justify-center h-full text-muted-foreground">
							<p className="text-sm">Loading resources...</p>
						</div>
					) : filteredResources.length === 0 ? (
						<div className="flex items-center justify-center h-full text-muted-foreground">
							<p className="text-sm">No resources yet. Upload some files to get started!</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
							{filteredResources.map((resource) => (
								<Card
									key={resource.id}
									draggable
									onDragStart={(e: React.DragEvent) => handleDragStart(e, resource)}
									onMouseEnter={() => setHoveredResource(resource.id)}
									onMouseLeave={() => setHoveredResource(null)}
									onClick={() => onResourceSelect?.(resource)}
									className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary">
									<CardHeader className="p-3">
										<div className="flex items-start justify-between gap-2">
											<div className="flex items-center gap-2 flex-1 min-w-0">
												{getResourceIcon(resource.type)}
												<CardTitle className="text-sm truncate">{resource.name}</CardTitle>
											</div>
											<Button
												variant="ghost"
												size="icon"
												className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
												onClick={(e) => handleDeleteClick(e, resource)}>
												<X className="h-4 w-4" />
											</Button>
										</div>
									</CardHeader>
									<CardContent className="p-3 pt-0">
										{/* Thumbnail */}
										<div className="relative aspect-video bg-muted rounded-md overflow-hidden mb-2">
											{resource.thumbnail ? (
												<img src={resource.thumbnail} alt={resource.name} className="w-full h-full object-cover" />
											) : (
												<div className="w-full h-full flex items-center justify-center">
													{getResourceIcon(resource.type)}
												</div>
											)}
										</div>

										{/* Metadata - shown on hover */}
										{hoveredResource === resource.id && (
											<CardDescription className="space-y-1 text-xs animate-in fade-in duration-200">
												{resource.duration && (
													<div className="flex items-center gap-1">
														<Clock className="w-3 h-3" />
														<span>Duration: {formatDuration(resource.duration)}</span>
													</div>
												)}
												{resource.metadata.width && resource.metadata.height && (
													<div className="flex items-center gap-1">
														<Maximize2 className="w-3 h-3" />
														<span>
															{resource.metadata.width} × {resource.metadata.height}
														</span>
													</div>
												)}
												<div>Size: {formatFileSize(resource.fileSize)}</div>
												{resource.metadata.fps && <div>FPS: {resource.metadata.fps}</div>}
												{resource.metadata.codec && <div className="truncate">Codec: {resource.metadata.codec}</div>}
											</CardDescription>
										)}
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</TabsContent>
			</Tabs>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Resource</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{resourceToDelete?.name}"? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleDeleteCancel} disabled={isDeleting}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteConfirm}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
							{isDeleting ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};
