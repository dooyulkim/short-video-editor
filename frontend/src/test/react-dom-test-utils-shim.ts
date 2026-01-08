// Shim for react-dom/test-utils to work with React 19
// React 19 moved act from react-dom to react
import * as React from 'react';

// Re-export act from React
export const act = React.act;

// Export any other properties that might be needed
export default { act };
