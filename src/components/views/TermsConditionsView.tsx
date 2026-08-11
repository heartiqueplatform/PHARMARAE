import React from 'react';
import {
    FileCheck, AlertCircle, CheckCircle, Shield, FileText,
    Users, Lock, Clock, Globe, Smartphone, Database,
    AlertTriangle, Fingerprint, Server, RefreshCw,
    BookOpen, UserCheck, Building2, CreditCard,
    MessageSquare, Mail, Phone, MapPin, Calendar,
    Download, Link, Key, Award, Star, BadgeCheck,
    Gavel, Scale, Clipboard, ClipboardList, Bell,
    ShoppingBag, Package, Truck, Store
} from 'lucide-react';

interface TermsConditionsViewProps {
    theme: 'dark' | 'light';
}

export const TermsConditionsView: React.FC<TermsConditionsViewProps> = ({ theme }) => {
    const isDark = theme === 'dark';

    const sections = [
        {
            icon: FileCheck,
            title: 'Acceptance of Terms',
            items: [
                'By using PHARMIENTA Pro, you agree to these Terms & Conditions',
                'If you do not agree, please do not use the application',
                'These terms apply to all users including owners, staff, and administrators',
                'Continued use constitutes acceptance of any updates or modifications',
                'You must be 18 years or older to use this application',
                'You represent that you have the authority to bind your pharmacy to these terms'
            ]
        },
        {
            icon: Users,
            title: 'User Registration & Accounts',
            items: [
                'Each user must register with accurate and complete information',
                'You are responsible for maintaining the confidentiality of your credentials',
                'One account per individual user - sharing accounts is prohibited',
                'You must notify us immediately of any unauthorized access',
                'We reserve the right to verify user identities and pharmacy licenses',
                'Temporary accounts may be created for training purposes'
            ]
        },
        {
            icon: Scale,
            title: 'User Responsibilities',
            items: [
                'Maintain the confidentiality of your account credentials and PIN codes',
                'Ensure all pharmacy data entered is accurate and up-to-date',
                'Comply with all applicable laws and regulations for pharmaceutical products',
                'Report any security vulnerabilities or unauthorized access immediately',
                'Use the system only for legitimate pharmacy business purposes',
                'Respect patient privacy and confidentiality at all times'
            ]
        },
        {
            icon: Shield,
            title: 'License & Access Rights',
            items: [
                'PHARMIENTA Pro is licensed per pharmacy location/branch',
                'Access is granted to pharmacy staff based on role-specific permissions',
                'You may not share your account credentials with non-staff members',
                'We reserve the right to suspend or terminate access for violations',
                'Licenses are non-transferable between pharmacies',
                'Enterprise licenses available for multi-branch operations'
            ]
        },
        {
            icon: Database,
            title: 'Data Ownership & Confidentiality',
            items: [
                'All pharmacy data is owned by the pharmacy entity',
                'Customer information must be handled with strict confidentiality',
                'PHARMIENTA does not share your data with third parties without consent',
                'You may export and backup your data at any time',
                'Data stored in compliance with Kenyan Data Protection Act (2019)',
                'You retain full ownership of your business and customer data'
            ]
        },
        {
            icon: Lock,
            title: 'Security & Data Protection',
            items: [
                'All data is encrypted in transit and at rest',
                'Multi-factor authentication is available for enhanced security',
                'Regular security audits and penetration testing are conducted',
                'You are responsible for securing your devices and network',
                'Report any security incidents within 24 hours of discovery',
                'Session timeouts are enforced after periods of inactivity'
            ]
        },
        {
            icon: Server,
            title: 'Service Availability & Support',
            items: [
                'We strive for 99.9% uptime for cloud synchronization features',
                'Offline mode allows continuous operation without internet',
                'Support is available during business hours (Mon-Fri, 8AM-6PM)',
                'Emergency support available 24/7 for critical issues',
                'Maintenance windows will be communicated in advance',
                'Service may be temporarily interrupted for scheduled updates'
            ]
        },
        {
            icon: AlertTriangle,
            title: 'Prohibited Activities',
            items: [
                'Attempting to bypass security measures or access unauthorized data',
                'Using the system for illegal activities or fraud',
                'Intentionally introducing malware or harmful code',
                'Uploading false or misleading information',
                'Reverse engineering or decompiling the application',
                'Using automated systems to access the application beyond normal use'
            ]
        },
        {
            icon: Gavel,
            title: 'Termination & Suspension',
            items: [
                'Accounts may be terminated for violations of these terms',
                'You may terminate your account at any time by contacting support',
                'Data will be retained for 30 days after termination unless requested otherwise',
                'We reserve the right to suspend service for security reasons',
                'Refunds for remaining subscription periods will be prorated',
                'Termination does not affect data ownership rights'
            ]
        },
        {
            icon: Clipboard,
            title: 'Limitation of Liability',
            items: [
                'PHARMIENTA is provided "as is" without warranties of any kind',
                'We are not liable for data loss, system failures, or business interruptions',
                'Users are responsible for maintaining regular backups',
                'We recommend having a secondary backup system in place',
                'Liability is limited to the amount paid for the service',
                'We are not liable for any indirect, incidental, or consequential damages'
            ]
        }
    ];

    const keyFeatures = [
        { icon: Smartphone, label: 'Mobile Access', description: 'Available on all devices with responsive design' },
        { icon: Clock, label: '24/7 Availability', description: 'Offline mode ensures continuous operation' },
        { icon: Globe, label: 'Multi-Branch Support', description: 'Manage multiple pharmacy locations from one platform' },
        { icon: Building2, label: 'Enterprise Ready', description: 'Scalable solutions for growing pharmacy chains' },
        { icon: CreditCard, label: 'Flexible Billing', description: 'Monthly or annual subscription options available' },
        { icon: Users, label: 'Staff Training', description: 'Comprehensive training and onboarding support' },
    ];

    const complianceItems = [
        { icon: BadgeCheck, label: 'Kenyan Data Protection Act (2019)', description: 'Compliant with local data protection regulations' },
        { icon: Scale, label: 'Pharmacy & Poisons Board', description: 'Aligns with pharmaceutical regulatory requirements' },
        { icon: Globe, label: 'GDPR Standards', description: 'European data protection standards for international operations' },
        { icon: Shield, label: 'ISO 27001', description: 'Information security management standards' },
        { icon: Clock, label: 'Data Retention', description: '7-year retention policy for regulatory compliance' },
        { icon: FileCheck, label: 'Audit Ready', description: 'Comprehensive audit trails for all transactions' },
    ];

    return (
        <div className={`max-w-5xl mx-auto p-4 sm:p-6 pt-16 sm:pt-20 ${isDark ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-[#2ea043]/10">
                    <FileCheck className="w-8 h-8 text-[#2ea043]" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        Terms & Conditions
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20">
                            v2.0
                        </span>
                    </h1>
                    <p className={`text-sm ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'} flex items-center gap-2`}>
                        <Calendar className="w-4 h-4" />
                        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        <span className="w-1 h-1 rounded-full bg-[#2ea043]"></span>
                        <span className="text-[#2ea043]">Effective immediately</span>
                    </p>
                </div>
            </div>

            {/* Quick Overview */}
            <div className={`p-5 rounded-xl mb-6 border ${isDark ? 'bg-[#161b22] border-[#30363d]' : 'bg-[#f6f8fa] border-[#d0d7de]'}`}>
                <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-5 h-5 text-[#2ea043]" />
                    <h2 className="text-lg font-semibold">Terms at a Glance</h2>
                </div>
                <p className="text-sm leading-relaxed">
                    Welcome to PHARMIENTA Pro. By using our pharmacy management platform, you agree to these terms
                    and conditions which govern your use of the application. We've designed these terms to be clear,
                    fair, and in compliance with Kenyan law while protecting both your pharmacy's data and our intellectual property.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#30363d]/30">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#2ea043]" />
                        <span className="text-xs">Fair & Transparent</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#2ea043]" />
                        <span className="text-xs">Data Ownership</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#2ea043]" />
                        <span className="text-xs">Secure & Compliant</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#2ea043]" />
                        <span className="text-xs">Regular Updates</span>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Dynamic Sections */}
                {sections.map((section, idx) => (
                    <section key={idx}>
                        <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                            <section.icon className="w-5 h-5 text-[#2ea043]" />
                            {section.title}
                            <span className={`text-xs font-normal px-2 py-0.5 rounded ${isDark ? 'bg-[#21262d] text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'}`}>
                                {section.items.length} items
                            </span>
                        </h2>
                        <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                            <ul className="space-y-2 text-sm">
                                {section.items.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-[#2ea043] mt-0.5">•</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>
                ))}

                {/* Key Features */}
                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <Award className="w-5 h-5 text-[#2ea043]" />
                        Platform Features & Benefits
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {keyFeatures.map((feature, idx) => (
                            <div key={idx} className={`p-3 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                                <div className="flex items-start gap-2">
                                    <feature.icon className="w-5 h-5 text-[#2ea043] flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold">{feature.label}</p>
                                        <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Compliance */}
                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <BadgeCheck className="w-5 h-5 text-[#2ea043]" />
                        Regulatory Compliance
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {complianceItems.map((item, idx) => (
                            <div key={idx} className={`p-3 rounded-lg flex items-start gap-2 ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                                <item.icon className="w-5 h-5 text-[#2ea043] flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold">{item.label}</p>
                                    <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Governing Law */}
                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <Gavel className="w-5 h-5 text-[#2ea043]" />
                        Governing Law & Dispute Resolution
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="font-semibold mb-1">Jurisdiction</p>
                                <p className={`text-sm ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                                    These terms are governed by the laws of Kenya. Any disputes shall be resolved in
                                    the courts of Nairobi, Kenya.
                                </p>
                            </div>
                            <div>
                                <p className="font-semibold mb-1">Dispute Resolution</p>
                                <p className={`text-sm ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                                    Parties agree to attempt informal resolution before legal proceedings.
                                    Arbitration may be used for complex disputes.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contact */}
                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <MessageSquare className="w-5 h-5 text-[#2ea043]" />
                        Contact Information
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <p className="text-sm mb-3">
                            For questions about these terms, legal matters, or to report violations, please contact:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="space-y-2">
                                <p className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>pharmienta@gmail.com</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>+254 704 473 503</span>
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>Nairobi, Kenya</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>PHARMIENTA KENYA</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <div className={`pt-4 border-t ${isDark ? 'border-[#30363d]' : 'border-[#d0d7de]'} text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Lock className="w-3 h-3" />
                            <span>Legal Agreement • Last reviewed: {new Date().toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span>© {new Date().getFullYear()} PHARMIENTA KENYA</span>
                            <span>|</span>
                            <span className="flex items-center gap-1">
                                <RefreshCw className="w-3 h-3" />
                                <span>Subject to change</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};