import { createClient } from '@supabase/supabase-js';

// Fetch environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Basic check for environment variables
if (!supabaseUrl) {
  console.error('Error: VITE_SUPABASE_URL is not defined. Please check your .env file.');
  // Optionally throw an error or provide a default dummy client
}
if (!supabaseAnonKey) {
  console.error('Error: VITE_SUPABASE_ANON_KEY is not defined. Please check your .env file.');
  // Optionally throw an error or provide a default dummy client
}

// Create and export the Supabase client instance
// Ensure URL and Key are strings, even if undefined, to avoid createClient errors
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || ''); 