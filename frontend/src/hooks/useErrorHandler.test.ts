import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useErrorHandler, getUserFriendlyError, ErrorMessages } from './useErrorHandler';
import * as toastHook from '@/components/ui/use-toast';

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: vi.fn(),
}));

describe('useErrorHandler', () => {
  let mockToast: ReturnType<typeof toastHook.useToast>['toast'];

  beforeEach(() => {
    mockToast = vi.fn().mockReturnValue({
      id: 'test-toast-id',
      dismiss: vi.fn(),
      update: vi.fn(),
    });
    vi.mocked(toastHook.useToast).mockReturnValue({
      toast: mockToast,
      toasts: [],
      dismiss: vi.fn(),
    });
  });

  it('should handle Error objects correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Test error message');

    result.current.handleError(error, 'Test Context');

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error: Test Context',
      description: 'Test error message',
      variant: 'destructive',
    });
  });

  it('should handle string errors', () => {
    const { result } = renderHook(() => useErrorHandler());

    result.current.handleError('String error message');

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'String error message',
      variant: 'destructive',
    });
  });

  it('should handle success messages', () => {
    const { result } = renderHook(() => useErrorHandler());

    result.current.handleSuccess('Operation successful', 'Success');

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Operation successful',
      variant: 'success',
    });
  });

  it('should handle warning messages', () => {
    const { result } = renderHook(() => useErrorHandler());

    result.current.handleWarning('This is a warning', 'Warning');

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Warning',
      description: 'This is a warning',
      variant: 'default',
    });
  });
});

describe('getUserFriendlyError', () => {
  it('should return network error message for network errors', () => {
    const error = new Error('network failed');
    expect(getUserFriendlyError(error)).toBe(ErrorMessages.NETWORK_ERROR);
  });

  it('should return upload error message for file errors', () => {
    const error = new Error('file upload failed');
    expect(getUserFriendlyError(error)).toBe(ErrorMessages.UPLOAD_FAILED);
  });

  it('should return export error message for export errors', () => {
    const error = new Error('export failed');
    expect(getUserFriendlyError(error)).toBe(ErrorMessages.EXPORT_FAILED);
  });

  it('should return original message for unknown errors', () => {
    const error = new Error('Custom error message');
    expect(getUserFriendlyError(error)).toBe('Custom error message');
  });

  it('should handle non-Error objects', () => {
    expect(getUserFriendlyError('string error')).toBe('An unexpected error occurred. Please try again.');
    expect(getUserFriendlyError(null)).toBe('An unexpected error occurred. Please try again.');
    expect(getUserFriendlyError(undefined)).toBe('An unexpected error occurred. Please try again.');
  });
});
