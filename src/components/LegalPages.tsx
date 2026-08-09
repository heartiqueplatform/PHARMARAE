import React from 'react';

interface LegalPagesProps {
    page: 'privacy' | 'terms' | 'about';
    onClose: () => void;
    theme: 'dark' | 'light';
}

export const LegalPages: React.FC<LegalPagesProps> = ({ page, onClose, theme }) => {
    const isDark = theme === 'dark';

    const renderContent = () => {
        switch (page) {
            case 'privacy':
                return (
                    <>
                        <h2 className="text-xl font-bold mb-4">Privacy Policy</h2>
                        <p className="text-sm text-slate-400 mb-4">Last Updated: January 2024</p>

                        <div className="space-y-4 text-sm">
                            <div>
                                <h3 className="font-bold text-base mb-2">1. Information We Collect</h3>
                                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                                    <li>Pharmacy name, address, phone number, and email</li>
                                    <li>Staff profiles and roles</li>
                                    <li>Product inventory and sales data</li>
                                    <li>Customer information (name, phone, email)</li>
                                    <li>Transaction history and payment details</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-base mb-2">2. How We Use Your Information</h3>
                                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                                    <li>To provide pharmacy management services</li>
                                    <li>To process sales and manage inventory</li>
                                    <li>To generate reports and analytics</li>
                                    <li>To ensure compliance with pharmaceutical regulations</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-base mb-2">3. Data Security</h3>
                                <p className="text-slate-300">Your data is protected using industry-standard encryption. All data is stored securely with row-level security.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-base mb-2">4. Your Rights</h3>
                                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                                    <li>Access your data at any time</li>
                                    <li>Request corrections to your data</li>
                                    <li>Request deletion of your data</li>
                                    <li>Export your data in a portable format</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-base mb-2">5. Contact Us</h3>
                                <p className="text-slate-300">Email: medraenursing@gmail.com</p>
                                <p className="text-slate-300">Phone: 0704473503</p>
                            </div>
                        </div>
                    </>
                );

            case 'terms':
                return (
                    <>
                        <h2 className="text-xl font-bold mb-4">Terms & Conditions</h2>
                        <p className="text-sm text-slate-400 mb-4">Last Updated: January 2024</p>

                        <div className="space-y-4 text-sm">
                            <div>
                                <h3 className="font-bold text-base mb-2">1. Acceptance of Terms</h3>
                                <p className="text-slate-300">By creating an account and using this system, you accept these Terms & Conditions in full.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-base mb-2">2. Account Responsibilities</h3>
                                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                                    <li>You are responsible for maintaining your account credentials</li>
                                    <li>You are responsible for all activities under your account</li>
                                    <li>You must notify us immediately of any unauthorized access</li>
                                    <li>Only authorized pharmacy staff may use the system</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-base mb-2">3. Usage Guidelines</h3>
                                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                                    <li>Use the system only for legitimate pharmacy operations</li>
                                    <li>Do not attempt to bypass security measures</li>
                                    <li>Do not use the system for illegal activities</li>
                                    <li>Do not share your login credentials</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-base mb-2">4. Data Accuracy</h3>
                                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                                    <li>You are responsible for the accuracy of data entered</li>
                                    <li>Verify medication information before dispensing</li>
                                    <li>Ensure correct pricing and inventory counts</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-base mb-2">5. Intellectual Property</h3>
                                <p className="text-slate-300">The system, including all code and design, is the property of PHARMARAE KENYA and may not be copied or distributed without permission.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-base mb-2">6. Limitation of Liability</h3>
                                <p className="text-slate-300">PHARMARAE KENYA is not liable for any damages arising from the use or inability to use this system, including but not limited to data loss or business interruption.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-base mb-2">7. Contact Us</h3>
                                <p className="text-slate-300">Email: medraenursing@gmail.com</p>
                                <p className="text-slate-300">Phone: 0704473503</p>
                            </div>
                        </div>
                    </>
                );

            case 'about':
                return (
                    <>
                        <h2 className="text-xl font-bold mb-4">About PHARMARAE KENYA</h2>

                        <div className="space-y-4 text-sm">
                            <div className="flex justify-center mb-4">
                                <img src="/pwa-192x192.png" alt="PHARMARAE KENYA" className="w-24 h-24 rounded-2xl" />
                            </div>

                            <div>
                                <h3 className="font-bold text-base mb-2">Our Mission</h3>
                                <p className="text-slate-300">To provide innovative, reliable, and efficient pharmacy management solutions that empower healthcare professionals to deliver precision in every prescription.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-base mb-2">What We Do</h3>
                                <p className="text-slate-300">PHARMARAE KENYA is a comprehensive pharmacy management system designed for modern pharmacies. Our platform offers:</p>
                                <ul className="list-disc pl-5 space-y-1 text-slate-300 mt-2">
                                    <li>Point of Sale (POS) with barcode scanning</li>
                                    <li>Inventory management with batch tracking</li>
                                    <li>Staff management with role-based access</li>
                                    <li>Real-time sales reporting and analytics</li>
                                    <li>Offline-first architecture with cloud sync</li>
                                    <li>Secure and compliant data storage</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-base mb-2">Our Values</h3>
                                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                                    <li><strong>Precision:</strong> Accuracy in every prescription</li>
                                    <li><strong>Innovation:</strong> Modern solutions for healthcare</li>
                                    <li><strong>Reliability:</strong> Always available when you need it</li>
                                    <li><strong>Security:</strong> Protecting your data and privacy</li>
                                    <li><strong>Excellence:</strong> Striving for the best in everything we do</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-base mb-2">Contact Us</h3>
                                <p className="text-slate-300">📍 Kenya</p>
                                <p className="text-slate-300">📧 medraenursing@gmail.com</p>
                                <p className="text-slate-300">📞 0704473503</p>
                            </div>

                            <div className="pt-4 border-t border-slate-700 text-center text-slate-400 text-xs">
                                <p>© 2024 PHARMARAE KENYA. All rights reserved.</p>
                                <p className="mt-1">Powered by MEDRAE NURSING KENYA</p>
                            </div>
                        </div>
                    </>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className={`max-w-3xl w-full rounded-2xl p-6 max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#161b22] border-[#30363d] text-[#c9d1d9]' : 'bg-white border-[#d0d7de] text-[#1f2328] border'
                }`}>
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-inherit py-2">
                    <div className="flex items-center gap-3">
                        <img src="/pwa-192x192.png" alt="PHARMARAE" className="w-8 h-8 rounded-lg" />
                        <span className="font-bold">PHARMARAE</span>
                    </div>
                    <button onClick={onClose} className="text-rose-500 hover:text-rose-400 text-xl font-bold p-2 hover:bg-rose-500/10 rounded-lg transition-colors">
                        ✕
                    </button>
                </div>

                {renderContent()}

                <button onClick={onClose} className={`mt-6 px-6 py-2.5 rounded-xl font-bold w-full ${isDark ? 'bg-[#2ea043] hover:bg-[#3fb950] text-white' : 'bg-[#1f883d] hover:bg-[#2ea043] text-white'
                    } transition-colors`}>
                    Close
                </button>
            </div>
        </div>
    );
};