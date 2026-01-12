 
 
import type { TimelineState } from "@/context/TimelineContext";
import type { ProjectData, RecentProject } from "@/types/project";

// Re-export types for convenience
export type { ProjectData, RecentProject };

const RECENT_PROJECTS_KEY = "videoEditor_recentProjects";
const MAX_RECENT_PROJECTS = 10;
const PROJECT_VERSION = "1.0.0";

/**
 * Serialize timeline state to project JSON
 */
export function serializeProject(state: TimelineState, projectName: string, projectId?: string): ProjectData {
	const now = new Date().toISOString();

	return {
		id: projectId || crypto.randomUUID(),
		name: projectName,
		version: PROJECT_VERSION,
		createdAt: projectId ? state.currentTime.toString() : now,
		updatedAt: now,
		timeline: {
			layers: state.layers,
			duration: state.duration,
			zoom: state.zoom,
		},
	};
}

/**
 * Validate project JSON structure
 */
export function validateProject(data: any): data is ProjectData {
	if (!data || typeof data !== "object") return false;

	const requiredFields = ["id", "name", "version", "timeline"];
	for (const field of requiredFields) {
		if (!(field in data)) return false;
	}

	const timeline = data.timeline;
	if (!timeline || typeof timeline !== "object") return false;
	if (!Array.isArray(timeline.layers)) return false;
	if (typeof timeline.duration !== "number") return false;
	if (typeof timeline.zoom !== "number") return false;

	return true;
}

/**
 * Save project to JSON file
 */
export function saveProjectToFile(projectData: ProjectData): void {
	const json = JSON.stringify(projectData, null, 2);
	const blob = new Blob([json], { type: "application/json" });
	const url = URL.createObjectURL(blob);

	const link = document.createElement("a");
	link.href = url;
	link.download = `${projectData.name}.json`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	URL.revokeObjectURL(url);
}

/**
 * Load project from JSON file
 */
export function loadProjectFromFile(): Promise<ProjectData> {
	return new Promise((resolve, reject) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json";

		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) {
				reject(new Error("No file selected"));
				return;
			}

			try {
				const text = await file.text();
				const data = JSON.parse(text);

				if (!validateProject(data)) {
					reject(new Error("Invalid project file format"));
					return;
				}

				resolve(data);
			} catch (error) {
				reject(new Error("Failed to parse project file"));
			}
		};

		input.oncancel = () => {
			reject(new Error("File selection cancelled"));
		};

		input.click();
	});
}

/**
 * Get recent projects from localStorage
 */
export function getRecentProjects(): RecentProject[] {
	try {
		const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
		if (!stored) return [];

		const projects = JSON.parse(stored);
		return Array.isArray(projects) ? projects : [];
	} catch (error) {
		console.error("Failed to load recent projects:", error);
		return [];
	}
}

/**
 * Add project to recent projects list
 */
export function addToRecentProjects(project: ProjectData): void {
	try {
		const recent = getRecentProjects();

		// Remove if already exists
		const filtered = recent.filter((p) => p.id !== project.id);

		// Add to front
		const newRecent: RecentProject = {
			id: project.id,
			name: project.name,
			lastOpened: new Date().toISOString(),
		};

		filtered.unshift(newRecent);

		// Limit to max recent projects
		const trimmed = filtered.slice(0, MAX_RECENT_PROJECTS);

		localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(trimmed));
	} catch (error) {
		console.error("Failed to save recent project:", error);
	}
}

/**
 * Remove project from recent projects list
 */
export function removeFromRecentProjects(projectId: string): void {
	try {
		const recent = getRecentProjects();
		const filtered = recent.filter((p) => p.id !== projectId);
		localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(filtered));
	} catch (error) {
		console.error("Failed to remove recent project:", error);
	}
}

/**
 * Clear all recent projects
 */
export function clearRecentProjects(): void {
	try {
		localStorage.removeItem(RECENT_PROJECTS_KEY);
	} catch (error) {
		console.error("Failed to clear recent projects:", error);
	}
}

/**
 * Format date for display
 */
export function formatProjectDate(isoString: string): string {
	try {
		const date = new Date(isoString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return "Just now";
		if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
		if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
		if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

		return date.toLocaleDateString();
	} catch {
		return "Unknown";
	}
}
