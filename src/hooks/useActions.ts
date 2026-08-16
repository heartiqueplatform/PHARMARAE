// hooks/useActions.ts - COMPLETE FIX

import { useCallback } from 'react';
import { db } from '../lib/db';
import { queueOfflineMutation, getSupabaseClient, pullFromSupabaseToLocal, isSupabaseConfigured, processOfflineSyncQueue, changeUserPin, changeUserPassword, deleteAccount } from '../lib/supabase';
import {
    Profile,
    Product,
    ProductBatch,
    Supplier,
    Sale,
    StockMovement,
    AuditLog,
    Category,
    RequestedItem,
    SalesReturn,
} from '../types';
import { normalizePharmacyName, genUUID } from '../utils/helpers';
import { getNotificationService } from '../lib/notificationService';

interface UseActionsProps {
    currentProfile: Profile | null;
    currentRole: string;
    products: Product[];
    batches: ProductBatch[];
    categories: Category[];
    suppliers: Supplier[];
    sales: Sale[];
    loadDatabaseData: () => Promise<void>;
    setReceiptSale: (sale: Sale | null) => void;
    setIsReceiptModalOpen: (open: boolean) => void;
    setSyncPendingCount: (count: number) => void;
}

export const useActions = (props: UseActionsProps) => {
    const {
        currentProfile,
        currentRole,
        products,
        batches,
        categories,
        sales,
        loadDatabaseData,
        setReceiptSale,
        setIsReceiptModalOpen,
    } = props;

    const getPharmacyName = useCallback(() => {
        if (!currentProfile) return null;
        return normalizePharmacyName(currentProfile.pharmacy_name);
    }, [currentProfile]);

    // =============================================
    // HELPER: Build complete product update payload
    // =============================================
    const buildProductUpdatePayload = useCallback((product: Product) => {
        return {
            id: product.id,
            pharmacy_name: product.pharmacy_name,
            name: product.name, // ✅ CRITICAL: Always include name
            generic_name: product.generic_name,
            brand: product.brand,
            description: product.description,
            notes: product.notes,
            product_type: product.product_type,
            category_id: product.category_id,
            category_name: product.category_name,
            form: product.form,
            strength: product.strength,
            manufacturer: product.manufacturer,
            schedule_type: product.schedule_type,
            prescription_required: product.prescription_required,
            size: product.size,
            color: product.color,
            material: product.material,
            is_sterile: product.is_sterile,
            selling_price: product.selling_price,
            default_cost_price: product.default_cost_price,
            quantity: product.quantity || 0,
            reorder_level: product.reorder_level,
            low_stock_threshold: product.low_stock_threshold,
            is_active: product.is_active,
            is_controlled: product.is_controlled,
            barcode: product.barcode,
            sku: product.sku,
            shelf_number: product.shelf_number,
            bay_number: product.bay_number,
            rack_number: product.rack_number,
            storage_location: product.storage_location,
            zone: product.zone,
            bin_number: product.bin_number,
            cardboard_box_id: product.cardboard_box_id,
            storage_condition: product.storage_condition,
            last_inventory_count_date: product.last_inventory_count_date,
            last_inventory_count_by: product.last_inventory_count_by,
            updated_at: new Date().toISOString()
        };
    }, []);

    // =============================================
    // HANDLE COMPLETE SALE - FIXED
    // =============================================
    const handleCompleteSale = useCallback(async (saleData: Partial<Sale>, cartItems: any[]) => {
        if (!currentProfile) {
            throw new Error('No profile found');
        }

        const pharmacyName = getPharmacyName();
        if (!pharmacyName) {
            throw new Error('No pharmacy name found');
        }

        if (cartItems.length === 0) {
            throw new Error('Cart is empty. Please add items to sell.');
        }

        const now = new Date();
        const nowISO = now.toISOString();

        // Generate a single sale ID for all items
        const saleId = genUUID();
        const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const countToday = sales.filter(s => s.sale_date?.startsWith(now.toISOString().substring(0, 10)) || s.created_at?.startsWith(now.toISOString().substring(0, 10))).length + 1;
        const saleNumber = `INV-${yearMonth}-${countToday.toString().padStart(4, '0')}`;

        const subtotalTotal = cartItems.reduce((sum: number, item: any) => sum + (item.subtotal || item.quantity * item.unitPrice), 0);
        const totalItems = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
        const discountAmount = saleData.discount || 0;
        const finalTotal = Math.max(0, subtotalTotal - discountAmount);

        // Check stock for all items first
        for (const cartItem of cartItems) {
            const product = await db.products.get(cartItem.product.id);
            if (!product) {
                throw new Error(`Product ${cartItem.product.name} not found`);
            }
            if ((product.quantity || 0) < cartItem.quantity) {
                throw new Error(`Not enough stock for ${product.name}. Available: ${product.quantity || 0}`);
            }
        }

        const createdSales: Sale[] = [];



        // Create ONE sale per item (but with the same sale_id for grouping)
        for (const item of cartItems) {
            const usedBatch = item.batch || null;
            const itemSubtotal = item.subtotal || item.quantity * item.unitPrice;
            const itemId = genUUID();

            const newSale: Sale = {
                id: itemId,
                pharmacy_name: pharmacyName,
                sale_id: saleId,
                sale_number: saleNumber,
                customer_id: saleData.customer_id || null,
                customer_name: saleData.customer_name || 'Cash Customer',
                sold_by: currentProfile?.id || null,
                sold_by_name: currentProfile?.full_name || 'System User',
                product_id: item.product.id,
                product_name: item.product.name,
                product_barcode: item.product.barcode || null,
                product_sku: item.product.sku || null,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                subtotal: itemSubtotal,
                batch_id: usedBatch?.id || null,
                batch_number: usedBatch?.batch_number || null,
                discount: discountAmount,
                discount_reason: saleData.discount_reason || null,
                tax: saleData.tax || 0,
                total: itemSubtotal,
                payment_method: saleData.payment_method || 'cash',
                payment_status: 'paid',
                payment_reference: saleData.payment_reference || `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
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
                sale_date: saleData.sale_date || nowISO,  // ✅ FIXED: Use selected date
                created_at: nowISO,
                updated_at: nowISO,
                offline_id: null
            };

            // ✅ Save locally
            await db.sales.put(newSale);

            // ✅ Queue for Supabase sync
            await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'sale', 'INSERT', newSale);
            createdSales.push(newSale);

            // Update batch quantities
            const todayStr = now.toISOString().split('T')[0];
            const quantitySold = item.quantity;

            const availableBatches = batches
                .filter(b => b.product_id === item.product.id && b.quantity_base > 0 && b.expiry_date >= todayStr)
                .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));

            let remainingToDeduct = quantitySold;

            for (const batch of availableBatches) {
                if (remainingToDeduct <= 0) break;
                const deductFromBatch = Math.min(remainingToDeduct, batch.quantity_base);
                const newBatchQty = batch.quantity_base - deductFromBatch;

                await db.product_batches.update(batch.id, {
                    quantity_base: newBatchQty,
                    updated_at: nowISO
                });

                // ✅ Queue batch update for Supabase
                await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'batch', 'UPDATE', {
                    id: batch.id,
                    quantity_base: newBatchQty,
                    updated_at: nowISO,
                    pharmacy_name: pharmacyName
                });

                remainingToDeduct -= deductFromBatch;
            }

            // Update product quantity - ✅ FIXED with FULL payload
            const product = await db.products.get(item.product.id);
            if (product) {
                const newQuantity = Math.max(0, (product.quantity || 0) - quantitySold);

                // Update local
                const updatedProduct = {
                    ...product,
                    quantity: newQuantity,
                    updated_at: nowISO
                };
                await db.products.put(updatedProduct);

                // ✅ Queue product update for Supabase - FULL PAYLOAD with name
                const fullPayload = buildProductUpdatePayload(updatedProduct);
                await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'product', 'UPDATE', fullPayload);
            }

            // Create stock movement
            const movId = genUUID();
            const movement: StockMovement = {
                id: movId,
                pharmacy_name: pharmacyName,
                product_id: item.product.id,
                product_name: item.product.name,
                batch_id: usedBatch?.id || null,
                batch_number: usedBatch?.batch_number || null,
                movement_type: 'sale',
                quantity_base: -quantitySold,
                reference_type: 'sale',
                reference_id: saleId,
                performed_by: currentProfile?.id,
                performed_by_name: currentProfile?.full_name || 'System User',
                reason: `Sale transaction #${saleNumber}`,
                created_at: nowISO
            };

            await db.stock_movements.put(movement);
            await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'stock_movement', 'INSERT', movement);
        }

        // Save discount if applied
        if (discountAmount > 0) {
            const discountId = genUUID();
            const discountData = {
                id: discountId,
                sale_id: saleId,
                approved_by: currentProfile?.id || null,
                amount: discountAmount,
                percentage: null,
                reason: saleData.discount_reason || 'Discount applied at POS',
                pharmacy_name: pharmacyName,
                created_at: nowISO
            };

            await db.discounts.put(discountData);
            await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'discount', 'INSERT', discountData);

            const discountAuditLog = {
                id: genUUID(),
                pharmacy_name: pharmacyName,
                user_id: currentProfile?.id,
                user_name: currentProfile?.full_name,
                action: 'DISCOUNT_APPLIED',
                entity_type: 'DISCOUNT',
                entity_id: discountId,
                details: `Discount of ${discountAmount} applied to sale #${saleNumber}${saleData.discount_reason ? ` (Reason: ${saleData.discount_reason})` : ''}`,
                created_at: nowISO
            };

            await db.audit_logs.put(discountAuditLog);
            await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'audit_log', 'INSERT', discountAuditLog);
        }

        // Create audit log
        const auditLog = {
            id: genUUID(),
            pharmacy_name: pharmacyName,
            user_id: currentProfile?.id,
            user_name: currentProfile?.full_name,
            action: 'SALE_COMPLETED',
            entity_type: 'SALE',
            entity_id: saleId,
            details: `Sale #${saleNumber}: ${totalItems} items (${cartItems.length} unique products) for ${finalTotal}${discountAmount > 0 ? ` (Discount: ${discountAmount})` : ''}`,
            created_at: nowISO
        };

        await db.audit_logs.put(auditLog);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'audit_log', 'INSERT', auditLog);

        // ✅ Process sync queue immediately if online
        if (navigator.onLine && isSupabaseConfigured()) {
            try {
                await processOfflineSyncQueue();
            } catch (syncErr) {
                console.warn('Sync failed, will retry later:', syncErr);
            }
        }

        // Reload data
        await loadDatabaseData();

        // Show receipt
        if (createdSales.length > 0) {
            setReceiptSale(createdSales[0]);
            setIsReceiptModalOpen(true);
        }

        // Send notification
        try {
            const notificationService = getNotificationService();
            if (notificationService.isSupportedBrowser() && Notification.permission === 'granted') {
                const currency = currentProfile?.pharmacy_currency || 'KSh';
                await notificationService.notifySale({
                    ...createdSales[0],
                    pharmacy_currency: currency,
                    items_count: totalItems,
                    unique_items: cartItems.length
                }, pharmacyName);
            }
        } catch (notifError) {
            // Silent fail
        }

        return { success: true, saleId, saleNumber, totalItems, finalTotal };
    }, [currentProfile, getPharmacyName, batches, sales, loadDatabaseData, setReceiptSale, setIsReceiptModalOpen, buildProductUpdatePayload]);

    // =============================================
    // ADD PRODUCT - FIXED
    // =============================================
    const handleAddProduct = useCallback(async (prodData: Partial<Product>) => {
        if (!currentProfile) return;

        const pharmacyName = normalizePharmacyName(prodData.pharmacy_name || currentProfile.pharmacy_name);
        if (!pharmacyName) return;

        const id = genUUID();
        const now = new Date().toISOString();

        const newProd: Product = {
            id,
            pharmacy_name: pharmacyName,
            name: prodData.name || '',
            generic_name: prodData.generic_name || null,
            brand: prodData.brand || null,
            category_id: prodData.category_id || null,
            category_name: categories.find(c => c.id === prodData.category_id)?.name || null,
            description: prodData.description || null,
            notes: prodData.notes || null,
            product_type: prodData.product_type || 'medication',
            form: prodData.form || 'tablet',
            strength: prodData.strength || null,
            manufacturer: prodData.manufacturer || null,
            schedule_type: prodData.schedule_type || 'none',
            prescription_required: prodData.prescription_required || false,
            size: prodData.size || null,
            color: prodData.color || null,
            material: prodData.material || null,
            is_sterile: prodData.is_sterile || false,
            selling_price: prodData.selling_price || 0,
            default_cost_price: prodData.default_cost_price || 0,
            quantity: prodData.quantity || 0,
            reorder_level: prodData.reorder_level || 10,
            low_stock_threshold: prodData.low_stock_threshold || 5,
            is_active: true,
            is_controlled: prodData.is_controlled || false,
            barcode: prodData.barcode || null,
            sku: prodData.sku || null,
            shelf_number: prodData.shelf_number || null,
            bay_number: prodData.bay_number || null,
            rack_number: prodData.rack_number || null,
            storage_location: prodData.storage_location || null,
            zone: prodData.zone || null,
            bin_number: prodData.bin_number || null,
            cardboard_box_id: prodData.cardboard_box_id || null,
            storage_condition: prodData.storage_condition || 'room_temperature',
            last_inventory_count_date: prodData.last_inventory_count_date || null,
            last_inventory_count_by: prodData.last_inventory_count_by || null,
            created_at: now,
            updated_at: now
        };

        await db.products.put(newProd);

        // ✅ Use full payload with name
        const fullPayload = buildProductUpdatePayload(newProd);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'product', 'INSERT', fullPayload);

        const auditLog = {
            id: genUUID(),
            pharmacy_name: pharmacyName,
            user_id: currentProfile?.id,
            user_name: currentProfile?.full_name,
            action: 'PRODUCT_CREATED',
            entity_type: 'PRODUCT',
            entity_id: id,
            details: `Created product: ${prodData.name || 'Unknown'}`,
            created_at: now
        };

        await db.audit_logs.put(auditLog);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'audit_log', 'INSERT', auditLog);

        await loadDatabaseData();
    }, [currentProfile, categories, loadDatabaseData, buildProductUpdatePayload]);

    // =============================================
    // UPDATE PRODUCT - FIXED
    // =============================================
    const handleUpdateProduct = useCallback(async (productId: string, productData: Partial<Product>) => {
        if (!currentProfile) return;

        const pharmacyName = getPharmacyName();
        if (!pharmacyName) return;

        const existingProduct = await db.products.get(productId);
        if (!existingProduct) return;

        const now = new Date().toISOString();
        const updatedProduct: Product = {
            ...existingProduct,
            ...productData,
            shelf_number: productData.shelf_number !== undefined ? productData.shelf_number : existingProduct.shelf_number,
            bay_number: productData.bay_number !== undefined ? productData.bay_number : existingProduct.bay_number,
            rack_number: productData.rack_number !== undefined ? productData.rack_number : existingProduct.rack_number,
            storage_location: productData.storage_location !== undefined ? productData.storage_location : existingProduct.storage_location,
            zone: productData.zone !== undefined ? productData.zone : existingProduct.zone,
            bin_number: productData.bin_number !== undefined ? productData.bin_number : existingProduct.bin_number,
            cardboard_box_id: productData.cardboard_box_id !== undefined ? productData.cardboard_box_id : existingProduct.cardboard_box_id,
            storage_condition: productData.storage_condition || existingProduct.storage_condition || 'room_temperature',
            updated_at: now
        };

        await db.products.put(updatedProduct);

        // ✅ Use full payload with name
        const fullPayload = buildProductUpdatePayload(updatedProduct);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'product', 'UPDATE', fullPayload);

        const auditLog = {
            id: genUUID(),
            pharmacy_name: pharmacyName,
            user_id: currentProfile?.id,
            user_name: currentProfile?.full_name,
            action: 'PRODUCT_UPDATED',
            entity_type: 'PRODUCT',
            entity_id: productId,
            details: `Updated product: ${existingProduct.name} -> ${productData.name || existingProduct.name}`,
            created_at: now
        };

        await db.audit_logs.put(auditLog);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'audit_log', 'INSERT', auditLog);

        await loadDatabaseData();
    }, [currentProfile, getPharmacyName, loadDatabaseData, buildProductUpdatePayload]);

    // =============================================
    // ADD BATCH - FIXED
    // =============================================
    const handleAddBatch = useCallback(async (batchData: Partial<ProductBatch>) => {
        if (!currentProfile || !batchData.product_id) return;

        const pharmacyName = normalizePharmacyName(batchData.pharmacy_name || currentProfile.pharmacy_name);
        if (!pharmacyName) return;

        if (!batchData.batch_number || !batchData.expiry_date || !batchData.quantity_base || batchData.quantity_base <= 0) {
            throw new Error('Batch number, expiry date, and quantity > 0 are required');
        }

        const id = genUUID();
        const now = new Date().toISOString();

        const newBatch: ProductBatch = {
            id,
            pharmacy_name: pharmacyName,
            product_id: batchData.product_id,
            supplier_id: batchData.supplier_id || null,
            batch_number: batchData.batch_number.trim(),
            expiry_date: batchData.expiry_date,
            quantity_base: Number(batchData.quantity_base),
            cost_price: Number(batchData.cost_price) || 0,
            selling_price: Number(batchData.selling_price) || 0,
            received_at: now,
            created_at: now,
            updated_at: now
        };

        await db.product_batches.put(newBatch);

        const allBatchesForProduct = await db.product_batches.where('product_id').equals(batchData.product_id).toArray();
        const totalQuantity = allBatchesForProduct.reduce((sum, b) => sum + b.quantity_base, 0);

        const product = await db.products.get(batchData.product_id);
        if (!product) throw new Error('Product not found');

        const updatedProduct = {
            ...product,
            quantity: totalQuantity,
            updated_at: now
        };
        await db.products.put(updatedProduct);

        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'batch', 'INSERT', newBatch);

        // ✅ Use full payload with name
        const fullPayload = buildProductUpdatePayload(updatedProduct);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'product', 'UPDATE', fullPayload);

        const auditLog = {
            id: genUUID(),
            pharmacy_name: pharmacyName,
            user_id: currentProfile?.id,
            user_name: currentProfile?.full_name,
            action: 'BATCH_ADDED',
            entity_type: 'PRODUCT_BATCH',
            entity_id: id,
            details: `Added batch ${batchData.batch_number} with ${batchData.quantity_base} units. Product quantity: ${totalQuantity}`,
            created_at: now
        };

        await db.audit_logs.put(auditLog);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'audit_log', 'INSERT', auditLog);

        await loadDatabaseData();
    }, [currentProfile, loadDatabaseData, buildProductUpdatePayload]);

    // =============================================
    // UPDATE BATCH - FIXED
    // =============================================
    const handleUpdateBatch = useCallback(async (batchId: string, batchData: Partial<ProductBatch>) => {
        if (!currentProfile) return;

        const pharmacyName = getPharmacyName();
        if (!pharmacyName) return;

        const existingBatch = await db.product_batches.get(batchId);
        if (!existingBatch) throw new Error('Batch not found');

        const now = new Date().toISOString();
        const oldQuantity = existingBatch.quantity_base;
        const newQuantity = Number(batchData.quantity_base);

        await db.product_batches.update(batchId, {
            quantity_base: newQuantity,
            updated_at: now
        });

        const allBatchesForProduct = await db.product_batches.where('product_id').equals(existingBatch.product_id).toArray();
        const totalQuantity = allBatchesForProduct.reduce((sum, b) => sum + b.quantity_base, 0);

        const product = await db.products.get(existingBatch.product_id);
        if (!product) throw new Error('Product not found');

        const updatedProduct = {
            ...product,
            quantity: totalQuantity,
            updated_at: now
        };
        await db.products.put(updatedProduct);

        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'batch', 'UPDATE', {
            id: batchId,
            quantity_base: newQuantity,
            updated_at: now
        });

        // ✅ Use full payload with name
        const fullPayload = buildProductUpdatePayload(updatedProduct);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'product', 'UPDATE', fullPayload);

        const auditLog = {
            id: genUUID(),
            pharmacy_name: pharmacyName,
            user_id: currentProfile?.id,
            user_name: currentProfile?.full_name,
            action: 'BATCH_ADJUSTED',
            entity_type: 'PRODUCT_BATCH',
            entity_id: batchId,
            details: `Batch quantity changed from ${oldQuantity} to ${newQuantity}`,
            created_at: now
        };

        await db.audit_logs.put(auditLog);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'audit_log', 'INSERT', auditLog);

        await loadDatabaseData();
    }, [currentProfile, getPharmacyName, loadDatabaseData, buildProductUpdatePayload]);

    // =============================================
    // SALES RETURN - FIXED
    // =============================================
    const handleSalesReturn = useCallback(async (returnData: {
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
    }) => {
        if (!currentProfile) {
            throw new Error('No profile found');
        }

        const pharmacyName = getPharmacyName();
        if (!pharmacyName) {
            throw new Error('No pharmacy name found');
        }

        try {
            const sale = await db.sales.get(returnData.saleId);
            if (!sale) {
                throw new Error('Sale not found');
            }

            const product = await db.products.get(returnData.productId);
            if (!product) {
                throw new Error('Product not found');
            }

            if (returnData.quantityReturned <= 0) {
                throw new Error('Quantity returned must be greater than 0');
            }

            if (returnData.quantityReturned > sale.quantity) {
                throw new Error(`Cannot return more than ${sale.quantity} units. Only ${sale.quantity} units were sold.`);
            }

            let batch = null;
            if (returnData.batchId) {
                batch = await db.product_batches.get(returnData.batchId);
            }

            const now = new Date().toISOString();
            const returnId = genUUID();

            const newReturn: SalesReturn = {
                id: returnId,
                pharmacy_name: pharmacyName,
                sale_id: sale.id,
                sale_number: sale.sale_number || 'UNKNOWN',
                product_id: returnData.productId,
                product_name: sale.product_name || product.name,
                batch_id: returnData.batchId || null,
                batch_number: batch?.batch_number || null,
                quantity_returned: returnData.quantityReturned,
                original_quantity: sale.quantity,
                remaining_quantity: sale.quantity - returnData.quantityReturned,
                return_reason: returnData.returnReason,
                return_type: returnData.returnType || 'customer_return',
                refund_amount: returnData.refundAmount || 0,
                refund_method: returnData.refundMethod || null,
                returned_by: currentProfile?.id || null,
                returned_by_name: currentProfile?.full_name || null,
                customer_id: returnData.customerId || sale.customer_id || null,
                customer_name: returnData.customerName || sale.customer_name || null,
                notes: returnData.notes || null,
                status: 'completed',
                created_at: now,
                updated_at: now,
            };

            await db.sales_returns.put(newReturn);
            await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'sales_return', 'INSERT', newReturn);

            const updatedQuantity = sale.quantity - returnData.quantityReturned;
            const updatedSale = {
                ...sale,
                quantity: updatedQuantity,
                subtotal: sale.unit_price * updatedQuantity,
                total: sale.unit_price * updatedQuantity,
                updated_at: now,
                notes: sale.notes
                    ? `${sale.notes} | Returned ${returnData.quantityReturned} units on ${new Date().toLocaleDateString()}`
                    : `Returned ${returnData.quantityReturned} units on ${new Date().toLocaleDateString()}`
            };

            await db.sales.put(updatedSale);
            await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'sale', 'UPDATE', {
                id: sale.id,
                quantity: updatedQuantity,
                subtotal: updatedSale.subtotal,
                total: updatedSale.total,
                updated_at: now,
                notes: updatedSale.notes
            });

            if (product) {
                const newProductQty = (product.quantity || 0) + returnData.quantityReturned;
                const updatedProduct = {
                    ...product,
                    quantity: newProductQty,
                    updated_at: now
                };
                await db.products.put(updatedProduct);

                // ✅ Use full payload with name
                const fullPayload = buildProductUpdatePayload(updatedProduct);
                await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'product', 'UPDATE', fullPayload);
            }

            if (batch && returnData.batchId) {
                const newBatchQty = (batch.quantity_base || 0) + returnData.quantityReturned;
                await db.product_batches.update(returnData.batchId, {
                    quantity_base: newBatchQty,
                    updated_at: now
                });

                await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'batch', 'UPDATE', {
                    id: returnData.batchId,
                    quantity_base: newBatchQty,
                    updated_at: now
                });
            }

            const movId = genUUID();
            const movement: StockMovement = {
                id: movId,
                pharmacy_name: pharmacyName,
                product_id: returnData.productId,
                product_name: sale.product_name || product.name,
                batch_id: returnData.batchId || null,
                batch_number: batch?.batch_number || null,
                movement_type: 'return',
                quantity_base: returnData.quantityReturned,
                reference_type: 'return',
                reference_id: returnId,
                performed_by: currentProfile?.id,
                performed_by_name: currentProfile?.full_name,
                reason: `Return: ${returnData.returnReason}`,
                created_at: now
            };

            await db.stock_movements.put(movement);
            await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'stock_movement', 'INSERT', movement);

            const auditLog = {
                id: genUUID(),
                pharmacy_name: pharmacyName,
                user_id: currentProfile?.id,
                user_name: currentProfile?.full_name,
                action: 'SALE_RETURN_CREATED',
                entity_type: 'SALE_RETURN',
                entity_id: returnId,
                details: `Returned ${returnData.quantityReturned} units of ${sale.product_name} from sale ${sale.sale_number}. Reason: ${returnData.returnReason}`,
                created_at: now
            };

            await db.audit_logs.put(auditLog);
            await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'audit_log', 'INSERT', auditLog);

            await loadDatabaseData();

            return newReturn;

        } catch (err) {
            throw err;
        }
    }, [currentProfile, getPharmacyName, loadDatabaseData, buildProductUpdatePayload]);

    // =============================================
    // OTHER FUNCTIONS (unchanged)
    // =============================================

    const handleDeleteProduct = useCallback(async (productId: string) => {
        if (!currentProfile) return;

        const pharmacyName = getPharmacyName();
        if (!pharmacyName) return;

        const productBatches = await db.product_batches.where('product_id').equals(productId).toArray();
        if (productBatches.length > 0) {
            if (!confirm(`This product has ${productBatches.length} batch(es). Deleting it will also delete all associated batches and stock movements. Continue?`)) {
                return;
            }
        }

        try {
            for (const batch of productBatches) {
                await db.stock_movements.where('batch_id').equals(batch.id).delete();
                await db.product_batches.delete(batch.id);
            }

            await db.products.delete(productId);

            const auditLog = {
                id: genUUID(),
                pharmacy_name: pharmacyName,
                user_id: currentProfile?.id,
                user_name: currentProfile?.full_name,
                action: 'DELETE_PRODUCT',
                entity_type: 'PRODUCT',
                entity_id: productId,
                details: `Deleted product with ${productBatches.length} batch(es)`,
                created_at: new Date().toISOString()
            };

            await db.audit_logs.put(auditLog);
            await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'audit_log', 'INSERT', auditLog);

            await loadDatabaseData();
        } catch (err) {
            throw err;
        }
    }, [currentProfile, getPharmacyName, loadDatabaseData]);

    const handleAddSupplier = useCallback(async (suppData: Partial<Supplier>) => {
        if (!currentProfile) return;
        const pharmacyName = getPharmacyName();
        if (!pharmacyName) return;

        const id = genUUID();
        const now = new Date().toISOString();
        const newSupp: Supplier = {
            id,
            pharmacy_name: pharmacyName,
            name: suppData.name || '',
            phone: suppData.phone || '',
            contact_person: suppData.contact_person || '',
            email: suppData.email || '',
            address: suppData.address || '',
            notes: suppData.notes || '',
            active: true,
            created_at: now,
            updated_at: now
        };

        await db.suppliers.put(newSupp);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'supplier', 'INSERT', newSupp);
        await loadDatabaseData();
    }, [currentProfile, getPharmacyName, loadDatabaseData]);

    const handleAddStaff = useCallback(async (staffData: Partial<Profile>) => {
        if (!currentProfile) return;
        const pharmacyName = getPharmacyName();
        if (!pharmacyName) return;

        const existing = await db.profiles.where('pin_code').equals(staffData.pin_code || '').first();
        if (existing) {
            throw new Error('PIN already in use. Please use a different PIN.');
        }

        const profileId = genUUID();
        const now = new Date().toISOString();
        const newProfile: Profile = {
            id: profileId,
            auth_user_id: null,
            pharmacy_name: pharmacyName,
            pharmacy_trading_name: currentProfile.pharmacy_trading_name || '',
            pharmacy_phone: currentProfile.pharmacy_phone || '',
            pharmacy_email: currentProfile.pharmacy_email || '',
            pharmacy_address: currentProfile.pharmacy_address || '',
            pharmacy_county: currentProfile.pharmacy_county || '',
            pharmacy_town: currentProfile.pharmacy_town || '',
            pharmacy_receipt_header: currentProfile.pharmacy_receipt_header || '',
            pharmacy_receipt_footer: currentProfile.pharmacy_receipt_footer || '',
            pharmacy_currency: currentProfile.pharmacy_currency || 'KSh',
            pharmacy_settings: currentProfile.pharmacy_settings || {
                allow_negative_stock: false,
                low_stock_threshold: 10,
                expiry_warning_days: 90
            },
            pharmacy_is_active: true,
            full_name: staffData.full_name || '',
            email: staffData.email || '',
            phone: staffData.phone || '',
            pin_code: staffData.pin_code || '',
            role: staffData.role || 'cashier',
            is_owner: false,
            is_active: true,
            avatar_url: null,
            created_at: now,
            updated_at: now
        };

        await db.profiles.put(newProfile);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'profile', 'INSERT', newProfile);
        await loadDatabaseData();

        const auditLog = {
            id: genUUID(),
            pharmacy_name: pharmacyName,
            user_id: currentProfile.id,
            user_name: currentProfile.full_name,
            action: 'ADD_STAFF',
            entity_type: 'PROFILE',
            entity_id: profileId,
            details: `Added staff member: ${newProfile.full_name} (${newProfile.role})`,
            created_at: now
        };

        await db.audit_logs.put(auditLog);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'audit_log', 'INSERT', auditLog);
    }, [currentProfile, getPharmacyName, loadDatabaseData]);

    const handleUpdateProfile = useCallback(async (profileId: string, updates: Partial<Profile>) => {
        if (!currentProfile) return;
        const existing = await db.profiles.get(profileId);
        if (!existing) return;

        let normalizedUpdates = { ...updates };
        if (normalizedUpdates.pharmacy_name) {
            normalizedUpdates.pharmacy_name = normalizePharmacyName(normalizedUpdates.pharmacy_name);
        }

        const updated: Profile = {
            ...existing,
            ...normalizedUpdates,
            updated_at: new Date().toISOString()
        };

        await db.profiles.put(updated);

        if (normalizedUpdates.pharmacy_name && normalizedUpdates.pharmacy_name !== existing.pharmacy_name) {
            const oldName = existing.pharmacy_name;
            const newName = normalizedUpdates.pharmacy_name;

            await db.products.where('pharmacy_name').equals(oldName).modify({ pharmacy_name: newName });
            await db.product_batches.where('pharmacy_name').equals(oldName).modify({ pharmacy_name: newName });
            await db.sales.where('pharmacy_name').equals(oldName).modify({ pharmacy_name: newName });
            await db.stock_movements.where('pharmacy_name').equals(oldName).modify({ pharmacy_name: newName });
            await db.customers.where('pharmacy_name').equals(oldName).modify({ pharmacy_name: newName });
            await db.suppliers.where('pharmacy_name').equals(oldName).modify({ pharmacy_name: newName });
            await db.categories.where('pharmacy_name').equals(oldName).modify({ pharmacy_name: newName });
            await db.audit_logs.where('pharmacy_name').equals(oldName).modify({ pharmacy_name: newName });
        }

        await queueOfflineMutation(normalizePharmacyName(currentProfile.pharmacy_name), currentProfile.id, 'profile', 'UPDATE', updated);
        await loadDatabaseData();
    }, [currentProfile, loadDatabaseData]);

    const handleUpdatePharmacyName = useCallback(async (newName: string) => {
        if (!currentProfile) return;
        await handleUpdateProfile(currentProfile.id, { pharmacy_name: newName });
    }, [currentProfile, handleUpdateProfile]);

    const handleResetLocalCache = useCallback(async () => {
        if (!currentProfile) return;
        try {
            await db.products.clear();
            await db.product_batches.clear();
            await db.sales.clear();
            await db.stock_movements.clear();
            await db.customers.clear();
            await db.categories.clear();
            await db.units.clear();

            const pharmacyName = normalizePharmacyName(currentProfile.pharmacy_name);
            if (isSupabaseConfigured()) {
                await pullFromSupabaseToLocal(pharmacyName);
            }
            await loadDatabaseData();
            alert('Local cache reset. Data re-synced from Supabase.');
        } catch (err: any) {
            alert('Error resetting cache: ' + (err.message || err));
        }
    }, [currentProfile, loadDatabaseData]);

    const handleForceSync = useCallback(async (isOnline: boolean) => {
        if (!currentProfile) {
            alert('No profile found. Please login.');
            return;
        }

        if (!isSupabaseConfigured()) {
            alert('Supabase not configured. Please check your settings.');
            return;
        }

        if (!isOnline) {
            alert('You are offline. Please connect to the internet and try again.');
            return;
        }

        const pharmacyName = normalizePharmacyName(currentProfile.pharmacy_name);

        try {
            const { synced, failed } = await processOfflineSyncQueue();
            const success = await pullFromSupabaseToLocal(pharmacyName);
            if (success) {
                await loadDatabaseData();
                alert('Data synced successfully.');
            } else {
                alert('Sync failed. Please check your connection and try again.');
            }
        } catch (error) {
            alert('Sync failed: ' + (error as Error).message);
        }
    }, [currentProfile, loadDatabaseData]);

    // =============================================
    // REQUESTED ITEMS CRUD
    // =============================================

    const handleAddRequestedItem = useCallback(async (itemData: Partial<RequestedItem>) => {
        if (!currentProfile) {
            throw new Error('No profile found');
        }

        const pharmacyName = normalizePharmacyName(itemData.pharmacy_name || currentProfile.pharmacy_name);
        if (!pharmacyName) {
            throw new Error('No pharmacy name found');
        }

        if (!itemData.item_name || !itemData.item_name.trim()) {
            throw new Error('Item name is required');
        }

        const id = genUUID();
        const now = new Date().toISOString();

        const newItem: RequestedItem = {
            id,
            pharmacy_name: pharmacyName,
            item_name: itemData.item_name.trim(),
            generic_name: itemData.generic_name || null,
            brand_name: itemData.brand_name || null,
            category: itemData.category || null,
            form: itemData.form || null,
            strength: itemData.strength || null,
            request_count: itemData.request_count || 1,
            last_requested_at: itemData.last_requested_at || now,
            created_at: now,
            updated_at: now,
            status: itemData.status || 'pending',
            notes: itemData.notes || null,
            requested_by: itemData.requested_by || null,
            customer_phone: itemData.customer_phone || null,
            priority: itemData.priority || 'medium',
            estimated_demand: itemData.estimated_demand || 1,
            added_to_inventory_at: itemData.added_to_inventory_at || null,
            ordered_from_supplier_at: itemData.ordered_from_supplier_at || null,
            supplier_name: itemData.supplier_name || null,
        };

        await db.requested_items.put(newItem);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'requested_item', 'INSERT', newItem);

        const auditLog = {
            id: genUUID(),
            pharmacy_name: pharmacyName,
            user_id: currentProfile?.id,
            user_name: currentProfile?.full_name,
            action: 'REQUESTED_ITEM_ADDED',
            entity_type: 'REQUESTED_ITEM',
            entity_id: id,
            details: `Added requested item: ${itemData.item_name}`,
            created_at: now
        };

        await db.audit_logs.put(auditLog);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'audit_log', 'INSERT', auditLog);

        await loadDatabaseData();
    }, [currentProfile, loadDatabaseData]);

    const handleUpdateRequestedItem = useCallback(async (itemId: string, itemData: Partial<RequestedItem>) => {
        if (!currentProfile) {
            throw new Error('No profile found');
        }

        const pharmacyName = getPharmacyName();
        if (!pharmacyName) {
            throw new Error('No pharmacy name found');
        }

        const existingItem = await db.requested_items.get(itemId);
        if (!existingItem) {
            throw new Error('Requested item not found');
        }

        const now = new Date().toISOString();

        const updatedItem: RequestedItem = {
            ...existingItem,
            ...itemData,
            updated_at: now,
        };

        await db.requested_items.put(updatedItem);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'requested_item', 'UPDATE', updatedItem);

        const auditLog = {
            id: genUUID(),
            pharmacy_name: pharmacyName,
            user_id: currentProfile?.id,
            user_name: currentProfile?.full_name,
            action: 'REQUESTED_ITEM_UPDATED',
            entity_type: 'REQUESTED_ITEM',
            entity_id: itemId,
            details: `Updated requested item: ${existingItem.item_name} -> ${itemData.item_name || existingItem.item_name}`,
            created_at: now
        };

        await db.audit_logs.put(auditLog);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'audit_log', 'INSERT', auditLog);

        await loadDatabaseData();
    }, [currentProfile, getPharmacyName, loadDatabaseData]);

    const handleDeleteRequestedItem = useCallback(async (itemId: string) => {
        if (!currentProfile) {
            throw new Error('No profile found');
        }

        const pharmacyName = getPharmacyName();
        if (!pharmacyName) {
            throw new Error('No pharmacy name found');
        }

        const existingItem = await db.requested_items.get(itemId);
        if (!existingItem) {
            throw new Error('Requested item not found');
        }

        try {
            await db.requested_items.delete(itemId);
            await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'requested_item', 'DELETE', { id: itemId });

            const auditLog = {
                id: genUUID(),
                pharmacy_name: pharmacyName,
                user_id: currentProfile?.id,
                user_name: currentProfile?.full_name,
                action: 'REQUESTED_ITEM_DELETED',
                entity_type: 'REQUESTED_ITEM',
                entity_id: itemId,
                details: `Deleted requested item: ${existingItem.item_name}`,
                created_at: new Date().toISOString()
            };

            await db.audit_logs.put(auditLog);
            await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'audit_log', 'INSERT', auditLog);

            await loadDatabaseData();
        } catch (err) {
            throw err;
        }
    }, [currentProfile, getPharmacyName, loadDatabaseData]);

    // =============================================
    // SECURITY OPERATIONS
    // =============================================

    const handleChangePin = useCallback(async (data: {
        currentPin: string;
        newPin: string;
        confirmPin: string;
    }) => {
        if (!currentProfile) {
            throw new Error('No profile found. Please login.');
        }

        if (!data.currentPin || data.currentPin.length !== 4) {
            throw new Error('Current PIN must be 4 digits.');
        }

        if (!data.newPin || data.newPin.length !== 4) {
            throw new Error('New PIN must be 4 digits.');
        }

        if (data.newPin !== data.confirmPin) {
            throw new Error('New PIN and confirmation do not match.');
        }

        if (data.currentPin === data.newPin) {
            throw new Error('New PIN must be different from current PIN.');
        }

        if (currentProfile.pin_code !== data.currentPin) {
            throw new Error('Current PIN is incorrect.');
        }

        const { success, error } = await changeUserPin(
            currentProfile.id,
            data.newPin
        );

        if (!success) {
            throw new Error(error?.message || 'Failed to update PIN.');
        }

        const updatedProfile = {
            ...currentProfile,
            pin_code: data.newPin,
            updated_at: new Date().toISOString()
        };
        await db.profiles.put(updatedProfile);

        return { success: true };
    }, [currentProfile]);

    const handleChangePassword = useCallback(async (data: {
        currentPassword: string;
        newPassword: string;
        confirmPassword: string;
    }) => {
        if (!currentProfile) {
            throw new Error('No profile found. Please login.');
        }

        if (!data.currentPassword || data.currentPassword.length < 6) {
            throw new Error('Current password must be at least 6 characters.');
        }

        if (!data.newPassword || data.newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters.');
        }

        if (data.newPassword !== data.confirmPassword) {
            throw new Error('New password and confirmation do not match.');
        }

        if (data.currentPassword === data.newPassword) {
            throw new Error('New password must be different from current password.');
        }

        const { success, error } = await changeUserPassword(
            data.currentPassword,
            data.newPassword
        );

        if (!success) {
            throw new Error(error?.message || 'Failed to update password.');
        }

        return { success: true };
    }, [currentProfile]);

    const handleDeleteAccount = useCallback(async (profileId: string) => {
        if (!currentProfile) {
            throw new Error('No profile found. Please login.');
        }

        const isSelf = profileId === currentProfile.id;

        if (!isSelf && currentRole !== 'owner') {
            throw new Error('Only owners can delete other staff accounts.');
        }

        if (!isSelf) {
            const targetProfile = await db.profiles.get(profileId);
            if (!targetProfile) {
                throw new Error('Profile not found.');
            }
            if (targetProfile.pharmacy_name !== currentProfile.pharmacy_name) {
                throw new Error('Cannot delete users from other pharmacies.');
            }
        }

        const { success, error } = await deleteAccount(profileId);

        if (!success) {
            throw new Error(error?.message || 'Failed to delete account.');
        }

        if (isSelf) {
            localStorage.removeItem('medp_authenticated');
            localStorage.removeItem('medp_current_user_id');
            await db.profiles.delete(profileId);
            await loadDatabaseData();
        } else {
            await db.profiles.delete(profileId);
            await loadDatabaseData();
        }

        return { success: true, isSelf };
    }, [currentProfile, currentRole, loadDatabaseData]);

    return {
        handleCompleteSale,
        handleAddProduct,
        handleUpdateProduct,
        handleDeleteProduct,
        handleAddBatch,
        handleUpdateBatch,
        handleAddSupplier,
        handleAddStaff,
        handleUpdateProfile,
        handleUpdatePharmacyName,
        handleResetLocalCache,
        handleForceSync,
        handleAddRequestedItem,
        handleUpdateRequestedItem,
        handleDeleteRequestedItem,
        handleSalesReturn,
        handleChangePin,
        handleChangePassword,
        handleDeleteAccount,
    };
};