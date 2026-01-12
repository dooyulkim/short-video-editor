import { Button } from "@/components/ui/button";
import { PanelRightClose, Music } from "lucide-react";
import type { MediaResource } from "@/types/media";

interface PropertiesPanelProps {
	isOpen: boolean;
	onClose: () => void;
	selectedResource: MediaResource | null;
}

export function PropertiesPanel({ isOpen, onClose, selectedResource }: PropertiesPanelProps) {
	if (!isOpen) return null;

	return (
		<div className="w-80 flex flex-col overflow-hidden bg-card border-l border-border">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-1 border-b border-border bg-muted/30">
				<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Properties</h2>
				<Button variant="ghost" size="icon" className="size-6" onClick={onClose} title="Hide Properties">
					<PanelRightClose className="size-3" />
				</Button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto px-4 py-3">
				{selectedResource ? (
					<div className="space-y-3">
						{/* Resource Preview */}
						<div className="bg-black rounded-md overflow-hidden aspect-video flex items-center justify-center relative">
							{selectedResource.type === "video" ? (
								<video
									key={selectedResource.id}
									src={selectedResource.url}
									controls
									preload="metadata"
									className="w-full h-full object-contain"
									onError={(e) => {
										const videoElement = e.currentTarget;
										console.error("Video load error:", {
											url: selectedResource.url,
											error: videoElement.error,
											errorCode: videoElement.error?.code,
											errorMessage: videoElement.error?.message,
											networkState: videoElement.networkState,
											readyState: videoElement.readyState,
										});
										const errorDiv = document.createElement("div");
										errorDiv.className =
											"absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 text-red-400 text-xs p-4 text-center";
										errorDiv.innerHTML = `<div><p class="font-medium mb-1">Cannot play video</p><p class="text-xs text-gray-400">Format may not be supported by browser.<br/>Try converting to MP4 (H.264)</p></div>`;
										videoElement.parentElement?.appendChild(errorDiv);
									}}
									onLoadStart={() => console.log("Video load started:", selectedResource.url)}
									onLoadedMetadata={() => console.log("Video metadata loaded")}
								/>
							) : selectedResource.type === "audio" ? (
								<div className="w-full h-full flex flex-col items-center justify-center space-y-3 p-4">
									<Music className="size-12 text-primary" />
									<audio
										key={selectedResource.id}
										src={selectedResource.url}
										controls
										preload="metadata"
										className="w-full"
										onError={(e) => {
											const audioElement = e.currentTarget;
											console.error("Audio load error:", {
												url: selectedResource.url,
												error: audioElement.error,
												errorCode: audioElement.error?.code,
											});
										}}
									/>
								</div>
							) : selectedResource.type === "image" ? (
								<img
									key={selectedResource.id}
									src={selectedResource.url}
									alt={selectedResource.name}
									className="w-full h-full object-contain"
									onError={(e) => {
										console.error("Image load error:", {
											url: selectedResource.url,
											error: e,
										});
									}}
								/>
							) : null}
						</div>

						{/* Resource Details */}
						<div className="grid grid-cols-1 gap-y-2">
							<PropertyItem label="Name" value={selectedResource.name} truncate />
							<PropertyItem label="Type" value={selectedResource.type} capitalize />

							{selectedResource.duration && (
								<PropertyItem
									label="Duration"
									value={`${Math.floor(selectedResource.duration / 60)}:${String(
										Math.floor(selectedResource.duration % 60)
									).padStart(2, "0")}`}
								/>
							)}

							{(selectedResource.metadata.width || selectedResource.metadata.height) && (
								<PropertyItem
									label="Dimensions"
									value={`${selectedResource.metadata.width} × ${selectedResource.metadata.height}`}
								/>
							)}

							<PropertyItem label="File Size" value={`${(selectedResource.fileSize / (1024 * 1024)).toFixed(2)} MB`} />

							{selectedResource.metadata.fps && (
								<PropertyItem label="FPS" value={String(selectedResource.metadata.fps)} />
							)}

							{selectedResource.metadata.codec && (
								<PropertyItem label="Codec" value={selectedResource.metadata.codec} truncate />
							)}

							{selectedResource.metadata.format && (
								<PropertyItem label="Format" value={selectedResource.metadata.format} />
							)}

							{selectedResource.metadata.sampleRate && (
								<PropertyItem label="Sample Rate" value={`${selectedResource.metadata.sampleRate} Hz`} />
							)}

							{selectedResource.metadata.channels && (
								<PropertyItem label="Channels" value={String(selectedResource.metadata.channels)} />
							)}

							<PropertyItem label="Created At" value={new Date(selectedResource.createdAt).toLocaleString()} />
						</div>
					</div>
				) : (
					<div className="flex items-center justify-center h-full">
						<div className="text-center space-y-2">
							<p className="text-xs font-medium text-muted-foreground">No Resource Selected</p>
							<p className="text-xs text-muted-foreground">Select a resource to view its properties</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

interface PropertyItemProps {
	label: string;
	value: string;
	truncate?: boolean;
	capitalize?: boolean;
}

function PropertyItem({ label, value, truncate, capitalize }: PropertyItemProps) {
	return (
		<div>
			<h3 className="font-medium text-xs mb-0.5">{label}</h3>
			<p className={`text-xs text-muted-foreground ${truncate ? "truncate" : ""} ${capitalize ? "capitalize" : ""}`}>
				{value}
			</p>
		</div>
	);
}
