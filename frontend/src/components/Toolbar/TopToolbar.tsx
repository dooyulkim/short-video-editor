import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UndoRedoControls } from "@/components/Toolbar/UndoRedoControls";
import { ProjectControls } from "@/components/Project/ProjectControls";
import {
	Film,
	Music,
	Type,
	Sticker,
	Sparkles,
	ArrowLeftRight,
	Captions,
	Filter,
	Sliders,
	Layout,
	Mic2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TopToolbarProps {
	activeTab?: string;
	onTabChange?: (tab: string) => void;
	onExport?: () => void;
	onProjectChange?: (projectId: string, projectName: string) => void;
}

const toolbarTabs = [
	{ id: "media", label: "Media", icon: Film },
	{ id: "audio", label: "Audio", icon: Music },
	{ id: "text", label: "Text", icon: Type },
	{ id: "stickers", label: "Stickers", icon: Sticker },
	{ id: "effects", label: "Effects", icon: Sparkles },
	{ id: "transitions", label: "Transitions", icon: ArrowLeftRight },
	{ id: "captions", label: "Captions", icon: Captions },
	{ id: "filters", label: "Filters", icon: Filter },
	{ id: "adjust", label: "Adjust", icon: Sliders },
	{ id: "templates", label: "Templates", icon: Layout },
	{ id: "ai-audio", label: "AI Audio", icon: Mic2 },
];

export const TopToolbar: React.FC<TopToolbarProps> = ({
	activeTab = "media",
	onTabChange,
	onExport,
	onProjectChange,
}) => {
	return (
		<div className="h-14 border-b bg-background flex items-center px-4 gap-2">
			{/* Logo/Brand */}
			<div className="flex items-center gap-2 mr-4">
				<Film className="size-6 text-primary" />
				<span className="font-bold text-lg">Short Video Editor</span>
			</div>

			<Separator orientation="vertical" className="h-8" />

			{/* Project Controls - New, Save, Open, Export + Project Name */}
			<ProjectControls onExport={onExport} onProjectChange={onProjectChange} />

			<Separator orientation="vertical" className="h-8" />

			{/* Undo/Redo controls */}
			<UndoRedoControls />

			<Separator orientation="vertical" className="h-8" />

			{/* Toolbar tabs */}
			<div className="flex items-center gap-1 flex-1">
				{toolbarTabs.map((tab) => {
					const Icon = tab.icon;
					return (
						<Button
							key={tab.id}
							variant={activeTab === tab.id ? "secondary" : "ghost"}
							size="sm"
							onClick={() => onTabChange?.(tab.id)}
							className={cn("gap-2", activeTab === tab.id && "bg-primary/10 text-primary")}>
							<Icon className="size-4" />
							<span className="hidden md:inline">{tab.label}</span>
						</Button>
					);
				})}
			</div>
		</div>
	);
};
