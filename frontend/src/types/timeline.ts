// Timeline Types
export interface TimelineLayer {
  id: string;
  type: 'video' | 'audio' | 'text' | 'image';
  clips: Clip[];
  locked: boolean;
  visible: boolean;
  name: string;
}

export interface Clip {
  id: string;
  resourceId: string;
  startTime: number; // in seconds
  duration: number; // in seconds
  trimStart: number; // in seconds
  trimEnd: number; // in seconds
  transitions?: {
    in?: Transition;
    out?: Transition;
  };
  effects?: Effect[];
  position?: {
    x: number;
    y: number;
  };
  scale?: number;
  rotation?: number;
  opacity?: number;
  data?: {
    type: 'text' | 'video' | 'audio' | 'image';
    [key: string]: any; // Additional properties specific to clip type
  };
}

export interface Transition {
  type: 'fade' | 'dissolve' | 'wipe' | 'slide';
  duration: number; // in seconds
  properties?: Record<string, any>;
}

export interface Effect {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  properties: Record<string, any>;
}

export interface Timeline {
  id: string;
  name: string;
  layers: TimelineLayer[];
  duration: number; // in seconds
  fps: number;
  resolution: {
    width: number;
    height: number;
  };
}
