import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextEditor } from '@/components/TextTool/TextEditor';
import type { Clip } from '@/types/timeline';

describe('TextEditor Component', () => {
  let mockOnAddText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnAddText = vi.fn();
  });

  describe('Rendering', () => {
    it('should render trigger button with default text', () => {
      render(<TextEditor onAddText={mockOnAddText} />);
      
      const button = screen.getByRole('button', { name: /add text/i });
      expect(button).toBeInTheDocument();
    });

    it('should render custom trigger when provided', () => {
      render(
        <TextEditor 
          onAddText={mockOnAddText} 
          trigger={<button>Custom Button</button>}
        />
      );
      
      const button = screen.getByRole('button', { name: /custom button/i });
      expect(button).toBeInTheDocument();
    });

    it('should not show dialog initially', () => {
      render(<TextEditor onAddText={mockOnAddText} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should open dialog when trigger is clicked', async () => {
      render(<TextEditor onAddText={mockOnAddText} />);
      
      const button = screen.getByRole('button', { name: /add text/i });
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Dialog Content', () => {
    beforeEach(async () => {
      render(<TextEditor onAddText={mockOnAddText} />);
      const button = screen.getByRole('button', { name: /add text/i });
      await userEvent.click(button);
    });

    it('should display all form fields', async () => {
      await waitFor(() => {
        expect(screen.getByLabelText(/text content/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/font family/i)).toBeInTheDocument();
        // Font size uses a slider which has a non-labellable span, so check by text
        expect(screen.getByText(/font size:/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/color/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/position x/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/position y/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/animation/i)).toBeInTheDocument();
      });
    });

    it('should have default values in form fields', async () => {
      await waitFor(() => {
        const textArea = screen.getByLabelText(/text content/i) as HTMLTextAreaElement;
        expect(textArea.value).toBe('Enter text here');
        
        const durationInput = screen.getByLabelText(/duration/i) as HTMLInputElement;
        expect(durationInput.value).toBe('5');
      });
    });

    it('should display preview panel', async () => {
      await waitFor(() => {
        // Check for Preview label (there are multiple matches - label and description)
        const previewElements = screen.getAllByText(/preview/i);
        expect(previewElements.length).toBeGreaterThan(0);
      });
    });

    it('should display action buttons', async () => {
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add text to timeline/i })).toBeInTheDocument();
      });
    });
  });

  describe('Form Interactions', () => {
    beforeEach(async () => {
      render(<TextEditor onAddText={mockOnAddText} />);
      const button = screen.getByRole('button', { name: /add text/i });
      await userEvent.click(button);
    });

    it('should update text content when typing', async () => {
      await waitFor(() => {
        const textArea = screen.getByLabelText(/text content/i) as HTMLTextAreaElement;
        expect(textArea).toBeInTheDocument();
      });

      const textArea = screen.getByLabelText(/text content/i);
      await userEvent.clear(textArea);
      await userEvent.type(textArea, 'My custom text');
      
      expect(textArea).toHaveValue('My custom text');
    });

    it('should update position X when changed', async () => {
      await waitFor(() => {
        const positionX = screen.getByLabelText(/position x/i);
        expect(positionX).toBeInTheDocument();
      });

      const positionX = screen.getByLabelText(/position x/i);
      await userEvent.clear(positionX);
      await userEvent.type(positionX, '200');
      
      expect(positionX).toHaveValue(200);
    });

    it('should update position Y when changed', async () => {
      await waitFor(() => {
        const positionY = screen.getByLabelText(/position y/i);
        expect(positionY).toBeInTheDocument();
      });

      const positionY = screen.getByLabelText(/position y/i);
      await userEvent.clear(positionY);
      await userEvent.type(positionY, '300');
      
      expect(positionY).toHaveValue(300);
    });

    it('should update duration when changed', async () => {
      await waitFor(() => {
        const duration = screen.getByLabelText(/duration/i);
        expect(duration).toBeInTheDocument();
      });

      const duration = screen.getByLabelText(/duration/i) as HTMLInputElement;
      await userEvent.clear(duration);
      await userEvent.type(duration, '10');
      
      // Check the actual value after typing
      expect(duration.value).toBe('10');
    });

    it('should update color when changed', async () => {
      await waitFor(() => {
        const colorInputs = screen.getAllByLabelText(/color/i);
        expect(colorInputs.length).toBeGreaterThan(0);
      });

      const colorInputs = screen.getAllByLabelText(/color/i);
      const colorPicker = colorInputs[0];
      
      fireEvent.change(colorPicker, { target: { value: '#ff0000' } });
      
      expect(colorPicker).toHaveValue('#ff0000');
    });
  });

  describe('Form Submission', () => {
    beforeEach(async () => {
      render(<TextEditor onAddText={mockOnAddText} />);
      const button = screen.getByRole('button', { name: /add text/i });
      await userEvent.click(button);
    });

    it('should call onAddText with correct data when submitted', async () => {
      await waitFor(() => {
        const textArea = screen.getByLabelText(/text content/i);
        expect(textArea).toBeInTheDocument();
      });

      // Fill in the form
      const textArea = screen.getByLabelText(/text content/i);
      await userEvent.clear(textArea);
      await userEvent.type(textArea, 'Test Text');

      const positionX = screen.getByLabelText(/position x/i);
      await userEvent.clear(positionX);
      await userEvent.type(positionX, '150');

      const positionY = screen.getByLabelText(/position y/i);
      await userEvent.clear(positionY);
      await userEvent.type(positionY, '250');

      const duration = screen.getByLabelText(/duration/i) as HTMLInputElement;
      await userEvent.clear(duration);
      await userEvent.type(duration, '8');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /add text to timeline/i });
      await userEvent.click(submitButton);

      // Verify onAddText was called
      await waitFor(() => {
        expect(mockOnAddText).toHaveBeenCalledTimes(1);
      });

      const addedClip: Clip = mockOnAddText.mock.calls[0][0];
      expect(addedClip).toBeDefined();
      expect(addedClip.id).toBeDefined();
      expect(addedClip.duration).toBe(8);
      expect(addedClip.position?.x).toBe(150);
      expect(addedClip.position?.y).toBe(250);
      expect(addedClip.data?.type).toBe('text');
      expect(addedClip.data?.text).toBe('Test Text');
    });

    it('should disable submit button when text is empty', async () => {
      await waitFor(() => {
        const textArea = screen.getByLabelText(/text content/i);
        expect(textArea).toBeInTheDocument();
      });

      const textArea = screen.getByLabelText(/text content/i);
      await userEvent.clear(textArea);

      const submitButton = screen.getByRole('button', { name: /add text to timeline/i });
      expect(submitButton).toBeDisabled();
    });

    it('should close dialog after successful submission', async () => {
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /add text to timeline/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should reset form after submission', async () => {
      await waitFor(() => {
        const textArea = screen.getByLabelText(/text content/i);
        expect(textArea).toBeInTheDocument();
      });

      // Fill in custom values
      const textArea = screen.getByLabelText(/text content/i);
      await userEvent.clear(textArea);
      await userEvent.type(textArea, 'Custom Text');

      // Submit
      const submitButton = screen.getByRole('button', { name: /add text to timeline/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Reopen dialog
      const openButton = screen.getByRole('button', { name: /add text/i });
      await userEvent.click(openButton);

      await waitFor(() => {
        const textAreaAfter = screen.getByLabelText(/text content/i) as HTMLTextAreaElement;
        expect(textAreaAfter.value).toBe('Enter text here');
      });
    });
  });

  describe('Dialog Cancellation', () => {
    beforeEach(async () => {
      render(<TextEditor onAddText={mockOnAddText} />);
      const button = screen.getByRole('button', { name: /add text/i });
      await userEvent.click(button);
    });

    it('should close dialog when cancel button is clicked', async () => {
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should not call onAddText when cancelled', async () => {
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(mockOnAddText).not.toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    beforeEach(async () => {
      render(<TextEditor onAddText={mockOnAddText} />);
      const button = screen.getByRole('button', { name: /add text/i });
      await userEvent.click(button);
    });

    it('should not allow empty text submission', async () => {
      await waitFor(() => {
        const textArea = screen.getByLabelText(/text content/i);
        expect(textArea).toBeInTheDocument();
      });

      const textArea = screen.getByLabelText(/text content/i);
      await userEvent.clear(textArea);

      const submitButton = screen.getByRole('button', { name: /add text to timeline/i });
      expect(submitButton).toBeDisabled();
    });

    it('should allow whitespace-only text to disable submit', async () => {
      await waitFor(() => {
        const textArea = screen.getByLabelText(/text content/i);
        expect(textArea).toBeInTheDocument();
      });

      const textArea = screen.getByLabelText(/text content/i);
      await userEvent.clear(textArea);
      await userEvent.type(textArea, '   ');

      const submitButton = screen.getByRole('button', { name: /add text to timeline/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Data Structure', () => {
    it('should create clip with correct data structure', async () => {
      render(<TextEditor onAddText={mockOnAddText} />);
      const button = screen.getByRole('button', { name: /add text/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /add text to timeline/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnAddText).toHaveBeenCalled();
      });

      const clip: Clip = mockOnAddText.mock.calls[0][0];
      
      // Verify required properties
      expect(clip.id).toBeDefined();
      expect(typeof clip.id).toBe('string');
      expect(clip.resourceId).toBe('');
      expect(clip.startTime).toBe(0);
      expect(clip.duration).toBeGreaterThan(0);
      expect(clip.trimStart).toBe(0);
      expect(clip.trimEnd).toBe(0);
      
      // Verify position
      expect(clip.position).toBeDefined();
      expect(typeof clip.position?.x).toBe('number');
      expect(typeof clip.position?.y).toBe('number');
      
      // Verify data object
      expect(clip.data).toBeDefined();
      expect(clip.data?.type).toBe('text');
      expect(clip.data?.text).toBeDefined();
      expect(clip.data?.fontFamily).toBeDefined();
      expect(clip.data?.fontSize).toBeGreaterThan(0);
      expect(clip.data?.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(clip.data?.animation).toBeDefined();
    });
  });
});
