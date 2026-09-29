// src/lib/paymentPolicyContent.ts
import type { PolicyDocument } from './policyTypes';
import { POLICY_META } from './policyTypes';

export const paymentPolicy: PolicyDocument = {
    slug: 'payments',
    title: 'Payment & Subscription Policy',
    version: '1.0.0',
    effectiveDate: '2026-01-01',
    lastUpdated: '2026-01-01',
    summary:
        'This Policy explains what Subscription Fees are, how and when they are payable, what happens if a payment is late, and how we distinguish Pharmienta Subscription Fees from private or personal debts between individuals.',
    sections: [
        {
            id: 'scope',
            title: 'Scope & Key Principle',
            intro:
                'This Policy applies to all amounts payable to Pharmienta for use of the Service. It does not apply to any private or personal debt between individuals, even if those individuals happen to be Pharmienta users or administrators.',
            callout: {
                tone: 'danger',
                title: 'Private debts are NOT Pharmienta debts',
                body:
                    'A private or personal debt between individuals (for example, money owed from a previous working relationship) is not a Pharmienta Subscription Fee. Pharmienta will not use its payment-enforcement process, suspend an account, or restrict access on the basis of a private debt. Only genuine amounts owed to Pharmienta for the Service may trigger this Policy.',
            },
        },
        {
            id: 'what-is-fee',
            title: 'What Counts as a Pharmienta Subscription Fee',
            items: [
                'Fees for a Pharmienta Subscription plan (monthly, annual, or other agreed cycle).',
                'Setup, onboarding, or training fees where agreed in writing.',
                'Add-on module fees (e.g. premium features) where agreed.',
                'Any late-payment interest or administrative charges, where lawfully chargeable and clearly disclosed in advance.',
            ],
        },
        {
            id: 'what-is-not-fee',
            title: 'What is NOT a Pharmienta Subscription Fee',
            items: [
                'Money owed from a private working relationship, loan, or personal arrangement between individuals.',
                'Money owed between a pharmacy and a third party (e.g. a supplier) that does not relate to Pharmienta.',
                'Taxes, levies, or regulatory fees payable by the pharmacy to Kenyan authorities.',
                'Amounts that have not been agreed in writing between Pharmienta and the Customer.',
            ],
        },
        {
            id: 'billing',
            title: 'Billing Cycles & Invoicing',
            items: [
                'Subscription plans and their fees are displayed at the point of purchase and/or on the Pharmienta website.',
                'Where a payment integration is available in the Service, charges are processed through that integration. Where it is not, invoices and payment arrangements are handled through the contact details published by Pharmienta. [LEGAL REVIEW] confirm billing method (M-Pesa / bank / invoice).',
                'Invoices and receipts state the amount, the period covered, and the payment method.',
                'Where required by Kenyan law, VAT treatment is shown on the invoice.',
            ],
        },
        {
            id: 'due-dates',
            title: 'When Payment is Due',
            items: [
                'For recurring plans, payment is due on or before the first day of each billing period, unless otherwise agreed in writing.',
                'For one-off or annual plans, payment is due on the date stated on the invoice.',
                'Where an invoice does not state a due date, payment is due within fourteen (14) days of the invoice date. [LEGAL REVIEW]',
            ],
        },
        {
            id: 'late-process',
            title: 'Process if a Subscription Fee is Not Paid',
            intro: 'If a genuine Pharmienta Subscription Fee is not paid by the due date, we follow this graduated process:',
            table: {
                headers: ['Stage', 'What happens', 'Typical timeframe'],
                rows: [
                    ['1. Reminder', 'Courtesy reminder by email, SMS, or in-app notice.', 'A few days after due date'],
                    ['2. Grace period', 'Account continues to work normally. No restrictions.', 'Up to 14 days'],
                    ['3. Warning', 'Formal overdue notice stating amount, deadline, consequence.', 'After grace period'],
                    ['4. Restricted access (where contractually permitted)', 'Some/all features limited. Data preserved. Restorable on payment.', 'After warning'],
                    ['5. Termination (where appropriate)', 'Subscription may be terminated under Terms & Suspension Policy.', 'After final notice'],
                    ['6. Data retention', 'Customer Data retained under the Data Retention & Disposal Policy — NOT deleted automatically.', 'See Retention Policy'],
                ],
            },
            callout: {
                tone: 'warning',
                title: 'Data is not deleted on non-payment',
                body:
                    'Non-payment does not, by itself, cause deletion of Customer Data. Deletion only occurs under the Data Retention & Disposal Policy after termination, after the applicable retention period, and only where legally permissible.',
            },
        },
        {
            id: 'disputes',
            title: 'Billing Disputes',
            items: [
                'If you believe an invoice is incorrect, contact us before the due date.',
                'We will not restrict access for the disputed portion while a genuine billing dispute is investigated in good faith.',
                'We will respond with our position and any supporting records.',
                'If unresolved, the matter goes to the Dispute & Complaints Policy.',
            ],
        },
        {
            id: 'refunds',
            title: 'Refunds',
            items: [
                'Refund eligibility depends on the plan, the billing cycle, and Kenyan consumer-protection law. [LEGAL REVIEW]',
                'Where a refund is due, it will be paid using the original payment method where possible, or another method agreed with you.',
                'Any statutory rights you have as a consumer in Kenya are not affected by this Policy.',
            ],
        },
        {
            id: 'changes',
            title: 'Changes to Fees',
            items: [
                'We may change Subscription Fees from time to time.',
                'Where changes apply to an existing Subscription, we will give reasonable advance notice before the change takes effect.',
                'If you do not agree to a fee change, you may cancel before the change takes effect.',
            ],
        },
        {
            id: 'contact',
            title: 'Contact for Billing Matters',
            items: [
                `Email: ${POLICY_META.email}`,
                `Phone: ${POLICY_META.phone}`,
                `Address: ${POLICY_META.address}`,
            ],
        },
    ],
};