// src/lib/dataProtectionPolicyContent.ts
import type { PolicyDocument } from './policyTypes';
import { POLICY_META } from './policyTypes';

export const dataProtectionPolicy: PolicyDocument = {
    slug: 'data-protection',
    title: 'Data Protection Policy',
    version: '1.0.0',
    effectiveDate: '2026-01-01',
    lastUpdated: '2026-01-01',
    summary:
        'This internal Data Protection Policy sets out how Pharmienta protects personal data across the organisation and in the Service. It goes deeper than the public Privacy Policy: it covers governance, roles, data-minimisation, access controls, processor management, breach response, and privacy-by-design. It is aligned with the Kenya Data Protection Act, 2019 and its Regulations.',
    sections: [
        // ---------------------------------------------------------
        {
            id: 'purpose',
            title: 'Purpose & Scope',
            intro:
                'This Policy applies to everyone at Pharmienta who handles personal data — founders, employees, contractors, and anyone acting on our behalf. It applies to all processing carried out through the Service and to any manual handling of personal data connected with Pharmienta.',
            items: [
                'This Policy is approved by the founder(s) and reviewed at least annually.',
                'This Policy sits alongside the public Privacy Policy, the Data Retention & Disposal Policy, and the Acceptable Use Policy.',
                'Where this Policy says "must", it is a mandatory internal control.',
                'Where there is a conflict between this Policy and applicable Kenyan law, the law prevails.',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'roles',
            title: 'Roles & Responsibilities',
            intro:
                'Clear ownership is essential. Pharmienta operates with the following internal roles:',
            table: {
                headers: ['Role', 'Responsibility'],
                rows: [
                    ['Founder / Management', 'Ultimate accountability for data protection. Approves this Policy. Signs off on high-risk processing.'],
                    ['Data Protection Contact', 'Day-to-day point of contact for data-protection matters. Handles data-subject requests, processor oversight, and breach coordination. [LEGAL REVIEW] confirm whether a formal DPO is required for Pharmienta.'],
                    ['Engineering / Operations', 'Implements and maintains technical and organisational measures described in this Policy.'],
                    ['All Staff & Contractors', 'Follow this Policy. Report suspected breaches or incidents immediately. Complete any data-protection awareness training provided.'],
                ],
            },
            callout: {
                tone: 'info',
                title: 'Data Protection Contact',
                body:
                    `Pharmienta designates ${POLICY_META.dpoContact} as the point of contact for data-protection matters. This person handles privacy enquiries, data-subject requests, and internal escalation.`,
            },
        },
        // ---------------------------------------------------------
        {
            id: 'principles',
            title: 'Data-Protection Principles',
            intro:
                'Pharmienta processes personal data in line with the principles of the Kenya Data Protection Act, 2019:',
            items: [
                'Lawfulness, fairness, and transparency — every processing activity has a lawful basis and is described in our Privacy Policy.',
                'Purpose limitation — data is collected for specific, explicit, and legitimate purposes and is not used for incompatible purposes.',
                'Data minimisation — we collect only what is necessary. We do not collect data "just in case".',
                'Accuracy — we take reasonable steps to keep personal data accurate and up to date. Users can correct their own account data.',
                'Storage limitation — we keep personal data only as long as necessary. See the Data Retention & Disposal Policy.',
                'Integrity and confidentiality — we protect personal data using appropriate technical and organisational measures.',
                'Accountability — we can demonstrate compliance with these principles. This Policy, our records, and our audit logs support that.',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'lawful-basis',
            title: 'Lawful Basis & Consent',
            items: [
                'Every processing activity must have a lawful basis under the DPA (contract, legal obligation, legitimate interests, vital interests, public interest, or consent).',
                'Where consent is the basis (for example, optional marketing), it must be freely given, specific, informed, unambiguous, and recorded.',
                'Consent can be withdrawn at any time, and withdrawal must be as easy as giving consent.',
                'Where Pharmienta is a processor for Customer Data, the pharmacy (controller) is responsible for the lawful basis of that data. Pharmienta processes it only on the pharmacy\'s documented instructions.',
                'Where a new processing activity is proposed, it must go through a privacy-by-design review (see "Privacy by Design" below).',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'minimisation',
            title: 'Data Minimisation & Purpose Limitation',
            items: [
                'Before adding a new field, feature, or integration that collects personal data, ask: is this necessary for the stated purpose? Can we achieve the same result with less data?',
                'Do not enable collection of data "for future use". Data must be tied to a current, identified purpose.',
                'Do not merge data sets for convenience if that creates new privacy risks.',
                'Where data can be aggregated or de-identified without losing value, do so.',
                'Review existing fields and features at least annually and remove or anonymise anything no longer necessary.',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'transparency',
            title: 'Transparency to Data Subjects',
            items: [
                'Pharmienta maintains a public Privacy Policy that is written in plain language and covers: what data we collect, why, who we share it with, how long we keep it, and what rights users have.',
                'Where Pharmienta is a processor, the pharmacy is responsible for informing its own patients/customers. Pharmienta supports the pharmacy by providing accurate information about the Service.',
                'Where there are material changes to how data is used, Pharmienta informs affected users in advance.',
                'Data-subject requests are handled via the Data Protection Contact.',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'access',
            title: 'Access Controls',
            intro:
                'Only people who need personal data to do their job may access it. Pharmienta implements the following controls:',
            items: [
                'Role-based access inside the Service — owners, pharmacists, cashiers, and other roles see only what their role requires.',
                'Strong authentication: unique accounts, hashed credentials, session timeouts, and where available additional factors.',
                'No shared accounts for Pharmienta staff. Administrative access is named and attributable.',
                'Least privilege — access is granted on a need-to-know basis and reviewed periodically.',
                'Where an account is no longer needed (staff departure, role change), access is revoked promptly.',
                'Access to production systems is limited and logged.',
            ],
            callout: {
                tone: 'warning',
                title: 'No shared credentials',
                body:
                    'Sharing credentials — whether between Pharmienta staff or between pharmacy users — is prohibited. It destroys accountability and is a security risk.',
            },
        },
        // ---------------------------------------------------------
        {
            id: 'security',
            title: 'Technical & Organisational Security Measures',
            intro:
                'Pharmienta maintains appropriate security measures to protect personal data. These include, at a minimum:',
            items: [
                'Encryption of personal data in transit (TLS/HTTPS).',
                'Hashed storage of authentication secrets (PINs, passwords).',
                'Offline-first architecture that keeps a local copy of data on users\' devices — users are responsible for securing their devices.',
                'Logical separation of data between pharmacies.',
                'Backups to support recovery.',
                'Monitoring of the platform for security incidents.',
                'A documented incident-response process (see "Breach Management").',
                'Regular review of our practices as the Service evolves.',
            ],
            callout: {
                tone: 'info',
                title: 'Honesty about security claims',
                body:
                    'Pharmienta does not claim certifications (such as ISO 27001) or measures (such as 24/7 monitoring or penetration testing) that we do not actually operate. This Policy describes what we actually do. Where a specific measure is not yet implemented, it is flagged for review. [LEGAL REVIEW] confirm which measures are currently in place and update this Policy accordingly.',
            },
        },
        // ---------------------------------------------------------
        {
            id: 'processors',
            title: 'Processor & Sub-processor Management',
            intro:
                'Pharmienta relies on third parties (for example, cloud hosting, database, file storage, email/SMS, and payments) to help run the Service. These are our processors. We manage them as follows:',
            items: [
                'Before engaging a processor, we assess whether it can provide appropriate safeguards.',
                'Where required by the DPA, we enter into a written data-processing agreement covering subject matter, duration, nature, purpose, types of personal data, categories of data subjects, and the processor\'s obligations.',
                'Processors may only process personal data on our documented instructions.',
                'Processors must notify us of any personal-data breach without undue delay.',
                'Processors must assist us with data-subject requests and DPIAs where relevant.',
                'We keep a register of processors and sub-processors, and we review it periodically.',
                'Where Pharmienta is itself a processor for a pharmacy, we will not engage a sub-processor without the pharmacy\'s general or specific authorisation.',
            ],
            callout: {
                tone: 'warning',
                title: 'DPAs required',
                body:
                    'Where required by the DPA, Pharmienta must have a written data-processing agreement with each processor. [LEGAL REVIEW] confirm which processors have signed DPAs and remediate any gaps.',
            },
        },
        // ---------------------------------------------------------
        {
            id: 'transfers',
            title: 'International Transfers',
            intro:
                'Some processors store or process data outside Kenya. Pharmienta handles these transfers as follows:',
            items: [
                'Prefer providers that can demonstrate appropriate safeguards (recognised certifications, security programmes, contractual protections).',
                'Where the DPA requires, rely on the safeguards permitted under the Act and its Regulations. [LEGAL REVIEW] confirm the specific legal mechanism used for each transfer.',
                'Document the location(s) where personal data is stored or processed.',
                'Make sure processors outside Kenya are bound by confidentiality and security obligations no weaker than those required of processors inside Kenya.',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'retention',
            title: 'Retention & Disposal',
            items: [
                'Personal data is retained only as long as necessary for the purposes described in this Policy and the public Privacy Policy.',
                'Specific retention periods per data category are set out in the Data Retention & Disposal Policy.',
                'When retention ends, personal data is securely deleted or irreversibly anonymised.',
                'We do not delete personal data as a punishment for non-payment or for unrelated disputes.',
                'We periodically review whether retained data is still needed.',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'rights',
            title: 'Handling Data-Subject Requests',
            intro:
                'Under the DPA, data subjects have rights including access, correction, deletion, restriction, portability, and objection. Pharmienta handles requests as follows:',
            items: [
                'All requests go to the Data Protection Contact.',
                'We may verify the requester\'s identity before acting.',
                'We log every request, the action taken, and the outcome.',
                'We respond within the timeframe required by the DPA. [LEGAL REVIEW] confirm the statutory response timeline.',
                'Where Pharmienta is a processor, we forward requests relating to Customer Data to the pharmacy (controller) and assist as required.',
                'Where a request is refused (for example, because we have a lawful reason to retain the data), we explain the reason and the requester\'s right to complain to the ODPC.',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'breach',
            title: 'Breach Management',
            intro:
                'A personal-data breach is any accidental or unlawful destruction, loss, alteration, unauthorised disclosure, or access to personal data. Pharmienta maintains an incident-response process:',
            items: [
                'Detect and contain — stop the breach from continuing and preserve evidence.',
                'Assess — determine what data, how many data subjects, and what risk.',
                'Notify — where a breach is likely to result in a risk to data subjects, notify the ODPC and (where required) the affected data subjects, in line with the DPA. Where Pharmienta is a processor, notify the affected pharmacy (controller) without undue delay.',
                'Remediate — fix the underlying cause and prevent recurrence.',
                'Record — keep a breach register including facts, effects, and remedial action.',
            ],
            callout: {
                tone: 'danger',
                title: 'When in doubt, escalate immediately',
                body:
                    'Staff who suspect a breach must notify the Data Protection Contact immediately. Do not wait to confirm before escalating — early containment matters more than certainty.',
            },
        },
        // ---------------------------------------------------------
        {
            id: 'privacy-by-design',
            title: 'Privacy by Design & by Default',
            intro:
                'Pharmienta builds privacy into features from the start, not as an afterthought:',
            items: [
                'New features that touch personal data go through a privacy review before release.',
                'Where a new feature is likely to result in a high risk to data subjects (for example, large-scale profiling or sensitive-data processing), a Data Protection Impact Assessment (DPIA) is carried out. [LEGAL REVIEW] confirm triggers for a DPIA under the DPA and its Regulations.',
                'Defaults are privacy-friendly: for example, minimal collection, restricted sharing, and conservative retention.',
                'De-identified or aggregated data is preferred where it meets the business need.',
                'Where a feature involves new processors, those processors are onboarded under "Processor & Sub-processor Management" above.',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'training',
            title: 'Awareness & Training',
            items: [
                'All Pharmienta staff and contractors with access to personal data must understand and follow this Policy.',
                'Training is provided on onboarding and refreshed periodically.',
                'Training covers: the DPA principles, security basics, breach reporting, data-subject requests, and acceptable use.',
                'Compliance with this Policy is a condition of access to Pharmienta systems.',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'records',
            title: 'Records of Processing & Accountability',
            items: [
                'Pharmienta maintains an internal record of processing activities describing: what data is processed, why, lawful basis, categories of data subjects, recipients, retention, and security measures.',
                'Pharmienta keeps a register of processors and sub-processors.',
                'Pharmienta keeps a breach register.',
                'Pharmienta keeps a log of data-subject requests and outcomes.',
                'Where the DPA requires registration of data controllers/processors with the ODPC, Pharmienta will register. [LEGAL REVIEW] confirm whether registration is required for Pharmienta\'s activities.',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'audit',
            title: 'Monitoring & Internal Review',
            items: [
                'This Policy is reviewed at least annually, and whenever there is a material change in the Service, the law, or our processors.',
                'Access rights are reviewed periodically to ensure they remain appropriate.',
                'Processor arrangements are reviewed periodically.',
                'Findings are documented and acted on.',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'non-compliance',
            title: 'Consequences of Non-Compliance',
            items: [
                'Failure to follow this Policy may result in disciplinary action, up to and including termination of employment or contract.',
                'Serious breaches may be reportable to the ODPC and could expose Pharmienta to enforcement action under the DPA.',
                'Anyone who reports a suspected breach in good faith will not be penalised for doing so.',
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