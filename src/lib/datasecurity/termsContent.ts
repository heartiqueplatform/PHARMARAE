// src/lib/termsContent.ts
// ============================================================
// PHARMIENTA TERMS & CONDITIONS — CONTENT
// ============================================================
// Draft policy framework. Sections marked [LEGAL REVIEW] must
// be reviewed by a qualified Kenyan advocate before enforcement.
// ============================================================

export const TERMS_VERSION = '2.0.0';
export const TERMS_EFFECTIVE_DATE = '2026-01-01';
export const TERMS_LAST_UPDATED = '2026-01-01';

export const CONTACT = {
    companyName: 'Pharmienta',
    email: 'Pharmienta@gmail.com',
    phone: '+254 717 517 371',
    address: 'Nairobi, Kenya',
    jurisdiction: 'Republic of Kenya',
    venue: 'Nairobi, Kenya',
};

// ============================================================
// SECTION 1 — DEFINITIONS
// ============================================================
export const DEFINITIONS = [
    {
        term: '"Pharmienta" / "we" / "us" / "our"',
        meaning:
            'The Pharmienta pharmacy-management software service and its operator.',
    },
    {
        term: '"Service"',
        meaning:
            'The Pharmienta software platform, including its web/mobile application, cloud synchronisation, offline mode, and any related features we make available to you.',
    },
    {
        term: '"Customer" / "Pharmacy" / "you"',
        meaning:
            'The pharmacy business or other legal entity that has registered to use the Service, and where the context requires, its authorised users.',
    },
    {
        term: '"Authorised User"',
        meaning:
            'An individual (owner, pharmacist, cashier, or other staff member) whom the Customer has added to its Pharmienta account.',
    },
    {
        term: '"Customer Data"',
        meaning:
            'Business records, inventory data, sales records, supplier information, customer records, and other data that the Customer enters into or generates through the Service.',
    },
    {
        term: '"Personal Data"',
        meaning:
            'Any information relating to an identified or identifiable natural person, as defined in the Kenya Data Protection Act, 2019.',
    },
    {
        term: '"Subscription"',
        meaning:
            'A paid plan that grants the Customer access to the Service for a defined period.',
    },
    {
        term: '"Subscription Fee"',
        meaning:
            'The amount payable to Pharmienta for use of the Service. This does NOT include any personal debts owed between individuals.',
    },
    {
        term: '"Suspension"',
        meaning:
            'Temporary restriction of access to the Service that is reversible once the underlying issue is resolved.',
    },
    {
        term: '"Termination"',
        meaning:
            'Permanent ending of the Service relationship. Termination does not automatically mean data deletion.',
    },
    {
        term: '"Data Deletion"',
        meaning:
            'Permanent removal or irreversible anonymisation of Customer Data and/or Personal Data. This is a separate action from Termination.',
    },
];

// ============================================================
// SECTION 2 — ACCEPTANCE & ELIGIBILITY
// ============================================================
export const ACCEPTANCE = [
    'By creating an account, accessing, or using the Service, you confirm that you have read, understood, and agree to be bound by these Terms.',
    'If you are entering into these Terms on behalf of a pharmacy or company, you confirm that you have authority to bind that entity.',
    'You must be at least 18 years old and legally capable of entering into a binding contract under Kenyan law.',
    'If you do not agree to these Terms, you must not use the Service.',
    'These Terms apply to all users of the Service, whether they are the pharmacy owner, an employee, or any other authorised user.',
];

// ============================================================
// SECTION 3 — ACCOUNT CREATION & AUTHORISED USERS
// ============================================================
export const ACCOUNT_CREATION = [
    'The Customer must provide accurate, current, and complete registration information, including the correct pharmacy name, physical address, and contact details.',
    'The Customer is responsible for ensuring that it has the legal right to operate the pharmacy business and to use the Service for that business.',
    'Each Authorised User must have their own login credentials. Credentials must not be shared between individuals.',
    'The Customer is responsible for all activity that occurs under its account and under the accounts of its Authorised Users.',
    'The Customer must promptly remove access for any Authorised User who leaves the pharmacy or changes roles.',
    'Pharmienta may request reasonable verification of a pharmacy\'s identity or authorisation where required for security, fraud-prevention, or legal compliance.',
];

// ============================================================
// SECTION 4 — ACCOUNT SECURITY
// ============================================================
export const ACCOUNT_SECURITY = [
    'You are responsible for keeping your login credentials, PIN codes, and passwords confidential.',
    'You must use a strong, unique password and enable additional security features where available.',
    'You must notify Pharmienta immediately if you become aware of any unauthorised access, suspected breach, or loss of credentials.',
    'You are responsible for the security of the devices, networks, and physical environment from which you access the Service.',
    'Pharmienta may suspend access temporarily if we reasonably believe your account has been compromised, in order to protect your data and the platform.',
];

// ============================================================
// SECTION 5 — CUSTOMER RESPONSIBILITIES
// ============================================================
export const CUSTOMER_RESPONSIBILITIES = [
    'You are responsible for the accuracy, quality, and legality of all Customer Data you enter into the Service.',
    'You must comply with all applicable Kenyan laws, including the Pharmacy and Poisons Act, the Data Protection Act 2019, KRA tax requirements (including eTIMS where applicable), and any other regulations relevant to your pharmacy.',
    'You must respect the privacy of your patients and customers and process their Personal Data lawfully.',
    'You must maintain appropriate backups of your business records. Pharmienta provides export tools, but you remain responsible for your own business continuity.',
    'You must not use the Service to store or process data you do not have the legal right to store or process.',
    'You are responsible for the actions of your Authorised Users.',
];

// ============================================================
// SECTION 6 — PHARMIENTA RESPONSIBILITIES
// ============================================================
export const PHARMIENTA_RESPONSIBILITIES = [
    'We will provide the Service with reasonable skill and care, in line with these Terms.',
    'We will take reasonable technical and organisational measures to protect Customer Data and Personal Data against unauthorised access, loss, or alteration.',
    'We will provide support during the hours described on our website, and emergency support for critical issues.',
    'We will notify you of material changes to these Terms in advance where reasonably practicable.',
    'We will not intentionally access, use, or disclose your Customer Data except: (a) as needed to provide the Service; (b) with your instruction; (c) as required by law; or (d) as described in our Privacy Policy.',
    'We will act on lawful, properly served requests from Kenyan authorities where required by law, and will notify you where legally permitted to do so.',
];

// ============================================================
// SECTION 7 — ACCEPTABLE USE
// ============================================================
export const ACCEPTABLE_USE = [
    'You must not attempt to access another pharmacy\'s account or data.',
    'You must not attempt to bypass, disable, or interfere with security or authentication features.',
    'You must not upload malware, viruses, or any harmful code.',
    'You must not use the Service to commit fraud, to falsify records, or to conceal unlawful activity.',
    'You must not reverse engineer, decompile, or attempt to extract the source code of the Service, except where permitted by law.',
    'You must not use automated tools (bots, scrapers, crawlers) to access the Service in a way that places unreasonable load on our infrastructure.',
    'You must not resell, sublicense, or provide the Service to third parties without our written permission.',
    'You must not use the Service in a way that violates Kenyan law or the rights of any third party.',
];

// ============================================================
// SECTION 8 — PAYMENTS & SUBSCRIPTIONS
// ============================================================
export const PAYMENTS = [
    'Subscription Fees are the amounts payable to Pharmienta for access to the Service. They are separate from any other debts that may exist between individuals.',
    'Subscription Fees, billing cycles, and plan features are described at the point of purchase or on our website.',
    'Where a payment integration is not yet available in the Service, invoices and payment arrangements will be handled through the contact details published by Pharmienta. [LEGAL REVIEW: confirm billing method and whether M-Pesa / bank integration is in place.]',
    'Where a Subscription is on a recurring plan, the Customer authorises Pharmienta to charge the applicable Subscription Fee for each billing period until the Subscription is cancelled.',
    'If a Subscription Fee is not paid by the due date, Pharmienta may follow the process set out in our Payment & Subscription Policy: reminder → grace period → warning → restricted access (where authorised) → termination (where appropriate).',
    'Pharmienta will not treat a private or personal debt between individuals as a Subscription Fee. Only amounts genuinely owed to Pharmienta for the Service may trigger Pharmienta\'s payment-enforcement process.',
    'Refunds, where applicable, are governed by our Payment & Subscription Policy and by Kenyan consumer-protection law. [LEGAL REVIEW: confirm refund position under Kenyan law.]',
    'Where required by Kenyan law, prices are inclusive of or exclusive of VAT and this will be stated clearly at the point of purchase.',
];

// ============================================================
// SECTION 9 — SERVICE AVAILABILITY & LIMITATIONS
// ============================================================
export const SERVICE_AVAILABILITY = [
    'We aim to provide reliable access to the Service, but we do not guarantee uninterrupted or error-free operation.',
    'Scheduled maintenance, emergency maintenance, and events beyond our reasonable control (including internet outages, power failures, and third-party service failures) may cause interruptions.',
    'The Service includes an offline mode that allows continued operation without internet connectivity, but features that require cloud synchronisation will be delayed until connectivity returns.',
    'The Service depends on third-party infrastructure (such as cloud hosting and database providers). Interruptions to those providers may affect the Service.',
    'We are not responsible for the accuracy of data you enter, nor for decisions you make based on reports produced by the Service.',
    'The Service is a management tool. It does not replace professional pharmaceutical, legal, tax, or accounting advice.',
];

// ============================================================
// SECTION 10 — INTELLECTUAL PROPERTY
// ============================================================
export const INTELLECTUAL_PROPERTY = [
    'The Service, including its software, source code, design, trademarks, and documentation, is owned by Pharmienta or its licensors and is protected by Kenyan and international intellectual-property law.',
    'You are granted a limited, non-exclusive, non-transferable right to use the Service during your Subscription, for your internal pharmacy business.',
    'You must not copy, modify, distribute, sell, or create derivative works of the Service except as expressly permitted in writing.',
    'Customer Data remains owned by the Customer. Pharmienta does not claim ownership of your business records merely because they are stored on Pharmienta.',
    'Feedback and suggestions you provide may be used by Pharmienta to improve the Service without obligation to you.',
];

// ============================================================
// SECTION 11 — THIRD-PARTY SERVICES
// ============================================================
export const THIRD_PARTY = [
    'The Service may rely on third-party providers for cloud hosting, database storage, authentication, SMS/email delivery, or payment processing.',
    'Where we use third-party processors to handle Personal Data, we will take reasonable steps to ensure they provide appropriate protections and, where required by the Data Protection Act 2019, we will have written agreements in place.',
    'The Service may contain links to third-party websites or services. We are not responsible for their content or practices.',
    'Where a third-party service has its own terms, those terms may also apply to your use of that service.',
];

// ============================================================
// SECTION 12 — SUSPENSION
// ============================================================
export const SUSPENSION = [
    'Pharmienta may temporarily suspend access to the Service where there is a legitimate reason, including:',
    '  • Non-payment of Subscription Fees genuinely owed to Pharmienta (after reminder and grace period);',
    '  • A material breach of these Terms that has not been remedied within a reasonable time;',
    '  • Suspected fraudulent or illegal activity;',
    '  • A security incident or credible threat to the platform or to other customers;',
    '  • Abuse of the platform, APIs, or infrastructure;',
    '  • A legal or regulatory requirement to do so.',
    'Suspension is intended to be reversible where the underlying issue is resolved.',
    'Where practicable, we will notify the Customer of the reason for suspension and the steps needed to restore access.',
    'Suspension does not, by itself, delete Customer Data.',
    'A personal or private debt between individuals is not, on its own, a legitimate reason to suspend a Pharmienta account. Only genuine Pharmienta-related obligations may trigger the payment-enforcement process.',
];

// ============================================================
// SECTION 13 — TERMINATION
// ============================================================
export const TERMINATION = [
    'The Customer may terminate its Subscription at any time by contacting Pharmienta using the contact details below.',
    'Pharmienta may terminate the Service relationship where:',
    '  • A material breach of these Terms has not been remedied after notice and a reasonable opportunity to remedy;',
    '  • Continued provision of the Service would be unlawful;',
    '  • Required by a Kenyan authority or court order;',
    '  • After a sustained failure to pay Subscription Fees genuinely owed to Pharmienta, following the full Payment & Subscription Policy process.',
    'Where practicable, we will provide advance notice of termination and an opportunity to export Customer Data.',
    'Termination does not automatically mean deletion of Customer Data. Data handling after termination is governed by our Data Retention & Disposal Policy.',
    'Termination does not affect any rights or obligations that by their nature survive termination (including payment obligations already accrued and any limitations of liability).',
];

// ============================================================
// SECTION 14 — DATA HANDLING
// ============================================================
export const DATA_HANDLING = [
    'The Customer owns its Customer Data. Pharmienta processes Customer Data to provide the Service and for the limited purposes described in our Privacy Policy.',
    'Where the Customer enters Personal Data about its own patients or customers, the Customer is responsible for ensuring it has a lawful basis to do so, and for meeting its own obligations as a data controller under the Data Protection Act 2019.',
    'Pharmienta acts as a data controller for account, billing, and platform-operation data, and as a data processor for the Customer Data that it processes on the Customer\'s behalf. [LEGAL REVIEW: confirm controller/processor classification per processing activity.]',
    'The Customer may export its Customer Data at any time using the export tools provided in the Service.',
    'The Customer may request a copy of its Customer Data, or request deletion where legally permissible, by contacting Pharmienta using the details below.',
    'Data retention and disposal are governed by our Data Retention & Disposal Policy.',
    'We will handle Personal Data in accordance with the Data Protection Act 2019, the Data Protection (General) Regulations 2021, and our Privacy Policy.',
];

// ============================================================
// SECTION 15 — DISPUTE RESOLUTION
// ============================================================
export const DISPUTE_RESOLUTION = [
    'If you have a complaint or dispute, please contact us first using the contact details below so we can try to resolve it informally.',
    'We aim to acknowledge complaints within a reasonable time and to work with you in good faith to resolve them.',
    'Billing disputes, account-access disputes, data-protection complaints, and service complaints are handled under our Dispute & Complaints Policy.',
    'Data-protection complaints may also be made to the Office of the Data Protection Commissioner (ODPC) of Kenya, in accordance with the Data Protection Act 2019.',
    'If informal resolution fails, the parties agree to attempt mediation before commencing legal proceedings, where appropriate.',
    'Nothing in these Terms prevents either party from seeking urgent relief from a competent court or regulator where necessary.',
];

// ============================================================
// SECTION 16 — LIMITATION OF LIABILITY
// ============================================================
export const LIABILITY = [
    'Nothing in these Terms excludes or limits any liability that cannot lawfully be excluded or limited under Kenyan law.',
    'Subject to the above, and to the maximum extent permitted by Kenyan law:',
    '  • The Service is provided on an "as available" basis. We do not warrant that it will be uninterrupted, error-free, or fit for a particular purpose.',
    '  • We are not liable for indirect, incidental, special, or consequential losses, or for loss of profit, revenue, goodwill, or business opportunity.',
    '  • We are not liable for loss of data to the extent caused by the Customer\'s failure to maintain its own backups or to follow reasonable security practices.',
    '  • Our total aggregate liability arising out of or in connection with these Terms is limited to the Subscription Fees actually paid by the Customer to Pharmienta in the twelve (12) months preceding the event giving rise to the claim. [LEGAL REVIEW: confirm enforceability of this cap under Kenyan consumer-protection law.]',
    'These limitations apply whether the claim is based in contract, tort (including negligence), or otherwise, and even if we have been advised of the possibility of such loss.',
];

// ============================================================
// SECTION 17 — CHANGES TO TERMS
// ============================================================
export const CHANGES_TO_TERMS = [
    'We may update these Terms from time to time to reflect changes in the Service, the law, or our practices.',
    'Where changes are material, we will provide reasonable notice (for example, by email or in-app notice) before the changes take effect.',
    'Continued use of the Service after the effective date of updated Terms constitutes acceptance of the updated Terms.',
    'If you do not agree to the updated Terms, you may stop using the Service and terminate your Subscription in accordance with these Terms.',
    'The current version and effective date of these Terms are always shown at the top of this page.',
];

// ============================================================
// SECTION 18 — GOVERNING LAW & JURISDICTION
// ============================================================
export const GOVERNING_LAW = [
    'These Terms are governed by the laws of the Republic of Kenya.',
    'Subject to the Dispute Resolution section above, the courts of Kenya shall have jurisdiction over any dispute arising out of or in connection with these Terms.',
    'Where mandatory consumer-protection or data-protection laws of Kenya give you rights that cannot be waived by contract, nothing in these Terms affects those rights.',
];

// ============================================================
// SECTION 19 — CONTACT
// ============================================================
export const CONTACT_SECTION = [
    'For questions about these Terms, legal notices, billing queries, data-protection requests, or complaints, please contact:',
];

// ============================================================
// LEGAL REVIEW FLAGS
// ============================================================
export const LEGAL_REVIEW_FLAGS = [
    'Confirm controller/processor classification for each processing activity (Data Protection Act 2019).',
    'Confirm refund position and cooling-off rights under Kenyan consumer-protection law.',
    'Confirm enforceability of the liability cap in Section 16.',
    'Confirm billing/payment method (M-Pesa, bank, invoice) and VAT treatment.',
    'Confirm whether Pharmienta must register as a data controller/processor with the ODPC.',
    'Confirm whether the Service touches KRA eTIMS data flows and what that implies.',
    'Confirm jurisdiction/venue clause is enforceable and appropriate.',
];

// ============================================================
// RETENTION SCHEDULE — used by TermsConditionsView
// ============================================================
export const RETENTION_SCHEDULE = {
    headers: ['Data category', 'Purpose', 'Retention period', 'On expiry'],
    rows: [
        ['Account & profile data', 'Provide the Service; authenticate users', 'Life of the account + 12 months', 'Delete or anonymise'],
        ['Pharmacy / business profile data', 'Provide the Service; issue receipts; comply with tax obligations', 'Life of the account + 7 years', 'Delete or anonymise where permitted'],
        ['Authentication & security logs', 'Security monitoring; fraud prevention; incident investigation', '12 months (rolling)', 'Delete'],
        ['Audit logs (significant admin actions)', 'Accountability; dispute resolution; investigation', 'Life of the account + 7 years', 'Delete or archive'],
        ['Billing & subscription records', 'Bill correctly; comply with tax obligations; handle disputes', '7 years from end of the relevant financial year', 'Delete'],
        ['Sales records (Customer Data)', 'Provide the Service to the pharmacy; enable reports', 'Per pharmacy instructions; default: life of the account + 7 years', 'Delete or anonymise on pharmacy instruction'],
        ['Inventory & batch records (Customer Data)', 'Provide the Service; enable reports', 'Per pharmacy instructions; default: life of the account + 7 years', 'Delete or anonymise on pharmacy instruction'],
        ['Supplier records (Customer Data)', 'Provide the Service', 'Per pharmacy instructions; default: life of the account + 7 years', 'Delete or anonymise on pharmacy instruction'],
        ['Customer / patient records (Customer Data)', 'Provide the Service to the pharmacy', 'Per pharmacy instructions; default: life of the account + 7 years', 'Delete or anonymise on pharmacy instruction'],
        ['Loyalty transactions (Customer Data)', 'Provide the Service to the pharmacy', 'Per pharmacy instructions; default: 24 months', 'Delete or anonymise on pharmacy instruction'],
        ['Requested items / smart-order history', 'Provide the Service to the pharmacy', 'Per pharmacy instructions; default: 24 months', 'Delete or anonymise'],
        ['Sales returns', 'Provide the Service; support dispute resolution', 'Per pharmacy instructions; default: life of the account + 7 years', 'Delete or anonymise'],
        ['Support & communications', 'Respond to enquiries; resolve disputes', '24 months', 'Delete'],
        ['Data-subject request log', 'Accountability under the DPA', '3 years', 'Delete or anonymise'],
        ['Breach register', 'Accountability; ODPC reporting obligations', '7 years', 'Delete or anonymise'],
        ['Processor register', 'Accountability; processor oversight', 'Life of the relationship + 3 years', 'Delete'],
        ['Backups', 'Recovery from data loss', 'Rolling window (e.g. 30–90 days), then overwritten', 'Overwritten'],
    ],
};