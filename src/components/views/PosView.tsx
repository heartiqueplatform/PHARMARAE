import React, { useState, useMemo } from 'react';
import { Pharmacy, Profile, UserRole, Product, ProductBatch, Customer, Sale, SaleItem, PaymentMethod } from '../../types';
import { Search, Camera, ShoppingBag, Plus, Minus, Trash2, Tag, User, CreditCard, Banknote, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  batch?: ProductBatch;
}

interface PosViewProps {
  pharmacy: Pharmacy | null;
  currentProfile: Profile | null;
  role: UserRole;
  products: Product[];
  batches: ProductBatch[];
  customers: Customer[];
  onCompleteSale: (saleData: Partial<Sale>, items: CartItem[]) => Promise<void>;
  onOpenBarcodeScanner: () => void;
  scannedBarcode?: string | null;
  theme?: 'dark' | 'light';
}

export const PosView: React.FC<PosViewProps> = ({
  pharmacy,
  currentProfile,
  role,
  products,
  batches,
  customers,
  onCompleteSale,
  onOpenBarcodeScanner,
  scannedBarcode,
  theme = 'dark',
}) => {
  const currency = pharmacy?.currency || 'KSh';
  const isDark = theme === 'dark';

  // Base card styles
  const cardBg = isDark ? 'bg-[#161b22] border-[#30363d] text-[#c9d1d9]' : 'bg-white border-[#d0d7de] text-[#1f2328] shadow-sm';
  const cardHover = isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]';
  const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
  const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
  const borderLine = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';
  const inputBg = isDark ? 'bg-[#0d1117] border-[#30363d] text-[#f0f6fc]' : 'bg-[#f6f8fa] border-[#d0d7de] text-[#1f2328]';

  // Additional theme variables for cart items
  const cartItemBg = isDark ? 'bg-[#21262d] border-[#30363d]' : 'bg-[#f6f8fa] border-[#d0d7de]';
  const cartItemText = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
  const cartItemSubText = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
  const cartItemBorder = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';
  const selectBg = isDark ? 'bg-[#0d1117] border-[#30363d] text-[#f0f6fc]' : 'bg-white border-[#d0d7de] text-[#1f2328]';
  const inputDisabled = isDark ? 'bg-[#161b22] text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]';
  const buttonSecondary = isDark ? 'bg-[#21262d] border-[#30363d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-[#f6f8fa] border-[#d0d7de] text-[#1f2328] hover:bg-[#eaeef2]';
  const buttonSecondaryActive = isDark ? 'bg-[#2ea043] text-white' : 'bg-[#2ea043] text-white';

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto handle barcode scanner match
  React.useEffect(() => {
    if (scannedBarcode) {
      setSearchQuery(scannedBarcode);
      const match = products.find(p => p.barcode === scannedBarcode || p.sku === scannedBarcode);
      if (match) {
        addToCart(match);
      }
    }
  }, [scannedBarcode, products]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => { if (p.category_name) set.add(p.category_name); });
    return Array.from(set);
  }, [products]);

  // Filtered Products
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

  // Get available quantity directly from product
  const getAvailableQuantity = (product: Product): number => {
    return product.quantity || 0;
  };

  // Get best batch (FEFO) for a product
  const getBestBatch = (productId: string): ProductBatch | undefined => {
    const todayStr = new Date().toISOString().split('T')[0];
    const available = batches
      .filter(b => b.product_id === productId && b.quantity_base > 0 && b.expiry_date >= todayStr)
      .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
    return available[0];
  };

  // Add Product to Cart
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

  // Update Item Quantity
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

  // Remove Item
  const removeItem = (index: number) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
  };

  // Totals
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.subtotal, 0), [cart]);
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Submit Sale
  const handleCheckout = async () => {
    if (cart.length === 0 || isSubmitting) return;

    for (const item of cart) {
      const availableQty = getAvailableQuantity(item.product);
      if (item.quantity > availableQty) {
        alert(`Not enough stock for ${item.product.name}. Available: ${availableQty}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const saleData: Partial<Sale> = {
        customer_id: selectedCustomer?.id,
        customer_name: selectedCustomer?.name,
        sold_by: currentProfile?.id,
        sold_by_name: currentProfile?.full_name,
        subtotal,
        discount: discountAmount,
        tax: 0,
        total: finalTotal,
        payment_status: 'paid',
        status: 'completed'
      };

      await onCompleteSale(saleData, cart);

      setCart([]);
      setDiscountAmount(0);
      setDiscountReason('');
      setSelectedCustomer(null);
    } catch (err: any) {
      alert('Error completing sale: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-20 md:pb-6">

      {/* Left Column: Fast Product Search & Grid (7 cols) */}
      <div className="lg:col-span-7 space-y-3">

        {/* Search Bar & Barcode Trigger */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by drug name, generic, brand or barcode..."
              className={`w-full rounded-xl pl-9 pr-3 py-2.5 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${inputBg}`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${textMuted}`}
              >
                Clear
              </button>
            )}
          </div>

          <button
            onClick={onOpenBarcodeScanner}
            className={`p-2.5 text-[#2ea043] border rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors ${isDark ? 'bg-[#21262d] border-[#30363d] hover:bg-[#30363d]' : 'bg-[#f6f8fa] border-[#d0d7de] hover:bg-slate-200'
              }`}
            title="Scan drug barcode using phone camera"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden xs:inline">Scan</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-colors ${selectedCategory === 'all'
              ? 'bg-[#2ea043] text-white shadow-sm'
              : isDark
                ? 'bg-[#161b22] text-[#8b949e] border border-[#30363d] hover:text-[#f0f6fc]'
                : 'bg-white text-[#656d76] border border-[#d0d7de] hover:text-[#1f2328]'
              }`}
          >
            All Items
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-colors ${selectedCategory === cat
                ? 'bg-[#2ea043] text-white shadow-sm'
                : isDark
                  ? 'bg-[#161b22] text-[#8b949e] border border-[#30363d] hover:text-[#f0f6fc]'
                  : 'bg-white text-[#656d76] border border-[#d0d7de] hover:text-[#1f2328]'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[550px] overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className={`col-span-full py-12 text-center text-xs ${textMuted}`}>
              No matching items found in inventory.
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
                  className={`text-left p-3 rounded-2xl border transition-all flex flex-col justify-between relative group ${isOutOfStock
                    ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-300 dark:bg-slate-900/40 dark:border-slate-800'
                    : `${cardBg} ${cardHover} hover:border-[#2ea043]/50 active:scale-98`
                    }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <p className={`font-bold text-xs line-clamp-2 leading-tight ${textTitle}`}>
                        {prod.name}
                      </p>
                      {prod.prescription_required && (
                        <span className="text-[9px] font-black uppercase text-amber-500 bg-amber-500/15 border border-amber-500/30 px-1 rounded shrink-0">
                          Rx
                        </span>
                      )}
                      {prod.is_controlled && (
                        <span className="text-[9px] font-black uppercase text-red-500 bg-red-500/15 border border-red-500/30 px-1 rounded shrink-0">
                          Ctrl
                        </span>
                      )}
                    </div>
                    {prod.generic_name && (
                      <p className={`text-[10px] truncate mt-0.5 ${textMuted}`}>
                        {prod.generic_name}
                      </p>
                    )}
                    {prod.form && prod.strength && (
                      <p className={`text-[10px] truncate ${textMuted}`}>
                        {prod.form} • {prod.strength}
                      </p>
                    )}
                  </div>

                  <div className={`mt-3 pt-2 border-t flex items-center justify-between ${borderLine}`}>
                    <div>
                      <span className="text-xs font-extrabold text-[#2ea043]">
                        {currency} {prod.selling_price}
                      </span>
                      <span className={`text-[10px] ml-1 ${textMuted}`}>
                        /unit
                      </span>
                    </div>

                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${isOutOfStock
                      ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                      : isLowStock
                        ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
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

      {/* Right Column: Cart & Checkout (5 cols) */}
      <div className={`lg:col-span-5 border rounded-2xl p-4 shadow-xl flex flex-col justify-between h-full ${cardBg}`}>

        <div>
          {/* Cart Title & Clear */}
          <div className={`flex items-center justify-between pb-3 border-b mb-3 ${borderLine}`}>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#2ea043]" />
              <h2 className={`font-extrabold text-sm ${textTitle}`}>Current Cart</h2>
              <span className="bg-[#2ea043]/20 text-[#2ea043] text-xs px-2 py-0.5 rounded-full font-extrabold">
                {cart.length}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-rose-500 hover:text-rose-400 font-bold"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Cart Item List */}
          {cart.length === 0 ? (
            <div className={`py-12 text-center ${textMuted} text-xs space-y-2`}>
              <ShoppingBag className={`w-10 h-10 mx-auto ${textMuted}`} />
              <p>Your cart is empty.</p>
              <p className="text-[10px]">Select items from the left panel or scan barcode to add.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {cart.map((item, idx) => (
                <div
                  key={idx}
                  className={`${cartItemBg} border rounded-xl p-2.5 text-xs flex flex-col gap-1.5`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-2">
                      <p className={`font-bold ${cartItemText}`}>{item.product.name}</p>
                      {item.batch && (
                        <p className={`text-[9px] font-mono ${isDark ? 'text-emerald-400/80' : 'text-emerald-600'}`}>
                          Batch: {item.batch.batch_number} (Exp: {item.batch.expiry_date})
                        </p>
                      )}
                      {item.product.form && (
                        <p className={`text-[9px] ${cartItemSubText}`}>
                          {item.product.form} {item.product.strength}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      className={`${isDark ? 'text-slate-500 hover:text-rose-400' : 'text-[#656d76] hover:text-rose-500'} transition-colors p-0.5`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quantity Stepper & Price */}
                  <div className={`flex items-center justify-between pt-1 border-t ${cartItemBorder}`}>
                    <div className={`flex items-center gap-1 ${isDark ? 'bg-[#0d1117] border-[#30363d]' : 'bg-[#f6f8fa] border-[#d0d7de]'} border rounded-lg p-0.5`}>
                      <button
                        onClick={() => updateQuantity(idx, item.quantity - 1)}
                        className={`w-5 h-5 rounded ${isDark ? 'hover:bg-[#21262d] text-[#c9d1d9]' : 'hover:bg-[#eaeef2] text-[#1f2328]'} flex items-center justify-center font-bold`}
                      >
                        <Minus className="w-3 h-3" />
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
                        className={`w-10 text-center font-bold text-xs ${isDark ? 'bg-[#161b22] text-emerald-400' : 'bg-white text-emerald-600'} rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 py-0.5`}
                      />
                      <button
                        onClick={() => updateQuantity(idx, item.quantity + 1)}
                        className={`w-5 h-5 rounded ${isDark ? 'hover:bg-[#21262d] text-[#c9d1d9]' : 'hover:bg-[#eaeef2] text-[#1f2328]'} flex items-center justify-center font-bold`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className={`font-bold ${cartItemText}`}>
                      {currency} {item.subtotal.toFixed(2)}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}

          {/* Customer & Payment Method */}
          <div className={`mt-4 pt-3 border-t ${borderLine} space-y-2.5`}>

            {/* Customer Select */}
            <div className={`flex items-center justify-between text-xs ${textMuted}`}>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                Customer:
              </span>
              <select
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const found = customers.find(c => c.id === e.target.value);
                  setSelectedCustomer(found || null);
                }}
                className={`${selectBg} text-xs rounded-lg px-2 py-1 max-w-[150px] focus:outline-none focus:ring-1 focus:ring-[#2ea043]`}
              >
                <option value="">Cash Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Discount */}
            <div className={`flex items-center justify-between text-xs ${textMuted}`}>
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                Discount ({currency}):
              </span>
              <input
                type="number"
                min="0"
                max={subtotal}
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                placeholder="0"
                className={`${inputBg} text-xs rounded-lg px-2 py-1 w-20 text-right focus:outline-none focus:ring-1 focus:ring-[#2ea043]`}
              />
            </div>

            {/* Payment Method */}
            <div>
              <p className={`text-[10px] font-bold uppercase ${textMuted} mb-1.5`}>Payment Method</p>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['cash', 'mpesa', 'card', 'credit', 'insurance'] as PaymentMethod[]).map(pm => (
                  <button
                    key={pm}
                    onClick={() => setPaymentMethod(pm)}
                    className={`py-1.5 px-2 rounded-lg font-bold uppercase text-[10px] border transition-colors ${paymentMethod === pm
                      ? 'bg-[#2ea043] text-white border-[#2ea043]'
                      : isDark
                        ? 'bg-[#21262d] text-[#c9d1d9] border-[#30363d] hover:bg-[#30363d]'
                        : 'bg-[#f6f8fa] text-[#1f2328] border-[#d0d7de] hover:bg-[#eaeef2]'
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
        <div className={`mt-4 pt-3 border-t ${borderLine} space-y-2`}>
          <div className={`flex justify-between items-center ${textMuted} text-xs`}>
            <span>Subtotal:</span>
            <span>{currency} {subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between items-center text-amber-500 text-xs">
              <span>Discount:</span>
              <span>-{currency} {discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className={`flex justify-between items-center font-extrabold text-base ${textTitle}`}>
            <span>Total:</span>
            <span className="text-[#2ea043]">{currency} {finalTotal.toFixed(2)}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isSubmitting}
            className={`w-full py-3 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98 ${cart.length === 0 || isSubmitting
              ? isDark
                ? 'bg-[#21262d] text-[#8b949e] cursor-not-allowed'
                : 'bg-[#f6f8fa] text-[#656d76] cursor-not-allowed'
              : 'bg-[#2ea043] hover:bg-[#2c9b3e] text-white shadow-[#2ea043]/20'
              }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                <span>COMPLETE SALE ({currency} {finalTotal.toFixed(2)})</span>
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
};