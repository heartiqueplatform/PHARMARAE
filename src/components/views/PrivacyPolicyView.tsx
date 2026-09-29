// src/components/views/PrivacyPolicyView.tsx
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

import { privacyPolicy } from '../../lib/datasecurity/privacyPolicyContent';
import type { PolicySection } from '../../lib/datasecurity/policyTypes';

interface PrivacyPolicyViewProps {
    theme: 'dark' | 'light';
    onBack?: () => void;
}

// ---------------------------------------------------------
// Icon mapping — maps each content section id to an icon
// ---------------------------------------------------------
const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    'who-we-are': FileText,
    'information-we-collect': Eye,
    'how-we-use': Lock,
    'lawful-basis': FileCheck,
    'sharing': Share2,
    'transfers': Globe,
    'security': Shield,
    'retention': Clock,
    'rights': UserCheck,
    'complaints': MessageSquare,
    'breach': AlertCircle,
    'children': Users,
    'cookies': Cookie,
    'bi': Brain,
    'dpa-role': Server,
    'changes': RefreshCw,
    'contact': Mail,
};

// ---------------------------------------------------------
// Compliance / BI extras (UI-only, shown below the policy)
// ---------------------------------------------------------
const complianceItems = [
    { icon: BadgeCheck, label: 'Kenya Data Protection Act (2019)', description: 'Aligned with Kenya\'s data-protection framework' },
    { icon: FileCheck, label: 'Data Protection (General) Regulations, 2021', description: 'Regulations made under the DPA 2019' },
    { icon: Shield, label: 'Pharmacy & Poisons Board', description: 'Designed with Kenyan pharmacy-record handling in mind' },
    { icon: Clock, label: 'Retention Aligned to Law', description: 'Retention periods defined in our Data Retention & Disposal Policy' },
    { icon: Lock, label: 'Data Minimisation', description: 'Collect only what is necessary to run the Service' },
    { icon: AlertTriangle, label: 'Legal Review Required', description: 'Draft framework — pending review by a Kenyan advocate' },
];

const biPrivacyItems = [
    { icon: Brain, label: 'Anonymized Analytics', description: 'Business Intelligence insights use anonymized, aggregated data only' },
    { icon: LineChart, label: 'Trend Analysis', description: 'Revenue and sales trends are analyzed without exposing individual transactions' },
    { icon: PieChart, label: 'Payment Insights', description: 'Payment method breakdowns are aggregated for business optimization' },
    { icon: Target, label: 'Performance Metrics', description: 'KPIs are calculated using anonymized data to protect sensitive information' },
];

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ theme, onBack }) => {
    const isDark = theme === 'dark';

    // Convert content sections to the shape the UI renders
    const sections = privacyPolicy.sections.map((s: PolicySection) => {
        const items = s.labelledItems
            ? s.labelledItems.map((it) => ({ label: it.label, description: it.description }))
            : (s.items ?? []).map((t) => ({ label: '', description: t }));

        return {
            id: s.id,
            icon: SECTION_ICONS[s.id] ?? FileText,
            title: s.title,
            intro: s.intro,
            table: s.table,
            callout: s.callout,
            items,
        };
    });

    const renderText = (text: string) =>
        text.split(/(\[LEGAL REVIEW[^\]]*\])/g).map((part, j) =>
            part.startsWith('[LEGAL REVIEW') ? (
                <span
                    key={j}
                    className="inline-block mx-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-500"
                >
                    {part}
                </span>
            ) : (
                <span key={j}>{part}</span>
            )
        );

    return (
        <div className={`max-w-5xl mx-auto p-4 sm:p-6 pt-16 sm:pt-20 pb-24 sm:pb-32 ${isDark ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>

            {/* Back Arrow — icon only */}
            <button
                onClick={onBack}
                aria-label="Go back"
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-[#c9d1d9]' : 'hover:bg-black/5 text-[#1f2328]'}`}
            >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-[#2ea043]/10">
                    <Shield className="w-8 h-8 text-[#2ea043]" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        {privacyPolicy.title}
                    </h1>
                    <p className={`text-sm ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'} flex flex-wrap items-center gap-2`}>
                        <Clock className="w-4 h-4" />
                        Version {privacyPolicy.version} · Effective {privacyPolicy.effectiveDate} · Updated {privacyPolicy.lastUpdated}
                        <span className="w-1 h-1 rounded-full bg-[#2ea043]"></span>
                        <span className="text-[#f0883e]">Governing Law: Republic of Kenya</span>
                    </p>
                </div>
            </div>

            {/* Legal review banner */}
            <div className={`p-4 rounded-xl mb-6 border-2 ${isDark ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-400 text-amber-900'}`}>
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
                    <div className="text-sm">
                        <p className="font-bold mb-1">Draft policy framework — legal review required</p>
                        <p className="leading-relaxed">
                            This document is part of Pharmienta's policy framework. Sections marked
                            <span className="mx-1 inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-500">[LEGAL REVIEW]</span>
                            must be reviewed by a qualified Kenyan advocate and/or data-protection professional before being relied upon for enforcement.
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Overview */}
            <div className={`p-5 rounded-xl mb-6 border-0 ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-[#2ea043]" />
                    <h2 className="text-lg font-semibold">Privacy at a Glance</h2>
                </div>
                <p className="text-sm leading-relaxed">{privacyPolicy.summary}</p>
                <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                    For full details of our data-protection controls, retention periods, and account closure process,
                    see Sections 11–17 of our Terms &amp; Conditions.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#30363d]/30">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#2ea043]" />
                        <span className="text-xs">Encrypted in transit</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#2ea043]" />
                        <span className="text-xs">Offline-first</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#2ea043]" />
                        <span className="text-xs">Kenya DPA aligned</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#2ea043]" />
                        <span className="text-xs">No data selling</span>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Dynamic Sections */}
                {sections.map((section, idx) => (
                    <section key={section.id || idx}>
                        <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                            <section.icon className="w-5 h-5 text-[#2ea043]" />
                            {section.title}
                            {section.items.length > 0 && (
                                <span className={`text-xs font-normal px-2 py-0.5 rounded ${isDark ? 'bg-[#21262d] text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'}`}>
                                    {section.items.length} items
                                </span>
                            )}
                        </h2>
                        <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                            {section.intro && (
                                <p className="text-sm mb-3 leading-relaxed">{renderText(section.intro)}</p>
                            )}

                            {section.table && (
                                <div className="overflow-x-auto my-3">
                                    <table className="w-full text-xs sm:text-sm border-collapse">
                                        <thead>
                                            <tr className={isDark ? 'bg-[#21262d]' : 'bg-[#eaeef2]'}>
                                                {section.table.headers.map((h, i) => (
                                                    <th key={i} className={`text-left p-2 font-semibold border-b ${isDark ? 'border-[#30363d]' : 'border-[#d0d7de]'}`}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {section.table.rows.map((row, i) => (
                                                <tr key={i} className={isDark ? 'border-b border-[#30363d]' : 'border-b border-[#d0d7de]'}>
                                                    {row.map((cell, j) => (
                                                        <td key={j} className="p-2 align-top">{cell}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {section.items.length > 0 && (
                                <ul className="space-y-2 text-sm">
                                    {section.items.map((item, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-[#2ea043] mt-0.5">•</span>
                                            <div>
                                                {item.label && (
                                                    <span className="font-semibold">{item.label}:</span>
                                                )}
                                                <span className={item.label ? 'ml-1 opacity-80' : ''}>
                                                    {renderText(item.description)}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {section.callout && (
                                <div className={`mt-4 p-3 rounded-lg border-2 ${section.callout.tone === 'danger'
                                    ? (isDark ? 'bg-red-500/10 border-red-500/40' : 'bg-red-50 border-red-300')
                                    : section.callout.tone === 'warning'
                                        ? (isDark ? 'bg-amber-500/10 border-amber-500/40' : 'bg-amber-50 border-amber-400')
                                        : section.callout.tone === 'success'
                                            ? (isDark ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-emerald-50 border-emerald-300')
                                            : (isDark ? 'bg-blue-500/10 border-blue-500/40' : 'bg-blue-50 border-blue-300')
                                    }`}>
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${section.callout.tone === 'danger' ? 'text-red-500'
                                            : section.callout.tone === 'warning' ? 'text-amber-500'
                                                : section.callout.tone === 'success' ? 'text-emerald-500'
                                                    : 'text-blue-500'
                                            }`} />
                                        <div className="text-sm">
                                            <p className="font-bold mb-1">{section.callout.title}</p>
                                            <p className="leading-relaxed">{renderText(section.callout.body)}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                ))}

                {/* BI Privacy */}
                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <Brain className="w-5 h-5 text-[#2ea043]" />
                        Business Intelligence & Privacy
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

                {/* Compliance */}
                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <BadgeCheck className="w-5 h-5 text-[#2ea043]" />
                        Regulatory Alignment
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

                {/* Data Processing Roles */}
                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <FileText className="w-5 h-5 text-[#2ea043]" />
                        Data Processing Roles
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-start gap-2">
                                <Building2 className="w-4 h-4 text-[#2ea043] mt-0.5" />
                                <div>
                                    <p className="font-semibold">Controller (Customer Data)</p>
                                    <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                                        The Kenyan pharmacy that owns the account
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Server className="w-4 h-4 text-[#2ea043] mt-0.5" />
                                <div>
                                    <p className="font-semibold">Processor (Customer Data)</p>
                                    <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                                        Pharmienta, acting on the pharmacy's instructions
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Key className="w-4 h-4 text-[#2ea043] mt-0.5" />
                                <div>
                                    <p className="font-semibold">Sub-processors</p>
                                    <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                                        Cloud hosting, database, storage, email/SMS, payment providers
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className={`mt-3 pt-3 border-t ${isDark ? 'border-[#30363d]' : 'border-[#d0d7de]'} text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                            <span>A current list of processors is available on request.</span>
                        </div>
                    </div>
                </section>

                {/* Contact */}
                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <MessageSquare className="w-5 h-5 text-[#2ea043]" />
                        Privacy Inquiries
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <p className="text-sm mb-3">
                            For privacy-related questions, data-access requests, or concerns about your data, please contact our privacy team:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="space-y-2">
                                <p className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>Pharmienta@gmail.com</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>+254 717 517 371</span>
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>Nairobi, Kenya</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>We aim to respond within 48 hours</span>
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
                            <span>Legal Agreement · Republic of Kenya · Version {privacyPolicy.version}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span>© {new Date().getFullYear()} Pharmienta</span>
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

export default PrivacyPolicyView;