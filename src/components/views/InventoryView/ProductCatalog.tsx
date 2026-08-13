// components/views/InventoryView/ProductCatalog.tsx
import React, { useState } from 'react';
import { Product, Category, ProductBatch, Pharmacy } from '../../../types';
import { Search, Edit2, PlusCircle, Trash2, Package, Loader2, Download } from 'lucide-react';
import { generateInventoryCatalogPdf } from './InventoryPDF';

interface ProductCatalogProps {
    products: Product[];
    categories: Category[];
    currency: string;
    isDark: boolean;
    cardBg: string;
    textMuted: string;
    textTitle: string;
    borderLine: string;
    inputBg: string;
    touchTargetSmall: string;
    skeletonBg: string;
    skeletonLight: string;
    isLoading: boolean;
    onEditProduct: (product: Product) => void;
    onAddBatch: (product: Product) => void;
    onDeleteProduct: (productId: string) => void;
    isDeleting: boolean;
    pharmacy?: Pharmacy | null;
    batches?: ProductBatch[];
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
    products,
    categories,
    currency,
    isDark,
    cardBg,
    textMuted,
    textTitle,
    borderLine,
    inputBg,
    touchTargetSmall,
    skeletonBg,
    skeletonLight,
    isLoading,
    onEditProduct,
    onAddBatch,
    onDeleteProduct,
    isDeleting,
    pharmacy,
    batches = [],
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const filteredProducts = products.filter(p => {
        const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory || p.category_name === selectedCategory;
        const q = searchQuery.toLowerCase().trim();
        const matchesQ = !q || p.name.toLowerCase().includes(q) || (p.generic_name && p.generic_name.toLowerCase().includes(q)) || (p.barcode && p.barcode.includes(q));
        return matchesCat && matchesQ;
    });

    // Handle PDF Download
    const handleDownloadPDF = () => {
        if (!pharmacy) {
            alert('Pharmacy data not available.');
            return;
        }
        if (products.length === 0) {
            alert('No products to export.');
            return;
        }

        setIsGeneratingPDF(true);
        try {
            generateInventoryCatalogPdf(pharmacy, products, categories, batches);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Error generating PDF. Please try again.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const SkeletonRow = () => (
        <tr className="animate-pulse">
            <td className="p-3">
                <div className={`h-5 ${skeletonBg} rounded w-32`}></div>
                <div className={`h-3 ${skeletonLight} rounded w-24 mt-1`}></div>
            </td>
            <td className="p-3">
                <div className={`h-4 ${skeletonBg} rounded w-20`}></div>
                <div className={`h-3 ${skeletonLight} rounded w-16 mt-1`}></div>
            </td>
            <td className="p-3">
                <div className={`h-5 ${skeletonBg} rounded w-16`}></div>
            </td>
            <td className="p-3">
                <div className={`h-5 ${skeletonBg} rounded w-12`}></div>
            </td>
            <td className="p-3">
                <div className={`h-6 ${skeletonBg} rounded w-20`}></div>
            </td>
            <td className="p-3 text-right">
                <div className="flex justify-end gap-2">
                    <div className={`h-8 w-8 ${skeletonBg} rounded-xl`}></div>
                    <div className={`h-8 w-8 ${skeletonBg} rounded-xl`}></div>
                </div>
            </td>
        </tr>
    );

    return (
        <div className="space-y-3">
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 ${textMuted}`} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter by drug name, generic name, barcode..."
                        className={`w-full rounded-xl pl-12 pr-4 py-3.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${inputBg}`}
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

                {/* 🆕 DOWNLOAD PDF BUTTON */}
                <button
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF || products.length === 0}
                    className={`px-3 sm:px-4 py-3.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1.5 sm:gap-2 ${touchTargetSmall} ${isDark
                        ? 'bg-[#2ea043] hover:bg-[#3fb950] text-white'
                        : 'bg-[#2ea043] hover:bg-[#3fb950] text-white'
                        } disabled:opacity-50 min-w-[44px] sm:min-w-0 flex-1 sm:flex-none`}
                    title="Download Inventory PDF"
                >
                    {isGeneratingPDF ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-xs sm:text-sm">Generating...</span>
                        </>
                    ) : (
                        <>
                            <Download className="w-4 h-4 flex-shrink-0" />
                            <span className="text-xs sm:text-sm font-bold">Inventory PDF</span>
                        </>
                    )}
                </button>
            </div>

            {/* Products Table */}
            <div className={`rounded-2xl overflow-hidden shadow-sm ${cardBg}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className={`uppercase font-bold text-[11px] tracking-wider ${isDark ? 'bg-[#21262d]/80 text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'
                            }`}>
                            <tr>
                                <th className="p-3">Product</th>
                                <th className="p-3">Category / Form</th>
                                <th className="p-3">Price ({currency})</th>
                                <th className="p-3">Location</th>
                                <th className="p-3">Storage</th>
                                <th className="p-3">Stock</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${borderLine}`}>
                            {isLoading ? (
                                <>
                                    <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
                                </>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className={`p-8 text-center ${textMuted}`}>
                                        {products.length === 0 ? 'No products found. Add your first product!' : 'No products match your search.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map(p => {
                                    const stock = p.quantity || p.total_stock_base || 0;
                                    const isLow = stock <= p.reorder_level;
                                    const isOut = stock <= 0;

                                    return (
                                        <tr key={p.id} className={`transition-colors ${isDark ? 'hover:bg-[#21262d]/50' : 'hover:bg-[#f6f8fa]'}`}>
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
                                            <td className="p-3">
                                                <div className="text-xs font-mono">
                                                    {p.zone && <span className="font-bold">{p.zone}</span>}
                                                    {p.bay_number && <span className="text-[#8b949e]"> {p.bay_number}</span>}
                                                    {p.shelf_number && <span className="text-[#8b949e]"> · {p.shelf_number}</span>}
                                                    {!p.zone && !p.bay_number && !p.shelf_number &&
                                                        <span className={textMuted}>Not assigned</span>
                                                    }
                                                </div>
                                                {p.cardboard_box_id && (
                                                    <div className={`text-[10px] ${textMuted}`}>
                                                        📦 {p.cardboard_box_id}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded capitalize ${p.storage_condition === 'refrigerated' ? 'bg-blue-500/15 text-blue-400' :
                                                    p.storage_condition === 'frozen' ? 'bg-cyan-500/15 text-cyan-400' :
                                                        p.storage_condition === 'cold_chain' ? 'bg-indigo-500/15 text-indigo-400' :
                                                            p.storage_condition === 'controlled' ? 'bg-amber-500/15 text-amber-400' :
                                                                'bg-gray-500/15 text-gray-400'
                                                    }`}>
                                                    {p.storage_condition?.replace('_', ' ') || 'Ambient'}
                                                </span>
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
                                                        onClick={() => onEditProduct(p)}
                                                        className={`p-2 text-blue-400 rounded-xl text-sm font-bold transition-colors ${touchTargetSmall} ${isDark ? 'bg-[#21262d] hover:bg-[#30363d]' : 'bg-[#f6f8fa] hover:bg-slate-200'
                                                            }`}
                                                        title="Edit Product"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => onAddBatch(p)}
                                                        className={`p-2 text-teal-600 dark:text-teal-300 rounded-xl text-sm font-bold transition-colors ${touchTargetSmall} ${isDark ? 'bg-[#21262d] hover:bg-[#30363d]' : 'bg-[#f6f8fa] hover:bg-slate-200'
                                                            }`}
                                                        title="Add Batch"
                                                    >
                                                        <PlusCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => onDeleteProduct(p.id)}
                                                        disabled={isDeleting}
                                                        className={`p-2 text-rose-400 rounded-xl text-sm font-bold transition-colors ${touchTargetSmall} ${isDark ? 'bg-[#21262d] hover:bg-[#30363d]' : 'bg-[#f6f8fa] hover:bg-slate-200'
                                                            }`}
                                                        title="Delete Product"
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
        </div>
    );
};