// lib/supabase/client.ts
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let currentUser: User | null = null;

export function getSupabaseCredentials(): { url: string; key: string } {
    const env = (import.meta as any).env || {};
    const localUrl = localStorage.getItem('medp_supabase_url') || '';
    const localKey = localStorage.getItem('medp_supabase_key') || '';

    const defaultUrl = 'https://byygilnxaleiocapybuz.supabase.co';
    const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5eWdpbG54YWxlaW9jYXB5YnV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMzg0MDYsImV4cCI6MjEwMTgxNDQwNn0.S399WEWx0e8gTRPCCEUpzWyDEwbreldt4fJee70wlM8';

    const url = localUrl || env.VITE_SUPABASE_URL || defaultUrl;
    const key = localKey || env.VITE_SUPABASE_ANON_KEY || defaultKey;

    return { url, key };
}

export function saveSupabaseCredentials(url: string, key: string) {
    if (url) localStorage.setItem('medp_supabase_url', url.trim());
    else localStorage.removeItem('medp_supabase_url');

    if (key) localStorage.setItem('medp_supabase_key', key.trim());
    else localStorage.removeItem('medp_supabase_key');

    supabaseInstance = null;
}

export function isSupabaseConfigured(): boolean {
    const { url, key } = getSupabaseCredentials();
    return Boolean(url && key && !url.includes('your-supabase-project'));
}

export function getSupabaseClient(): SupabaseClient | null {
    if (supabaseInstance) return supabaseInstance;

    const { url, key } = getSupabaseCredentials();
    if (url && key && !url.includes('your-supabase-project')) {
        try {
            supabaseInstance = createClient(url, key, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    storageKey: 'medp_supabase_auth'
                }
            });
            return supabaseInstance;
        } catch (e) {
            console.warn('Failed to initialize Supabase client:', e);
            return null;
        }
    }
    return null;
}

export async function getCurrentUser(): Promise<User | null> {
    if (currentUser) return currentUser;

    const client = getSupabaseClient();
    if (!client) return null;

    try {
        const { data: { user }, error } = await client.auth.getUser();
        if (error) {
            console.warn('Failed to get current user:', error);
            return null;
        }
        currentUser = user;
        return user;
    } catch (e) {
        console.warn('Failed to get current user:', e);
        return null;
    }
}

export function ensureAuthenticated(): boolean {
    return localStorage.getItem('medp_authenticated') === 'true';
}

export const supabase = getSupabaseClient();

// =============================================
// 🆕 SECURITY FUNCTIONS
// =============================================

/**
 * Change user PIN (local only - PIN is stored in profile)
 *
 * @param profileId - ID of the profile to update
 * @param newPin - New 4-digit PIN
 * @returns Promise with success status and optional error
 */
export async function changeUserPin(
    profileId: string,
    newPin: string
): Promise<{ success: boolean; error?: any }> {
    const client = getSupabaseClient();
    if (!client) {
        return { success: false, error: 'No Supabase client available' };
    }

    try {
        // Update the PIN in the profiles table
        const { error } = await client
            .from('profiles')
            .update({
                pin_code: newPin,
                updated_at: new Date().toISOString()
            })
            .eq('id', profileId);

        if (error) {
            console.error('PIN update error:', error);
            return { success: false, error };
        }

        // Also update local Dexie
        const { db } = await import('../db');
        await db.profiles.update(profileId, { pin_code: newPin });

        return { success: true };
    } catch (error) {
        console.error('Change PIN error:', error);
        return { success: false, error };
    }
}

/**
 * Change user password (email/password auth)
 *
 * @param currentPassword - Current password for verification
 * @param newPassword - New password (minimum 6 characters)
 * @returns Promise with success status and optional error
 */
export async function changeUserPassword(
    currentPassword: string,
    newPassword: string
): Promise<{ success: boolean; error?: any }> {
    const client = getSupabaseClient();
    if (!client) {
        return { success: false, error: 'No Supabase client available' };
    }

    try {
        // First, verify current password by attempting to sign in
        const { error: signInError } = await client.auth.signInWithPassword({
            email: (await getCurrentUser())?.email || '',
            password: currentPassword,
        });

        if (signInError) {
            console.error('Current password verification error:', signInError);
            return { success: false, error: 'Current password is incorrect' };
        }

        // Update the password
        const { error } = await client.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            console.error('Password update error:', error);
            return { success: false, error };
        }

        return { success: true };
    } catch (error) {
        console.error('Change password error:', error);
        return { success: false, error };
    }
}

/**
 * Delete account/profile using Supabase Edge Function
 *
 * @param profileId - ID of the profile to delete
 * @returns Promise with success status and optional error
 */
export async function deleteAccount(
    profileId: string
): Promise<{ success: boolean; error?: any }> {
    const client = getSupabaseClient();
    if (!client) {
        return { success: false, error: 'No Supabase client available' };
    }

    try {
        // Call the edge function
        const { data, error } = await client.functions.invoke('delete-account', {
            body: { profileId },
        });

        if (error) {
            console.error('Delete account error:', error);
            return { success: false, error };
        }

        if (data && !data.success) {
            return { success: false, error: data.error || 'Failed to delete account' };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Delete account error:', error);
        return { success: false, error };
    }
}

/**
 * Check if the current user can delete a specific profile
 *
 * @param targetProfileId - ID of the profile to check
 * @returns Promise with boolean indicating if deletion is allowed
 */
export async function canDeleteProfile(
    targetProfileId: string
): Promise<{ allowed: boolean; reason?: string }> {
    const client = getSupabaseClient();
    if (!client) {
        return { allowed: false, reason: 'No Supabase client available' };
    }

    try {
        // Get current user's profile
        const { data: currentProfile, error: currentError } = await client
            .from('profiles')
            .select('id, role, is_owner, pharmacy_name')
            .eq('auth_user_id', (await getCurrentUser())?.id)
            .single();

        if (currentError || !currentProfile) {
            return { allowed: false, reason: 'Current profile not found' };
        }

        // If deleting self, always allowed
        if (currentProfile.id === targetProfileId) {
            return { allowed: true };
        }

        // Check if current user is owner
        const isOwner = currentProfile.is_owner === true || currentProfile.role === 'owner';
        if (!isOwner) {
            return { allowed: false, reason: 'Only owners can delete other accounts' };
        }

        // Get target profile
        const { data: targetProfile, error: targetError } = await client
            .from('profiles')
            .select('pharmacy_name')
            .eq('id', targetProfileId)
            .single();

        if (targetError || !targetProfile) {
            return { allowed: false, reason: 'Target profile not found' };
        }

        // Check if same pharmacy
        if (targetProfile.pharmacy_name !== currentProfile.pharmacy_name) {
            return { allowed: false, reason: 'Cannot delete users from other pharmacies' };
        }

        return { allowed: true };
    } catch (error) {
        console.error('Can delete profile check error:', error);
        return { allowed: false, reason: 'Error checking permissions' };
    }
}