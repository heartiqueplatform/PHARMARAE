// src/lib/dataRetentionPolicyContent.ts
import type { PolicyDocument } from './policyTypes';
import { POLICY_META } from './policyTypes';

export const dataRetentionPolicy: PolicyDocument = {
    slug: 'data-retention',
    title: 'Data Retention & Disposal Policy',
    version: '1.0.0',
    effectiveDate: '2026-01-01',
    lastUpdated: '2026-01-01',
    summary:
        'This Policy sets out how long Pharmienta keeps each category of data, why, and what happens when retention ends. It exists so that data is not kept longer than necessary, and so that data is never deleted arbitrarily — for example, as a punishment for non-payment or because of an unrelated dispute.',
    sections: [
        // ---------------------------------------------------------
        {
            id: 'principles',
            title: 'Principles',
            items: [
                'Personal data and Customer Data are kept only as long as necessary for the purpose for which they were collected, or as required by law.',
                'Retention periods are documented per data category (see the schedule below).',
                'When retention ends, data is securely deleted or irreversibly anonymised.',
                'Deletion is never used as a sanction. Non-payment of Subscription Fees does not, by itself, cause deletion of Customer Data.',
                'Where a legal hold applies (for example, an active dispute, investigation, or regulatory request), deletion is paused until the hold is lifted.',
                'Where Pharmienta is a processor for Customer Data, retention is governed by the pharmacy\'s instructions, subject to this Policy and the DPA.',
            ],
            callout: {
                tone: 'danger',
                title: 'No arbitrary deletion',
                body:
                    'Pharmienta does not use a rule such as "customer does not pay → delete all data after 7 days". Deletion follows this Policy, the pharmacy\'s instructions (where we are a processor), and applicable Kenyan law.',
            },
        },
        // ---------------------------------------------------------
        {
            id: 'schedule',
            title: 'Retention Schedule',
            intro:
                'The following schedule sets out retention periods by data category. Where a retention period is marked with [LEGAL REVIEW], it must be confirmed against Kenyan law before being relied upon.',
            table: {
                headers: [
                    'Data category',
                    'Examples',
                    'Purpose',
                    'Retention period',
                    'Reason / notes',
                    'On expiry',
                ],
                rows: [
                    [
                        'Account & profile data',
                        'Name, email, phone, role, hashed PIN/password, avatar',
                        'Provide the Service; authenticate users',
                        'Life of the account + 12 months',
                        'Allows a grace period for reactivation and dispute resolution. [LEGAL REVIEW] confirm period.',
                        'Delete or anonymise',
                    ],
                    [
                        'Pharmacy / business profile data',
                        'Pharmacy name, trading name, address, county, town, phone, email, currency, receipt header/footer',
                        'Provide the Service; issue receipts; comply with tax/regulatory obligations',
                        'Life of the account + 7 years',
                        'Kenyan tax and accounting records may need to be retained. [LEGAL REVIEW] confirm under KRA rules.',
                        'Delete or anonymise where permitted',
                    ],
                    [
                        'Authentication & security logs',
                        'Login timestamps, last-login info, session events',
                        'Security monitoring; fraud prevention; incident investigation',
                        '12 months (rolling)',
                        'Longer periods only where needed for an active investigation. [LEGAL REVIEW]',
                        'Delete',
                    ],
                    [
                        'Audit logs (significant admin actions)',
                        'Account suspensions, restorations, role changes, configuration changes',
                        'Accountability; dispute resolution; investigation',
                        'Life of the account + 7 years',
                        'Supports accountability and defends against disputes. [LEGAL REVIEW] confirm.',
                        'Delete or archive',
                    ],
                    [
                        'Billing & subscription records',
                        'Plan, invoice history, payment reference (e.g. M-Pesa code), status',
                        'Bill correctly; comply with tax/accounting obligations; handle disputes',
                        '7 years from end of the relevant financial year',
                        'Aligned with typical Kenyan tax-record retention. [LEGAL REVIEW] confirm.',
                        'Delete',
                    ],
                    [
                        'Sales records (Customer Data)',
                        'Sale lines, totals, payment method, date',
                        'Provide the Service to the pharmacy; enable reports',
                        'Per pharmacy instructions, default: life of the account + 7 years',
                        'The pharmacy (controller) decides. Default aligns with pharmacy-record retention expectations in Kenya. [LEGAL REVIEW]',
                        'Delete or anonymise on pharmacy instruction',
                    ],
                    [
                        'Inventory & batch records (Customer Data)',
                        'Products, batches, expiry dates, movements',
                        'Provide the Service to the pharmacy; enable reports',
                        'Per pharmacy instructions, default: life of the account + 7 years',
                        'Same as sales records. [LEGAL REVIEW]',
                        'Delete or anonymise on pharmacy instruction',
                    ],
                    [
                        'Supplier records (Customer Data)',
                        'Supplier name, contact, terms',
                        'Provide the Service to the pharmacy',
                        'Per pharmacy instructions, default: life of the account + 7 years',
                        'Same as sales records. [LEGAL REVIEW]',
                        'Delete or anonymise on pharmacy instruction',
                    ],
                    [
                        'Customer / patient records (Customer Data)',
                        'Names, contact details, purchase history, loyalty points',
                        'Provide the Service to the pharmacy',
                        'Per pharmacy instructions, default: life of the account + 7 years',
                        'The pharmacy is the controller. It determines the lawful basis and retention. [LEGAL REVIEW]',
                        'Delete or anonymise on pharmacy instruction',
                    ],
                    [
                        'Loyalty transactions (Customer Data)',
                        'Points earned/redeemed per customer',
                        'Provide the Service to the pharmacy',
                        'Per pharmacy instructions, default: 24 months',
                        'Loyalty data is often kept for a shorter period than full sales records. [LEGAL REVIEW]',
                        'Delete or anonymise on pharmacy instruction',
                    ],
                    [
                        'Requested items / smart-order history',
                        'Items requested from suppliers, orders placed',
                        'Provide the Service to the pharmacy',
                        'Per pharmacy instructions, default: 24 months',
                        '[LEGAL REVIEW]',
                        'Delete or anonymise',
                    ],
                    [
                        'Sales returns',
                        'Returned items, reasons, refunds',
                        'Provide the Service; support dispute resolution',
                        'Per pharmacy instructions, default: life of the account + 7 years',
                        'Matches sales-record retention. [LEGAL REVIEW]',
                        'Delete or anonymise',
                    ],
                    [
                        'Support & communications',
                        'Emails, messages, call notes',
                        'Respond to enquiries; resolve disputes; improve support',
                        '24 months',
                        'Longer where tied to an active dispute. [LEGAL REVIEW]',
                        'Delete',
                    ],
                    [
                        'Data-subject request log',
                        'Request, action taken, outcome',
                        'Accountability under the DPA',
                        '3 years',
                        '[LEGAL REVIEW] confirm timeline.',
                        'Delete or anonymise',
                    ],
                    [
                        'Breach register',
                        'Facts, effects, remediation',
                        'Accountability; ODPC reporting obligations',
                        '7 years',
                        '[LEGAL REVIEW] confirm timeline.',
                        'Delete or anonymise',
                    ],
                    [
                        'Processor register',
                        'Processor name, purpose, location, DPA status',
                        'Accountability; processor oversight',
                        'Life of the relationship + 3 years',
                        '[LEGAL REVIEW]',
                        'Delete',
                    ],
                    [
                        'Backups',
                        'Encrypted snapshots of live data',
                        'Recovery from data loss',
                        'Rolling window (e.g. 30–90 days), then overwritten',
                        'Backups are deleted on a rolling basis by the storage provider. [LEGAL REVIEW] confirm provider policy.',
                        'Overwritten',
                    ],
                ],
            },
        },
        // ---------------------------------------------------------
        {
            id: 'deletion-vs-termination',
            title: 'Deletion vs. Termination',
            intro:
                'These are different actions and must not be confused:',
            items: [
                'Termination is the permanent ending of the Service relationship. It does NOT automatically delete data.',
                'Deletion is the permanent removal or irreversible anonymisation of data. It follows this Policy, the pharmacy\'s instructions (where we are a processor), and applicable law.',
                'After termination, data is retained for the periods shown in the schedule, then deleted or anonymised.',
                'Where a legal hold applies, deletion is paused.',
            ],
            callout: {
                tone: 'warning',
                title: 'Suspension never triggers immediate deletion',
                body:
                    'Even where an account is suspended for non-payment or policy reasons, data is retained under this Policy. Immediate deletion on suspension is not permitted.',
            },
        },
        // ---------------------------------------------------------
        {
            id: 'deletion-requests',
            title: 'Deletion Requests from Pharmacies or Data Subjects',
            items: [
                'A pharmacy (controller) may request deletion of its Customer Data at any time.',
                'Pharmienta will comply unless we are required to retain the data by law or by a legal hold.',
                'Where Pharmienta is a processor, we forward deletion requests from individual data subjects to the pharmacy (controller) and assist as required.',
                'Where a deletion request cannot be fully satisfied, we explain the reason and any exceptions (for example, tax retention).',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'anonymisation',
            title: 'Anonymisation & Aggregation',
            items: [
                'Where possible, data is anonymised (irreversibly de-identified) rather than deleted, so that aggregate insights can be preserved without personal data.',
                'Anonymised data is not personal data under the DPA, provided re-identification is not reasonably possible.',
                'Where data is aggregated for Business Intelligence, individual transactions are not exposed.',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'review',
            title: 'Periodic Review',
            items: [
                'Retention periods are reviewed at least annually.',
                'When the Service changes (for example, a new data category is introduced), this Policy is updated.',
                'Processes are checked to make sure retention and deletion actually occur as described.',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'contact',
            title: 'Contact',
            items: [
                `Data Protection Contact: ${POLICY_META.dpoContact}`,
                `General email: ${POLICY_META.email}`,
                `Phone: ${POLICY_META.phone}`,
                `Address: ${POLICY_META.address}`,
            ],
        },
    ],
};