// components/pos/CustomerSelector.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    User,
    Search,
    Plus,
    X,
    Check,
    Phone,
    MapPin,
    Gift,
    Loader2,
    Star,
    Award,
    CreditCard,
    Calendar,
    ChevronRight,
    Users
} from 'lucide-react';
import { Customer } from '../../types';
import { db } from '../../lib/db';
import { RewardsRedemptionModal } from './RewardsRedemptionModal';

interface CustomerSelectorProps {
    pharmacyName: string;
    selectedCustomer: Customer | null;
    onSelectCustomer: (customer: Customer | null) => void;
    onCustomerCreated: (customer: Customer) => void;
    theme?: 'dark' | 'light';
    currentProfileId?: string;
}

interface CustomerWithPoints extends Customer {
    displayPoints: number;
    displayTotalEarned: number;
    displayTotalRedeemed: number;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
    pharmacyName,
    selectedCustomer,
    onSelectCustomer,
    onCustomerCreated,
    theme = 'dark',
    currentProfileId
}) => {
    const isDark = theme === 'dark';
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<CustomerWithPoints[]>([]);
    const [allCustomers, setAllCustomers] = useState<CustomerWithPoints[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showPointsModal, setShowPointsModal] = useState(false);
    const [loadingPoints, setLoadingPoints] = useState(false);
    const [customerPoints, setCustomerPoints] = useState<{
        balance: number;
        earned: number;
        redeemed: number;
        transactions: any[];
    } | null>(null);
    const [showRewardsModal, setShowRewardsModal] = useState(false);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

    const [newCustomer, setNewCustomer] = useState({
        name: '',
        phone: '',
        email: '',
        location: '',
        county: '',
        town: '',
        estate: '',
        landmark: '',
        gender: '' as '' | 'male' | 'female' | 'other'
    });
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    const searchTimeout = useRef<NodeJS.Timeout>();

    const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
    const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
    const cardBg = isDark ? 'bg-[#161b22]' : 'bg-white';
    const borderLine = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';
    const inputBg = isDark ? 'bg-[#0d1117] text-[#f0f6fc]' : 'bg-[#f6f8fa] text-[#1f2328]';
    const cardHover = isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]';

    useEffect(() => {
        if (isOpen && allCustomers.length === 0 && !isLoadingCustomers) {
            loadAllCustomers();
        }
    }, [isOpen]);

    const loadAllCustomers = async () => {
        setIsLoadingCustomers(true);
        try {
            const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();
            const customers = await db.customers
                .where('pharmacy_name')
                .equals(normalized)
                .toArray();

            const enriched = await Promise.all(customers.map(async (c) => {
                const transactions = await db.customers_loyalty_transactions
                    .where('[pharmacy_name+customer_id]')
                    .equals([normalized, c.id])
                    .toArray();

                return {
                    ...c,
                    displayPoints: c.loyalty_points || 0,
                    displayTotalEarned: transactions.filter(t => t.points > 0).reduce((sum, t) => sum + t.points, 0),
                    displayTotalRedeemed: transactions.filter(t => t.points < 0).reduce((sum, t) => sum + Math.abs(t.points), 0),
                };
            }));

            setAllCustomers(enriched);
            setSearchResults(enriched);
        } catch (error) {
            console.error('Load customers error:', error);
        } finally {
            setIsLoadingCustomers(false);
        }
    };

    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.length < 1) {
            setSearchResults(allCustomers);
            return;
        }

        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        searchTimeout.current = setTimeout(() => {
            const q = searchQuery.toLowerCase().trim();
            const filtered = allCustomers.filter(c => {
                return (c.name?.toLowerCase().includes(q) ||
                    c.phone?.includes(q) ||
                    c.loyalty_card_number?.includes(q) ||
                    c.email?.toLowerCase().includes(q) ||
                    c.location?.toLowerCase().includes(q));
            });
            setSearchResults(filtered);
        }, 200);

        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [searchQuery, allCustomers]);

    const handlePhoneLookup = async (phone: string) => {
        if (phone.length < 7) return;

        try {
            const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();
            const found = await db.customers
                .where('[pharmacy_name+phone]')
                .equals([normalized, phone])
                .first();

            if (found) {
                onSelectCustomer(found);
                setIsOpen(false);
                setSearchQuery('');
            }
        } catch (error) {
            console.error('Phone lookup error:', error);
        }
    };

    const loadCustomerPoints = async (customerId: string) => {
        setLoadingPoints(true);
        try {
            const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();
            const [customer, transactions] = await Promise.all([
                db.customers.where('id').equals(customerId).first(),
                db.customers_loyalty_transactions
                    .where('[pharmacy_name+customer_id]')
                    .equals([normalized, customerId])
                    .sortBy('created_at')
            ]);

            if (customer) {
                setCustomerPoints({
                    balance: customer.loyalty_points || 0,
                    earned: transactions.filter(t => t.points > 0).reduce((sum, t) => sum + t.points, 0),
                    redeemed: transactions.filter(t => t.points < 0).reduce((sum, t) => sum + Math.abs(t.points), 0),
                    transactions: transactions.slice(-20).reverse()
                });
            }
            setShowPointsModal(true);
        } catch (error) {
            console.error('Load points error:', error);
        } finally {
            setLoadingPoints(false);
        }
    };

    const handleCreateCustomer = async () => {
        if (!newCustomer.name.trim()) {
            setCreateError('Name is required');
            return;
        }
        if (!newCustomer.phone.trim()) {
            setCreateError('Phone number is required');
            return;
        }

        setIsCreating(true);
        setCreateError('');

        try {
            const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();

            const existing = await db.customers
                .where('[pharmacy_name+phone]')
                .equals([normalized, newCustomer.phone.trim()])
                .first();

            if (existing) {
                setCreateError('Customer with this phone number already exists');
                setIsCreating(false);
                return;
            }

            const now = new Date().toISOString();
            const customerId = crypto.randomUUID();

            const customerData: Partial<Customer> = {
                id: customerId,
                pharmacy_name: normalized,
                name: newCustomer.name.trim(),
                phone: newCustomer.phone.trim(),
                email: newCustomer.email?.trim() || undefined,
                location: newCustomer.location?.trim() || undefined,
                county: newCustomer.county?.trim() || undefined,
                town: newCustomer.town?.trim() || undefined,
                estate: newCustomer.estate?.trim() || undefined,
                landmark: newCustomer.landmark?.trim() || undefined,
                gender: newCustomer.gender || undefined,
                loyalty_points: 0,
                total_points_earned: 0,
                total_points_redeemed: 0,
                total_spent: 0,
                visit_count: 0,
                is_loyalty_member: false,
                credit_allowed: false,
                created_at: now,
                updated_at: now
            };

            await db.customers.add(customerData as Customer);

            await db.sync_queue.add({
                sync_id: crypto.randomUUID(),
                pharmacy_name: normalized,
                user_id: currentProfileId || 'system',
                entity_type: 'customer',
                operation: 'INSERT',
                payload: customerData,
                created_at: now,
                updated_at: now,
                status: 'pending',
                retry_count: 0
            });

            const created = await db.customers.where('id').equals(customerId).first();
            if (created) {
                const enrichedCustomer = {
                    ...created,
                    displayPoints: 0,
                    displayTotalEarned: 0,
                    displayTotalRedeemed: 0
                };
                setAllCustomers(prev => [enrichedCustomer, ...prev]);
                setSearchResults(prev => [enrichedCustomer, ...prev]);

                onCustomerCreated(created);
                onSelectCustomer(created);
                setShowCreateForm(false);
                setIsOpen(false);
                setSearchQuery('');
                resetForm();

                if (navigator.onLine) {
                    try {
                        const { processOfflineSyncQueue } = await import('../../lib/supabase');
                        await processOfflineSyncQueue();
                    } catch (syncError) {
                        console.log('Background sync will handle this');
                    }
                }
            }
        } catch (error: any) {
            console.error('Create customer error:', error);
            setCreateError(error.message || 'Failed to create customer');
        } finally {
            setIsCreating(false);
        }
    };

    const resetForm = () => {
        setNewCustomer({
            name: '',
            phone: '',
            email: '',
            location: '',
            county: '',
            town: '',
            estate: '',
            landmark: '',
            gender: ''
        });
        setCreateError('');
    };

    const getLoyaltyTier = (points: number): { label: string; color: string; icon: any } => {
        if (points >= 500) return { label: 'Platinum', color: 'text-purple-400', icon: Star };
        if (points >= 200) return { label: 'Gold', color: 'text-amber-400', icon: Award };
        if (points >= 100) return { label: 'Silver', color: 'text-slate-400', icon: Award };
        if (points >= 50) return { label: 'Bronze', color: 'text-amber-600', icon: Award };
        return { label: 'Member', color: textMuted, icon: User };
    };

    const renderSelectedCustomer = () => {
        if (!selectedCustomer) {
            return (
                <div
                    onClick={() => setIsOpen(true)}
                    className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors min-h-[40px] sm:min-h-[44px] w-full ${isDark ? 'border-[#30363d] hover:border-[#2ea043]' : 'border-[#d0d7de] hover:border-[#2ea043]'} ${textMuted}`}
                >
                    <User className="w-5 h-5 shrink-0" />
                    <span className="font-medium text-sm">Add Customer (Optional)</span>
                    <span className="text-xs opacity-50 ml-auto">tap to search</span>
                </div>
            );
        }

        const tier = getLoyaltyTier(selectedCustomer.loyalty_points || 0);
        const TierIcon = tier.icon;

        return (
            <div
                onClick={() => setIsOpen(true)}
                className={`flex items-center justify-between p-2 sm:p-3 rounded-xl cursor-pointer transition-colors ${cardBg} ${cardHover} border ${borderLine} min-h-[44px] sm:min-h-[56px] w-full`}
            >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-[#2ea043]/20' : 'bg-[#2ea043]/10'}`}>
                        <User className={`w-5 h-5 ${isDark ? 'text-[#2ea043]' : 'text-[#2ea043]'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className={`font-bold truncate text-sm ${textTitle}`}>{selectedCustomer.name}</p>
                        <div className="flex items-center gap-2 text-xs">
                            <span className={textMuted}>{selectedCustomer.phone}</span>
                            {selectedCustomer.location && (
                                <>
                                    <span className={textMuted}>•</span>
                                    <span className={`${textMuted} truncate`}>{selectedCustomer.location}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]'}`}>
                        <TierIcon className={`w-3 h-3 ${tier.color}`} />
                        <span className={`text-[10px] font-bold ${tier.color}`}>{tier.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Gift className={`w-3.5 h-3.5 ${textMuted}`} />
                        <span className={`font-bold text-sm ${textTitle}`}>{selectedCustomer.loyalty_points || 0}</span>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (selectedCustomer) {
                                setShowRewardsModal(true);
                            }
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-[#30363d]' : 'hover:bg-[#eaeef2]'} ${isDark ? 'text-amber-400' : 'text-amber-500'}`}
                        title="Redeem points"
                    >
                        <Gift className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (selectedCustomer) {
                                loadCustomerPoints(selectedCustomer.id);
                            }
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-[#30363d]' : 'hover:bg-[#eaeef2]'} ${textMuted}`}
                        title="View points history"
                    >
                        <Search className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelectCustomer(null);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-[#30363d]' : 'hover:bg-[#eaeef2]'} text-rose-500`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    };

    // Dropdown - centered modal on desktop, full screen on mobile
    const renderDropdown = () => {
        if (!isOpen) return null;

        return (
            <div
                className="fixed inset-0 z-[999] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setIsOpen(false);
                    }
                }}
            >
                <div className={`w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl ${cardBg} border ${borderLine} flex flex-col overflow-hidden`}>
                    {/* Header */}
                    <div className={`p-3 sm:p-4 border-b ${borderLine} flex items-center gap-2 sm:gap-3 shrink-0`}>
                        <button
                            onClick={() => setIsOpen(false)}
                            className={`p-1.5 sm:p-2 rounded-lg ${isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]'}`}
                        >
                            <X className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <div className="flex-1 relative">
                            <Search className={`w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (e.target.value.length >= 7 && /^\d+$/.test(e.target.value)) {
                                        handlePhoneLookup(e.target.value);
                                    }
                                }}
                                placeholder="Search by name, phone, or card number"
                                className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3.5 rounded-xl text-sm sm:text-base ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 min-h-[40px] sm:min-h-[48px]`}
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className={`absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 ${textMuted} hover:text-rose-500 p-1`}
                                >
                                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className={`p-2 sm:p-2.5 rounded-lg ${isDark ? 'bg-[#2ea043] hover:bg-[#2c9b3e] text-white' : 'bg-[#2ea043] hover:bg-[#2c9b3e] text-white'}`}
                        >
                            <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>

                    {/* Results */}
                    <div className="flex-1 overflow-y-auto p-2 sm:p-3">
                        {isLoadingCustomers || isSearching ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className={`w-8 h-8 animate-spin ${textMuted}`} />
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="space-y-1.5 sm:space-y-2">
                                {searchResults.map((customer) => {
                                    const tier = getLoyaltyTier(customer.displayPoints || 0);
                                    const TierIcon = tier.icon;
                                    return (
                                        <button
                                            key={customer.id}
                                            onClick={() => {
                                                onSelectCustomer(customer);
                                                setIsOpen(false);
                                                setSearchQuery('');
                                            }}
                                            className={`w-full text-left p-3 sm:p-4 rounded-xl transition-colors ${cardHover} border ${borderLine} flex items-center justify-between min-h-[56px] sm:min-h-[64px]`}
                                        >
                                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]'}`}>
                                                    <User className={`w-4 h-4 sm:w-5 sm:h-5 ${textMuted}`} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className={`font-bold text-xs sm:text-sm truncate ${textTitle}`}>{customer.name}</p>
                                                    <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
                                                        <span className={textMuted}>{customer.phone || 'No phone'}</span>
                                                        {customer.location && (
                                                            <>
                                                                <span className={textMuted}>•</span>
                                                                <span className={`${textMuted} truncate max-w-[80px] sm:max-w-[150px]`}>{customer.location}</span>
                                                            </>
                                                        )}
                                                        {customer.loyalty_card_number && (
                                                            <>
                                                                <span className={textMuted}>•</span>
                                                                <span className={`${textMuted} font-mono text-[9px] sm:text-[10px]`}>#{customer.loyalty_card_number}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                                <div className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]'}`}>
                                                    <TierIcon className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${tier.color}`} />
                                                    <span className={`text-[8px] sm:text-[10px] font-bold ${tier.color}`}>{tier.label}</span>
                                                </div>
                                                <div className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${isDark ? 'bg-[#2ea043]/10' : 'bg-[#2ea043]/5'}`}>
                                                    <Gift className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${isDark ? 'text-[#2ea043]' : 'text-[#2ea043]'}`} />
                                                    <span className={`text-[9px] sm:text-xs font-bold ${isDark ? 'text-[#2ea043]' : 'text-[#2ea043]'}`}>
                                                        {customer.displayPoints || 0}
                                                    </span>
                                                </div>
                                                <ChevronRight className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${textMuted}`} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : searchQuery.length >= 2 ? (
                            <div className="text-center py-12 space-y-3">
                                <p className={`text-sm sm:text-base ${textMuted}`}>No customers found</p>
                                <button
                                    onClick={() => {
                                        setShowCreateForm(true);
                                        setNewCustomer(prev => ({ ...prev, phone: searchQuery }));
                                    }}
                                    className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold transition-colors ${isDark ? 'bg-[#2ea043] hover:bg-[#2c9b3e] text-white' : 'bg-[#2ea043] hover:bg-[#2c9b3e] text-white'}`}
                                >
                                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1.5 sm:mr-2" />
                                    Create New Customer
                                </button>
                            </div>
                        ) : allCustomers.length === 0 ? (
                            <div className="text-center py-12 space-y-3">
                                <Users className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto ${textMuted} opacity-30`} />
                                <p className={`text-sm sm:text-base font-medium ${textTitle}`}>No customers yet</p>
                                <p className={`text-xs sm:text-sm ${textMuted}`}>Add your first customer to get started</p>
                                <button
                                    onClick={() => setShowCreateForm(true)}
                                    className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold transition-colors ${isDark ? 'bg-[#2ea043] hover:bg-[#2c9b3e] text-white' : 'bg-[#2ea043] hover:bg-[#2c9b3e] text-white'}`}
                                >
                                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1.5 sm:mr-2" />
                                    Add First Customer
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-12 space-y-3">
                                <Search className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto ${textMuted} opacity-30`} />
                                <p className={`text-sm sm:text-base ${textMuted}`}>Search by name or phone</p>
                            </div>
                        )}
                    </div>

                    {/* Bottom action */}
                    <div className={`p-3 sm:p-4 border-t ${borderLine} ${cardBg} shrink-0`}>
                        <button
                            onClick={() => {
                                onSelectCustomer(null);
                                setIsOpen(false);
                            }}
                            className={`w-full py-2.5 sm:py-3.5 rounded-xl text-sm sm:text-base font-bold transition-colors ${isDark ? 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9]' : 'bg-[#f6f8fa] hover:bg-[#eaeef2] text-[#1f2328]'} min-h-[44px] sm:min-h-[48px]`}
                        >
                            Continue as Cash Customer
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Create customer form - centered modal on desktop, full screen on mobile
    const renderCreateForm = () => {
        if (!showCreateForm) return null;

        return (
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setShowCreateForm(false);
                        resetForm();
                    }
                }}
            >
                <div className={`w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl ${cardBg} border ${borderLine} flex flex-col overflow-hidden`}>
                    <div className={`p-3 sm:p-4 border-b ${borderLine} flex items-center gap-2 sm:gap-3 shrink-0`}>
                        <button
                            onClick={() => {
                                setShowCreateForm(false);
                                resetForm();
                            }}
                            className={`p-1.5 sm:p-2 rounded-lg ${isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]'}`}
                        >
                            <X className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 sm:p-2 rounded-full ${isDark ? 'bg-[#2ea043]/20' : 'bg-[#2ea043]/10'}`}>
                                <User className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-[#2ea043]' : 'text-[#2ea043]'}`} />
                            </div>
                            <h3 className={`font-bold text-base sm:text-lg ${textTitle}`}>New Customer</h3>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                        {createError && (
                            <div className={`p-2.5 sm:p-3 rounded-lg mb-3 sm:mb-4 ${isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-500/10 text-rose-600'} text-xs sm:text-sm`}>
                                {createError}
                            </div>
                        )}

                        <div className="space-y-3 sm:space-y-4">
                            <div>
                                <label className={`text-xs sm:text-sm font-medium ${textMuted} block mb-1`}>Full Name *</label>
                                <input
                                    type="text"
                                    value={newCustomer.name}
                                    onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-xl text-sm sm:text-base ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 min-h-[40px] sm:min-h-[48px]`}
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className={`text-xs sm:text-sm font-medium ${textMuted} block mb-1`}>Phone Number *</label>
                                <input
                                    type="tel"
                                    value={newCustomer.phone}
                                    onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-xl text-sm sm:text-base ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 min-h-[40px] sm:min-h-[48px]`}
                                    placeholder="0712 345 678"
                                />
                            </div>

                            <div>
                                <label className={`text-xs sm:text-sm font-medium ${textMuted} block mb-1`}>Email</label>
                                <input
                                    type="email"
                                    value={newCustomer.email}
                                    onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-xl text-sm sm:text-base ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 min-h-[40px] sm:min-h-[48px]`}
                                    placeholder="customer@email.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <div>
                                    <label className={`text-xs sm:text-sm font-medium ${textMuted} block mb-1`}>Town</label>
                                    <input
                                        type="text"
                                        value={newCustomer.town}
                                        onChange={(e) => setNewCustomer(prev => ({ ...prev, town: e.target.value }))}
                                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-xl text-sm sm:text-base ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 min-h-[40px] sm:min-h-[48px]`}
                                        placeholder="Nairobi"
                                    />
                                </div>
                                <div>
                                    <label className={`text-xs sm:text-sm font-medium ${textMuted} block mb-1`}>County</label>
                                    <input
                                        type="text"
                                        value={newCustomer.county}
                                        onChange={(e) => setNewCustomer(prev => ({ ...prev, county: e.target.value }))}
                                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-xl text-sm sm:text-base ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 min-h-[40px] sm:min-h-[48px]`}
                                        placeholder="Nairobi"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={`text-xs sm:text-sm font-medium ${textMuted} block mb-1`}>Estate / Area</label>
                                <input
                                    type="text"
                                    value={newCustomer.estate}
                                    onChange={(e) => setNewCustomer(prev => ({ ...prev, estate: e.target.value }))}
                                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-xl text-sm sm:text-base ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 min-h-[40px] sm:min-h-[48px]`}
                                    placeholder="Lavington"
                                />
                            </div>

                            <div>
                                <label className={`text-xs sm:text-sm font-medium ${textMuted} block mb-1`}>Landmark</label>
                                <input
                                    type="text"
                                    value={newCustomer.landmark}
                                    onChange={(e) => setNewCustomer(prev => ({ ...prev, landmark: e.target.value }))}
                                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-xl text-sm sm:text-base ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 min-h-[40px] sm:min-h-[48px]`}
                                    placeholder="Near the mall"
                                />
                            </div>

                            <div>
                                <label className={`text-xs sm:text-sm font-medium ${textMuted} block mb-1`}>Gender</label>
                                <select
                                    value={newCustomer.gender}
                                    onChange={(e) => setNewCustomer(prev => ({ ...prev, gender: e.target.value as any }))}
                                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-xl text-sm sm:text-base ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 min-h-[40px] sm:min-h-[48px]`}
                                >
                                    <option value="">Select gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className={`p-3 sm:p-4 border-t ${borderLine} ${cardBg} shrink-0 flex gap-2 sm:gap-3`}>
                        <button
                            onClick={() => {
                                setShowCreateForm(false);
                                resetForm();
                            }}
                            className={`flex-1 py-2.5 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base transition-colors ${isDark ? 'bg-[#21262d] hover:bg-[#30363d]' : 'bg-[#f6f8fa] hover:bg-[#eaeef2]'} min-h-[40px] sm:min-h-[48px]`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateCustomer}
                            disabled={isCreating}
                            className={`flex-1 py-2.5 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base text-white transition-colors flex items-center justify-center gap-1.5 sm:gap-2 ${isCreating ? 'opacity-70 cursor-not-allowed' : ''} bg-[#2ea043] hover:bg-[#2c9b3e] min-h-[40px] sm:min-h-[48px]`}
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                                    <span>Creating...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                                    <span>Create Customer</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Points history modal - centered modal on desktop, full screen on mobile
    const renderPointsModal = () => {
        if (!showPointsModal || !customerPoints) return null;

        return (
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setShowPointsModal(false);
                    }
                }}
            >
                <div className={`w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl ${cardBg} border ${borderLine} flex flex-col overflow-hidden`}>
                    <div className={`p-3 sm:p-4 border-b ${borderLine} flex items-center gap-2 sm:gap-3 shrink-0`}>
                        <button
                            onClick={() => setShowPointsModal(false)}
                            className={`p-1.5 sm:p-2 rounded-lg ${isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]'}`}
                        >
                            <X className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Gift className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-[#2ea043]' : 'text-[#2ea043]'}`} />
                            <h3 className={`font-bold text-base sm:text-lg ${textTitle}`}>Loyalty Points</h3>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                        {loadingPoints ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className={`w-8 h-8 animate-spin ${textMuted}`} />
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                                    <div className={`p-3 sm:p-4 rounded-xl text-center ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]'}`}>
                                        <p className={`text-xl sm:text-2xl font-bold ${textTitle}`}>{customerPoints.balance}</p>
                                        <p className={`text-[8px] sm:text-[10px] uppercase ${textMuted}`}>Balance</p>
                                    </div>
                                    <div className={`p-3 sm:p-4 rounded-xl text-center ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]'}`}>
                                        <p className={`text-xl sm:text-2xl font-bold text-emerald-500`}>{customerPoints.earned}</p>
                                        <p className={`text-[8px] sm:text-[10px] uppercase ${textMuted}`}>Earned</p>
                                    </div>
                                    <div className={`p-3 sm:p-4 rounded-xl text-center ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]'}`}>
                                        <p className={`text-xl sm:text-2xl font-bold text-rose-500`}>{customerPoints.redeemed}</p>
                                        <p className={`text-[8px] sm:text-[10px] uppercase ${textMuted}`}>Redeemed</p>
                                    </div>
                                </div>

                                <div className={`border-t ${borderLine} pt-3 sm:pt-4`}>
                                    <p className={`text-[10px] sm:text-xs font-bold uppercase ${textMuted} mb-2 sm:mb-3`}>Recent Activity</p>
                                    {customerPoints.transactions.length === 0 ? (
                                        <p className={`text-xs sm:text-sm ${textMuted} text-center py-4`}>No transactions yet</p>
                                    ) : (
                                        <div className="space-y-1.5 sm:space-y-2">
                                            {customerPoints.transactions.map((tx, idx) => (
                                                <div key={idx} className={`flex items-center justify-between text-xs sm:text-sm p-2 sm:p-3 rounded-xl ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'}`}>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`font-medium truncate ${textTitle}`}>{tx.description || tx.transaction_type}</p>
                                                        <p className={`text-[9px] sm:text-[10px] ${textMuted}`}>
                                                            {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                    <span className={`font-bold ${tx.points > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {tx.points > 0 ? '+' : ''}{tx.points}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full">
            {renderSelectedCustomer()}
            {renderDropdown()}
            {renderCreateForm()}
            {renderPointsModal()}
            {showRewardsModal && selectedCustomer && (
                <RewardsRedemptionModal
                    isOpen={showRewardsModal}
                    onClose={() => {
                        setShowRewardsModal(false);
                        if (selectedCustomer) {
                            loadCustomerPoints(selectedCustomer.id);
                        }
                    }}
                    customer={selectedCustomer}
                    pharmacyName={pharmacyName}
                    theme={theme}
                    onRedeemed={() => {
                        if (selectedCustomer) {
                            loadCustomerPoints(selectedCustomer.id);
                            db.customers.where('id').equals(selectedCustomer.id).first().then(c => {
                                if (c) {
                                    onSelectCustomer({ ...selectedCustomer, loyalty_points: c.loyalty_points || 0 });
                                }
                            });
                        }
                    }}
                />
            )}
        </div>
    );
};