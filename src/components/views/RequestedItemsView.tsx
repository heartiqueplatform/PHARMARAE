// components/views/RequestedItemsView.tsx
import React, { useState, useMemo } from 'react';
import {
    Package, Plus, Search, Filter,
    TrendingUp, Clock, CheckCircle,
    XCircle, Loader2, Edit2, Trash2,
    ArrowUp, ArrowDown, AlertCircle,
    ShoppingCart, User, Phone, Calendar,
    Tag, Star, StarOff, BarChart3,
    ChevronDown, ChevronUp, Zap,
    Target, Award, Flame, FileText
} from 'lucide-react';
import { RequestedItem, RequestedItemStatus, RequestedItemPriority } from '../../types';
import { generateMostRequestedReportPdf } from '../../utils/requestedItemsPdfGenerator'; // <-- Import the new PDF generator
interface RequestedItemsViewProps {
    requestedItems: RequestedItem[];
    pharmacyName: string | null;
    currency: string;
    theme?: 'dark' | 'light';
    isLoading?: boolean;
    onAddRequestedItem: (data: Partial<RequestedItem>) => Promise<void>;
    onUpdateRequestedItem: (id: string, data: Partial<RequestedItem>) => Promise<void>;
    onDeleteRequestedItem: (id: string) => Promise<void>;
    pharmacy: {
        name: string;
        address?: string;
        phone: string;
        currency?: string;
    };
}

export const RequestedItemsView: React.FC<RequestedItemsViewProps> = ({
    requestedItems,
    pharmacyName,
    currency,
    theme = 'dark',
    isLoading = false,
    onAddRequestedItem,
    onUpdateRequestedItem,
    onDeleteRequestedItem,
    pharmacy,
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
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterPriority, setFilterPriority] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'requests' | 'recent' | 'name'>('requests');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingItem, setEditingItem] = useState<RequestedItem | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [showStats, setShowStats] = useState(true);

    // Form state
    const [formData, setFormData] = useState<Partial<RequestedItem>>({
        item_name: '',
        generic_name: '',
        brand_name: '',
        category: '',
        form: '',
        strength: '',
        request_count: 1,
        status: 'pending',
        priority: 'medium',
        notes: '',
        requested_by: '',
        customer_phone: '',
        estimated_demand: 1,
    });

    // Get status badge config
    const getStatusConfig = (status: RequestedItemStatus) => {
        const configs = {
            pending: {
                label: 'Pending',
                bg: 'bg-amber-500/15',
                text: 'text-amber-500',
                border: 'border-amber-500/20',
                icon: Clock
            },
            ordered: {
                label: 'Ordered',
                bg: 'bg-blue-500/15',
                text: 'text-blue-400',
                border: 'border-blue-500/20',
                icon: ShoppingCart
            },
            added_to_inventory: {
                label: 'In Inventory',
                bg: 'bg-emerald-500/15',
                text: 'text-emerald-400',
                border: 'border-emerald-500/20',
                icon: CheckCircle
            },
            discontinued: {
                label: 'Discontinued',
                bg: 'bg-rose-500/15',
                text: 'text-rose-500',
                border: 'border-rose-500/20',
                icon: XCircle
            }
        };
        return configs[status] || configs.pending;
    };

    const getPriorityConfig = (priority: RequestedItemPriority) => {
        const configs = {
            urgent: {
                label: '🔥 Urgent',
                bg: 'bg-rose-500/15',
                text: 'text-rose-500',
                border: 'border-rose-500/20',
                icon: Flame
            },
            high: {
                label: '🔴 High',
                bg: 'bg-orange-500/15',
                text: 'text-orange-500',
                border: 'border-orange-500/20',
                icon: Zap
            },
            medium: {
                label: '🟡 Medium',
                bg: 'bg-amber-500/15',
                text: 'text-amber-500',
                border: 'border-amber-500/20',
                icon: Target
            },
            low: {
                label: '🟢 Low',
                bg: 'bg-gray-500/15',
                text: 'text-gray-400',
                border: 'border-gray-500/20',
                icon: Award
            }
        };
        return configs[priority] || configs.medium;
    };

    // Filter and sort items
    const filteredAndSortedItems = useMemo(() => {
        let items = [...requestedItems];

        // Filter by search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            items = items.filter(item =>
                item.item_name.toLowerCase().includes(q) ||
                (item.generic_name?.toLowerCase().includes(q)) ||
                (item.brand_name?.toLowerCase().includes(q)) ||
                (item.category?.toLowerCase().includes(q))
            );
        }

        // Filter by status
        if (filterStatus !== 'all') {
            items = items.filter(item => item.status === filterStatus);
        }

        // Filter by priority
        if (filterPriority !== 'all') {
            items = items.filter(item => item.priority === filterPriority);
        }

        // Sort
        items.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'requests':
                    comparison = (a.request_count || 0) - (b.request_count || 0);
                    break;
                case 'recent':
                    comparison = new Date(a.last_requested_at).getTime() - new Date(b.last_requested_at).getTime();
                    break;
                case 'name':
                    comparison = a.item_name.localeCompare(b.item_name);
                    break;
                default:
                    comparison = 0;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return items;
    }, [requestedItems, searchQuery, filterStatus, filterPriority, sortBy, sortOrder]);

    // Stats
    const stats = useMemo(() => {
        const total = requestedItems.length;
        const pending = requestedItems.filter(i => i.status === 'pending').length;
        const ordered = requestedItems.filter(i => i.status === 'ordered').length;
        const added = requestedItems.filter(i => i.status === 'added_to_inventory').length;
        const discontinued = requestedItems.filter(i => i.status === 'discontinued').length;
        const totalRequests = requestedItems.reduce((sum, i) => sum + (i.request_count || 0), 0);
        const urgent = requestedItems.filter(i => i.priority === 'urgent').length;
        const high = requestedItems.filter(i => i.priority === 'high').length;

        return { total, pending, ordered, added, discontinued, totalRequests, urgent, high };
    }, [requestedItems]);

    // Top requested items
    const topItems = useMemo(() => {
        return [...requestedItems]
            .sort((a, b) => (b.request_count || 0) - (a.request_count || 0))
            .slice(0, 5);
    }, [requestedItems]);

    // Handlers
    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pharmacyName) { alert('Pharmacy not found.'); return; }
        if (!formData.item_name?.trim()) { alert('Please enter an item name.'); return; }
        if (isSaving) return;

        setIsSaving(true);
        try {
            await onAddRequestedItem({
                pharmacy_name: pharmacyName,
                ...formData,
                item_name: formData.item_name.trim(),
                request_count: 1,
                last_requested_at: new Date().toISOString(),
            });
            setShowAddModal(false);
            resetForm();
        } catch (err: any) {
            alert('Error saving: ' + (err.message || err));
        } finally {
            setIsSaving(false);
        }
    };
    // Add the PDF download handler
    const handleDownloadReport = () => {
        if (!pharmacy) {
            alert('Pharmacy data not found.');
            return;
        }

        // Call the PDF generator with your data
        generateMostRequestedReportPdf(
            pharmacy,
            requestedItems,
            currency || 'KSh'
        );
    };
    const handleEditItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) { alert('No item selected.'); return; }
        if (!formData.item_name?.trim()) { alert('Please enter an item name.'); return; }
        if (isSaving) return;

        setIsSaving(true);
        try {
            await onUpdateRequestedItem(editingItem.id, {
                ...formData,
                item_name: formData.item_name.trim(),
                updated_at: new Date().toISOString(),
            });
            setShowEditModal(false);
            setEditingItem(null);
            resetForm();
        } catch (err: any) {
            alert('Error updating: ' + (err.message || err));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteItem = (id: string) => {
        setItemToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            await onDeleteRequestedItem(itemToDelete);
            setShowDeleteModal(false);
            setItemToDelete(null);
        } catch (err: any) {
            alert('Error deleting: ' + (err.message || err));
        } finally {
            setIsDeleting(false);
        }
    };

    const openEditModal = (item: RequestedItem) => {
        setEditingItem(item);
        setFormData({
            item_name: item.item_name,
            generic_name: item.generic_name || '',
            brand_name: item.brand_name || '',
            category: item.category || '',
            form: item.form || '',
            strength: item.strength || '',
            status: item.status,
            priority: item.priority,
            notes: item.notes || '',
            requested_by: item.requested_by || '',
            customer_phone: item.customer_phone || '',
            estimated_demand: item.estimated_demand || 1,
        });
        setShowEditModal(true);
    };

    const resetForm = () => {
        setFormData({
            item_name: '',
            generic_name: '',
            brand_name: '',
            category: '',
            form: '',
            strength: '',
            request_count: 1,
            status: 'pending',
            priority: 'medium',
            notes: '',
            requested_by: '',
            customer_phone: '',
            estimated_demand: 1,
        });
    };

    const incrementRequest = async (item: RequestedItem) => {
        try {
            await onUpdateRequestedItem(item.id, {
                request_count: (item.request_count || 0) + 1,
                last_requested_at: new Date().toISOString(),
            });
        } catch (err: any) {
            console.error('Error incrementing request:', err);
        }
    };

    const quickStatusUpdate = async (item: RequestedItem, newStatus: RequestedItemStatus) => {
        try {
            await onUpdateRequestedItem(item.id, {
                status: newStatus,
                updated_at: new Date().toISOString(),
                ...(newStatus === 'added_to_inventory' ? { added_to_inventory_at: new Date().toISOString() } : {}),
                ...(newStatus === 'ordered' ? { ordered_from_supplier_at: new Date().toISOString() } : {}),
            });
        } catch (err: any) {
            console.error('Error updating status:', err);
        }
    };

    const RenderStats = () => (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className={`p-3 rounded-xl ${cardBg}`}>
                <div className={`text-2xl font-bold ${textTitle}`}>{stats.total}</div>
                <div className={`text-xs ${textMuted}`}>Total Requests</div>
            </div>
            <div className={`p-3 rounded-xl ${cardBg}`}>
                <div className="text-2xl font-bold text-amber-500">{stats.pending}</div>
                <div className={`text-xs ${textMuted}`}>Pending</div>
            </div>
            <div className={`p-3 rounded-xl ${cardBg}`}>
                <div className="text-2xl font-bold text-blue-400">{stats.ordered}</div>
                <div className={`text-xs ${textMuted}`}>Ordered</div>
            </div>
            <div className={`p-3 rounded-xl ${cardBg}`}>
                <div className="text-2xl font-bold text-emerald-400">{stats.added}</div>
                <div className={`text-xs ${textMuted}`}>In Inventory</div>
            </div>
            <div className={`p-3 rounded-xl ${cardBg}`}>
                <div className="text-2xl font-bold text-rose-500">{stats.urgent}</div>
                <div className={`text-xs ${textMuted}`}>Urgent</div>
            </div>
            <div className={`p-3 rounded-xl ${cardBg}`}>
                <div className={`text-2xl font-bold ${textTitle}`}>{stats.totalRequests}</div>
                <div className={`text-xs ${textMuted}`}>Total Requests Made</div>
            </div>
        </div>
    );

    const RenderTopItems = () => (
        <div className={`p-4 rounded-xl ${cardBg}`}>
            <h4 className={`text-sm font-bold flex items-center gap-2 ${textTitle}`}>
                <Award className="w-4 h-4 text-[#2ea043]" />
                Top Requested Items
            </h4>
            <div className="mt-3 space-y-2">
                {topItems.length === 0 ? (
                    <p className={`text-xs ${textMuted}`}>No items yet</p>
                ) : (
                    topItems.map((item, index) => (
                        <div key={item.id} className={`flex items-center justify-between p-2 rounded-lg ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'}`}>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold w-5 ${index === 0 ? 'text-[#2ea043]' : index === 1 ? 'text-amber-500' : index === 2 ? 'text-orange-500' : textMuted}`}>
                                    #{index + 1}
                                </span>
                                <span className={`text-sm font-bold ${textTitle}`}>{item.item_name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs ${textMuted}`}>{item.request_count} requests</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getPriorityConfig(item.priority).bg} ${getPriorityConfig(item.priority).text}`}>
                                    {item.priority}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    // Render form fields (shared between add and edit)
    const renderFormFields = (isEdit: boolean) => (
        <div className="space-y-3 text-sm">
            <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Item Name *</label>
                <input
                    type="text"
                    required
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    placeholder="e.g. Amoxicillin 500mg"
                    className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${inputBg}`}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Generic Name</label>
                    <input
                        type="text"
                        value={formData.generic_name}
                        onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                        placeholder="e.g. Amoxicillin"
                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                    />
                </div>
                <div>
                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Brand Name</label>
                    <input
                        type="text"
                        value={formData.brand_name}
                        onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                        placeholder="e.g. Amoxil"
                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Category</label>
                    <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g. Antibiotic"
                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                    />
                </div>
                <div>
                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Form / Strength</label>
                    <input
                        type="text"
                        value={formData.strength}
                        onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                        placeholder="e.g. 500mg tablet"
                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Priority</label>
                    <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as RequestedItemPriority })}
                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                    >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </select>
                </div>
                <div>
                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Status</label>
                    <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as RequestedItemStatus })}
                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                    >
                        <option value="pending">Pending</option>
                        <option value="ordered">Ordered</option>
                        <option value="added_to_inventory">Added to Inventory</option>
                        <option value="discontinued">Discontinued</option>
                    </select>
                </div>
            </div>

            <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Notes</label>
                <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional details..."
                    rows={2}
                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none resize-none ${inputBg}`}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Requested By</label>
                    <input
                        type="text"
                        value={formData.requested_by || ''}
                        onChange={(e) => setFormData({ ...formData, requested_by: e.target.value })}
                        placeholder="Staff or customer name"
                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                    />
                </div>
                <div>
                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Customer Phone</label>
                    <input
                        type="text"
                        value={formData.customer_phone || ''}
                        onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                        placeholder="Phone number"
                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                    />
                </div>
            </div>

            <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Estimated Monthly Demand</label>
                <input
                    type="number"
                    min="1"
                    value={formData.estimated_demand || 1}
                    onChange={(e) => setFormData({ ...formData, estimated_demand: Number(e.target.value) })}
                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                />
            </div>

            <div className={`flex justify-end gap-3 pt-4 ${borderLine}`}>
                <button
                    type="button"
                    onClick={() => {
                        if (isEdit) {
                            setShowEditModal(false);
                            setEditingItem(null);
                        } else {
                            setShowAddModal(false);
                        }
                        resetForm();
                    }}
                    className={`px-5 py-3 rounded-xl font-bold text-sm ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                        }`}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-3 bg-[#2ea043] hover:bg-[#3fb950] text-white rounded-xl font-extrabold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50 touchTargetSmall"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <span>{isEdit ? 'Update Item' : 'Add Item'}</span>
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-4 px-0 md:px-4 pb-20 md:pb-6">
            {/* Header */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl shadow-sm ${cardBg}`}>
                <div>
                    <h2 className={`text-base font-extrabold flex items-center gap-2 ${textTitle}`}>
                        <TrendingUp className="w-5 h-5 text-[#2ea043]" />
                        <span>Most Requested Items</span>
                        {requestedItems.length > 0 && (
                            <span className={`text-xs font-normal px-2 py-0.5 rounded ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]'} ${textMuted}`}>
                                {requestedItems.length} items
                            </span>
                        )}
                    </h2>
                    <p className={`text-xs mt-0.5 ${textMuted}`}>
                        Track items customers frequently ask for but aren't in your inventory.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadReport}
                        className={`px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl flex items-center gap-2 transition-colors shadow-sm ${touchTargetSmall}`}
                        title="Download PDF Report"
                    >
                        <FileText className="w-5 h-5" />
                        <span>Download Report</span>
                    </button>
                    <button
                        onClick={() => setShowStats(!showStats)}
                        className={`p-2.5 rounded-xl transition-colors ${touchTargetSmall} ${isDark ? 'bg-[#21262d] hover:bg-[#30363d]' : 'bg-[#f6f8fa] hover:bg-slate-200'
                            }`}
                        title="Toggle Stats"
                    >
                        <BarChart3 className={`w-4 h-4 ${showStats ? 'text-[#2ea043]' : textMuted}`} />
                    </button>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className={`px-4 py-2.5 bg-[#2ea043] hover:bg-[#3fb950] text-white font-extrabold text-sm rounded-xl flex items-center gap-2 transition-colors shadow-sm ${touchTargetSmall}`}
                    >
                        <Plus className="w-5 h-5 stroke-[3]" />
                        <span>Add Request</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            {showStats && (
                <>
                    <RenderStats />
                    <RenderTopItems />
                </>
            )}

            {/* Filters */}
            <div className={`flex flex-col sm:flex-row gap-3 p-4 rounded-xl ${cardBg}`}>
                <div className="relative flex-1">
                    <Search className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 ${textMuted}`} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by item name, generic, brand..."
                        className={`w-full rounded-xl pl-12 pr-4 py-3.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${inputBg}`}
                    />
                </div>

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className={`rounded-xl px-4 py-3.5 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="ordered">Ordered</option>
                    <option value="added_to_inventory">In Inventory</option>
                    <option value="discontinued">Discontinued</option>
                </select>

                <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className={`rounded-xl px-4 py-3.5 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                >
                    <option value="all">All Priority</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>

                <div className="flex gap-1">
                    <button
                        onClick={() => { setSortBy('requests'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${touchTargetSmall} ${sortBy === 'requests' ? 'bg-[#2ea043] text-white' : isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-[#f6f8fa] text-slate-800 hover:bg-slate-200'
                            }`}
                    >
                        Requests {sortBy === 'requests' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </button>
                    <button
                        onClick={() => { setSortBy('recent'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${touchTargetSmall} ${sortBy === 'recent' ? 'bg-[#2ea043] text-white' : isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-[#f6f8fa] text-slate-800 hover:bg-slate-200'
                            }`}
                    >
                        Recent {sortBy === 'recent' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </button>
                </div>
            </div>

            {/* Items Table */}
            <div className={`rounded-2xl overflow-hidden shadow-sm ${cardBg}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className={`uppercase font-bold text-[11px] tracking-wider ${isDark ? 'bg-[#21262d]/80 text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'}`}>
                            <tr>
                                <th className="p-3">Item Name</th>
                                <th className="p-3">Category</th>
                                <th className="p-3 text-center">Requests</th>
                                <th className="p-3">Priority</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Last Requested</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${borderLine}`}>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className={`p-8 text-center ${textMuted}`}>
                                        <Loader2 className="w-6 h-6 animate-spin text-[#2ea043] mx-auto" />
                                        <span className="block mt-2 text-sm">Loading requested items...</span>
                                    </td>
                                </tr>
                            ) : filteredAndSortedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className={`p-8 text-center ${textMuted}`}>
                                        {requestedItems.length === 0 ? (
                                            <div className="space-y-2">
                                                <Package className="w-12 h-12 mx-auto opacity-20" />
                                                <p className="font-medium">No requested items yet</p>
                                                <p className="text-xs">Start tracking items your customers frequently ask for.</p>
                                                <button
                                                    onClick={() => setShowAddModal(true)}
                                                    className="mt-2 px-4 py-2 bg-[#2ea043] text-white rounded-xl text-sm font-bold"
                                                >
                                                    Add Your First Request
                                                </button>
                                            </div>
                                        ) : (
                                            'No items match your filters.'
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                filteredAndSortedItems.map(item => {
                                    const StatusIcon = getStatusConfig(item.status).icon;
                                    const PriorityIcon = getPriorityConfig(item.priority).icon;

                                    return (
                                        <tr key={item.id} className={`transition-colors ${isDark ? 'hover:bg-[#21262d]/50' : 'hover:bg-[#f6f8fa]'}`}>
                                            <td className={`p-3 ${textTitle}`}>
                                                <div className="font-bold">{item.item_name}</div>
                                                <div className={`text-[11px] ${textMuted}`}>
                                                    {item.generic_name || item.brand_name || 'No details'}
                                                    {item.strength && ` • ${item.strength}`}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span className="text-xs px-2 py-1 rounded bg-[#2ea043]/10 text-[#2ea043]">
                                                    {item.category || 'Uncategorized'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className={`font-bold text-lg ${item.request_count > 5 ? 'text-[#2ea043]' : textTitle}`}>
                                                        {item.request_count}
                                                    </span>
                                                    <button
                                                        onClick={() => incrementRequest(item)}
                                                        className={`p-1 rounded-lg transition-colors ${touchTargetSmall} ${isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]'}`}
                                                        title="Increment request count"
                                                    >
                                                        <Plus className="w-3 h-3 text-[#2ea043]" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded border flex items-center gap-1 w-fit ${getPriorityConfig(item.priority).bg} ${getPriorityConfig(item.priority).text} ${getPriorityConfig(item.priority).border}`}>
                                                    <PriorityIcon className="w-3 h-3" />
                                                    {getPriorityConfig(item.priority).label}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded border flex items-center gap-1 w-fit ${getStatusConfig(item.status).bg} ${getStatusConfig(item.status).text} ${getStatusConfig(item.status).border}`}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {getStatusConfig(item.status).label}
                                                    </span>
                                                    {item.status === 'pending' && (
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => quickStatusUpdate(item, 'ordered')}
                                                                className={`p-1 rounded text-[10px] ${touchTargetSmall} ${isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]'}`}
                                                                title="Mark as Ordered"
                                                            >
                                                                <ShoppingCart className="w-3 h-3 text-blue-400" />
                                                            </button>
                                                            <button
                                                                onClick={() => quickStatusUpdate(item, 'added_to_inventory')}
                                                                className={`p-1 rounded text-[10px] ${touchTargetSmall} ${isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]'}`}
                                                                title="Mark as Added to Inventory"
                                                            >
                                                                <CheckCircle className="w-3 h-3 text-emerald-400" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={`p-3 text-xs ${textMuted}`}>
                                                {new Date(item.last_requested_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(item)}
                                                        className={`p-2 text-blue-400 rounded-xl text-sm font-bold transition-colors ${touchTargetSmall} ${isDark ? 'bg-[#21262d] hover:bg-[#30363d]' : 'bg-[#f6f8fa] hover:bg-slate-200'}`}
                                                        title="Edit Item"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteItem(item.id)}
                                                        className={`p-2 text-rose-400 rounded-xl text-sm font-bold transition-colors ${touchTargetSmall} ${isDark ? 'bg-[#21262d] hover:bg-[#30363d]' : 'bg-[#f6f8fa] hover:bg-slate-200'}`}
                                                        title="Delete Item"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
                    <div className={`rounded-2xl max-w-lg w-full p-4 overflow-y-auto max-h-[95vh] shadow-2xl ${cardBg}`}>
                        <h3 className={`text-base font-bold pb-3 mb-3 ${borderLine} ${textTitle}`}>
                            <Plus className="w-5 h-5 inline-block mr-2 text-[#2ea043]" />
                            Add Requested Item
                        </h3>
                        <form onSubmit={handleAddItem}>
                            {renderFormFields(false)}
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingItem && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
                    <div className={`rounded-2xl max-w-lg w-full p-4 overflow-y-auto max-h-[95vh] shadow-2xl ${cardBg}`}>
                        <h3 className={`text-base font-bold pb-3 mb-3 ${borderLine} ${textTitle}`}>
                            <Edit2 className="w-5 h-5 inline-block mr-2 text-blue-400" />
                            Edit Item: {editingItem.item_name}
                        </h3>
                        <form onSubmit={handleEditItem}>
                            {renderFormFields(true)}
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && itemToDelete && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                    <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl ${cardBg} animate-scaleIn`}>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full bg-rose-500/15 flex items-center justify-center mb-4">
                                <AlertCircle className="w-10 h-10 text-rose-500" />
                            </div>
                            <h3 className={`text-xl font-bold ${textTitle}`}>Delete Requested Item?</h3>
                            <div className="mt-2 text-sm text-rose-500 font-bold">
                                ⚠️ This action cannot be undone
                            </div>
                            <p className={`text-sm mt-3 ${textMuted}`}>
                                You are about to permanently delete:
                            </p>
                            <p className={`mt-2 text-base font-extrabold ${textTitle} px-4 py-2 rounded-xl ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]'}`}>
                                {requestedItems.find(i => i.id === itemToDelete)?.item_name || 'Unknown Item'}
                            </p>
                            <div className={`mt-4 w-full p-3 rounded-xl ${isDark ? 'bg-rose-500/5 border border-rose-500/20' : 'bg-rose-50 border border-rose-200'}`}>
                                <p className={`text-xs ${textMuted}`}>
                                    <span className="font-bold text-rose-500">Warning:</span> All request history for this item will be lost.
                                </p>
                            </div>
                        </div>

                        <div className={`flex gap-3 pt-6 ${borderLine}`}>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setItemToDelete(null);
                                }}
                                className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                                    }`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors touchTargetSmall"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        <span>Delete Item</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS for animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: scale(0.9) translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out forwards;
                }
                .animate-scaleIn {
                    animation: scaleIn 0.25s ease-out forwards;
                }
            `}</style>
        </div>
    );
};