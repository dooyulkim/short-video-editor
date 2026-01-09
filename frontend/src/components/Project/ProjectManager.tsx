import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTimeline } from "@/context/TimelineContext";
import type { RecentProject } from "@/types/project";
import {
	addToRecentProjects,
	formatProjectDate,
	getRecentProjects,
	loadProjectFromFile,
	removeFromRecentProjects,
	saveProjectToFile,
	serializeProject,
} from "@/utils/projectUtils";
import { Clock, Download, FileText, FolderOpen, Save, Trash2 } from "lucide-react";
import React, { useState, useTransition } from "react";

export function ProjectManager() {
	const { state, restoreState, resetTimeline } = useTimeline();
	const [recentProjects, setRecentProjects] = useState<RecentProject[]>(() => getRecentProjects());
	const [showSaveDialog, setShowSaveDialog] = useState(false);
	const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
	const [projectName, setProjectName] = useState("Untitled Project");
	const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

	// React 19: useTransition for non-blocking async updates
	const [isPending, startTransition] = useTransition();

	const loadRecentProjects = () => {
		const recent = getRecentProjects();
		setRecentProjects(recent);
	};

	const handleSaveProject = () => {
		try {
			const projectData = serializeProject(state, projectName, currentProjectId || undefined);
			saveProjectToFile(projectData);
			addToRecentProjects(projectData);
			setCurrentProjectId(projectData.id);
			loadRecentProjects();
			setShowSaveDialog(false);

			console.log("Project saved:", projectName);
		} catch (error) {
			console.error("Save failed:", error);
		}
	};

	const handleLoadProject = () => {
		startTransition(async () => {
			try {
				const projectData = await loadProjectFromFile();

				// Restore timeline state
				restoreState({
					layers: projectData.timeline.layers,
					currentTime: 0,
					duration: projectData.timeline.duration,
					zoom: projectData.timeline.zoom,
					selectedClipId: null,
					isPlaying: false,
				});

				setProjectName(projectData.name);
				setCurrentProjectId(projectData.id);
				addToRecentProjects(projectData);
				loadRecentProjects();

				console.log("Project loaded:", projectData.name);
			} catch (error) {
				if ((error as Error).message !== "File selection cancelled") {
					console.error("Load failed:", (error as Error).message || "Failed to load project.");
				}
			}
		});
	};

	const handleNewProject = () => {
		setShowNewProjectDialog(true);
	};

	const confirmNewProject = () => {
		resetTimeline();
		setProjectName("Untitled Project");
		setCurrentProjectId(null);
		setShowNewProjectDialog(false);

		console.log("Started new project");
	};

	const handleRemoveRecent = (projectId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		removeFromRecentProjects(projectId);
		loadRecentProjects();

		console.log("Removed project from recent list:", projectId);
	};

	const handleOpenRecent = () => {
		// Note: We can't directly load from recent list since we only store metadata
		// User needs to use "Load Project" to select the actual file
		console.log("Please use the Load Project button to open the project file.");
	};

	return (
		<div className="flex items-center gap-2">
			{/* Save Project Button */}
			<Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)} className="gap-2">
				<Save className="size-4" />
				Save
			</Button>

			{/* Load Project Button */}
			<Button variant="outline" size="sm" onClick={handleLoadProject} disabled={isPending} className="gap-2">
				<FolderOpen className="size-4" />
				{isPending ? "Loading..." : "Load"}
			</Button>

			{/* New Project Button */}
			<Button variant="outline" size="sm" onClick={handleNewProject} className="gap-2">
				<FileText className="size-4" />
				New
			</Button>

			{/* Current Project Name */}
			<div className="ml-4 text-sm text-muted-foreground">{projectName}</div>

			{/* Save Dialog */}
			<Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Save Project</DialogTitle>
						<DialogDescription>
							Enter a name for your project. The project will be saved as a JSON file.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="project-name">Project Name</Label>
							<Input
								id="project-name"
								value={projectName}
								onChange={(e) => setProjectName(e.target.value)}
								placeholder="Enter project name"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowSaveDialog(false)}>
							Cancel
						</Button>
						<Button onClick={handleSaveProject} className="gap-2">
							<Download className="size-4" />
							Save Project
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* New Project Confirmation Dialog */}
			<Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New Project</DialogTitle>
						<DialogDescription>
							Are you sure you want to create a new project? Any unsaved changes will be lost.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowNewProjectDialog(false)}>
							Cancel
						</Button>
						<Button onClick={confirmNewProject} variant="destructive">
							Create New Project
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Recent Projects Panel (Optional - can be shown in a dropdown or separate panel) */}
			{recentProjects.length > 0 && (
				<Dialog>
					<DialogContent className="max-w-2xl">
						<DialogHeader>
							<DialogTitle>Recent Projects</DialogTitle>
							<DialogDescription>Open a recently accessed project</DialogDescription>
						</DialogHeader>
						<div className="h-96 overflow-y-auto pr-4">
							<div className="space-y-2">
								{recentProjects.map((project) => (
									<Card
										key={project.id}
										className="cursor-pointer hover:bg-accent transition-colors"
										onClick={handleOpenRecent}>
										<CardHeader className="p-4">
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<CardTitle className="text-base">{project.name}</CardTitle>
													<CardDescription className="flex items-center gap-1 mt-1">
														<Clock className="size-3" />
														{formatProjectDate(project.lastOpened)}
													</CardDescription>
												</div>
												<Button
													variant="ghost"
													size="icon"
													className="size-8"
													onClick={(e) => handleRemoveRecent(project.id, e)}>
													<Trash2 className="size-4" />
												</Button>
											</div>
										</CardHeader>
									</Card>
								))}
							</div>
						</div>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}

export default ProjectManager;
