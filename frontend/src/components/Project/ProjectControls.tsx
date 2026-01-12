import React, { useState, useCallback, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTimeline } from "@/context/TimelineContext";
import { useToast } from "@/components/ui/use-toast";
import {
	serializeProject,
	saveProjectToFile,
	loadProjectFromFile,
	addToRecentProjects,
	getRecentProjects,
	removeFromRecentProjects,
	formatProjectDate,
} from "@/utils/projectUtils";
import type { RecentProject } from "@/types/project";
import { deleteProject } from "@/services/api";
import { Save, FolderOpen, FileDown, FilePlus, Loader2, ChevronDown, Pencil, FolderCog, Trash2 } from "lucide-react";

// Generate a unique project ID
const generateProjectId = () => `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

interface ProjectControlsProps {
	onExport?: () => void;
	onProjectChange?: (projectId: string, projectName: string) => void;
}

export function ProjectControls({ onExport, onProjectChange }: ProjectControlsProps) {
	const timeline = useTimeline();
	const { toast } = useToast();
	const [isPending, startTransition] = useTransition();

	// Project state - initialize with a unique project ID
	const [projectName, setProjectName] = useState("Untitled Project");
	const [currentProjectId, setCurrentProjectId] = useState<string>(() => generateProjectId());

	// Dialog states
	const [showSaveDialog, setShowSaveDialog] = useState(false);
	const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
	const [showRenameDialog, setShowRenameDialog] = useState(false);
	const [showManageProjectsDialog, setShowManageProjectsDialog] = useState(false);
	const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);

	// Temporary name for dialogs
	const [tempProjectName, setTempProjectName] = useState("");

	// Recent projects for manage dialog
	const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
	const [projectToDelete, setProjectToDelete] = useState<RecentProject | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	// Notify parent when project changes
	useEffect(() => {
		onProjectChange?.(currentProjectId, projectName);
	}, [currentProjectId, projectName, onProjectChange]);

	// Handle Save
	const handleSave = useCallback(() => {
		setTempProjectName(projectName);
		setShowSaveDialog(true);
	}, [projectName]);

	const handleSaveConfirm = useCallback(() => {
		if (!timeline) return;
		if (!tempProjectName.trim()) {
			toast({
				title: "Invalid Name",
				description: "Please enter a project name.",
				variant: "destructive",
			});
			return;
		}

		try {
			const finalName = tempProjectName.trim();
			const projectData = serializeProject(timeline.state, finalName, currentProjectId);
			saveProjectToFile(projectData);
			addToRecentProjects(projectData);
			setProjectName(finalName);
			setCurrentProjectId(projectData.id);
			setShowSaveDialog(false);

			toast({
				title: "Project Saved",
				description: `"${finalName}" has been saved successfully.`,
			});
		} catch (error) {
			console.error("Save failed:", error);
			toast({
				title: "Save Failed",
				description: "Failed to save project. Please try again.",
				variant: "destructive",
			});
		}
	}, [timeline, tempProjectName, currentProjectId, toast]);

	// Handle Load
	const handleLoad = useCallback(() => {
		startTransition(async () => {
			try {
				const projectData = await loadProjectFromFile();

				if (!timeline) return;

				timeline.restoreState({
					layers: projectData.timeline.layers,
					currentTime: 0,
					duration: projectData.timeline.duration,
					zoom: projectData.timeline.zoom,
					selectedClipId: null,
					isPlaying: false,
					canvasSize: timeline.state.canvasSize,
				});

				setProjectName(projectData.name);
				setCurrentProjectId(projectData.id);
				addToRecentProjects(projectData);

				toast({
					title: "Project Loaded",
					description: `"${projectData.name}" has been loaded successfully.`,
				});
			} catch (error) {
				if ((error as Error).message !== "File selection cancelled") {
					console.error("Load failed:", error);
					toast({
						title: "Load Failed",
						description: (error as Error).message || "Failed to load project.",
						variant: "destructive",
					});
				}
			}
		});
	}, [timeline, toast]);

	// Handle New Project
	const handleNew = useCallback(() => {
		setTempProjectName("");
		setShowNewProjectDialog(true);
	}, []);

	const handleNewConfirm = useCallback(() => {
		if (!timeline) return;
		if (!tempProjectName.trim()) {
			toast({
				title: "Invalid Name",
				description: "Please enter a project name.",
				variant: "destructive",
			});
			return;
		}

		timeline.resetTimeline();
		setProjectName(tempProjectName.trim());
		// Generate new project ID for new project
		setCurrentProjectId(generateProjectId());
		setShowNewProjectDialog(false);

		toast({
			title: "New Project Created",
			description: `"${tempProjectName.trim()}" has been created.`,
		});
	}, [timeline, tempProjectName, toast]);

	// Handle Rename
	const handleRename = useCallback(() => {
		setTempProjectName(projectName);
		setShowRenameDialog(true);
	}, [projectName]);

	const handleRenameConfirm = useCallback(() => {
		if (!tempProjectName.trim()) {
			toast({
				title: "Invalid Name",
				description: "Please enter a project name.",
				variant: "destructive",
			});
			return;
		}

		const newName = tempProjectName.trim();
		setProjectName(newName);
		setShowRenameDialog(false);

		toast({
			title: "Project Renamed",
			description: `Project renamed to "${newName}".`,
		});
	}, [tempProjectName, toast]);

	// Handle Manage Projects
	const handleManageProjects = useCallback(() => {
		setRecentProjects(getRecentProjects());
		setShowManageProjectsDialog(true);
	}, []);

	// Handle Delete Project confirmation request
	const handleDeleteProjectRequest = useCallback((project: RecentProject) => {
		setProjectToDelete(project);
		setShowDeleteConfirmDialog(true);
	}, []);

	// Handle Delete Project confirmed
	const handleDeleteProjectConfirm = useCallback(async () => {
		if (!projectToDelete) return;

		setIsDeleting(true);
		try {
			// Call API to delete project media from backend
			await deleteProject(projectToDelete.id);

			// Remove from recent projects list
			removeFromRecentProjects(projectToDelete.id);

			// Update local state
			setRecentProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));

			toast({
				title: "Project Deleted",
				description: `"${projectToDelete.name}" has been deleted.`,
			});
		} catch (error) {
			console.error("Delete failed:", error);
			// Even if backend fails (e.g., project doesn't exist on server), remove from recent projects
			removeFromRecentProjects(projectToDelete.id);
			setRecentProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));

			toast({
				title: "Project Removed",
				description: `"${projectToDelete.name}" has been removed from the list.`,
			});
		} finally {
			setIsDeleting(false);
			setShowDeleteConfirmDialog(false);
			setProjectToDelete(null);
		}
	}, [projectToDelete, toast]);

	return (
		<>
			{/* Project Name with dropdown - placed first/left */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="px-2 py-1 text-sm text-muted-foreground border-r border-border mr-1 gap-1 hover:text-foreground">
						{projectName}
						<ChevronDown className="size-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					<DropdownMenuItem onClick={handleRename}>
						<Pencil className="size-4 mr-2" />
						Rename Project
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleManageProjects}>
						<FolderCog className="size-4 mr-2" />
						Manage Projects
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* File operation buttons */}
			<div className="flex items-center gap-1 mr-2">
				<Button variant="ghost" size="sm" onClick={handleNew} className="gap-2" title="New Project">
					<FilePlus className="size-4" />
					New
				</Button>
				<Button variant="ghost" size="sm" onClick={handleSave} className="gap-2" title="Save Project">
					<Save className="size-4" />
					Save
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={handleLoad}
					className="gap-2"
					disabled={isPending}
					title="Open Project">
					{isPending ? <Loader2 className="size-4 animate-spin" /> : <FolderOpen className="size-4" />}
					Open
				</Button>
				<Button variant="ghost" size="sm" onClick={onExport} className="gap-2" title="Export Video">
					<FileDown className="size-4" />
					Export
				</Button>
			</div>

			{/* Save Project Dialog */}
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
							<Label htmlFor="save-project-name">Project Name</Label>
							<Input
								id="save-project-name"
								value={tempProjectName}
								onChange={(e) => setTempProjectName(e.target.value)}
								placeholder="Enter project name"
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										handleSaveConfirm();
									}
								}}
								autoFocus
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowSaveDialog(false)}>
							Cancel
						</Button>
						<Button onClick={handleSaveConfirm} disabled={!tempProjectName.trim()}>
							Save Project
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* New Project Dialog */}
			<Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New Project</DialogTitle>
						<DialogDescription>
							Enter a name for your new project. Any unsaved changes in the current project will be lost.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="new-project-name">Project Name</Label>
							<Input
								id="new-project-name"
								value={tempProjectName}
								onChange={(e) => setTempProjectName(e.target.value)}
								placeholder="Enter project name"
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										handleNewConfirm();
									}
								}}
								autoFocus
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowNewProjectDialog(false)}>
							Cancel
						</Button>
						<Button onClick={handleNewConfirm} disabled={!tempProjectName.trim()}>
							Create Project
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Rename Project Dialog */}
			<Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rename Project</DialogTitle>
						<DialogDescription>Enter a new name for your project.</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="rename-project-name">Project Name</Label>
							<Input
								id="rename-project-name"
								value={tempProjectName}
								onChange={(e) => setTempProjectName(e.target.value)}
								placeholder="Enter project name"
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										handleRenameConfirm();
									}
								}}
								autoFocus
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowRenameDialog(false)}>
							Cancel
						</Button>
						<Button onClick={handleRenameConfirm} disabled={!tempProjectName.trim()}>
							Rename
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Manage Projects Dialog */}
			<Dialog open={showManageProjectsDialog} onOpenChange={setShowManageProjectsDialog}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Manage Projects</DialogTitle>
						<DialogDescription>
							View and manage your recent projects. You can delete projects that are not currently open.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						{recentProjects.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-4">No recent projects found.</p>
						) : (
							<div className="space-y-2 max-h-64 overflow-y-auto">
								{recentProjects.map((project) => {
									const isCurrentProject = project.id === currentProjectId;
									return (
										<div
											key={project.id}
											className={`flex items-center justify-between p-3 rounded-lg border ${
												isCurrentProject ? "bg-accent border-accent" : "hover:bg-muted/50"
											}`}>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<p className="font-medium truncate">{project.name}</p>
													{isCurrentProject && (
														<span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
															Current
														</span>
													)}
												</div>
												<p className="text-xs text-muted-foreground">{formatProjectDate(project.lastOpened)}</p>
											</div>
											{!isCurrentProject && (
												<Button
													variant="ghost"
													size="sm"
													className="text-destructive hover:text-destructive hover:bg-destructive/10"
													onClick={() => handleDeleteProjectRequest(project)}>
													<Trash2 className="size-4" />
												</Button>
											)}
										</div>
									);
								})}
							</div>
						)}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowManageProjectsDialog(false)}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Project</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete "{projectToDelete?.name}"? This will permanently remove all media files
							associated with this project. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setShowDeleteConfirmDialog(false);
								setProjectToDelete(null);
							}}
							disabled={isDeleting}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDeleteProjectConfirm} disabled={isDeleting}>
							{isDeleting ? (
								<>
									<Loader2 className="size-4 mr-2 animate-spin" />
									Deleting...
								</>
							) : (
								"Delete Project"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

export default ProjectControls;
