import React, { useState } from "react";
import type { Transition } from "@/types/timeline";
import { CircleFadingPlus, GitMerge, ScanLine, ArrowRightToLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface TransitionIndicatorProps {
	transition: Transition;
	position: "start" | "end";
	onEdit?: (transition: Transition) => void;
	onRemove?: () => void;
}

// Map transition types to icons and colors
const transitionConfig = {
	fade: {
		icon: CircleFadingPlus,
		color: "bg-blue-500",
		borderColor: "border-blue-500",
		textColor: "text-blue-500",
		name: "Fade",
	},
	dissolve: {
		icon: GitMerge,
		color: "bg-purple-500",
		borderColor: "border-purple-500",
		textColor: "text-purple-500",
		name: "Cross Dissolve",
	},
	wipe: {
		icon: ScanLine,
		color: "bg-green-500",
		borderColor: "border-green-500",
		textColor: "text-green-500",
		name: "Wipe",
	},
	slide: {
		icon: ArrowRightToLine,
		color: "bg-orange-500",
		borderColor: "border-orange-500",
		textColor: "text-orange-500",
		name: "Slide",
	},
};

export const TransitionIndicator: React.FC<TransitionIndicatorProps> = ({ transition, position, onEdit, onRemove }) => {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [duration, setDuration] = useState(transition.duration);

	const config = transitionConfig[transition.type];
	const Icon = config.icon;

	// Handle click to open editor dialog
	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		setIsDialogOpen(true);
	};

	// Handle save
	const handleSave = () => {
		if (onEdit) {
			onEdit({
				...transition,
				duration,
			});
		}
		setIsDialogOpen(false);
	};

	// Handle remove
	const handleRemove = () => {
		if (onRemove) {
			onRemove();
		}
		setIsDialogOpen(false);
	};

	return (
		<>
			{/* Transition Indicator Overlay */}
			<div
				onClick={handleClick}
				className={cn(
					"absolute top-0 bottom-0 w-6 cursor-pointer",
					"flex items-center justify-center",
					"hover:opacity-100 opacity-80 transition-opacity",
					"group",
					position === "start" ? "left-0" : "right-0"
				)}
				title={`${config.name} ${position === "start" ? "In" : "Out"} (${transition.duration}s)`}>
				{/* Background gradient */}
				<div
					className={cn(
						"absolute inset-0",
						config.color,
						position === "start"
							? "bg-linear-to-r from-current to-transparent"
							: "bg-linear-to-l from-current to-transparent",
						"opacity-30 group-hover:opacity-50 transition-opacity"
					)}
				/>

				{/* Icon */}
				<div
					className={cn(
						"relative z-10 p-1 rounded-sm",
						config.color,
						"text-white shadow-sm",
						"group-hover:scale-110 transition-transform"
					)}>
					<Icon className="h-3 w-3" />
				</div>

				{/* Edge border indicator */}
				<div
					className={cn("absolute top-0 bottom-0 w-0.5", config.color, position === "start" ? "left-0" : "right-0")}
				/>
			</div>

			{/* Transition Editor Dialog */}
			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<div className={cn("p-2 rounded-md", config.color, "text-white")}>
								<Icon className="h-4 w-4" />
							</div>
							{config.name} {position === "start" ? "In" : "Out"}
						</DialogTitle>
						<DialogDescription>Edit transition properties</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						{/* Duration Control */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="transition-duration">Duration</Label>
								<span className="text-sm text-muted-foreground">{duration.toFixed(2)}s</span>
							</div>
							<Slider
								id="transition-duration"
								min={0.1}
								max={3}
								step={0.1}
								value={[duration]}
								onValueChange={(value) => setDuration(value[0])}
							/>
							<div className="flex justify-between text-xs text-muted-foreground">
								<span>0.1s</span>
								<span>3.0s</span>
							</div>
						</div>

						{/* Transition Info */}
						<div className={cn("p-3 rounded-md border-2", config.borderColor, "bg-muted/50")}>
							<p className="text-sm">
								<span className="font-medium">Position:</span> {position === "start" ? "Clip Start" : "Clip End"}
							</p>
							<p className="text-sm">
								<span className="font-medium">Type:</span> {config.name}
							</p>
						</div>
					</div>

					{/* Actions */}
					<div className="flex justify-between gap-2">
						<Button variant="destructive" onClick={handleRemove} className="flex-1">
							Remove
						</Button>
						<Button variant="default" onClick={handleSave} className="flex-1">
							Save
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};
