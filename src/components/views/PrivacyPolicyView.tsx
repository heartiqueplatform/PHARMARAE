import React from 'react';
import {
    Shield, Lock, Eye, Database, Users, Mail,
    FileCheck, Server, Globe, Clock, UserCheck,
    Key, AlertCircle, FileText, Share2, Trash2,
    Phone, MapPin, Calendar, CheckCircle, AlertTriangle,
    Cookie, Activity, Fingerprint, MessageSquare,
    Building2, CreditCard, ClipboardList, BadgeCheck,
    RefreshCw, Link, Code, Wifi, Download,
    Brain, LineChart, PieChart, Target, TrendingUp
} from 'lucide-react';

interface PrivacyPolicyViewProps {
    theme: 'dark' | 'light';
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ theme }) => {
    const isDark = theme === 'dark';

    const sections = [
        {
            icon: Eye,
            title: 'Information We Collect',
            items: [
                { label: 'Pharmacy Information', description: 'Pharmacy name, trading name, address, phone, email, county, town, and licensing details as required by Kenyan regulations' },
                { label: 'User Data', description: 'Name, email, phone number, role, PIN code, and activity logs for staff members in Kenyan pharmacies' },
                { label: 'Transaction Data', description: 'Sales records, inventory movements, customer purchases, and payment histories including M-Pesa transactions' },
                { label: 'Product Information', description: 'Stock levels, batch numbers, expiry dates, pricing, and supplier information for Kenyan pharmaceutical products' },
                { label: 'Customer Data', description: 'Patient names, contact details, prescription history, and purchase patterns for healthcare delivery in Kenya' },
                { label: 'Device Information', description: 'Device type, operating system, browser version, and IP addresses for analytics and security monitoring' },
                { label: 'Business Intelligence Data', description: 'Anonymized sales trends, product performance metrics, and operational insights for pharmacy optimization' },
            ]
        },
        {
            icon: Lock,
            title: 'How We Use Your Information',
            items: [
                { label: 'Core Operations', description: 'Process sales, manage inventory, and generate receipts for customers in Kenyan pharmacies' },
                { label: 'Analytics & Reporting', description: 'Generate insights on sales trends, inventory turnover, staff performance, and business intelligence dashboards' },
                { label: 'Access Management', description: 'Manage staff permissions, role-based access, and security controls for Kenyan pharmacy hierarchy' },
                { label: 'Customer Service', description: 'Provide transaction history, prescription records, and customer support in English and Swahili' },
                { label: 'Compliance', description: 'Maintain regulatory compliance with KRA eTIMS, Kenyan Data Protection Act, and pharmacy board requirements' },
                { label: 'System Optimization', description: 'Improve performance, fix bugs, and enhance user experience for Kenyan pharmacy operations' },
                { label: 'Business Growth', description: 'Provide actionable insights to help pharmacies increase sales, reduce costs, and expand across Kenya' },
            ]
        },
        {
            icon: Shield,
            title: 'Data Security Measures',
            items: [
                { label: 'Encryption', description: 'All data is encrypted in transit using TLS/HTTPS and at rest using AES-256 encryption standards' },
                { label: 'Authentication', description: 'Multi-factor authentication and secure password policies compliant with Kenyan security standards' },
                { label: 'Access Control', description: 'Role-based access with granular permissions and audit trails for all Kenyan pharmacy staff' },
                { label: 'Monitoring', description: '24/7 security monitoring and intrusion detection systems hosted in Kenya' },
                { label: 'Backup & Recovery', description: 'Automated daily backups with point-in-time recovery capabilities for business continuity' },
                { label: 'Compliance Audits', description: 'Regular security audits and penetration testing by Kenyan cybersecurity experts' },
            ]
        },
        {
            icon: Database,
            title: 'Data Storage & Processing',
            items: [
                { label: 'Local Storage', description: 'Data stored locally using IndexedDB for offline access and fast retrieval in areas with poor connectivity' },
                { label: 'Cloud Storage', description: 'Secure cloud synchronization with Supabase for backup and multi-device access across Kenya' },
                { label: 'Data Retention', description: 'Data retained for 7 years to comply with Kenyan pharmacy regulations and KRA requirements' },
                { label: 'Data Processing', description: 'Processed in compliance with Kenyan Data Protection Act (2019) and healthcare data standards' },
                { label: 'Third-Party Services', description: 'Integration with Kenyan payment processors (M-Pesa) and analytics services' },
                { label: 'Data Portability', description: 'Easy export of data in CSV, PDF, and JSON formats for Kenyan regulatory reporting' },
            ]
        },
        {
            icon: Users,
            title: 'Data Subject Rights',
            items: [
                { label: 'Right to Access', description: 'Access all personal data held about you at any time as per Kenyan Data Protection Act' },
                { label: 'Right to Rectification', description: 'Request corrections to inaccurate or incomplete data under Kenyan law' },
                { label: 'Right to Erasure', description: 'Request deletion of your data under certain circumstances as per Kenyan regulations' },
                { label: 'Right to Restriction', description: 'Restrict processing of your data under certain conditions in compliance with Kenyan law' },
                { label: 'Right to Data Portability', description: 'Receive your data in a structured, machine-readable format for Kenyan reporting' },
                { label: 'Right to Object', description: 'Object to data processing for marketing or non-essential purposes under Kenyan law' },
            ]
        },
        {
            icon: Cookie,
            title: 'Cookies & Tracking',
            items: [
                { label: 'Essential Cookies', description: 'Required for basic functionality and authentication in the Kenyan pharmacy environment' },
                { label: 'Analytics Cookies', description: 'Help us understand how Kenyan pharmacies interact with the platform' },
                { label: 'Preferences Cookies', description: 'Remember user preferences and settings for Kenyan pharmacy workflows' },
                { label: 'Security Cookies', description: 'Maintain session security and prevent fraud in Kenyan pharmacy operations' },
                { label: 'Third-Party Cookies', description: 'Used for payment processing (M-Pesa) and analytics services' },
                { label: 'Cookie Consent', description: 'Users can manage cookie preferences at any time in compliance with Kenyan law' },
            ]
        }
    ];

    const complianceItems = [
        { icon: BadgeCheck, label: 'Kenyan Data Protection Act (2019)', description: 'Fully compliant with Kenya\'s data protection regulations' },
        { icon: Globe, label: 'GDPR Standards', description: 'European data protection standards for international operations' },
        { icon: FileCheck, label: 'KRA eTIMS Compliance', description: 'Ready for Kenyan tax invoice management system integration' },
        { icon: Shield, label: 'Kenya Pharmacy Board', description: 'Meets pharmacy board data handling requirements' },
        { icon: Clock, label: '7-Year Retention', description: 'Data retention policy aligned with Kenyan regulatory requirements' },
        { icon: Lock, label: 'Data Minimization', description: 'Collect only necessary data for Kenyan pharmacy operations' },
    ];

    // BI-specific privacy items
    const biPrivacyItems = [
        { icon: Brain, label: 'Anonymized Analytics', description: 'Business Intelligence insights use anonymized, aggregated data only' },
        { icon: LineChart, label: 'Trend Analysis', description: 'Revenue and sales trends are analyzed without exposing individual transactions' },
        { icon: PieChart, label: 'Payment Insights', description: 'Payment method breakdowns are aggregated for business optimization' },
        { icon: Target, label: 'Performance Metrics', description: 'KPIs are calculated using anonymized data to protect sensitive information' },
    ];

    return (
        <div className={`max-w-5xl mx-auto p-4 sm:p-6 pt-16 sm:pt-20 pb-24 sm:pb-32 ${isDark ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-[#2ea043]/10">
                    <Shield className="w-8 h-8 text-[#2ea043]" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        Privacy Policy
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20">
                            v2.0
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#2ea043]/20 text-[#2ea043] border border-[#2ea043]/30">
                            🇰🇪 Kenya
                        </span>
                    </h1>
                    <p className={`text-sm ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'} flex items-center gap-2`}>
                        <Clock className="w-4 h-4" />
                        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        <span className="w-1 h-1 rounded-full bg-[#2ea043]"></span>
                        <span className="text-[#2ea043]">Effective immediately</span>
                        <span className="w-1 h-1 rounded-full bg-[#2ea043]"></span>
                        <span className="text-[#f0883e]">Compliant with Kenyan Law</span>
                    </p>
                </div>
            </div>

            {/* Quick Overview */}
            <div className={`p-5 rounded-xl mb-6 border ${isDark ? 'bg-[#161b22] border-[#30363d]' : 'bg-[#f6f8fa] border-[#d0d7de]'}`}>
                <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-[#2ea043]" />
                    <h2 className="text-lg font-semibold">Privacy at a Glance</h2>
                </div>
                <p className="text-sm leading-relaxed">
                    Pharmienta Pro is committed to protecting your privacy and ensuring the security of your data
                    in compliance with the Kenyan Data Protection Act (2019). We collect only the information necessary
                    to provide our pharmacy management services to pharmacies across all 47 counties. Your data is stored
                    securely, encrypted, and never shared with third parties without your explicit consent.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#30363d]/30">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#2ea043]" />
                        <span className="text-xs">Secure Encryption</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#2ea043]" />
                        <span className="text-xs">Offline-First</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#2ea043]" />
                        <span className="text-xs">Kenya DPA Compliant</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#2ea043]" />
                        <span className="text-xs">24/7 Monitoring</span>
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
                                        <div>
                                            <span className="font-semibold">{item.label}:</span>
                                            <span className="ml-1 opacity-80">{item.description}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>
                ))}

                {/* Business Intelligence Privacy Section - NEW */}
                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <Brain className="w-5 h-5 text-[#2ea043]" />
                        Business Intelligence & Privacy
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#2ea043]/20 text-[#2ea043] border border-[#2ea043]/30">
                            NEW
                        </span>
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <p className="text-sm mb-3">
                            Our Business Intelligence dashboard provides powerful insights while maintaining strict privacy standards:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {biPrivacyItems.map((item, idx) => (
                                <div key={idx} className={`p-3 rounded-lg ${isDark ? 'bg-[#0d1117]' : 'bg-white'}`}>
                                    <div className="flex items-center gap-2">
                                        <item.icon className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                        <p className="text-xs font-semibold">{item.label}</p>
                                    </div>
                                    <p className={`text-[10px] ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'} mt-1`}>
                                        {item.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className={`mt-3 pt-3 border-t ${isDark ? 'border-[#30363d]' : 'border-[#d0d7de]'} text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                            <span>All BI data is anonymized and aggregated. Individual transactions are never exposed.</span>
                        </div>
                    </div>
                </section>

                {/* Compliance Section */}
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

                {/* Data Processing Agreement */}
                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <FileText className="w-5 h-5 text-[#2ea043]" />
                        Data Processing Agreement
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-start gap-2">
                                <Server className="w-4 h-4 text-[#2ea043] mt-0.5" />
                                <div>
                                    <p className="font-semibold">Data Processor</p>
                                    <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                                        Pharmienta Kenya acts as data processor
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Building2 className="w-4 h-4 text-[#2ea043] mt-0.5" />
                                <div>
                                    <p className="font-semibold">Data Controller</p>
                                    <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                                        Kenyan pharmacy owners are data controllers
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Key className="w-4 h-4 text-[#2ea043] mt-0.5" />
                                <div>
                                    <p className="font-semibold">Data Sub-processors</p>
                                    <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                                        Supabase, M-Pesa, Stripe, and analytics providers
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contact Information */}
                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <MessageSquare className="w-5 h-5 text-[#2ea043]" />
                        Privacy Inquiries
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <p className="text-sm mb-3">
                            For privacy-related questions, data access requests, or concerns about your data in compliance with Kenyan law,
                            please contact our Data Protection Officer:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="space-y-2">
                                <p className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>Pharmienta@gmail.com</span>
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
                                    <Clock className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>Response within 48 hours</span>
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
                            <span>Secure Connection • All data encrypted • 🇰🇪 Kenyan Data Protection Act (2019) Compliant</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span>© {new Date().getFullYear()} Pharmienta Kenya</span>
                            <span>|</span>
                            <span className="flex items-center gap-1">
                                <RefreshCw className="w-3 h-3" />
                                <span>Updated regularly</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};