import React from 'react';
import { Shield, Lock, Eye, Database, Users, Mail } from 'lucide-react';

interface PrivacyPolicyViewProps {
    theme: 'dark' | 'light';
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ theme }) => {
    const isDark = theme === 'dark';

    return (
        <div className={`max-w-4xl mx-auto p-4 sm:p-6 ${isDark ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>
            <div className="flex items-center gap-3 mb-6">
                <Shield className="w-8 h-8 text-[#2ea043]" />
                <h1 className="text-2xl font-bold">Privacy Policy</h1>
            </div>

            <div className="space-y-6">
                <p className="text-sm opacity-80">
                    Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>

                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <Eye className="w-5 h-5 text-[#2ea043]" />
                        Information We Collect
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span><strong>Pharmacy Information:</strong> Pharmacy name, trading name, address, phone, email, county, town</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span><strong>User Data:</strong> Name, email, phone number, role, PIN code for staff members</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span><strong>Transaction Data:</strong> Sales records, inventory movements, customer purchases</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span><strong>Product Information:</strong> Stock levels, batch numbers, expiry dates, pricing</span>
                            </li>
                        </ul>
                    </div>
                </section>

                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <Lock className="w-5 h-5 text-[#2ea043]" />
                        How We Use Your Information
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>Process sales and manage inventory</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>Generate reports and analytics for your pharmacy</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>Manage staff access and permissions</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>Provide customer receipts and transaction history</span>
                            </li>
                        </ul>
                    </div>
                </section>

                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <Database className="w-5 h-5 text-[#2ea043]" />
                        Data Storage & Security
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>Data is stored locally using IndexedDB for offline access</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>Cloud synchronization with Supabase for backup and multi-device access</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>All data is encrypted in transit using HTTPS</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>Access is restricted to authenticated users only</span>
                            </li>
                        </ul>
                    </div>
                </section>

                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <Users className="w-5 h-5 text-[#2ea043]" />
                        Your Rights
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>Access, modify, or delete your pharmacy data at any time</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>Export your data in various formats</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>Withdraw consent for data processing</span>
                            </li>
                        </ul>
                    </div>
                </section>

                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <Mail className="w-5 h-5 text-[#2ea043]" />
                        Contact Us
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <p className="text-sm">
                            For privacy-related questions or concerns, please contact us at:
                        </p>
                        <div className="mt-2 text-sm font-medium">
                            <p>pharmienta@gmail.com</p>
                            <p className="mt-1"> +254 704 473 503</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};