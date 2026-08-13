// components/views/SalesReturnsView.tsx
import React, { useState, useMemo } from 'react';
import {
    Package, Search, Filter, Loader2,
    ArrowLeft, CheckCircle, XCircle,
    AlertTriangle, User, Calendar,
    DollarSign, RefreshCw, Undo2,
    Clock, ShieldCheck, FileText,
    ChevronDown, ChevronUp, Trash2,
    Edit2, Plus, Minus, Save,
    Eye, EyeOff, Printer, Download,
    List, History, RotateCcw, // NEW - for tab icons
} from 'lucide-react';
import { Sale, Product, ProductBatch, SalesReturn } from '../../types';

interface SalesReturnsViewProps {
    sales: Sale[];
    products: Product[];
    batches: ProductBatch[];
    salesReturns: SalesReturn[];
    pharmacyName: string | null;
    currency: string;
    theme?: 'dark' | 'light';
    isLoading?: boolean;
    onSalesReturn: (data: {
        saleId: string;
        productId: string;
        batchId: string | null;
        quantityReturned: number;
        returnReason: string;
        returnType: 'customer_return' | 'damaged' | 'expired' | 'wrong_item';
        refundAmount: number;
        refundMethod: 'cash' | 'mpesa' | 'bank' | 'store_credit' | null;
        customerId: string | null;
        customerName: string | null;
        notes: string | null;
    }) => Promise<void>;
}

export const SalesReturnsView: React.FC<SalesReturnsViewProps> = ({
    sales,
    products,
    batches,
    salesReturns,
    pharmacyName,
    currency,
    theme = 'dark',
    isLoading = false,
    onSalesReturn,
}) => {
    const isDark = theme === 'dark';

    // Theme variables
    const cardBg = isDark ? 'bg-[#161b22] text-[#c9d1d9]' : 'bg-white text-[#1f2328] shadow-sm';
    const cardBgAlt = isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]';
    const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
    const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
    const borderLine = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';
    const inputBg = isDark ? 'bg-[#0d1117] text-[#f0f6fc]' : 'bg-[#f6f8fa] text-[#1f2328]';
    const touchTargetSmall = 'min-h-[36px] min-w-[36px]';

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'returns' | 'history'>('returns');

    // Return form state
    const [returnData, setReturnData] = useState({
        quantityReturned: 1,
        returnReason: '',
        returnType: 'customer_return' as const,
        refundAmount: 0,
        refundMethod: 'cash' as const,
        notes: '',
    });

    // Get product name
    const getProductName = (productId: string) => {
        const product = products.find(p => p.id === productId);
        return product?.name || 'Unknown Product';
    };

    // Get batch number
    const getBatchNumber = (batchId: string | null) => {
        if (!batchId) return 'N/A';
        const batch = batches.find(b => b.id === batchId);
        return batch?.batch_number || 'N/A';
    };

    // Filter sales for returns (only show completed sales with items)
    const eligibleSales = useMemo(() => {
        return sales
            .filter(s => s.status === 'completed' && s.quantity > 0)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [sales]);

    // Filter returns history
    const filteredReturns = useMemo(() => {
        let items = [...salesReturns];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            items = items.filter(r =>
                r.product_name.toLowerCase().includes(q) ||
                r.sale_number.toLowerCase().includes(q) ||
                r.customer_name?.toLowerCase().includes(q) ||
                r.return_reason.toLowerCase().includes(q)
            );
        }
        return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [salesReturns, searchQuery]);

    // Stats
    const stats = useMemo(() => {
        const total = salesReturns.length;
        const customerReturns = salesReturns.filter(r => r.return_type === 'customer_return').length;
        const damaged = salesReturns.filter(r => r.return_type === 'damaged').length;
        const expired = salesReturns.filter(r => r.return_type === 'expired').length;
        const wrongItem = salesReturns.filter(r => r.return_type === 'wrong_item').length;
        const totalUnits = salesReturns.reduce((sum, r) => sum + r.quantity_returned, 0);
        const totalRefund = salesReturns.reduce((sum, r) => sum + (r.refund_amount || 0), 0);

        return { total, customerReturns, damaged, expired, wrongItem, totalUnits, totalRefund };
    }, [salesReturns]);

    // Handle sale selection for return
    const handleSelectSale = (sale: Sale) => {
        setSelectedSale(sale);
        setReturnData({
            quantityReturned: sale.quantity || 1,
            returnReason: '',
            returnType: 'customer_return',
            refundAmount: sale.total || 0,
            refundMethod: 'cash',
            notes: '',
        });
        setShowReturnModal(true);
    };

    // Handle return submission
    const handleSubmitReturn = async () => {
        if (!selectedSale) return;
        if (!returnData.returnReason.trim()) {
            alert('Please provide a reason for the return.');
            return;
        }
        if (returnData.quantityReturned <= 0) {
            alert('Quantity returned must be greater than 0.');
            return;
        }
        if (returnData.quantityReturned > selectedSale.quantity) {
            alert(`Cannot return more than ${selectedSale.quantity} units.`);
            return;
        }

        setIsSubmitting(true);
        try {
            await onSalesReturn({
                saleId: selectedSale.id,
                productId: selectedSale.product_id,
                batchId: selectedSale.batch_id || null,
                quantityReturned: returnData.quantityReturned,
                returnReason: returnData.returnReason,
                returnType: returnData.returnType,
                refundAmount: returnData.refundAmount,
                refundMethod: returnData.refundMethod,
                customerId: selectedSale.customer_id || null,
                customerName: selectedSale.customer_name || null,
                notes: returnData.notes || null,
            });
            setShowReturnModal(false);
            setSelectedSale(null);
            setReturnData({
                quantityReturned: 1,
                returnReason: '',
                returnType: 'customer_return',
                refundAmount: 0,
                refundMethod: 'cash',
                notes: '',
            });
            alert('Return processed successfully!');
        } catch (err: any) {
            alert('Error processing return: ' + (err.message || err));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Return type badges
    const getReturnTypeBadge = (type: string) => {
        const configs: Record<string, { label: string; color: string; bg: string }> = {
            customer_return: { label: 'Customer Return', color: 'text-blue-400', bg: 'bg-blue-500/15' },
            damaged: { label: 'Damaged', color: 'text-rose-400', bg: 'bg-rose-500/15' },
            expired: { label: 'Expired', color: 'text-amber-400', bg: 'bg-amber-500/15' },
            wrong_item: { label: 'Wrong Item', color: 'text-orange-400', bg: 'bg-orange-500/15' },
        };
        return configs[type] || configs.customer_return;
    };

    const getReturnTypeIcon = (type: string) => {
        switch (type) {
            case 'customer_return': return <User className="w-3 h-3" />;
            case 'damaged': return <AlertTriangle className="w-3 h-3" />;
            case 'expired': return <Clock className="w-3 h-3" />;
            case 'wrong_item': return <XCircle className="w-3 h-3" />;
            default: return <Package className="w-3 h-3" />;
        }
    };

    return (
        <div className="space-y-4 px-0 md:px-4 pb-20 md:pb-6">
            {/* Header */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl shadow-sm ${cardBg}`}>
                <div>
                    <h2 className={`text-base font-extrabold flex items-center gap-2 ${textTitle}`}>
                        <Undo2 className="w-5 h-5 text-[#2ea043]" />
                        <span>Sales Returns</span>
                        {salesReturns.length > 0 && (
                            <span className={`text-xs font-normal px-2 py-0.5 rounded ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]'} ${textMuted}`}>
                                {salesReturns.length} returns
                            </span>
                        )}
                    </h2>
                    <p className={`text-xs mt-0.5 ${textMuted}`}>
                        Process customer returns, damaged items, and restore inventory automatically.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab(activeTab === 'returns' ? 'history' : 'returns')}
                        className={`px-4 py-2.5 rounded-xl font-extrabold text-sm transition-colors shadow-sm ${touchTargetSmall} ${activeTab === 'returns'
                            ? 'bg-[#2ea043] text-white'
                            : isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-[#f6f8fa] text-slate-800 hover:bg-slate-200'
                            }`}
                    >
                        {activeTab === 'returns' ? (
                            <>
                                <List className="w-4 h-4 inline-block mr-1.5" />
                                History
                            </>
                        ) : (
                            <>
                                <RotateCcw className="w-4 h-4 inline-block mr-1.5" />
                                New Return
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className={`p-3 rounded-xl ${cardBg}`}>
                    <div className={`text-2xl font-bold text-emerald-400`}>{stats.total}</div>
                    <div className={`text-xs ${textMuted}`}>Total Returns</div>
                </div>
                <div className={`p-3 rounded-xl ${cardBg}`}>
                    <div className={`text-2xl font-bold text-blue-400`}>{stats.customerReturns}</div>
                    <div className={`text-xs ${textMuted}`}>Customer Returns</div>
                </div>
                <div className={`p-3 rounded-xl ${cardBg}`}>
                    <div className={`text-2xl font-bold text-rose-400`}>{stats.damaged}</div>
                    <div className={`text-xs ${textMuted}`}>Damaged Items</div>
                </div>
                <div className={`p-3 rounded-xl ${cardBg}`}>
                    <div className={`text-2xl font-bold text-amber-400`}>{stats.expired}</div>
                    <div className={`text-xs ${textMuted}`}>Expired Items</div>
                </div>
                <div className={`p-3 rounded-xl ${cardBg}`}>
                    <div className={`text-2xl font-bold text-orange-400`}>{stats.wrongItem}</div>
                    <div className={`text-xs ${textMuted}`}>Wrong Items</div>
                </div>
                <div className={`p-3 rounded-xl ${cardBg}`}>
                    <div className={`text-2xl font-bold ${textTitle}`}>{stats.totalUnits}</div>
                    <div className={`text-xs ${textMuted}`}>Total Units Returned</div>
                </div>
            </div>

            {/* Returns Tab - Select Sale for Return */}
            {activeTab === 'returns' && (
                <>
                    {/* Search */}
                    <div className="relative">
                        <Search className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 ${textMuted}`} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search sales by product, customer, or sale number..."
                            className={`w-full rounded-xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${inputBg}`}
                        />
                    </div>

                    {/* Eligible Sales List */}
                    <div className={`rounded-2xl overflow-hidden shadow-sm ${cardBg}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className={`uppercase font-bold text-[11px] tracking-wider ${isDark ? 'bg-[#21262d]/80 text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'}`}>
                                    <tr>
                                        <th className="p-3">Sale # / Product</th>
                                        <th className="p-3">Customer</th>
                                        <th className="p-3 text-center">Qty</th>
                                        <th className="p-3 text-right">Amount ({currency})</th>
                                        <th className="p-3">Date</th>
                                        <th className="p-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${borderLine}`}>
                                    {isLoading ? (
                                        <tr><td colSpan={6} className={`p-8 text-center ${textMuted}`}>
                                            <Loader2 className="w-6 h-6 animate-spin text-[#2ea043] mx-auto" />
                                            <span className="block mt-2 text-sm">Loading sales...</span>
                                        </td></tr>
                                    ) : eligibleSales.length === 0 ? (
                                        <tr><td colSpan={6} className={`p-8 text-center ${textMuted}`}>
                                            <Package className="w-12 h-12 mx-auto opacity-20" />
                                            <p className="mt-2 font-medium">No completed sales found</p>
                                            <p className="text-xs">Sales with items are eligible for returns.</p>
                                        </td></tr>
                                    ) : (
                                        eligibleSales
                                            .filter(s =>
                                                !searchQuery.trim() ||
                                                s.sale_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                s.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                s.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
                                            )
                                            .slice(0, 50)
                                            .map(sale => (
                                                <tr key={sale.id} className={`transition-colors ${isDark ? 'hover:bg-[#21262d]/50' : 'hover:bg-[#f6f8fa]'}`}>
                                                    <td className={`p-3 ${textTitle}`}>
                                                        <div className="font-bold text-sm">{sale.sale_number}</div>
                                                        <div className={`text-xs ${textMuted}`}>{sale.product_name}</div>
                                                        {sale.batch_number && (
                                                            <div className={`text-[10px] font-mono ${textMuted}`}>Batch: {sale.batch_number}</div>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-sm">{sale.customer_name || 'Cash Customer'}</td>
                                                    <td className="p-3 text-center font-bold">{sale.quantity}</td>
                                                    <td className="p-3 text-right font-bold text-emerald-400">{currency} {sale.total?.toFixed(2) || '0.00'}</td>
                                                    <td className={`p-3 text-xs ${textMuted}`}>{new Date(sale.created_at).toLocaleDateString()}</td>
                                                    <td className="p-3 text-right">
                                                        <button
                                                            onClick={() => handleSelectSale(sale)}
                                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${touchTargetSmall} ${isDark ? 'bg-[#2ea043] hover:bg-[#3fb950] text-white' : 'bg-[#2ea043] hover:bg-[#3fb950] text-white'}`}
                                                        >
                                                            Process Return
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className={`rounded-2xl overflow-hidden shadow-sm ${cardBg}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className={`uppercase font-bold text-[11px] tracking-wider ${isDark ? 'bg-[#21262d]/80 text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'}`}>
                                <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Sale #</th>
                                    <th className="p-3">Product</th>
                                    <th className="p-3 text-center">Qty Returned</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Reason</th>
                                    <th className="p-3 text-right">Refund ({currency})</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${borderLine}`}>
                                {isLoading ? (
                                    <tr><td colSpan={7} className={`p-8 text-center ${textMuted}`}>
                                        <Loader2 className="w-6 h-6 animate-spin text-[#2ea043] mx-auto" />
                                        <span className="block mt-2 text-sm">Loading history...</span>
                                    </td></tr>
                                ) : filteredReturns.length === 0 ? (
                                    <tr><td colSpan={7} className={`p-8 text-center ${textMuted}`}>
                                        <Undo2 className="w-12 h-12 mx-auto opacity-20" />
                                        <p className="mt-2 font-medium">No return history found</p>
                                        <p className="text-xs">Returns will appear here once processed.</p>
                                    </td></tr>
                                ) : (
                                    filteredReturns.map(ret => {
                                        const typeBadge = getReturnTypeBadge(ret.return_type);
                                        return (
                                            <tr key={ret.id} className={`transition-colors ${isDark ? 'hover:bg-[#21262d]/50' : 'hover:bg-[#f6f8fa]'}`}>
                                                <td className={`p-3 text-xs ${textMuted}`}>{new Date(ret.created_at).toLocaleDateString()}</td>
                                                <td className={`p-3 font-mono text-xs font-bold ${textTitle}`}>{ret.sale_number}</td>
                                                <td className={`p-3 font-bold ${textTitle}`}>
                                                    {ret.product_name}
                                                    {ret.batch_number && (
                                                        <div className={`text-[10px] font-mono ${textMuted}`}>Batch: {ret.batch_number}</div>
                                                    )}
                                                </td>
                                                <td className={`p-3 text-center font-bold text-rose-500`}>-{ret.quantity_returned}</td>
                                                <td className="p-3">
                                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1 w-fit ${typeBadge.bg} ${typeBadge.color}`}>
                                                        {getReturnTypeIcon(ret.return_type)}
                                                        {typeBadge.label}
                                                    </span>
                                                </td>
                                                <td className={`p-3 text-xs ${textMuted}`}>
                                                    <div className="max-w-[150px] truncate" title={ret.return_reason}>
                                                        {ret.return_reason}
                                                    </div>
                                                </td>
                                                <td className={`p-3 text-right font-bold text-emerald-400`}>
                                                    {currency} {ret.refund_amount?.toFixed(2) || '0.00'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Return Modal */}
            {showReturnModal && selectedSale && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
                    <div className={`rounded-2xl max-w-lg w-full p-4 overflow-y-auto max-h-[95vh] shadow-2xl ${cardBg}`}>
                        <h3 className={`text-base font-bold pb-3 mb-3 ${borderLine} ${textTitle}`}>
                            <Undo2 className="w-5 h-5 inline-block mr-2 text-rose-500" />
                            Process Return
                        </h3>

                        <div className={`mb-4 p-3 rounded-xl ${isDark ? 'bg-[#21262d]/60' : 'bg-[#f6f8fa]'}`}>
                            <div className="text-sm space-y-1.5">
                                <div className="flex justify-between">
                                    <span className={textMuted}>Sale #:</span>
                                    <span className={`font-bold ${textTitle}`}>{selectedSale.sale_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className={textMuted}>Product:</span>
                                    <span className={`font-bold ${textTitle}`}>{selectedSale.product_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className={textMuted}>Sold Quantity:</span>
                                    <span className={`font-bold ${textTitle}`}>{selectedSale.quantity} units</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className={textMuted}>Batch:</span>
                                    <span className={`font-mono text-sm ${textTitle}`}>{selectedSale.batch_number || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className={textMuted}>Customer:</span>
                                    <span className={textTitle}>{selectedSale.customer_name || 'Cash Customer'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className={textMuted}>Total Amount:</span>
                                    <span className="text-emerald-400 font-bold">{currency} {selectedSale.total?.toFixed(2) || '0.00'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div>
                                <label className={`block mb-1.5 font-bold ${textMuted}`}>Quantity Returning *</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={selectedSale.quantity}
                                    value={returnData.quantityReturned}
                                    onChange={(e) => setReturnData({ ...returnData, quantityReturned: Number(e.target.value) })}
                                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${inputBg}`}
                                />
                                <p className={`text-xs mt-1 ${textMuted}`}>Max: {selectedSale.quantity} units</p>
                            </div>

                            <div>
                                <label className={`block mb-1.5 font-bold ${textMuted}`}>Return Type *</label>
                                <select
                                    value={returnData.returnType}
                                    onChange={(e) => setReturnData({ ...returnData, returnType: e.target.value as any })}
                                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                                >
                                    <option value="customer_return">Customer Return</option>
                                    <option value="damaged">Damaged</option>
                                    <option value="expired">Expired</option>
                                    <option value="wrong_item">Wrong Item</option>
                                </select>
                            </div>

                            <div>
                                <label className={`block mb-1.5 font-bold ${textMuted}`}>Reason for Return *</label>
                                <input
                                    type="text"
                                    value={returnData.returnReason}
                                    onChange={(e) => setReturnData({ ...returnData, returnReason: e.target.value })}
                                    placeholder="e.g. Customer dissatisfied, Expired product"
                                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${inputBg}`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Refund Amount</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={returnData.refundAmount}
                                        onChange={(e) => setReturnData({ ...returnData, refundAmount: Number(e.target.value) })}
                                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                                    />
                                </div>
                                <div>
                                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Refund Method</label>
                                    <select
                                        value={returnData.refundMethod}
                                        onChange={(e) => setReturnData({ ...returnData, refundMethod: e.target.value as any })}
                                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="mpesa">M-Pesa</option>
                                        <option value="bank">Bank Transfer</option>
                                        <option value="store_credit">Store Credit</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={`block mb-1.5 font-bold ${textMuted}`}>Additional Notes</label>
                                <textarea
                                    value={returnData.notes}
                                    onChange={(e) => setReturnData({ ...returnData, notes: e.target.value })}
                                    placeholder="Any additional details..."
                                    rows={2}
                                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none resize-none ${inputBg}`}
                                />
                            </div>

                            <div className={`flex justify-end gap-3 pt-4 ${borderLine}`}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowReturnModal(false);
                                        setSelectedSale(null);
                                    }}
                                    className={`px-5 py-3 rounded-xl font-bold text-sm ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitReturn}
                                    disabled={isSubmitting}
                                    className="px-6 py-3 bg-[#2ea043] hover:bg-[#3fb950] text-white rounded-xl font-extrabold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50 touchTargetSmall"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            <span>Process Return</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};