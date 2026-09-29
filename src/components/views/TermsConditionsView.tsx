// src/components/views/TermsConditionsView.tsx
import React from 'react';
import {
    FileCheck, AlertCircle, CheckCircle, Shield, FileText,
    Users, Lock, Clock, Globe, Smartphone, Database,
    AlertTriangle, Fingerprint, Server, RefreshCw,
    BookOpen, UserCheck, Building2, CreditCard,
    MessageSquare, Mail, Phone, MapPin, Calendar,
    Download, Link, Key, Award, Star, BadgeCheck,
    Gavel, Scale, Clipboard, ClipboardList, Bell,
    ShoppingBag, Package, Truck, Store,
    Brain, LineChart, PieChart,
} from 'lucide-react';

// Core Terms content
import {
    TERMS_VERSION,
    TERMS_EFFECTIVE_DATE,
    TERMS_LAST_UPDATED,
    CONTACT,
    DEFINITIONS,
    ACCEPTANCE,
    ACCOUNT_CREATION,
    ACCOUNT_SECURITY,
    CUSTOMER_RESPONSIBILITIES,
    PHARMIENTA_RESPONSIBILITIES,
    ACCEPTABLE_USE,
    PAYMENTS,
    SERVICE_AVAILABILITY,
    INTELLECTUAL_PROPERTY,
    THIRD_PARTY,
    SUSPENSION,
    TERMINATION,
    DATA_HANDLING,
    DISPUTE_RESOLUTION,
    LIABILITY,
    CHANGES_TO_TERMS,
    GOVERNING_LAW,
    LEGAL_REVIEW_FLAGS,
    RETENTION_SCHEDULE,
} from '../../lib/datasecurity/termsContent';

// Additional policy documents rendered inside the Terms page
import { PolicyView } from './PolicyView';
import { paymentPolicy } from '../../lib/datasecurity/paymentPolicyContent';
import { dataProtectionPolicy } from '../../lib/datasecurity/dataProtectionPolicyContent';
import { dataRetentionPolicy } from '../../lib/datasecurity/dataRetentionPolicyContent';
import { acceptableUsePolicy } from '../../lib/datasecurity/acceptableUsePolicyContent';
import { suspensionTerminationPolicy } from '../../lib/datasecurity/suspensionTerminationPolicyContent';
import { disputeComplaintsPolicy } from '../../lib/datasecurity/disputeComplaintsPolicyContent';
import { administratorPolicy } from '../../lib/datasecurity/administratorPolicyContent';
import { accountClosurePolicy } from '../../lib/datasecurity/accountClosurePolicyContent';

interface TermsConditionsViewProps {
    theme: 'dark' | 'light';
    onBack?: () => void;
}

export const TermsConditionsView: React.FC<TermsConditionsViewProps> = ({ theme, onBack }) => {
    const isDark = theme === 'dark';

    // ---- Section builder ----
    const renderSection = (
        icon: React.ComponentType<{ className?: string }>,
        title: string,
        items: string[],
        opts?: { isList?: boolean }
    ) => {
        const Icon = icon;
        return (
            <section key={title} className="scroll-mt-24">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                    <Icon className="w-5 h-5 text-[#2ea043]" />
                    {title}
                </h2>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                    <ul className="space-y-2 text-sm">
                        {items.map((item, i) => {
                            const isSub = item.startsWith('  •') || item.startsWith('  -');
                            const text = isSub ? item.replace(/^\s+[•-]\s*/, '') : item;
                            return (
                                <li key={i} className={`flex items-start gap-2 ${isSub ? 'ml-5' : ''}`}>
                                    <span className="text-[#2ea043] mt-0.5">{isSub ? '◦' : '•'}</span>
                                    <span>
                                        {text.split(/(\[LEGAL REVIEW[^\]]*\])/g).map((part, j) =>
                                            part.startsWith('[LEGAL REVIEW') ? (
                                                <span
                                                    key={j}
                                                    className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-500"
                                                >
                                                    {part}
                                                </span>
                                            ) : (
                                                <span key={j}>{part}</span>
                                            )
                                        )}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </section>
        );
    };

    // ============================================================
    // ADDITIONAL POLICY DOCUMENTS
    // Rendered as embedded PolicyView blocks inside the Terms page.
    // ============================================================
    const embeddedPolicies = [
        paymentPolicy,
        dataProtectionPolicy,
        dataRetentionPolicy,
        acceptableUsePolicy,
        suspensionTerminationPolicy,
        disputeComplaintsPolicy,
        administratorPolicy,
        accountClosurePolicy,
    ];

    return (
        <div className={`max-w-5xl mx-auto p-4 sm:p-6 pt-16 sm:pt-20 pb-24 sm:pb-32 ${isDark ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>
            {/* Back */}
            <button
                onClick={onBack}
                aria-label="Go back"
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-[#c9d1d9]' : 'hover:bg-black/5 text-[#1f2328]'
                    }`}
            >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-[#2ea043]/10">
                    <FileCheck className="w-8 h-8 text-[#2ea043]" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Terms &amp; Conditions</h1>
                    <p className={`text-sm ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'} flex flex-wrap items-center gap-2`}>
                        <Calendar className="w-4 h-4" />
                        Version {TERMS_VERSION} · Effective {TERMS_EFFECTIVE_DATE} · Updated {TERMS_LAST_UPDATED}
                        <span className="w-1 h-1 rounded-full bg-[#2ea043]"></span>
                        <span className="text-[#f0883e]">Governing Law: {CONTACT.jurisdiction}</span>
                    </p>
                </div>
            </div>

            {/* LEGAL REVIEW BANNER */}
            <div
                className={`p-4 rounded-xl mb-6 border-2 ${isDark
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                    : 'bg-amber-50 border-amber-400 text-amber-900'
                    }`}
            >
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
                    <div className="text-sm">
                        <p className="font-bold mb-1">Draft policy framework — legal review required</p>
                        <p className="leading-relaxed">
                            This document sets out Pharmienta's intended Terms &amp; Conditions and integrated policies. Sections marked
                            <span className="mx-1 inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-500">
                                [LEGAL REVIEW]
                            </span>
                            must be reviewed by a qualified Kenyan advocate and, where applicable, a data-protection
                            professional before being relied upon for enforcement. Nothing in this document should be
                            read as a waiver of any rights that cannot be waived under Kenyan law.
                        </p>
                    </div>
                </div>
            </div>

            {/* Terms at a Glance */}
            <div className={`p-5 rounded-xl mb-6 ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-5 h-5 text-[#2ea043]" />
                    <h2 className="text-lg font-semibold">Terms at a Glance</h2>
                </div>
                <p className="text-sm leading-relaxed">
                    Pharmienta is a pharmacy-management service. These Terms explain the agreement between
                    Pharmienta and the pharmacy that uses the Service. They cover who may use the Service,
                    what each side is responsible for, how payments and suspensions work, how data is
                    handled, and how disputes are resolved. They apply consistently to every Pharmienta
                    customer in Kenya and are read alongside the integrated policies below: Payment &amp;
                    Subscription, Data Protection, Data Retention &amp; Disposal, Acceptable Use, Suspension
                    &amp; Termination, Dispute &amp; Complaints, Administrator, and Account Closure.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#30363d]/30">
                    {[
                        'Fair & Transparent',
                        'Customer Owns Data',
                        'Secure & Compliant',
                        'Kenyan Law',
                    ].map((t) => (
                        <div key={t} className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-[#2ea043]" />
                            <span className="text-xs">{t}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-6">
                {/* 1. Definitions */}
                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <BookOpen className="w-5 h-5 text-[#2ea043]" />
                        1. Definitions
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <dl className="space-y-2 text-sm">
                            {DEFINITIONS.map((d) => (
                                <div key={d.term} className="flex flex-col sm:flex-row sm:gap-2">
                                    <dt className="font-semibold sm:w-64 flex-shrink-0">{d.term}</dt>
                                    <dd className={isDark ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}>{d.meaning}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>

                {/* 2. Acceptance */}
                {renderSection(FileCheck, '2. Acceptance of Terms & Eligibility', ACCEPTANCE)}

                {/* 3. Account creation */}
                {renderSection(Users, '3. Account Creation & Authorised Users', ACCOUNT_CREATION)}

                {/* 4. Account security */}
                {renderSection(Lock, '4. Account Security', ACCOUNT_SECURITY)}

                {/* 5. Customer responsibilities */}
                {renderSection(UserCheck, '5. Customer / Pharmacy Responsibilities', CUSTOMER_RESPONSIBILITIES)}

                {/* 6. Pharmienta responsibilities */}
                {renderSection(Shield, '6. Pharmienta Responsibilities', PHARMIENTA_RESPONSIBILITIES)}

                {/* 7. Acceptable use */}
                {renderSection(AlertTriangle, '7. Acceptable Use', ACCEPTABLE_USE)}

                {/* 8. Payments & subscriptions */}
                {renderSection(CreditCard, '8. Payments & Subscriptions', PAYMENTS)}

                {/* 9. Service availability */}
                {renderSection(Server, '9. Service Availability & Limitations', SERVICE_AVAILABILITY)}

                {/* 10. IP */}
                {renderSection(Fingerprint, '10. Intellectual Property', INTELLECTUAL_PROPERTY)}

                {/* 11. Third parties */}
                {renderSection(Globe, '11. Third-Party Services', THIRD_PARTY)}

                {/* 12. Suspension */}
                {renderSection(AlertCircle, '12. Account Suspension', SUSPENSION)}

                {/* 13. Termination */}
                {renderSection(FileText, '13. Account Termination', TERMINATION)}

                {/* 14. Data handling */}
                {renderSection(Database, '14. Data Handling & Ownership', DATA_HANDLING)}

                {/* 14b. Retention Schedule table */}
                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <Clock className="w-5 h-5 text-[#2ea043]" />
                        14b. Retention Schedule (per data type)
                    </h2>
                    <div className={`p-4 rounded-lg overflow-x-auto ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <table className="w-full text-xs sm:text-sm border-collapse">
                            <thead>
                                <tr className={isDark ? 'bg-[#21262d]' : 'bg-[#eaeef2]'}>
                                    {RETENTION_SCHEDULE.headers.map((h, i) => (
                                        <th
                                            key={i}
                                            className={`text-left p-2 font-semibold border-b ${isDark ? 'border-[#30363d]' : 'border-[#d0d7de]'
                                                }`}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {RETENTION_SCHEDULE.rows.map((row, i) => (
                                    <tr
                                        key={i}
                                        className={isDark ? 'border-b border-[#30363d]' : 'border-b border-[#d0d7de]'}
                                    >
                                        {row.map((cell, j) => (
                                            <td key={j} className="p-2 align-top">
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 15. Dispute resolution */}
                {renderSection(Gavel, '15. Dispute Resolution', DISPUTE_RESOLUTION)}

                {/* 16. Liability */}
                {renderSection(Scale, '16. Limitation of Liability', LIABILITY)}

                {/* 17. Changes */}
                {renderSection(RefreshCw, '17. Changes to These Terms', CHANGES_TO_TERMS)}

                {/* 18. Governing law */}
                {renderSection(Scale, '18. Governing Law & Jurisdiction', GOVERNING_LAW)}

                {/* 19. Contact */}
                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <MessageSquare className="w-5 h-5 text-[#2ea043]" />
                        19. Contact Information
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <p className="text-sm mb-3">
                            For questions about these Terms, legal notices, billing queries, data-protection
                            requests, or complaints, please contact:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="space-y-2">
                                <p className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>{CONTACT.email}</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>{CONTACT.phone}</span>
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>{CONTACT.address}</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>{CONTACT.companyName}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ============================================================
                    EMBEDDED POLICY DOCUMENTS
                    Each is rendered by PolicyView. Placed after the core Terms
                    so they read as "annexes" to the main agreement.
                   ============================================================ */}
                <section className="pt-6 border-t-2 border-dashed border-[#30363d]/40">
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                        <FileText className="w-6 h-6 text-[#2ea043]" />
                        Integrated Policies
                    </h2>
                    <p className={`text-sm mb-6 ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                        The following policies form part of these Terms &amp; Conditions and apply to every Pharmienta customer.
                    </p>

                    {embeddedPolicies.map((doc) => (
                        <div key={doc.slug} className="mb-10">
                            <PolicyView doc={doc} theme={theme} />
                        </div>
                    ))}
                </section>

                {/* Legal review flags */}
                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Items Flagged for Kenyan Legal / Privacy Review
                    </h2>
                    <div className={`p-4 rounded-lg border-2 ${isDark ? 'bg-amber-500/5 border-amber-500/30' : 'bg-amber-50 border-amber-300'}`}>
                        <ul className="space-y-2 text-sm">
                            {LEGAL_REVIEW_FLAGS.map((flag, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-amber-500 mt-0.5">⚠</span>
                                    <span>{flag}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* Footer */}
                <div className={`pt-4 border-t ${isDark ? 'border-[#30363d]' : 'border-[#d0d7de]'} text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Lock className="w-3 h-3" />
                            <span>Legal Agreement · {CONTACT.jurisdiction} · Version {TERMS_VERSION}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span>© {new Date().getFullYear()} {CONTACT.companyName}</span>
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

export default TermsConditionsView;