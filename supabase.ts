import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if credentials are configured
export const isSupabaseConfigured = supabaseUrl.startsWith('https://');

// Create client — uses placeholder values if not configured (won't crash)
export const supabase = createClient(
    isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
    isSupabaseConfigured ? supabaseKey : 'placeholder-key'
);
