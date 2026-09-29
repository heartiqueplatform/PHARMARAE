// src/lib/privacyPolicyContent.ts
import type { PolicyDocument } from './policyTypes';
import { POLICY_META } from './policyTypes';

export const privacyPolicy: PolicyDocument = {
    slug: 'privacy',
    title: 'Privacy Policy',
    version: '1.0.0',
    effectiveDate: '2026-01-01',
    lastUpdated: '2026-01-01',
    summary:
        'Pharmienta is committed to protecting your privacy under the Kenya Data Protection Act, 2019. This Policy explains what personal data we collect, why we collect it, how we protect it, who we share it with, how long we keep it, and what rights you have. We collect only what is necessary to run the pharmacy-management Service, and we never sell your data.',
    sections: [
        {
            id: 'who-we-are',
            title: 'Who We Are & Our Roles',
            intro:
                'Pharmienta provides a pharmacy-management software service. Under the Kenya Data Protection Act, 2019 (the "DPA") we act in two different roles depending on the data involved:',
            items: [
                'Data Controller — for account, billing, support, security, and platform-operation data. We decide why and how this data is processed.',
                'Data Processor — for the Customer Data a pharmacy enters (patient records, sales, inventory, etc.). The pharmacy is the controller; Pharmienta processes this data only on the pharmacy\'s instructions and to provide the Service. [LEGAL REVIEW] confirm per-activity classification.',
                `Privacy contact: ${POLICY_META.dpoContact}`,
            ],
        },
        {
            id: 'information-we-collect',
            title: 'Information We Collect',
            labelledItems: [
                { label: 'Account data', description: 'Full name, email, phone, role, hashed PIN, hashed password, avatar.' },
                { label: 'Pharmacy / business data', description: 'Pharmacy name, trading name, address, county, town, phone, email, currency and receipt settings.' },
                { label: 'Authentication & security data', description: 'Login timestamps, last-login info, session events, security logs.' },
                { label: 'Billing & subscription data', description: 'Plan, invoice history, payment reference (e.g. M-Pesa code), subscription status.' },
                { label: 'Customer / patient data (on behalf of the pharmacy)', description: 'Names, contact details, purchase history, loyalty points — only as entered by the pharmacy (who is the controller of this data).' },
                { label: 'Support & communications data', description: 'Emails, support messages, call notes.' },
                { label: 'Usage & diagnostic data', description: 'Feature usage events, error logs, sync queue status — not the content of your business records.' },
            ],
            callout: {
                tone: 'info',
                title: 'We do not knowingly collect health data directly',
                body:
                    'Where a pharmacy enters health-related information into the Service, the pharmacy is responsible for having a lawful basis under the DPA. Pharmienta does not intentionally collect patient health data for its own purposes.',
            },
        },
        {
            id: 'how-we-use',
            title: 'How We Use Your Information (Purposes)',
            items: [
                'Create and manage your account and your pharmacy\'s subscription.',
                'Provide, operate, and maintain the Service (sales, inventory, reports, synchronisation, offline mode).',
                'Authenticate users and protect against unauthorised access.',
                'Process Subscription Fee payments and issue receipts / invoices.',
                'Provide customer support and respond to enquiries.',
                'Detect, prevent, and investigate fraud, abuse, or security incidents.',
                'Comply with legal and regulatory obligations applicable to Pharmienta in Kenya.',
                'Improve the Service using aggregated, de-identified analytics only — never identifiable Customer Data for our own marketing.',
                'Send essential service notices (security alerts, subscription notices, material policy changes).',
            ],
        },
        {
            id: 'lawful-basis',
            title: 'Lawful Basis for Processing',
            intro: 'Under the DPA we must have a lawful basis for each processing activity:',
            table: {
                headers: ['Processing activity', 'Lawful basis'],
                rows: [
                    ['Providing the Service to a subscribed pharmacy', 'Performance of a contract'],
                    ['Processing Subscription Fee payments', 'Performance of a contract'],
                    ['Security monitoring, fraud prevention, audit logging', 'Legitimate interests'],
                    ['Complying with Kenyan legal obligations (tax, regulator requests)', 'Legal obligation'],
                    ['Sending essential service notices', 'Legitimate interests and/or contractual necessity'],
                    ['Optional product-improvement analytics (de-identified)', 'Legitimate interests'],
                    ['Anything requiring consent (e.g. optional marketing)', 'Consent — withdrawable at any time'],
                ],
            },
        },
        {
            id: 'sharing',
            title: 'Who We Share Data With',
            intro: 'We do not sell your personal data. We share it only in the limited circumstances below:',
            items: [
                'Service providers (processors) — cloud hosting, database, file storage, email/SMS delivery, payment processing. We require them to handle data only on our instructions.',
                'The pharmacy that owns the account — Authorised Users are visible to the pharmacy owner/administrator.',
                'Professional advisers (lawyers, auditors, insurers) under confidentiality.',
                'Kenyan authorities, courts, or regulators — only where legally required. Where permitted, we will notify you.',
                'A successor entity if Pharmienta is sold, merged, or reorganised, subject to this Policy.',
            ],
            callout: {
                tone: 'warning',
                title: 'No use of your business records for our own marketing',
                body:
                    'We do not use identifiable Customer Data (patients, sales, inventory) for our own marketing or to promote third-party products.',
            },
        },
        {
            id: 'transfers',
            title: 'International Data Transfers',
            intro:
                'Some service providers may store or process data outside Kenya. Where that happens, we take steps required by the DPA to ensure an appropriate level of protection.',
            items: [
                'We prefer providers that offer data-processing agreements and recognised security certifications.',
                'Where transfers occur, we rely on safeguards permitted under the DPA and its Regulations. [LEGAL REVIEW]',
                'You may ask us for details of where your data is stored and processed.',
            ],
        },
        {
            id: 'security',
            title: 'Data Security Measures',
            intro: 'We use technical and organisational measures appropriate to the risk, including:',
            items: [
                'Encryption of data in transit (HTTPS/TLS).',
                'Role-based access controls inside the Service.',
                'Hashed storage of PINs and passwords.',
                'Audit logging of significant administrative actions (where implemented). [LEGAL REVIEW] confirm which actions are logged.',
                'Offline-first architecture keeps a local copy of data on your device — you are responsible for securing that device.',
                'Regular review of our security practices.',
            ],
            callout: {
                tone: 'info',
                title: 'No system is 100% secure',
                body:
                    'While we take security seriously, no software system can guarantee absolute security. If a reportable breach occurs, we will notify the ODPC and affected data subjects as required by the DPA.',
            },
        },
        {
            id: 'retention',
            title: 'How Long We Keep Personal Data',
            intro:
                'We keep personal data only as long as necessary for the purposes in this Policy and in line with our Data Retention & Disposal Policy and applicable Kenyan law.',
            items: [
                'Account data: for the life of the account plus a limited period afterwards for legal, tax, and dispute purposes.',
                'Billing records: as required by Kenyan tax and accounting law.',
                'Customer Data processed on behalf of a pharmacy: as long as the pharmacy instructs, subject to the Data Retention & Disposal Policy.',
                'Security and audit logs: for a limited period to support incident investigation.',
            ],
            callout: {
                tone: 'danger',
                title: 'We do not delete data as a punishment',
                body:
                    'Pharmienta does not delete a pharmacy\'s Customer Data merely because a Subscription Fee is overdue, because of an unrelated personal dispute, or as a sanction. Deletion follows the Data Retention & Disposal Policy and applicable law.',
            },
        },
        {
            id: 'rights',
            title: 'Your Rights Under the DPA',
            intro: 'Subject to the DPA and its Regulations, you have the right to:',
            items: [
                'Be informed about how your personal data is used.',
                'Access a copy of your personal data.',
                'Request correction of inaccurate or incomplete data.',
                'Request deletion of data where there is no lawful reason to keep it.',
                'Object to or restrict certain processing.',
                'Data portability, where applicable.',
                'Withdraw consent where processing is based on consent.',
                'Lodge a complaint with the ODPC.',
                `To exercise any right, email ${POLICY_META.dpoContact} with subject "Data Subject Request". We may verify your identity first.`,
            ],
        },
        {
            id: 'complaints',
            title: 'Complaints',
            items: [
                `Start with us: email ${POLICY_META.dpoContact}. We will acknowledge and try to resolve promptly.`,
                `If not satisfied, you may complain to the ${POLICY_META.odpcName} (${POLICY_META.odpcWebsite}).`,
                'We will cooperate with the ODPC in any investigation.',
            ],
        },
        {
            id: 'breach',
            title: 'Data Breach Management',
            items: [
                'We maintain an internal process to detect, contain, assess, and remediate personal-data breaches.',
                'Where a breach is likely to result in a risk to data subjects, we will notify the ODPC and affected data subjects as required by the DPA.',
                'Where Pharmienta is a processor, we will notify the affected pharmacy (controller) without undue delay.',
                'We keep a record of breaches and the actions taken.',
            ],
        },
        {
            id: 'children',
            title: "Children's Data",
            items: [
                'The Service is intended for pharmacy staff aged 18 or older.',
                'Where a pharmacy enters data about a child (e.g. a paediatric patient), the pharmacy is responsible for obtaining any consent required by Kenyan law.',
                'We do not knowingly collect children\'s data directly.',
            ],
        },
        {
            id: 'cookies',
            title: 'Cookies & Local Storage',
            items: [
                'The Service uses browser local storage and similar technologies to keep you signed in and to enable offline operation.',
                'We do not use third-party advertising cookies.',
                'You can clear local storage through your browser settings, but this may sign you out and remove offline data on that device.',
            ],
        },
        {
            id: 'bi',
            title: 'Business Intelligence & Privacy',
            intro: 'Our Business Intelligence features provide insights while maintaining strict privacy standards:',
            items: [
                'Anonymized analytics — BI insights use anonymized, aggregated data only.',
                'Trend analysis — revenue and sales trends are analyzed without exposing individual transactions.',
                'Payment insights — payment method breakdowns are aggregated for business optimization.',
                'Performance metrics — KPIs are calculated using anonymized data to protect sensitive information.',
                'All BI data is anonymized and aggregated. Individual transactions are never exposed to third parties.',
            ],
        },
        {
            id: 'dpa-role',
            title: 'Data Processing Roles & Sub-processors',
            labelledItems: [
                { label: 'Data Controller (of Customer Data)', description: 'The Kenyan pharmacy that owns the account.' },
                { label: 'Data Processor (of Customer Data)', description: 'Pharmienta, acting on the pharmacy\'s instructions.' },
                { label: 'Data Controller (of account/platform data)', description: 'Pharmienta.' },
                { label: 'Sub-processors', description: 'Cloud hosting, database, file storage, email/SMS, and payment providers. A current list is available on request.' },
            ],
            callout: {
                tone: 'info',
                title: 'Written processor agreements',
                body:
                    'Where required by the DPA, we enter into written data-processing agreements with our processors. [LEGAL REVIEW] confirm which processors have signed DPAs.',
            },
        },
        {
            id: 'changes',
            title: 'Changes to This Policy',
            items: [
                'We may update this Policy to reflect changes in the Service, the law, or our practices.',
                'Material changes will be communicated by email or in-app notice before they take effect where reasonably practicable.',
                'The current version and effective date are shown at the top of this page.',
            ],
        },
        {
            id: 'contact',
            title: 'Privacy Inquiries & Contact',
            intro: 'For privacy questions, data-access requests, or concerns about your data, contact our privacy team:',
            items: [
                `Email: ${POLICY_META.email}`,
                `Data-protection enquiries: ${POLICY_META.dpoContact}`,
                `Phone: ${POLICY_META.phone}`,
                `Address: ${POLICY_META.address}`,
                'We aim to respond to privacy enquiries within a reasonable time and within the timeframe required by the DPA.',
            ],
        },
    ],
};