// Vercel Analytics initialization for static HTML site
import { inject } from '@vercel/analytics';

// Initialize Vercel Analytics
inject();

// Export track function for custom events
export { track } from '@vercel/analytics';