// lib/supabase/loyalty/client.ts
import { getSupabaseClient } from '../client';

export function getLoyaltyClient() {
    return getSupabaseClient();
}