// src/components/RestrictedAccountView.tsx
// ============================================================
// RESTRICTED ACCOUNT VIEW
// ============================================================
// Full-screen takeover shown when a restricted account is
// detected. Displays the restriction notice, contact info,
// and links to the Terms & Conditions and Privacy Policy.
// ============================================================

import React from 'react';
import {
    RESTRICTION_TITLE,
    RESTRICTION_MESSAGE,
    RESTRICTION_CONTACT_PHONE,
} from '../lib/datasecurity/accountRestriction';

interface RestrictedAccountViewProps {
    theme: 'light' | 'dark';
    onSignOut?: () => void;
    /** Opens the Terms & Conditions screen */
    onOpenTerms?: () => void;
    /** Opens the Privacy Policy screen */
    onOpenPrivacy?: () => void;
}

export const RestrictedAccountView: React.FC<RestrictedAccountViewProps> = ({
    theme,
    onSignOut,
    onOpenTerms,
    onOpenPrivacy,
}) => {
    const isDark = theme === 'dark';

    // Render the message with **bold** markers converted to <strong>
    const renderMessage = () => {
        const lines = RESTRICTION_MESSAGE.split('\n');
        return lines.map((line, idx) => {
            const parts = line.split(/(\*\*[^*]+\*\*)/g);
            return (
                <p key={idx} className="mb-3 last:mb-0">
                    {parts.map((part, i) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return (
                                <strong key={i} className="font-semibold">
                                    {part.slice(2, -2)}
                                </strong>
                            );
                        }
                        return <span key={i}>{part}</span>;
                    })}
                </p>
            );
        });
    };

    return (
        <div
            className={`h-screen flex flex-col font-sans antialiased transition-colors duration-200 ${isDark ? 'bg-[#0d1117] text-[#c9d1d9]' : 'bg-[#f6f8fa] text-[#1f2328]'
                }`}
        >
            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                <div
                    className={`w-full max-w-lg rounded-2xl border-2 shadow-2xl p-6 sm:p-8 my-auto ${isDark
                        ? 'bg-[#161b22] border-[#30363d]'
                        : 'bg-white border-[#d0d7de]'
                        }`}
                >
                    {/* Warning icon */}
                    <div className="flex justify-center mb-5">
                        <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <svg
                                className="w-9 h-9 text-amber-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                                />
                            </svg>
                        </div>
                    </div>

                    {/* Title */}
                    <h1
                        className={`text-center text-xl sm:text-2xl font-bold mb-5 ${isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]'
                            }`}
                    >
                        {RESTRICTION_TITLE}
                    </h1>

                    {/* Message body */}
                    <div
                        className={`text-sm sm:text-base leading-relaxed mb-6 ${isDark ? 'text-[#c9d1d9]' : 'text-[#1f2328]'
                            }`}
                    >
                        {renderMessage()}
                    </div>

                    {/* Contact card */}
                    <div
                        className={`rounded-xl border p-4 mb-6 ${isDark
                            ? 'bg-[#0d1117] border-[#30363d]'
                            : 'bg-[#f6f8fa] border-[#d0d7de]'
                            }`}
                    >
                        <p className="text-xs uppercase tracking-wide font-semibold opacity-60 mb-1">
                            Administrator Contact
                        </p>
                        <a
                            href={`tel:${RESTRICTION_CONTACT_PHONE}`}
                            className="text-lg sm:text-xl font-bold text-emerald-600 hover:text-emerald-500 transition-colors"
                        >
                            {RESTRICTION_CONTACT_PHONE}
                        </a>
                    </div>

                    {/* ============================================
                        POLICY LINKS — Terms & Conditions / Privacy
                       ============================================ */}
                    {(onOpenTerms || onOpenPrivacy) && (
                        <div className="mb-6">
                            <p className="text-xs uppercase tracking-wide font-semibold opacity-60 mb-2">
                                Review our policies
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {onOpenTerms && (
                                    <button
                                        onClick={onOpenTerms}
                                        className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 ${isDark
                                            ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d] border border-[#30363d]'
                                            : 'bg-white text-[#1f2328] hover:bg-[#f6f8fa] border border-[#d0d7de]'
                                            }`}
                                    >
                                        <svg
                                            className="w-4 h-4 text-[#2ea043]"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                        Terms &amp; Conditions
                                    </button>
                                )}
                                {onOpenPrivacy && (
                                    <button
                                        onClick={onOpenPrivacy}
                                        className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 ${isDark
                                            ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d] border border-[#30363d]'
                                            : 'bg-white text-[#1f2328] hover:bg-[#f6f8fa] border border-[#d0d7de]'
                                            }`}
                                    >
                                        <svg
                                            className="w-4 h-4 text-[#2ea043]"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                            />
                                        </svg>
                                        Privacy Policy
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Sign out button */}
                    {onSignOut && (
                        <button
                            onClick={onSignOut}
                            className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 ${isDark
                                ? 'bg-[#30363d] text-[#c9d1d9] hover:bg-[#484f58]'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Sign Out
                        </button>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div
                className={`text-center text-xs py-3 opacity-50 ${isDark ? 'text-[#c9d1d9]' : 'text-[#1f2328]'
                    }`}
            >
                Pharmienta &middot; Account Restriction Notice
            </div>
        </div>
    );
};

export default RestrictedAccountView;