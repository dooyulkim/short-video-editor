// Export Types
export interface ExportSettings {
  resolution: '1080p' | '720p' | '480p';
  format: 'MP4' | 'WebM';
  quality: 'high' | 'medium' | 'low';
  filename: string;
}

export interface ExportTask {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: string;
  outputPath?: string;
}

export interface ExportResponse {
  task_id: string;
  status: string;
  message?: string;
}

export interface ExportStatusResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  output_path?: string;
}
