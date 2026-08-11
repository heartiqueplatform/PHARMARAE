import React, { useState, useMemo } from 'react';
import { Pharmacy, Profile, UserRole, Product, ProductBatch, Customer, Sale, SaleItem, PaymentMethod } from '../../types';
import { Search, Camera, ShoppingBag, Plus, Minus, Trash2, Tag, User, CreditCard, Banknote, ShieldCheck, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  batch?: ProductBatch;
}

interface PosViewProps {
  pharmacyName: string | null;
  currentProfile: Profile | null;
  role: UserRole;
  products: Product[];
  batches: ProductBatch[];
  customers: Customer[];
  onCompleteSale: (saleData: Partial<Sale>, items: CartItem[]) => Promise<void>;
  onOpenBarcodeScanner: () => void;
  scannedBarcode?: string | null;
  theme?: 'dark' | 'light';
  isLoading?: boolean;
}

export const PosView: React.FC<PosViewProps> = ({
  pharmacyName,
  currentProfile,
  role,
  products,
  batches,
  customers,
  onCompleteSale,
  onOpenBarcodeScanner,
  scannedBarcode,
  theme = 'dark',
  isLoading = false,
}) => {
  const currency = 'KSh';
  const isDark = theme === 'dark';

  // Base card styles
  const cardBg = isDark ? 'bg-[#161b22] text-[#c9d1d9]' : 'bg-white text-[#1f2328] shadow-sm';
  const cardHover = isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]';
  const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
  const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
  const borderLine = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';
  const inputBg = isDark ? 'bg-[#0d1117] text-[#f0f6fc]' : 'bg-[#f6f8fa] text-[#1f2328]';

  const touchTarget = 'min-h-[44px] min-w-[44px]';
  const touchTargetSmall = 'min-h-[36px] min-w-[36px]';

  const cartItemBg = isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]';
  const cartItemText = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
  const cartItemSubText = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
  const cartItemBorder = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';
  const selectBg = isDark ? 'bg-[#0d1117] text-[#f0f6fc]' : 'bg-white text-[#1f2328]';

  const skeletonBg = isDark ? 'bg-[#21262d]' : 'bg-[#e8eaed]';
  const skeletonLight = isDark ? 'bg-[#30363d]' : 'bg-[#d0d7de]';
  const skeletonDark = isDark ? 'bg-[#161b22]' : 'bg-[#c0c5cc]';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmOverlay, setShowConfirmOverlay] = useState(false); // New state for overlay

  React.useEffect(() => {
    if (scannedBarcode) {
      setSearchQuery(scannedBarcode);
      const match = products.find(p => p.barcode === scannedBarcode || p.sku === scannedBarcode);
      if (match) {
        addToCart(match);
      }
    }
  }, [scannedBarcode, products]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => { if (p.category_name) set.add(p.category_name); });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'all' || p.category_name === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q ||
        p.name.toLowerCase().includes(q) ||
        (p.generic_name && p.generic_name.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q));

      return matchesCategory && matchesQuery && p.is_active !== false;
    });
  }, [products, searchQuery, selectedCategory]);

  const getAvailableQuantity = (product: Product): number => {
    return product.quantity || 0;
  };

  const getBestBatch = (productId: string): ProductBatch | undefined => {
    const todayStr = new Date().toISOString().split('T')[0];
    const available = batches
      .filter(b => b.product_id === productId && b.quantity_base > 0 && b.expiry_date >= todayStr)
      .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
    return available[0];
  };

  const addToCart = (product: Product) => {
    const availableQty = getAvailableQuantity(product);
    if (availableQty <= 0) {
      alert('This product is out of stock!');
      return;
    }

    const existingIndex = cart.findIndex(i => i.product.id === product.id);
    const batch = getBestBatch(product.id);

    if (existingIndex >= 0) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + 1 > availableQty) {
        alert(`Only ${availableQty} units available in stock.`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].subtotal = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setCart(updated);
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        unitPrice: product.selling_price,
        subtotal: product.selling_price,
        batch
      };
      setCart([...cart, newItem]);
    }
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeItem(index);
      return;
    }

    const item = cart[index];
    const availableQty = getAvailableQuantity(item.product);

    if (newQty > availableQty) {
      alert(`Only ${availableQty} units available in stock.`);
      return;
    }

    const updated = [...cart];
    updated[index].quantity = newQty;
    updated[index].subtotal = newQty * updated[index].unitPrice;
    setCart(updated);
  };

  const removeItem = (index: number) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
  };

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.subtotal, 0), [cart]);
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Show confirmation overlay instead of directly completing
  const handleCheckoutClick = () => {
    if (cart.length === 0 || isSubmitting) return;

    // Validate stock first
    for (const item of cart) {
      const availableQty = getAvailableQuantity(item.product);
      if (item.quantity > availableQty) {
        alert(`Not enough stock for ${item.product.name}. Available: ${availableQty}`);
        return;
      }
    }

    setShowConfirmOverlay(true);
  };

  // Actual sale completion
  const handleConfirmSale = async () => {
    if (cart.length === 0) return;

    setIsSubmitting(true);
    setShowConfirmOverlay(false);

    try {
      const item = cart[0];

      const saleData: Partial<Sale> = {
        customer_id: selectedCustomer?.id || null,
        customer_name: selectedCustomer?.name || 'Cash Customer',
        sold_by: currentProfile?.id || null,
        sold_by_name: currentProfile?.full_name || 'System User',
        product_id: item.product.id,
        product_name: item.product.name,
        product_barcode: item.product.barcode || null,
        product_sku: item.product.sku || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.subtotal,
        batch_id: item.batch?.id || null,
        batch_number: item.batch?.batch_number || null,
        discount: discountAmount,
        discount_reason: discountReason || null,
        tax: 0,
        total: finalTotal,
        payment_method: paymentMethod,
        payment_status: 'paid',
        payment_reference: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        status: 'completed',
        product_details: {
          generic_name: item.product.generic_name || null,
          brand: item.product.brand || null,
          form: item.product.form || null,
          strength: item.product.strength || null,
          category: item.product.category_name || null,
          category_id: item.product.category_id || null,
          manufacturer: item.product.manufacturer || null,
          prescription_required: item.product.prescription_required || false,
          is_controlled: item.product.is_controlled || false,
          selling_price: item.product.selling_price,
          cost_price: item.product.default_cost_price || 0,
          unit: item.product.base_unit_name || null,
        },
        notes: `Sale of ${item.product.name} x${item.quantity}`,
        sale_date: new Date().toISOString(),
        pharmacy_name: pharmacyName || 'Unknown Pharmacy'
      };

      await onCompleteSale(saleData, cart);

      // Clear cart after successful sale
      setCart([]);
      setDiscountAmount(0);
      setDiscountReason('');
      setSelectedCustomer(null);
      setPaymentMethod('cash');

    } catch (err: any) {
      alert('Error completing sale: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Skeleton Product Card
  const SkeletonCard = () => (
    <div className={`p-4 rounded-2xl animate-pulse ${cardBg}`}>
      <div className="space-y-2">
        <div className={`h-5 ${skeletonBg} rounded w-3/4`}></div>
        <div className={`h-3 ${skeletonLight} rounded w-1/2`}></div>
        <div className={`h-3 ${skeletonLight} rounded w-2/3`}></div>
        <div className={`pt-3 mt-2 flex items-center justify-between ${borderLine}`}>
          <div className={`h-5 ${skeletonBg} rounded w-16`}></div>
          <div className={`h-6 ${skeletonBg} rounded w-14`}></div>
        </div>
      </div>
    </div>
  );

  // Skeleton Cart Item
  const SkeletonCartItem = () => (
    <div className={`${cartItemBg} rounded-xl p-3 animate-pulse`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-2 space-y-2">
          <div className={`h-4 ${skeletonBg} rounded w-3/4`}></div>
          <div className={`h-3 ${skeletonLight} rounded w-1/2`}></div>
        </div>
        <div className={`w-8 h-8 ${skeletonBg} rounded`}></div>
      </div>
      <div className={`flex items-center justify-between pt-2 ${cartItemBorder}`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 ${skeletonBg} rounded`}></div>
          <div className={`w-12 h-8 ${skeletonBg} rounded`}></div>
          <div className={`w-8 h-8 ${skeletonBg} rounded`}></div>
        </div>
        <div className={`h-5 ${skeletonBg} rounded w-16`}></div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-0 md:px-4 pb-20 md:pb-6">

      {/* Left Column: Fast Product Search & Grid */}
      <div className="lg:col-span-7 space-y-4">

        {/* Search Bar & Barcode Trigger */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 ${textMuted}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by drug name, generic, brand or barcode..."
              className={`w-full rounded-xl pl-12 pr-4 py-4 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${inputBg} ${touchTarget}`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold ${textMuted} ${touchTargetSmall}`}
              >
                Clear
              </button>
            )}
          </div>

          <button
            onClick={onOpenBarcodeScanner}
            className={`p-4 text-[#2ea043] rounded-xl text-sm font-bold flex items-center gap-2 shrink-0 transition-colors ${touchTarget} ${isDark ? 'bg-[#21262d] hover:bg-[#30363d]' : 'bg-[#f6f8fa] hover:bg-slate-200'
              }`}
            title="Scan drug barcode using phone camera"
          >
            <Camera className="w-5 h-5" />
            <span className="hidden xs:inline">Scan</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-bold shrink-0 transition-colors ${touchTargetSmall} ${selectedCategory === 'all'
              ? 'bg-[#2ea043] text-white shadow-sm'
              : isDark
                ? 'bg-[#161b22] text-[#8b949e] hover:text-[#f0f6fc]'
                : 'bg-white text-[#656d76] hover:text-[#1f2328]'
              }`}
          >
            All Items
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-bold shrink-0 transition-colors ${touchTargetSmall} ${selectedCategory === cat
                ? 'bg-[#2ea043] text-white shadow-sm'
                : isDark
                  ? 'bg-[#161b22] text-[#8b949e] hover:text-[#f0f6fc]'
                  : 'bg-white text-[#656d76] hover:text-[#1f2328]'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[550px] overflow-y-auto pr-1">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : filteredProducts.length === 0 ? (
            <div className={`col-span-full py-12 text-center text-sm ${textMuted}`}>
              {products.length === 0 ? (
                <div className="space-y-3">
                  <ShoppingBag className={`w-16 h-16 mx-auto ${textMuted} opacity-30`} />
                  <p className="font-semibold text-base">No Products Found</p>
                  <p className="text-sm">Add your first product to start selling.</p>
                  <p className="text-xs opacity-70">Go to Stock tab → New Product</p>
                </div>
              ) : (
                'No matching items found in inventory.'
              )}
            </div>
          ) : (
            filteredProducts.map(prod => {
              const availableQty = prod.quantity || 0;
              const isOutOfStock = availableQty <= 0;
              const isLowStock = availableQty > 0 && availableQty <= (prod.low_stock_threshold || 5);

              return (
                <button
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  disabled={isOutOfStock}
                  className={`text-left p-4 rounded-2xl transition-all flex flex-col justify-between relative group ${touchTarget} ${isOutOfStock
                    ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900/40'
                    : `${cardBg} ${cardHover} active:scale-98`
                    }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <p className={`font-bold text-sm line-clamp-2 leading-tight ${textTitle}`}>
                        {prod.name}
                      </p>
                      {prod.prescription_required && (
                        <span className="text-[10px] font-black uppercase text-amber-500 bg-amber-500/15 px-1.5 py-0.5 rounded shrink-0">
                          Rx
                        </span>
                      )}
                      {prod.is_controlled && (
                        <span className="text-[10px] font-black uppercase text-red-500 bg-red-500/15 px-1.5 py-0.5 rounded shrink-0">
                          Ctrl
                        </span>
                      )}
                    </div>
                    {prod.generic_name && (
                      <p className={`text-[11px] truncate mt-1 ${textMuted}`}>
                        {prod.generic_name}
                      </p>
                    )}
                    {prod.form && prod.strength && (
                      <p className={`text-[11px] truncate ${textMuted}`}>
                        {prod.form} • {prod.strength}
                      </p>
                    )}
                  </div>

                  <div className={`mt-3 pt-2 flex items-center justify-between ${borderLine}`}>
                    <div>
                      <span className="text-sm font-extrabold text-[#2ea043]">
                        {currency} {prod.selling_price}
                      </span>
                      <span className={`text-[11px] ml-1 ${textMuted}`}>
                        /unit
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${isOutOfStock
                      ? 'bg-rose-500/15 text-rose-500'
                      : isLowStock
                        ? 'bg-amber-500/15 text-amber-500'
                        : isDark ? 'bg-[#30363d] text-[#c9d1d9]' : 'bg-slate-200 text-slate-700'
                      }`}>
                      {isOutOfStock ? 'OUT' : `${availableQty} left`}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

      </div>

      {/* Right Column: Cart & Checkout */}
      <div className={`lg:col-span-5 rounded-2xl p-4 shadow-xl flex flex-col justify-between h-full ${cardBg}`}>

        <div>
          {/* Cart Title & Clear */}
          <div className={`flex items-center justify-between pb-3 mb-3 ${borderLine}`}>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#2ea043]" />
              <h2 className={`font-extrabold text-base ${textTitle}`}>Current Cart</h2>
              <span className="bg-[#2ea043]/20 text-[#2ea043] text-xs px-2.5 py-1 rounded-full font-extrabold">
                {cart.length}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className={`text-sm text-rose-500 hover:text-rose-400 font-bold ${touchTargetSmall}`}
              >
                Clear All
              </button>
            )}
          </div>

          {/* Cart Item List */}
          {isLoading ? (
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              <SkeletonCartItem />
              <SkeletonCartItem />
              <SkeletonCartItem />
            </div>
          ) : cart.length === 0 ? (
            <div className={`py-12 text-center ${textMuted} text-sm space-y-2`}>
              <ShoppingBag className={`w-12 h-12 mx-auto ${textMuted}`} />
              <p>Your cart is empty.</p>
              <p className="text-[11px]">Select items from the left panel or scan barcode to add.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {cart.map((item, idx) => (
                <div
                  key={idx}
                  className={`${cartItemBg} rounded-xl p-3 text-sm flex flex-col gap-2`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-2">
                      <p className={`font-bold ${cartItemText}`}>{item.product.name}</p>
                      {item.batch && (
                        <p className={`text-[10px] font-mono ${isDark ? 'text-emerald-400/80' : 'text-emerald-600'}`}>
                          Batch: {item.batch.batch_number} (Exp: {item.batch.expiry_date})
                        </p>
                      )}
                      {item.product.form && (
                        <p className={`text-[10px] ${cartItemSubText}`}>
                          {item.product.form} {item.product.strength}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      className={`${isDark ? 'text-slate-500 hover:text-rose-400' : 'text-[#656d76] hover:text-rose-500'} transition-colors p-2 ${touchTargetSmall}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className={`flex items-center justify-between pt-2 ${cartItemBorder}`}>
                    <div className={`flex items-center gap-2 ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'} rounded-lg p-1`}>
                      <button
                        onClick={() => updateQuantity(idx, item.quantity - 1)}
                        className={`w-8 h-8 rounded ${isDark ? 'hover:bg-[#21262d] text-[#c9d1d9]' : 'hover:bg-[#eaeef2] text-[#1f2328]'} flex items-center justify-center font-bold ${touchTargetSmall}`}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            updateQuantity(idx, val);
                          }
                        }}
                        className={`w-12 text-center font-bold text-sm ${isDark ? 'bg-[#161b22] text-emerald-400' : 'bg-white text-emerald-600'} rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 py-1 ${touchTargetSmall}`}
                      />
                      <button
                        onClick={() => updateQuantity(idx, item.quantity + 1)}
                        className={`w-8 h-8 rounded ${isDark ? 'hover:bg-[#21262d] text-[#c9d1d9]' : 'hover:bg-[#eaeef2] text-[#1f2328]'} flex items-center justify-center font-bold ${touchTargetSmall}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className={`font-bold text-base ${cartItemText}`}>
                      {currency} {item.subtotal.toFixed(2)}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}

          {/* Customer & Payment Method */}
          <div className={`mt-4 pt-3 ${borderLine} space-y-3`}>

            <div className={`flex items-center justify-between text-sm ${textMuted}`}>
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Customer:
              </span>
              <select
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const found = customers.find(c => c.id === e.target.value);
                  setSelectedCustomer(found || null);
                }}
                className={`${selectBg} text-sm rounded-lg px-3 py-2 max-w-[160px] focus:outline-none focus:ring-1 focus:ring-[#2ea043] ${touchTargetSmall}`}
              >
                <option value="">Cash Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className={`flex items-center justify-between text-sm ${textMuted}`}>
              <span className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Discount ({currency}):
              </span>
              <input
                type="number"
                min="0"
                max={subtotal}
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                placeholder="0"
                className={`${inputBg} text-sm rounded-lg px-3 py-2 w-24 text-right focus:outline-none focus:ring-1 focus:ring-[#2ea043] ${touchTargetSmall}`}
              />
            </div>

            <div>
              <p className={`text-[11px] font-bold uppercase ${textMuted} mb-2`}>Payment Method</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {(['cash', 'mpesa', 'card', 'credit', 'insurance'] as PaymentMethod[]).map(pm => (
                  <button
                    key={pm}
                    onClick={() => setPaymentMethod(pm)}
                    className={`py-2.5 px-3 rounded-lg font-bold uppercase text-sm transition-colors ${touchTargetSmall} ${paymentMethod === pm
                      ? 'bg-[#2ea043] text-white'
                      : isDark
                        ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]'
                        : 'bg-[#f6f8fa] text-[#1f2328] hover:bg-[#eaeef2]'
                      }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Checkout Button */}
        <div className={`mt-4 pt-3 ${borderLine} space-y-3`}>
          <div className={`flex justify-between items-center ${textMuted} text-sm`}>
            <span>Subtotal:</span>
            <span>{currency} {subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between items-center text-amber-500 text-sm">
              <span>Discount:</span>
              <span>-{currency} {discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className={`flex justify-between items-center font-extrabold text-xl ${textTitle}`}>
            <span>Total:</span>
            <span className="text-[#2ea043]">{currency} {finalTotal.toFixed(2)}</span>
          </div>

          <button
            onClick={handleCheckoutClick}
            disabled={cart.length === 0 || isSubmitting}
            className={`w-full py-4 rounded-xl font-bold text-base shadow-lg flex items-center justify-center gap-3 transition-all active:scale-98 ${touchTarget} ${cart.length === 0 || isSubmitting
              ? isDark
                ? 'bg-[#21262d] text-[#8b949e] cursor-not-allowed'
                : 'bg-[#f6f8fa] text-[#656d76] cursor-not-allowed'
              : 'bg-[#2ea043] hover:bg-[#2c9b3e] text-white shadow-[#2ea043]/20'
              }`}
          >
            <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            <span>COMPLETE SALE ({currency} {finalTotal.toFixed(2)})</span>
          </button>
        </div>

      </div>

      {/* CONFIRMATION OVERLAY */}
      {showConfirmOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`max-w-md w-full rounded-2xl shadow-2xl p-6 ${cardBg} border ${borderLine} max-h-[90vh] overflow-y-auto`}>

            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-500/20 text-amber-500">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`font-bold text-lg ${textTitle}`}>Confirm Sale</h3>
                  <p className={`text-sm ${textMuted}`}>Please review all details before completing</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmOverlay(false)}
                className={`p-1 rounded-lg ${isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]'} transition-colors ${touchTargetSmall}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Info */}
            <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]'}`}>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-[#2ea043]" />
                <span className={`font-medium ${textTitle}`}>
                  {selectedCustomer?.name || 'Cash Customer'}
                </span>
                {selectedCustomer?.phone && (
                  <span className={`text-xs ${textMuted}`}>• {selectedCustomer.phone}</span>
                )}
              </div>
            </div>

            {/* Items List */}
            <div className="mb-4">
              <h4 className={`text-sm font-bold ${textMuted} uppercase tracking-wider mb-2`}>
                Items ({cart.length})
              </h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {cart.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between text-sm p-2 rounded-lg ${isDark ? 'bg-[#0d1117]' : 'bg-white'}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${textTitle}`}>{item.product.name}</p>
                      <p className={`text-xs ${textMuted}`}>
                        {item.quantity} × {currency} {item.unitPrice.toFixed(2)}
                        {item.batch && ` • Batch: ${item.batch.batch_number}`}
                      </p>
                    </div>
                    <span className={`font-bold ${textTitle}`}>
                      {currency} {item.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className={`pt-3 ${borderLine}`}>
              <div className="space-y-1.5 text-sm">
                <div className={`flex justify-between ${textMuted}`}>
                  <span>Subtotal</span>
                  <span>{currency} {subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-amber-500">
                    <span>Discount</span>
                    <span>-{currency} {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className={`flex justify-between text-lg font-extrabold ${textTitle}`}>
                  <span>Total</span>
                  <span className="text-[#2ea043]">{currency} {finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className={`mt-3 pt-3 ${borderLine}`}>
              <div className="flex items-center justify-between text-sm">
                <span className={textMuted}>Payment Method</span>
                <span className={`font-bold uppercase ${textTitle}`}>{paymentMethod}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowConfirmOverlay(false)}
                className={`flex-1 py-3 rounded-xl font-bold transition-colors ${isDark ? 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9]' : 'bg-[#f6f8fa] hover:bg-[#eaeef2] text-[#1f2328]'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSale}
                disabled={isSubmitting}
                className={`flex-1 py-3 rounded-xl font-bold text-white transition-colors ${isSubmitting ? 'bg-[#2ea043]/70 cursor-not-allowed' : 'bg-[#2ea043] hover:bg-[#2c9b3e]'} flex items-center justify-center gap-2`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Confirm Sale</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};