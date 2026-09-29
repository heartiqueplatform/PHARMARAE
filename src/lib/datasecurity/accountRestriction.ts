// src/lib/accountRestriction.ts
// ============================================================
// ACCOUNT RESTRICTION SYSTEM
// ============================================================
// This module provides a hard-coded account restriction layer.
// Restricted accounts are blocked from accessing the app and are
// shown a full-screen "Account Temporarily Restricted" message.
//
// TO RESTRICT AN ACCOUNT:
//   1. Add the account ID to RESTRICTED_ACCOUNT_IDS, OR
//   2. Add the auth_user_id to RESTRICTED_AUTH_USER_IDS, OR
//   3. Add the email to RESTRICTED_EMAILS
//
// The restriction is checked by matching ANY of the following:
//   - profile.id
//   - profile.auth_user_id
//   - profile.email
//   - profile.pharmacy_name
//   - profile.pharmacy_trading_name
// ============================================================

import type { Profile } from './types'; // adjust import path if needed

// ============================================================
// RESTRICTED ACCOUNTS — EDIT THIS BLOCK TO ADD/REMOVE ACCOUNTS
// ============================================================

/**
 * Restricted profile IDs (the `id` column in your profiles table).
 */
export const RESTRICTED_ACCOUNT_IDS: string[] = [
    '68edf854-2624-4c36-bc4d-78dca2779870', // Japheth Samson (cashier)
    'd3ce22df-1050-4987-adf9-08c9612d977e', // Japheth K (owner)
];

/**
 * Restricted auth user IDs (the `auth_user_id` column).
 * Leave empty if not needed.
 */
export const RESTRICTED_AUTH_USER_IDS: string[] = [
    'cb705cb1-aa03-4a79-9359-0113357b92dc', // auth_user_id for d3ce22df...
];

/**
 * Restricted emails (lowercase). Matches profile.email.
 */
export const RESTRICTED_EMAILS: string[] = [
    'japhethsamson41@gmail.com',
    'brianmuthomi851@gmail.com',
];

/**
 * Restricted pharmacy names (case-insensitive, trimmed).
 * If set, ALL profiles belonging to this pharmacy are restricted.
 */
export const RESTRICTED_PHARMACY_NAMES: string[] = [
    "RODNEY'S PHARMACY KARAGITA",
];

/**
 * Restricted pharmacy trading names (case-insensitive, trimmed).
 */
export const RESTRICTED_PHARMACY_TRADING_NAMES: string[] = [
    "RODNEY'S PHARMACY KARAGITA",
];

// ============================================================
// RESTRICTION MESSAGE
// ============================================================

export const RESTRICTION_CONTACT_PHONE = '0704473503';

export const RESTRICTION_TITLE = 'Account Temporarily Restricted';

export const RESTRICTION_MESSAGE = `
This Pharmienta account has been temporarily restricted while an account-related matter is being reviewed.

Your pharmacy data has **not** been deleted.

For assistance, account clarification, or to resolve the matter, please contact the Pharmienta administrator:

**Phone:** ${RESTRICTION_CONTACT_PHONE}

Access will be reviewed and restored once the matter has been resolved.

Thank you for your understanding.
`.trim();

// ============================================================
// CORE CHECK
// ============================================================

const normalize = (v?: string | null) => (v || '').trim().toLowerCase();

/**
 * Returns true if the given profile is restricted.
 * Safe to call with null/undefined.
 */
export function isAccountRestricted(profile?: Partial<Profile> | null): boolean {
    if (!profile) return false;

    // 1. Direct ID match
    if (profile.id && RESTRICTED_ACCOUNT_IDS.includes(profile.id)) {
        return true;
    }

    // 2. auth_user_id match
    if (
        (profile as any).auth_user_id &&
        RESTRICTED_AUTH_USER_IDS.includes((profile as any).auth_user_id)
    ) {
        return true;
    }

    // 3. Email match
    if (profile.email && RESTRICTED_EMAILS.includes(normalize(profile.email))) {
        return true;
    }

    // 4. Pharmacy name match (case-insensitive)
    if (
        (profile as any).pharmacy_name &&
        RESTRICTED_PHARMACY_NAMES.map(normalize).includes(
            normalize((profile as any).pharmacy_name)
        )
    ) {
        return true;
    }

    // 5. Pharmacy trading name match (case-insensitive)
    if (
        (profile as any).pharmacy_trading_name &&
        RESTRICTED_PHARMACY_TRADING_NAMES.map(normalize).includes(
            normalize((profile as any).pharmacy_trading_name)
        )
    ) {
        return true;
    }

    return false;
}

/**
 * Convenience: check by raw id string (used before profile is loaded).
 */
export function isIdRestricted(id?: string | null): boolean {
    return !!id && RESTRICTED_ACCOUNT_IDS.includes(id);
}

/**
 * Convenience: check by auth_user_id string.
 */
export function isAuthUserIdRestricted(authUserId?: string | null): boolean {
    return !!authUserId && RESTRICTED_AUTH_USER_IDS.includes(authUserId);
}

/**
 * Convenience: check by email string.
 */
export function isEmailRestricted(email?: string | null): boolean {
    return !!email && RESTRICTED_EMAILS.includes(normalize(email));
}

/**
 * Convenience: check by pharmacy name string.
 */
export function isPharmacyRestricted(name?: string | null): boolean {
    if (!name) return false;
    const n = normalize(name);
    return (
        RESTRICTED_PHARMACY_NAMES.map(normalize).includes(n) ||
        RESTRICTED_PHARMACY_TRADING_NAMES.map(normalize).includes(n)
    );
}