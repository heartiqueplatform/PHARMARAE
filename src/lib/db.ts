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
  SalesReturn, // NEW - Add this import
} from '../types';

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
  sales!: Table<Sale, string>;  //  Now contains ALL product details (single table design)
  payments!: Table<Payment, string>;
  stock_movements!: Table<StockMovement, string>;
  stocktakes!: Table<Stocktake, string>;
  stocktake_items!: Table<StocktakeItem, string>;
  sale_returns!: Table<SaleReturn, string>;
  sales_returns!: Table<SalesReturn, string>; // NEW - Sales Returns table
  discounts!: Table<Discount, string>;
  audit_logs!: Table<AuditLog, string>;
  requested_items!: Table<RequestedItem, string>; // Most requested items
  notifications!: Table<Notification, string>;
  sync_queue!: Table<OfflineSyncItem, number>;

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
      sync_queue: '++id, sync_id, pharmacy_id, user_id, entity_type, status, created_at'  // ⚠️ STILL pharmacy_id
    }).upgrade(async (tx) => {
      console.log('🔄 Upgrading database to version 2...');

      try {
        const profiles = await tx.table('profiles').toArray();
        const pharmacyUsers = await tx.table('pharmacy_users').toArray();
        const pharmacies = await tx.table('pharmacies').toArray();

        console.log(`📊 Found ${profiles.length} profiles, ${pharmacyUsers.length} pharmacy_users, ${pharmacies.length} pharmacies`);

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
              console.log(` Migrated profile: ${profile.full_name} (${profile.pharmacy_name})`);
            }
          }
        }

        console.log(' Database upgrade to version 2 complete!');
      } catch (error) {
        console.error('❌ Error during database upgrade:', error);
        throw error;
      }
    });

    // =============================================
    // VERSION 3: Remove pharmacies and pharmacy_users tables
    // ⚠️ FIXED: sync_queue now uses pharmacy_name
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
      sync_queue: '++id, sync_id, pharmacy_name, user_id, entity_type, status, created_at' //  FIXED: pharmacy_name
    }).upgrade(async (tx) => {
      console.log('🔄 Migrating to version 3 - fixing sync_queue...');

      try {
        // Migrate existing sync_queue items from pharmacy_id to pharmacy_name
        const syncItems = await tx.table('sync_queue').toArray();
        let fixed = 0;

        for (const item of syncItems) {
          if (item.pharmacy_id && !item.pharmacy_name) {
            // Get the pharmacy name from the pharmacy_id
            const pharmacy = await tx.table('pharmacies').get(item.pharmacy_id);
            if (pharmacy) {
              await tx.table('sync_queue').update(item.id, {
                pharmacy_name: pharmacy.name,
                pharmacy_id: undefined // Remove the old field
              });
              fixed++;
            }
          }
        }

        console.log(` Migrated ${fixed} sync_queue items from pharmacy_id to pharmacy_name`);

        // Also migrate profiles
        const profiles = await tx.table('profiles').toArray();
        for (const profile of profiles) {
          if (!profile.pharmacy_name) {
            console.warn(`⚠️ Profile ${profile.id} has no pharmacy_name, skipping`);
            continue;
          }

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

        console.log(' Migration to version 3 complete!');
      } catch (error) {
        console.error('❌ Error during database upgrade:', error);
        throw error;
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
      sync_queue: '++id, sync_id, pharmacy_name, user_id, entity_type, status, created_at' //  FIXED
    }).upgrade(async (tx) => {
      console.log('🔄 Migrating to version 4 - Normalizing pharmacy names to UPPERCASE...');

      // Get all tables with pharmacy_name
      const tables = [
        'profiles', 'categories', 'units', 'products', 'suppliers',
        'product_batches', 'purchases', 'purchase_items', 'customers',
        'sales', 'sale_items', 'payments', 'stock_movements',
        'stocktakes', 'stocktake_items', 'sale_returns', 'discounts',
        'audit_logs', 'notifications', 'sync_queue'
      ];

      let totalFixed = 0;

      for (const tableName of tables) {
        try {
          const items = await tx.table(tableName).toArray();
          let fixed = 0;

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
                fixed++;
              }
            }
          }

          if (fixed > 0) {
            console.log(`   ${tableName}: ${fixed} records normalized to UPPERCASE`);
            totalFixed += fixed;
          }
        } catch (err) {
          console.log(`  ⚠️ ${tableName}: Skipped (${err})`);
        }
      }

      console.log(` Version 4 migration complete! ${totalFixed} total records normalized to UPPERCASE.`);
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
      console.log('🔄 Migrating to version 5 - Final cleanup...');

      try {
        // Ensure all sync_queue items have pharmacy_name
        const syncItems = await tx.table('sync_queue').toArray();
        let fixed = 0;

        for (const item of syncItems) {
          if (!item.pharmacy_name) {
            // Try to find pharmacy_name from the payload
            const payload = item.payload || {};
            let pharmacyName = payload.pharmacy_name || payload.pharmacy_id || 'UNKNOWN';

            // If it's an ID, try to look up the name
            if (pharmacyName && pharmacyName.includes('-') && pharmacyName.length === 36) {
              const pharmacy = await tx.table('pharmacies').get(pharmacyName);
              if (pharmacy) {
                pharmacyName = pharmacy.name;
              }
            }

            // Normalize and update
            const normalized = pharmacyName
              .trim()
              .replace(/\s+/g, ' ')
              .toUpperCase();

            await tx.table('sync_queue').update(item.id, {
              pharmacy_name: normalized
            });
            fixed++;
          }
        }

        console.log(` Fixed ${fixed} sync_queue items with missing pharmacy_name`);

        // Check for any orphaned items
        const orphaned = await tx.table('sync_queue')
          .where('pharmacy_name')
          .equals('')
          .toArray();

        if (orphaned.length > 0) {
          console.warn(`⚠️ Found ${orphaned.length} orphaned sync_queue items with empty pharmacy_name`);
          for (const item of orphaned) {
            await tx.table('sync_queue').delete(item.id);
          }
          console.log(` Deleted ${orphaned.length} orphaned items`);
        }

        console.log(' Version 5 migration complete!');
      } catch (error) {
        console.error('❌ Error during version 5 migration:', error);
        throw error;
      }
    });

    // =============================================
    // VERSION 6: 🚀 SINGLE TABLE DESIGN - Remove sale_items table
    // All product details now stored directly in sales table
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
      //  UPDATED sales table with all product details
      sales: 'id, pharmacy_name, sale_number, customer_id, customer_name, product_id, product_name, status, payment_method, payment_status, sale_date, created_at',
      // ❌ REMOVED sale_items table - no longer needed
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
      console.log('🔄 Migrating to version 6 - Single Table Design...');
      console.log('⚠️ WARNING: This migration removes the sale_items table!');
      console.log('⚠️ All product details will be stored directly in the sales table.');

      try {
        // 1. Check if sale_items table exists and has data
        const saleItems = await tx.table('sale_items').toArray();
        console.log(`📊 Found ${saleItems.length} sale_items records to migrate`);

        if (saleItems.length > 0) {
          console.log('🔄 Migrating sale_items data into sales table...');

          // Group sale_items by sale_id
          const itemsBySale: { [saleId: string]: any[] } = {};
          for (const item of saleItems) {
            if (!itemsBySale[item.sale_id]) {
              itemsBySale[item.sale_id] = [];
            }
            itemsBySale[item.sale_id].push(item);
          }

          console.log(`📊 Found ${Object.keys(itemsBySale).length} sales with items`);

          // For each sale, update the sale record with product details
          for (const [saleId, items] of Object.entries(itemsBySale)) {
            // Get the sale record
            const sale = await tx.table('sales').get(saleId);
            if (!sale) {
              console.warn(`⚠️ Sale ${saleId} not found, skipping`);
              continue;
            }

            // Since we sell ONE item at a time, take the first item
            const item = items[0];
            if (!item) continue;

            //  Update sale with product details
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
              // Preserve existing fields
              customer_name: sale.customer_name || 'Cash Customer',
              payment_method: sale.payment_method || 'cash',
              payment_status: sale.payment_status || 'paid',
              status: sale.status || 'completed',
              // Update timestamp
              updated_at: new Date().toISOString()
            };

            await tx.table('sales').put(updatedSale);
            console.log(` Migrated sale ${sale.sale_number} with product: ${item.product_name}`);
          }
        }

        // 2. Drop the sale_items table
        console.log('🗑️ Dropping sale_items table...');
        // Dexie doesn't have a direct drop table, but we can clear it
        await tx.table('sale_items').clear();
        console.log(' sale_items table cleared');

        // 3. Clean up any sale_items references in sync_queue
        const syncItems = await tx.table('sync_queue')
          .where('entity_type')
          .equals('sale_item')
          .toArray();

        if (syncItems.length > 0) {
          console.log(`🧹 Cleaning up ${syncItems.length} sale_item sync_queue entries`);
          for (const item of syncItems) {
            await tx.table('sync_queue').delete(item.id);
          }
          console.log(' Cleaned up sale_item sync_queue entries');
        }

        console.log(' Version 6 migration complete!');
        console.log('📊 Sales table now contains ALL product details (single table design)');
        console.log('💡 To query sales with product details, simply query the sales table directly.');

      } catch (error) {
        console.error('❌ Error during version 6 migration:', error);
        throw error;
      }
    });

    // =============================================
    // VERSION 7: ADD LOCATION FIELDS TO PRODUCTS TABLE
    // =============================================
    this.version(7).stores({
      profiles: 'id, auth_user_id, pharmacy_name, email, pin_code, role, is_active, created_at',
      categories: 'id, pharmacy_name, name, active',
      units: 'id, pharmacy_name, name, abbreviation',
      //  UPDATED products table with location fields
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
      sales_returns: 'id, pharmacy_name, sale_id, product_id, batch_id, return_type, status, created_at', // NEW - Sales Returns
      discounts: 'id, pharmacy_name, sale_id',
      audit_logs: 'id, pharmacy_name, user_id, action, created_at',
      requested_items: 'id, pharmacy_name, item_name, status, priority, request_count, last_requested_at',
      notifications: 'id, pharmacy_name, user_id, read, created_at',
      sync_queue: '++id, sync_id, pharmacy_name, user_id, entity_type, status, created_at'
    }).upgrade(async (tx) => {
      console.log('🔄 Migrating to version 7 - Adding location fields to products...');

      try {
        // Get all products
        const products = await tx.table('products').toArray();
        console.log(`📊 Found ${products.length} products to migrate with location fields`);

        let migrated = 0;

        for (const product of products) {
          // Add location fields with default null values if they don't exist
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
          migrated++;
        }

        console.log(` Migrated ${migrated} products with location fields`);

        // Also update any sync_queue items for products to include location fields
        const syncItems = await tx.table('sync_queue')
          .where('entity_type')
          .equals('product')
          .toArray();

        let syncMigrated = 0;
        for (const item of syncItems) {
          if (item.payload) {
            const payload = item.payload;
            // Add location fields to the payload if they're missing
            const updatedPayload = {
              ...payload,
              shelf_number: payload.shelf_number || null,
              bay_number: payload.bay_number || null,
              rack_number: payload.rack_number || null,
              storage_location: payload.storage_location || null,
              zone: payload.zone || null,
              bin_number: payload.bin_number || null,
              cardboard_box_id: payload.cardboard_box_id || null,
              storage_condition: payload.storage_condition || 'room_temperature',
            };

            await tx.table('sync_queue').update(item.id, {
              payload: updatedPayload
            });
            syncMigrated++;
          }
        }

        if (syncMigrated > 0) {
          console.log(` Updated ${syncMigrated} sync_queue product items with location fields`);
        }

        console.log(' Version 7 migration complete! Products now have location fields.');
        console.log('📦 Location fields: shelf_number, bay_number, rack_number, zone, bin_number, cardboard_box_id, storage_condition');

      } catch (error) {
        console.error('❌ Error during version 7 migration:', error);
        throw error;
      }
    });

    // =============================================
    // VERSION 8: ADD SALES RETURNS TABLE
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
      sales_returns: 'id, pharmacy_name, sale_id, product_id, batch_id, return_type, status, created_at', // NEW
      discounts: 'id, pharmacy_name, sale_id',
      audit_logs: 'id, pharmacy_name, user_id, action, created_at',
      requested_items: 'id, pharmacy_name, item_name, status, priority, request_count, last_requested_at',
      notifications: 'id, pharmacy_name, user_id, read, created_at',
      sync_queue: '++id, sync_id, pharmacy_name, user_id, entity_type, status, created_at'
    }).upgrade(async (tx) => {
      console.log('🔄 Migrating to version 8 - Adding Sales Returns table...');

      try {
        // Check if sales_returns table already has data
        const existingReturns = await tx.table('sales_returns').toArray();
        if (existingReturns.length > 0) {
          console.log(`📊 Found ${existingReturns.length} existing sales returns`);
        }

        console.log('✅ Version 8 migration complete! Sales Returns table added.');
      } catch (error) {
        console.error('❌ Error during version 8 migration:', error);
        throw error;
      }
    });
  }

  // Helper method to clear all data
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
    await this.sales_returns.clear(); // NEW
    await this.discounts.clear();
    await this.audit_logs.clear();
    await this.requested_items.clear();
    await this.notifications.clear();
    await this.sync_queue.clear();
  }

  // Helper to clear only pharmacy data
  async clearPharmacyData(pharmacyName: string) {
    const normalized = pharmacyName
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();

    console.log(`🧹 Clearing data for pharmacy: ${normalized}`);

    const tables = [
      'products', 'product_batches', 'categories', 'units',
      'suppliers', 'customers', 'sales',
      'stock_movements', 'audit_logs', 'sync_queue',
      'requested_items', 'sales_returns' // NEW
    ];

    for (const tableName of tables) {
      const table = this[tableName as keyof this] as any;
      if (table && typeof table.where === 'function') {
        try {
          const items = await table.where('pharmacy_name').equals(normalized).toArray();
          for (const item of items) {
            await table.delete(item.id);
          }
          if (items.length > 0) {
            console.log(`   Cleared ${items.length} records from ${tableName}`);
          }
        } catch (err) {
          console.log(`  ⚠️ Could not clear ${tableName}: ${err}`);
        }
      }
    }
  }
}

// Create and export a single instance
export const db = new MedPDatabase();

// Utility for initializing database schema
export async function seedInitialDataIfNeeded() {
  try {
    if (localStorage.getItem('medp_schema_v8_sales_returns') !== 'true') {
      console.log('🧹 Running schema cleanup v8 (Sales Returns)...');

      const profiles = await db.profiles.toArray();

      const needsMigration = profiles.some(p => !p.pharmacy_name);

      if (needsMigration) {
        console.log('📦 Some profiles need migration to new schema');

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

                await db.profiles.put(profile);
                console.log(` Migrated profile: ${profile.full_name}`);
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
        console.log(`🧹 Cleaning up ${orphaned.length} orphaned sync_queue items...`);
        for (const item of orphaned) {
          await db.sync_queue.delete(item.id);
        }
      }

      // Mark schema as clean
      localStorage.setItem('medp_schema_v8_sales_returns', 'true');
      console.log(' Database cleanup complete!');
      console.log(' Using SINGLE TABLE design for sales (all product details in sales table)');
      console.log(' Products table includes location fields');
      console.log(' Sales Returns table added for tracking returns and restoring stock');
    }
  } catch (err) {
    console.warn('Error during schema initialization:', err);
  }
}