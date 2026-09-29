// src/lib/accountClosurePolicyContent.ts
import type { PolicyDocument } from './policyTypes';
import { POLICY_META } from './policyTypes';

export const accountClosurePolicy: PolicyDocument = {
    slug: 'account-closure',
    title: 'Account Closure Workflow',
    version: '1.0.0',
    effectiveDate: '2026-01-01',
    lastUpdated: '2026-01-01',
    summary:
        'This Workflow sets out the full lifecycle from an active account to account closure, data retention, and eventual deletion or anonymisation. It is designed to be auditable, proportionate, and reversible wherever practical. It applies equally to every Pharmienta customer.',
    sections: [
        {
            id: 'lifecycle',
            title: 'Account Lifecycle',
            intro: 'Every step is documented and reversible until deletion:',
            table: {
                headers: ['Step', 'What happens', 'Typical timeframe'],
                rows: [
                    ['1. ACTIVE', 'Account is in good standing. Full access.', '—'],
                    ['2. PAYMENT OVERDUE / POLICY ISSUE', 'A genuine Subscription Fee is unpaid, or a policy issue has arisen.', '—'],
                    ['3. NOTICE (Reminder)', 'Courtesy reminder by email, SMS, or in-app notice.', 'A few days after due date'],
                    ['4. GRACE PERIOD', 'Account continues to work normally. No restrictions.', 'Up to 14 days'],
                    ['5. WARNING (Formal overdue notice)', 'We state the amount, the deadline, and the consequence.', 'After grace period'],
                    ['6. RESTRICTION WHERE AUTHORISED', 'Some or all features may be limited. Data is preserved. Access restored on resolution.', 'After warning'],
                    ['7. FINAL NOTICE', 'We state that termination may follow if the matter is not resolved.', 'After restriction'],
                    ['8. TERMINATION IF APPROPRIATE', 'Subscription may be terminated under the Terms.', 'After final notice'],
                    ['9. DATA RETENTION PERIOD', 'Data retained under the Data Retention & Disposal Policy. NOT deleted at this stage.', 'See Retention Policy'],
                    ['10. DELETION / ANONYMISATION', 'After the applicable retention period, and where no Legal Hold applies, data is deleted or irreversibly anonymised.', 'See Retention Policy'],
                ],
            },
        },
        {
            id: 'reversibility',
            title: 'Reversibility',
            items: [
                'At any stage before deletion, the account may be restored on resolution of the underlying issue.',
                'Restoration is documented with the date, the reason, and the acting administrator.',
                'Payments made during the process restore access without penalty beyond the applicable late fees (where lawfully chargeable and disclosed in advance).',
            ],
        },
        {
            id: 'fairness',
            title: 'Fairness Rules',
            items: [
                'The workflow applies equally to every customer. It is not designed for any specific customer or dispute.',
                'A personal or private debt between individuals is not, on its own, a reason to enter the workflow.',
                'Where a genuine dispute exists on the underlying issue, the workflow is paused while the dispute is investigated in good faith.',
                'Proportionality: a minor first-time issue is generally handled with a warning, not with restriction or termination.',
            ],
            callout: {
                tone: 'danger',
                title: 'No arbitrary deletion',
                body:
                    'Data is never deleted as a punishment, and never as a shortcut to resolve a dispute. Deletion follows the Data Retention & Disposal Policy and applicable law.',
            },
        },
        {
            id: 'documentation',
            title: 'Documentation & Audit',
            items: [
                'Each step is logged with the date, the reason, and the acting administrator.',
                'The Customer is notified of each significant step where practicable.',
                'Records are retained in line with the Data Retention & Disposal Policy.',
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