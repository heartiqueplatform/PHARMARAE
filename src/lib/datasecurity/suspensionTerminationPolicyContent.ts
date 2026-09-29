// src/lib/datasecurity/suspensionTerminationPolicyContent.ts
import type { PolicyDocument } from './policyTypes';
import { POLICY_META } from './policyTypes';

export const suspensionTerminationPolicy: PolicyDocument = {
    slug: 'suspension-termination',
    title: 'Suspension & Termination Policy',
    version: '1.0.0',
    effectiveDate: '2026-01-01',
    lastUpdated: '2026-01-01',
    summary:
        "This Policy defines when and how Pharmienta may suspend or terminate a customer's access to the Service, the difference between suspension, termination, and data deletion, and the steps we follow to keep the process fair, proportionate, auditable, and reversible where possible.",
    sections: [
        {
            id: 'definitions',
            title: 'Key Distinctions',
            intro: 'Three actions that must never be confused:',
            table: {
                headers: ['Action', 'Meaning', 'Reversible?', 'Deletes data?'],
                rows: [
                    ['Suspension', 'Temporary restriction of access while an issue is investigated or resolved.', 'Yes', 'No'],
                    ['Termination', 'Permanent ending of the Service relationship.', 'Generally no', 'No — data is retained per the Retention Policy'],
                    ['Data Deletion', 'Permanent removal or irreversible anonymisation of data.', 'No', 'Yes — but only after the applicable retention period and no Legal Hold'],
                ],
            },
            callout: {
                tone: 'warning',
                title: 'Suspension never means deletion',
                body:
                    'Suspending an account does not delete Customer Data. Data is retained under the Data Retention & Disposal Policy.',
            },
        },
        {
            id: 'legitimate-reasons',
            title: 'Legitimate Reasons for Suspension',
            intro: 'Pharmienta may suspend access where there is a legitimate reason, including:',
            items: [
                'Non-payment of Subscription Fees genuinely owed to Pharmienta (after reminder and grace period).',
                'A material breach of the Terms & Conditions that has not been remedied within a reasonable time.',
                'Suspected fraudulent or illegal activity.',
                'A security incident or credible threat to the platform or to other customers.',
                'Abuse of the platform, APIs, or infrastructure.',
                'A legal or regulatory requirement to do so.',
            ],
            callout: {
                tone: 'danger',
                title: 'Not a legitimate reason',
                body:
                    'A personal or private debt between individuals is NOT, on its own, a legitimate reason to suspend a Pharmienta account. Only genuine obligations owed to Pharmienta for the Service may trigger the payment-enforcement process.',
            },
        },
        {
            id: 'suspension-process',
            title: 'Suspension Process',
            items: [
                'Where practicable, Pharmienta notifies the Customer of the reason for suspension and the steps needed to restore access.',
                'Suspension is applied proportionately — a minor first-time issue is generally handled with a warning, not with suspension.',
                'Where the issue is disputed in good faith (for example, a genuine billing dispute), adverse action on the disputed portion is paused.',
                'The suspension and the reason are logged for auditability.',
            ],
        },
        {
            id: 'restoration',
            title: 'Restoration',
            items: [
                'Suspension is intended to be reversible. Once the underlying issue is resolved, access is restored.',
                'We may require evidence (for example, a payment receipt or a plan to remedy the breach) before restoring access.',
                'Restoration is documented with the date, the reason, and the acting administrator.',
            ],
        },
        {
            id: 'termination-reasons',
            title: 'Grounds for Termination',
            intro: 'Pharmienta may terminate the Service relationship where:',
            items: [
                'A material breach of the Terms & Conditions has not been remedied after notice and a reasonable opportunity to remedy.',
                'Continued provision of the Service would be unlawful.',
                'Required by a Kenyan authority or court order.',
                'After a sustained failure to pay Subscription Fees genuinely owed to Pharmienta, following the full Account Closure Workflow.',
            ],
        },
        {
            id: 'termination-process',
            title: 'Termination Process',
            items: [
                'Where practicable, we provide advance notice of termination and an opportunity to export Customer Data.',
                'Termination is documented with reasons, dates, and the acting administrator.',
                'The Customer may terminate its own Subscription at any time by contacting us.',
                'Termination does not affect accrued payment obligations or liabilities that survive termination.',
            ],
        },
        {
            id: 'after-termination',
            title: 'What Happens After Termination',
            items: [
                'Customer Data is retained for the periods set out in the Data Retention & Disposal Policy — NOT deleted immediately.',
                'Where a Legal Hold applies, deletion is paused until the hold is lifted.',
                'After the applicable retention period, data is securely deleted or irreversibly anonymised.',
            ],
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