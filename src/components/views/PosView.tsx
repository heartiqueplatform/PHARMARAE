// components/views/PosView.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Pharmacy, Profile, UserRole, Product, ProductBatch, Customer, Sale, SaleItem, PaymentMethod } from '../../types';
import { Search, Camera, ShoppingBag, Plus, Minus, Trash2, Tag, User, CreditCard, Banknote, ShieldCheck, CheckCircle2, AlertCircle, Loader2, X, Check, Calendar } from 'lucide-react';
import { MedicationDatabaseOverlay } from '../MedicationDatabaseOverlay';
import { CommonDrug } from '../../types/commonDrugs';

import { CustomerSelector } from '../pos/CustomerSelector';
import { db } from '../../lib/db';


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
  onCompleteSale: (saleData: Partial<Sale>, items: CartItem[]) => Promise<any>;
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

  // --- START: Sound & Vibration ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Hard lock for handleConfirmSale — prevents double submission
  const isSubmittingRef = useRef(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const audio = new Audio('/Pharmienta.mp3');
        audio.preload = 'auto';
        audio.load();
        audioRef.current = audio;
        console.log('Audio loaded successfully');
      } catch (err) {
        console.warn('Failed to load audio:', err);
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playCompletionFeedback = () => {
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.log('Audio play failed:', err.message);
            try {
              const fallbackAudio = new Audio('/pharmienta.mp3');
              fallbackAudio.play().catch(e => console.log('Fallback audio failed:', e));
            } catch (e) {
              console.log('Fallback audio creation failed:', e);
            }
          });
        }
      } catch (err) {
        console.log('Audio error:', err);
        try {
          const fallbackAudio = new Audio('/Pharmienta.mp3');
          fallbackAudio.play().catch(e => console.log('Fallback audio failed:', e));
        } catch (e) {
          console.log('Fallback audio creation failed:', e);
        }
      }
    } else {
      try {
        const fallbackAudio = new Audio('/Pharmienta.mp3');
        fallbackAudio.play().catch(e => console.log('Direct audio failed:', e));
      } catch (e) {
        console.log('Direct audio creation failed:', e);
      }
    }

    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate([200, 100, 200]);
      } catch (err) {
        console.log('Vibration error:', err);
      }
    }
  };
  // --- END: Sound & Vibration ---

  // Base card styles
  const cardBg = isDark ? 'bg-[#161b22] text-[#c9d1d9]' : 'bg-white text-[#1f2328] shadow-sm';
  const cardHover = isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]';
  const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
  const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
  const borderLine = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';
  const inputBg = isDark ? 'bg-[#0d1117] text-[#f0f6fc]' : 'bg-[#f6f8fa] text-[#1f2328]';
  const [showMedDatabase, setShowMedDatabase] = useState(false);
  const touchTarget = 'min-h-[44px] min-w-[44px]';
  const touchTargetSmall = 'min-h-[36px] min-w-[36px]';

  const cartItemBg = isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]';
  const cartItemText = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
  const cartItemSubText = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
  const cartItemBorder = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';
  const selectBg = isDark ? 'bg-[#0d1117] text-[#f0f6fc]' : 'bg-white text-[#1f2328]';

  const skeletonBg = isDark ? 'bg-[#21262d]' : 'bg-[#e8eaed]';
  const skeletonLight = isDark ? 'bg-[#30363d]' : 'bg-[#d0d7de]';
  const [pointsEarned, setPointsEarned] = useState<{ total: number; details: any[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmOverlay, setShowConfirmOverlay] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'saving' | 'syncing' | 'complete' | 'error'>('idle');
  const [processingMessage, setProcessingMessage] = useState('');

  const [saleDate, setSaleDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString();
  });
  // --- END: Sale Date State ---

  useEffect(() => {
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

  // Show confirmation overlay
  const handleCheckoutClick = () => {
    if (cart.length === 0 || isSubmitting) return;

    for (const item of cart) {
      const availableQty = getAvailableQuantity(item.product);
      if (item.quantity > availableQty) {
        alert(`Not enough stock for ${item.product.name}. Available: ${availableQty}`);
        return;
      }
    }

    playCompletionFeedback();
    setShowConfirmOverlay(true);
  };

  // Handle multi-item sale - passes ALL items with pharmacy_name
  const handleConfirmSale = async () => {
    if (cart.length === 0) return;

    // =============================================
    // GUARD: reject re-entry
    // =============================================
    // The button can fire twice before React flushes the
    // `disabled` state to the DOM. A module-level ref
    // survives across the two synchronous clicks, so we
    // use it as a hard lock.
    //
    // This is the fix for the "double sale → 409" bug.
    // =============================================
    if (isSubmittingRef.current) {
      console.warn('[PosView] handleConfirmSale: already in flight, ignoring');
      return;
    }
    isSubmittingRef.current = true;

    setIsSubmitting(true);
    setShowConfirmOverlay(false);
    setProcessingStatus('saving');
    setProcessingMessage('Saving sale locally...');
    try {
      const safePharmacyName = pharmacyName || 'Unknown Pharmacy';

      const subtotalTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
      const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
      const finalTotal = Math.max(0, subtotalTotal - discountAmount);

      const saleData: Partial<Sale> = {
        customer_id: selectedCustomer?.id || null,
        customer_name: selectedCustomer?.name || 'Cash Customer',
        sold_by: currentProfile?.id || null,
        sold_by_name: currentProfile?.full_name || 'System User',
        discount: discountAmount,
        discount_reason: discountReason || null,
        tax: 0,
        total: finalTotal,
        payment_method: paymentMethod,
        payment_status: 'paid',
        payment_reference: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        status: 'completed',
        sale_date: (() => {
          const dateObj = new Date(saleDate);
          if (isNaN(dateObj.getTime())) {
            return new Date().toISOString();
          }
          return dateObj.toISOString();
        })(),
        pharmacy_name: safePharmacyName,
        pharmacy_id: currentProfile?.pharmacy_id || null,
      };
      setProcessingStatus('syncing');
      setProcessingMessage('Syncing to cloud...');

      const result = await onCompleteSale(saleData, cart);

      if (discountAmount > 0 && result?.saleId) {
        setProcessingMessage('Saving discount details...');
      }

      // --- CALCULATE AND AWARD LOYALTY POINTS AFTER SALE COMPLETES ---
      // =============================================
      // LOYALTY POINTS
      // =============================================
      // Points are now awarded INSIDE handleCompleteSale's
      // transaction. The result object tells us how many.
      //
      // The variable `pointsEarnedTotal` is still used below
      // (in the completion message and the reset logic), so we
      // define it here from the result.
      // =============================================
      const pointsEarnedTotal = result?.loyaltyAwarded || 0;

      if (pointsEarnedTotal > 0) {
        setPointsEarned({
          total: pointsEarnedTotal,
          details: [], // details come from inside the transaction
        });
      } else {
        setPointsEarned(null);
      }

      // Refresh selectedCustomer so the header shows the new balance
      if (selectedCustomer) {
        const refreshed = await db.customers.where('id').equals(selectedCustomer.id).first();
        if (refreshed) setSelectedCustomer(refreshed);
      }

      setProcessingStatus('complete');
      if (pointsEarnedTotal > 0) {
        setProcessingMessage(`Sale completed! ${totalItems} items sold. Earned ${pointsEarnedTotal} loyalty points!`);
      } else {
        setProcessingMessage(`Sale completed! ${totalItems} items sold`);
      }

      playCompletionFeedback();

      // Clear cart and reset to today
      setCart([]);
      setPointsEarned(null);
      setDiscountAmount(0);
      setDiscountReason('');
      if (pointsEarnedTotal === 0) {
        setSelectedCustomer(null);
      }
      setPaymentMethod('cash');
      setSaleDate(new Date().toISOString());

      setTimeout(() => {
        setProcessingStatus('idle');
        setProcessingMessage('');
      }, 1500);

    } catch (err: any) {
      console.error('Sale error:', err);
      setProcessingStatus('error');
      setProcessingMessage(`Error: ${err.message || 'Failed to complete sale'}`);

      setTimeout(() => {
        setProcessingStatus('idle');
        setProcessingMessage('');
      }, 3000);
    } finally {
      isSubmittingRef.current = false;
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
    <div className="flex flex-col gap-4 px-0 md:px-4 pb-20 md:pb-6">

      {/* =============================================
          MOBILE CART - ALWAYS ON TOP (Mobile First)
          ============================================ */}
      <div className={`lg:hidden rounded-2xl p-4 shadow-xl flex flex-col ${cardBg}`}>
        {/* Cart Title & Clear */}
        <div className={`flex items-center justify-between pb-3 mb-3 ${borderLine}`}>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#2ea043]" />
            <h2 className={`font-extrabold text-base ${textTitle}`}>Current Cart</h2>
            <span className="bg-[#2ea043]/20 text-[#2ea043] text-xs px-2.5 py-1 rounded-full font-extrabold">
              {cart.length}
            </span>
            {cart.length > 0 && (
              <span className={`text-xs ${textMuted}`}>
                ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)
              </span>
            )}
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

        {/* Cart Item List - Mobile */}
        {isLoading ? (
          <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
            <SkeletonCartItem />
            <SkeletonCartItem />
            <SkeletonCartItem />
          </div>
        ) : cart.length === 0 ? (
          <div className={`py-6 text-center ${textMuted} text-sm space-y-2`}>
            <ShoppingBag className={`w-10 h-10 mx-auto ${textMuted}`} />
            <p>Your cart is empty.</p>
            <p className="text-[11px]">Search and tap items to add.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {cart.map((item, idx) => (
              <div
                key={idx}
                className={`${cartItemBg} rounded-xl p-2 text-sm flex flex-col gap-1.5`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <p className={`font-bold text-xs ${cartItemText}`}>{item.product.name}</p>
                    {item.product.form && (
                      <p className={`text-[9px] ${cartItemSubText}`}>
                        {item.product.form} {item.product.strength}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    className={`${isDark ? 'text-slate-500 hover:text-rose-400' : 'text-[#656d76] hover:text-rose-500'} transition-colors p-1.5 ${touchTargetSmall}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className={`flex items-center justify-between pt-1.5 ${cartItemBorder}`}>
                  <div className={`flex items-center gap-1 ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'} rounded-lg p-0.5`}>
                    <button
                      onClick={() => updateQuantity(idx, item.quantity - 1)}
                      className={`w-7 h-7 rounded ${isDark ? 'hover:bg-[#21262d] text-[#c9d1d9]' : 'hover:bg-[#eaeef2] text-[#1f2328]'} flex items-center justify-center font-bold ${touchTargetSmall}`}
                    >
                      <Minus className="w-3.5 h-3.5" />
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
                      className={`w-10 text-center font-bold text-sm ${isDark ? 'bg-[#161b22] text-emerald-400' : 'bg-white text-emerald-600'} rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 py-0.5 ${touchTargetSmall}`}
                    />
                    <button
                      onClick={() => updateQuantity(idx, item.quantity + 1)}
                      className={`w-7 h-7 rounded ${isDark ? 'hover:bg-[#21262d] text-[#c9d1d9]' : 'hover:bg-[#eaeef2] text-[#1f2328]'} flex items-center justify-center font-bold ${touchTargetSmall}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className={`font-bold text-sm ${cartItemText}`}>
                    {currency} {item.subtotal.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Customer & Payment Method - Mobile */}
        <div className={`mt-3 pt-2 ${borderLine} space-y-2`}>
          {selectedCustomer ? (
            <SelectedCustomerCard
              customer={selectedCustomer}
              onClear={() => setSelectedCustomer(null)}
              onChange={() => setSelectedCustomer(null)}
              isDark={isDark}
              textMuted={textMuted}
              textTitle={textTitle}
            />
          ) : (
            <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm ${textMuted} gap-1 sm:gap-2`}>
              <span className="flex items-center gap-2 shrink-0">
                <User className="w-4 h-4 shrink-0" />
                Customer:
              </span>
              <div className="w-full sm:flex-1 sm:max-w-[280px]">
                <CustomerSelector
                  pharmacyName={pharmacyName || ''}
                  selectedCustomer={selectedCustomer}
                  onSelectCustomer={setSelectedCustomer}
                  onCustomerCreated={(customer) => {
                    setSelectedCustomer(customer);
                  }}
                  theme={theme}
                  currentProfileId={currentProfile?.id}
                />
              </div>
            </div>
          )}

          <div className={`flex items-center justify-between text-sm ${textMuted}`}>
            <span className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Discount:
            </span>
            <input
              type="number"
              min="0"
              max={subtotal}
              value={discountAmount || ''}
              onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
              placeholder="0"
              className={`${inputBg} text-sm rounded-lg px-3 py-2 w-20 text-right focus:outline-none focus:ring-1 focus:ring-[#2ea043] ${touchTargetSmall}`}
            />
          </div>

          <div className={`flex items-center justify-between text-sm ${textMuted}`}>
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date:
            </span>
            <input
              type="datetime-local"
              value={(() => {
                const dateObj = saleDate ? new Date(saleDate) : new Date();
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                const hours = String(dateObj.getHours()).padStart(2, '0');
                const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}`;
              })()}
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  const dateObj = new Date(value);
                  if (!isNaN(dateObj.getTime())) {
                    setSaleDate(dateObj.toISOString());
                  }
                }
              }}
              className={`${inputBg} text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#2ea043] ${touchTargetSmall}`}
            />
          </div>

          <div>
            <p className={`text-[10px] font-bold uppercase ${textMuted} mb-1.5`}>Payment</p>
            <div className="grid grid-cols-5 gap-1 text-[10px]">
              {(['cash', 'mpesa', 'card', 'credit', 'insurance'] as PaymentMethod[]).map(pm => (
                <button
                  key={pm}
                  onClick={() => setPaymentMethod(pm)}
                  className={`py-2 px-1 rounded-lg font-bold uppercase transition-colors ${touchTargetSmall} ${paymentMethod === pm
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

        {/* Mobile Checkout Summary */}
        <div className={`mt-3 pt-2 ${borderLine} space-y-2`}>
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
          <div className={`flex justify-between items-center font-extrabold text-lg ${textTitle}`}>
            <span>Total:</span>
            <span className="text-[#2ea043]">{currency} {finalTotal.toFixed(2)}</span>
          </div>

          <button
            onClick={handleCheckoutClick}
            disabled={cart.length === 0 || isSubmitting}
            className={`w-full py-3 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98 ${touchTarget} ${cart.length === 0 || isSubmitting
              ? isDark
                ? 'bg-[#21262d] text-[#8b949e] cursor-not-allowed'
                : 'bg-[#f6f8fa] text-[#656d76] cursor-not-allowed'
              : 'bg-[#2ea043] hover:bg-[#2c9b3e] text-white shadow-[#2ea043]/20'
              }`}
          >
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            <span>COMPLETE SALE ({currency} {finalTotal.toFixed(2)})</span>
          </button>
        </div>
      </div>

      {/* =============================================
          MOBILE PRODUCTS LIST - Below the cart
          ============================================ */}
      <div className="lg:hidden space-y-4">
        {/* Search Bar & Barcode Trigger */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 ${textMuted}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drugs..."
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

        {/* Category Pills - Mobile */}
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
            All
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

        {/* Product Cards Grid - Mobile */}
        <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
          {isLoading ? (
            <>
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
                  <p className="font-semibold text-base">No Products</p>
                  <p className="text-sm">Add your first product to start selling.</p>
                </div>
              ) : (
                'No matching items found.'
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
                  className={`text-left p-3 rounded-2xl transition-all flex flex-col justify-between relative group ${touchTarget} ${isOutOfStock
                    ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900/40'
                    : `${cardBg} ${cardHover} active:scale-98`
                    }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <p className={`font-bold text-xs line-clamp-2 leading-tight ${textTitle}`}>
                        {prod.name}
                      </p>
                      {prod.prescription_required && (
                        <span className="text-[8px] font-black uppercase text-amber-500 bg-amber-500/15 px-1 py-0.5 rounded shrink-0">
                          Rx
                        </span>
                      )}
                    </div>
                    {prod.generic_name && (
                      <p className={`text-[10px] truncate mt-0.5 ${textMuted}`}>
                        {prod.generic_name}
                      </p>
                    )}
                  </div>

                  <div className={`mt-2 pt-1.5 flex items-center justify-between ${borderLine}`}>
                    <div>
                      <span className="text-xs font-extrabold text-[#2ea043]">
                        {currency} {prod.selling_price}
                      </span>
                    </div>

                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isOutOfStock
                      ? 'bg-rose-500/15 text-rose-500'
                      : isLowStock
                        ? 'bg-amber-500/15 text-amber-500'
                        : isDark ? 'bg-[#30363d] text-[#c9d1d9]' : 'bg-slate-200 text-slate-700'
                      }`}>
                      {isOutOfStock ? 'OUT' : `${availableQty}`}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* =============================================
          DESKTOP LAYOUT - Side by side (hidden on mobile)
          ============================================ */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-4">

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

          {/* Product Cards Grid - Desktop */}
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

        {/* Right Column: Cart & Checkout - Desktop */}
        <div className={`lg:col-span-5 rounded-2xl p-4 shadow-xl flex flex-col justify-between h-full ${cardBg}`}>
          {/* Copy your desktop cart content here */}
          <div>
            {/* Cart Title & Clear */}
            <div className={`flex items-center justify-between pb-3 mb-3 ${borderLine}`}>
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#2ea043]" />
                <h2 className={`font-extrabold text-base ${textTitle}`}>Current Cart</h2>
                <span className="bg-[#2ea043]/20 text-[#2ea043] text-xs px-2.5 py-1 rounded-full font-extrabold">
                  {cart.length}
                </span>
                {cart.length > 0 && (
                  <span className={`text-xs ${textMuted}`}>
                    ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)
                  </span>
                )}
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

            {/* Cart Item List - Desktop */}
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

            {/* Customer & Payment Method - Desktop */}
            <div className={`mt-4 pt-3 ${borderLine} space-y-3`}>
              {selectedCustomer ? (
                <SelectedCustomerCard
                  customer={selectedCustomer}
                  onClear={() => setSelectedCustomer(null)}
                  onChange={() => setSelectedCustomer(null)}
                  isDark={isDark}
                  textMuted={textMuted}
                  textTitle={textTitle}
                />
              ) : (
                <div className={`flex items-center justify-between text-sm ${textMuted} gap-2`}>
                  <span className="flex items-center gap-2 shrink-0">
                    <User className="w-4 h-4" />
                    Customer:
                  </span>
                  <div className="flex-1 max-w-[320px]">
                    <CustomerSelector
                      pharmacyName={pharmacyName || ''}
                      selectedCustomer={selectedCustomer}
                      onSelectCustomer={setSelectedCustomer}
                      onCustomerCreated={(customer) => {
                        setSelectedCustomer(customer);
                      }}
                      theme={theme}
                      currentProfileId={currentProfile?.id}
                    />
                  </div>
                </div>
              )}
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

              <div className={`flex items-center justify-between text-sm ${textMuted}`}>
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Sale Date & Time:
                </span>
                <input
                  type="datetime-local"
                  value={(() => {
                    const dateObj = saleDate ? new Date(saleDate) : new Date();
                    const year = dateObj.getFullYear();
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const hours = String(dateObj.getHours()).padStart(2, '0');
                    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                    return `${year}-${month}-${day}T${hours}:${minutes}`;
                  })()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      const dateObj = new Date(value);
                      if (!isNaN(dateObj.getTime())) {
                        setSaleDate(dateObj.toISOString());
                      }
                    }
                  }}
                  className={`${inputBg} text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#2ea043] ${touchTargetSmall}`}
                  title="Select sale date and time"
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

          {/* Checkout Button - Desktop */}
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
      </div>
      {/* =============================================
          CONFIRMATION OVERLAY (Persistent)
          ============================================ */}
      {showConfirmOverlay && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
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
                Items ({cart.length} unique • {cart.reduce((sum, item) => sum + item.quantity, 0)} total)
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

            {/* Payment Method & Sale Date */}
            <div className={`mt-3 pt-3 ${borderLine}`}>
              <div className="flex items-center justify-between text-sm">
                <span className={textMuted}>Payment Method</span>
                <span className={`font-bold uppercase ${textTitle}`}>{paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className={textMuted}>Sale Date</span>
                <span className={`font-bold ${textTitle}`}>
                  {new Date(saleDate).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
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

      {/* =============================================
          PROCESSING OVERLAY - Shows progress during sale
          ============================================ */}
      {processingStatus !== 'idle' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`max-w-sm w-full rounded-2xl shadow-2xl p-8 ${cardBg} border ${borderLine} text-center`}>

            {/* Status Icon */}
            <div className="flex justify-center mb-4">
              {processingStatus === 'saving' && (
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              )}
              {processingStatus === 'syncing' && (
                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse">
                  <div className="relative">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 bg-amber-500 rounded-full animate-ping" />
                    </div>
                  </div>
                </div>
              )}
              {processingStatus === 'complete' && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center animate-bounce mx-auto">
                    <Check className="w-10 h-10 text-emerald-500" />
                  </div>
                  {pointsEarned && pointsEarned.total > 0 && (
                    <div className="mt-3 px-4 py-2 rounded-lg bg-amber-500/20 inline-block">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 text-sm font-bold">+{pointsEarned.total} Loyalty Points!</span>
                      </div>
                      {pointsEarned.details.length > 0 && (
                        <div className="mt-1 text-xs text-amber-400/70">
                          {pointsEarned.details.slice(0, 3).map((award, i) => (
                            <span key={i} className="block">
                              {award.description}: +{award.points} pts
                            </span>
                          ))}
                          {pointsEarned.details.length > 3 && (
                            <span>+{pointsEarned.details.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {processingStatus === 'error' && (
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
              )}
            </div>

            {/* Status Message */}
            <h3 className={`text-lg font-bold ${textTitle} mb-2`}>
              {processingStatus === 'saving' && 'Saving Sale...'}
              {processingStatus === 'syncing' && 'Syncing to Cloud...'}
              {processingStatus === 'complete' && 'Sale Complete!'}
              {processingStatus === 'error' && 'Sale Failed'}
            </h3>

            <p className={`text-sm ${textMuted}`}>
              {processingMessage}
            </p>

            {/* Progress Bar */}
            {processingStatus !== 'complete' && processingStatus !== 'error' && (
              <div className="mt-4 w-full bg-slate-700/30 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${processingStatus === 'saving' ? 'bg-blue-500 w-1/3' :
                    processingStatus === 'syncing' ? 'bg-amber-500 w-2/3' :
                      'w-0'
                    }`}
                />
              </div>
            )}

            {/* Complete/Error button */}
            {(processingStatus === 'complete' || processingStatus === 'error') && (
              <button
                onClick={() => {
                  setProcessingStatus('idle');
                  setProcessingMessage('');
                }}
                className={`mt-4 px-6 py-2.5 rounded-xl font-bold text-sm transition-colors ${processingStatus === 'complete'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
              >
                {processingStatus === 'complete' ? 'Continue' : 'Try Again'}
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
// =============================================
// SELECTED CUSTOMER CARD — premium, always visible
// =============================================
// Why this exists:
//   When a customer is selected, we show a full card
//   with their name, phone, tier, points, and controls.
//   This prevents staff from confusing customers when
//   awarding loyalty points.
// =============================================
interface SelectedCustomerCardProps {
  customer: Customer;
  onClear: () => void;
  onChange: () => void;
  isDark: boolean;
  textMuted: string;
  textTitle: string;
}

const AVATAR_GRADIENTS = [
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-red-600',
  'from-cyan-500 to-blue-600',
  'from-lime-500 to-green-600',
  'from-fuchsia-500 to-purple-600',
];

function getAvatarGradient(name: string): string {
  if (!name) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getTierFromPoints(points: number) {
  if (points >= 500)
    return { label: 'Platinum', color: 'text-purple-400', bg: 'bg-purple-500/20' };
  if (points >= 200)
    return { label: 'Gold', color: 'text-amber-400', bg: 'bg-amber-400/20' };
  if (points >= 100)
    return { label: 'Silver', color: 'text-slate-300', bg: 'bg-slate-400/20' };
  if (points >= 50)
    return { label: 'Bronze', color: 'text-amber-600', bg: 'bg-amber-500/20' };
  return { label: 'Member', color: 'text-slate-400', bg: 'bg-slate-500/20' };
}

const SelectedCustomerCard: React.FC<SelectedCustomerCardProps> = ({
  customer,
  onClear,
  onChange,
  isDark,
  textMuted,
  textTitle,
}) => {
  const points = customer.loyalty_points || 0;
  const tier = getTierFromPoints(points);
  const gradient = getAvatarGradient(customer.name || '?');
  const initials = getInitials(customer.name || '?');

  const cardBg = isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]';

  return (
    <div className={`rounded-2xl p-3 ${cardBg} flex flex-col gap-2.5`}>
      {/* Top row — avatar + name + actions */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div
            className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-base font-black`}
          >
            {initials}
          </div>
          {/* Tier badge */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${tier.bg} flex items-center justify-center ring-2 ${isDark ? 'ring-[#21262d]' : 'ring-[#f6f8fa]'
              }`}
          >
            <span className={`text-[8px] font-black ${tier.color}`}>★</span>
          </div>
        </div>

        {/* Name + phone */}
        <div className="flex-1 min-w-0">
          <p className={`font-black text-sm ${textTitle} truncate`}>
            {customer.name || 'Unknown Customer'}
          </p>
          {customer.phone ? (
            <p className={`text-xs ${textMuted} truncate mt-0.5`}>
              📞 {customer.phone}
            </p>
          ) : (
            <p className={`text-xs ${textMuted} italic mt-0.5`}>No phone</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onChange}
            className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-[#30363d]' : 'hover:bg-slate-200'} transition-colors ${textMuted}`}
            title="Change customer"
            aria-label="Change customer"
          >
            <User className="w-4 h-4" />
          </button>
          <button
            onClick={onClear}
            className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-[#30363d]' : 'hover:bg-slate-200'} text-rose-500 transition-colors`}
            title="Remove customer"
            aria-label="Remove customer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom row — tier + points */}
      <div className="flex items-center gap-2 flex-wrap">
        <div
          className={`px-2.5 py-1 rounded-full ${tier.bg} flex items-center gap-1.5`}
        >
          <span className={`text-[10px] font-black uppercase tracking-wider ${tier.color}`}>
            {tier.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15">
          <span className="text-[11px] font-black text-amber-500">
            {points.toLocaleString()} pts
          </span>
        </div>

        {customer.loyalty_card_number && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2ea043]/15">
            <span className="text-[10px] font-black text-[#2ea043]">
              #{customer.loyalty_card_number}
            </span>
          </div>
        )}
      </div>

      {/* Safety note — prevents wrong customer staff mistake */}
      <div className={`text-[10px] ${textMuted} leading-tight`}>
        ⚠️ Points will be credited to <span className="font-bold">{customer.name}</span>. Confirm this is the right customer before completing the sale.
      </div>
    </div>
  );
};