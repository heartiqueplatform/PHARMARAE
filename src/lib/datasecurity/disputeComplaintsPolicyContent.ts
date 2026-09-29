// src/lib/disputeComplaintsPolicyContent.ts
import type { PolicyDocument } from './policyTypes';
import { POLICY_META } from './policyTypes';

export const disputeComplaintsPolicy: PolicyDocument = {
    slug: 'dispute-complaints',
    title: 'Dispute & Complaints Policy',
    version: '1.0.0',
    effectiveDate: '2026-01-01',
    lastUpdated: '2026-01-01',
    summary:
        'This Policy explains how Pharmienta handles complaints and disputes — including billing, account access, data protection, service quality, security incidents, and termination. It sets out how users contact us, how we document and resolve disputes, and how unresolved matters escalate.',
    sections: [
        {
            id: 'scope',
            title: 'Scope',
            items: [
                'This Policy covers: billing disputes, account-access disputes, data-protection complaints, service complaints, security incidents, and account-termination disputes.',
                'It applies to all Pharmienta customers and their Authorised Users.',
                'It sits alongside the Terms & Conditions and does not replace any statutory rights you have under Kenyan law.',
            ],
        },
        {
            id: 'how-to-complain',
            title: 'How to Raise a Complaint',
            intro: 'Contact us first so we can try to resolve the matter informally:',
            items: [
                `Email: ${POLICY_META.email}`,
                `Phone: ${POLICY_META.phone}`,
                `Address: ${POLICY_META.address}`,
                'For data-protection complaints specifically, contact our Data Protection Contact.',
                'Please include: your name, pharmacy name, contact details, a description of the issue, and any supporting information.',
            ],
        },
        {
            id: 'categories',
            title: 'How Each Category is Handled',
            table: {
                headers: ['Category', 'Handled under'],
                rows: [
                    ['Billing disputes', 'Payment & Subscription Policy — disputed amounts do not trigger restriction while a good-faith dispute is investigated'],
                    ['Account-access disputes', 'Suspension & Termination Policy'],
                    ['Data-protection complaints', 'Data Protection Policy — escalation to the ODPC if unresolved'],
                    ['Service complaints', 'Customer support, with escalation to management if unresolved'],
                    ['Security incidents', 'Data Protection Policy breach process'],
                    ['Account termination disputes', 'Suspension & Termination Policy'],
                ],
            },
        },
        {
            id: 'what-to-expect',
            title: 'What You Can Expect From Us',
            items: [
                'We acknowledge complaints within a reasonable time.',
                'We work with you in good faith to resolve the matter.',
                'We keep you informed of progress.',
                'We do not take adverse action on the disputed issue while a genuine complaint is being investigated.',
                'We document the complaint, the actions taken, and the outcome.',
            ],
        },
        {
            id: 'documentation',
            title: 'How We Document Disputes',
            items: [
                'Every complaint is logged with the date, the complainant, the issue, the actions taken, and the outcome.',
                'Records of disputes are retained in line with the Data Retention & Disposal Policy.',
                'We use complaints to improve our processes, not to penalise the complainant.',
            ],
        },
        {
            id: 'escalation',
            title: 'Escalation',
            items: [
                'If informal resolution fails, the parties agree to attempt mediation before commencing legal proceedings, where appropriate.',
                'Data-protection complaints may be escalated to the Office of the Data Protection Commissioner (ODPC) of Kenya.',
                'Nothing in this Policy prevents either party from seeking urgent relief from a competent court or regulator where necessary.',
            ],
        },
        {
            id: 'contact',
            title: 'Contact',
            items: [
                `Email: ${POLICY_META.email}`,
                `Phone: ${POLICY_META.phone}`,
                `ODPC: ${POLICY_META.odpcName} — ${POLICY_META.odpcWebsite}`,
            ],
        },
    ],
};