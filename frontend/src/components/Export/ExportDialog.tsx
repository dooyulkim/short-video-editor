import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { startExport, getExportStatus, downloadExport } from '@/services/api';
import type { ExportSettings, ExportTask } from '@/types/export';
import type { Timeline } from '@/types/timeline';
import { Download, FileVideo, Loader2, X } from 'lucide-react';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeline: Timeline;
}

export function ExportDialog({ open, onOpenChange, timeline }: ExportDialogProps) {
  const [settings, setSettings] = useState<ExportSettings>({
    resolution: '1080p',
    format: 'MP4',
    quality: 'high',
    filename: `video_export_${new Date().toISOString().slice(0, 10)}`,
  });

  const [exportTask, setExportTask] = useState<ExportTask | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Poll export status every 2 seconds
  useEffect(() => {
    if (!exportTask || exportTask.status === 'completed' || exportTask.status === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const status = await getExportStatus(exportTask.taskId);
        setExportTask({
          taskId: status.task_id,
          status: status.status,
          progress: status.progress,
          error: status.error,
          outputPath: status.output_path,
        });

        if (status.status === 'completed') {
          clearInterval(pollInterval);
          setIsExporting(false);
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          setIsExporting(false);
          setError(status.error || 'Export failed');
        }
      } catch (err) {
        console.error('Error polling export status:', err);
        setError('Failed to check export status');
        clearInterval(pollInterval);
        setIsExporting(false);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [exportTask]);

  const handleStartExport = async () => {
    setError(null);
    setIsExporting(true);
    setExportTask(null);
    setDownloadUrl(null);

    try {
      const response = await startExport(timeline, settings);
      setExportTask({
        taskId: response.task_id,
        status: 'pending',
        progress: 0,
      });
    } catch (err) {
      console.error('Error starting export:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to start export');
      setIsExporting(false);
    }
  };

  const handleDownload = async () => {
    if (!exportTask?.taskId) return;

    try {
      const blob = await downloadExport(exportTask.taskId);
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);

      // Create download link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${settings.filename}.${settings.format.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading export:', err);
      setError('Failed to download video');
    }
  };

  const handleClose = useCallback(() => {
    if (isExporting && exportTask?.status === 'processing') {
      if (!confirm('Export is in progress. Are you sure you want to close?')) {
        return;
      }
    }

    // Cleanup
    if (downloadUrl) {
      window.URL.revokeObjectURL(downloadUrl);
    }

    setExportTask(null);
    setIsExporting(false);
    setError(null);
    setDownloadUrl(null);
    onOpenChange(false);
  }, [isExporting, exportTask, downloadUrl, onOpenChange]);

  const canStartExport = !isExporting && settings.filename.trim().length > 0;
  const isCompleted = exportTask?.status === 'completed';
  const isFailed = exportTask?.status === 'failed';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileVideo className="h-5 w-5" />
            Export Video
          </DialogTitle>
          <DialogDescription>
            Configure export settings for your video project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Filename Input */}
          <div className="space-y-2">
            <Label htmlFor="filename">Filename</Label>
            <Input
              id="filename"
              value={settings.filename}
              onChange={(e) =>
                setSettings({ ...settings, filename: e.target.value })
              }
              placeholder="Enter filename"
              disabled={isExporting}
            />
          </div>

          {/* Resolution Select */}
          <div className="space-y-2">
            <Label htmlFor="resolution">Resolution</Label>
            <Select
              value={settings.resolution}
              onValueChange={(value: '1080p' | '720p' | '480p') =>
                setSettings({ ...settings, resolution: value })
              }
              disabled={isExporting}
            >
              <SelectTrigger id="resolution">
                <SelectValue placeholder="Select resolution" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1080p">1080p (1920x1080)</SelectItem>
                <SelectItem value="720p">720p (1280x720)</SelectItem>
                <SelectItem value="480p">480p (854x480)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Format Select */}
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select
              value={settings.format}
              onValueChange={(value: 'MP4' | 'WebM') =>
                setSettings({ ...settings, format: value })
              }
              disabled={isExporting}
            >
              <SelectTrigger id="format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MP4">MP4</SelectItem>
                <SelectItem value="WebM">WebM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quality Radio Group */}
          <div className="space-y-3">
            <Label>Quality</Label>
            <RadioGroup
              value={settings.quality}
              onValueChange={(value: 'high' | 'medium' | 'low') =>
                setSettings({ ...settings, quality: value })
              }
              disabled={isExporting}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high" className="font-normal cursor-pointer">
                  High (Best quality, larger file)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="font-normal cursor-pointer">
                  Medium (Balanced)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low" className="font-normal cursor-pointer">
                  Low (Smaller file, faster export)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Progress Section */}
          {exportTask && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Export Progress</Label>
                <span className="text-sm text-muted-foreground">
                  {exportTask.progress}%
                </span>
              </div>
              <Progress value={exportTask.progress} className="h-2" />
              <p className="text-sm text-muted-foreground capitalize">
                Status: {exportTask.status}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Success Message */}
          {isCompleted && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
              Export completed successfully! Click download to save your video.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isExporting && !isFailed}
          >
            <X className="h-4 w-4 mr-2" />
            {isExporting && !isFailed ? 'Cancel' : 'Close'}
          </Button>

          {!isCompleted && !isFailed && (
            <Button
              onClick={handleStartExport}
              disabled={!canStartExport}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileVideo className="h-4 w-4 mr-2" />
                  Start Export
                </>
              )}
            </Button>
          )}

          {isCompleted && (
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
