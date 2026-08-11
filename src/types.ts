/**
 * MED P Pharmacy Management System - Global TypeScript Definitions
 * Architecture: Single Profile Table (One Pharmacy, Multiple Users)
 */

export type UserRole = 'owner' | 'admin' | 'pharmacist' | 'cashier' | 'storekeeper';

export type DosageFormType =
  | 'tablet'
  | 'capsule'
  | 'liquid'
  | 'injection'
  | 'cream'
  | 'ointment'
  | 'syrup'
  | 'suspension'
  | 'powder'
  | 'inhaler'
  | 'drops'
  | 'sachet'
  | 'bandage'
  | 'equipment'
  | 'other';

export type ScheduleType = 'none' | 'schedule_I' | 'schedule_II' | 'schedule_III' | 'schedule_IV' | 'schedule_V';

export type MovementType =
  | 'opening_balance'
  | 'purchase'
  | 'sale'
  | 'sale_return'
  | 'purchase_return'
  | 'damage'
  | 'expiry'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'stock_transfer'
  | 'stocktake_adjustment';

export type PaymentMethod = 'cash' | 'mpesa' | 'card' | 'credit' | 'insurance' | 'other';

export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'refunded';

// =============================================
// PHARMACY SETTINGS
// =============================================
export interface PharmacySettings {
  allow_negative_stock: boolean;
  low_stock_threshold: number;
  expiry_warning_days: number;
}

// =============================================
// PROFILE (Single Table - Contains Everything)
// =============================================
export interface Profile {
  id: string;
  auth_user_id?: string | null; // Link to Supabase Auth user

  // Pharmacy Info
  pharmacy_name: string;
  pharmacy_trading_name?: string;
  pharmacy_phone?: string;
  pharmacy_email?: string;
  pharmacy_address?: string;
  pharmacy_county?: string;
  pharmacy_town?: string;
  pharmacy_logo_url?: string | null; // Pharmacy logo (for settings)
  pharmacy_receipt_header: string;
  pharmacy_receipt_footer: string;
  pharmacy_currency: string;
  pharmacy_settings: PharmacySettings;
  pharmacy_is_active: boolean;

  // User Info
  full_name: string;
  email: string;
  phone?: string;
  pin_code?: string; // For fast terminal login
  role: UserRole;
  is_owner: boolean;
  is_active: boolean;

  // Metadata
  avatar_url?: string | null; // User avatar (for header/profile)
  avatar_public_id?: string | null; // Cloudinary public ID for deletion
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// =============================================
// INVENTORY - CATEGORIES & UNITS
// =============================================
export interface Category {
  id: string;
  pharmacy_name: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
}

export interface Unit {
  id: string;
  pharmacy_name: string;
  name: string;
  abbreviation: string;
  is_base_unit: boolean;
}

// =============================================
// PRODUCTS
// =============================================
export interface ProductUnit {
  id: string;
  product_id: string;
  unit_id: string;
  unit_name?: string;
  unit_abbr?: string;
  conversion_to_base: number;
  selling_price: number;
  purchase_price?: number;
  barcode?: string;
  created_at?: string;
}

// Update the Product interface
export interface Product {
  id: string;
  pharmacy_name: string;
  category_id?: string;
  category_name?: string;
  name: string;
  generic_name?: string;
  brand?: string;
  form: DosageFormType;
  strength?: string;
  manufacturer?: string;
  sku?: string;
  barcode?: string;
  base_unit_id?: string;
  base_unit_name?: string;
  selling_price: number;
  default_cost_price: number;
  reorder_level: number;
  prescription_required: boolean;
  schedule_type?: ScheduleType;
  active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;

  //  NEW INVENTORY LOCATION FIELDS
  shelf_number?: string;              // Shelf number (e.g., "Shelf-3")
  bay_number?: string;                // Bay or aisle (e.g., "Aisle-B", "Bay-2")
  rack_number?: string;               // Rack within bay (e.g., "Rack-1")
  storage_location?: string;          // Full location (e.g., "Bay-B, Rack-1, Shelf-3")
  zone?: string;                      // Storage zone (e.g., "Zone-A", "Cold-Room")
  bin_number?: string;                // Bin number (e.g., "BIN-007")
  cardboard_box_id?: string;          // Cardboard box identifier
  storage_condition?: StorageCondition; // Storage requirement
  last_inventory_count_date?: string; // Last physical count date
  last_inventory_count_by?: string;   // User who counted

  // Calculated dynamically
  total_stock_base?: number;
  packaging_units?: ProductUnit[];
  smart_tag?: 'LOW_STOCK' | 'FAST_MOVING' | 'SLOW_MOVING' | 'OUT_OF_STOCK' | 'EXPIRING_SOON' | 'EXPIRED' | 'NORMAL';
}

// Add new type for storage conditions
export type StorageCondition =
  | 'room_temperature'
  | 'refrigerated'
  | 'frozen'
  | 'cold_chain'
  | 'controlled'
  | 'ambient';

export interface ProductBatch {
  id: string;
  pharmacy_name: string;
  product_id: string;
  supplier_id?: string;
  batch_number: string;
  expiry_date: string;
  quantity_base: number;
  cost_price: number;
  selling_price: number;
  received_at: string;
  created_at: string;
  updated_at: string;
  // Expanded
  product_name?: string;
  supplier_name?: string;
}

// =============================================
// SUPPLIERS & PURCHASES
// =============================================
export interface Supplier {
  id: string;
  pharmacy_name: string;
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: string;
  pharmacy_name: string;
  supplier_id: string;
  supplier_name?: string;
  purchase_number: string;
  status: 'pending' | 'completed' | 'cancelled';
  subtotal: number;
  discount: number;
  total: number;
  received_by?: string;
  received_by_name?: string;
  purchased_at: string;
  created_at: string;
  updated_at: string;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  batch_id?: string;
  product_name?: string;
  batch_number?: string;
  expiry_date?: string;
  quantity: number;
  unit_id?: string;
  unit_name?: string;
  unit_cost: number;
  subtotal: number;
  created_at: string;
}

// =============================================
// CUSTOMERS & SALES (UPDATED - Single Table Design)
// =============================================
export interface Customer {
  id: string;
  pharmacy_name: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  credit_allowed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * SALE - Single Table Design
 * Since we sell ONE item at a time, all product details are stored directly
 * in the sales table. No separate sale_items table needed.
 */
export interface Sale {
  id: string;
  pharmacy_name: string;
  sale_number: string;

  // Customer Information
  customer_id?: string;
  customer_name?: string;

  // Staff Information
  sold_by?: string;
  sold_by_name?: string;

  //  PRODUCT DETAILS (Single Item per Sale)
  product_id: string;
  product_name: string;
  product_barcode?: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;

  // Batch Information (Optional)
  batch_id?: string;
  batch_number?: string;

  // Financial Details
  discount: number;
  discount_reason?: string;
  tax: number;
  total: number;

  // Payment Details
  payment_method?: PaymentMethod;
  payment_status: PaymentStatus;
  payment_reference?: string;

  // Sale Status
  status: 'completed' | 'returned' | 'voided' | 'pending';

  //  Extra Product Metadata (Stored as JSON)
  product_details?: {
    generic_name?: string;
    brand?: string;
    form?: string;
    strength?: string;
    category?: string;
    category_id?: string;
    manufacturer?: string;
    prescription_required?: boolean;
    is_controlled?: boolean;
    selling_price?: number;
    cost_price?: number;
    unit?: string;
  };

  // Additional Info
  notes?: string;
  offline_id?: string;
  sale_date: string;
  created_at: string;
  updated_at: string;
}

// ⚠️ DEPRECATED - SaleItem is no longer used
// We now store everything in the Sale table directly
// Keeping this for backward compatibility only
export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name?: string;
  batch_id?: string;
  batch_number?: string;
  quantity: number;
  unit_id?: string;
  unit_name?: string;
  unit_price: number;
  discount: number;
  subtotal: number;
  created_at: string;
}

// =============================================
// PAYMENTS (Now Optional - Can use sale.payment_method)
// =============================================
export interface Payment {
  id: string;
  pharmacy_name: string;
  sale_id: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  status: PaymentStatus;
  created_at: string;
}

// =============================================
// STOCK MOVEMENTS & STOCKTAKES
// =============================================
export interface StockMovement {
  id: string;
  pharmacy_name: string;
  product_id: string;
  product_name?: string;
  batch_id?: string;
  batch_number?: string;
  movement_type: MovementType;
  quantity_base: number;
  reference_type?: string;
  reference_id?: string;
  performed_by?: string;
  performed_by_name?: string;
  reason?: string;
  created_at: string;
}

export interface Stocktake {
  id: string;
  pharmacy_name: string;
  started_by: string;
  started_by_name?: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  notes?: string;
  items?: StocktakeItem[];
}

export interface StocktakeItem {
  id: string;
  stocktake_id: string;
  product_id: string;
  product_name?: string;
  batch_id?: string;
  batch_number?: string;
  system_quantity: number;
  counted_quantity: number;
  difference: number;
  reason?: string;
}

// =============================================
// RETURNS
// =============================================
export interface SaleReturn {
  id: string;
  pharmacy_name: string;
  sale_id?: string;
  sale_number?: string;
  processed_by?: string;
  processed_by_name?: string;
  reason: string;
  total: number;
  created_at: string;
  items?: SaleReturnItem[];
}

export interface SaleReturnItem {
  id: string;
  return_id: string;
  sale_item_id?: string;
  product_id: string;
  product_name?: string;
  batch_id?: string;
  quantity: number;
  amount: number;
}

// =============================================
// DISCOUNTS
// =============================================
export interface Discount {
  id: string;
  pharmacy_name: string;
  sale_id: string;
  approved_by?: string;
  approved_by_name?: string;
  amount: number;
  percentage?: number;
  reason?: string;
  created_at: string;
}

// =============================================
// AUDIT & NOTIFICATIONS
// =============================================
export interface AuditLog {
  id: string;
  pharmacy_name: string;
  user_id?: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_data?: any;
  new_data?: any;
  metadata?: any;
  created_at: string;
}

export interface Notification {
  id: string;
  pharmacy_name: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// =============================================
// OFFLINE SYNC
// =============================================
export interface OfflineSyncItem {
  id?: number;
  sync_id: string;
  pharmacy_name: string;
  user_id: string;
  entity_type: 'profile' | 'product' | 'batch' | 'purchase' | 'purchase_item' | 'sale' | 'sale_item' | 'payment' | 'customer' | 'supplier' | 'category' | 'unit' | 'stock_movement' | 'return' | 'return_item' | 'discount' | 'audit_log' | 'notification';
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  created_at: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retry_count: number;
  error?: string;
}

// =============================================
// AUTH STATE (Simplified)
// =============================================
export interface AuthState {
  isAuthenticated: boolean;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
}

// =============================================
// APP STATE (Simplified)
// =============================================
export interface AppState {
  auth: AuthState;
  profile: Profile | null;
  isOnline: boolean;
  isSyncing: boolean;
  syncQueue: OfflineSyncItem[];
  pendingSyncCount: number;
}

// =============================================
// DASHBOARD & ANALYTICS
// =============================================
export interface DashboardStats {
  totalSales: number;
  totalProducts: number;
  totalCustomers: number;
  totalSuppliers: number;
  lowStockItems: number;
  expiringItems: number;
  todaySales: number;
  todayTransactions: number;
  salesChart: { date: string; amount: number }[];
  topProducts: { name: string; quantity: number; amount: number }[];
}

// =============================================
// FORM TYPES
// =============================================
export interface LoginFormData {
  email: string;
  password: string;
  pinCode?: string;
}

export interface RegisterFormData {
  pharmacyName: string;
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  pinCode: string;
  role: UserRole;
}

export interface SupabaseConfig {
  url: string;
  key: string;
}

// =============================================
// UTILITY TYPES
// =============================================
export type WithTimestamps<T> = T & {
  created_at: string;
  updated_at: string;
};

export type WithPharmacy<T> = T & {
  pharmacy_name: string;
};

export type WithUser<T> = T & {
  user_id: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// =============================================
// SEARCH & FILTER TYPES
// =============================================
export interface SearchParams {
  query?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductSearchParams extends SearchParams {
  category_id?: string;
  active?: boolean;
  low_stock?: boolean;
  expiring?: boolean;
}

export interface SaleSearchParams extends SearchParams {
  customer_id?: string;
  customer_name?: string;
  product_id?: string;
  product_name?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
  payment_method?: string;
  payment_status?: string;
}

export interface UserSearchParams extends SearchParams {
  role?: UserRole;
  is_active?: boolean;
}

// =============================================
// REPORT TYPES (UPDATED for Single Table Sales)
// =============================================
export interface SalesReport {
  period: string;
  totalSales: number;
  totalTransactions: number;
  averageTicket: number;
  topProducts: {
    product_id: string;
    product_name: string;
    quantity: number;
    revenue: number;
    total_sales: number;
  }[];
  paymentMethods: { method: PaymentMethod; count: number; amount: number }[];
  dailySales: { date: string; count: number; total: number }[];
}

export interface StockReport {
  productId: string;
  productName: string;
  currentStock: number;
  reorderLevel: number;
  totalPurchases: number;
  totalSales: number;
  stockValue: number;
}

export interface UserReport {
  userId: string;
  userName: string;
  role: UserRole;
  totalSales: number;
  totalTransactions: number;
  totalRevenue: number;
  lastActive: string;
}

// =============================================
// APP SETTINGS
// =============================================
export interface AppSettings {
  profile: Profile;
  currency: string;
  taxRate: number;
  dateFormat: string;
  timeFormat: string;
  receiptPrinting: {
    enabled: boolean;
    copies: number;
    paperSize: '58mm' | '80mm';
  };
  notifications: {
    lowStock: boolean;
    expiry: boolean;
    sales: boolean;
  };
}