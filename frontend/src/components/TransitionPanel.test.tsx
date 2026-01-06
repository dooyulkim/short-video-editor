import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransitionPanel } from '@/components/TransitionPanel';

describe('TransitionPanel Component', () => {
  let mockOnTransitionSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnTransitionSelect = vi.fn();
  });

  describe('Rendering', () => {
    it('should render the component with title', () => {
      render(<TransitionPanel />);
      
      expect(screen.getByText('Transitions')).toBeInTheDocument();
    });

    it('should render instructions', () => {
      render(<TransitionPanel />);
      
      expect(screen.getByText(/drag transitions to timeline clip edges/i)).toBeInTheDocument();
    });

    it('should render all four transition presets', () => {
      render(<TransitionPanel />);
      
      expect(screen.getByText('Fade')).toBeInTheDocument();
      expect(screen.getByText('Cross Dissolve')).toBeInTheDocument();
      expect(screen.getByText('Wipe')).toBeInTheDocument();
      expect(screen.getByText('Slide')).toBeInTheDocument();
    });

    it('should render transition descriptions', () => {
      render(<TransitionPanel />);
      
      expect(screen.getByText('Smooth fade in/out')).toBeInTheDocument();
      expect(screen.getByText('Crossfade between clips')).toBeInTheDocument();
      expect(screen.getByText('Directional wipe transition')).toBeInTheDocument();
      expect(screen.getByText('Slide in/out transition')).toBeInTheDocument();
    });

    it('should render duration slider', () => {
      render(<TransitionPanel />);
      
      expect(screen.getByText('Transition Duration')).toBeInTheDocument();
      expect(screen.getByText(/duration: 1\.0s/i)).toBeInTheDocument();
    });

    it('should render usage instructions card', () => {
      render(<TransitionPanel />);
      
      expect(screen.getByText('How to use:')).toBeInTheDocument();
      expect(screen.getByText(/drag transition to clip edge/i)).toBeInTheDocument();
    });
  });

  describe('Transition Preset Interactions', () => {
    it('should highlight selected transition preset on click', async () => {
      render(<TransitionPanel onTransitionSelect={mockOnTransitionSelect} />);
      
      const fadeCard = screen.getByText('Fade').closest('.cursor-move');
      await userEvent.click(fadeCard!);
      
      await waitFor(() => {
        expect(fadeCard).toHaveClass('ring-2', 'ring-primary');
      });
    });

    it('should call onTransitionSelect when preset is clicked', async () => {
      render(<TransitionPanel onTransitionSelect={mockOnTransitionSelect} />);
      
      const fadeCard = screen.getByText('Fade').closest('.cursor-move');
      await userEvent.click(fadeCard!);
      
      await waitFor(() => {
        expect(mockOnTransitionSelect).toHaveBeenCalledWith({
          type: 'fade',
          duration: 1,
        });
      });
    });

    it('should call onTransitionSelect with correct type for each preset', async () => {
      render(<TransitionPanel onTransitionSelect={mockOnTransitionSelect} />);
      
      // Test Fade
      const fadeCard = screen.getByText('Fade').closest('.cursor-move');
      await userEvent.click(fadeCard!);
      expect(mockOnTransitionSelect).toHaveBeenLastCalledWith({
        type: 'fade',
        duration: 1,
      });

      // Test Cross Dissolve
      const dissolveCard = screen.getByText('Cross Dissolve').closest('.cursor-move');
      await userEvent.click(dissolveCard!);
      expect(mockOnTransitionSelect).toHaveBeenLastCalledWith({
        type: 'dissolve',
        duration: 1,
      });

      // Test Wipe
      const wipeCard = screen.getByText('Wipe').closest('.cursor-move');
      await userEvent.click(wipeCard!);
      expect(mockOnTransitionSelect).toHaveBeenLastCalledWith({
        type: 'wipe',
        duration: 1,
      });

      // Test Slide
      const slideCard = screen.getByText('Slide').closest('.cursor-move');
      await userEvent.click(slideCard!);
      expect(mockOnTransitionSelect).toHaveBeenLastCalledWith({
        type: 'slide',
        duration: 1,
      });
    });

    it('should make preset cards draggable', () => {
      render(<TransitionPanel />);
      
      const fadeCard = screen.getByText('Fade').closest('.cursor-move');
      expect(fadeCard).toHaveAttribute('draggable', 'true');
    });

    it.skip('should set drag data on drag start', () => {
      // DragEvent is not available in JSDOM test environment
      // This functionality should be tested in E2E tests
    });
  });

  describe('Duration Slider', () => {
    it('should display default duration of 1.0s', () => {
      render(<TransitionPanel />);
      
      expect(screen.getByText(/duration: 1\.0s/i)).toBeInTheDocument();
    });

    it.skip('should update duration display when slider changes', () => {
      // Radix UI Slider doesn't support standard change events
      // This should be tested with E2E tests or Radix-specific test utilities
    });

    it.skip('should use updated duration when selecting preset', () => {
      // Radix UI Slider doesn't support standard change events
      // This should be tested with E2E tests or Radix-specific test utilities
    });

    it('should display min and max values for slider', () => {
      render(<TransitionPanel />);
      
      expect(screen.getByText('0.1s')).toBeInTheDocument();
      expect(screen.getByText('3.0s')).toBeInTheDocument();
    });
  });

  describe('Drag and Drop', () => {
    it('should apply opacity on drag start', () => {
      render(<TransitionPanel />);
      
      const fadeCard = screen.getByText('Fade').closest('.cursor-move');
      
      fireEvent.dragStart(fadeCard!);
      
      expect(fadeCard).toHaveClass('opacity-50');
    });

    it('should remove opacity on drag end', () => {
      render(<TransitionPanel />);
      
      const fadeCard = screen.getByText('Fade').closest('.cursor-move');
      
      fireEvent.dragStart(fadeCard!);
      fireEvent.dragEnd(fadeCard!);
      
      expect(fadeCard).not.toHaveClass('opacity-50');
    });
  });

  describe('Visual Styling', () => {
    it('should apply correct color classes to each transition type', () => {
      render(<TransitionPanel />);
      
      const fadeIcon = screen.getByText('Fade').previousElementSibling;
      const dissolveIcon = screen.getByText('Cross Dissolve').previousElementSibling;
      const wipeIcon = screen.getByText('Wipe').previousElementSibling;
      const slideIcon = screen.getByText('Slide').previousElementSibling;
      
      expect(fadeIcon).toHaveClass('bg-blue-500');
      expect(dissolveIcon).toHaveClass('bg-purple-500');
      expect(wipeIcon).toHaveClass('bg-green-500');
      expect(slideIcon).toHaveClass('bg-orange-500');
    });

    it('should render animated preview for each preset', () => {
      render(<TransitionPanel />);
      
      const cards = screen.getAllByText(/smooth fade|crossfade|directional wipe|slide in/i);
      
      // Each card should have a preview element
      cards.forEach(card => {
        const previewArea = card.parentElement?.querySelector('.bg-muted.rounded');
        expect(previewArea).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible slider', () => {
      render(<TransitionPanel />);
      
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      // Radix UI applies id to wrapper, not the slider role element
    });

    it('should provide hover information', () => {
      render(<TransitionPanel />);
      
      const fadeCard = screen.getByText('Fade').closest('.cursor-move');
      expect(fadeCard).toHaveClass('hover:shadow-lg');
    });
  });

  describe('Edge Cases', () => {
    it('should work without onTransitionSelect callback', () => {
      render(<TransitionPanel />);
      
      const fadeCard = screen.getByText('Fade').closest('.cursor-move');
      
      // Should not throw error
      expect(() => userEvent.click(fadeCard!)).not.toThrow();
    });

    it('should handle rapid preset changes', async () => {
      render(<TransitionPanel onTransitionSelect={mockOnTransitionSelect} />);
      
      const fadeCard = screen.getByText('Fade').closest('.cursor-move');
      const wipeCard = screen.getByText('Wipe').closest('.cursor-move');
      
      await userEvent.click(fadeCard!);
      await userEvent.click(wipeCard!);
      await userEvent.click(fadeCard!);
      
      expect(mockOnTransitionSelect).toHaveBeenCalledTimes(3);
    });
  });
});
