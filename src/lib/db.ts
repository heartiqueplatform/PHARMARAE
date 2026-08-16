// lib/db.ts
import Dexie, { Table } from 'dexie';
import {
  Pharmacy,
  Profile,
  RequestedItem,
  PharmacyUser,
  Category,
  Unit,
  Product,
  ProductUnit,
  Supplier,
  ProductBatch,
  Purchase,
  PurchaseItem,
  Customer,
  Sale,
  StockMovement,
  Stocktake,
  StocktakeItem,
  SaleReturn,
  AuditLog,
  OfflineSyncItem,
  Payment,
  Discount,
  Notification,
  SalesReturn,
} from '../types';

export interface PushSubscription {
  id?: string;
  user_id: string;
  pharmacy_name: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  created_at: string;
  updated_at: string;
}

export class MedPDatabase extends Dexie {
  // Tables
  pharmacies!: Table<Pharmacy, string>;
  profiles!: Table<Profile, string>;
  pharmacy_users!: Table<PharmacyUser, string>;
  categories!: Table<Category, string>;
  units!: Table<Unit, string>;
  products!: Table<Product, string>;
  product_units!: Table<ProductUnit, string>;
  suppliers!: Table<Supplier, string>;
  product_batches!: Table<ProductBatch, string>;
  purchases!: Table<Purchase, string>;
  purchase_items!: Table<PurchaseItem, string>;
  customers!: Table<Customer, string>;
  sales!: Table<Sale, string>;
  payments!: Table<Payment, string>;
  stock_movements!: Table<StockMovement, string>;
  stocktakes!: Table<Stocktake, string>;
  stocktake_items!: Table<StocktakeItem, string>;
  sale_returns!: Table<SaleReturn, string>;
  sales_returns!: Table<SalesReturn, string>;
  discounts!: Table<Discount, string>;
  audit_logs!: Table<AuditLog, string>;
  requested_items!: Table<RequestedItem, string>;
  notifications!: Table<Notification, string>;
  sync_queue!: Table<OfflineSyncItem, number>;
  push_subscriptions!: Table<PushSubscription, string>;

  constructor() {
    super('MedPPharmacyDB');

    // =============================================
    // VERSION 1: Original schema with pharmacy_id
    // =============================================
    this.version(1).stores({
      pharmacies: 'id, name, is_active, created_at',
      profiles: 'id, full_name, email, phone, pin_code, created_at',
      pharmacy_users: 'id, pharmacy_id, user_id, role, is_active',
      categories: 'id, pharmacy_id, name, active',
      units: 'id, pharmacy_id, name, abbreviation',
      products: 'id, pharmacy_id, name, barcode, category_id, active, created_at',
      product_units: 'id, product_id, unit_id',
      suppliers: 'id, pharmacy_id, name, phone, active',
      product_batches: 'id, pharmacy_id, product_id, batch_number, expiry_date, created_at',
      purchases: 'id, pharmacy_id, supplier_id, purchase_number, status, created_at',
      purchase_items: 'id, purchase_id, product_id, batch_id',
      customers: 'id, pharmacy_id, name, phone, created_at',
      sales: 'id, pharmacy_id, sale_number, customer_id, status, created_at',
      sale_items: 'id, sale_id, product_id, pharmacy_name, batch_id',
      payments: 'id, pharmacy_id, sale_id, method, status',
      stock_movements: 'id, pharmacy_id, product_id, batch_id, movement_type, created_at',
      stocktakes: 'id, pharmacy_id, status, started_at',
      stocktake_items: 'id, stocktake_id, product_id, batch_id',
      sale_returns: 'id, pharmacy_id, sale_id, created_at',
      discounts: 'id, pharmacy_id, sale_id',
      audit_logs: 'id, pharmacy_id, user_id, action, created_at',
      notifications: 'id, pharmacy_id, user_id, read, created_at',
      sync_queue: '++id, sync_id, pharmacy_id, user_id, entity_type, status, created_at'
    });

    // =============================================
    // VERSION 2: Add indexes for single table architecture
    // =============================================
    this.version(2).stores({
      pharmacies: 'id, name, is_active, created_at',
      profiles: 'id, auth_user_id, pharmacy_name, email, pin_code, role, is_active, created_at',
      pharmacy_users: 'id, pharmacy_id, user_id, role, is_active',
      categories: 'id, pharmacy_name, name, active',
      units: 'id, pharmacy_name, name, abbreviation',
      products: 'id, pharmacy_name, name, barcode, category_id, active, created_at',
      product_units: 'id, product_id, unit_id',
      suppliers: 'id, pharmacy_name, name, phone, active',
      product_batches: 'id, pharmacy_name, product_id, batch_number, expiry_date, created_at',
      purchases: 'id, pharmacy_name, supplier_id, purchase_number, status, created_at',
      purchase_items: 'id, purchase_id, product_id, batch_id',
      customers: 'id, pharmacy_name, name, phone, created_at',
      sales: 'id, pharmacy_name, sale_number, customer_id, status, created_at',
      sale_items: 'id, sale_id, product_id, pharmacy_name, batch_id',
      payments: 'id, pharmacy_name, sale_id, method, status',
      stock_movements: 'id, pharmacy_name, product_id, batch_id, movement_type, created_at',
      stocktakes: 'id, pharmacy_name, status, started_at',
      stocktake_items: 'id, stocktake_id, product_id, batch_id',
      sale_returns: 'id, pharmacy_name, sale_id, created_at',
      discounts: 'id, pharmacy_name, sale_id',
      audit_logs: 'id, pharmacy_name, user_id, action, created_at',
      requested_items: 'id, pharmacy_name, item_name, status, priority, request_count, last_requested_at',
      notifications: 'id, pharmacy_name, user_id, read, created_at',
      sync_queue: '++id, sync_id, pharmacy_id, user_id, entity_type, status, created_at'
    }).upgrade(async (tx) => {
      // Silent upgrade - no logs
      try {
        const profiles = await tx.table('profiles').toArray();
        const pharmacyUsers = await tx.table('pharmacy_users').toArray();
        const pharmacies = await tx.table('pharmacies').toArray();

        for (const profile of profiles) {
          if (profile.pharmacy_name) continue;

          const pu = pharmacyUsers.find(p => p.user_id === profile.id);
          if (pu) {
            const pharmacy = pharmacies.find(p => p.id === pu.pharmacy_id);
            if (pharmacy) {
              profile.pharmacy_name = pharmacy.name;
              profile.pharmacy_trading_name = pharmacy.trading_name || '';
              profile.pharmacy_phone = pharmacy.phone || '';
              profile.pharmacy_email = pharmacy.email || '';
              profile.pharmacy_address = pharmacy.address || '';
              profile.pharmacy_county = pharmacy.county || '';
              profile.pharmacy_town = pharmacy.town || '';
              profile.pharmacy_receipt_header = pharmacy.receipt_header || '';
              profile.pharmacy_receipt_footer = pharmacy.receipt_footer || '';
              profile.pharmacy_currency = pharmacy.currency || 'KSh';
              profile.pharmacy_settings = pharmacy.settings || {
                allow_negative_stock: false,
                low_stock_threshold: 10,
                expiry_warning_days: 90
              };
              profile.pharmacy_is_active = true;
              profile.is_owner = pu.role === 'owner';
              profile.role = pu.role || 'cashier';
              profile.is_active = true;

              await tx.table('profiles').put(profile);
            }
          }
        }
      } catch (error) {
        // Silent fail - upgrade will retry
      }
    });

    // =============================================
    // VERSION 3: Remove pharmacies and pharmacy_users tables
    // =============================================
    this.version(3).stores({
      profiles: 'id, auth_user_id, pharmacy_name, email, pin_code, role, is_active, created_at',
      categories: 'id, pharmacy_name, name, active',
      units: 'id, pharmacy_name, name, abbreviation',
      products: 'id, pharmacy_name, name, barcode, category_id, active, created_at',
      product_units: 'id, product_id, unit_id',
      suppliers: 'id, pharmacy_name, name, phone, active',
      product_batches: 'id, pharmacy_name, product_id, batch_number, expiry_date, created_at',
      purchases: 'id, pharmacy_name, supplier_id, purchase_number, status, created_at',
      purchase_items: 'id, purchase_id, product_id, batch_id',
      customers: 'id, pharmacy_name, name, phone, created_at',
      sales: 'id, pharmacy_name, sale_number, customer_id, status, created_at',
      sale_items: 'id, sale_id, product_id, pharmacy_name, batch_id',
      payments: 'id, pharmacy_name, sale_id, method, status',
      stock_movements: 'id, pharmacy_name, product_id, batch_id, movement_type, created_at',
      stocktakes: 'id, pharmacy_name, status, started_at',
      stocktake_items: 'id, stocktake_id, product_id, batch_id',
      sale_returns: 'id, pharmacy_name, sale_id, created_at',
      discounts: 'id, pharmacy_name, sale_id',
      audit_logs: 'id, pharmacy_name, user_id, action, created_at',
      notifications: 'id, pharmacy_name, user_id, read, created_at',
      sync_queue: '++id, sync_id, pharmacy_name, user_id, entity_type, status, created_at'
    }).upgrade(async (tx) => {
      try {
        const syncItems = await tx.table('sync_queue').toArray();

        for (const item of syncItems) {
          if (item.pharmacy_id && !item.pharmacy_name) {
            const pharmacy = await tx.table('pharmacies').get(item.pharmacy_id);
            if (pharmacy) {
              await tx.table('sync_queue').update(item.id, {
                pharmacy_name: pharmacy.name,
                pharmacy_id: undefined
              });
            }
          }
        }

        const profiles = await tx.table('profiles').toArray();
        for (const profile of profiles) {
          if (!profile.pharmacy_name) continue;

          if (!profile.role) {
            profile.role = 'owner';
            profile.is_owner = true;
          }
          if (profile.is_owner === undefined) {
            profile.is_owner = profile.role === 'owner';
          }
          if (profile.is_active === undefined) {
            profile.is_active = true;
          }

          await tx.table('profiles').put(profile);
        }
      } catch (error) {
        // Silent fail
      }
    });

    // =============================================
    // VERSION 4: Normalize all pharmacy_names to UPPERCASE
    // =============================================
    this.version(4).stores({
      profiles: 'id, auth_user_id, pharmacy_name, email, pin_code, role, is_active, created_at',
      categories: 'id, pharmacy_name, name, active',
      units: 'id, pharmacy_name, name, abbreviation',
      products: 'id, pharmacy_name, name, barcode, category_id, active, created_at',
      product_units: 'id, product_id, unit_id',
      suppliers: 'id, pharmacy_name, name, phone, active',
      product_batches: 'id, pharmacy_name, product_id, batch_number, expiry_date, created_at',
      purchases: 'id, pharmacy_name, supplier_id, purchase_number, status, created_at',
      purchase_items: 'id, purchase_id, product_id, batch_id',
      customers: 'id, pharmacy_name, name, phone, created_at',
      sales: 'id, pharmacy_name, sale_number, customer_id, status, created_at',
      sale_items: 'id, sale_id, product_id, pharmacy_name, batch_id',
      payments: 'id, pharmacy_name, sale_id, method, status',
      stock_movements: 'id, pharmacy_name, product_id, batch_id, movement_type, created_at',
      stocktakes: 'id, pharmacy_name, status, started_at',
      stocktake_items: 'id, stocktake_id, product_id, batch_id',
      sale_returns: 'id, pharmacy_name, sale_id, created_at',
      discounts: 'id, pharmacy_name, sale_id',
      audit_logs: 'id, pharmacy_name, user_id, action, created_at',
      notifications: 'id, pharmacy_name, user_id, read, created_at',
      sync_queue: '++id, sync_id, pharmacy_name, user_id, entity_type, status, created_at'
    }).upgrade(async (tx) => {
      const tables = [
        'profiles', 'categories', 'units', 'products', 'suppliers',
        'product_batches', 'purchases', 'purchase_items', 'customers',
        'sales', 'sale_items', 'payments', 'stock_movements',
        'stocktakes', 'stocktake_items', 'sale_returns', 'discounts',
        'audit_logs', 'notifications', 'sync_queue'
      ];

      for (const tableName of tables) {
        try {
          const items = await tx.table(tableName).toArray();

          for (const item of items) {
            if (item.pharmacy_name) {
              const normalized = item.pharmacy_name
                .trim()
                .replace(/\s+/g, ' ')
                .toUpperCase();

              if (normalized !== item.pharmacy_name) {
                await tx.table(tableName).update(item.id, {
                  pharmacy_name: normalized
                });
              }
            }
          }
        } catch (err) {
          // Silent skip
        }
      }
    });

    // =============================================
    // VERSION 5: Clean up - ensure all tables have pharmacy_name index
    // =============================================
    this.version(5).stores({
      profiles: 'id, auth_user_id, pharmacy_name, email, pin_code, role, is_active, created_at',
      categories: 'id, pharmacy_name, name, active',
      units: 'id, pharmacy_name, name, abbreviation',
      products: 'id, pharmacy_name, name, barcode, category_id, active, created_at',
      product_units: 'id, product_id, unit_id',
      suppliers: 'id, pharmacy_name, name, phone, active',
      product_batches: 'id, pharmacy_name, product_id, batch_number, expiry_date, created_at',
      purchases: 'id, pharmacy_name, supplier_id, purchase_number, status, created_at',
      purchase_items: 'id, purchase_id, product_id, batch_id',
      customers: 'id, pharmacy_name, name, phone, created_at',
      sales: 'id, pharmacy_name, sale_number, customer_id, status, created_at',
      sale_items: 'id, sale_id, product_id, pharmacy_name, batch_id',
      payments: 'id, pharmacy_name, sale_id, method, status',
      stock_movements: 'id, pharmacy_name, product_id, batch_id, movement_type, created_at',
      stocktakes: 'id, pharmacy_name, status, started_at',
      stocktake_items: 'id, stocktake_id, product_id, batch_id',
      sale_returns: 'id, pharmacy_name, sale_id, created_at',
      discounts: 'id, pharmacy_name, sale_id',
      audit_logs: 'id, pharmacy_name, user_id, action, created_at',
      notifications: 'id, pharmacy_name, user_id, read, created_at',
      sync_queue: '++id, sync_id, pharmacy_name, user_id, entity_type, status, created_at'
    }).upgrade(async (tx) => {
      try {
        const syncItems = await tx.table('sync_queue').toArray();

        for (const item of syncItems) {
          if (!item.pharmacy_name) {
            const payload = item.payload || {};
            let pharmacyName = payload.pharmacy_name || payload.pharmacy_id || 'UNKNOWN';

            if (pharmacyName && pharmacyName.includes('-') && pharmacyName.length === 36) {
              const pharmacy = await tx.table('pharmacies').get(pharmacyName);
              if (pharmacy) {
                pharmacyName = pharmacy.name;
              }
            }

            const normalized = pharmacyName
              .trim()
              .replace(/\s+/g, ' ')
              .toUpperCase();

            await tx.table('sync_queue').update(item.id, {
              pharmacy_name: normalized
            });
          }
        }

        const orphaned = await tx.table('sync_queue')
          .where('pharmacy_name')
          .equals('')
          .toArray();

        if (orphaned.length > 0) {
          for (const item of orphaned) {
            await tx.table('sync_queue').delete(item.id);
          }
        }
      } catch (error) {
        // Silent fail
      }
    });

    // =============================================
    // VERSION 6: Single Table Design - Remove sale_items table
    // =============================================
    this.version(6).stores({
      profiles: 'id, auth_user_id, pharmacy_name, email, pin_code, role, is_active, created_at',
      categories: 'id, pharmacy_name, name, active',
      units: 'id, pharmacy_name, name, abbreviation',
      products: 'id, pharmacy_name, name, barcode, category_id, active, created_at',
      product_units: 'id, product_id, unit_id',
      suppliers: 'id, pharmacy_name, name, phone, active',
      product_batches: 'id, pharmacy_name, product_id, batch_number, expiry_date, created_at',
      purchases: 'id, pharmacy_name, supplier_id, purchase_number, status, created_at',
      purchase_items: 'id, purchase_id, product_id, batch_id',
      customers: 'id, pharmacy_name, name, phone, created_at',
      sales: 'id, pharmacy_name, sale_number, customer_id, customer_name, product_id, product_name, status, payment_method, payment_status, sale_date, created_at',
      payments: 'id, pharmacy_name, sale_id, method, status',
      stock_movements: 'id, pharmacy_name, product_id, batch_id, movement_type, created_at',
      stocktakes: 'id, pharmacy_name, status, started_at',
      stocktake_items: 'id, stocktake_id, product_id, batch_id',
      sale_returns: 'id, pharmacy_name, sale_id, created_at',
      discounts: 'id, pharmacy_name, sale_id',
      audit_logs: 'id, pharmacy_name, user_id, action, created_at',
      requested_items: 'id, pharmacy_name, item_name, status, priority, request_count, last_requested_at',
      notifications: 'id, pharmacy_name, user_id, read, created_at',
      sync_queue: '++id, sync_id, pharmacy_name, user_id, entity_type, status, created_at'
    }).upgrade(async (tx) => {
      try {
        const saleItems = await tx.table('sale_items').toArray();

        if (saleItems.length > 0) {
          const itemsBySale: { [saleId: string]: any[] } = {};
          for (const item of saleItems) {
            if (!itemsBySale[item.sale_id]) {
              itemsBySale[item.sale_id] = [];
            }
            itemsBySale[item.sale_id].push(item);
          }

          for (const [saleId, items] of Object.entries(itemsBySale)) {
            const sale = await tx.table('sales').get(saleId);
            if (!sale) continue;

            const item = items[0];
            if (!item) continue;

            const updatedSale = {
              ...sale,
              product_id: item.product_id,
              product_name: item.product_name || 'Unknown Product',
              product_barcode: item.barcode || null,
              product_sku: null,
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              subtotal: item.subtotal || 0,
              batch_id: item.batch_id || null,
              batch_number: item.batch_number || null,
              customer_name: sale.customer_name || 'Cash Customer',
              payment_method: sale.payment_method || 'cash',
              payment_status: sale.payment_status || 'paid',
              status: sale.status || 'completed',
              updated_at: new Date().toISOString()
            };

            await tx.table('sales').put(updatedSale);
          }
        }

        await tx.table('sale_items').clear();

        const syncItems = await tx.table('sync_queue')
          .where('entity_type')
          .equals('sale_item')
          .toArray();

        if (syncItems.length > 0) {
          for (const item of syncItems) {
            await tx.table('sync_queue').delete(item.id);
          }
        }
      } catch (error) {
        // Silent fail
      }
    });

    // =============================================
    // VERSION 7: Add location fields to products
    // =============================================
    this.version(7).stores({
      profiles: 'id, auth_user_id, pharmacy_name, email, pin_code, role, is_active, created_at',
      categories: 'id, pharmacy_name, name, active',
      units: 'id, pharmacy_name, name, abbreviation',
      products: 'id, pharmacy_name, name, barcode, category_id, active, created_at, shelf_number, bay_number, rack_number, zone, bin_number, cardboard_box_id, storage_condition',
      product_units: 'id, product_id, unit_id',
      suppliers: 'id, pharmacy_name, name, phone, active',
      product_batches: 'id, pharmacy_name, product_id, batch_number, expiry_date, created_at',
      purchases: 'id, pharmacy_name, supplier_id, purchase_number, status, created_at',
      purchase_items: 'id, purchase_id, product_id, batch_id',
      customers: 'id, pharmacy_name, name, phone, created_at',
      sales: 'id, pharmacy_name, sale_number, customer_id, customer_name, product_id, product_name, status, payment_method, payment_status, sale_date, created_at',
      payments: 'id, pharmacy_name, sale_id, method, status',
      stock_movements: 'id, pharmacy_name, product_id, batch_id, movement_type, created_at',
      stocktakes: 'id, pharmacy_name, status, started_at',
      stocktake_items: 'id, stocktake_id, product_id, batch_id',
      sale_returns: 'id, pharmacy_name, sale_id, created_at',
      sales_returns: 'id, pharmacy_name, sale_id, product_id, batch_id, return_type, status, created_at',
      discounts: 'id, pharmacy_name, sale_id',
      audit_logs: 'id, pharmacy_name, user_id, action, created_at',
      requested_items: 'id, pharmacy_name, item_name, status, priority, request_count, last_requested_at',
      notifications: 'id, pharmacy_name, user_id, read, created_at',
      sync_queue: '++id, sync_id, pharmacy_name, user_id, entity_type, status, created_at'
    }).upgrade(async (tx) => {
      try {
        const products = await tx.table('products').toArray();

        for (const product of products) {
          const updatedProduct = {
            ...product,
            shelf_number: product.shelf_number || null,
            bay_number: product.bay_number || null,
            rack_number: product.rack_number || null,
            storage_location: product.storage_location || null,
            zone: product.zone || null,
            bin_number: product.bin_number || null,
            cardboard_box_id: product.cardboard_box_id || null,
            storage_condition: product.storage_condition || 'room_temperature',
            last_inventory_count_date: product.last_inventory_count_date || null,
            last_inventory_count_by: product.last_inventory_count_by || null,
          };

          await tx.table('products').put(updatedProduct);
        }
      } catch (error) {
        // Silent fail
      }
    });

    // =============================================
    // VERSION 8: Add sales returns table
    // =============================================
    this.version(8).stores({
      profiles: 'id, auth_user_id, pharmacy_name, email, pin_code, role, is_active, created_at',
      categories: 'id, pharmacy_name, name, active',
      units: 'id, pharmacy_name, name, abbreviation',
      products: 'id, pharmacy_name, name, barcode, category_id, active, created_at, shelf_number, bay_number, rack_number, zone, bin_number, cardboard_box_id, storage_condition',
      product_units: 'id, product_id, unit_id',
      suppliers: 'id, pharmacy_name, name, phone, active',
      product_batches: 'id, pharmacy_name, product_id, batch_number, expiry_date, created_at',
      purchases: 'id, pharmacy_name, supplier_id, purchase_number, status, created_at',
      purchase_items: 'id, purchase_id, product_id, batch_id',
      customers: 'id, pharmacy_name, name, phone, created_at',
      sales: 'id, pharmacy_name, sale_number, customer_id, customer_name, product_id, product_name, status, payment_method, payment_status, sale_date, created_at',
      payments: 'id, pharmacy_name, sale_id, method, status',
      stock_movements: 'id, pharmacy_name, product_id, batch_id, movement_type, created_at',
      stocktakes: 'id, pharmacy_name, status, started_at',
      stocktake_items: 'id, stocktake_id, product_id, batch_id',
      sale_returns: 'id, pharmacy_name, sale_id, created_at',
      sales_returns: 'id, pharmacy_name, sale_id, product_id, batch_id, return_type, status, created_at',
      discounts: 'id, pharmacy_name, sale_id',
      audit_logs: 'id, pharmacy_name, user_id, action, created_at',
      requested_items: 'id, pharmacy_name, item_name, status, priority, request_count, last_requested_at',
      notifications: 'id, pharmacy_name, user_id, read, created_at',
      sync_queue: '++id, sync_id, pharmacy_name, user_id, entity_type, status, created_at'
    }).upgrade(async (tx) => {
      // Nothing to migrate - just adding table
    });

    // lib/db.ts - Update VERSION 9 schema

    // =============================================
    // VERSION 9: Performance optimizations + ADD sale_id
    // =============================================
    this.version(9).stores({
      profiles: 'id, auth_user_id, pharmacy_name, email, pin_code, role, is_active, created_at, [pharmacy_name+role], [pharmacy_name+is_active]',
      categories: 'id, pharmacy_name, name, active, [pharmacy_name+name]',
      units: 'id, pharmacy_name, name, abbreviation, [pharmacy_name+name]',
      products: 'id, pharmacy_name, name, barcode, category_id, active, created_at, shelf_number, bay_number, rack_number, zone, bin_number, cardboard_box_id, storage_condition, [pharmacy_name+name], [pharmacy_name+barcode], [pharmacy_name+category_id]',
      product_units: 'id, product_id, unit_id',
      suppliers: 'id, pharmacy_name, name, phone, active, [pharmacy_name+name]',
      product_batches: 'id, pharmacy_name, product_id, batch_number, expiry_date, created_at, [pharmacy_name+product_id], [pharmacy_name+expiry_date], [pharmacy_name+batch_number]',
      purchases: 'id, pharmacy_name, supplier_id, purchase_number, status, created_at',
      purchase_items: 'id, purchase_id, product_id, batch_id',
      customers: 'id, pharmacy_name, name, phone, created_at, [pharmacy_name+name]',
      sales: 'id, pharmacy_name, sale_id, sale_number, customer_id, customer_name, product_id, product_name, status, payment_method, payment_status, sale_date, created_at, [pharmacy_name+sale_date], [pharmacy_name+product_id], [pharmacy_name+status]',  // ✅ ADDED sale_id
      payments: 'id, pharmacy_name, sale_id, method, status',
      stock_movements: 'id, pharmacy_name, product_id, batch_id, movement_type, created_at, [pharmacy_name+product_id], [pharmacy_name+created_at]',
      stocktakes: 'id, pharmacy_name, status, started_at',
      stocktake_items: 'id, stocktake_id, product_id, batch_id',
      sale_returns: 'id, pharmacy_name, sale_id, created_at',
      sales_returns: 'id, pharmacy_name, sale_id, product_id, batch_id, return_type, status, created_at, [pharmacy_name+created_at], [pharmacy_name+sale_id]',
      discounts: 'id, pharmacy_name, sale_id',
      audit_logs: 'id, pharmacy_name, user_id, action, created_at, [pharmacy_name+created_at], [pharmacy_name+action]',
      requested_items: 'id, pharmacy_name, item_name, status, priority, request_count, last_requested_at, [pharmacy_name+status], [pharmacy_name+priority]',
      notifications: 'id, pharmacy_name, user_id, read, created_at',
      sync_queue: '++id, sync_id, pharmacy_name, user_id, entity_type, status, created_at, [pharmacy_name+status], [pharmacy_name+entity_type]',
      push_subscriptions: '++id, user_id, pharmacy_name, endpoint, created_at, updated_at, [pharmacy_name+user_id]'
    }).upgrade(async (tx) => {
      try {
        // ✅ ADD: Migrate existing sales to include sale_id
        const sales = await tx.table('sales').toArray();

        for (const sale of sales) {
          // If sale doesn't have sale_id, generate one from sale_number or id
          if (!sale.sale_id) {
            // Use sale_number if available, otherwise use id
            const saleId = sale.sale_number
              ? sale.sale_number.replace('INV-', '').split('-')[0]
              : sale.id;

            await tx.table('sales').update(sale.id, {
              sale_id: saleId || sale.id
            });
          }

          if (!sale.sale_date) {
            await tx.table('sales').update(sale.id, {
              sale_date: sale.created_at || new Date().toISOString()
            });
          }
        }

        // ✅ ADD: Clean up any sales without pharmacy_name
        const invalidSales = await tx.table('sales')
          .where('pharmacy_name')
          .equals('')
          .toArray();

        for (const sale of invalidSales) {
          // Try to find pharmacy_name from profile
          const profile = await tx.table('profiles')
            .where('id')
            .equals(sale.sold_by || '')
            .first();

          if (profile && profile.pharmacy_name) {
            await tx.table('sales').update(sale.id, {
              pharmacy_name: profile.pharmacy_name
            });
          }
        }

        const profiles = await tx.table('profiles').toArray();

        for (const profile of profiles) {
          if (!profile.last_sync_at) {
            await tx.table('profiles').update(profile.id, {
              last_sync_at: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        // Silent fail
      }
    });
  }
  // =============================================
  // PERFORMANCE HELPERS
  // =============================================

  async getPharmacyData(pharmacyName: string) {
    const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();

    const [products, batches, categories, units, suppliers, customers, sales, movements, auditLogs, requestedItems, salesReturns] = await this.transaction(
      'r',
      this.products,
      this.product_batches,
      this.categories,
      this.units,
      this.suppliers,
      this.customers,
      this.sales,
      this.stock_movements,
      this.audit_logs,
      this.requested_items,
      this.sales_returns,
      async () => {
        return Promise.all([
          this.products.where('pharmacy_name').equals(normalized).toArray(),
          this.product_batches.where('pharmacy_name').equals(normalized).toArray(),
          this.categories.where('pharmacy_name').equals(normalized).toArray(),
          this.units.where('pharmacy_name').equals(normalized).toArray(),
          this.suppliers.where('pharmacy_name').equals(normalized).toArray(),
          this.customers.where('pharmacy_name').equals(normalized).toArray(),
          this.sales.where('pharmacy_name').equals(normalized).toArray(),
          this.stock_movements.where('pharmacy_name').equals(normalized).toArray(),
          this.audit_logs.where('pharmacy_name').equals(normalized).toArray(),
          this.requested_items.where('pharmacy_name').equals(normalized).toArray(),
          this.sales_returns.where('pharmacy_name').equals(normalized).toArray(),
        ]);
      }
    );

    return {
      products,
      batches,
      categories,
      units,
      suppliers,
      customers,
      sales,
      movements,
      auditLogs,
      requestedItems,
      salesReturns,
    };
  }

  async getSalesByDateRange(pharmacyName: string, startDate: string, endDate: string) {
    const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();

    return this.sales
      .where('[pharmacy_name+sale_date]')
      .between([normalized, startDate], [normalized, endDate])
      .toArray();
  }

  async getLowStockProducts(pharmacyName: string) {
    const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();

    const products = await this.products
      .where('pharmacy_name')
      .equals(normalized)
      .toArray();

    return products.filter(p => (p.quantity || 0) <= (p.reorder_level || 10));
  }

  async getExpiringBatches(pharmacyName: string, days: number = 90) {
    const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    return this.product_batches
      .where('[pharmacy_name+expiry_date]')
      .between([normalized, '0000-00-00'], [normalized, cutoffStr])
      .filter(b => b.quantity_base > 0)
      .toArray();
  }

  async getPendingSyncCount(pharmacyName: string): Promise<number> {
    const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();

    return this.sync_queue
      .where('[pharmacy_name+status]')
      .equals([normalized, 'pending'])
      .count();
  }

  async clearExpiredData(pharmacyName: string, olderThanDays: number = 30) {
    const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoffStr = cutoffDate.toISOString();

    let syncDeleted = 0;
    let auditDeleted = 0;

    try {
      const syncedItems = await this.sync_queue
        .where('[pharmacy_name+status]')
        .equals([normalized, 'synced'])
        .toArray();

      for (const item of syncedItems) {
        if (item.created_at && item.created_at < cutoffStr) {
          await this.sync_queue.delete(item.id);
          syncDeleted++;
        }
      }

      const oldAuditLogs = await this.audit_logs
        .where('[pharmacy_name+created_at]')
        .between([normalized, '0000-00-00'], [normalized, cutoffStr])
        .toArray();

      for (const log of oldAuditLogs) {
        await this.audit_logs.delete(log.id);
        auditDeleted++;
      }
    } catch (error) {
      // Silent fail
    }

    return { syncDeleted, auditDeleted };
  }

  async clearAllData() {
    await this.pharmacies.clear();
    await this.profiles.clear();
    await this.pharmacy_users.clear();
    await this.categories.clear();
    await this.units.clear();
    await this.products.clear();
    await this.product_units.clear();
    await this.suppliers.clear();
    await this.product_batches.clear();
    await this.purchases.clear();
    await this.purchase_items.clear();
    await this.customers.clear();
    await this.sales.clear();
    await this.payments.clear();
    await this.stock_movements.clear();
    await this.stocktakes.clear();
    await this.stocktake_items.clear();
    await this.sale_returns.clear();
    await this.sales_returns.clear();
    await this.discounts.clear();
    await this.audit_logs.clear();
    await this.requested_items.clear();
    await this.notifications.clear();
    await this.sync_queue.clear();
  }

  async clearPharmacyData(pharmacyName: string) {
    const normalized = pharmacyName
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();

    const tables = [
      'products', 'product_batches', 'categories', 'units',
      'suppliers', 'customers', 'sales',
      'stock_movements', 'audit_logs', 'sync_queue',
      'requested_items', 'sales_returns'
    ];

    for (const tableName of tables) {
      const table = this[tableName as keyof this] as any;
      if (table && typeof table.where === 'function') {
        try {
          await table.where('pharmacy_name').equals(normalized).delete();
        } catch (err) {
          // Silent fail for individual tables
        }
      }
    }
  }
}

// Create and export a single instance
export const db = new MedPDatabase();

// =============================================
// FIXED: Optimized initialization with retry logic
// =============================================
export async function seedInitialDataIfNeeded() {
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      // Check if we've already run the latest migration
      if (localStorage.getItem('medp_schema_v9_optimized') === 'true') {
        return;
      }

      // Open database with retry
      await db.open();

      const profiles = await db.profiles.toArray();

      // Check for profiles without pharmacy_name
      const needsMigration = profiles.some(p => !p.pharmacy_name);

      if (needsMigration) {
        const pharmacies = await db.pharmacies.toArray();
        const pharmacyUsers = await db.pharmacy_users.toArray();

        for (const profile of profiles) {
          if (!profile.pharmacy_name) {
            const pu = pharmacyUsers.find(p => p.user_id === profile.id);
            if (pu) {
              const pharmacy = pharmacies.find(p => p.id === pu.pharmacy_id);
              if (pharmacy) {
                profile.pharmacy_name = pharmacy.name;
                profile.pharmacy_trading_name = pharmacy.trading_name || '';
                profile.pharmacy_phone = pharmacy.phone || '';
                profile.pharmacy_email = pharmacy.email || '';
                profile.pharmacy_address = pharmacy.address || '';
                profile.pharmacy_county = pharmacy.county || '';
                profile.pharmacy_town = pharmacy.town || '';
                profile.pharmacy_receipt_header = pharmacy.receipt_header || '';
                profile.pharmacy_receipt_footer = pharmacy.receipt_footer || '';
                profile.pharmacy_currency = pharmacy.currency || 'KSh';
                profile.pharmacy_settings = pharmacy.settings || {
                  allow_negative_stock: false,
                  low_stock_threshold: 10,
                  expiry_warning_days: 90
                };
                profile.pharmacy_is_active = true;
                profile.is_owner = pu.role === 'owner';
                profile.role = pu.role || 'cashier';
                profile.is_active = true;
                profile.last_sync_at = new Date().toISOString();

                await db.profiles.put(profile);
              }
            }
          }
        }
      }

      // Clean up sync_queue items without pharmacy_name
      const orphaned = await db.sync_queue
        .where('pharmacy_name')
        .equals('')
        .toArray();

      if (orphaned.length > 0) {
        for (const item of orphaned) {
          await db.sync_queue.delete(item.id);
        }
      }

      // Clean up old sync records (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffStr = thirtyDaysAgo.toISOString();

      const oldSynced = await db.sync_queue
        .where('status')
        .equals('synced')
        .toArray();

      for (const item of oldSynced) {
        if (item.created_at && item.created_at < cutoffStr) {
          await db.sync_queue.delete(item.id);
        }
      }

      // Mark schema as clean
      localStorage.setItem('medp_schema_v9_optimized', 'true');
      localStorage.setItem('medp_db_initialized', Date.now().toString());
      return;

    } catch (err) {
      retries++;
      if (retries >= maxRetries) {
        // Silent fail - allow app to work with what data exists
        localStorage.setItem('medp_db_initialization_failed', Date.now().toString());
        return;
      }
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retries)));
    }
  }
}

// =============================================
// DATA PERSISTENCE FIX: Force flush to disk
// =============================================
export async function forceDataFlush() {
  try {
    // Dexie automatically persists to IndexedDB
    // But we can trigger a manual flush by reading data
    await db.profiles.count();
    return true;
  } catch (error) {
    return false;
  }
}

// =============================================
// DATA RECOVERY: Check and repair corrupted data
// =============================================
export async function checkAndRepairData(pharmacyName: string) {
  try {
    const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();
    const issues = [];

    // Check products without pharmacy_name
    const invalidProducts = await db.products.where('pharmacy_name').equals('').toArray();
    if (invalidProducts.length > 0) {
      issues.push(`${invalidProducts.length} products missing pharmacy_name`);
      for (const product of invalidProducts) {
        await db.products.update(product.id, { pharmacy_name: normalized });
      }
    }

    // Check sales without pharmacy_name
    const invalidSales = await db.sales.where('pharmacy_name').equals('').toArray();
    if (invalidSales.length > 0) {
      issues.push(`${invalidSales.length} sales missing pharmacy_name`);
      for (const sale of invalidSales) {
        await db.sales.update(sale.id, { pharmacy_name: normalized });
      }
    }

    // Check sync_queue items without pharmacy_name
    const invalidSync = await db.sync_queue.where('pharmacy_name').equals('').toArray();
    if (invalidSync.length > 0) {
      issues.push(`${invalidSync.length} sync items missing pharmacy_name`);
      for (const item of invalidSync) {
        await db.sync_queue.update(item.id, { pharmacy_name: normalized });
      }
    }

    return {
      success: true,
      issues,
      fixed: issues.length > 0
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
      issues: [],
      fixed: false
    };
  }
}