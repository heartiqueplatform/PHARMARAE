import React from 'react';
import { Heart, Award, Users, Rocket, Phone, Mail, MapPin, Clock } from 'lucide-react';

interface AboutViewProps {
    theme: 'dark' | 'light';
}

export const AboutView: React.FC<AboutViewProps> = ({ theme }) => {
    const isDark = theme === 'dark';

    return (
        <div className={`max-w-4xl mx-auto p-4 sm:p-6 ${isDark ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>
            {/* Brand Section */}
            <div className="flex items-center gap-3 mb-8">
                <img
                    src="/pwa-192x192.png"
                    alt="PHARMARAE KENYA"
                    className="w-16 h-16 rounded-xl object-cover border-2 border-[#2ea043]/30"
                />
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <span style={{ color: '#003366' }}>PHARMA</span>
                        <span style={{ color: '#B30000' }}>RAE</span>
                        <span className="text-xs font-black px-2 py-0.5 rounded bg-[#2ea043]/20 text-[#2ea043] border border-[#2ea043]/30">
                            PRO
                        </span>
                    </h1>
                    <p className={`text-sm font-medium ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                        Precision in Every Prescription
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Mission Section */}
                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <Rocket className="w-5 h-5 text-[#2ea043]" />
                        Our Mission
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <p className="text-sm leading-relaxed">
                            PHARMARAE Pro is dedicated to revolutionizing pharmacy management in Kenya and beyond.
                            We empower pharmacies with cutting-edge technology to streamline operations, improve patient care,
                            and drive business growth. Our mission is to make pharmacy management simple, efficient, and accessible
                            to every pharmacy in Africa.
                        </p>
                    </div>
                </section>

                {/* What We Offer */}
                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <Award className="w-5 h-5 text-[#2ea043]" />
                        What We Offer
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span><strong>Point of Sale (POS):</strong> Fast and intuitive sales processing with barcode scanning</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span><strong>Inventory Management:</strong> Real-time stock tracking, batch management, and expiry alerts</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span><strong>Analytics & Reports:</strong> Comprehensive insights into sales, inventory, and performance</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span><strong>Offline-First:</strong> Work seamlessly without internet, sync automatically when back online</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span><strong>Multi-User Management:</strong> Role-based access for owners, managers, and cashiers</span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Why Choose Us */}
                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <Heart className="w-5 h-5 text-[#2ea043]" />
                        Why Choose PHARMARAE?
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>🇰🇪 <strong>Built for Kenya:</strong> Designed specifically for Kenyan pharmacy operations</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>🔒 <strong>Secure & Compliant:</strong> Data privacy and security are our top priorities</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>⚡ <strong>Lightning Fast:</strong> Optimized for performance even on low-end devices</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>📱 <strong>Mobile-First:</strong> Works perfectly on tablets and smartphones</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#2ea043] mt-0.5">•</span>
                                <span>💼 <strong>Expert Support:</strong> Dedicated support team ready to help 24/7</span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Contact */}
                <section>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <Users className="w-5 h-5 text-[#2ea043]" />
                        Contact Us
                    </h2>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                                <p className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-[#2ea043]" />
                                    <span>+254 700 123 456</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-[#2ea043]" />
                                    <span>info@pharmarae.com</span>
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-[#2ea043]" />
                                    <span>Nairobi, Kenya</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-[#2ea043]" />
                                    <span>Mon-Fri: 8AM - 6PM</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};