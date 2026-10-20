/**
 * Firebase client SDK initialization.
 *
 * NOTE: This module is no longer used with DynamoDB backend.
 * All real-time updates now use polling via the backend API.
 * This file is kept for backward compatibility with any remaining imports.
 */

// Export no-op functions to prevent breaking changes
export const db = null;
export const ref = () => ({});
export const onValue = () => () => {};
export const off = () => {};
export const set = () => Promise.resolve();
export const onDisconnect = () => ({ cancel: () => Promise.resolve() });
export const app = null;
export const analytics = null;

console.warn('[firebase] Firebase SDK is disabled - using DynamoDB backend with polling instead');
