import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Debug: Log environment variable loading
console.log('Supabase Configuration Debug:');
console.log('URL provided:', !!import.meta.env.VITE_SUPABASE_URL);
console.log('Key provided:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
console.log('URL value:', supabaseUrl);
console.log('Key length:', supabaseKey.length);

// Check if credentials are configured
export const isSupabaseConfigured = supabaseUrl.startsWith('https://') && supabaseKey.length > 0;

console.log('Supabase Configured:', isSupabaseConfigured);

// Create client — uses placeholder values if not configured (won't crash)
export const supabase = createClient(
    isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
    isSupabaseConfigured ? supabaseKey : 'placeholder-key'
);
