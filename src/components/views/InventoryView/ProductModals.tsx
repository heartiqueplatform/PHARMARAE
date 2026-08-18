// components/views/InventoryView/ProductModals.tsx
import React, { useMemo, useState } from 'react';
import { Product, ProductBatch, Category, Supplier, DosageFormType, StorageCondition } from '../../../types';
import { AlertTriangle, Loader2, Minus, Package, Plus, Save, Search, Database } from 'lucide-react';
import { COMMON_DRUGS_LIST, CommonDrug } from '../../../data/commonDrugs';

const parseNumberInput = (value: string, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getErrorMessage = (err: unknown, fallback: string) => {
    if (err instanceof Error && err.message.trim()) {
        return err.message;
    }
    return fallback;
};

interface ProductModalsProps {
    // Add Product Modal
    showAddProductModal: boolean;
    setShowAddProductModal: (show: boolean) => void;
    newProdName: string;
    setNewProdName: (val: string) => void;
    newProdGeneric: string;
    setNewProdGeneric: (val: string) => void;
    newProdBrand: string;
    setNewProdBrand: (val: string) => void;
    newProdCategory: string;
    setNewProdCategory: (val: string) => void;
    newProdForm: DosageFormType;
    setNewProdForm: (val: DosageFormType) => void;
    newProdStrength: string;
    setNewProdStrength: (val: string) => void;
    newProdBarcode: string;
    setNewProdBarcode: (val: string) => void;
    newProdPrice: number;
    setNewProdPrice: (val: number) => void;
    newProdCost: number;
    setNewProdCost: (val: number) => void;
    newProdReorder: number;
    setNewProdReorder: (val: number) => void;
    newProdRx: boolean;
    setNewProdRx: (val: boolean) => void;
    newProdQuantity: number;
    setNewProdQuantity: (val: number) => void;
    newProdSubCategory: string;
    setNewProdSubCategory: (val: string) => void;
    newProdMaterial: string;
    setNewProdMaterial: (val: string) => void;
    newProdSize: string;
    setNewProdSize: (val: string) => void;
    newProdAbsorbency: string;
    setNewProdAbsorbency: (val: string) => void;
    newProdFragrance: string;
    setNewProdFragrance: (val: string) => void;
    newProdShelf: string;
    setNewProdShelf: (val: string) => void;
    newProdBay: string;
    setNewProdBay: (val: string) => void;
    newProdRack: string;
    setNewProdRack: (val: string) => void;
    newProdZone: string;
    setNewProdZone: (val: string) => void;
    newProdBin: string;
    setNewProdBin: (val: string) => void;
    newProdCardboard: string;
    setNewProdCardboard: (val: string) => void;
    newProdStorageCondition: StorageCondition;
    setNewProdStorageCondition: (val: StorageCondition) => void;
    showDrugSuggestions: boolean;
    setShowDrugSuggestions: (val: boolean) => void;
    handleSelectCommonDrug: (drug: CommonDrug) => void;
    handleSaveProduct: (e: React.FormEvent) => Promise<void>;
    resetProductForm: () => void;
    isSavingProduct: boolean;

    // Edit Product Modal
    showEditProductModal: boolean;
    setShowEditProductModal: (show: boolean) => void;
    editingProduct: Product | null;
    setEditingProduct: (product: Product | null) => void;
    handleEditProduct: (e: React.FormEvent) => Promise<void>;

    // Add Batch Modal
    showAddBatchModal: boolean;
    setShowAddBatchModal: (show: boolean) => void;
    selectedProductForBatch: Product | null;
    setSelectedProductForBatch?: (product: Product | null) => void;
    newBatchNumber: string;
    setNewBatchNumber: (val: string) => void;
    newBatchExpiry: string;
    setNewBatchExpiry: (val: string) => void;
    newBatchQty: number;
    setNewBatchQty: (val: number) => void;
    newBatchCost: number;
    setNewBatchCost: (val: number) => void;
    newBatchPrice: number;
    setNewBatchPrice: (val: number) => void;
    newBatchSupplier: string;
    setNewBatchSupplier: (val: string) => void;
    handleSaveBatch: (e: React.FormEvent) => Promise<void>;
    isSavingBatch: boolean;

    // Adjust Batch Modal
    showAdjustBatchModal: boolean;
    setShowAdjustBatchModal: (show: boolean) => void;
    adjustingBatch: ProductBatch | null;
    setAdjustingBatch: (batch: ProductBatch | null) => void;
    adjustBatchQty: number;
    setAdjustBatchQty: (val: number) => void;
    adjustBatchReason: string;
    setAdjustBatchReason: (val: string) => void;
    handleAdjustBatch: (e: React.FormEvent) => Promise<void>;
    isAdjustingBatch: boolean;

    // Shared
    categories: Category[];
    suppliers: Supplier[];
    currency: string;
    isDark: boolean;
    cardBg: string;
    textMuted: string;
    textTitle: string;
    borderLine: string;
    inputBg: string;
    touchTargetSmall: string;
    getProductName: (productId: string) => string;
}

export const ProductModals: React.FC<ProductModalsProps> = (props) => {
    const {
        showAddProductModal,
        setShowAddProductModal,
        newProdName,
        setNewProdName,
        newProdGeneric,
        setNewProdGeneric,
        newProdBrand,
        setNewProdBrand,
        newProdCategory,
        setNewProdCategory,
        newProdForm,
        setNewProdForm,
        newProdStrength,
        setNewProdStrength,
        newProdBarcode,
        setNewProdBarcode,
        newProdPrice,
        setNewProdPrice,
        newProdCost,
        setNewProdCost,
        newProdReorder,
        setNewProdReorder,
        newProdRx,
        setNewProdRx,
        newProdQuantity,
        setNewProdQuantity,
        newProdSubCategory,
        setNewProdSubCategory,
        newProdMaterial,
        setNewProdMaterial,
        newProdSize,
        setNewProdSize,
        newProdAbsorbency,
        setNewProdAbsorbency,
        newProdFragrance,
        setNewProdFragrance,
        newProdShelf,
        setNewProdShelf,
        newProdBay,
        setNewProdBay,
        newProdRack,
        setNewProdRack,
        newProdZone,
        setNewProdZone,
        newProdBin,
        setNewProdBin,
        newProdCardboard,
        setNewProdCardboard,
        newProdStorageCondition,
        setNewProdStorageCondition,
        showDrugSuggestions,
        setShowDrugSuggestions,
        handleSelectCommonDrug,
        handleSaveProduct,
        resetProductForm,
        isSavingProduct,
        showEditProductModal,
        setShowEditProductModal,
        editingProduct,
        setEditingProduct,
        handleEditProduct,
        showAddBatchModal,
        setShowAddBatchModal,
        selectedProductForBatch,
        setSelectedProductForBatch,
        newBatchNumber,
        setNewBatchNumber,
        newBatchExpiry,
        setNewBatchExpiry,
        newBatchQty,
        setNewBatchQty,
        newBatchCost,
        setNewBatchCost,
        newBatchPrice,
        setNewBatchPrice,
        newBatchSupplier,
        setNewBatchSupplier,
        handleSaveBatch,
        isSavingBatch,
        showAdjustBatchModal,
        setShowAdjustBatchModal,
        adjustingBatch,
        setAdjustingBatch,
        adjustBatchQty,
        setAdjustBatchQty,
        adjustBatchReason,
        setAdjustBatchReason,
        handleAdjustBatch,
        isAdjustingBatch,
        categories,
        suppliers,
        currency,
        isDark,
        cardBg,
        textMuted,
        textTitle,
        borderLine,
        inputBg,
        touchTargetSmall,
        getProductName,
    } = props;

    const [formError, setFormError] = useState<string | null>(null);
    const [showDrugDatabase, setShowDrugDatabase] = useState(false);
    const [databaseSearchQuery, setDatabaseSearchQuery] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
    // Get categories from the drug list
    const drugCategories = useMemo(() => {
        const cats = new Set(COMMON_DRUGS_LIST.map(d => d.category_name));
        return Array.from(cats);
    }, []);

    // Filter drugs from database with category filter
    const filteredDrugs = useMemo(() => {
        if (!databaseSearchQuery.trim() || databaseSearchQuery.length < 2) {
            return [];
        }
        const query = databaseSearchQuery.toLowerCase().trim();

        let results = COMMON_DRUGS_LIST.filter(drug =>
            drug.name.toLowerCase().includes(query) ||
            drug.generic_name.toLowerCase().includes(query) ||
            drug.brand.toLowerCase().includes(query) ||
            drug.category_name.toLowerCase().includes(query)
        );

        // Apply category filter
        if (selectedCategoryFilter !== 'all') {
            results = results.filter(drug => drug.category_name === selectedCategoryFilter);
        }

        return results.slice(0, 20);
    }, [databaseSearchQuery, selectedCategoryFilter]);
    // Featured/quick access drugs
    const featuredDrugs = useMemo(() => COMMON_DRUGS_LIST.slice(0, 8), []);

    // Search suggestions for the main search
    const filteredDrugSuggestions = useMemo(() => {
        const query = newProdName.trim().toLowerCase();

        if (!query || query.length < 2) {
            return [];
        }

        return COMMON_DRUGS_LIST.filter((drug) => {
            return (
                drug.name.toLowerCase().includes(query) ||
                drug.generic_name.toLowerCase().includes(query) ||
                drug.brand.toLowerCase().includes(query)
            );
        }).slice(0, 8);
    }, [newProdName]);

    const closeProductModal = (isEdit: boolean) => {
        setFormError(null);
        resetProductForm();

        if (isEdit) {
            setShowEditProductModal(false);
            setEditingProduct(null);
            return;
        }

        setShowAddProductModal(false);
    };

    const closeBatchModal = () => {
        setFormError(null);
        setShowAddBatchModal(false);
        setSelectedProductForBatch?.(null);
        setNewBatchNumber('');
        setNewBatchExpiry('');
        setNewBatchQty(100);
        setNewBatchCost(0);
        setNewBatchPrice(0);
        setNewBatchSupplier('');
    };

    const closeAdjustBatchModal = () => {
        setFormError(null);
        setShowAdjustBatchModal(false);
        setAdjustingBatch(null);
        setAdjustBatchQty(0);
        setAdjustBatchReason('');
    };

    const submitWithFallback = async (
        e: React.FormEvent,
        action: (event: React.FormEvent) => Promise<void>,
        fallbackMessage: string
    ) => {
        e.preventDefault();
        setFormError(null);

        try {
            await action(e);
        } catch (err) {
            setFormError(getErrorMessage(err, fallbackMessage));
        }
    };

    const ErrorBanner = () => {
        if (!formError) {
            return null;
        }

        return (
            <div className={`mb-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${isDark
                ? 'border-rose-400/30 bg-rose-950/30 text-rose-100'
                : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}>
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{formError}</span>
            </div>
        );
    };

    // Product Form Render Helper
    const renderProductForm = (isEdit: boolean) => (
        <div className="space-y-3 text-sm">
            {/* Database Quick Access - NEW and IMPROVED */}
            {/* Database Quick Access - With Always Visible Search */}
            <div className={`p-3 rounded-xl space-y-3 ${isDark ? 'bg-[#21262d]/60' : 'bg-[#f6f8fa]'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-[#2ea043]" />
                        <span className="text-[12px] font-extrabold text-[#2ea043]">Search Database</span>
                        <span className={`text-[10px] ${textMuted}`}>
                            ({COMMON_DRUGS_LIST.length} items)
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowDrugDatabase(!showDrugDatabase)}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'bg-[#161b22] hover:bg-[#30363d]' : 'bg-white hover:bg-gray-200'
                            }`}
                    >
                        {showDrugDatabase ? 'Hide Results' : 'Show Results'}
                    </button>
                </div>

                {/* ALWAYS VISIBLE SEARCH BAR */}
                <div className="relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
                    <input
                        type="text"
                        value={databaseSearchQuery}
                        onChange={(e) => {
                            setDatabaseSearchQuery(e.target.value);
                            setShowDrugDatabase(true);
                        }}
                        onFocus={() => setShowDrugDatabase(true)}
                        placeholder="Search by name, brand, generic, or category..."
                        className={`w-full pl-9 pr-9 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${isDark ? 'bg-[#0d1117] text-white' : 'bg-white text-gray-900'
                            }`}
                    />
                    {databaseSearchQuery && (
                        <button
                            type="button"
                            onClick={() => {
                                setDatabaseSearchQuery('');
                                setShowDrugDatabase(false);
                            }}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded ${isDark ? 'hover:bg-[#21262d]' : 'hover:bg-gray-200'
                                } ${textMuted}`}
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Category Filter Pills - Always Visible */}
                <div className="flex flex-wrap gap-1.5">
                    <button
                        type="button"
                        onClick={() => setSelectedCategoryFilter('all')}
                        className={`px-2.5 py-1 text-[9px] rounded-full transition-colors whitespace-nowrap ${selectedCategoryFilter === 'all'
                            ? 'bg-[#2ea043] text-white'
                            : isDark ? 'bg-[#161b22] hover:bg-[#2ea043]/20 text-[#c9d1d9]' : 'bg-white hover:bg-[#2ea043]/10 text-[#1f2328]'
                            }`}
                    >
                        All
                    </button>
                    {['Analgesics & Pain Relievers', 'Antibiotics & Antimicrobials', 'Medical Supplies', 'Antihypertensives', 'Gastrointestinal Care', 'Vitamins & Supplements', 'Antidiabetics', 'Antimalarials'].slice(0, 6).map(cat => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategoryFilter(cat)}
                            className={`px-2.5 py-1 text-[9px] rounded-full transition-colors whitespace-nowrap ${selectedCategoryFilter === cat
                                ? 'bg-[#2ea043] text-white'
                                : isDark ? 'bg-[#161b22] hover:bg-[#2ea043]/20 text-[#c9d1d9]' : 'bg-white hover:bg-[#2ea043]/10 text-[#1f2328]'
                                }`}
                        >
                            {cat.replace(' &', '').split(' ').slice(0, 2).join(' ')}
                        </button>
                    ))}
                </div>

                {/* Results - Only show when there are results */}
                {showDrugDatabase && databaseSearchQuery.length >= 2 && (
                    <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-[#161b22]' : 'bg-white'}`}>
                        {/* Results count */}
                        {databaseSearchQuery.length >= 2 && (
                            <div className={`px-3 pt-2 text-[10px] ${textMuted}`}>
                                {filteredDrugs.length} results found
                            </div>
                        )}

                        {/* Results List */}
                        {filteredDrugs.length > 0 && (
                            <div className="max-h-64 overflow-y-auto divide-y divide-gray-700/30">
                                {filteredDrugs.map((drug) => (
                                    <button
                                        key={`${drug.name}-${drug.brand}`}
                                        type="button"
                                        onClick={() => {
                                            setFormError(null);
                                            handleSelectCommonDrug(drug);
                                            setShowDrugDatabase(false);
                                            setDatabaseSearchQuery('');
                                            setSelectedCategoryFilter('all');
                                        }}
                                        className={`w-full p-3 text-left text-sm transition-colors ${isDark ? 'hover:bg-[#21262d]' : 'hover:bg-gray-100'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`font-bold ${textTitle}`}>{drug.name}</span>
                                                    {drug.prescription_required && (
                                                        <span className="text-[8px] font-bold text-amber-500 bg-amber-500/15 px-1.5 py-0.5 rounded">
                                                            Rx
                                                        </span>
                                                    )}
                                                </div>
                                                <div className={`text-xs ${textMuted}`}>
                                                    {drug.generic_name} • {drug.brand}
                                                </div>
                                                <div className={`text-[10px] ${textMuted} flex items-center gap-2 flex-wrap mt-0.5`}>
                                                    <span className="capitalize">{drug.form}</span>
                                                    <span>•</span>
                                                    <span>{drug.strength}</span>
                                                    <span>•</span>
                                                    <span className="text-[#2ea043]">{drug.category_name}</span>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-3">
                                                <div className="text-[#2ea043] font-bold text-sm">
                                                    {currency} {drug.default_selling_price}
                                                </div>
                                                <div className={`text-[9px] ${textMuted}`}>
                                                    Cost: {currency} {drug.default_cost_price}
                                                </div>
                                                <div className={`text-[9px] ${textMuted} mt-0.5 px-2 py-0.5 rounded ${isDark ? 'bg-[#0d1117]' : 'bg-gray-200'
                                                    }`}>
                                                    Click to fill
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {filteredDrugs.length === 0 && (
                            <div className={`p-4 text-center text-sm ${textMuted}`}>
                                No items found. Try a different search term.
                            </div>
                        )}
                    </div>
                )}

                {/* Show hint when typing but results hidden */}
                {databaseSearchQuery.length >= 2 && !showDrugDatabase && (
                    <div className={`text-center text-xs ${textMuted} py-1`}>
                        Click "Show Results" or press Enter to see matches
                    </div>
                )}

                {/* Show initial hint */}
                {!databaseSearchQuery && (
                    <div className={`text-center text-xs ${textMuted} py-1`}>
                        Start typing to search {COMMON_DRUGS_LIST.length} items...
                    </div>
                )}
            </div>
            {/* Product Name */}
            <div className="relative">
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Product Name *</label>
                <input
                    type="text"
                    required
                    value={newProdName}
                    onFocus={() => setShowDrugSuggestions(true)}
                    onChange={(e) => {
                        setNewProdName(e.target.value);
                        setShowDrugSuggestions(true);
                    }}
                    placeholder="Type product name..."
                    className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${inputBg}`}
                />
                {showDrugSuggestions && newProdName.trim().length >= 2 && (
                    <div className={`absolute left-0 right-0 top-full mt-1 rounded-xl shadow-xl z-[999] max-h-56 overflow-y-auto divide-y ${cardBg}`}>
                        {filteredDrugSuggestions.map(d => (
                            <button
                                key={`${d.name}-${d.brand}`}
                                type="button"
                                onClick={() => {
                                    setFormError(null);
                                    handleSelectCommonDrug(d);
                                    setShowDrugSuggestions(false);
                                }}
                                className={`w-full p-3 text-left flex items-center justify-between text-sm transition-colors ${touchTargetSmall} ${isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]'
                                    }`}
                            >
                                <div>
                                    <div className={`font-bold ${textTitle}`}>{d.name}</div>
                                    <div className={`text-[11px] ${textMuted}`}>{d.generic_name} - {d.brand} ({d.form})</div>
                                </div>
                                <div className="text-right text-[11px]">
                                    <span className="text-[#2ea043] font-bold">{currency} {d.default_selling_price}</span>
                                    <span className={`block ${textMuted}`}>{d.category_name}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Generic & Brand */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Generic Name</label>
                    <input
                        type="text"
                        value={newProdGeneric}
                        onChange={(e) => setNewProdGeneric(e.target.value)}
                        placeholder="e.g. Acetaminophen"
                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                    />
                </div>
                <div>
                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Brand Name</label>
                    <input
                        type="text"
                        value={newProdBrand}
                        onChange={(e) => setNewProdBrand(e.target.value)}
                        placeholder="e.g. Panadol Extra"
                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                    />
                </div>
            </div>

            {/* Form & Category */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Dosage Form</label>
                    <select
                        value={newProdForm}
                        onChange={(e) => setNewProdForm(e.target.value as DosageFormType)}
                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                    >
                        <option value="tablet">Tablet</option>
                        <option value="capsule">Capsule</option>
                        <option value="syrup">Syrup</option>
                        <option value="liquid">Liquid</option>
                        <option value="injection">Injection</option>
                        <option value="cream">Cream</option>
                        <option value="ointment">Ointment</option>
                        <option value="bandage">Bandage</option>
                        <option value="sanitary_pad">Sanitary Pad</option>
                        <option value="cotton_wool">Cotton Wool</option>
                        <option value="medical_device">Medical Device</option>
                        <option value="supplement">Supplement</option>
                        <option value="equipment">Medical Equipment</option>
                    </select>
                </div>
                <div>
                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Product Category</label>
                    <select
                        value={newProdCategory}
                        onChange={(e) => setNewProdCategory(e.target.value)}
                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                    >
                        <option value="">Select Category</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Sub-Category */}
            <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Sub-Category</label>
                <select
                    value={newProdSubCategory}
                    onChange={(e) => setNewProdSubCategory(e.target.value)}
                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                >
                    <option value="">Select Sub-Category</option>
                    <option value="feminine_hygiene">Feminine Hygiene</option>
                    <option value="wound_care">Wound Care</option>
                    <option value="personal_care">Personal Care</option>
                    <option value="baby_care">Baby Care</option>
                    <option value="first_aid">First Aid</option>
                    <option value="diagnostic">Diagnostic</option>
                    <option value="nutritional">Nutritional</option>
                    <option value="respiratory">Respiratory</option>
                    <option value="cardiovascular">Cardiovascular</option>
                    <option value="pain_relief">Pain Relief</option>
                </select>
            </div>

            {/* Storage Location */}
            <div className={`p-4 rounded-xl space-y-3 ${isDark ? 'bg-[#21262d]/60' : 'bg-[#f6f8fa]'}`}>
                <h4 className={`text-sm font-bold ${textTitle}`}>
                    <Package className="w-4 h-4 inline-block mr-2" />
                    Storage Location
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={`block mb-1.5 font-bold ${textMuted}`}>Zone</label>
                        <select
                            value={newProdZone}
                            onChange={(e) => setNewProdZone(e.target.value)}
                            className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                        >
                            <option value="">Select Zone</option>
                            <option value="A">Zone A</option><option value="B">Zone B</option>
                            <option value="C">Zone C</option><option value="D">Zone D</option>
                            <option value="Cold-Room">Cold Room</option>
                            <option value="Fridge">Fridge</option>
                            <option value="Freezer">Freezer</option>
                            <option value="Controlled">Controlled Storage</option>
                        </select>
                    </div>
                    <div>
                        <label className={`block mb-1.5 font-bold ${textMuted}`}>Bay / Aisle</label>
                        <input
                            type="text"
                            value={newProdBay}
                            onChange={(e) => setNewProdBay(e.target.value)}
                            placeholder="e.g. Bay-2, Aisle-B"
                            className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={`block mb-1.5 font-bold ${textMuted}`}>Rack</label>
                        <input
                            type="text"
                            value={newProdRack}
                            onChange={(e) => setNewProdRack(e.target.value)}
                            placeholder="e.g. Rack-3"
                            className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                        />
                    </div>
                    <div>
                        <label className={`block mb-1.5 font-bold ${textMuted}`}>Shelf Number</label>
                        <input
                            type="text"
                            value={newProdShelf}
                            onChange={(e) => setNewProdShelf(e.target.value)}
                            placeholder="e.g. Shelf-3A"
                            className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={`block mb-1.5 font-bold ${textMuted}`}>Bin Number</label>
                        <input
                            type="text"
                            value={newProdBin}
                            onChange={(e) => setNewProdBin(e.target.value)}
                            placeholder="e.g. BIN-007"
                            className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                        />
                    </div>
                    <div>
                        <label className={`block mb-1.5 font-bold ${textMuted}`}>Cardboard Box ID</label>
                        <input
                            type="text"
                            value={newProdCardboard}
                            onChange={(e) => setNewProdCardboard(e.target.value)}
                            placeholder="e.g. BOX-2026-01"
                            className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                        />
                    </div>
                </div>
                <div>
                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Storage Condition</label>
                    <select
                        value={newProdStorageCondition}
                        onChange={(e) => setNewProdStorageCondition(e.target.value as StorageCondition)}
                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                    >
                        <option value="room_temperature">Room Temperature</option>
                        <option value="refrigerated">Refrigerated (2-8 C)</option>
                        <option value="frozen">Frozen (-20 C)</option>
                        <option value="cold_chain">Cold Chain</option>
                        <option value="controlled">Controlled Storage</option>
                        <option value="ambient">Ambient</option>
                    </select>
                </div>
            </div>

            {/* Product Specs for sanitary/cotton */}
            {(newProdForm === 'sanitary_pad' || newProdForm === 'cotton_wool') && (
                <div className={`p-4 rounded-xl space-y-3 ${isDark ? 'bg-[#21262d]/60' : 'bg-[#f6f8fa]'}`}>
                    <h4 className={`text-sm font-bold ${textTitle}`}>Product Specifications</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={`block mb-1.5 font-bold ${textMuted}`}>Material</label>
                            <select
                                value={newProdMaterial}
                                onChange={(e) => setNewProdMaterial(e.target.value)}
                                className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                            >
                                <option value="">Select Material</option>
                                <option value="100% cotton">100% Cotton</option>
                                <option value="organic cotton">Organic Cotton</option>
                                <option value="cotton_blend">Cotton Blend</option>
                                <option value="synthetic">Synthetic</option>
                                <option value="bamboo_fiber">Bamboo Fiber</option>
                            </select>
                        </div>
                        <div>
                            <label className={`block mb-1.5 font-bold ${textMuted}`}>Size / Pack</label>
                            <input
                                type="text"
                                value={newProdSize}
                                onChange={(e) => setNewProdSize(e.target.value)}
                                placeholder="e.g. Regular, 10 pack"
                                className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                            />
                        </div>
                    </div>
                    {newProdForm === 'sanitary_pad' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={`block mb-1.5 font-bold ${textMuted}`}>Absorbency</label>
                                <select
                                    value={newProdAbsorbency}
                                    onChange={(e) => setNewProdAbsorbency(e.target.value)}
                                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                                >
                                    <option value="">Select Absorbency</option>
                                    <option value="light">Light</option>
                                    <option value="regular">Regular</option>
                                    <option value="super">Super</option>
                                    <option value="super_plus">Super Plus</option>
                                    <option value="overnight">Overnight</option>
                                </select>
                            </div>
                            <div>
                                <label className={`block mb-1.5 font-bold ${textMuted}`}>Fragrance</label>
                                <select
                                    value={newProdFragrance}
                                    onChange={(e) => setNewProdFragrance(e.target.value)}
                                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                                >
                                    <option value="">Select Option</option>
                                    <option value="unscented">Unscented</option>
                                    <option value="lightly_scented">Lightly Scented</option>
                                    <option value="scented">Scented</option>
                                    <option value="natural">Natural</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Strength & Barcode */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Strength</label>
                    <input
                        type="text"
                        value={newProdStrength}
                        onChange={(e) => setNewProdStrength(e.target.value)}
                        placeholder="e.g. 500mg"
                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                    />
                </div>
                <div>
                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Barcode / SKU</label>
                    <input
                        type="text"
                        value={newProdBarcode}
                        onChange={(e) => setNewProdBarcode(e.target.value)}
                        placeholder="Barcode string"
                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none font-mono ${inputBg} ${touchTargetSmall}`}
                    />
                </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Selling Price *</label>
                    <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={newProdPrice || ''}
                        onChange={(e) => setNewProdPrice(parseNumberInput(e.target.value))}
                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                    />
                </div>
                <div>
                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Cost Price</label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newProdCost || ''}
                        onChange={(e) => setNewProdCost(parseNumberInput(e.target.value))}
                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                    />
                </div>
                <div>
                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Reorder Level</label>
                    <input
                        type="number"
                        value={newProdReorder}
                        onChange={(e) => setNewProdReorder(parseNumberInput(e.target.value))}
                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                    />
                </div>
            </div>

            {/* Stock & Rx */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Initial Stock</label>
                    <input
                        type="number"
                        min="0"
                        value={newProdQuantity || ''}
                        onChange={(e) => setNewProdQuantity(parseNumberInput(e.target.value))}
                        placeholder="0"
                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                    />
                </div>
                <div className="flex items-center gap-3 pt-3">
                    <input
                        type="checkbox"
                        id="rx-flag"
                        checked={newProdRx}
                        onChange={(e) => setNewProdRx(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-[#2ea043] focus:ring-0"
                    />
                    <label htmlFor="rx-flag" className={`font-semibold ${textTitle}`}>Rx Required</label>
                </div>
            </div>

            {/* Actions */}
            <div className={`flex justify-end gap-3 pt-4 ${borderLine}`}>
                <button
                    type="button"
                    onClick={() => closeProductModal(isEdit)}
                    className={`px-5 py-3 rounded-xl font-bold text-sm ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                        }`}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSavingProduct}
                    aria-busy={isSavingProduct}
                    className={`px-6 py-3 bg-[#2ea043] hover:bg-[#3fb950] text-white rounded-xl font-extrabold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50 ${touchTargetSmall}`}
                >
                    {isSavingProduct ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <span>{isEdit ? 'Update Product' : 'Save Product'}</span>
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Add Product Modal */}
            {showAddProductModal && (
                <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
                    <div className={`rounded-2xl max-w-lg w-full p-4 overflow-y-auto max-h-[95vh] shadow-2xl ${cardBg}`}>
                        <h3 className={`text-base font-bold pb-3 mb-3 ${borderLine} ${textTitle}`}>Add New Product</h3>
                        <ErrorBanner />
                        <form onSubmit={(e) => submitWithFallback(e, handleSaveProduct, 'Product could not be saved. Check the product details and try again.')}>
                            {renderProductForm(false)}
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Product Modal */}
            {showEditProductModal && editingProduct && (
                <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
                    <div className={`rounded-2xl max-w-lg w-full p-4 overflow-y-auto max-h-[95vh] shadow-2xl ${cardBg}`}>
                        <h3 className={`text-base font-bold pb-3 mb-3 ${borderLine} ${textTitle}`}>
                            Edit Product: {editingProduct.name}
                        </h3>
                        <ErrorBanner />
                        <form onSubmit={(e) => submitWithFallback(e, handleEditProduct, 'Product changes could not be saved. Check the product details and try again.')}>
                            {renderProductForm(true)}
                        </form>
                    </div>
                </div>
            )}

            {/* Add Batch Modal */}
            {showAddBatchModal && selectedProductForBatch && (
                <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
                    <div className={`rounded-2xl max-w-md w-full p-4 overflow-y-auto shadow-2xl ${cardBg}`}>
                        <h3 className={`text-base font-bold pb-3 mb-3 ${borderLine} ${textTitle}`}>
                            Receive New Batch: {selectedProductForBatch.name}
                        </h3>
                        <ErrorBanner />
                        <form onSubmit={(e) => submitWithFallback(e, handleSaveBatch, 'Batch could not be saved. Check batch number, expiry, quantity, and prices.')} className="space-y-3 text-sm">
                            <div>
                                <label className={`block mb-1.5 font-bold ${textMuted}`}>Batch Number *</label>
                                <input
                                    type="text"
                                    required
                                    value={newBatchNumber}
                                    onChange={(e) => setNewBatchNumber(e.target.value)}
                                    placeholder="e.g. BATCH-2026-X"
                                    className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none font-mono ${inputBg}`}
                                />
                            </div>
                            <div>
                                <label className={`block mb-1.5 font-bold ${textMuted}`}>Expiry Date *</label>
                                <input
                                    type="date"
                                    required
                                    value={newBatchExpiry}
                                    onChange={(e) => setNewBatchExpiry(e.target.value)}
                                    className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none ${inputBg}`}
                                />
                            </div>
                            <div>
                                <label className={`block mb-1.5 font-bold ${textMuted}`}>Quantity *</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={newBatchQty}
                                    onChange={(e) => setNewBatchQty(parseNumberInput(e.target.value, 1))}
                                    className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none font-bold text-[#2ea043] ${inputBg}`}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Cost Price ({currency})</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={newBatchCost || selectedProductForBatch.purchase_price || ''}
                                        onChange={(e) => setNewBatchCost(parseNumberInput(e.target.value))}
                                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                                    />
                                </div>
                                <div>
                                    <label className={`block mb-1.5 font-bold ${textMuted}`}>Selling Price ({currency})</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={newBatchPrice || selectedProductForBatch.selling_price || ''}
                                        onChange={(e) => setNewBatchPrice(parseNumberInput(e.target.value))}
                                        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={`block mb-1.5 font-bold ${textMuted}`}>Supplier</label>
                                <select
                                    value={newBatchSupplier}
                                    onChange={(e) => setNewBatchSupplier(e.target.value)}
                                    className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none ${inputBg}`}
                                >
                                    <option value="">Select Supplier (Optional)</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={`flex justify-end gap-3 pt-4 ${borderLine}`}>
                                <button
                                    type="button"
                                    onClick={closeBatchModal}
                                    className={`px-5 py-3 rounded-xl font-bold text-sm ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                                        }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingBatch}
                                    aria-busy={isSavingBatch}
                                    className={`px-6 py-3 bg-[#2ea043] hover:bg-[#3fb950] text-white rounded-xl font-extrabold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50 ${touchTargetSmall}`}
                                >
                                    {isSavingBatch ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>Save Batch</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Adjust Batch Modal */}
            {showAdjustBatchModal && adjustingBatch && (
                <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
                    <div className={`rounded-2xl max-w-md w-full p-4 overflow-y-auto shadow-2xl ${cardBg}`}>
                        <h3 className={`text-base font-bold pb-3 mb-3 ${borderLine} ${textTitle}`}>Adjust Batch Quantity</h3>
                        <ErrorBanner />
                        <div className={`mb-4 p-3 rounded-xl ${isDark ? 'bg-[#21262d]/60' : 'bg-[#f6f8fa]'}`}>
                            <div className="text-sm">
                                <div className="flex justify-between"><span className={textMuted}>Product:</span><span className={textTitle}>{getProductName(adjustingBatch.product_id)}</span></div>
                                <div className="flex justify-between mt-1"><span className={textMuted}>Batch Number:</span><span className="font-mono text-[#2ea043]">{adjustingBatch.batch_number}</span></div>
                                <div className="flex justify-between mt-1"><span className={textMuted}>Current Stock:</span><span className={`font-bold ${textTitle}`}>{adjustingBatch.quantity_base} units</span></div>
                                <div className="flex justify-between mt-1"><span className={textMuted}>Expiry Date:</span><span className="text-amber-500">{adjustingBatch.expiry_date}</span></div>
                            </div>
                        </div>
                        <form onSubmit={(e) => submitWithFallback(e, handleAdjustBatch, 'Batch quantity could not be adjusted. Check the quantity and reason.')} className="space-y-3 text-sm">
                            <div>
                                <label className={`block mb-1.5 font-bold ${textMuted}`}>
                                    Quantity Adjustment <span className="text-xs font-normal">(positive = add, negative = subtract)</span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    value={adjustBatchQty}
                                    onChange={(e) => setAdjustBatchQty(parseNumberInput(e.target.value))}
                                    placeholder="e.g. 10 or -5"
                                    className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none font-bold ${inputBg}`}
                                />
                                <div className="flex gap-2 mt-2 flex-wrap">
                                    {[1, 5, 10].map(v => (
                                        <button key={v} type="button" onClick={() => setAdjustBatchQty(v)} className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-lg ${isDark ? 'bg-[#21262d] hover:bg-[#30363d]' : 'bg-slate-200 hover:bg-slate-300'
                                            }`}>
                                            <Plus className="h-3 w-3" />
                                            <span>{v}</span>
                                        </button>
                                    ))}
                                    {[-1, -5, -10].map(v => (
                                        <button key={v} type="button" onClick={() => setAdjustBatchQty(v)} className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-lg ${isDark ? 'bg-[#21262d] hover:bg-[#30363d]' : 'bg-slate-200 hover:bg-slate-300'
                                            }`}>
                                            <Minus className="h-3 w-3" />
                                            <span>{Math.abs(v)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className={`block mb-1.5 font-bold ${textMuted}`}>Reason for Adjustment *</label>
                                <input
                                    type="text"
                                    required
                                    value={adjustBatchReason}
                                    onChange={(e) => setAdjustBatchReason(e.target.value)}
                                    placeholder="e.g. Damaged goods, Stock correction"
                                    className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none ${inputBg}`}
                                />
                            </div>
                            <div className={`flex justify-end gap-3 pt-4 ${borderLine}`}>
                                <button
                                    type="button"
                                    onClick={closeAdjustBatchModal}
                                    className={`px-5 py-3 rounded-xl font-bold text-sm ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                                        }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isAdjustingBatch || adjustBatchQty === 0}
                                    aria-busy={isAdjustingBatch}
                                    className={`px-6 py-3 rounded-xl font-extrabold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50 ${touchTargetSmall} ${adjustBatchQty > 0 ? 'bg-[#2ea043] hover:bg-[#3fb950] text-white' :
                                        adjustBatchQty < 0 ? 'bg-rose-500 hover:bg-rose-600 text-white' :
                                            'bg-gray-500 text-white cursor-not-allowed'
                                        }`}
                                >
                                    {isAdjustingBatch ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>{adjustBatchQty > 0 ? 'Add' : adjustBatchQty < 0 ? 'Subtract' : 'Adjust'} Quantity</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};