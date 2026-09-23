import {
  pgTable,
  uuid,
  text,
  varchar,
  numeric,
  integer,
  boolean,
  timestamp,
  jsonb,
  bigint,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// 1. Subscription Plans (SaaS Tiers)
// ==========================================
export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  priceMonthly: numeric('price_monthly', { precision: 10, scale: 2 }).notNull().default('0.00'),
  priceYearly: numeric('price_yearly', { precision: 10, scale: 2 }).notNull().default('0.00'),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  maxPackagesPerMonth: integer('max_packages_per_month').notNull().default(1000),
  maxBranches: integer('max_branches').notNull().default(1),
  maxUsers: integer('max_users').notNull().default(3),
  features: jsonb('features').$type<{
    customBotBYOB: boolean;
    whiteLabel: boolean;
    wmsShelfBarcodes: boolean;
    autoChannelPosting: boolean;
    marginAnalytics: boolean;
    auditLogExport: boolean;
  }>().notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 2. Tenants (Cargo Organizations)
// ==========================================
export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  slug: varchar('slug', { length: 80 }).notNull().unique(), // cargona.***/o/:slug
  codePrefix: varchar('code_prefix', { length: 20 }).notNull(), // 'MIR', 'NOOR'
  logoUrl: text('logo_url'),
  baseCurrency: varchar('base_currency', { length: 10 }).notNull().default('USD'),
  timezone: varchar('timezone', { length: 50 }).notNull().default('Asia/Dushanbe'),
  defaultLanguage: varchar('default_language', { length: 10 }).notNull().default('ru'),
  status: varchar('status', { length: 30 }).notNull().default('ACTIVE'), // 'ACTIVE', 'TRIAL', 'SUSPENDED'
  planId: uuid('plan_id').references(() => subscriptionPlans.id),
  subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('tenants_slug_idx').on(table.slug),
]);

// ==========================================
// 3. Users (Staff & Platform Admins)
// ==========================================
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }), // null for Super Admin
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 50 }),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  username: varchar('username', { length: 80 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 50 }).notNull(), // 'SUPER_ADMIN', 'TENANT_OWNER', 'PVZ_OPERATOR'
  assignedBranchId: uuid('assigned_branch_id'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('users_tenant_idx').on(table.tenantId),
]);

// ==========================================
// 4. Branches & Warehouses (PVZ / Hubs)
// ==========================================
export const branches = pgTable('branches', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'ORIGIN_HUB', 'TRANSIT_HUB', 'DESTINATION_PVZ'
  country: varchar('country', { length: 100 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  address: text('address').notNull(),
  landmark: text('landmark'),
  phone: varchar('phone', { length: 50 }),
  workingHours: varchar('working_hours', { length: 100 }),
  cashBalance: numeric('cash_balance', { precision: 12, scale: 2 }).notNull().default('0.00'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('branches_tenant_idx').on(table.tenantId),
]);

// ==========================================
// 5. Storage Cells (Адресное хранение на ПВЗ)
// ==========================================
export const storageCells = pgTable('storage_cells', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }).notNull(),
  rack: varchar('rack', { length: 50 }).notNull(), // "Стеллаж 1"
  shelf: varchar('shelf', { length: 50 }).notNull(), // "Б-14"
  barcode: varchar('barcode', { length: 100 }).notNull(), // "CELL-S1-B14"
  isOccupied: boolean('is_occupied').notNull().default(false),
  packageCount: integer('package_count').notNull().default(0),
}, (table) => [
  index('storage_cells_tenant_idx').on(table.tenantId),
  index('storage_cells_branch_idx').on(table.branchId),
  uniqueIndex('storage_cells_barcode_idx').on(table.tenantId, table.barcode),
]);

// ==========================================
// 6. Customers (Клиенты Карго)
// ==========================================
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  cargoCode: varchar('cargo_code', { length: 50 }).notNull(), // 'MIR-523'
  fullName: varchar('full_name', { length: 150 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  telegramUserId: bigint('telegram_user_id', { mode: 'number' }),
  telegramUsername: varchar('telegram_username', { length: 100 }),
  preferredBranchId: uuid('preferred_branch_id').references(() => branches.id),
  balance: numeric('balance', { precision: 12, scale: 2 }).notNull().default('0.00'),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  isBlocked: boolean('is_blocked').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('customers_tenant_idx').on(table.tenantId),
  uniqueIndex('customers_tenant_cargo_code_idx').on(table.tenantId, table.cargoCode),
  index('customers_tg_user_idx').on(table.tenantId, table.telegramUserId),
]);

// ==========================================
// 7. Trips & Routes (Рейсы)
// ==========================================
export const trips = pgTable('trips', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  tripCode: varchar('trip_code', { length: 80 }).notNull(), // 'AUTO-2026-44'
  transportType: varchar('transport_type', { length: 30 }).notNull(), // 'AUTO', 'AIR'
  originBranchId: uuid('origin_branch_id').references(() => branches.id).notNull(),
  destinationBranchId: uuid('destination_branch_id').references(() => branches.id).notNull(),
  driverName: varchar('driver_name', { length: 100 }),
  vehiclePlate: varchar('vehicle_plate', { length: 50 }),
  status: varchar('status', { length: 40 }).notNull().default('DRAFT'),
  totalWeightKg: numeric('total_weight_kg', { precision: 12, scale: 3 }).notNull().default('0.000'),
  totalVolumeM3: numeric('total_volume_m3', { precision: 12, scale: 4 }).notNull().default('0.0000'),
  sackCount: integer('sack_count').notNull().default(0),
  departureDate: timestamp('departure_date', { withTimezone: true }),
  estimatedArrivalDate: timestamp('estimated_arrival_date', { withTimezone: true }),
  actualArrivalDate: timestamp('actual_arrival_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('trips_tenant_idx').on(table.tenantId),
  uniqueIndex('trips_code_idx').on(table.tenantId, table.tripCode),
]);

// ==========================================
// 8. Sacks & Pallets (Тарные места)
// ==========================================
export const sacks = pgTable('sacks', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  sackCode: varchar('sack_code', { length: 80 }).notNull(), // 'SACK-1049'
  type: varchar('type', { length: 30 }).notNull().default('SACK'), // 'SACK', 'PALLET'
  originBranchId: uuid('origin_branch_id').references(() => branches.id).notNull(),
  destinationBranchId: uuid('destination_branch_id').references(() => branches.id).notNull(),
  tripId: uuid('trip_id').references(() => trips.id),
  totalWeightKg: numeric('total_weight_kg', { precision: 12, scale: 3 }).notNull().default('0.000'),
  packageCount: integer('package_count').notNull().default(0),
  status: varchar('status', { length: 30 }).notNull().default('OPEN'), // 'OPEN', 'SEALED'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  sealedAt: timestamp('sealed_at', { withTimezone: true }),
}, (table) => [
  index('sacks_tenant_idx').on(table.tenantId),
  uniqueIndex('sacks_code_idx').on(table.tenantId, table.sackCode),
]);

// ==========================================
// 9. Packages (Посылки)
// ==========================================
export const packages = pgTable('packages', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  trackingNumber: varchar('tracking_number', { length: 120 }).notNull(), // Трек курьерки (ZTO, SF)
  internalBarcode: varchar('internal_barcode', { length: 120 }).notNull(), // Внутренний ШК карго
  customerId: uuid('customer_id').references(() => customers.id),
  customerCargoCode: varchar('customer_cargo_code', { length: 50 }),
  currentBranchId: uuid('current_branch_id').references(() => branches.id).notNull(),
  storageCellId: uuid('storage_cell_id').references(() => storageCells.id), // Полка ПВЗ (скрыта от клиента!)
  sackId: uuid('sack_id').references(() => sacks.id),
  tripId: uuid('trip_id').references(() => trips.id),
  weightKg: numeric('weight_kg', { precision: 10, scale: 3 }).notNull().default('0.000'),
  lengthCm: numeric('length_cm', { precision: 8, scale: 2 }),
  widthCm: numeric('width_cm', { precision: 8, scale: 2 }),
  heightCm: numeric('height_cm', { precision: 8, scale: 2 }),
  volumeM3: numeric('volume_m3', { precision: 10, scale: 4 }).default('0.0000'),
  density: numeric('density', { precision: 10, scale: 2 }).default('0.00'),
  cost: numeric('cost', { precision: 12, scale: 2 }).notNull().default('0.00'),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  photos: jsonb('photos').$type<string[]>().notNull().default([]),
  description: text('description'),
  status: varchar('status', { length: 40 }).notNull().default('PRE_REGISTERED'),
  receivedAt: timestamp('received_at', { withTimezone: true }),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('packages_tenant_idx').on(table.tenantId),
  index('packages_tracking_idx').on(table.tenantId, table.trackingNumber),
  index('packages_barcode_idx').on(table.tenantId, table.internalBarcode),
  index('packages_customer_idx').on(table.tenantId, table.customerId),
  index('packages_cell_idx').on(table.storageCellId),
  index('packages_status_idx').on(table.tenantId, table.status),
]);

// ==========================================
// 10. Payments & Cash Desks
// ==========================================
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  branchId: uuid('branch_id').references(() => branches.id).notNull(),
  customerId: uuid('customer_id').references(() => customers.id),
  packageId: uuid('package_id').references(() => packages.id),
  cashierUserId: uuid('cashier_user_id').references(() => users.id).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull(),
  method: varchar('method', { length: 30 }).notNull(), // 'CASH', 'CARD', 'ONLINE_QR'
  type: varchar('type', { length: 40 }).notNull(), // 'DELIVERY_PAYMENT', 'TOP_UP', 'COLLECTION'
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('payments_tenant_idx').on(table.tenantId),
  index('payments_branch_idx').on(table.branchId),
  index('payments_customer_idx').on(table.customerId),
]);

// ==========================================
// 11. Immutable Audit Logs
// ==========================================
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  branchId: uuid('branch_id').references(() => branches.id),
  userId: uuid('user_id').notNull(),
  userName: varchar('user_name', { length: 150 }).notNull(),
  userRole: varchar('user_role', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'PACKAGE', 'SACK', 'TRIP', 'CUSTOMER'
  entityId: uuid('entity_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(), // 'CREATE', 'UPDATE', 'STATUS_CHANGE', 'HANDOVER'
  details: text('details').notNull(),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: varchar('ip_address', { length: 60 }),
  deviceInfo: text('device_info'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('audit_tenant_created_idx').on(table.tenantId, table.createdAt),
  index('audit_entity_idx').on(table.tenantId, table.entityType, table.entityId),
]);

// ==========================================
// 12. Dynamic Telegram Multi-Bot Config
// ==========================================
export const botConfigs = pgTable('bot_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull().unique(),
  botToken: text('bot_token').notNull(),
  botUsername: varchar('bot_username', { length: 100 }).notNull(),
  welcomeMessage: text('welcome_message'),
  channelIdForPosting: varchar('channel_id_for_posting', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  webhookSecret: varchar('webhook_secret', { length: 100 }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('bot_configs_tenant_idx').on(table.tenantId),
]);
