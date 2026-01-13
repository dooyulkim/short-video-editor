/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef, useMemo } from "react";
import type { ReactNode } from "react";
import type { TimelineLayer, Clip } from "@/types/timeline";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { calculateContentDuration } from "@/utils/clipOperations";

// LocalStorage keys for persisting timeline state
const TIMELINE_STATE_KEY = "videoEditor_timelineState";
const CURRENT_PROJECT_KEY = "videoEditor_currentProject";

// Helper to get current project ID from localStorage
const getCurrentProjectId = (): string | null => {
	try {
		const stored = localStorage.getItem(CURRENT_PROJECT_KEY);
		if (stored) {
			const { projectId } = JSON.parse(stored);
			return projectId || null;
		}
	} catch (error) {
		console.error("Failed to get current project ID:", error);
	}
	return null;
};

// Helper to save timeline state to localStorage
const saveTimelineState = (state: TimelineState): void => {
	const projectId = getCurrentProjectId();
	if (!projectId) return;

	try {
		const stateToSave = {
			projectId,
			layers: state.layers,
			duration: state.duration,
			zoom: state.zoom,
			canvasSize: state.canvasSize,
		};
		localStorage.setItem(TIMELINE_STATE_KEY, JSON.stringify(stateToSave));
	} catch (error) {
		console.error("Failed to save timeline state:", error);
	}
};

// Helper to load timeline state from localStorage
const loadTimelineState = (): Partial<TimelineState> | null => {
	const projectId = getCurrentProjectId();
	if (!projectId) return null;

	try {
		const stored = localStorage.getItem(TIMELINE_STATE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			// Only restore if it matches the current project
			if (parsed.projectId === projectId) {
				// Migrate old 120-second duration to new 180-second minimum
				let duration = parsed.duration || 180;
				if (duration === 120) {
					duration = 180;
				}
				// Ensure duration is within new limits (180-300 seconds)
				duration = Math.min(300, Math.max(180, duration));

				return {
					layers: parsed.layers || [],
					duration: duration,
					zoom: parsed.zoom || 20,
					canvasSize: parsed.canvasSize || { width: 1080, height: 1920 },
				};
			}
		}
	} catch (error) {
		console.error("Failed to load timeline state:", error);
	}
	return null;
};

// State interface
export interface TimelineState {
	layers: TimelineLayer[];
	currentTime: number;
	duration: number;
	zoom: number; // pixels per second
	selectedClipId: string | null;
	isPlaying: boolean;
	canvasSize: { width: number; height: number }; // Canvas/export dimensions
}

// Action types
export type TimelineAction =
	| { type: "ADD_CLIP"; payload: { clip: Clip; layerIndex: number } }
	| { type: "REMOVE_CLIP"; payload: { clipId: string } }
	| { type: "UPDATE_CLIP"; payload: { clipId: string; updates: Partial<Clip> } }
	| { type: "MOVE_CLIP"; payload: { clipId: string; newStartTime: number } }
	| { type: "TRIM_CLIP"; payload: { clipId: string; newDuration: number } }
	| { type: "ADD_LAYER"; payload: { layerType: TimelineLayer["type"] } }
	| { type: "REMOVE_LAYER"; payload: { layerId: string } }
	| { type: "UPDATE_LAYER"; payload: { layerId: string; updates: Partial<TimelineLayer> } }
	| { type: "REORDER_LAYER"; payload: { layerId: string; newIndex: number } }
	| { type: "TOGGLE_LAYER_VISIBILITY"; payload: { layerId: string } }
	| { type: "TOGGLE_LAYER_MUTE"; payload: { layerId: string } }
	| { type: "SET_CURRENT_TIME"; payload: { time: number } }
	| { type: "SET_ZOOM"; payload: { zoom: number } }
	| { type: "PLAY" }
	| { type: "PAUSE" }
	| { type: "SET_SELECTED_CLIP"; payload: { clipId: string | null } }
	| { type: "SET_DURATION"; payload: { duration: number } }
	| { type: "SET_CANVAS_SIZE"; payload: { width: number; height: number } }
	| { type: "RESTORE_STATE"; payload: { state: TimelineState } };

// Initial state
const initialState: TimelineState = {
	layers: [],
	currentTime: 0,
	duration: 180, // 180 seconds (3 minutes) default duration
	zoom: 20, // 20 pixels per second default
	selectedClipId: null,
	isPlaying: false,
	canvasSize: { width: 1080, height: 1920 }, // Default portrait for short videos
};

// Reducer function
function timelineReducer(state: TimelineState, action: TimelineAction): TimelineState {
	switch (action.type) {
		case "ADD_CLIP": {
			const { clip, layerIndex } = action.payload;
			const newLayers = [...state.layers];

			// Ensure layer exists
			if (layerIndex >= newLayers.length) {
				return state;
			}

			newLayers[layerIndex] = {
				...newLayers[layerIndex],
				clips: [...newLayers[layerIndex].clips, clip],
			};

			// Update duration if clip extends beyond current duration (minimum 180 seconds, maximum 300 seconds)
			const clipEndTime = clip.startTime + clip.duration;
			const newDuration = Math.min(300, Math.max(180, state.duration, clipEndTime));

			return {
				...state,
				layers: newLayers,
				duration: newDuration,
			};
		}

		case "REMOVE_CLIP": {
			const { clipId } = action.payload;
			const newLayers = state.layers.map((layer) => ({
				...layer,
				clips: layer.clips.filter((clip) => clip.id !== clipId),
			}));

			return {
				...state,
				layers: newLayers,
				selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
			};
		}

		case "UPDATE_CLIP": {
			const { clipId, updates } = action.payload;
			const newLayers = state.layers.map((layer) => ({
				...layer,
				clips: layer.clips.map((clip) => (clip.id === clipId ? { ...clip, ...updates } : clip)),
			}));

			return {
				...state,
				layers: newLayers,
			};
		}

		case "MOVE_CLIP": {
			const { clipId, newStartTime } = action.payload;
			const newLayers = state.layers.map((layer) => ({
				...layer,
				clips: layer.clips.map((clip) =>
					clip.id === clipId ? { ...clip, startTime: Math.max(0, newStartTime) } : clip
				),
			}));

			return {
				...state,
				layers: newLayers,
			};
		}

		case "TRIM_CLIP": {
			const { clipId, newDuration } = action.payload;
			const newLayers = state.layers.map((layer) => ({
				...layer,
				clips: layer.clips.map((clip) => (clip.id === clipId ? { ...clip, duration: Math.max(0, newDuration) } : clip)),
			}));

			return {
				...state,
				layers: newLayers,
			};
		}

		case "ADD_LAYER": {
			const { layerType } = action.payload;
			const newLayer: TimelineLayer = {
				id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				type: layerType,
				muted: false,
				clips: [],
				locked: false,
				visible: true,
				name: `${layerType.charAt(0).toUpperCase() + layerType.slice(1)} Layer ${state.layers.length + 1}`,
			};

			return {
				...state,
				layers: [...state.layers, newLayer],
			};
		}

		case "REMOVE_LAYER": {
			const { layerId } = action.payload;
			return {
				...state,
				layers: state.layers.filter((layer) => layer.id !== layerId),
			};
		}

		case "UPDATE_LAYER": {
			const { layerId, updates } = action.payload;
			const newLayers = state.layers.map((layer) => (layer.id === layerId ? { ...layer, ...updates } : layer));

			return {
				...state,
				layers: newLayers,
			};
		}

		case "SET_CURRENT_TIME": {
			const { time } = action.payload;
			return {
				...state,
				currentTime: Math.max(0, Math.min(time, state.duration)),
			};
		}

		case "SET_ZOOM": {
			const { zoom } = action.payload;
			return {
				...state,
				zoom: Math.max(1, Math.min(zoom, 200)), // Clamp between 1 and 200 pixels per second
			};
		}

		case "PLAY":
			return {
				...state,
				isPlaying: true,
			};

		case "PAUSE":
			return {
				...state,
				isPlaying: false,
			};

		case "SET_SELECTED_CLIP": {
			const { clipId } = action.payload;
			return {
				...state,
				selectedClipId: clipId,
			};
		}

		case "SET_DURATION": {
			const { duration } = action.payload;
			return {
				...state,
				duration: Math.min(300, Math.max(180, duration)), // Minimum 180 seconds (3 minutes), maximum 300 seconds (5 minutes)
			};
		}

		case "SET_CANVAS_SIZE": {
			const { width, height } = action.payload;
			return {
				...state,
				canvasSize: { width, height },
			};
		}

		case "REORDER_LAYER": {
			const { layerId, newIndex } = action.payload;
			const newLayers = [...state.layers];
			const currentIndex = newLayers.findIndex((l) => l.id === layerId);

			// Remove layer from current position
			const [layer] = newLayers.splice(currentIndex, 1);
			// Insert at new position
			newLayers.splice(newIndex, 0, layer);

			return { ...state, layers: newLayers };
		}

		case "TOGGLE_LAYER_VISIBILITY": {
			const { layerId } = action.payload;
			const newLayers = state.layers.map((layer) =>
				layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
			);

			return { ...state, layers: newLayers };
		}

		case "TOGGLE_LAYER_MUTE": {
			const { layerId } = action.payload;
			const newLayers = state.layers.map((layer) => (layer.id === layerId ? { ...layer, muted: !layer.muted } : layer));

			return { ...state, layers: newLayers };
		}

		case "RESTORE_STATE": {
			const { state: restoredState } = action.payload;
			return restoredState;
		}
		default:
			return state;
	}
}

// Context interface
interface TimelineContextType {
	state: TimelineState;
	dispatch: React.Dispatch<TimelineAction>;
	addClip: (clip: Clip, layerIndex: number) => void;
	removeClip: (clipId: string) => void;
	updateClip: (clipId: string, updates: Partial<Clip>) => void;
	moveClip: (clipId: string, newStartTime: number) => void;
	trimClip: (clipId: string, newDuration: number) => void;
	addLayer: (layerType: TimelineLayer["type"]) => void;
	removeLayer: (layerId: string) => void;
	updateLayer: (layerId: string, updates: Partial<TimelineLayer>) => void;
	reorderLayer: (layerId: string, newIndex: number) => void;
	toggleLayerVisibility: (layerId: string) => void;
	toggleLayerMute: (layerId: string) => void;
	setCurrentTime: (time: number) => void;
	undo: () => void;
	redo: () => void;
	canUndo: boolean;
	canRedo: boolean;
	setZoom: (zoom: number) => void;
	play: () => void;
	pause: () => void;
	setSelectedClip: (clipId: string | null) => void;
	setDuration: (duration: number) => void;
	setCanvasSize: (width: number, height: number) => void;
	restoreState: (state: TimelineState) => void;
	resetTimeline: () => void;
}

// Create context
const TimelineContext = createContext<TimelineContextType | undefined>(undefined);

// Provider component
interface TimelineProviderProps {
	children: ReactNode;
	initialState?: Partial<TimelineState>;
}

// Helper to create initial state with localStorage restoration
const createInitialState = (customInitialState?: Partial<TimelineState>): TimelineState => {
	// First, try to restore from localStorage
	const savedState = loadTimelineState();
	if (savedState) {
		return {
			...initialState,
			...savedState,
			// Always reset these transient states
			currentTime: 0,
			selectedClipId: null,
			isPlaying: false,
		};
	}
	// Fall back to custom or default initial state
	return customInitialState ? { ...initialState, ...customInitialState } : initialState;
};

export function TimelineProvider({ children, initialState: customInitialState }: TimelineProviderProps) {
	const [state, dispatch] = useReducer(timelineReducer, customInitialState, createInitialState);

	// Ref to track current time for playback without triggering re-renders
	const currentTimeRef = useRef(state.currentTime);
	const durationRef = useRef(state.duration);

	// Calculate the content duration (end of last resource) and keep it in a ref
	const contentDuration = useMemo(() => calculateContentDuration(state.layers), [state.layers]);
	const contentDurationRef = useRef(contentDuration);

	// Update refs when state changes
	useEffect(() => {
		currentTimeRef.current = state.currentTime;
		durationRef.current = state.duration;
		contentDurationRef.current = contentDuration;
	}, [state.currentTime, state.duration, contentDuration]);

	// Initialize undo/redo first
	const { undo, redo, canUndo, canRedo, addToHistory } = useUndoRedo(state, (restoredState: TimelineState) => {
		// Use a flag to prevent adding restored state back to history
		isRestoringRef.current = true;
		dispatch({ type: "RESTORE_STATE", payload: { state: restoredState } });
	});

	// Create a ref to track if we're currently restoring from history
	const isRestoringRef = useRef(false);

	// Track state changes for history (excluding currentTime, isPlaying, selectedClipId, and zoom)
	// Create a stable reference to the parts of state we want to track
	const trackableState = useRef<Pick<TimelineState, "layers" | "duration">>({
		layers: state.layers,
		duration: state.duration,
	});

	useEffect(() => {
		// If we just restored, reset the flag and don't add to history
		if (isRestoringRef.current) {
			isRestoringRef.current = false;
			trackableState.current = {
				layers: state.layers,
				duration: state.duration,
			};
			return;
		}

		const currentTrackable = {
			layers: state.layers,
			duration: state.duration,
		};

		// Check if trackable state has actually changed
		const hasChanged =
			JSON.stringify(currentTrackable.layers) !== JSON.stringify(trackableState.current.layers) ||
			currentTrackable.duration !== trackableState.current.duration;

		if (hasChanged) {
			// Update the tracked state
			trackableState.current = currentTrackable;

			// Debounce to avoid too many history entries for rapid changes
			const timeoutId = setTimeout(() => {
				addToHistory(state);
			}, 300);

			return () => clearTimeout(timeoutId);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.layers, state.duration, addToHistory]);

	// Persist timeline state to localStorage (debounced)
	useEffect(() => {
		const timeoutId = setTimeout(() => {
			saveTimelineState(state);
		}, 500);

		return () => clearTimeout(timeoutId);
	}, [state.layers, state.duration, state.zoom, state.canvasSize]);

	// Playback loop - update currentTime during playback
	useEffect(() => {
		if (!state.isPlaying) return;

		let animationFrameId: number;
		let lastTimestamp: number | null = null;

		const animate = (timestamp: number) => {
			if (lastTimestamp === null) {
				lastTimestamp = timestamp;
				animationFrameId = requestAnimationFrame(animate);
				return;
			}

			// Calculate elapsed time in seconds
			const deltaTime = (timestamp - lastTimestamp) / 1000;
			lastTimestamp = timestamp;

			// Update current time using ref to avoid stale state
			const newTime = currentTimeRef.current + deltaTime;

			// Check if reached end of content (end of last resource placed)
			// Use contentDurationRef for actual content, fall back to 0 if no content
			const maxPlaybackTime = contentDurationRef.current > 0 ? contentDurationRef.current : 0;

			// Stop playback if no content or reached end of content
			if (maxPlaybackTime <= 0 || newTime >= maxPlaybackTime) {
				const finalTime = maxPlaybackTime > 0 ? maxPlaybackTime : 0;
				dispatch({ type: "SET_CURRENT_TIME", payload: { time: finalTime } });
				dispatch({ type: "PAUSE" });
				return;
			}

			// Update currentTime
			dispatch({ type: "SET_CURRENT_TIME", payload: { time: newTime } });

			// Continue animation loop
			animationFrameId = requestAnimationFrame(animate);
		};

		// Start animation loop
		animationFrameId = requestAnimationFrame(animate);

		// Cleanup
		return () => {
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}
		};
	}, [state.isPlaying]); // Only depend on isPlaying to avoid restarts

	// Action creators
	const addClip = useCallback((clip: Clip, layerIndex: number) => {
		dispatch({ type: "ADD_CLIP", payload: { clip, layerIndex } });
	}, []);

	const removeClip = useCallback((clipId: string) => {
		dispatch({ type: "REMOVE_CLIP", payload: { clipId } });
	}, []);

	const updateClip = useCallback((clipId: string, updates: Partial<Clip>) => {
		dispatch({ type: "UPDATE_CLIP", payload: { clipId, updates } });
	}, []);

	const moveClip = useCallback((clipId: string, newStartTime: number) => {
		dispatch({ type: "MOVE_CLIP", payload: { clipId, newStartTime } });
	}, []);

	const trimClip = useCallback((clipId: string, newDuration: number) => {
		dispatch({ type: "TRIM_CLIP", payload: { clipId, newDuration } });
	}, []);

	const addLayer = useCallback((layerType: TimelineLayer["type"]) => {
		dispatch({ type: "ADD_LAYER", payload: { layerType } });
	}, []);

	const removeLayer = useCallback((layerId: string) => {
		dispatch({ type: "REMOVE_LAYER", payload: { layerId } });
	}, []);

	const updateLayer = useCallback((layerId: string, updates: Partial<TimelineLayer>) => {
		dispatch({ type: "UPDATE_LAYER", payload: { layerId, updates } });
	}, []);

	const reorderLayer = useCallback((layerId: string, newIndex: number) => {
		dispatch({ type: "REORDER_LAYER", payload: { layerId, newIndex } });
	}, []);

	const toggleLayerVisibility = useCallback((layerId: string) => {
		dispatch({ type: "TOGGLE_LAYER_VISIBILITY", payload: { layerId } });
	}, []);

	const toggleLayerMute = useCallback((layerId: string) => {
		dispatch({ type: "TOGGLE_LAYER_MUTE", payload: { layerId } });
	}, []);

	const setCurrentTime = useCallback((time: number) => {
		dispatch({ type: "SET_CURRENT_TIME", payload: { time } });
	}, []);

	const setZoom = useCallback((zoom: number) => {
		dispatch({ type: "SET_ZOOM", payload: { zoom } });
	}, []);

	const play = useCallback(() => {
		dispatch({ type: "PLAY" });
	}, []);

	const pause = useCallback(() => {
		dispatch({ type: "PAUSE" });
	}, []);

	const setSelectedClip = useCallback((clipId: string | null) => {
		dispatch({ type: "SET_SELECTED_CLIP", payload: { clipId } });
	}, []);

	const setDuration = useCallback((duration: number) => {
		dispatch({ type: "SET_DURATION", payload: { duration } });
	}, []);

	const setCanvasSize = useCallback((width: number, height: number) => {
		dispatch({ type: "SET_CANVAS_SIZE", payload: { width, height } });
	}, []);

	const restoreStateAction = useCallback((restoredState: TimelineState) => {
		dispatch({ type: "RESTORE_STATE", payload: { state: restoredState } });
	}, []);

	const resetTimeline = useCallback(() => {
		// Clear saved state from localStorage
		try {
			localStorage.removeItem(TIMELINE_STATE_KEY);
		} catch (error) {
			console.error("Failed to clear timeline state from localStorage:", error);
		}
		dispatch({ type: "RESTORE_STATE", payload: { state: initialState } });
	}, []);

	const value: TimelineContextType = {
		state,
		dispatch,
		addClip,
		removeClip,
		updateClip,
		moveClip,
		trimClip,
		addLayer,
		removeLayer,
		updateLayer,
		reorderLayer,
		toggleLayerVisibility,
		toggleLayerMute,
		setCurrentTime,
		setZoom,
		play,
		pause,
		setSelectedClip,
		setDuration,
		setCanvasSize,
		undo,
		redo,
		canUndo,
		canRedo,
		restoreState: restoreStateAction,
		resetTimeline,
	};

	return <TimelineContext value={value}>{children}</TimelineContext>;
}

// Custom hook to use timeline context
export function useTimeline(): TimelineContextType {
	const context = useContext(TimelineContext);
	if (context === undefined) {
		throw new Error("useTimeline must be used within a TimelineProvider");
	}
	return context;
}
