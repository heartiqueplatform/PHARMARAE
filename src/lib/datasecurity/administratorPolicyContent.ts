// src/lib/administratorPolicyContent.ts
import type { PolicyDocument } from './policyTypes';
import { POLICY_META } from './policyTypes';

export const administratorPolicy: PolicyDocument = {
    slug: 'administrator',
    title: 'Administrator Policy',
    version: '1.0.0',
    effectiveDate: '2026-01-01',
    lastUpdated: '2026-01-01',
    summary:
        'This Policy defines what Pharmienta administrators can and cannot do, so that privileged access is used only within the Terms & Conditions and applicable law. It exists to prevent arbitrary action against any customer.',
    sections: [
        {
            id: 'who',
            title: 'Who is an Administrator',
            items: [
                'Founders, operations staff, engineering staff, and any other person with elevated access to Pharmienta systems or customer data.',
                'Administrators act under defined authority, not unlimited discretion.',
                'Administrators are subject to the same confidentiality and data-protection obligations as the rest of Pharmienta.',
            ],
        },
        {
            id: 'may',
            title: 'What Administrators MAY Do',
            items: [
                'Manage accounts (create, update, deactivate).',
                'Investigate security incidents.',
                'Restrict accounts where authorised by the Terms & Conditions.',
                'Restore accounts.',
                'Manage platform configuration.',
                'Respond to legal, security, or regulatory requirements.',
                'Perform routine maintenance.',
            ],
        },
        {
            id: 'may-not',
            title: 'What Administrators May NOT Do',
            items: [
                'Arbitrarily delete Customer Data.',
                'Modify historical records to create a contractual basis that did not previously exist.',
                'Target a specific customer for adverse treatment based on personal disputes.',
                'Disclose Customer Data to third parties outside the circumstances in the Terms and Privacy Policy.',
                'Use elevated access for personal benefit.',
                'Act outside the Terms & Conditions or applicable Kenyan law.',
            ],
            callout: {
                tone: 'danger',
                title: 'Conflict-of-interest rule',
                body:
                    'Any conflict of interest — including a personal dispute with a customer — must be disclosed, and the administrator must recuse themselves from decisions affecting that customer.',
            },
        },
        {
            id: 'logging',
            title: 'Audit Logging of Admin Actions',
            items: [
                'All significant administrative actions are logged with: the acting administrator\'s identity, the action, the reason, and the timestamp.',
                'Logged actions include: account suspension, restoration, role changes, configuration changes, and deletions.',
                'Logs are retained in line with the Data Retention & Disposal Policy.',
                'Logs support accountability and help defend against disputes.',
            ],
            callout: {
                tone: 'info',
                title: 'Not yet fully implemented',
                body:
                    'Comprehensive audit logging of admin actions is a control we are working toward. [LEGAL REVIEW] Confirm which actions are currently logged, and prioritise logging for the actions listed above.',
            },
        },
        {
            id: 'contact',
            title: 'Contact',
            items: [
                `Email: ${POLICY_META.email}`,
                `Phone: ${POLICY_META.phone}`,
                `Address: ${POLICY_META.address}`,
            ],
        },
    ],
};