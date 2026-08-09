import React, { useState } from 'react';
import { Pharmacy, Product, ProductBatch, Category, Supplier, Unit, StockMovement, DosageFormType } from '../../types';
import { Package, Plus, Search, Filter, AlertTriangle, Clock, Layers, ArrowUpRight, ArrowDownRight, Tag, PlusCircle, RefreshCw, Sparkles, CheckCircle, Loader2, Edit2, Trash2 } from 'lucide-react';
import { COMMON_DRUGS_LIST, CommonDrug } from '../../data/commonDrugs';

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
  theme?: 'dark' | 'light';
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
  theme = 'dark',
}) => {
  const currency = pharmacy?.currency || 'KSh';
  const isDark = theme === 'dark';

  const cardBg = isDark ? 'bg-[#161b22] text-[#c9d1d9]' : 'bg-white text-[#1f2328] shadow-sm';
  const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
  const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
  const borderLine = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';
  const inputBg = isDark ? 'bg-[#0d1117] text-[#f0f6fc]' : 'bg-[#f6f8fa] text-[#1f2328]';

  const touchTarget = 'min-h-[44px] min-w-[44px]';
  const touchTargetSmall = 'min-h-[36px] min-w-[36px]';

  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'batches' | 'movements'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [selectedProductForBatch, setSelectedProductForBatch] = useState<Product | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
  const [showDrugSuggestions, setShowDrugSuggestions] = useState(false);

  // New state for product sub-category and attributes
  const [newProdSubCategory, setNewProdSubCategory] = useState('');
  const [newProdMaterial, setNewProdMaterial] = useState('');
  const [newProdSize, setNewProdSize] = useState('');
  const [newProdAbsorbency, setNewProdAbsorbency] = useState('');
  const [newProdFragrance, setNewProdFragrance] = useState('');

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

    const matchedCat = categories.find(c =>
      c.name.toLowerCase().includes(drug.category_name.toLowerCase()) ||
      drug.category_name.toLowerCase().includes(c.name.toLowerCase())
    );
    if (matchedCat) {
      setNewProdCategory(matchedCat.id);
    }
    setShowDrugSuggestions(false);
  };

  const [newBatchNumber, setNewBatchNumber] = useState('');
  const [newBatchExpiry, setNewBatchExpiry] = useState('');
  const [newBatchQty, setNewBatchQty] = useState<number>(100);
  const [newBatchCost, setNewBatchCost] = useState<number>(0);
  const [newBatchPrice, setNewBatchPrice] = useState<number>(0);
  const [newBatchSupplier, setNewBatchSupplier] = useState('');

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pharmacy) {
      alert('Pharmacy not found. Please reload the app.');
      return;
    }

    if (!newProdName || !newProdName.trim()) {
      alert('Please enter a product name.');
      return;
    }

    if (!newProdPrice || newProdPrice <= 0) {
      alert('Please enter a valid selling price.');
      return;
    }

    if (isSavingProduct) return;

    setIsSavingProduct(true);
    try {
      const productData: Partial<Product> = {
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
        // Add custom attributes for sanitary products
        sub_category: newProdSubCategory || null,
        material: newProdMaterial || null,
        size: newProdSize || null,
        absorbency: newProdAbsorbency || null,
        fragrance: newProdFragrance || null,
      };

      await onAddProduct(productData);

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

    if (!editingProduct || !onUpdateProduct) {
      alert('No product selected or update function not available.');
      return;
    }

    if (!newProdName || !newProdName.trim()) {
      alert('Please enter a product name.');
      return;
    }

    if (!newProdPrice || newProdPrice <= 0) {
      alert('Please enter a valid selling price.');
      return;
    }

    if (isSavingProduct) return;

    setIsSavingProduct(true);
    try {
      const productData: Partial<Product> = {
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
        sub_category: newProdSubCategory || null,
        material: newProdMaterial || null,
        size: newProdSize || null,
        absorbency: newProdAbsorbency || null,
        fragrance: newProdFragrance || null,
      };

      await onUpdateProduct(editingProduct.id, productData);

      setShowEditProductModal(false);
      setEditingProduct(null);
      resetProductForm();

    } catch (err: any) {
      alert('Error updating product: ' + (err.message || err));
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!onDeleteProduct) {
      alert('Delete function not available.');
      return;
    }

    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteProduct(productId);
      alert('Product deleted successfully!');
    } catch (err: any) {
      alert('Error deleting product: ' + (err.message || err));
    } finally {
      setIsDeleting(false);
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
    setShowEditProductModal(true);
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
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pharmacy) {
      alert('Pharmacy not found. Please reload the app.');
      return;
    }

    if (!selectedProductForBatch) {
      alert('Please select a product first.');
      return;
    }

    if (!newBatchNumber || !newBatchNumber.trim()) {
      alert('Please enter a batch number.');
      return;
    }

    if (!newBatchExpiry) {
      alert('Please select an expiry date.');
      return;
    }

    if (!newBatchQty || newBatchQty <= 0) {
      alert('Please enter a valid quantity.');
      return;
    }

    if (isSavingBatch) return;

    setIsSavingBatch(true);
    try {
      const batchData: Partial<ProductBatch> = {
        pharmacy_name: pharmacy.name,
        product_id: selectedProductForBatch.id,
        supplier_id: newBatchSupplier || null,
        batch_number: newBatchNumber.trim(),
        expiry_date: newBatchExpiry,
        quantity_base: Number(newBatchQty),
        cost_price: Number(newBatchCost) || selectedProductForBatch.default_cost_price || 0,
        selling_price: Number(newBatchPrice) || selectedProductForBatch.selling_price || 0
      };

      await onAddBatch(batchData);

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

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory || p.category_name === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesQ = !q || p.name.toLowerCase().includes(q) || (p.generic_name && p.generic_name.toLowerCase().includes(q)) || (p.barcode && p.barcode.includes(q));
    return matchesCat && matchesQ;
  });

  return (
    <div className="space-y-4 px-0 md:px-4 pb-20 md:pb-6">

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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddProductModal(true)}
            className={`px-4 py-2.5 bg-[#2ea043] hover:bg-[#3fb950] text-white font-extrabold text-sm rounded-xl flex items-center gap-2 transition-colors shadow-sm ${touchTargetSmall}`}
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>New Product</span>
          </button>
        </div>
      </div>

      <div className={`flex gap-4 text-sm font-bold ${borderLine}`}>
        <button
          onClick={() => setActiveSubTab('catalog')}
          className={`py-3 transition-colors relative ${touchTargetSmall} ${activeSubTab === 'catalog'
            ? 'text-[#2ea043] border-b-2 border-[#2ea043] font-extrabold'
            : `${textMuted} hover:${textTitle}`
            }`}
        >
          Drug Catalog ({products.length})
        </button>
        <button
          onClick={() => setActiveSubTab('batches')}
          className={`py-3 transition-colors relative ${touchTargetSmall} ${activeSubTab === 'batches'
            ? 'text-[#2ea043] border-b-2 border-[#2ea043] font-extrabold'
            : `${textMuted} hover:${textTitle}`
            }`}
        >
          FEFO Batches ({batches.length})
        </button>
        <button
          onClick={() => setActiveSubTab('movements')}
          className={`py-3 transition-colors relative ${touchTargetSmall} ${activeSubTab === 'movements'
            ? 'text-[#2ea043] border-b-2 border-[#2ea043] font-extrabold'
            : `${textMuted} hover:${textTitle}`
            }`}
        >
          Stock Movements Log
        </button>
      </div>

      {activeSubTab === 'catalog' && (
        <div className="space-y-3">

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 ${textMuted}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by drug name, generic name, barcode..."
                className={`w-full rounded-xl pl-12 pr-4 py-3.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${inputBg} ${touchTarget}`}
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`rounded-xl px-4 py-3.5 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className={`rounded-2xl overflow-hidden shadow-sm ${cardBg}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className={`uppercase font-bold text-[11px] tracking-wider ${isDark ? 'bg-[#21262d]/80 text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'
                  }`}>
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3">Category / Form</th>
                    <th className="p-3">Price ({currency})</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${borderLine}`}>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={`p-8 text-center ${textMuted}`}>
                        No products found in catalog.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map(p => {
                      const stock = p.quantity || p.total_stock_base || 0;
                      const isLow = stock <= p.reorder_level;
                      const isOut = stock <= 0;

                      return (
                        <tr key={p.id} className={`transition-colors ${isDark ? 'hover:bg-[#21262d]/50' : 'hover:bg-[#f6f8fa]'
                          }`}>
                          <td className={`p-3 font-bold ${textTitle}`}>
                            <div>
                              <span>{p.name}</span>
                              {p.prescription_required && (
                                <span className="ml-1.5 text-[10px] font-black uppercase text-amber-500 bg-amber-500/15 px-1.5 py-0.5 rounded">
                                  Rx
                                </span>
                              )}
                            </div>
                            <div className={`text-[11px] font-normal ${textMuted}`}>
                              {p.generic_name || p.brand || 'General'} {p.strength ? `(${p.strength})` : ''}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold">{p.category_name || 'General'}</div>
                            <div className={`text-[11px] capitalize ${textMuted}`}>{p.form}</div>
                          </td>
                          <td className="p-3 font-extrabold text-[#2ea043]">
                            {currency} {p.selling_price.toFixed(2)}
                          </td>
                          <td className={`p-3 font-extrabold ${textTitle}`}>
                            {stock} units
                          </td>
                          <td className="p-3">
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded ${isOut
                              ? 'bg-rose-500/15 text-rose-500'
                              : isLow
                                ? 'bg-amber-500/15 text-amber-500'
                                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              }`}>
                              {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditModal(p)}
                                className={`p-2 text-blue-400 rounded-xl text-sm font-bold transition-colors ${touchTargetSmall} ${isDark ? 'bg-[#21262d] hover:bg-[#30363d]' : 'bg-[#f6f8fa] hover:bg-slate-200'
                                  }`}
                                title="Edit Product"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedProductForBatch(p);
                                  setShowAddBatchModal(true);
                                }}
                                className={`p-2 text-teal-600 dark:text-teal-300 rounded-xl text-sm font-bold transition-colors ${touchTargetSmall} ${isDark ? 'bg-[#21262d] hover:bg-[#30363d]' : 'bg-[#f6f8fa] hover:bg-slate-200'
                                  }`}
                                title="Add Batch"
                              >
                                <PlusCircle className="w-4 h-4" />
                              </button>
                              {onDeleteProduct && (
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  disabled={isDeleting}
                                  className={`p-2 text-rose-400 rounded-xl text-sm font-bold transition-colors ${touchTargetSmall} ${isDark ? 'bg-[#21262d] hover:bg-[#30363d]' : 'bg-[#f6f8fa] hover:bg-slate-200'
                                    }`}
                                  title="Delete Product"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
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

        </div>
      )}

      {activeSubTab === 'batches' && (
        <div className={`rounded-2xl overflow-hidden shadow-sm ${cardBg}`}>
          <div className={`p-4 text-sm ${borderLine} ${textMuted}`}>
            Batches sorted by <span className="text-[#2ea043] font-extrabold">FEFO (First Expiry, First Out)</span> to prevent expired stock loss.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`uppercase font-bold text-[11px] tracking-wider ${isDark ? 'bg-[#21262d]/80 text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'
                }`}>
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Batch Number</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3">Remaining Stock</th>
                  <th className="p-3">Cost / Selling ({currency})</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${borderLine}`}>
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={`p-8 text-center ${textMuted}`}>
                      No batch inventory records found.
                    </td>
                  </tr>
                ) : (
                  [...batches].sort((a, b) => a.expiry_date.localeCompare(b.expiry_date)).map(b => (
                    <tr key={b.id} className={`transition-colors ${isDark ? 'hover:bg-[#21262d]/50' : 'hover:bg-[#f6f8fa]'
                      }`}>
                      <td className={`p-3 font-bold ${textTitle}`}>{b.product_name || 'Product'}</td>
                      <td className="p-3 font-mono font-bold text-[#2ea043]">{b.batch_number}</td>
                      <td className="p-3 font-bold text-amber-500">{b.expiry_date}</td>
                      <td className={`p-3 font-bold ${textTitle}`}>{b.quantity_base} units</td>
                      <td className="p-3">
                        <span className={textMuted}>{currency} {b.cost_price}</span> / <span className="text-[#2ea043] font-bold">{currency} {b.selling_price}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'movements' && (
        <div className={`rounded-2xl overflow-hidden shadow-sm ${cardBg}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`uppercase font-bold text-[11px] tracking-wider ${isDark ? 'bg-[#21262d]/80 text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'
                }`}>
                <tr>
                  <th className="p-3">Date / Time</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Qty Change</th>
                  <th className="p-3">Performed By</th>
                  <th className="p-3">Reason</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${borderLine}`}>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`p-8 text-center ${textMuted}`}>
                      No stock movements logged.
                    </td>
                  </tr>
                ) : (
                  movements.slice(0, 50).map(m => (
                    <tr key={m.id} className={`transition-colors ${isDark ? 'hover:bg-[#21262d]/50' : 'hover:bg-[#f6f8fa]'
                      }`}>
                      <td className={`p-3 text-[11px] ${textMuted}`}>
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                      <td className={`p-3 font-bold ${textTitle}`}>{m.product_name || 'Product'}</td>
                      <td className="p-3">
                        <span className={`uppercase text-[10px] font-bold px-2.5 py-1 rounded ${isDark ? 'bg-[#21262d] text-[#c9d1d9]' : 'bg-slate-100 text-slate-800'
                          }`}>
                          {m.movement_type}
                        </span>
                      </td>
                      <td className={`p-3 font-extrabold ${m.quantity_base >= 0 ? 'text-[#2ea043]' : 'text-rose-500'}`}>
                        {m.quantity_base > 0 ? `+${m.quantity_base}` : m.quantity_base}
                      </td>
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

      {/* Modal: Add New Product */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
          <div className={`rounded-2xl max-w-lg w-full p-4 overflow-y-auto max-h-[95vh] shadow-2xl ${cardBg}`}>
            <h3 className={`text-base font-bold pb-3 mb-3 ${borderLine} ${textTitle}`}>
              Add New Product
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-sm">
              <div className={`p-3 rounded-xl space-y-2 ${isDark ? 'bg-[#21262d]/60' : 'bg-[#f6f8fa]'
                }`}>
                <div className="flex items-center justify-between text-[12px] font-extrabold text-[#2ea043]">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Quick Select Common Medicine:</span>
                  </span>
                  <span className={`text-[11px] font-normal ${textMuted}`}>Tap to auto-fill</span>
                </div>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto no-scrollbar pt-1">
                  {COMMON_DRUGS_LIST.slice(0, 10).map((d) => (
                    <button
                      key={d.name}
                      type="button"
                      onClick={() => handleSelectCommonDrug(d)}
                      className={`px-3 py-2 text-[11px] rounded-xl transition-colors text-left ${touchTargetSmall} ${isDark
                        ? 'bg-[#161b22] hover:bg-[#2ea043]/20 text-[#c9d1d9]'
                        : 'bg-white hover:bg-[#2ea043]/10 text-[#1f2328]'
                        }`}
                    >
                      + {d.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setNewProdName('Sanitary Pads (Cotton)');
                      setNewProdGeneric('Feminine Hygiene Pad');
                      setNewProdBrand('CottonCare');
                      setNewProdForm('sanitary_pad');
                      setNewProdSubCategory('feminine_hygiene');
                      setNewProdMaterial('100% cotton');
                      setNewProdSize('Regular');
                      setNewProdAbsorbency('regular');
                      setNewProdFragrance('unscented');
                    }}
                    className={`px-3 py-2 text-[11px] rounded-xl transition-colors text-left ${touchTargetSmall} ${isDark
                      ? 'bg-[#161b22] hover:bg-[#2ea043]/20 text-[#c9d1d9]'
                      : 'bg-white hover:bg-[#2ea043]/10 text-[#1f2328]'
                      }`}
                  >
                    + Sanitary Pads
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewProdName('Cotton Wool Pads');
                      setNewProdGeneric('Absorbent Cotton');
                      setNewProdBrand('SoftTouch');
                      setNewProdForm('cotton_wool');
                      setNewProdSubCategory('personal_care');
                      setNewProdMaterial('100% cotton');
                      setNewProdSize('100 pack');
                    }}
                    className={`px-3 py-2 text-[11px] rounded-xl transition-colors text-left ${touchTargetSmall} ${isDark
                      ? 'bg-[#161b22] hover:bg-[#2ea043]/20 text-[#c9d1d9]'
                      : 'bg-white hover:bg-[#2ea043]/10 text-[#1f2328]'
                      }`}
                  >
                    + Cotton Pads
                  </button>
                </div>
              </div>

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
                  className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${inputBg} ${touchTarget}`}
                />

                {showDrugSuggestions && newProdName.trim().length >= 1 && (
                  <div className={`absolute left-0 right-0 top-full mt-1 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y no-scrollbar ${cardBg}`}>
                    {COMMON_DRUGS_LIST.filter(d =>
                      d.name.toLowerCase().includes(newProdName.toLowerCase()) ||
                      d.generic_name.toLowerCase().includes(newProdName.toLowerCase()) ||
                      d.brand.toLowerCase().includes(newProdName.toLowerCase())
                    ).slice(0, 8).map(d => (
                      <button
                        key={d.name}
                        type="button"
                        onClick={() => handleSelectCommonDrug(d)}
                        className={`w-full p-3 text-left flex items-center justify-between text-sm transition-colors ${touchTargetSmall} ${isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]'
                          }`}
                      >
                        <div>
                          <div className={`font-bold ${textTitle}`}>{d.name}</div>
                          <div className={`text-[11px] ${textMuted}`}>{d.generic_name} • {d.brand} ({d.form})</div>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1.5 font-bold ${textMuted}`}>Dosage Form / Category</label>
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

              {/* Sub-Category field - appears for all products */}
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

              {/* Sanitary Product Specific Attributes */}
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`block mb-1.5 font-bold ${textMuted}`}>Selling Price *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={newProdPrice || ''}
                    onChange={(e) => setNewProdPrice(Number(e.target.value))}
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
                    onChange={(e) => setNewProdCost(Number(e.target.value))}
                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                  />
                </div>
                <div>
                  <label className={`block mb-1.5 font-bold ${textMuted}`}>Reorder Level</label>
                  <input
                    type="number"
                    value={newProdReorder}
                    onChange={(e) => setNewProdReorder(Number(e.target.value))}
                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1.5 font-bold ${textMuted}`}>Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={newProdQuantity || ''}
                    onChange={(e) => setNewProdQuantity(Number(e.target.value))}
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

              <div className={`flex justify-end gap-3 pt-4 ${borderLine}`}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProductModal(false);
                    resetProductForm();
                  }}
                  className={`px-5 py-3 rounded-xl font-bold text-sm ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-6 py-3 bg-[#2ea043] hover:bg-[#3fb950] text-white rounded-xl font-extrabold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50 touchTargetSmall"
                >
                  {isSavingProduct ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Product</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Product */}
      {showEditProductModal && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
          <div className={`rounded-2xl max-w-lg w-full p-4 overflow-y-auto max-h-[95vh] shadow-2xl ${cardBg}`}>
            <h3 className={`text-base font-bold pb-3 mb-3 ${borderLine} ${textTitle}`}>
              Edit Product: {editingProduct.name}
            </h3>

            <form onSubmit={handleEditProduct} className="space-y-3 text-sm">
              <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Product Name *</label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${inputBg} ${touchTarget}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1.5 font-bold ${textMuted}`}>Generic Name</label>
                  <input
                    type="text"
                    value={newProdGeneric}
                    onChange={(e) => setNewProdGeneric(e.target.value)}
                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                  />
                </div>
                <div>
                  <label className={`block mb-1.5 font-bold ${textMuted}`}>Brand Name</label>
                  <input
                    type="text"
                    value={newProdBrand}
                    onChange={(e) => setNewProdBrand(e.target.value)}
                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1.5 font-bold ${textMuted}`}>Dosage Form / Category</label>
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
                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none font-mono ${inputBg} ${touchTargetSmall}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`block mb-1.5 font-bold ${textMuted}`}>Selling Price *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={newProdPrice || ''}
                    onChange={(e) => setNewProdPrice(Number(e.target.value))}
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
                    onChange={(e) => setNewProdCost(Number(e.target.value))}
                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                  />
                </div>
                <div>
                  <label className={`block mb-1.5 font-bold ${textMuted}`}>Reorder Level</label>
                  <input
                    type="number"
                    value={newProdReorder}
                    onChange={(e) => setNewProdReorder(Number(e.target.value))}
                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="edit-rx-flag"
                  checked={newProdRx}
                  onChange={(e) => setNewProdRx(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-[#2ea043] focus:ring-0"
                />
                <label htmlFor="edit-rx-flag" className={`font-semibold ${textTitle}`}>Rx Required</label>
              </div>

              <div className={`flex justify-end gap-3 pt-4 ${borderLine}`}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditProductModal(false);
                    setEditingProduct(null);
                    resetProductForm();
                  }}
                  className={`px-5 py-3 rounded-xl font-bold text-sm ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-6 py-3 bg-[#2ea043] hover:bg-[#3fb950] text-white rounded-xl font-extrabold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50 touchTargetSmall"
                >
                  {isSavingProduct ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Product</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Batch */}
      {showAddBatchModal && selectedProductForBatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
          <div className={`rounded-2xl max-w-md w-full p-4 overflow-y-auto shadow-2xl ${cardBg}`}>
            <h3 className={`text-base font-bold pb-3 mb-3 ${borderLine} ${textTitle}`}>
              Receive New Batch: {selectedProductForBatch.name}
            </h3>

            <form onSubmit={handleSaveBatch} className="space-y-3 text-sm">
              <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Batch Number *</label>
                <input
                  type="text"
                  required
                  value={newBatchNumber}
                  onChange={(e) => setNewBatchNumber(e.target.value)}
                  placeholder="e.g. BATCH-2026-X"
                  className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none font-mono ${inputBg} ${touchTarget}`}
                />
              </div>

              <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={newBatchExpiry}
                  onChange={(e) => setNewBatchExpiry(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none ${inputBg} ${touchTarget}`}
                />
              </div>

              <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Quantity *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newBatchQty}
                  onChange={(e) => setNewBatchQty(Number(e.target.value))}
                  className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none font-bold text-[#2ea043] ${inputBg} ${touchTarget}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1.5 font-bold ${textMuted}`}>Cost Price ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newBatchCost || selectedProductForBatch.default_cost_price || ''}
                    onChange={(e) => setNewBatchCost(Number(e.target.value))}
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
                    onChange={(e) => setNewBatchPrice(Number(e.target.value))}
                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Supplier</label>
                <select
                  value={newBatchSupplier}
                  onChange={(e) => setNewBatchSupplier(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none ${inputBg} ${touchTarget}`}
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
                  onClick={() => setShowAddBatchModal(false)}
                  className={`px-5 py-3 rounded-xl font-bold text-sm ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingBatch}
                  className="px-6 py-3 bg-[#2ea043] hover:bg-[#3fb950] text-white rounded-xl font-extrabold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50 touchTargetSmall"
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

    </div>
  );
};