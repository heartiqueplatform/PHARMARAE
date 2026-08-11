import React from 'react';
import {
    Heart, Award, Users, Rocket, Phone, Mail, MapPin, Clock,
    Shield, Zap, Smartphone, Headphones, Globe, CheckCircle,
    TrendingUp, Package, BarChart3, UserCog, Building2,
    CreditCard, FileCheck, Lock, Target, Lightbulb, Star,
    ArrowRight, Layers, Database, Cloud, GitBranch, Calendar,
    GraduationCap, Truck, ShoppingBag, Store, BadgeCheck
} from 'lucide-react';

interface AboutViewProps {
    theme: 'dark' | 'light';
}

export const AboutView: React.FC<AboutViewProps> = ({ theme }) => {
    const isDark = theme === 'dark';

    const features = [
        { icon: ShoppingBag, title: 'Point of Sale (POS)', description: 'Fast and intuitive sales processing with barcode scanning, instant receipts, and multi-payment support' },
        { icon: Package, title: 'Inventory Management', description: 'Real-time stock tracking, batch management, expiry alerts, and automated reorder notifications' },
        { icon: BarChart3, title: 'Analytics & Reports', description: 'Comprehensive insights into sales trends, inventory turnover, and staff performance metrics' },
        { icon: Database, title: 'Offline-First Architecture', description: 'Work seamlessly without internet, sync automatically when back online with conflict resolution' },
        { icon: UserCog, title: 'Multi-User Management', description: 'Role-based access for owners, managers, pharmacists, cashiers, and storekeepers with granular permissions' },
        { icon: Cloud, title: 'Cloud Sync', description: 'Secure cloud backup and synchronization across multiple devices and branches' },
        { icon: Smartphone, title: 'Mobile-First Design', description: 'Optimized for tablets and smartphones with touch-friendly interfaces and responsive layouts' },
        { icon: Shield, title: 'Data Security', description: 'End-to-end encryption, secure authentication, and regular security audits to protect patient data' },
    ];

    const benefits = [
        { icon: Globe, title: 'Built for Kenya', description: 'Specifically designed for Kenyan pharmacy operations with local regulations and practices in mind' },
        { icon: Lock, title: 'Secure & Compliant', description: 'GDPR and local data protection compliant with regular security updates and penetration testing' },
        { icon: Zap, title: 'Lightning Fast', description: 'Optimized for performance even on low-end devices with minimal loading times' },
        { icon: Smartphone, title: 'Mobile-First', description: 'Works perfectly on tablets and smartphones with a responsive, touch-optimized interface' },
        { icon: Headphones, title: 'Expert Support', description: 'Dedicated support team ready to help 24/7 with onboarding, training, and technical assistance' },
        { icon: TrendingUp, title: 'Business Growth', description: 'Actionable insights to help you increase sales, reduce costs, and expand your pharmacy business' },
        { icon: BadgeCheck, title: 'Quality Assurance', description: 'Rigorous testing and quality assurance processes ensure reliability and stability' },
        { icon: Users, title: 'Community Driven', description: 'Regular updates based on user feedback from pharmacies across Kenya and East Africa' },
    ];

    return (
        <div className={`max-w-5xl mx-auto p-4 sm:p-6 ${isDark ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>

            {/* Header Section */}
            <div className="flex items-center gap-4 mb-8">
                <img
                    src="/pwa-192x192.png"
                    alt="PHARMIENTA KENYA"
                    className="w-16 h-16 rounded-xl object-cover border-2 border-[#2ea043]/30 shadow-lg"
                />
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-1">
                            <span className="text-[#003366]">PHARM</span>
                            <span className="text-[#B30000]">IENTA</span>
                        </h1>
                        <span className="text-xs font-black px-2 py-0.5 rounded bg-[#2ea043]/20 text-[#2ea043] border border-[#2ea043]/30">
                            PRO
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20">
                            v2.0.0
                        </span>
                    </div>
                    <p className={`text-sm font-medium ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'} flex items-center gap-2 mt-1`}>
                        <span>Revolutionizing Pharmacy Management in Africa</span>
                        <span className="w-1 h-1 rounded-full bg-[#2ea043]"></span>
                        <span className="text-[#2ea043]">Since 2024</span>
                    </p>
                </div>
            </div>

            {/* Company Overview */}
            <div className={`p-5 rounded-xl mb-6 border ${isDark ? 'bg-[#161b22] border-[#30363d]' : 'bg-[#f6f8fa] border-[#d0d7de]'}`}>
                <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-5 h-5 text-[#2ea043]" />
                    <h2 className="text-lg font-semibold">Company Overview</h2>
                </div>
                <p className="text-sm leading-relaxed">
                    PHARMIENTA Pro is a cutting-edge pharmacy management platform designed to transform how pharmacies operate in Kenya and across Africa.
                    By combining innovative technology with deep industry knowledge, we provide a comprehensive solution that streamlines operations,
                    enhances patient care, and drives sustainable business growth. Our platform is trusted by pharmacies of all sizes, from independent
                    community pharmacies to multi-branch chains.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[#30363d]/30">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-[#2ea043]">50+</p>
                        <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>Active Pharmacies</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-[#58a6ff]">1000+</p>
                        <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>Products Managed</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-[#f0883e]">500+</p>
                        <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>Daily Transactions</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-[#da3633]">24/7</p>
                        <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>Support Available</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Mission Section */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Target className="w-5 h-5 text-[#2ea043]" />
                        <h2 className="text-lg font-semibold">Our Mission & Vision</h2>
                    </div>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Rocket className="w-4 h-4 text-[#2ea043]" />
                                    <h3 className="font-semibold text-sm">Mission</h3>
                                </div>
                                <p className="text-sm leading-relaxed">
                                    To empower pharmacies across Africa with innovative, accessible, and reliable technology
                                    that streamlines operations, improves patient outcomes, and drives business growth.
                                </p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Lightbulb className="w-4 h-4 text-[#f0883e]" />
                                    <h3 className="font-semibold text-sm">Vision</h3>
                                </div>
                                <p className="text-sm leading-relaxed">
                                    To become the leading pharmacy management platform in Africa, setting the standard for
                                    digital transformation in healthcare retail across the continent.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Core Values */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Star className="w-5 h-5 text-[#2ea043]" />
                        <h2 className="text-lg font-semibold">Our Core Values</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className={`p-3 rounded-lg text-center ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                            <Heart className="w-6 h-6 text-[#da3633] mx-auto mb-1" />
                            <p className="text-xs font-bold">Patient First</p>
                            <p className={`text-[10px] ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>Quality care</p>
                        </div>
                        <div className={`p-3 rounded-lg text-center ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                            <Shield className="w-6 h-6 text-[#2ea043] mx-auto mb-1" />
                            <p className="text-xs font-bold">Trust & Integrity</p>
                            <p className={`text-[10px] ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>Ethical practice</p>
                        </div>
                        <div className={`p-3 rounded-lg text-center ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                            <Lightbulb className="w-6 h-6 text-[#f0883e] mx-auto mb-1" />
                            <p className="text-xs font-bold">Innovation</p>
                            <p className={`text-[10px] ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>Continuous improvement</p>
                        </div>
                        <div className={`p-3 rounded-lg text-center ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                            <Users className="w-6 h-6 text-[#58a6ff] mx-auto mb-1" />
                            <p className="text-xs font-bold">Community</p>
                            <p className={`text-[10px] ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>Collaborative growth</p>
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Award className="w-5 h-5 text-[#2ea043]" />
                        <h2 className="text-lg font-semibold">Key Features</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {features.map((Feature, index) => (
                            <div key={index} className={`p-3 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                                <div className="flex items-start gap-2">
                                    <Feature.icon className="w-5 h-5 text-[#2ea043] flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold">{Feature.title}</p>
                                        <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                                            {Feature.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Why Choose Us - Benefits */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-5 h-5 text-[#2ea043]" />
                        <h2 className="text-lg font-semibold">Why Choose PHARMIENTA?</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {benefits.map((Benefit, index) => (
                            <div key={index} className={`p-3 rounded-lg flex items-start gap-2 ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                                <Benefit.icon className="w-5 h-5 text-[#2ea043] flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold">{Benefit.title}</p>
                                    <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                                        {Benefit.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Technology Stack */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Layers className="w-5 h-5 text-[#2ea043]" />
                        <h2 className="text-lg font-semibold">Technology Stack</h2>
                    </div>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-[#2ea043]" />
                                <span>React + TypeScript</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-[#2ea043]" />
                                <span>Tailwind CSS</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-[#2ea043]" />
                                <span>IndexedDB</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-[#2ea043]" />
                                <span>PWA Ready</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-[#2ea043]" />
                                <span>Offline-First</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-[#2ea043]" />
                                <span>RESTful API</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contact Section */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="w-5 h-5 text-[#2ea043]" />
                        <h2 className="text-lg font-semibold">Get in Touch</h2>
                    </div>
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                                <p className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>+254 704 473 503</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>pharmienta@gmail.com</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>www.pharmienta.com</span>
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>Nairobi, Kenya</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>Mon-Fri: 8AM - 6PM</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Headphones className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                                    <span>24/7 Emergency Support</span>
                                </p>
                            </div>
                        </div>
                        <div className={`mt-3 pt-3 border-t ${isDark ? 'border-[#30363d]' : 'border-[#d0d7de]'} flex items-center justify-between text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                            <span>© 2024 PHARMIENTA KENYA. All rights reserved.</span>
                            <span className="flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                <span>Secure Connection</span>
                            </span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};