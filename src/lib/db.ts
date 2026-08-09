import Dexie, { Table } from 'dexie';
import {
  Pharmacy,
  Profile,
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
  SaleItem,
  StockMovement,
  Stocktake,
  StocktakeItem,
  SaleReturn,
  AuditLog,
  OfflineSyncItem,
  Payment,
  Discount,
  Notification
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
  sales!: Table<Sale, string>;
  sale_items!: Table<SaleItem, string>;
  payments!: Table<Payment, string>;
  stock_movements!: Table<StockMovement, string>;
  stocktakes!: Table<Stocktake, string>;
  stocktake_items!: Table<StocktakeItem, string>;
  sale_returns!: Table<SaleReturn, string>;
  discounts!: Table<Discount, string>;
  audit_logs!: Table<AuditLog, string>;
  notifications!: Table<Notification, string>;
  sync_queue!: Table<OfflineSyncItem, number>;

  constructor() {
    super('MedPPharmacyDB');

    // Version 1: Original schema
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
      sale_items: 'id, sale_id, product_id, batch_id',
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

    // Version 2: Add indexes for single table architecture
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
      sale_items: 'id, sale_id, product_id, batch_id',
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
              console.log(`✅ Migrated profile: ${profile.full_name} (${profile.pharmacy_name})`);
            }
          }
        }

        console.log('✅ Database upgrade to version 2 complete!');
      } catch (error) {
        console.error('❌ Error during database upgrade:', error);
        throw error;
      }
    });

    // Version 3: Remove pharmacies and pharmacy_users tables (clean up)
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
      sale_items: 'id, sale_id, product_id, batch_id',
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
      console.log('🔄 Migrating to version 3 - removing old tables...');

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

      console.log('✅ Migration to version 3 complete!');
    });

    // ✅ VERSION 4: Normalize all pharmacy_names to UPPERCASE
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
      sale_items: 'id, sale_id, product_id, batch_id',
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
      console.log('🔄 Migrating to version 4 - Normalizing pharmacy names to UPPERCASE...');

      // Get all tables with pharmacy_name
      const tables = [
        'profiles', 'categories', 'units', 'products', 'suppliers',
        'product_batches', 'purchases', 'purchase_items', 'customers',
        'sales', 'sale_items', 'payments', 'stock_movements',
        'stocktakes', 'stocktake_items', 'sale_returns', 'discounts',
        'audit_logs', 'notifications'
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
            console.log(`  ✅ ${tableName}: ${fixed} records normalized to UPPERCASE`);
            totalFixed += fixed;
          }
        } catch (err) {
          console.log(`  ⚠️ ${tableName}: Skipped (${err})`);
        }
      }

      console.log(`✅ Version 4 migration complete! ${totalFixed} total records normalized to UPPERCASE.`);
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
    await this.sale_items.clear();
    await this.payments.clear();
    await this.stock_movements.clear();
    await this.stocktakes.clear();
    await this.stocktake_items.clear();
    await this.sale_returns.clear();
    await this.discounts.clear();
    await this.audit_logs.clear();
    await this.notifications.clear();
    await this.sync_queue.clear();
  }
}

// Create and export a single instance
export const db = new MedPDatabase();

// Utility for initializing database schema
export async function seedInitialDataIfNeeded() {
  try {
    if (localStorage.getItem('medp_schema_v4_clean') !== 'true') {
      console.log('🧹 Running schema cleanup...');

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
                console.log(`✅ Migrated profile: ${profile.full_name}`);
              }
            }
          }
        }
      }

      localStorage.setItem('medp_schema_v4_clean', 'true');
      console.log('✅ Database cleanup complete!');
    }
  } catch (err) {
    console.warn('Error during schema initialization:', err);
  }
}