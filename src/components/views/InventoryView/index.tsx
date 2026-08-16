// components/views/InventoryView/index.tsx
import React, { useState } from 'react';
import { Pharmacy, Product, ProductBatch, Category, Supplier, Unit, StockMovement, DosageFormType, StorageCondition } from '../../../types';
import { Package, Plus, Layers, ArrowUpRight, ArrowDownRight, Loader2, Trash2, AlertTriangle, X } from 'lucide-react';
import { ProductCatalog } from './ProductCatalog';
import { ProductModals } from './ProductModals';
import { COMMON_DRUGS_LIST, CommonDrug } from '../../../data/commonDrugs';

interface InventoryViewProps {
    pharmacy: Pharmacy | null;
    products: Product[];
    batches: ProductBatch[];
    categories: Category[];
    suppliers: Supplier[];
    units: Unit[];
    movements: StockMovement[];
    onAddProduct: (productData: Partial<Product>) => Promise<void>;
    onAddBatch: (batchData: Partial<ProductBatch>) => Promise<void>;
    onUpdateProduct?: (productId: string, productData: Partial<Product>) => Promise<void>;
    onDeleteProduct?: (productId: string) => Promise<void>;
    onUpdateBatch?: (batchId: string, batchData: Partial<ProductBatch>) => Promise<void>;
    theme?: 'dark' | 'light';
    isLoading?: boolean;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
    pharmacy,
    products,
    batches,
    categories,
    suppliers,
    units,
    movements,
    onAddProduct,
    onAddBatch,
    onUpdateProduct,
    onDeleteProduct,
    onUpdateBatch,
    theme = 'dark',
    isLoading = false,
}) => {
    const currency = pharmacy?.currency || 'KSh';
    const isDark = theme === 'dark';

    // Theme variables
    const cardBg = isDark ? 'bg-[#161b22] text-[#c9d1d9]' : 'bg-white text-[#1f2328] shadow-sm';
    const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
    const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
    const borderLine = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';
    const inputBg = isDark ? 'bg-[#0d1117] text-[#f0f6fc]' : 'bg-[#f6f8fa] text-[#1f2328]';
    const touchTarget = 'min-h-[44px] min-w-[44px]';
    const touchTargetSmall = 'min-h-[36px] min-w-[36px]';
    const skeletonBg = isDark ? 'bg-[#21262d]' : 'bg-[#e8eaed]';
    const skeletonLight = isDark ? 'bg-[#30363d]' : 'bg-[#d0d7de]';

    // Tabs
    const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'batches' | 'movements'>('catalog');

    // Modal states
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [showEditProductModal, setShowEditProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showAddBatchModal, setShowAddBatchModal] = useState(false);
    const [selectedProductForBatch, setSelectedProductForBatch] = useState<Product | null>(null);
    const [showAdjustBatchModal, setShowAdjustBatchModal] = useState(false);
    const [adjustingBatch, setAdjustingBatch] = useState<ProductBatch | null>(null);
    const [adjustBatchQty, setAdjustBatchQty] = useState<number>(0);
    const [adjustBatchReason, setAdjustBatchReason] = useState<string>('');
    const [isAdjustingBatch, setIsAdjustingBatch] = useState(false);
    const [isSavingProduct, setIsSavingProduct] = useState(false);
    const [isSavingBatch, setIsSavingBatch] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDrugSuggestions, setShowDrugSuggestions] = useState(false);

    // Delete confirmation modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [productToDelete, setProductToDelete] = useState<string | null>(null);

    // Product form state
    const [newProdName, setNewProdName] = useState('');
    const [newProdGeneric, setNewProdGeneric] = useState('');
    const [newProdBrand, setNewProdBrand] = useState('');
    const [newProdCategory, setNewProdCategory] = useState('');
    const [newProdForm, setNewProdForm] = useState<DosageFormType>('tablet');
    const [newProdStrength, setNewProdStrength] = useState('');
    const [newProdBarcode, setNewProdBarcode] = useState('');
    const [newProdPrice, setNewProdPrice] = useState<number>(0);
    const [newProdCost, setNewProdCost] = useState<number>(0);
    const [newProdReorder, setNewProdReorder] = useState<number>(10);
    const [newProdRx, setNewProdRx] = useState(false);
    const [newProdQuantity, setNewProdQuantity] = useState<number>(0);
    const [newProdSubCategory, setNewProdSubCategory] = useState('');
    const [newProdMaterial, setNewProdMaterial] = useState('');
    const [newProdSize, setNewProdSize] = useState('');
    const [newProdAbsorbency, setNewProdAbsorbency] = useState('');
    const [newProdFragrance, setNewProdFragrance] = useState('');
    const [newProdShelf, setNewProdShelf] = useState('');
    const [newProdBay, setNewProdBay] = useState('');
    const [newProdRack, setNewProdRack] = useState('');
    const [newProdZone, setNewProdZone] = useState('');
    const [newProdBin, setNewProdBin] = useState('');
    const [newProdCardboard, setNewProdCardboard] = useState('');
    const [newProdStorageCondition, setNewProdStorageCondition] = useState<StorageCondition>('room_temperature');

    // Batch form state
    const [newBatchNumber, setNewBatchNumber] = useState('');
    const [newBatchExpiry, setNewBatchExpiry] = useState('');
    const [newBatchQty, setNewBatchQty] = useState<number>(100);
    const [newBatchCost, setNewBatchCost] = useState<number>(0);
    const [newBatchPrice, setNewBatchPrice] = useState<number>(0);
    const [newBatchSupplier, setNewBatchSupplier] = useState('');

    // Helpers
    const getProductName = (productId: string) => {
        const product = products.find(p => p.id === productId);
        return product?.name || 'Unknown Product';
    };

    const getProductById = (productId: string) => {
        return products.find(p => p.id === productId);
    };

    const resetProductForm = () => {
        setNewProdName('');
        setNewProdGeneric('');
        setNewProdBrand('');
        setNewProdBarcode('');
        setNewProdPrice(0);
        setNewProdCost(0);
        setNewProdReorder(10);
        setNewProdRx(false);
        setNewProdCategory('');
        setNewProdForm('tablet');
        setNewProdStrength('');
        setNewProdQuantity(0);
        setNewProdSubCategory('');
        setNewProdMaterial('');
        setNewProdSize('');
        setNewProdAbsorbency('');
        setNewProdFragrance('');
        setNewProdShelf('');
        setNewProdBay('');
        setNewProdRack('');
        setNewProdZone('');
        setNewProdBin('');
        setNewProdCardboard('');
        setNewProdStorageCondition('room_temperature');
    };

    // Handlers
    const handleSelectCommonDrug = (drug: CommonDrug) => {
        setNewProdName(drug.name);
        setNewProdGeneric(drug.generic_name);
        setNewProdBrand(drug.brand);
        setNewProdForm(drug.form);
        setNewProdStrength(drug.strength);
        setNewProdCost(drug.default_cost_price);
        setNewProdPrice(drug.default_selling_price);
        setNewProdRx(drug.prescription_required);
        setNewProdSubCategory('');
        setNewProdMaterial('');
        setNewProdSize('');
        setNewProdAbsorbency('');
        setNewProdFragrance('');
        setNewProdShelf('');
        setNewProdBay('');
        setNewProdRack('');
        setNewProdZone('');
        setNewProdBin('');
        setNewProdCardboard('');
        setNewProdStorageCondition('room_temperature');

        const matchedCat = categories.find(c =>
            c.name.toLowerCase().includes(drug.category_name.toLowerCase()) ||
            drug.category_name.toLowerCase().includes(c.name.toLowerCase())
        );
        if (matchedCat) setNewProdCategory(matchedCat.id);
        setShowDrugSuggestions(false);
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pharmacy) { alert('Pharmacy not found.'); return; }
        if (!newProdName.trim()) { alert('Please enter a product name.'); return; }
        if (!newProdPrice || newProdPrice <= 0) { alert('Please enter a valid selling price.'); return; }
        if (isSavingProduct) return;

        setIsSavingProduct(true);
        try {
            await onAddProduct({
                pharmacy_name: pharmacy.name,
                name: newProdName.trim(),
                generic_name: newProdGeneric || null,
                brand: newProdBrand || null,
                category_id: newProdCategory || null,
                form: newProdForm,
                strength: newProdStrength || null,
                barcode: newProdBarcode || null,
                selling_price: Number(newProdPrice),
                default_cost_price: Number(newProdCost) || 0,
                reorder_level: Number(newProdReorder) || 10,
                prescription_required: newProdRx,
                quantity: Number(newProdQuantity) || 0,
                active: true,
                sub_category: newProdSubCategory || null,
                material: newProdMaterial || null,
                size: newProdSize || null,
                absorbency: newProdAbsorbency || null,
                fragrance: newProdFragrance || null,
                shelf_number: newProdShelf || null,
                bay_number: newProdBay || null,
                rack_number: newProdRack || null,
                zone: newProdZone || null,
                bin_number: newProdBin || null,
                cardboard_box_id: newProdCardboard || null,
                storage_condition: newProdStorageCondition || 'room_temperature',
            });
            setShowAddProductModal(false);
            resetProductForm();
        } catch (err: any) {
            alert('Error saving product: ' + (err.message || err));
        } finally {
            setIsSavingProduct(false);
        }
    };

    const handleEditProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct || !onUpdateProduct) { alert('No product selected.'); return; }
        if (!newProdName.trim()) { alert('Please enter a product name.'); return; }
        if (!newProdPrice || newProdPrice <= 0) { alert('Please enter a valid selling price.'); return; }
        if (isSavingProduct) return;

        setIsSavingProduct(true);
        try {
            await onUpdateProduct(editingProduct.id, {
                name: newProdName.trim(),
                generic_name: newProdGeneric || null,
                brand: newProdBrand || null,
                category_id: newProdCategory || null,
                form: newProdForm,
                strength: newProdStrength || null,
                barcode: newProdBarcode || null,
                selling_price: Number(newProdPrice),
                default_cost_price: Number(newProdCost) || 0,
                reorder_level: Number(newProdReorder) || 10,
                prescription_required: newProdRx,
                active: true,
                quantity: Number(newProdQuantity) || 0,
                sub_category: newProdSubCategory || null,
                material: newProdMaterial || null,
                size: newProdSize || null,
                absorbency: newProdAbsorbency || null,
                fragrance: newProdFragrance || null,
                shelf_number: newProdShelf || null,
                bay_number: newProdBay || null,
                rack_number: newProdRack || null,
                zone: newProdZone || null,
                bin_number: newProdBin || null,
                cardboard_box_id: newProdCardboard || null,
                storage_condition: newProdStorageCondition || 'room_temperature',
            });
            setShowEditProductModal(false);
            setEditingProduct(null);
            resetProductForm();
        } catch (err: any) {
            alert('Error updating product: ' + (err.message || err));
        } finally {
            setIsSavingProduct(false);
        }
    };

    // Updated delete handler - shows custom modal instead of confirm()
    const handleDeleteProduct = (productId: string) => {
        if (!onDeleteProduct) {
            alert('Delete function not available.');
            return;
        }
        setProductToDelete(productId);
        setShowDeleteModal(true);
    };

    // Confirm delete after user clicks "Delete" in modal
    const confirmDeleteProduct = async () => {
        if (!productToDelete || !onDeleteProduct) return;

        setIsDeleting(true);
        try {
            await onDeleteProduct(productToDelete);
            alert('Product deleted successfully!');
        } catch (err: any) {
            alert('Error deleting product: ' + (err.message || err));
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
            setProductToDelete(null);
        }
    };

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        setNewProdName(product.name || '');
        setNewProdGeneric(product.generic_name || '');
        setNewProdBrand(product.brand || '');
        setNewProdCategory(product.category_id || '');
        setNewProdForm(product.form || 'tablet');
        setNewProdStrength(product.strength || '');
        setNewProdBarcode(product.barcode || '');
        setNewProdPrice(product.selling_price || 0);
        setNewProdCost(product.default_cost_price || 0);
        setNewProdReorder(product.reorder_level || 10);
        setNewProdRx(product.prescription_required || false);
        setNewProdQuantity(product.quantity || 0);
        setNewProdSubCategory((product as any).sub_category || '');
        setNewProdMaterial((product as any).material || '');
        setNewProdSize((product as any).size || '');
        setNewProdAbsorbency((product as any).absorbency || '');
        setNewProdFragrance((product as any).fragrance || '');
        setNewProdShelf(product.shelf_number || '');
        setNewProdBay(product.bay_number || '');
        setNewProdRack(product.rack_number || '');
        setNewProdZone(product.zone || '');
        setNewProdBin(product.bin_number || '');
        setNewProdCardboard(product.cardboard_box_id || '');
        setNewProdStorageCondition(product.storage_condition || 'room_temperature');
        setShowEditProductModal(true);
    };

    const handleSaveBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pharmacy) { alert('Pharmacy not found.'); return; }
        if (!selectedProductForBatch) { alert('Please select a product first.'); return; }
        if (!newBatchNumber.trim()) { alert('Please enter a batch number.'); return; }
        if (!newBatchExpiry) { alert('Please select an expiry date.'); return; }
        if (!newBatchQty || newBatchQty <= 0) { alert('Please enter a valid quantity.'); return; }
        if (isSavingBatch) return;

        setIsSavingBatch(true);
        try {
            await onAddBatch({
                pharmacy_name: pharmacy.name,
                product_id: selectedProductForBatch.id,
                supplier_id: newBatchSupplier || null,
                batch_number: newBatchNumber.trim(),
                expiry_date: newBatchExpiry,
                quantity_base: Number(newBatchQty),
                cost_price: Number(newBatchCost) || selectedProductForBatch.default_cost_price || 0,
                selling_price: Number(newBatchPrice) || selectedProductForBatch.selling_price || 0
            });
            setShowAddBatchModal(false);
            setSelectedProductForBatch(null);
            setNewBatchNumber('');
            setNewBatchExpiry('');
            setNewBatchQty(100);
            setNewBatchCost(0);
            setNewBatchPrice(0);
            setNewBatchSupplier('');
        } catch (err: any) {
            alert('Error saving batch: ' + (err.message || err));
        } finally {
            setIsSavingBatch(false);
        }
    };

    const handleAdjustBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adjustingBatch || !onUpdateBatch) { alert('No batch selected.'); return; }
        if (adjustBatchQty === 0) { alert('Please enter a quantity to adjust.'); return; }
        if (!adjustBatchReason.trim()) { alert('Please provide a reason for the adjustment.'); return; }
        if (adjustBatchQty < 0 && Math.abs(adjustBatchQty) > adjustingBatch.quantity_base) {
            alert(`Cannot subtract ${Math.abs(adjustBatchQty)} units. Only ${adjustingBatch.quantity_base} units available.`);
            return;
        }

        setIsAdjustingBatch(true);
        try {
            await onUpdateBatch(adjustingBatch.id, { quantity_base: adjustingBatch.quantity_base + adjustBatchQty });
            setShowAdjustBatchModal(false);
            setAdjustingBatch(null);
            setAdjustBatchQty(0);
            setAdjustBatchReason('');
            alert(`Successfully ${adjustBatchQty > 0 ? 'added' : 'subtracted'} ${Math.abs(adjustBatchQty)} units.`);
        } catch (err: any) {
            alert('Error adjusting batch: ' + (err.message || err));
        } finally {
            setIsAdjustingBatch(false);
        }
    };

    // Get product name for delete modal
    const deletingProduct = productToDelete ? getProductById(productToDelete) : null;

    return (
        <div className="space-y-4 px-0 md:px-4 pb-20 md:pb-6">
            {/* Header */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl shadow-sm ${cardBg}`}>
                <div>
                    <h2 className={`text-base font-extrabold flex items-center gap-2 ${textTitle}`}>
                        <Package className="w-5 h-5 text-[#2ea043]" />
                        <span>Pharmacy Stock & Batch Inventory</span>
                    </h2>
                    <p className={`text-xs mt-0.5 ${textMuted}`}>
                        FEFO batch management, low-stock reorder insights & movement audit trails.
                    </p>
                </div>
                <button
                    onClick={() => setShowAddProductModal(true)}
                    className={`px-4 py-2.5 bg-[#2ea043] hover:bg-[#3fb950] text-white font-extrabold text-sm rounded-xl flex items-center gap-2 transition-colors shadow-sm ${touchTargetSmall}`}
                >
                    <Plus className="w-5 h-5 stroke-[3]" />
                    <span>New Product</span>
                </button>
            </div>

            {/* Tabs */}
            <div className={`flex gap-4 text-sm font-bold ${borderLine}`}>
                <button onClick={() => setActiveSubTab('catalog')} className={`py-3 transition-colors relative ${touchTargetSmall} ${activeSubTab === 'catalog' ? 'text-[#2ea043] border-b-2 border-[#2ea043] font-extrabold' : `${textMuted} hover:${textTitle}`}`}>Drug Catalog ({products.length})</button>
                <button onClick={() => setActiveSubTab('batches')} className={`py-3 transition-colors relative ${touchTargetSmall} ${activeSubTab === 'batches' ? 'text-[#2ea043] border-b-2 border-[#2ea043] font-extrabold' : `${textMuted} hover:${textTitle}`}`}>FEFO Batches ({batches.length})</button>
                <button onClick={() => setActiveSubTab('movements')} className={`py-3 transition-colors relative ${touchTargetSmall} ${activeSubTab === 'movements' ? 'text-[#2ea043] border-b-2 border-[#2ea043] font-extrabold' : `${textMuted} hover:${textTitle}`}`}>Stock Movements Log</button>
            </div>

            {activeSubTab === 'catalog' && (
                <ProductCatalog
                    products={products}
                    categories={categories}
                    currency={currency}
                    isDark={isDark}
                    cardBg={cardBg}
                    textMuted={textMuted}
                    textTitle={textTitle}
                    borderLine={borderLine}
                    inputBg={inputBg}
                    touchTargetSmall={touchTargetSmall}
                    skeletonBg={skeletonBg}
                    skeletonLight={skeletonLight}
                    isLoading={isLoading}
                    onEditProduct={openEditModal}
                    onAddBatch={(p) => { setSelectedProductForBatch(p); setShowAddBatchModal(true); }}
                    onDeleteProduct={handleDeleteProduct}
                    isDeleting={isDeleting}
                    pharmacy={pharmacy}
                    batches={batches}
                />
            )}

            {/* Batches Tab */}
            {activeSubTab === 'batches' && (
                <div className={`rounded-2xl overflow-hidden shadow-sm ${cardBg}`}>
                    <div className={`p-4 text-sm ${borderLine} ${textMuted}`}>
                        Batches sorted by <span className="text-[#2ea043] font-extrabold">FEFO (First Expiry, First Out)</span> to prevent expired stock loss.
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className={`uppercase font-bold text-[11px] tracking-wider ${isDark ? 'bg-[#21262d]/80 text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'}`}>
                                <tr><th className="p-3">Product Name</th><th className="p-3">Batch Number</th><th className="p-3">Expiry Date</th><th className="p-3">Remaining Stock</th><th className="p-3">Cost / Selling ({currency})</th><th className="p-3 text-right">Actions</th></tr>
                            </thead>
                            <tbody className={`divide-y ${borderLine}`}>
                                {isLoading ? (
                                    <tr><td colSpan={6} className={`p-8 text-center ${textMuted}`}><div className="flex items-center justify-center gap-3"><Loader2 className="w-5 h-5 animate-spin text-[#2ea043]" /><span>Loading batches...</span></div></td></tr>
                                ) : batches.length === 0 ? (
                                    <tr><td colSpan={6} className={`p-8 text-center ${textMuted}`}>No batch inventory records found.</td></tr>
                                ) : (
                                    [...batches].sort((a, b) => a.expiry_date.localeCompare(b.expiry_date)).map(b => (
                                        <tr key={b.id} className={`transition-colors ${isDark ? 'hover:bg-[#21262d]/50' : 'hover:bg-[#f6f8fa]'}`}>
                                            <td className={`p-3 font-bold ${textTitle}`}>{getProductName(b.product_id)}</td>
                                            <td className="p-3 font-mono font-bold text-[#2ea043]">{b.batch_number}</td>
                                            <td className="p-3 font-bold text-amber-500">{b.expiry_date}</td>
                                            <td className={`p-3 font-bold ${textTitle}`}>{b.quantity_base} units</td>
                                            <td className="p-3"><span className={textMuted}>{currency} {b.cost_price}</span> / <span className="text-[#2ea043] font-bold">{currency} {b.selling_price}</span></td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => { setAdjustingBatch(b); setAdjustBatchQty(0); setAdjustBatchReason(''); setShowAdjustBatchModal(true); }} className={`p-2 text-amber-500 rounded-xl text-sm font-bold transition-colors ${touchTargetSmall} ${isDark ? 'bg-[#21262d] hover:bg-[#30363d]' : 'bg-[#f6f8fa] hover:bg-slate-200'}`} title="Adjust Batch Quantity">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Movements Tab */}
            {activeSubTab === 'movements' && (
                <div className={`rounded-2xl overflow-hidden shadow-sm ${cardBg}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className={`uppercase font-bold text-[11px] tracking-wider ${isDark ? 'bg-[#21262d]/80 text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'}`}>
                                <tr><th className="p-3">Date / Time</th><th className="p-3">Product</th><th className="p-3">Type</th><th className="p-3">Qty Change</th><th className="p-3">Performed By</th><th className="p-3">Reason</th></tr>
                            </thead>
                            <tbody className={`divide-y ${borderLine}`}>
                                {isLoading ? (
                                    <tr><td colSpan={6} className={`p-8 text-center ${textMuted}`}><div className="flex items-center justify-center gap-3"><Loader2 className="w-5 h-5 animate-spin text-[#2ea043]" /><span>Loading movements...</span></div></td></tr>
                                ) : movements.length === 0 ? (
                                    <tr><td colSpan={6} className={`p-8 text-center ${textMuted}`}>No stock movements logged.</td></tr>
                                ) : (
                                    movements.slice(0, 50).map(m => (
                                        <tr key={m.id} className={`transition-colors ${isDark ? 'hover:bg-[#21262d]/50' : 'hover:bg-[#f6f8fa]'}`}>
                                            <td className={`p-3 text-[11px] ${textMuted}`}>{new Date(m.created_at).toLocaleString()}</td>
                                            <td className={`p-3 font-bold ${textTitle}`}>{m.product_name || 'Product'}</td>
                                            <td className="p-3"><span className={`uppercase text-[10px] font-bold px-2.5 py-1 rounded ${isDark ? 'bg-[#21262d] text-[#c9d1d9]' : 'bg-slate-100 text-slate-800'}`}>{m.movement_type}</span></td>
                                            <td className={`p-3 font-extrabold ${m.quantity_base >= 0 ? 'text-[#2ea043]' : 'text-rose-500'}`}>{m.quantity_base > 0 ? `+${m.quantity_base}` : m.quantity_base}</td>
                                            <td className={`p-3 ${textMuted}`}>{m.performed_by_name || 'Staff'}</td>
                                            <td className={`p-3 text-[11px] ${textMuted}`}>{m.reason || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* All Modals */}
            <ProductModals
                showAddProductModal={showAddProductModal}
                setShowAddProductModal={setShowAddProductModal}
                newProdName={newProdName}
                setNewProdName={setNewProdName}
                newProdGeneric={newProdGeneric}
                setNewProdGeneric={setNewProdGeneric}
                newProdBrand={newProdBrand}
                setNewProdBrand={setNewProdBrand}
                newProdCategory={newProdCategory}
                setNewProdCategory={setNewProdCategory}
                newProdForm={newProdForm}
                setNewProdForm={setNewProdForm}
                newProdStrength={newProdStrength}
                setNewProdStrength={setNewProdStrength}
                newProdBarcode={newProdBarcode}
                setNewProdBarcode={setNewProdBarcode}
                newProdPrice={newProdPrice}
                setNewProdPrice={setNewProdPrice}
                newProdCost={newProdCost}
                setNewProdCost={setNewProdCost}
                newProdReorder={newProdReorder}
                setNewProdReorder={setNewProdReorder}
                newProdRx={newProdRx}
                setNewProdRx={setNewProdRx}
                newProdQuantity={newProdQuantity}
                setNewProdQuantity={setNewProdQuantity}
                newProdSubCategory={newProdSubCategory}
                setNewProdSubCategory={setNewProdSubCategory}
                newProdMaterial={newProdMaterial}
                setNewProdMaterial={setNewProdMaterial}
                newProdSize={newProdSize}
                setNewProdSize={setNewProdSize}
                newProdAbsorbency={newProdAbsorbency}
                setNewProdAbsorbency={setNewProdAbsorbency}
                newProdFragrance={newProdFragrance}
                setNewProdFragrance={setNewProdFragrance}
                newProdShelf={newProdShelf}
                setNewProdShelf={setNewProdShelf}
                newProdBay={newProdBay}
                setNewProdBay={setNewProdBay}
                newProdRack={newProdRack}
                setNewProdRack={setNewProdRack}
                newProdZone={newProdZone}
                setNewProdZone={setNewProdZone}
                newProdBin={newProdBin}
                setNewProdBin={setNewProdBin}
                newProdCardboard={newProdCardboard}
                setNewProdCardboard={setNewProdCardboard}
                newProdStorageCondition={newProdStorageCondition}
                setNewProdStorageCondition={setNewProdStorageCondition}
                showDrugSuggestions={showDrugSuggestions}
                setShowDrugSuggestions={setShowDrugSuggestions}
                handleSelectCommonDrug={handleSelectCommonDrug}
                handleSaveProduct={handleSaveProduct}
                resetProductForm={resetProductForm}
                isSavingProduct={isSavingProduct}
                showEditProductModal={showEditProductModal}
                setShowEditProductModal={setShowEditProductModal}
                editingProduct={editingProduct}
                setEditingProduct={setEditingProduct}
                handleEditProduct={handleEditProduct}
                showAddBatchModal={showAddBatchModal}
                setShowAddBatchModal={setShowAddBatchModal}
                selectedProductForBatch={selectedProductForBatch}
                newBatchNumber={newBatchNumber}
                setNewBatchNumber={setNewBatchNumber}
                newBatchExpiry={newBatchExpiry}
                setNewBatchExpiry={setNewBatchExpiry}
                newBatchQty={newBatchQty}
                setNewBatchQty={setNewBatchQty}
                newBatchCost={newBatchCost}
                setNewBatchCost={setNewBatchCost}
                newBatchPrice={newBatchPrice}
                setNewBatchPrice={setNewBatchPrice}
                newBatchSupplier={newBatchSupplier}
                setNewBatchSupplier={setNewBatchSupplier}
                handleSaveBatch={handleSaveBatch}
                isSavingBatch={isSavingBatch}
                showAdjustBatchModal={showAdjustBatchModal}
                setShowAdjustBatchModal={setShowAdjustBatchModal}
                adjustingBatch={adjustingBatch}
                setAdjustingBatch={setAdjustingBatch}
                adjustBatchQty={adjustBatchQty}
                setAdjustBatchQty={setAdjustBatchQty}
                adjustBatchReason={adjustBatchReason}
                setAdjustBatchReason={setAdjustBatchReason}
                handleAdjustBatch={handleAdjustBatch}
                isAdjustingBatch={isAdjustingBatch}
                categories={categories}
                suppliers={suppliers}
                currency={currency}
                isDark={isDark}
                cardBg={cardBg}
                textMuted={textMuted}
                textTitle={textTitle}
                borderLine={borderLine}
                inputBg={inputBg}
                touchTargetSmall={touchTargetSmall}
                getProductName={getProductName}
            />

            {/* =============================================
                CUSTOM DELETE CONFIRMATION MODAL
                ============================================ */}
            {showDeleteModal && productToDelete && (
                <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                    <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl ${cardBg} animate-scaleIn`}>
                        {/* Warning Icon */}
                        <div className="flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full bg-rose-500/15 flex items-center justify-center mb-4">
                                <AlertTriangle className="w-10 h-10 text-rose-500" />
                            </div>

                            <h3 className={`text-xl font-bold ${textTitle}`}>Delete Product?</h3>

                            <div className="mt-2 text-sm text-rose-500 font-bold">
                                ⚠️ This action cannot be undone
                            </div>

                            <p className={`text-sm mt-3 ${textMuted}`}>
                                You are about to permanently delete:
                            </p>

                            <p className={`mt-2 text-base font-extrabold ${textTitle} px-4 py-2 rounded-xl ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]'}`}>
                                {deletingProduct?.name || 'Unknown Product'}
                            </p>

                            <div className={`mt-4 w-full p-3 rounded-xl ${isDark ? 'bg-rose-500/5 border border-rose-500/20' : 'bg-rose-50 border border-rose-200'}`}>
                                <p className={`text-xs ${textMuted}`}>
                                    <span className="font-bold text-rose-500">Warning:</span> All associated batches and stock movements will also be deleted.
                                </p>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className={`flex gap-3 pt-6 ${borderLine}`}>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setProductToDelete(null);
                                }}
                                className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                                    }`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteProduct}
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
                                        <span>Delete Product</span>
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