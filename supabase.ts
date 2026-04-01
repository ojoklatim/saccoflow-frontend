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

/**
 * Formats Supabase/PostgREST error messages to be more user-friendly.
 */
export function formatSupabaseError(error: any): string {
    if (!error) return 'An unknown error occurred';
    
    const message = error.message || String(error);
    
    // Replace "Cannot coerce the result to a single JSON object"
    if (message.includes('Cannot coerce the result to a single JSON object')) {
        return 'The requested record (e.g., your user profile) was not found. If you just registered, please wait a moment or contact your administrator.';
    }
    
    // Replace common RLS or permission errors
    if (message.includes('row-level security policy')) {
        return 'Access denied. You do not have permission to perform this action.';
    }

    if (message.includes('foreign key constraint')) {
        return 'Cannot complete this action because this record is linked to other data.';
    }

    return message;
}
