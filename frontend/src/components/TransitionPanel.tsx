import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Transition } from "@/types/timeline";
import { CircleFadingPlus, GitMerge, ScanLine, ArrowRightToLine, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

type WipeDirection = "left" | "right" | "up" | "down";
type ZoomDirection = "in" | "out";

interface TransitionPreset {
	type: Transition["type"];
	name: string;
	icon: React.ComponentType<{ className?: string }>;
	color: string;
	description: string;
	hasDirection?: boolean;
}

const transitionPresets: TransitionPreset[] = [
	{
		type: "fade",
		name: "Fade",
		icon: CircleFadingPlus,
		color: "bg-blue-500",
		description: "Smooth fade in/out",
	},
	{
		type: "dissolve",
		name: "Cross Dissolve",
		icon: GitMerge,
		color: "bg-purple-500",
		description: "Crossfade between clips",
	},
	{
		type: "wipe",
		name: "Wipe",
		icon: ScanLine,
		color: "bg-green-500",
		description: "Directional wipe transition",
		hasDirection: true,
	},
	{
		type: "slide",
		name: "Slide",
		icon: ArrowRightToLine,
		color: "bg-orange-500",
		description: "Smooth slide in and out",
		hasDirection: true,
	},
	{
		type: "zoom",
		name: "Zoom",
		icon: Maximize2,
		color: "bg-yellow-500",
		description: "Zoom in or out effect",
		hasDirection: true,
	},
];

const directionOptions: { value: WipeDirection; label: string }[] = [
	{ value: "left", label: "← Left" },
	{ value: "right", label: "→ Right" },
	{ value: "up", label: "↑ Up" },
	{ value: "down", label: "↓ Down" },
];

const zoomDirectionOptions: { value: ZoomDirection; label: string }[] = [
	{ value: "in", label: "⭐ Zoom In" },
	{ value: "out", label: "⭕ Zoom Out" },
];

interface TransitionPanelProps {
	onTransitionSelect?: (transition: Transition) => void;
}

export const TransitionPanel: React.FC<TransitionPanelProps> = ({ onTransitionSelect }) => {
	const [selectedTransition, setSelectedTransition] = useState<Transition["type"] | null>(null);
	const [duration, setDuration] = useState<number>(1); // Default 1 second
	const [direction, setDirection] = useState<WipeDirection | ZoomDirection>("left"); // Default direction
	const [draggedTransition, setDraggedTransition] = useState<Transition["type"] | null>(null);

	// Build transition object with properties
	const buildTransition = (type: Transition["type"]): Transition => {
		const preset = transitionPresets.find((p) => p.type === type);
		const transition: Transition = {
			type,
			duration,
		};
		// Add direction property for wipe and slide
		if (preset?.hasDirection) {
			transition.properties = { direction };
		}
		return transition;
	};

	// Handle drag start for transition preset
	const handleDragStart = (e: React.DragEvent, type: Transition["type"]) => {
		setDraggedTransition(type);
		const transition = buildTransition(type);
		// Store transition data in drag event
		if (e.dataTransfer) {
			e.dataTransfer.setData("application/json", JSON.stringify(transition));
			e.dataTransfer.effectAllowed = "copy";
		}
	};

	// Handle drag end
	const handleDragEnd = () => {
		setDraggedTransition(null);
	};

	// Handle transition preset click
	const handlePresetClick = (type: Transition["type"]) => {
		setSelectedTransition(type);
		// Set default direction based on transition type
		if (type === "zoom") {
			setDirection("in");
		} else if (type === "wipe" || type === "slide") {
			setDirection("left");
		}
		if (onTransitionSelect) {
			const transition = buildTransition(type);
			onTransitionSelect(transition);
		}
	};

	// Handle duration change
	const handleDurationChange = (value: number[]) => {
		setDuration(value[0]);
	};

	// Check if selected transition has direction
	const selectedPreset = transitionPresets.find((p) => p.type === selectedTransition);
	const showDirectionControl =
		selectedPreset?.hasDirection || transitionPresets.find((p) => p.type === draggedTransition)?.hasDirection;

	return (
		<div className="h-full flex flex-col gap-4 p-4 bg-background">
			<div>
				<h2 className="text-lg font-semibold mb-2">Transitions</h2>
				<p className="text-sm text-muted-foreground">Drag transitions to timeline clip edges</p>
			</div>

			{/* Transition Presets Grid */}
			<div className="grid grid-cols-2 gap-3">
				{transitionPresets.map((preset) => (
					<Card
						key={preset.type}
						draggable
						onDragStart={(e) => handleDragStart(e, preset.type)}
						onDragEnd={handleDragEnd}
						onClick={() => handlePresetClick(preset.type)}
						className={cn(
							"cursor-move hover:shadow-lg transition-all duration-200",
							selectedTransition === preset.type && "ring-2 ring-primary",
							draggedTransition === preset.type && "opacity-50"
						)}>
						<CardHeader className="p-3 pb-2">
							<div className="flex items-center gap-2">
								<div className={cn("p-2 rounded-md", preset.color, "text-white")}>
									<preset.icon className="size-5" />
								</div>
								<CardTitle className="text-sm font-medium">{preset.name}</CardTitle>
							</div>
						</CardHeader>
						<CardContent className="p-3 pt-0">
							<p className="text-xs text-muted-foreground">{preset.description}</p>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Duration Control */}
			<Card>
				<CardHeader className="p-3 pb-2">
					<CardTitle className="text-sm font-medium">Transition Duration</CardTitle>
				</CardHeader>
				<CardContent className="p-3 pt-0 space-y-2">
					<div className="flex items-center justify-between">
						<Label htmlFor="duration-slider" className="text-xs text-muted-foreground">
							Duration: {duration.toFixed(1)}s
						</Label>
					</div>
					<Slider
						id="duration-slider"
						min={0.1}
						max={3}
						step={0.1}
						value={[duration]}
						onValueChange={handleDurationChange}
						className="w-full"
					/>
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>0.1s</span>
						<span>3.0s</span>
					</div>
				</CardContent>
			</Card>

			{/* Direction Control - Only for wipe/slide/zoom */}
			{showDirectionControl && (
				<Card>
					<CardHeader className="p-3 pb-2">
						<CardTitle className="text-sm font-medium">Direction</CardTitle>
					</CardHeader>
					<CardContent className="p-3 pt-0 space-y-2">
						<Select value={direction} onValueChange={(value) => setDirection(value as WipeDirection | ZoomDirection)}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select direction" />
							</SelectTrigger>
							<SelectContent>
								{(selectedTransition === "zoom" || draggedTransition === "zoom"
									? zoomDirectionOptions
									: directionOptions
								).map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</CardContent>
				</Card>
			)}

			{/* Instructions */}
			<Card className="bg-muted/50">
				<CardContent className="p-3 text-xs text-muted-foreground space-y-1">
					<p className="font-medium">How to use:</p>
					<ul className="list-disc list-inside space-y-1">
						<li>Drag transition to clip edge</li>
						<li>Drop on start for transition in</li>
						<li>Drop on end for transition out</li>
						<li>Adjust duration before dropping</li>
						<li>Click applied transition to edit</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	);
};
