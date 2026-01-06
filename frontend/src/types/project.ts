// Project Types
export interface ProjectData {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  timeline: {
    layers: any[];
    duration: number;
    zoom: number;
  };
}

export interface RecentProject {
  id: string;
  name: string;
  lastOpened: string;
  thumbnail?: string;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  version: string;
}
