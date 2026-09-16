// utils/helpers.ts
export const APP_VERSION = '1.0.0';
export const APP_NAME = 'Pharmienta Kenya';
export const VERSION_KEY = 'Pharmienta_app_version';
export const LAST_UPDATE_CHECK = 'Pharmienta_last_update_check';

export const normalizePharmacyName = (name: string): string => {
    if (!name) return '';
    return name.trim().replace(/\s+/g, ' ').toUpperCase();
};

export const displayPharmacyName = (name: string): string => {
    if (!name) return '';
    return name.trim().replace(/\s+/g, ' ');
};

export const genUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

export const getTodayStr = (): string => {
    return new Date().toISOString().split('T')[0];
};

export const getExpiryCutoffStr = (days: number = 90): string => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    return cutoff.toISOString().split('T')[0];
};

export const getPharmacyFromProfile = (profile: any): any => {
    if (!profile) return null;
    return {
        id: profile.id,
        name: displayPharmacyName(profile.pharmacy_name),
        trading_name: profile.pharmacy_trading_name || '',
        phone: profile.pharmacy_phone || '',
        email: profile.pharmacy_email || '',
        address: profile.pharmacy_address || '',
        county: profile.pharmacy_county || '',
        town: profile.pharmacy_town || '',
        logo_url: profile.avatar_url || '',
        receipt_header: profile.pharmacy_receipt_header || 'Quality Medicines & Professional Care',
        receipt_footer: profile.pharmacy_receipt_footer || 'Thank you for your visit. Get well soon!',
        currency: profile.pharmacy_currency || 'KSh',
        settings: profile.pharmacy_settings || {
            allow_negative_stock: false,
            low_stock_threshold: 10,
            expiry_warning_days: 90
        },
        is_active: profile.pharmacy_is_active !== undefined ? profile.pharmacy_is_active : true,
        created_at: profile.created_at,
        updated_at: profile.updated_at
    };
};

// =============================================
// 🆕 FORMATTING HELPERS
// =============================================

/**
 * Format currency amount with proper symbol
 */
export const formatCurrency = (amount: number, currency: string = 'KSh'): string => {
    return `${currency} ${amount?.toFixed(2) || '0.00'}`;
};

/**
 * Format date to readable string
 */
export const formatDate = (date: string | Date): string => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

/**
 * Format date and time to readable string
 */
export const formatDateTime = (date: string | Date): string => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

/**
 * Format number with commas
 */
export const formatNumber = (num: number): string => {
    return num?.toLocaleString() || '0';
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number = 50): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
};

// =============================================
// 🆕 VALIDATION HELPERS
// =============================================

/**
 * Check if a string is a valid UUID
 */
export const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 */
export const isEmpty = (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
};

// =============================================
// 🆕 REQUESTED ITEMS HELPERS
// =============================================

/**
 * Get priority label
 */
export const getPriorityLabel = (priority: string): string => {
    const labels: Record<string, string> = {
        urgent: '🔥 Urgent',
        high: '🔴 High',
        medium: '🟡 Medium',
        low: '🟢 Low',
    };
    return labels[priority] || priority;
};

/**
 * Get priority color class
 */
export const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
        urgent: 'text-rose-500 bg-rose-500/15 border-rose-500/20',
        high: 'text-orange-500 bg-orange-500/15 border-orange-500/20',
        medium: 'text-amber-500 bg-amber-500/15 border-amber-500/20',
        low: 'text-gray-400 bg-gray-500/15 border-gray-500/20',
    };
    return colors[priority] || colors.medium;
};

/**
 * Get requested item status label
 */
export const getRequestedStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
        pending: 'Pending',
        ordered: 'Ordered',
        added_to_inventory: 'Added to Inventory',
        discontinued: 'Discontinued',
    };
    return labels[status] || status;
};

/**
 * Get requested item status color class
 */
export const getRequestedStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
        pending: 'text-amber-500 bg-amber-500/15 border-amber-500/20',
        ordered: 'text-blue-400 bg-blue-500/15 border-blue-500/20',
        added_to_inventory: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20',
        discontinued: 'text-rose-500 bg-rose-500/15 border-rose-500/20',
    };
    return colors[status] || colors.pending;
};

/**
 * Get priority icon name
 */
export const getPriorityIcon = (priority: string): string => {
    const icons: Record<string, string> = {
        urgent: 'Flame',
        high: 'Zap',
        medium: 'Target',
        low: 'Award',
    };
    return icons[priority] || 'Target';
};

// =============================================
// 🆕 SALES RETURNS HELPERS
// =============================================

/**
 * Get return type label
 */
export const getReturnTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
        customer_return: 'Customer Return',
        damaged: 'Damaged',
        expired: 'Expired',
        wrong_item: 'Wrong Item',
    };
    return labels[type] || type;
};

/**
 * Get return type color class
 */
export const getReturnTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
        customer_return: 'text-blue-400 bg-blue-500/15 border-blue-500/20',
        damaged: 'text-rose-400 bg-rose-500/15 border-rose-500/20',
        expired: 'text-amber-400 bg-amber-500/15 border-amber-500/20',
        wrong_item: 'text-orange-400 bg-orange-500/15 border-orange-500/20',
    };
    return colors[type] || colors.customer_return;
};

/**
 * Get return type icon
 */
export const getReturnTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
        customer_return: 'User',
        damaged: 'AlertTriangle',
        expired: 'Clock',
        wrong_item: 'XCircle',
    };
    return icons[type] || 'Package';
};

/**
 * Get return status label
 */
export const getReturnStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
        completed: 'Completed',
        pending: 'Pending',
        rejected: 'Rejected',
    };
    return labels[status] || status;
};

/**
 * Get return status color class
 */
export const getReturnStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
        completed: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20',
        pending: 'text-amber-500 bg-amber-500/15 border-amber-500/20',
        rejected: 'text-rose-500 bg-rose-500/15 border-rose-500/20',
    };
    return colors[status] || colors.completed;
};

/**
 * Get refund method label
 */
export const getRefundMethodLabel = (method: string): string => {
    const labels: Record<string, string> = {
        cash: 'Cash',
        mpesa: 'M-Pesa',
        bank: 'Bank Transfer',
        store_credit: 'Store Credit',
    };
    return labels[method] || method;
};

// =============================================
// 🆕 GENERAL STATUS HELPERS
// =============================================

/**
 * Get status badge class
 */
export const getStatusBadgeClass = (status: string): string => {
    const classes: Record<string, string> = {
        completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
        pending: 'bg-amber-500/15 text-amber-500 border-amber-500/20',
        rejected: 'bg-rose-500/15 text-rose-500 border-rose-500/20',
        paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
        unpaid: 'bg-rose-500/15 text-rose-500 border-rose-500/20',
        cancelled: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
        active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
        inactive: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
        ordered: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
        added_to_inventory: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
        discontinued: 'bg-rose-500/15 text-rose-500 border-rose-500/20',
        low_stock: 'bg-amber-500/15 text-amber-500 border-amber-500/20',
        out_of_stock: 'bg-rose-500/15 text-rose-500 border-rose-500/20',
        in_stock: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    };
    return classes[status] || 'bg-gray-500/15 text-gray-400 border-gray-500/20';
};

/**
 * Get status label
 */
export const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
        completed: 'Completed',
        pending: 'Pending',
        rejected: 'Rejected',
        paid: 'Paid',
        unpaid: 'Unpaid',
        cancelled: 'Cancelled',
        active: 'Active',
        inactive: 'Inactive',
        ordered: 'Ordered',
        added_to_inventory: 'Added to Inventory',
        discontinued: 'Discontinued',
        low_stock: 'Low Stock',
        out_of_stock: 'Out of Stock',
        in_stock: 'In Stock',
    };
    return labels[status] || status;
};

// =============================================
// 🆕 GENERATION HELPERS
// =============================================

/**
 * Generate a sale/invoice number
 */
export const generateSaleNumber = (prefix: string = 'INV'): string => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${yearMonth}-${random}`;
};

/**
 * Generate a return number
 */
export const generateReturnNumber = (): string => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `RET-${yearMonth}-${random}`;
};

/**
 * Generate a request number
 */
export const generateRequestNumber = (): string => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `REQ-${yearMonth}-${random}`;
};

/**
 * Generate a batch number
 */
export const generateBatchNumber = (prefix: string = 'BATCH'): string => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${yearMonth}-${random}`;
};

// =============================================
// 🆕 ARRAY HELPERS
// =============================================

/**
 * Group array by key
 */
export const groupBy = <T extends Record<string, any>>(
    array: T[],
    key: keyof T
): Record<string, T[]> => {
    return array.reduce((acc, item) => {
        const groupKey = String(item[key]);
        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(item);
        return acc;
    }, {} as Record<string, T[]>);
};

/**
 * Sort array by key
 */
export const sortBy = <T extends Record<string, any>>(
    array: T[],
    key: keyof T,
    order: 'asc' | 'desc' = 'asc'
): T[] => {
    return [...array].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
    });
};

/**
 * Filter array by search query across multiple fields
 */
export const filterBySearch = <T extends Record<string, any>>(
    array: T[],
    query: string,
    fields: (keyof T)[]
): T[] => {
    if (!query.trim()) return array;
    const q = query.toLowerCase().trim();
    return array.filter(item =>
        fields.some(field =>
            String(item[field]).toLowerCase().includes(q)
        )
    );
};

// =============================================
// 🆕 CALCULATION HELPERS
// =============================================

/**
 * Calculate percentage
 */
export const calculatePercentage = (value: number, total: number): number => {
    if (total === 0) return 0;
    return (value / total) * 100;
};

/**
 * Calculate subtotal from items
 */
export const calculateSubtotal = (items: Array<{ quantity: number; unit_price: number }>): number => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
};

/**
 * Calculate total with tax and discount
 */
export const calculateTotal = (
    subtotal: number,
    tax: number = 0,
    discount: number = 0
): number => {
    return subtotal + tax - discount;
};

/**
 * Calculate stock value
 */
export const calculateStockValue = (
    quantity: number,
    costPrice: number
): number => {
    return quantity * costPrice;
};

/**
 * Calculate selling price with markup
 */
export const calculateSellingPrice = (
    costPrice: number,
    markupPercentage: number
): number => {
    return costPrice * (1 + markupPercentage / 100);
};

// =============================================
// 🆕 DEBOUNCE & THROTTLE HELPERS
// =============================================

/**
 * Debounce function for search inputs
 */
export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number = 300
): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

/**
 * Throttle function for rate limiting
 */
export const throttle = <T extends (...args: any[]) => any>(
    func: T,
    limit: number = 300
): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean = false;
    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};

// =============================================
// 🆕 COLOR HELPERS
// =============================================

/**
 * Get random color
 */
export const getRandomColor = (): string => {
    const colors = [
        'text-rose-400 bg-rose-500/15',
        'text-blue-400 bg-blue-500/15',
        'text-emerald-400 bg-emerald-500/15',
        'text-amber-400 bg-amber-500/15',
        'text-purple-400 bg-purple-500/15',
        'text-cyan-400 bg-cyan-500/15',
        'text-indigo-400 bg-indigo-500/15',
        'text-pink-400 bg-pink-500/15',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Get status dot color
 */
export const getStatusDotColor = (status: string): string => {
    const colors: Record<string, string> = {
        completed: 'bg-emerald-400',
        pending: 'bg-amber-400',
        rejected: 'bg-rose-400',
        paid: 'bg-emerald-400',
        unpaid: 'bg-rose-400',
        cancelled: 'bg-gray-400',
        active: 'bg-emerald-400',
        inactive: 'bg-gray-400',
        ordered: 'bg-blue-400',
        added_to_inventory: 'bg-emerald-400',
        discontinued: 'bg-rose-400',
        low_stock: 'bg-amber-400',
        out_of_stock: 'bg-rose-400',
        in_stock: 'bg-emerald-400',
    };
    return colors[status] || 'bg-gray-400';
};