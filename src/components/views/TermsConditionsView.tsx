import React from 'react';
import { FileCheck, Scale, AlertCircle, CheckCircle, Shield, FileText } from 'lucide-react';

interface TermsConditionsViewProps {
    theme: 'dark' | 'light';
}

export const TermsConditionsView: React.FC<TermsConditionsViewProps> = ({ theme }) => {
    const isDark = theme === 'dark';

    return (
        <div className={`max-w-4xl mx-auto p-4 sm:p-6 ${isDark ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>
            <div className="flex items-center gap-3 mb-6">
                <FileCheck className="w-8 h-8 text-[#2ea043]" />
                <h1 className="text-2xl font-bold">Terms & Conditions</h1>
            </div>

            <div className="space-y-6">
                <p className="text-sm opacity-80">
                    Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>

                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <FileText className="w-5 h-5 text-[#2ea043]" />
                        Acceptance of Terms
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <p className="text-sm">
                            By using PHARMIENTA Pro, you agree to these Terms & Conditions. If you do not agree, please do not use the application.
                            These terms apply to all users, including pharmacy owners, staff, and administrators.
                        </p>
                    </div>
                </section>

                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <Scale className="w-5 h-5 text-[#2ea043]" />
                        User Responsibilities
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>Maintain the confidentiality of your account credentials and PIN codes</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>Ensure all pharmacy data entered is accurate and up-to-date</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>Comply with all applicable laws and regulations for pharmaceutical products</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>Report any security vulnerabilities or unauthorized access immediately</span>
                            </li>
                        </ul>
                    </div>
                </section>

                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <Shield className="w-5 h-5 text-[#2ea043]" />
                        License & Access
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>PHARMIENTA Pro is licensed per pharmacy location</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>Access is granted to pharmacy staff based on role permissions</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>You may not share your account credentials with non-staff members</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>We reserve the right to suspend or terminate access for violations</span>
                            </li>
                        </ul>
                    </div>
                </section>

                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <CheckCircle className="w-5 h-5 text-[#2ea043]" />
                        Data Ownership & Confidentiality
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>All pharmacy data is owned by the pharmacy entity</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>Customer information must be handled with strict confidentiality</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>PHARMIENTA does not share your data with third parties without consent</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>You may export and backup your data at any time</span>
                            </li>
                        </ul>
                    </div>
                </section>

                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <AlertCircle className="w-5 h-5 text-[#2ea043]" />
                        Disclaimer & Liability
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>PHARMIENTA Pro is provided "as is" without warranties of any kind</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>We are not liable for data loss, system failures, or business interruptions</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>Users are responsible for maintaining regular backups</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>We recommend having a secondary backup system in place</span>
                            </li>
                        </ul>
                    </div>
                </section>
            </div>
        </div>
    );
};