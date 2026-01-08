import React, { useState } from "react";
import { TimelineLayer } from "./TimelineLayer";
import type { TimelineLayer as TimelineLayerType } from "@/types/timeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, ZoomIn, ZoomOut } from "lucide-react";

/**
 * Test component for TimelineLayer and TimelineClip
 * Demonstrates all features including drag, trim, lock, and visibility
 */
export const TimelineLayerTest: React.FC = () => {
	const [zoom, setZoom] = useState<number>(50); // pixels per second
	const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
	const [layers, setLayers] = useState<TimelineLayerType[]>([
		{
			id: "layer-1",
			type: "video",
			name: "Video Track 1",
			locked: false,
			visible: true,
			muted: false,
			clips: [
				{
					id: "clip-1",
					resourceId: "video-resource-001",
					startTime: 1,
					duration: 5,
					trimStart: 0,
					trimEnd: 0,
					transitions: {
						in: { type: "fade", duration: 1, properties: {} },
					},
				},
				{
					id: "clip-2",
					resourceId: "video-resource-002",
					startTime: 8,
					duration: 4,
					trimStart: 0,
					trimEnd: 0,
					transitions: {
						out: { type: "dissolve", duration: 0.5, properties: {} },
					},
				},
			],
		},
		{
			id: "layer-2",
			type: "audio",
			name: "Audio Track 1",
			locked: false,
			visible: true,
			muted: false,
			clips: [
				{
					id: "clip-3",
					resourceId: "audio-resource-001",
					startTime: 0,
					duration: 10,
					trimStart: 0,
					trimEnd: 0,
				},
			],
		},
		{
			id: "layer-3",
			type: "text",
			name: "Text Overlay",
			locked: false,
			visible: true,
			muted: false,
			clips: [
				{
					id: "clip-4",
					resourceId: "text-resource-001",
					startTime: 3,
					duration: 3,
					trimStart: 0,
					trimEnd: 0,
				},
			],
		},
	]);

	const handleClipSelect = (clipId: string) => {
		setSelectedClipId(clipId);
	};

	const handleClipMove = (clipId: string, newStartTime: number) => {
		setLayers((prevLayers) =>
			prevLayers.map((layer) => ({
				...layer,
				clips: layer.clips.map((clip) => (clip.id === clipId ? { ...clip, startTime: newStartTime } : clip)),
			}))
		);
	};

	const handleClipTrim = (clipId: string, newDuration: number, newTrimStart: number) => {
		setLayers((prevLayers) =>
			prevLayers.map((layer) => ({
				...layer,
				clips: layer.clips.map((clip) =>
					clip.id === clipId ? { ...clip, duration: newDuration, trimStart: newTrimStart } : clip
				),
			}))
		);
	};

	const handleToggleLock = (layerId: string) => {
		setLayers((prevLayers) =>
			prevLayers.map((layer) => (layer.id === layerId ? { ...layer, locked: !layer.locked } : layer))
		);
	};

	const handleToggleVisible = (layerId: string) => {
		setLayers((prevLayers) =>
			prevLayers.map((layer) => (layer.id === layerId ? { ...layer, visible: !layer.visible } : layer))
		);
	};

	const handleToggleMute = (layerId: string) => {
		setLayers((prevLayers) =>
			prevLayers.map((layer) => (layer.id === layerId ? { ...layer, muted: !layer.muted } : layer))
		);
	};

	const handleAddLayer = () => {
		const newLayer: TimelineLayerType = {
			id: `layer-${layers.length + 1}`,
			type: "video",
			name: `Video Track ${layers.length + 1}`,
			locked: false,
			visible: true,
			muted: false,
			clips: [],
		};
		setLayers([...layers, newLayer]);
	};

	const handleZoomIn = () => {
		setZoom((prev) => Math.min(prev + 10, 200));
	};

	const handleZoomOut = () => {
		setZoom((prev) => Math.max(prev - 10, 10));
	};

	const getSelectedClipInfo = () => {
		for (const layer of layers) {
			const clip = layer.clips.find((c) => c.id === selectedClipId);
			if (clip) {
				return { clip, layer };
			}
		}
		return null;
	};

	const selectedInfo = getSelectedClipInfo();

	return (
		<div className="w-full h-screen bg-slate-900 text-white p-4">
			<Card className="mb-4 p-4 bg-slate-800 border-slate-700">
				<h1 className="text-2xl font-bold mb-4">Timeline Layer Test - Step 7</h1>

				{/* Controls */}
				<div className="flex gap-4 items-center mb-4">
					<div className="flex gap-2">
						<Button onClick={handleZoomOut} size="sm" variant="outline">
							<ZoomOut className="mr-2 h-4 w-4" />
							Zoom Out
						</Button>
						<Button onClick={handleZoomIn} size="sm" variant="outline">
							<ZoomIn className="mr-2 h-4 w-4" />
							Zoom In
						</Button>
						<span className="text-sm text-slate-400 flex items-center ml-2">Zoom: {zoom}px/s</span>
					</div>

					<Button onClick={handleAddLayer} size="sm" variant="outline">
						<Plus className="mr-2 h-4 w-4" />
						Add Layer
					</Button>
				</div>

				{/* Selected Clip Info */}
				{selectedInfo && (
					<div className="p-3 bg-slate-700 rounded mb-4">
						<h3 className="font-semibold mb-2">Selected Clip Info:</h3>
						<div className="text-sm grid grid-cols-2 gap-2">
							<div>Clip ID: {selectedInfo.clip.id}</div>
							<div>Layer: {selectedInfo.layer.name}</div>
							<div>Start Time: {selectedInfo.clip.startTime.toFixed(2)}s</div>
							<div>Duration: {selectedInfo.clip.duration.toFixed(2)}s</div>
							<div>Trim Start: {selectedInfo.clip.trimStart.toFixed(2)}s</div>
							<div>Resource: {selectedInfo.clip.resourceId}</div>
						</div>
					</div>
				)}

				{/* Instructions */}
				<div className="p-3 bg-blue-900/30 rounded">
					<h3 className="font-semibold mb-2">Test Instructions:</h3>
					<ul className="text-sm space-y-1 list-disc list-inside">
						<li>Click on a clip to select it (yellow border)</li>
						<li>Drag a clip to move it horizontally (snaps to seconds)</li>
						<li>Hover over clip edges to see yellow trim handles</li>
						<li>Drag left/right edges to trim the clip</li>
						<li>Use lock button to prevent editing a layer</li>
						<li>Use eye button to hide/show a layer</li>
						<li>Purple gradients indicate transitions</li>
						<li>Zoom in/out to change timeline scale</li>
					</ul>
				</div>
			</Card>

			{/* Timeline Layers */}
			<Card className="bg-slate-800 border-slate-700 overflow-hidden">
				<div className="flex border-b border-slate-600">
					<div className="w-48 bg-slate-700 p-2 text-center font-semibold border-r border-slate-600">Layers</div>
					<div className="flex-1 bg-slate-700 p-2 text-center font-semibold">Timeline (0s - 20s)</div>
				</div>

				<div className="overflow-x-auto overflow-y-auto max-h-150">
					<div style={{ minWidth: `${20 * zoom + 192}px` }}>
						{layers.map((layer) => (
							<TimelineLayer
								key={layer.id}
								layer={layer}
								zoom={zoom}
								selectedClipId={selectedClipId}
								onClipSelect={handleClipSelect}
								onClipMove={handleClipMove}
								onClipTrim={handleClipTrim}
								onToggleLock={handleToggleLock}
								onToggleVisible={handleToggleVisible}
								onToggleMute={handleToggleMute}
								onUpdateClip={(clipId, updates) => {
									setLayers((prevLayers) =>
										prevLayers.map((l) => ({
											...l,
											clips: l.clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c)),
										}))
									);
								}}
								currentTime={currentTime}
							/>
						))}

						{layers.length === 0 && (
							<div className="flex items-center justify-center h-40 text-slate-500">
								No layers. Click "Add Layer" to create one.
							</div>
						)}
					</div>
				</div>
			</Card>
		</div>
	);
};
