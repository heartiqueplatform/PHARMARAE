// components/views/SmartOrderView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../lib/db';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';
import { normalizePharmacyName, genUUID } from '../../utils/helpers';
import { Product, SupplierPartnershipRequest, SupplierOrder, SupplierOrderItem, ReorderRecommendation, SupplierAccount } from '../../types';

interface SmartOrderViewProps {
    pharmacyName: string;
    pharmacyId: string;
    profileId: string;
    profileName: string;
    products: Product[];
    theme: 'light' | 'dark';
    currency: string;
    pharmacyPhone?: string;
    pharmacyEmail?: string;
    pharmacyAddress?: string;
    pharmacyTown?: string;
    pharmacyCounty?: string;
    pharmacyPpbLicense?: string;
    onOrderPlaced?: () => void;
    onRefresh?: () => void;
}

type TabType = 'partnerships' | 'available' | 'reorder' | 'orders';

const STATUS_CONFIG: Record<string, { color: string; label: string; progress: number; canConfirm: boolean }> = {
    new: { color: 'text-blue-600', label: 'New Order', progress: 0, canConfirm: false },
    pending: { color: 'text-yellow-600', label: 'Pending Approval', progress: 20, canConfirm: false },
    processing: { color: 'text-purple-600', label: 'Processing', progress: 40, canConfirm: false },
    shipped: { color: 'text-indigo-600', label: 'Shipped', progress: 60, canConfirm: false },
    delivered: { color: 'text-emerald-600', label: 'Delivered - Ready to Confirm', progress: 90, canConfirm: true },
    confirmed: { color: 'text-emerald-700', label: 'Confirmed - Stock Added', progress: 100, canConfirm: false },
    rejected: { color: 'text-red-600', label: 'Rejected', progress: 0, canConfirm: false },
    cancelled: { color: 'text-gray-500', label: 'Cancelled', progress: 0, canConfirm: false },
};

export function SmartOrderView({
    pharmacyName,
    pharmacyId,
    profileId,
    profileName,
    products,
    theme,
    currency,
    pharmacyPhone = '',
    pharmacyEmail = '',
    pharmacyAddress = '',
    pharmacyTown = 'Nairobi',
    pharmacyCounty = 'Nairobi',
    pharmacyPpbLicense = '',
    onOrderPlaced,
    onRefresh
}: SmartOrderViewProps) {
    const isDark = theme === 'dark';

    const [activeTab, setActiveTab] = useState<TabType>('partnerships');
    const [partnerships, setPartnerships] = useState<SupplierPartnershipRequest[]>([]);
    const [orders, setOrders] = useState<SupplierOrder[]>([]);
    const [orderItems, setOrderItems] = useState<SupplierOrderItem[]>([]);
    const [acceptedSuppliers, setAcceptedSuppliers] = useState<SupplierPartnershipRequest[]>([]);
    const [availableSuppliers, setAvailableSuppliers] = useState<SupplierAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [responding, setResponding] = useState<string | null>(null);
    const [responseNote, setResponseNote] = useState('');
    const [confirmingOrder, setConfirmingOrder] = useState<string | null>(null);
    const [sendingRequest, setSendingRequest] = useState<string | null>(null);
    const [requestMessage, setRequestMessage] = useState('');
    const [selectedSupplierForRequest, setSelectedSupplierForRequest] = useState<string | null>(null);

    const [selectedSupplier, setSelectedSupplier] = useState<string>('');
    const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map());
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [orderNotes, setOrderNotes] = useState('');
    const [recommendations, setRecommendations] = useState<ReorderRecommendation[]>([]);

    const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(null);
    const [showOrderDetail, setShowOrderDetail] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        loadData();
    }, [pharmacyName]);

    useEffect(() => {
        const interval = setInterval(() => {
            loadData();
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const normalized = normalizePharmacyName(pharmacyName);

            const allPartnerships = await db.suppliers_partnership_requests
                .where('pharmacy_name')
                .equals(normalized)
                .toArray();
            setPartnerships(allPartnerships);
            setAcceptedSuppliers(allPartnerships.filter(p => p.status === 'accepted'));

            const ordersData = await db.suppliers_orders
                .where('pharmacy_name')
                .equals(normalized)
                .toArray();
            setOrders(ordersData);

            // Clean up orphaned order items
            const validOrderIds = ordersData.map(o => o.id);
            if (validOrderIds.length > 0) {
                await db.suppliers_order_items
                    .where('order_id')
                    .noneOf(validOrderIds)
                    .delete();
            }

            const itemsData = await db.suppliers_order_items.toArray();
            setOrderItems(itemsData);

            const cachedSuppliers = localStorage.getItem('medp_available_suppliers');
            if (cachedSuppliers) {
                try {
                    const suppliers = JSON.parse(cachedSuppliers);
                    setAvailableSuppliers(suppliers);
                } catch (e) {
                    console.warn('Failed to parse cached suppliers');
                }
            }

            generateRecommendations(normalized);
            syncFromSupabase(normalized);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await syncFromSupabase(normalizePharmacyName(pharmacyName));
        setIsRefreshing(false);
        if (onRefresh) onRefresh();
    };

    const syncFromSupabase = async (normalized: string) => {
        try {
            const client = getSupabaseClient();
            if (!client || !isSupabaseConfigured()) return;

            const { data: partnershipData, error: pError } = await client
                .from('suppliers_partnership_requests')
                .select('*')
                .eq('pharmacy_name', normalized)
                .order('created_at', { ascending: false });

            if (!pError && partnershipData) {
                await db.suppliers_partnership_requests.bulkPut(partnershipData);
                const updated = await db.suppliers_partnership_requests
                    .where('pharmacy_name')
                    .equals(normalized)
                    .toArray();
                setPartnerships(updated);
                setAcceptedSuppliers(updated.filter(p => p.status === 'accepted'));
            }

            const { data: supplierData, error: sError } = await client
                .from('suppliers_accounts')
                .select('*')
                .eq('status', 'active')
                .order('business_name', { ascending: true });

            if (!sError && supplierData) {
                setAvailableSuppliers(supplierData);
                localStorage.setItem('medp_available_suppliers', JSON.stringify(supplierData));
                localStorage.setItem('medp_available_suppliers_updated', new Date().toISOString());
            }

            const { data: orderData, error: oError } = await client
                .from('suppliers_orders')
                .select('*')
                .eq('pharmacy_name', normalized)
                .order('created_at', { ascending: false });

            if (!oError && orderData) {
                await db.suppliers_orders.bulkPut(orderData);
                const updatedOrders = await db.suppliers_orders
                    .where('pharmacy_name')
                    .equals(normalized)
                    .toArray();
                setOrders(updatedOrders);
            }

            const orderIds = orders.map(o => o.id);
            if (orderIds.length > 0) {
                const { data: itemData, error: iError } = await client
                    .from('suppliers_order_items')
                    .select('*')
                    .in('order_id', orderIds);

                if (!iError && itemData) {
                    await db.suppliers_order_items.bulkPut(itemData);
                    const updatedItems = await db.suppliers_order_items.toArray();
                    setOrderItems(updatedItems);
                }
            }
        } catch (error) {
            console.warn('Sync failed:', error);
        }
    };

    const generateRecommendations = useCallback(async (normalized: string) => {
        try {
            const allProducts = await db.products
                .where('pharmacy_name')
                .equals(normalized)
                .toArray();

            const allSales = await db.sales
                .where('pharmacy_name')
                .equals(normalized)
                .toArray();

            const recs: ReorderRecommendation[] = [];
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            for (const product of allProducts) {
                const currentStock = product.quantity || 0;
                const reorderLevel = product.reorder_level || 10;

                const productSales = allSales.filter(s => s.product_id === product.id);
                const monthlySales = productSales.filter(s =>
                    s.sale_date && new Date(s.sale_date) >= thirtyDaysAgo
                ).reduce((sum, s) => sum + (s.quantity || 0), 0);

                const dailyAverage = monthlySales / 30 || 0;
                const daysUntilOut = dailyAverage > 0 ? Math.floor(currentStock / dailyAverage) : 999;

                let priority: 'critical' | 'high' | 'medium' | 'low' = 'low';
                let reason = '';
                let suggestedQty = 0;

                if (currentStock <= 5 && daysUntilOut <= 3) {
                    priority = 'critical';
                    reason = `CRITICAL: Only ${currentStock} left (${daysUntilOut} days)`;
                    suggestedQty = Math.max(reorderLevel * 3, 20);
                } else if (currentStock <= reorderLevel && daysUntilOut <= 7) {
                    priority = 'high';
                    reason = `LOW STOCK: ${currentStock} left (${daysUntilOut} days)`;
                    suggestedQty = Math.max(reorderLevel * 2, 15);
                } else if (monthlySales > 50 && currentStock < 30) {
                    priority = 'medium';
                    reason = `FAST MOVER: ${monthlySales} units/month, stock ${currentStock}`;
                    suggestedQty = Math.ceil(monthlySales * 1.5);
                } else if (currentStock < reorderLevel) {
                    priority = 'medium';
                    reason = `Below reorder level (${currentStock}/${reorderLevel})`;
                    suggestedQty = reorderLevel * 2;
                }

                if (priority !== 'low') {
                    recs.push({
                        product_id: product.id,
                        product_name: product.name,
                        current_stock: currentStock,
                        reorder_level: reorderLevel,
                        reorder_quantity: suggestedQty || reorderLevel,
                        days_until_out: daysUntilOut,
                        monthly_sales: monthlySales,
                        weekly_sales: productSales.filter(s =>
                            s.sale_date && new Date(s.sale_date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        ).reduce((sum, s) => sum + (s.quantity || 0), 0),
                        priority,
                        reason,
                        category: product.category_name || undefined
                    });
                }
            }

            recs.sort((a, b) => {
                const order = { critical: 0, high: 1, medium: 2, low: 3 };
                return order[a.priority] - order[b.priority];
            });

            setRecommendations(recs);
        } catch (error) {
            console.error('Failed to generate recommendations:', error);
        }
    }, []);

    const handleAcceptPartnership = async (partnershipId: string) => {
        setResponding(partnershipId);
        try {
            const client = getSupabaseClient();
            if (!client) {
                alert('No connection to server');
                return;
            }

            const { error } = await client
                .from('suppliers_partnership_requests')
                .update({
                    status: 'accepted',
                    pharmacy_response_note: responseNote || 'Accepted',
                    responded_at: new Date().toISOString()
                })
                .eq('id', partnershipId);

            if (error) throw error;

            await db.suppliers_partnership_requests.update(partnershipId, {
                status: 'accepted',
                pharmacy_response_note: responseNote || 'Accepted',
                responded_at: new Date().toISOString()
            });

            const normalized = normalizePharmacyName(pharmacyName);
            const updated = await db.suppliers_partnership_requests
                .where('pharmacy_name')
                .equals(normalized)
                .toArray();
            setPartnerships(updated);
            setAcceptedSuppliers(updated.filter(p => p.status === 'accepted'));
            setResponseNote('');
            alert('Partnership accepted. You can now order from this supplier.');
        } catch (error: any) {
            alert('Failed to accept: ' + (error.message || 'Unknown error'));
        } finally {
            setResponding(null);
        }
    };

    const handleRejectPartnership = async (partnershipId: string) => {
        if (!confirm('Reject this partnership request?')) return;

        setResponding(partnershipId);
        try {
            const client = getSupabaseClient();
            if (!client) {
                alert('No connection to server');
                return;
            }

            const { error } = await client
                .from('suppliers_partnership_requests')
                .update({
                    status: 'rejected',
                    pharmacy_response_note: responseNote || 'Declined',
                    responded_at: new Date().toISOString()
                })
                .eq('id', partnershipId);

            if (error) throw error;

            await db.suppliers_partnership_requests.update(partnershipId, {
                status: 'rejected',
                pharmacy_response_note: responseNote || 'Declined',
                responded_at: new Date().toISOString()
            });

            const normalized = normalizePharmacyName(pharmacyName);
            const updated = await db.suppliers_partnership_requests
                .where('pharmacy_name')
                .equals(normalized)
                .toArray();
            setPartnerships(updated);
            setAcceptedSuppliers(updated.filter(p => p.status === 'accepted'));
            setResponseNote('');
        } catch (error: any) {
            alert('Failed to reject: ' + (error.message || 'Unknown error'));
        } finally {
            setResponding(null);
        }
    };

    const handleSendPartnershipRequest = async (supplierId: string) => {
        const supplier = availableSuppliers.find(s => s.id === supplierId);
        if (!supplier) {
            alert('Supplier not found');
            return;
        }

        // Check if there's already a rejected request for this supplier
        const existingRejected = partnerships.find(
            p => p.supplier_id === supplierId && p.status === 'rejected'
        );

        const action = existingRejected ? 'resend' : 'send';
        if (!confirm(`Send partnership request to ${supplier.business_name}?`)) return;

        setSendingRequest(supplierId);
        try {
            const client = getSupabaseClient();
            if (!client) {
                alert('No connection to server');
                return;
            }

            const now = new Date().toISOString();
            const normalized = normalizePharmacyName(pharmacyName);

            if (existingRejected) {
                // UPDATE EXISTING REJECTED REQUEST back to pending
                const updatedData = {
                    status: 'pending',
                    message: requestMessage || `New request from ${profileName}`,
                    pharmacy_response_note: null,
                    responded_at: null,
                    updated_at: now,
                };

                // Update in Supabase
                const { error } = await client
                    .from('suppliers_partnership_requests')
                    .update(updatedData)
                    .eq('id', existingRejected.id);

                if (error) throw error;

                // Update in IndexedDB
                await db.suppliers_partnership_requests.update(existingRejected.id, updatedData);

                alert(`New request sent to ${supplier.business_name} successfully!`);
            } else {
                // CREATE NEW REQUEST (no existing rejected)
                const requestId = genUUID();

                const requestData = {
                    id: requestId,
                    supplier_id: supplierId,
                    supplier_name: supplier.business_name,
                    supplier_license_number: supplier.license_number || null,
                    pharmacy_id: pharmacyId,
                    pharmacy_name: normalized,
                    pharmacy_email: pharmacyEmail,
                    pharmacy_phone: pharmacyPhone,
                    pharmacy_town: pharmacyTown,
                    pharmacy_county: pharmacyCounty,
                    proposed_credit_limit: null,
                    proposed_payment_terms: 'Net 30 Days',
                    discount_offered_percent: null,
                    categories_offered: [],
                    message: requestMessage || `Partnership request from ${profileName}`,
                    status: 'pending',
                    pharmacy_response_note: null,
                    responded_at: null,
                    created_at: now,
                    updated_at: now,
                };

                const { error } = await client
                    .from('suppliers_partnership_requests')
                    .insert(requestData);

                if (error) throw error;

                await db.suppliers_partnership_requests.put(requestData);

                alert(`Partnership request sent to ${supplier.business_name} successfully!`);
            }

            // Refresh data
            const updated = await db.suppliers_partnership_requests
                .where('pharmacy_name')
                .equals(normalized)
                .toArray();
            setPartnerships(updated);
            setAcceptedSuppliers(updated.filter(p => p.status === 'accepted'));

            setRequestMessage('');
            setSelectedSupplierForRequest(null);

        } catch (error: any) {
            alert('Failed to send request: ' + (error.message || 'Unknown error'));
        } finally {
            setSendingRequest(null);
        }
    };
    const handleConfirmOrder = async (orderId: string) => {
        if (!confirm('Confirm receipt of this order? This will add all items to your inventory.')) return;

        setConfirmingOrder(orderId);
        try {
            const client = getSupabaseClient();
            if (!client) {
                alert('No connection to server');
                return;
            }

            const order = orders.find(o => o.id === orderId);
            if (!order) {
                alert('Order not found');
                return;
            }

            const items = orderItems.filter(item => item.order_id === orderId);
            const normalizedPharmacyName = normalizePharmacyName(pharmacyName);

            // Update order status
            const { error: orderError } = await client
                .from('suppliers_orders')
                .update({
                    status: 'confirmed',
                    delivery_info: {
                        ...order.delivery_info,
                        confirmed_at: new Date().toISOString(),
                        stock_added: true
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (orderError) throw orderError;

            await db.suppliers_orders.update(orderId, {
                status: 'confirmed',
                delivery_info: {
                    ...order.delivery_info,
                    confirmed_at: new Date().toISOString(),
                    stock_added: true
                },
                updated_at: new Date().toISOString()
            });

            // Process each item - add stock as batches
            for (const item of items) {
                try {
                    // First, find or create the product
                    let product = null;

                    // Try to find by product_id if it exists
                    if (item.product_id) {
                        try {
                            product = await db.products.get(item.product_id);
                        } catch (err) {
                            console.warn(`Product ${item.product_id} not found in local DB`);
                        }
                    }

                    // If not found by ID, try to find by name
                    if (!product) {
                        try {
                            const productsByName = await db.products
                                .where('name')
                                .equals(item.product_name)
                                .and(p => p.pharmacy_name === normalizedPharmacyName)
                                .toArray();

                            if (productsByName.length > 0) {
                                product = productsByName[0];
                            }
                        } catch (err) {
                            console.warn('Could not find product by name:', err);
                        }
                    }

                    // If product doesn't exist, create it
                    if (!product) {
                        const newProductId = genUUID();
                        const newProduct = {
                            id: newProductId,
                            pharmacy_name: normalizedPharmacyName,
                            name: item.product_name,
                            selling_price: (item.unit_price || 0) * 1.3,
                            default_cost_price: item.unit_price || 0,
                            quantity: item.accepted_quantity,
                            reorder_level: 10,
                            low_stock_threshold: 5,
                            is_active: true,
                            product_type: 'medication',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };

                        const { error: createProductError } = await client
                            .from('products')
                            .insert(newProduct);

                        if (!createProductError) {
                            await db.products.put(newProduct);
                            product = newProduct;
                            console.log(`Created new product: ${product.name}`);
                        } else {
                            console.error('Failed to create product:', createProductError);
                            continue;
                        }
                    }

                    // Now create a batch entry for the received stock
                    const batchId = genUUID();
                    const batchNumber = `BATCH-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
                    const expiryDate = new Date();
                    expiryDate.setFullYear(expiryDate.getFullYear() + 2);

                    // FIX: Set supplier_id to null to avoid foreign key constraint
                    const batchData = {
                        id: batchId,
                        product_id: product.id,
                        supplier_id: null, // Set to null since the supplier might not exist in suppliers table
                        batch_number: batchNumber,
                        expiry_date: expiryDate.toISOString().split('T')[0],
                        quantity_base: item.accepted_quantity,
                        cost_price: item.unit_price || 0,
                        selling_price: (item.unit_price || 0) * 1.3,
                        received_at: new Date().toISOString(),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        pharmacy_name: normalizedPharmacyName
                    };

                    // Insert batch into Supabase
                    const { error: batchError } = await client
                        .from('product_batches')
                        .insert(batchData);

                    if (batchError) {
                        console.error('Failed to create batch:', batchError);
                    } else {
                        // Save batch to IndexedDB
                        if (db.product_batches) {
                            await db.product_batches.put(batchData);
                        }
                        console.log(`Created batch: ${batchNumber} with ${item.accepted_quantity} units`);
                    }

                    // Update the product's total quantity
                    const currentProduct = await db.products.get(product.id);
                    if (currentProduct) {
                        const newTotalQuantity = (currentProduct.quantity || 0) + item.accepted_quantity;
                        await db.products.update(product.id, {
                            quantity: newTotalQuantity,
                            updated_at: new Date().toISOString()
                        });

                        await client
                            .from('products')
                            .update({
                                quantity: newTotalQuantity,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', product.id)
                            .eq('pharmacy_name', normalizedPharmacyName);
                    }

                } catch (err) {
                    console.error(`Error processing item ${item.product_name}:`, err);
                }
            }

            // Refresh data
            const normalized = normalizePharmacyName(pharmacyName);
            const updatedOrders = await db.suppliers_orders
                .where('pharmacy_name')
                .equals(normalized)
                .toArray();
            setOrders(updatedOrders);

            setConfirmingOrder(null);
            setShowOrderDetail(false);
            setSelectedOrder(null);

            if (onRefresh) onRefresh();
            if (onOrderPlaced) onOrderPlaced();
            alert('Order confirmed and stock added as batches successfully!');
        } catch (error: any) {
            console.error('Order confirmation error:', error);
            alert('Failed to confirm order: ' + (error.message || 'Unknown error'));
        } finally {
            setConfirmingOrder(null);
        }
    };
    const handleCreateOrder = async () => {
        if (selectedProducts.size === 0) {
            alert('Please select at least one product');
            return;
        }

        if (!selectedSupplier) {
            alert('Please select a supplier');
            return;
        }

        setIsCreatingOrder(true);
        try {
            const client = getSupabaseClient();
            if (!client) {
                alert('No connection to server');
                return;
            }

            const now = new Date().toISOString();
            const orderId = genUUID();
            const orderNumber = `ORD-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`;

            let subtotal = 0;
            const orderItemsData: SupplierOrderItem[] = [];

            for (const [productId, quantity] of selectedProducts) {
                const product = await db.products.get(productId);
                if (!product) continue;

                // Try to find or create product in suppliers_products
                let supplierProductId = null;

                try {
                    // Check if product exists in suppliers_products
                    const { data: existingProduct } = await client
                        .from('suppliers_products')
                        .select('id')
                        .eq('name', product.name)
                        .eq('supplier_id', selectedSupplier)
                        .maybeSingle();

                    if (existingProduct) {
                        supplierProductId = existingProduct.id;
                    } else {
                        // Create product in suppliers_products with safe defaults
                        const newProductId = genUUID();

                        // Build the product data with fallbacks for missing fields
                        const supplierProductData = {
                            id: newProductId,
                            supplier_id: selectedSupplier,
                            name: product.name || 'Unknown Product',
                            brand_name: product.brand || product.name || 'Unknown Brand',
                            generic_name: product.generic_name || product.name || 'Unknown Generic',
                            sku: product.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                            category: product.category_name || 'General Pharmaceuticals',
                            dosage_form: product.form || 'Tablets',
                            strength: product.strength || null,
                            pack_size: 'Pack of 100',
                            wholesale_price: product.selling_price || product.unit_price || 0,
                            cost_price: product.default_cost_price || product.unit_price || 0,
                            min_order_qty: 1,
                            manufacturer: product.manufacturer || 'Unknown Manufacturer',
                            country_of_origin: 'Kenya',
                            is_active: true,
                            storage_condition: 'ambient',
                            ppb_registration_no: null,
                            created_at: now,
                            updated_at: now
                        };

                        const { error: createError } = await client
                            .from('suppliers_products')
                            .insert(supplierProductData);

                        if (!createError) {
                            supplierProductId = newProductId;
                            console.log(`Created supplier product: ${product.name}`);
                        } else {
                            console.error('Failed to create supplier product:', createError);
                            // If creation fails, we'll still create the order item with null product_id
                        }
                    }
                } catch (err) {
                    console.warn('Could not create supplier product:', err);
                    // Continue with null product_id
                }

                const unitPrice = product.unit_price || 0;
                const totalPrice = unitPrice * quantity;

                const item: SupplierOrderItem = {
                    id: genUUID(),
                    order_id: orderId,
                    product_id: supplierProductId, // Will be null if creation failed
                    product_name: product.name,
                    requested_quantity: quantity,
                    accepted_quantity: quantity,
                    unit_price: unitPrice,
                    total_price: totalPrice,
                    item_status: 'pending',
                    created_at: now,
                    updated_at: now
                };

                subtotal += totalPrice;
                orderItemsData.push(item);
            }
            const deliveryFee = 0;
            const totalAmount = subtotal + deliveryFee;

            const orderData: SupplierOrder = {
                id: orderId,
                order_number: orderNumber,
                supplier_id: selectedSupplier,
                pharmacy_id: pharmacyId,
                pharmacy_name: normalizePharmacyName(pharmacyName),
                pharmacy_contact_person: profileName || 'Superintendent Pharmacist',
                pharmacy_phone: pharmacyPhone || '',
                pharmacy_address: pharmacyAddress || '',
                pharmacy_town: pharmacyTown || 'Nairobi',
                pharmacy_county: pharmacyCounty || 'Nairobi',
                pharmacy_email: pharmacyEmail || '',
                pharmacy_ppb_license: pharmacyPpbLicense || '',
                status: 'new',
                order_date: now,
                subtotal: subtotal,
                tax_amount: 0,
                delivery_fee: deliveryFee,
                total_amount: totalAmount,
                payment_terms: 'Net 30 Days',
                payment_status: 'unpaid',
                order_notes: orderNotes || '',
                created_at: now,
                updated_at: now,
                delivery_info: null,
                rejection_reason: null
            };

            // Insert the order
            const { error: orderError } = await client
                .from('suppliers_orders')
                .insert(orderData);

            if (orderError) {
                throw new Error(`Order creation failed: ${orderError.message}`);
            }

            // Insert all order items
            for (const item of orderItemsData) {
                const { error: itemError } = await client
                    .from('suppliers_order_items')
                    .insert(item);

                if (itemError) {
                    // If an item fails, delete the order to keep things clean
                    await client
                        .from('suppliers_orders')
                        .delete()
                        .eq('id', orderId);
                    throw new Error(`Failed to add item: ${item.product_name} - ${itemError.message}`);
                }
            }

            // Save to IndexedDB
            await db.suppliers_orders.put(orderData);
            await db.suppliers_order_items.bulkPut(orderItemsData);

            // Refresh data
            const normalized = normalizePharmacyName(pharmacyName);
            const updatedOrders = await db.suppliers_orders
                .where('pharmacy_name')
                .equals(normalized)
                .toArray();
            setOrders(updatedOrders);

            const updatedItems = await db.suppliers_order_items.toArray();
            setOrderItems(updatedItems);

            setSelectedProducts(new Map());
            setSelectedSupplier('');
            setOrderNotes('');

            if (onOrderPlaced) onOrderPlaced();
            alert(`Order ${orderNumber} created successfully!`);
        } catch (error: any) {
            console.error('Order creation error:', error);
            alert('Failed to create order: ' + (error.message || 'Unknown error'));
        } finally {
            setIsCreatingOrder(false);
        }
    };

    const toggleProductSelection = (productId: string, quantity: number) => {
        const newMap = new Map(selectedProducts);
        if (newMap.has(productId)) {
            newMap.delete(productId);
        } else {
            newMap.set(productId, quantity);
        }
        setSelectedProducts(newMap);
    };

    const updateProductQuantity = (productId: string, quantity: number) => {
        const newMap = new Map(selectedProducts);
        if (quantity <= 0) {
            newMap.delete(productId);
        } else {
            newMap.set(productId, quantity);
        }
        setSelectedProducts(newMap);
    };

    const getOrderItems = (orderId: string) => {
        return orderItems.filter(item => item.order_id === orderId);
    };

    const getSupplierName = (supplierId: string) => {
        const found = acceptedSuppliers.find(s => s.supplier_id === supplierId);
        return found?.supplier_name || 'Unknown Supplier';
    };

    const getStatusConfig = (status: string) => {
        return STATUS_CONFIG[status] || STATUS_CONFIG.new;
    };

    const canConfirmOrder = (order: SupplierOrder) => {
        return order.status === 'delivered' &&
            !order.delivery_info?.stock_added &&
            order.status !== 'rejected' &&
            order.status !== 'cancelled';
    };

    const isOrderConfirmed = (order: SupplierOrder) => {
        return order.delivery_info?.stock_added === true || order.status === 'confirmed';
    };

    const getPartnershipStatus = (supplierId: string): 'accepted' | 'pending' | 'rejected' | 'none' => {
        const existing = partnerships.find(p => p.supplier_id === supplierId);
        if (!existing) return 'none';
        return existing.status as 'accepted' | 'pending' | 'rejected';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] w-full">
                <div className="text-center">
                    <div className="relative inline-block">
                        <div className="w-16 h-16 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin"></div>
                        <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-emerald-400 absolute top-0 left-0 animate-pulse"></div>
                    </div>
                    <p className={`mt-4 font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading supplier data...</p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Please wait while we fetch your information</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full min-h-screen ${isDark ? 'bg-[#0d1117] text-[#c9d1d9]' : 'bg-[#f0f2f5] text-[#1a1a2e]'}`}>
            {/* Header - Facebook style */}
            <div className={`sticky -top-4 z-40 px-4 py-3 ${isDark ? 'bg-[#161b22]' : 'bg-white'} shadow-sm`}>
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                            Smart Orders
                        </h1>

                    </div>

                </div>
            </div>

            {/* Tabs - Facebook style pill tabs */}
            <div className={`sticky -top-[56px] z-30 px-4 py-2 ${isDark ? 'bg-[#0d1117]' : 'bg-[#f0f2f5]'}`}>
                <div className="flex gap-1 max-w-7xl mx-auto overflow-x-auto scrollbar-hide py-1">
                    <button
                        onClick={() => setActiveTab('partnerships')}
                        className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap text-sm ${activeTab === 'partnerships'
                            ? `${isDark ? 'bg-[#238636] text-white' : 'bg-[#1b74e4] text-white'} shadow-lg`
                            : `${isDark ? 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]' : 'text-[#65676b] hover:text-[#1a1a2e] hover:bg-[#e4e6eb]'}`
                            }`}
                    >
                        Partnerships
                        {partnerships.filter(p => p.status === 'pending').length > 0 && (
                            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${activeTab === 'partnerships' ? 'bg-white/20 text-white' : 'bg-[#f02849] text-white'}`}>
                                {partnerships.filter(p => p.status === 'pending').length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('available')}
                        className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap text-sm ${activeTab === 'available'
                            ? `${isDark ? 'bg-[#238636] text-white' : 'bg-[#1b74e4] text-white'} shadow-lg`
                            : `${isDark ? 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]' : 'text-[#65676b] hover:text-[#1a1a2e] hover:bg-[#e4e6eb]'}`
                            }`}
                    >
                        Available
                        {availableSuppliers.length > 0 && (
                            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${activeTab === 'available' ? 'bg-white/20 text-white' : 'bg-[#1b74e4] text-white'}`}>
                                {availableSuppliers.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('reorder')}
                        className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap text-sm ${activeTab === 'reorder'
                            ? `${isDark ? 'bg-[#238636] text-white' : 'bg-[#1b74e4] text-white'} shadow-lg`
                            : `${isDark ? 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]' : 'text-[#65676b] hover:text-[#1a1a2e] hover:bg-[#e4e6eb]'}`
                            }`}
                    >
                        Reorder
                        {recommendations.filter(r => r.priority === 'critical' || r.priority === 'high').length > 0 && (
                            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${activeTab === 'reorder' ? 'bg-white/20 text-white' : 'bg-[#f02849] text-white'}`}>
                                {recommendations.filter(r => r.priority === 'critical' || r.priority === 'high').length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap text-sm ${activeTab === 'orders'
                            ? `${isDark ? 'bg-[#238636] text-white' : 'bg-[#1b74e4] text-white'} shadow-lg`
                            : `${isDark ? 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]' : 'text-[#65676b] hover:text-[#1a1a2e] hover:bg-[#e4e6eb]'}`
                            }`}
                    >
                        Orders
                        {orders.filter(o => o.status === 'new' || o.status === 'pending').length > 0 && (
                            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-[#1b74e4] text-white'}`}>
                                {orders.filter(o => o.status === 'new' || o.status === 'pending').length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 py-4 max-w-7xl mx-auto pb-32">

                {/* Partnerships Tab */}
                {/* Partnerships Tab */}
                {activeTab === 'partnerships' && (
                    <div>
                        {/* Show empty state when NO partnerships exist at all (no pending, no accepted, no rejected) */}
                        {partnerships.length === 0 && (
                            <div className={`text-center py-16 rounded-2xl ${isDark ? 'bg-[#161b22]' : 'bg-white'}`}>
                                <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <p className={`text-lg font-semibold ${isDark ? 'text-[#c9d1d9]' : 'text-[#1a1a2e]'}`}>No Partnerships Yet</p>
                                <p className={`text-sm mt-2 ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                    You don't have any partnerships with suppliers yet.
                                </p>
                                <p className={`text-sm ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                    Go to the <span className="font-bold text-emerald-500">Available</span> tab to find suppliers and send partnership requests.
                                </p>
                                <button
                                    onClick={() => setActiveTab('available')}
                                    className={`mt-4 px-6 py-2.5 bg-[#238636] hover:bg-[#2ea043] text-white font-semibold rounded-xl transition`}
                                >
                                    Browse Available Suppliers
                                </button>
                            </div>
                        )}

                        {/* Pending Requests */}
                        {partnerships.filter(p => p.status === 'pending').length > 0 && (
                            <div className="mb-8">
                                <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-[#c9d1d9]' : 'text-[#1a1a2e]'}`}>
                                    <span className="w-1.5 h-6 bg-[#f02849] rounded-full"></span>
                                    Pending Requests
                                    <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full bg-[#f02849] text-white`}>
                                        {partnerships.filter(p => p.status === 'pending').length}
                                    </span>
                                </h2>
                                <div className="grid gap-4">
                                    {partnerships.filter(p => p.status === 'pending').map((p) => {
                                        const isSentByPharmacy = p.pharmacy_id === pharmacyId ||
                                            (p.message && p.message.includes(`Partnership request from ${profileName}`)) ||
                                            !p.supplier_license_number;

                                        return (
                                            <div key={p.id} className={`p-5 rounded-2xl ${isDark ? 'bg-[#161b22]' : 'bg-white'} shadow-sm`}>
                                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <h3 className="text-lg font-bold">{p.supplier_name}</h3>
                                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full bg-[#f02849] text-white`}>
                                                                Pending
                                                            </span>
                                                            <span className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                                                {new Date(p.created_at).toLocaleDateString()}
                                                            </span>
                                                            {isSentByPharmacy && (
                                                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full bg-[#d29922] text-white`}>
                                                                    Request Sent by You
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-2">
                                                            <p className={`text-sm ${isDark ? 'text-[#c9d1d9]' : 'text-[#1a1a2e]'}`}>
                                                                <span className="font-medium">License:</span> {p.supplier_license_number || 'N/A'}
                                                            </p>
                                                            <p className={`text-sm ${isDark ? 'text-[#c9d1d9]' : 'text-[#1a1a2e]'}`}>
                                                                <span className="font-medium">Credit Limit:</span> {currency}{p.proposed_credit_limit?.toLocaleString() || 'N/A'}
                                                            </p>
                                                        </div>
                                                        {p.categories_offered && p.categories_offered.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                                {p.categories_offered.slice(0, 4).map((cat, i) => (
                                                                    <span key={i} className={`px-2.5 py-0.5 text-xs rounded-full ${isDark ? 'bg-[#21262d] text-[#c9d1d9]' : 'bg-[#f0f2f5] text-[#1a1a2e]'}`}>
                                                                        {cat}
                                                                    </span>
                                                                ))}
                                                                {p.categories_offered.length > 4 && (
                                                                    <span className={`px-2.5 py-0.5 text-xs rounded-full ${isDark ? 'bg-[#21262d] text-[#c9d1d9]' : 'bg-[#f0f2f5] text-[#1a1a2e]'}`}>
                                                                        +{p.categories_offered.length - 4} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        {p.message && (
                                                            <p className={`text-sm italic mt-2 ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                                                "{p.message}"
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-4 space-y-3">
                                                    {isSentByPharmacy ? (
                                                        <div className={`p-3 rounded-xl ${isDark ? 'bg-[#d29922]/10 border border-[#d29922]/30' : 'bg-[#fef3c7] border border-[#f59e0b]/30'}`}>
                                                            <p className={`text-sm font-medium ${isDark ? 'text-[#d29922]' : 'text-[#92400e]'} flex items-center gap-2`}>
                                                                <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin"></span>
                                                                Waiting for supplier to respond...
                                                            </p>
                                                            <p className={`text-xs mt-1 ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                                                You sent this request. The supplier will accept or decline it.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <input
                                                                type="text"
                                                                placeholder="Add a response note (optional)"
                                                                value={responseNote}
                                                                onChange={(e) => setResponseNote(e.target.value)}
                                                                className={`w-full px-4 py-2.5 rounded-xl text-sm ${isDark ? 'bg-[#0d1117] text-[#c9d1d9]' : 'bg-[#f0f2f5] text-[#1a1a2e]'
                                                                    } focus:outline-none focus:ring-2 focus:ring-emerald-500 transition`}
                                                            />
                                                            <div className="flex gap-3">
                                                                <button
                                                                    onClick={() => handleAcceptPartnership(p.id)}
                                                                    disabled={responding === p.id}
                                                                    className="flex-1 px-6 py-2.5 bg-[#238636] hover:bg-[#2ea043] text-white font-semibold rounded-xl transition disabled:opacity-50"
                                                                >
                                                                    {responding === p.id ? (
                                                                        <span className="flex items-center justify-center gap-2">
                                                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                                            Processing...
                                                                        </span>
                                                                    ) : (
                                                                        'Accept Partnership'
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRejectPartnership(p.id)}
                                                                    disabled={responding === p.id}
                                                                    className="flex-1 px-6 py-2.5 bg-[#da3633] hover:bg-[#f85149] text-white font-semibold rounded-xl transition disabled:opacity-50"
                                                                >
                                                                    {responding === p.id ? 'Processing...' : 'Decline'}
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Accepted Partners */}
                        {acceptedSuppliers.length > 0 && (
                            <div className="mb-8">
                                <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-[#c9d1d9]' : 'text-[#1a1a2e]'}`}>
                                    <span className="w-1.5 h-6 bg-[#238636] rounded-full"></span>
                                    Active Partners
                                    <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full bg-[#238636] text-white`}>
                                        {acceptedSuppliers.length}
                                    </span>
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {acceptedSuppliers.map((p) => (
                                        <div key={p.id} className={`p-4 rounded-2xl ${isDark ? 'bg-[#161b22]' : 'bg-white'} shadow-sm`}>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-bold">{p.supplier_name}</p>
                                                    <p className={`text-xs mt-1 ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                                        {p.categories_offered?.length || 0} categories
                                                    </p>
                                                </div>
                                                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-[#238636] text-white">
                                                    Active
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ====== NEW: Declined/Rejected Requests ====== */}
                        {/* This shows when there are NO pending and NO accepted - prevents blank screen */}
                        {partnerships.filter(p => p.status === 'rejected').length > 0 && (
                            <div>
                                <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-[#c9d1d9]' : 'text-[#1a1a2e]'}`}>
                                    <span className="w-1.5 h-6 bg-[#da3633] rounded-full"></span>
                                    Declined Requests
                                    <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full bg-[#da3633] text-white`}>
                                        {partnerships.filter(p => p.status === 'rejected').length}
                                    </span>
                                </h2>
                                <div className="grid gap-3">
                                    {partnerships.filter(p => p.status === 'rejected').map((p) => (
                                        <div key={p.id} className={`p-4 rounded-2xl ${isDark ? 'bg-[#161b22] border border-[#da3633]/30' : 'bg-white border border-[#da3633]/30'} shadow-sm`}>
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                <div className="flex-1">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <h3 className="font-bold">{p.supplier_name}</h3>
                                                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full bg-[#da3633] text-white`}>
                                                            {p.responded_at ? 'Declined by Supplier' : 'Declined by You'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3 mt-1">
                                                        <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                                            Requested: {new Date(p.created_at).toLocaleDateString()}
                                                        </p>
                                                        {p.responded_at && (
                                                            <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                                                Responded: {new Date(p.responded_at).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {p.pharmacy_response_note && (
                                                        <p className={`text-sm italic mt-1 ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                                            "{p.pharmacy_response_note}"
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedSupplierForRequest(p.supplier_id);
                                                        setRequestMessage(`New request after previous decline (${new Date().toLocaleDateString()})`);
                                                        handleSendPartnershipRequest(p.supplier_id);
                                                    }}
                                                    disabled={sendingRequest === p.supplier_id}
                                                    className={`px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-semibold rounded-xl transition disabled:opacity-50`}
                                                >
                                                    {sendingRequest === p.supplier_id ? (
                                                        <span className="flex items-center gap-2">
                                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                            Sending...
                                                        </span>
                                                    ) : (
                                                        'Try Again'
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className={`mt-4 p-4 rounded-xl ${isDark ? 'bg-[#161b22]' : 'bg-white'} shadow-sm text-center`}>
                                    <p className={`text-sm ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                        You can send a new request to a declined supplier at any time, or
                                    </p>
                                    <button
                                        onClick={() => setActiveTab('available')}
                                        className={`mt-2 px-6 py-2.5 bg-[#238636] hover:bg-[#2ea043] text-white font-semibold rounded-xl transition`}
                                    >
                                        Browse Other Available Suppliers
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Available Suppliers Tab */}
                {activeTab === 'available' && (
                    <div>
                        {availableSuppliers.length === 0 ? (
                            <div className={`text-center py-16 rounded-2xl ${isDark ? 'bg-[#161b22]' : 'bg-white'}`}>
                                <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <p className={`text-lg font-semibold ${isDark ? 'text-[#c9d1d9]' : 'text-[#1a1a2e]'}`}>No Suppliers Available</p>
                                <p className={`text-sm mt-2 ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                    No registered suppliers are available right now.
                                </p>
                                <p className={`text-sm ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                    This could be because:
                                </p>
                                <ul className={`text-sm mt-2 text-left max-w-md mx-auto ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                    <li className="flex items-start gap-2 py-1">
                                        <span className="text-[#238636] mt-1">•</span>
                                        <span>There are no suppliers on the platform yet</span>
                                    </li>
                                    <li className="flex items-start gap-2 py-1">
                                        <span className="text-[#238636] mt-1">•</span>
                                        <span>Your internet connection may be offline</span>
                                    </li>
                                    <li className="flex items-start gap-2 py-1">
                                        <span className="text-[#238636] mt-1">•</span>
                                        <span>Suppliers are being added regularly - check back soon</span>
                                    </li>
                                </ul>
                                <button
                                    onClick={handleRefresh}
                                    className={`mt-4 px-6 py-2.5 bg-[#238636] hover:bg-[#2ea043] text-white font-semibold rounded-xl transition`}
                                >
                                    Refresh Suppliers
                                </button>
                            </div>

                        ) : (
                            <div>
                                <div className={`p-4 rounded-2xl mb-6 ${isDark ? 'bg-[#161b22]' : 'bg-white'} shadow-sm`}>
                                    <div className="flex flex-wrap items-center gap-4">
                                        <span className="text-sm">
                                            <span className="font-bold text-lg">{availableSuppliers.length}</span> suppliers available
                                        </span>
                                        <span className="text-sm text-emerald-500 font-medium">
                                            {acceptedSuppliers.length} partners
                                        </span>
                                        <span className="text-sm text-[#f02849] font-medium">
                                            {partnerships.filter(p => p.status === 'pending').length} pending
                                        </span>
                                        <p className={`text-xs w-full ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                            Send a partnership request to start ordering
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-4">
                                    {availableSuppliers.map((supplier) => {
                                        const status = getPartnershipStatus(supplier.id);
                                        const isPartner = status === 'accepted';
                                        const isPending = status === 'pending';
                                        const isRejected = status === 'rejected';
                                        const isRequesting = sendingRequest === supplier.id;

                                        return (
                                            <div
                                                key={supplier.id}
                                                className={`p-5 rounded-2xl ${isPartner
                                                    ? `${isDark ? 'bg-[#161b22] border-l-4 border-[#238636]' : 'bg-white border-l-4 border-[#238636]'}`
                                                    : isPending
                                                        ? `${isDark ? 'bg-[#161b22] border-l-4 border-[#f02849]' : 'bg-white border-l-4 border-[#f02849]'}`
                                                        : `${isDark ? 'bg-[#161b22]' : 'bg-white'}`
                                                    } shadow-sm`}
                                            >
                                                <div className="flex flex-col md:flex-row md:items-start gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h3 className="text-lg font-bold">{supplier.business_name}</h3>
                                                            {isPartner && (
                                                                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-[#238636] text-white">
                                                                    Partner
                                                                </span>
                                                            )}
                                                            {isPending && (
                                                                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-[#f02849] text-white animate-pulse">
                                                                    Pending
                                                                </span>
                                                            )}
                                                            {isRejected && (
                                                                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-[#da3633] text-white">
                                                                    Declined
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-2">
                                                            <p className={`text-sm ${isDark ? 'text-[#c9d1d9]' : 'text-[#1a1a2e]'}`}>
                                                                <span className="font-medium">Contact:</span> {supplier.contact_person}
                                                            </p>
                                                            <p className={`text-sm ${isDark ? 'text-[#c9d1d9]' : 'text-[#1a1a2e]'}`}>
                                                                <span className="font-medium">Phone:</span> {supplier.phone}
                                                            </p>
                                                            <p className={`text-sm ${isDark ? 'text-[#c9d1d9]' : 'text-[#1a1a2e]'}`}>
                                                                <span className="font-medium">Email:</span> {supplier.email}
                                                            </p>
                                                            <p className={`text-sm ${isDark ? 'text-[#c9d1d9]' : 'text-[#1a1a2e]'}`}>
                                                                <span className="font-medium">Location:</span> {supplier.town}, {supplier.county}
                                                            </p>
                                                        </div>
                                                        <p className={`text-xs mt-2 ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                                            License: {supplier.license_number}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Action area */}
                                                {isPartner && (
                                                    <div className="mt-4 text-emerald-500 font-medium bg-emerald-100 dark:bg-emerald-900/30 px-4 py-2 rounded-xl text-sm">
                                                        Active partnership - You can order from this supplier
                                                    </div>
                                                )}

                                                {isPending && (
                                                    <div className="mt-4 text-[#f02849] font-medium bg-red-100 dark:bg-red-900/30 px-4 py-2 rounded-xl text-sm">
                                                        Request pending approval from supplier
                                                    </div>
                                                )}

                                                {isRejected && (
                                                    <div className="mt-4 flex flex-wrap items-center gap-3">
                                                        <span className="text-[#da3633] font-medium bg-red-100 dark:bg-red-900/30 px-4 py-2 rounded-xl text-sm">
                                                            Your request was declined
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedSupplierForRequest(supplier.id);
                                                                setRequestMessage('New request after previous decline');
                                                                handleSendPartnershipRequest(supplier.id);
                                                            }}
                                                            disabled={isRequesting}
                                                            className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
                                                        >
                                                            {isRequesting ? 'Sending...' : 'Try Again'}
                                                        </button>
                                                    </div>
                                                )}

                                                {!isPartner && !isPending && !isRejected && (
                                                    <div className="mt-4 space-y-3">
                                                        <textarea
                                                            placeholder="Add a message to the supplier (optional)"
                                                            value={selectedSupplierForRequest === supplier.id ? requestMessage : ''}
                                                            onChange={(e) => {
                                                                setSelectedSupplierForRequest(supplier.id);
                                                                setRequestMessage(e.target.value);
                                                            }}
                                                            className={`w-full px-4 py-2.5 rounded-xl text-sm ${isDark ? 'bg-[#0d1117] text-[#c9d1d9]' : 'bg-[#f0f2f5] text-[#1a1a2e]'
                                                                } focus:outline-none focus:ring-2 focus:ring-emerald-500 transition`}
                                                            rows={2}
                                                            placeholder="Add a message to the supplier..."
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                setSelectedSupplierForRequest(supplier.id);
                                                                handleSendPartnershipRequest(supplier.id);
                                                            }}
                                                            disabled={isRequesting}
                                                            className={`w-full px-6 py-2.5 bg-[#238636] hover:bg-[#2ea043] text-white font-semibold rounded-xl transition disabled:opacity-50`}
                                                        >
                                                            {isRequesting ? (
                                                                <span className="flex items-center justify-center gap-2">
                                                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                                    Sending...
                                                                </span>
                                                            ) : (
                                                                'Send Partnership Request'
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Reorder Tab */}
                {activeTab === 'reorder' && (
                    <div>
                        {recommendations.length === 0 ? (
                            <div className={`text-center py-16 rounded-2xl ${isDark ? 'bg-[#161b22]' : 'bg-white'}`}>
                                <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className={`text-lg font-semibold ${isDark ? 'text-[#c9d1d9]' : 'text-[#1a1a2e]'}`}>All Products Have Healthy Stock</p>
                                <p className={`text-sm mt-2 ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                    Great news! All your products are well-stocked.
                                </p>
                                <p className={`text-sm ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                    No reorder recommendations at this time.
                                </p>
                                <ul className={`text-sm mt-3 text-left max-w-md mx-auto ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                    <li className="flex items-start gap-2 py-1">
                                        <span className="text-[#238636] mt-1">✓</span>
                                        <span>Your inventory is at optimal levels</span>
                                    </li>
                                    <li className="flex items-start gap-2 py-1">
                                        <span className="text-[#238636] mt-1">✓</span>
                                        <span>Monitor stock levels and check back when items are low</span>
                                    </li>
                                    <li className="flex items-start gap-2 py-1">
                                        <span className="text-[#238636] mt-1">✓</span>
                                        <span>You can still manually create orders from the "Orders" tab</span>
                                    </li>
                                </ul>
                                <button
                                    onClick={() => setActiveTab('orders')}
                                    className={`mt-4 px-6 py-2.5 bg-[#1f6feb] hover:bg-[#388bfd] text-white font-semibold rounded-xl transition`}
                                >
                                    View My Orders
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className={`p-4 rounded-2xl mb-6 ${isDark ? 'bg-[#161b22]' : 'bg-white'} shadow-sm`}>
                                    <div className="flex flex-wrap items-center gap-4">
                                        <span className="text-sm">
                                            <span className="font-bold text-lg">{recommendations.length}</span> products need reordering
                                        </span>
                                        {recommendations.filter(r => r.priority === 'critical').length > 0 && (
                                            <span className="text-sm text-[#f02849] font-bold">
                                                {recommendations.filter(r => r.priority === 'critical').length} Critical
                                            </span>
                                        )}
                                        {recommendations.filter(r => r.priority === 'high').length > 0 && (
                                            <span className="text-sm text-[#d29922] font-bold">
                                                {recommendations.filter(r => r.priority === 'high').length} High
                                            </span>
                                        )}
                                        <p className={`text-xs w-full ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                            Select products and create an order with one of your accepted suppliers
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {recommendations.map((rec) => {
                                        const isSelected = selectedProducts.has(rec.product_id);
                                        const priorityConfig = {
                                            critical: { bg: 'bg-[#f02849]', label: 'Critical' },
                                            high: { bg: 'bg-[#d29922]', label: 'High' },
                                            medium: { bg: 'bg-[#f0883e]', label: 'Medium' },
                                            low: { bg: 'bg-[#58a6ff]', label: 'Low' }
                                        }[rec.priority];

                                        return (
                                            <div
                                                key={rec.product_id}
                                                className={`p-4 rounded-2xl cursor-pointer transition-all ${isSelected
                                                    ? `${isDark ? 'bg-[#161b22] border-l-4 border-[#238636]' : 'bg-white border-l-4 border-[#238636]'} shadow-md`
                                                    : `${isDark ? 'bg-[#161b22]' : 'bg-white'} shadow-sm hover:shadow-md`
                                                    }`}
                                                onClick={() => toggleProductSelection(rec.product_id, rec.reorder_quantity)}
                                            >
                                                <div className="flex flex-col md:flex-row md:items-center gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className={`w-2.5 h-2.5 rounded-full ${priorityConfig.bg}`}></span>
                                                            <span className="font-bold">{rec.product_name}</span>
                                                            <span className={`px-2 py-0.5 text-xs rounded-full ${priorityConfig.bg} text-white`}>
                                                                {priorityConfig.label}
                                                            </span>
                                                            {rec.category && (
                                                                <span className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                                                    {rec.category}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-3 mt-1">
                                                            <p className={`text-sm ${isDark ? 'text-[#c9d1d9]' : 'text-[#1a1a2e]'}`}>
                                                                Stock: <span className="font-bold">{rec.current_stock}</span>
                                                            </p>
                                                            <p className={`text-sm ${isDark ? 'text-[#c9d1d9]' : 'text-[#1a1a2e]'}`}>
                                                                Reorder Level: {rec.reorder_level}
                                                            </p>
                                                            <p className={`text-sm ${isDark ? 'text-[#c9d1d9]' : 'text-[#1a1a2e]'}`}>
                                                                Monthly Sales: {rec.monthly_sales}
                                                            </p>
                                                            {rec.days_until_out < 30 && (
                                                                <span className={`text-sm font-bold ${rec.days_until_out <= 7 ? 'text-[#f02849]' : 'text-[#d29922]'}`}>
                                                                    {rec.days_until_out} days left
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className={`text-xs mt-1 ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                                            {rec.reason}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {isSelected && (
                                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                <button
                                                                    onClick={() => updateProductQuantity(rec.product_id, Math.max(1, (selectedProducts.get(rec.product_id) || 0) - 5))}
                                                                    className={`w-8 h-8 rounded-xl ${isDark ? 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9]' : 'bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#1a1a2e]'
                                                                        } transition font-bold`}
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="font-bold w-10 text-center text-lg">{selectedProducts.get(rec.product_id) || 0}</span>
                                                                <button
                                                                    onClick={() => updateProductQuantity(rec.product_id, (selectedProducts.get(rec.product_id) || 0) + 5)}
                                                                    className={`w-8 h-8 rounded-xl ${isDark ? 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9]' : 'bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#1a1a2e]'
                                                                        } transition font-bold`}
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        )}
                                                        <span className={`px-3 py-1.5 text-xs font-medium rounded-xl transition ${isSelected
                                                            ? 'bg-[#238636] text-white'
                                                            : `${isDark ? 'bg-[#21262d] text-[#8b949e]' : 'bg-[#f0f2f5] text-[#65676b]'}`
                                                            }`}>
                                                            {isSelected ? 'Selected' : 'Select'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {selectedProducts.size > 0 && (
                                    <div className={`mt-6 p-5 rounded-2xl ${isDark ? 'bg-[#161b22] border-l-4 border-[#238636]' : 'bg-white border-l-4 border-[#238636]'} shadow-md`}>
                                        <h4 className="text-lg font-bold mb-3">Create Order</h4>
                                        <p className="text-sm mb-4">
                                            {selectedProducts.size} products selected ({Array.from(selectedProducts.values()).reduce((a, b) => a + b, 0)} units total)
                                        </p>

                                        <div className="space-y-4">
                                            <select
                                                value={selectedSupplier}
                                                onChange={(e) => setSelectedSupplier(e.target.value)}
                                                className={`w-full px-4 py-3 rounded-xl ${isDark ? 'bg-[#0d1117] text-[#c9d1d9]' : 'bg-[#f0f2f5] text-[#1a1a2e]'
                                                    } focus:outline-none focus:ring-2 focus:ring-emerald-500 transition`}
                                            >
                                                <option value="">Select supplier...</option>
                                                {acceptedSuppliers.map((s) => (
                                                    <option key={s.supplier_id} value={s.supplier_id}>
                                                        {s.supplier_name} (Credit: {currency}{s.proposed_credit_limit?.toLocaleString() || 'N/A'})
                                                    </option>
                                                ))}
                                            </select>

                                            <textarea
                                                placeholder="Order notes (optional)"
                                                value={orderNotes}
                                                onChange={(e) => setOrderNotes(e.target.value)}
                                                className={`w-full px-4 py-3 rounded-xl text-sm ${isDark ? 'bg-[#0d1117] text-[#c9d1d9]' : 'bg-[#f0f2f5] text-[#1a1a2e]'
                                                    } focus:outline-none focus:ring-2 focus:ring-emerald-500 transition`}
                                                rows={2}
                                            />

                                            <button
                                                onClick={handleCreateOrder}
                                                disabled={!selectedSupplier || isCreatingOrder}
                                                className={`w-full px-6 py-3.5 bg-[#238636] hover:bg-[#2ea043] text-white font-bold rounded-xl transition disabled:opacity-50`}
                                            >
                                                {isCreatingOrder ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                        Creating Order...
                                                    </span>
                                                ) : (
                                                    `Create Order (${selectedProducts.size} items)`
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Orders Tab */}
                {activeTab === 'orders' && (
                    <div>
                        {orders.length === 0 ? (
                            <div className={`text-center py-16 rounded-2xl ${isDark ? 'bg-[#161b22]' : 'bg-white'}`}>
                                <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                </div>
                                <p className={`text-lg font-semibold ${isDark ? 'text-[#c9d1d9]' : 'text-[#1a1a2e]'}`}>No Orders Yet</p>
                                <p className={`text-sm mt-2 ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                    You haven't placed any orders with suppliers yet.
                                </p>
                                <p className={`text-sm ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                    Here's how to get started:
                                </p>
                                <ul className={`text-sm mt-3 text-left max-w-md mx-auto ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                    <li className="flex items-start gap-2 py-1">
                                        <span className="text-[#238636] mt-1">1.</span>
                                        <span>Go to the <span className="font-bold text-emerald-500">Available</span> tab and send partnership requests</span>
                                    </li>
                                    <li className="flex items-start gap-2 py-1">
                                        <span className="text-[#238636] mt-1">2.</span>
                                        <span>Wait for suppliers to accept your partnership</span>
                                    </li>
                                    <li className="flex items-start gap-2 py-1">
                                        <span className="text-[#238636] mt-1">3.</span>
                                        <span>Once accepted, go to the <span className="font-bold text-emerald-500">Reorder</span> tab to create orders</span>
                                    </li>
                                </ul>
                                <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                                    <button
                                        onClick={() => setActiveTab('available')}
                                        className={`px-6 py-2.5 bg-[#238636] hover:bg-[#2ea043] text-white font-semibold rounded-xl transition`}
                                    >
                                        Find Suppliers
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('reorder')}
                                        className={`px-6 py-2.5 ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-[#f0f2f5] text-[#1a1a2e] hover:bg-[#e4e6eb]'} font-semibold rounded-xl transition`}
                                    >
                                        Check Reorder Needs
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((order) => {
                                    const statusConfig = getStatusConfig(order.status);
                                    const canConfirm = canConfirmOrder(order);
                                    const isConfirmed = isOrderConfirmed(order);
                                    const items = getOrderItems(order.id);
                                    const totalItems = items.reduce((sum, i) => sum + i.requested_quantity, 0);

                                    return (
                                        <div
                                            key={order.id}
                                            className={`p-5 rounded-2xl shadow-sm ${isDark ? 'bg-[#161b22]' : 'bg-white'} ${canConfirm ? `border-l-4 border-[#238636]` : isConfirmed ? `border-l-4 border-[#238636]` : ''}`}
                                        >
                                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <span className="text-xl font-bold text-[#238636]">#{order.order_number}</span>
                                                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${isDark ? 'bg-[#21262d]' : 'bg-[#f0f2f5]'} ${statusConfig.color}`}>
                                                            {statusConfig.label}
                                                        </span>
                                                        {isConfirmed && (
                                                            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#238636] text-white">
                                                                Stock Added
                                                            </span>
                                                        )}
                                                        {canConfirm && (
                                                            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#f02849] text-white animate-pulse">
                                                                Awaiting Confirmation
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className={`text-sm mt-2 ${isDark ? 'text-[#c9d1d9]' : 'text-[#1a1a2e]'}`}>
                                                        Supplier: <span className="font-medium">{getSupplierName(order.supplier_id)}</span>
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-4 mt-1">
                                                        <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                                            {new Date(order.order_date).toLocaleDateString()}
                                                        </p>
                                                        <p className={`text-sm font-bold ${isDark ? 'text-[#c9d1d9]' : 'text-[#1a1a2e]'}`}>
                                                            {currency}{order.total_amount.toFixed(2)}
                                                        </p>
                                                        <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                                            {totalItems} items
                                                        </p>
                                                        {order.delivery_info?.delivered_date && (
                                                            <p className={`text-xs text-emerald-500 font-medium`}>
                                                                Delivered: {new Date(order.delivery_info.delivered_date).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {canConfirm && (
                                                        <button
                                                            onClick={() => handleConfirmOrder(order.id)}
                                                            disabled={confirmingOrder === order.id}
                                                            className="px-5 py-2.5 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-bold rounded-xl transition disabled:opacity-50"
                                                        >
                                                            {confirmingOrder === order.id ? (
                                                                <span className="flex items-center gap-2">
                                                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                                    Confirming...
                                                                </span>
                                                            ) : (
                                                                'Confirm Receipt'
                                                            )}
                                                        </button>
                                                    )}
                                                    {isConfirmed && (
                                                        <div className={`px-4 py-2.5 rounded-xl font-medium text-sm ${isDark ? 'bg-[#21262d] text-[#58a6ff]' : 'bg-[#f0f2f5] text-[#1b74e4]'}`}>
                                                            Stock Added
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setSelectedOrder(order);
                                                            setShowOrderDetail(true);
                                                        }}
                                                        className={`px-4 py-2.5 bg-[#1f6feb] hover:bg-[#388bfd] text-white text-sm font-semibold rounded-xl transition`}
                                                    >
                                                        View Details
                                                    </button>
                                                </div>
                                            </div>

                                            {!isConfirmed && order.status !== 'rejected' && order.status !== 'cancelled' && (
                                                <div className="mt-4">
                                                    <div className="w-full h-2 bg-[#21262d] rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${canConfirm ? 'bg-[#238636] animate-pulse' : 'bg-[#238636]'
                                                                }`}
                                                            style={{ width: `${statusConfig.progress}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between mt-1.5">
                                                        <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                                            {statusConfig.progress}% complete
                                                        </p>
                                                        {canConfirm && (
                                                            <p className="text-xs text-[#238636] font-medium animate-pulse">
                                                                Tap "Confirm Receipt" to complete
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {items.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {items.slice(0, 3).map((item) => (
                                                        <span key={item.id} className={`px-2.5 py-1 text-xs rounded-full ${isDark ? 'bg-[#21262d] text-[#c9d1d9]' : 'bg-[#f0f2f5] text-[#1a1a2e]'}`}>
                                                            {item.product_name} ×{item.requested_quantity}
                                                        </span>
                                                    ))}
                                                    {items.length > 3 && (
                                                        <span className={`px-2.5 py-1 text-xs rounded-full ${isDark ? 'bg-[#21262d] text-[#c9d1d9]' : 'bg-[#f0f2f5] text-[#1a1a2e]'}`}>
                                                            +{items.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Order Detail Modal - Facebook style */}
            {showOrderDetail && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 ${isDark ? 'bg-[#161b22]' : 'bg-white'} shadow-2xl`}>
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-[#238636]">Order #{selectedOrder.order_number}</h3>
                                <p className={`text-sm mt-1 ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                    {getSupplierName(selectedOrder.supplier_id)}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowOrderDetail(false);
                                    setSelectedOrder(null);
                                }}
                                className={`p-2.5 rounded-xl ${isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f0f2f5]'} transition`}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div className={`p-4 rounded-2xl ${isDark ? 'bg-[#0d1117]' : 'bg-[#f0f2f5]'}`}>
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="font-medium">Status:</span>
                                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${isDark ? 'bg-[#21262d]' : 'bg-[#f0f2f5]'} ${getStatusConfig(selectedOrder.status).color}`}>
                                        {getStatusConfig(selectedOrder.status).label}
                                    </span>
                                    {selectedOrder.status === 'confirmed' && (
                                        <span className="text-[#238636] font-bold">Stock Added</span>
                                    )}
                                </div>
                                <p className={`text-sm mt-2 ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                    Ordered: {new Date(selectedOrder.order_date).toLocaleString()}
                                </p>
                            </div>

                            <div>
                                <h4 className="font-bold mb-3 text-lg">Order Items</h4>
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
                                    {getOrderItems(selectedOrder.id).map((item) => (
                                        <div key={item.id} className={`p-3 rounded-xl ${isDark ? 'bg-[#0d1117]' : 'bg-[#f0f2f5]'}`}>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                <div>
                                                    <p className="font-medium">{item.product_name}</p>
                                                    <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                                        Requested: {item.requested_quantity} × {currency}{item.unit_price.toFixed(2)}
                                                        {item.accepted_quantity > 0 && ` • Accepted: ${item.accepted_quantity}`}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-sm font-bold">{currency}{item.total_price.toFixed(2)}</span>
                                                    <p className={`text-xs font-medium ${item.item_status === 'accepted' ? 'text-[#238636]' : 'text-[#d29922]'}`}>
                                                        {item.item_status}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className={`p-4 rounded-2xl ${isDark ? 'bg-[#0d1117]' : 'bg-[#f0f2f5]'}`}>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-sm">
                                        <span className={isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}>Subtotal:</span>
                                        <span className="font-medium">{currency}{selectedOrder.subtotal.toFixed(2)}</span>
                                    </div>
                                    {selectedOrder.delivery_fee > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className={isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}>Delivery:</span>
                                            <span className="font-medium">{currency}{selectedOrder.delivery_fee.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2 border-[#21262d] dark:border-[#30363d]">
                                        <span>Total:</span>
                                        <span className="text-[#238636]">{currency}{selectedOrder.total_amount.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {selectedOrder.order_notes && (
                                <p className={`text-sm italic ${isDark ? 'text-[#8b949e]' : 'text-[#65676b]'}`}>
                                    Notes: {selectedOrder.order_notes}
                                </p>
                            )}

                            {canConfirmOrder(selectedOrder) && (
                                <button
                                    onClick={() => {
                                        handleConfirmOrder(selectedOrder.id);
                                        setShowOrderDetail(false);
                                    }}
                                    disabled={confirmingOrder === selectedOrder.id}
                                    className="w-full px-6 py-3.5 bg-[#238636] hover:bg-[#2ea043] text-white font-bold rounded-xl transition disabled:opacity-50"
                                >
                                    {confirmingOrder === selectedOrder.id ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            Processing...
                                        </span>
                                    ) : (
                                        'Confirm Receipt & Add Stock'
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}