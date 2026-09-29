// src/lib/acceptableUsePolicyContent.ts
import type { PolicyDocument } from './policyTypes';
import { POLICY_META } from './policyTypes';

export const acceptableUsePolicy: PolicyDocument = {
    slug: 'acceptable-use',
    title: 'Acceptable Use Policy',
    version: '1.0.0',
    effectiveDate: '2026-01-01',
    lastUpdated: '2026-01-01',
    summary:
        'This Policy explains what you may and may not do when using the Pharmienta Service. It protects the Service, our customers, and the public. Breaches may result in suspension or termination under the Terms & Conditions.',
    sections: [
        // ---------------------------------------------------------
        {
            id: 'scope',
            title: 'Scope',
            items: [
                'This Policy applies to every user of the Service — owners, pharmacists, cashiers, other staff, and any other authorised user.',
                'It applies whether you are using the Service directly, through an integration, or via an API.',
                'It applies alongside the Terms & Conditions. Where this Policy and the Terms overlap, both apply.',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'permitted',
            title: 'What You May Do',
            items: [
                'Use the Service for your pharmacy\'s legitimate business operations.',
                'Invite and manage your own authorised users in accordance with the Terms.',
                'Export your own Customer Data using the tools provided in the Service.',
                'Contact Pharmienta for support, questions, or to report an issue.',
                'Use the offline mode to continue working without internet connectivity.',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'prohibited',
            title: 'What You Must Not Do',
            intro:
                'The following activities are prohibited. The list is not exhaustive — any activity that harms the Service, our customers, or the public is prohibited.',
            items: [
                'Attempting to access another pharmacy\'s account or data.',
                'Attempting to bypass, disable, or interfere with authentication, authorisation, or any other security feature.',
                'Uploading malware, viruses, ransomware, or any harmful code.',
                'Using the Service to commit fraud, to falsify records, or to conceal unlawful activity.',
                'Reverse engineering, decompiling, or attempting to extract the source code of the Service, except where permitted by law.',
                'Using automated tools (bots, scrapers, crawlers) to access the Service in a way that places unreasonable load on our infrastructure.',
                'Reselling, sublicensing, or providing the Service to third parties without our written permission.',
                'Using the Service in a way that violates Kenyan law, including the Pharmacy and Poisons Act, the Data Protection Act 2019, and KRA requirements.',
                'Using the Service in a way that violates the rights of any third party.',
                'Sharing credentials between individuals — each user must have their own account.',
                'Entering data you do not have the legal right to enter (including personal data collected without a lawful basis).',
                'Circumventing rate limits, quotas, or feature limits.',
                'Interfering with other customers\' use of the Service.',
                'Probing, scanning, or testing the vulnerability of the Service without prior written authorisation from Pharmienta.',
                'Attempting to access the Service from a jurisdiction where it would be unlawful to do so.',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'security',
            title: 'Your Security Obligations',
            items: [
                'Keep your credentials and PIN confidential.',
                'Use a strong, unique password where passwords are used.',
                'Do not share credentials with anyone, including colleagues — each user has their own account for a reason.',
                'Notify Pharmienta immediately if you suspect your account has been compromised.',
                'Secure the devices and networks you use to access the Service.',
                'Log out of shared devices when you are done.',
            ],
            callout: {
                tone: 'warning',
                title: 'Shared credentials are a security incident',
                body:
                    'If we detect credential sharing, we may suspend the account until the situation is resolved. Shared credentials make it impossible to attribute actions, which harms accountability for everyone.',
            },
        },
        // ---------------------------------------------------------
        {
            id: 'data',
            title: 'Data You Enter',
            items: [
                'You are responsible for the accuracy and legality of the data you enter.',
                'You must have a lawful basis to enter personal data about your patients or customers.',
                'Do not enter sensitive data that is not necessary for your pharmacy\'s operations.',
                'Do not upload files containing malware or unlawful content.',
                'Do not use the Service to store data you are not authorised to store.',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'fair-use',
            title: 'Fair Use of Infrastructure',
            items: [
                'Do not place unreasonable load on the Service (for example, bulk operations that disrupt other users).',
                'Do not use the Service as a general-purpose file host or storage platform.',
                'Do not use the Service to send unsolicited bulk messages (spam) via any channel connected to the Service.',
                'Respect the limits of your subscription plan. Contact us if you need more capacity.',
            ],
        },
        // ---------------------------------------------------------
        {
            id: 'reporting',
            title: 'Reporting Abuse or Vulnerabilities',
            items: [
                'Report suspected abuse of the Service to us.',
                'Report suspected security vulnerabilities responsibly — do not exploit them, do not disclose them publicly before we have had a chance to fix them, and give us reasonable time to respond.',
                `Contact: ${POLICY_META.email}`,
            ],
            callout: {
                tone: 'info',
                title: 'Good-faith security research',
                body:
                    'We welcome good-faith security research. If you find a vulnerability, contact us first. We will not pursue action against researchers who act responsibly.',
            },
        },
        // ---------------------------------------------------------
        {
            id: 'enforcement',
            title: 'Enforcement',
            intro:
                'Where we believe a breach of this Policy has occurred, we may take action in line with the Terms & Conditions and the Suspension & Termination Policy. Action may include:',
            items: [
                'A warning and a request to stop the activity.',
                'Temporary restriction of the affected features or the whole account.',
                'Suspension of the account while the matter is investigated.',
                'Termination of the Service relationship for serious or repeated breaches.',
                'Reporting to Kenyan authorities where the conduct may be unlawful.',
            ],
            callout: {
                tone: 'warning',
                title: 'Proportionate action',
                body:
                    'Enforcement action will be proportionate to the breach. Minor first-time issues will generally be handled with a warning, not with termination.',
            },
        },
        // ---------------------------------------------------------
        {
            id: 'changes',
            title: 'Changes to This Policy',
            items: [
                'We may update this Policy to reflect changes in the Service, the law, or risks.',
                'Material changes will be communicated by email or in-app notice before they take effect where reasonably practicable.',
                'Continued use of the Service after the effective date of an updated Policy means you accept the updated Policy.',
            ],
        },
        // ---------------------------------------------------------
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