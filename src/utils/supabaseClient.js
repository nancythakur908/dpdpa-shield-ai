/**
 * PrivSecure India — Supabase Browser Client
 * Uses VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (anon key only).
 * Never import or expose the service role key here.
 */
import { createClient } from '@supabase/supabase-js';

// Fallback check to prevent JSDOM test runner crash when import.meta is not fully mocked
const getEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  return process.env[key] || 'https://placeholder.supabase.co';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_PUBLISHABLE_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
