/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import type { TimelineLayer, Clip } from "@/types/timeline";
import { useUndoRedo } from "@/hooks/useUndoRedo";

// State interface
export interface TimelineState {
	layers: TimelineLayer[];
	currentTime: number;
	duration: number;
	zoom: number; // pixels per second
	selectedClipId: string | null;
	isPlaying: boolean;
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
	| { type: "REORDER_LAYER"; payload: { layerId: string; newIndex: number } }
	| { type: "TOGGLE_LAYER_VISIBILITY"; payload: { layerId: string } }
	| { type: "SET_CURRENT_TIME"; payload: { time: number } }
	| { type: "SET_ZOOM"; payload: { zoom: number } }
	| { type: "PLAY" }
	| { type: "PAUSE" }
	| { type: "SET_SELECTED_CLIP"; payload: { clipId: string | null } }
	| { type: "SET_DURATION"; payload: { duration: number } }
	| { type: "RESTORE_STATE"; payload: { state: TimelineState } };

// Initial state
const initialState: TimelineState = {
	layers: [],
	currentTime: 0,
	duration: 0,
	zoom: 20, // 20 pixels per second default
	selectedClipId: null,
	isPlaying: false,
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

			// Update duration if clip extends beyond current duration
			const clipEndTime = clip.startTime + clip.duration;
			const newDuration = Math.max(state.duration, clipEndTime);

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
				duration: Math.max(0, duration),
			};
		}

		case "REORDER_LAYER": {
			const { layerId, newIndex } = action.payload;
			const newLayers = [...state.layers];
			const currentIndex = newLayers.findIndex((l) => l.id === layerId);

			if (currentIndex === -1 || newIndex < 0 || newIndex >= newLayers.length) {
				return state;
			}

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
	reorderLayer: (layerId: string, newIndex: number) => void;
	toggleLayerVisibility: (layerId: string) => void;
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

export function TimelineProvider({ children, initialState: customInitialState }: TimelineProviderProps) {
	const [state, dispatch] = useReducer(
		timelineReducer,
		customInitialState ? { ...initialState, ...customInitialState } : initialState
	);

	// Restore state function for undo/redo
	const restoreState = useCallback((restoredState: TimelineState) => {
		dispatch({ type: "RESTORE_STATE", payload: { state: restoredState } });
	}, []);

	// Initialize undo/redo
	const { undo, redo, canUndo, canRedo, addToHistory } = useUndoRedo(state, restoreState);

	// Track state changes for history (excluding currentTime, isPlaying, selectedClipId, and zoom)
	useEffect(() => {
		// Only add to history for meaningful changes (not playback-related state changes)
		const timeoutId = setTimeout(() => {
			addToHistory(state);
		}, 300); // Debounce to avoid too many history entries

		return () => clearTimeout(timeoutId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.layers, state.duration]); // Only track structural changes

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

	const reorderLayer = useCallback((layerId: string, newIndex: number) => {
		dispatch({ type: "REORDER_LAYER", payload: { layerId, newIndex } });
	}, []);

	const toggleLayerVisibility = useCallback((layerId: string) => {
		dispatch({ type: "TOGGLE_LAYER_VISIBILITY", payload: { layerId } });
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

	const restoreStateAction = useCallback((restoredState: TimelineState) => {
		dispatch({ type: "RESTORE_STATE", payload: { state: restoredState } });
	}, []);

	const resetTimeline = useCallback(() => {
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
		reorderLayer,
		toggleLayerVisibility,
		setCurrentTime,
		setZoom,
		play,
		pause,
		setSelectedClip,
		setDuration,
		undo,
		redo,
		canUndo,
		canRedo,
		restoreState: restoreStateAction,
		resetTimeline,
	};

	return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>;
}

// Custom hook to use timeline context
export function useTimeline(): TimelineContextType {
	const context = useContext(TimelineContext);
	if (context === undefined) {
		throw new Error("useTimeline must be used within a TimelineProvider");
	}
	return context;
}
