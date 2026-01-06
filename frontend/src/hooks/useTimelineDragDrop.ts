import { useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import type { MediaResource } from '@/types/media';
import type { TimelineLayer, Clip } from '@/types/timeline';

interface UseTimelineDragDropParams {
  resources: MediaResource[];
  layers: TimelineLayer[];
  setLayers: (layers: TimelineLayer[]) => void;
  zoom: number; // pixels per second
}

interface DragHandlers {
  onDragStart: (e: React.DragEvent, resource: MediaResource) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, layerIndex?: number) => void;
}

/**
 * Custom hook for handling drag and drop from ResourcePanel to Timeline
 * 
 * @param resources - Array of media resources available for dragging
 * @param layers - Current timeline layers
 * @param setLayers - Function to update timeline layers
 * @param zoom - Current zoom level (pixels per second)
 * @returns Drag handlers for implementing drag and drop functionality
 */
export const useTimelineDragDrop = ({
  resources,
  layers,
  setLayers,
  zoom,
}: UseTimelineDragDropParams): DragHandlers => {
  
  /**
   * Handle drag start from ResourcePanel
   * Stores the resource ID in the drag data transfer
   */
  const onDragStart = useCallback((e: React.DragEvent, resource: MediaResource) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify({
      resourceId: resource.id,
      resourceType: resource.type,
      duration: resource.duration || 0,
    }));
  }, []);

  /**
   * Handle drag over timeline
   * Prevents default to allow drop
   */
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  /**
   * Handle drop on timeline
   * Calculates drop position, creates new clip, and adds to appropriate layer
   */
  const onDrop = useCallback((e: React.DragEvent, targetLayerIndex?: number) => {
    e.preventDefault();

    try {
      // Parse drag data
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      const { resourceId, resourceType, duration } = dragData;

      // Find the resource
      const resource = resources.find(r => r.id === resourceId);
      if (!resource) {
        console.error('Resource not found:', resourceId);
        return;
      }

      // Calculate drop position on timeline
      const timelineElement = e.currentTarget as HTMLElement;
      const rect = timelineElement.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      
      // Convert mouse position to timeline time
      // time = (mouseX - timelineOffsetX) / zoom
      const timelineOffsetX = 0; // Can be adjusted if timeline has padding/offset
      const dropTime = Math.max(0, (mouseX - timelineOffsetX) / zoom);
      
      // Round to nearest 0.1 second for snapping
      const snappedTime = Math.round(dropTime * 10) / 10;

      // Create new clip from dropped resource
      const newClip: Clip = {
        id: uuid(),
        resourceId: resource.id,
        startTime: snappedTime,
        duration: duration || 5, // Default 5 seconds for images
        trimStart: 0,
        trimEnd: duration || 5,
        opacity: 1,
        scale: 1,
        rotation: 0,
      };

      // Determine target layer
      let targetLayer: TimelineLayer | undefined;
      let targetIndex: number;

      if (targetLayerIndex !== undefined && targetLayerIndex >= 0 && targetLayerIndex < layers.length) {
        // Drop on specific layer
        targetLayer = layers[targetLayerIndex];
        targetIndex = targetLayerIndex;
      } else {
        // Find or create appropriate layer based on resource type
        const layerIndex = layers.findIndex(layer => layer.type === resourceType && !layer.locked);
        
        if (layerIndex !== -1) {
          targetLayer = layers[layerIndex];
          targetIndex = layerIndex;
        } else {
          // Auto-create new layer
          const newLayer: TimelineLayer = {
            id: uuid(),
            type: resourceType,
            clips: [],
            locked: false,
            visible: true,
            name: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} ${layers.filter(l => l.type === resourceType).length + 1}`,
          };
          targetLayer = newLayer;
          targetIndex = layers.length;
        }
      }

      // Add clip to layer
      const updatedLayers = [...layers];
      
      if (targetIndex >= layers.length) {
        // Add new layer
        updatedLayers.push({
          ...targetLayer!,
          clips: [newClip],
        });
      } else {
        // Add to existing layer
        updatedLayers[targetIndex] = {
          ...updatedLayers[targetIndex],
          clips: [...updatedLayers[targetIndex].clips, newClip],
        };
      }

      // Update layers state
      setLayers(updatedLayers);

      console.log('Clip added:', {
        clipId: newClip.id,
        resourceId: newClip.resourceId,
        layer: targetLayer!.name,
        startTime: snappedTime,
        duration: newClip.duration,
      });

    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }, [resources, layers, setLayers, zoom]);

  return {
    onDragStart,
    onDragOver,
    onDrop,
  };
};
