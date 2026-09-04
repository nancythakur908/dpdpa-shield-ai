/**
 * PrivSecure India — Database Service Layer (Production)
 * Re-exports the real Supabase implementation for use in the browser bundle.
 * Unit tests import dbStoreOffline.js directly — this file is never loaded in tests.
 */
export { dbStore, default } from './dbStoreReal.js';
