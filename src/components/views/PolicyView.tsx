// src/components/views/PolicyView.tsx
// ============================================================
// GENERIC POLICY VIEW
// ============================================================
// Renders any PolicyDocument (from src/lib/policyTypes.ts).
// Used by TermsConditionsView to embed additional policies.
// Also usable as a standalone page if you ever wire it up.
// ============================================================

import React from 'react';
import {
    FileText, Shield, Users, Lock, Database, Clock, CreditCard,
    AlertTriangle, Gavel, Globe, Scale, Eye, Clipboard, Server,
    Key, BookOpen, MessageSquare, Trash2, RefreshCw, Calendar,
    CheckCircle, AlertCircle, Info,
} from 'lucide-react';
import type { PolicyDocument, PolicySection } from '../../lib/datasecurity/policyTypes';

// Icon set used by section headers
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    file: FileText,
    shield: Shield,
    users: Users,
    lock: Lock,
    database: Database,
    clock: Clock,
    credit: CreditCard,
    alert: AlertTriangle,
    gavel: Gavel,
    globe: Globe,
    scale: Scale,
    eye: Eye,
    clipboard: Clipboard,
    server: Server,
    key: Key,
    book: BookOpen,
    message: MessageSquare,
    trash: Trash2,
};

const CALLOUT_TONES: Record<
    NonNullable<PolicySection['callout']>['tone'],
    { bgDark: string; bgLight: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
    info: {
        bgDark: 'bg-blue-500/10 border-blue-500/40',
        bgLight: 'bg-blue-50 border-blue-300',
        text: 'text-blue-500',
        icon: Info,
    },
    warning: {
        bgDark: 'bg-amber-500/10 border-amber-500/40',
        bgLight: 'bg-amber-50 border-amber-400',
        text: 'text-amber-500',
        icon: AlertTriangle,
    },
    danger: {
        bgDark: 'bg-red-500/10 border-red-500/40',
        bgLight: 'bg-red-50 border-red-300',
        text: 'text-red-500',
        icon: AlertCircle,
    },
    success: {
        bgDark: 'bg-emerald-500/10 border-emerald-500/40',
        bgLight: 'bg-emerald-50 border-emerald-300',
        text: 'text-emerald-500',
        icon: CheckCircle,
    },
};

interface PolicyViewProps {
    doc: PolicyDocument;
    theme: 'dark' | 'light';
    /** Optional — used only when PolicyView is rendered standalone */
    onBack?: () => void;
}

export const PolicyView: React.FC<PolicyViewProps> = ({ doc, theme, onBack }) => {
    const isDark = theme === 'dark';

    // Render text with [LEGAL REVIEW] tags highlighted
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

    const renderSection = (s: PolicySection) => {
        const Icon = ICONS[s.icon] || FileText;
        const CalloutIcon = s.callout ? CALLOUT_TONES[s.callout.tone].icon : null;
        const calloutTone = s.callout ? CALLOUT_TONES[s.callout.tone] : null;

        return (
            <section key={s.id} className="scroll-mt-24">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                    <Icon className="w-5 h-5 text-[#2ea043]" />
                    {s.title}
                </h2>

                <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                    {s.intro && (
                        <p className="text-sm mb-3 leading-relaxed">{renderText(s.intro)}</p>
                    )}

                    {s.table && (
                        <div className="overflow-x-auto my-3">
                            <table className="w-full text-xs sm:text-sm border-collapse">
                                <thead>
                                    <tr className={isDark ? 'bg-[#21262d]' : 'bg-[#eaeef2]'}>
                                        {s.table.headers.map((h, i) => (
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
                                    {s.table.rows.map((row, i) => (
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
                    )}

                    {s.items && s.items.length > 0 && (
                        <ul className="space-y-2 text-sm">
                            {s.items.map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-[#2ea043] mt-0.5">•</span>
                                    <span>{renderText(item)}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {s.labelledItems && s.labelledItems.length > 0 && (
                        <ul className="space-y-2 text-sm">
                            {s.labelledItems.map((it, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-[#2ea043] mt-0.5">•</span>
                                    <div>
                                        {it.label && (
                                            <span className="font-semibold">{it.label}: </span>
                                        )}
                                        <span className={it.label ? 'opacity-80' : ''}>
                                            {renderText(it.description)}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {s.callout && CalloutIcon && calloutTone && (
                        <div
                            className={`mt-4 p-3 rounded-lg border-2 ${isDark ? calloutTone.bgDark : calloutTone.bgLight
                                }`}
                        >
                            <div className="flex items-start gap-2">
                                <CalloutIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${calloutTone.text}`} />
                                <div className="text-sm">
                                    <p className="font-bold mb-1">{s.callout.title}</p>
                                    <p className="leading-relaxed">{renderText(s.callout.body)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        );
    };

    return (
        <div
            className={`max-w-5xl mx-auto px-0 sm:px-0 ${isDark ? 'text-[#c9d1d9]' : 'text-[#1f2328]'
                }`}
        >
            {/* Back — only rendered when PolicyView is used standalone */}
            {onBack && (
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
            )}

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-[#2ea043]/10">
                    <Shield className="w-8 h-8 text-[#2ea043]" />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">{doc.title}</h1>
                    <p
                        className={`text-xs sm:text-sm ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'
                            } flex flex-wrap items-center gap-2`}
                    >
                        <Calendar className="w-4 h-4" />
                        Version {doc.version} · Effective {doc.effectiveDate} · Updated {doc.lastUpdated}
                        <span className="w-1 h-1 rounded-full bg-[#2ea043]"></span>
                        <span className="text-[#f0883e]">Governing Law: Republic of Kenya</span>
                    </p>
                </div>
            </div>

            {/* Summary */}
            <div className={`p-5 rounded-xl mb-6 ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-5 h-5 text-[#2ea043]" />
                    <h2 className="text-lg font-semibold">Summary</h2>
                </div>
                <p className="text-sm leading-relaxed">{renderText(doc.summary)}</p>
            </div>

            <div className="space-y-6">{doc.sections.map(renderSection)}</div>

            {/* Footer */}
            <div
                className={`mt-8 pt-4 border-t ${isDark ? 'border-[#30363d]' : 'border-[#d0d7de]'
                    } text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Lock className="w-3 h-3" />
                        <span>
                            {doc.title} · Republic of Kenya · Version {doc.version}
                        </span>
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
    );
};

export default PolicyView;