import { vi } from 'vitest';
import * as React from 'react';

// Mock react-dom/test-utils to provide act from React 19
vi.mock('react-dom/test-utils', () => ({
  act: React.act,
}));
