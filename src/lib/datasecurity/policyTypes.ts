// src/lib/policyTypes.ts
// Shared types for all Pharmienta policy content files.

export const POLICY_META = {
    companyName: 'Pharmienta',
    email: 'Pharmienta@gmail.com',
    phone: '+254 717 517 371',
    address: 'Nairobi, Kenya',
    jurisdiction: 'Republic of Kenya',
    dpoContact: 'Pharmienta@gmail.com',
    odpcName: 'Office of the Data Protection Commissioner (ODPC), Kenya',
    odpcWebsite: 'https://www.odpc.go.ke',
};

export const LEGAL_REVIEW_TAG = '[LEGAL REVIEW]';

export interface PolicyCallout {
    tone: 'info' | 'warning' | 'danger' | 'success';
    title: string;
    body: string;
}

export interface PolicySection {
    id: string;
    title: string;
    intro?: string;
    /** Simple bullet list (your existing UI style) */
    items?: string[];
    /** Labelled items (your existing UI style: label + description) */
    labelledItems?: { label: string; description: string }[];
    table?: { headers: string[]; rows: string[][] };
    callout?: PolicyCallout;
}

export interface PolicyDocument {
    slug: string;
    title: string;
    version: string;
    effectiveDate: string;
    lastUpdated: string;
    summary: string;
    sections: PolicySection[];
}