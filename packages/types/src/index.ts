/**
 * CargonaOS Core Shared Types & Enums
 */

// ==========================================
// 1. Roles & Permissions
// ==========================================
export type UserRole = 
  | 'SUPER_ADMIN'      // Владелец платформы Cargona
  | 'TENANT_OWNER'     // Владелец карго-компании
  | 'TENANT_ADMIN'     // Управляющий / Главный менеджер
  | 'ORIGIN_SORTER'    // Кладовщик склада отправления (Китай/Турция)
  | 'PVZ_OPERATOR'     // Оператор ПВЗ / Склада выдачи
  | 'CASHIER'          // Кассир точки
  | 'SUPPORT_AGENT';   // Менеджер поддержки

export interface User {
  id: string;
  tenantId?: string | null; // null для SUPER_ADMIN
  email: string;
  phone?: string | null;
  fullName: string;
  username: string;
  role: UserRole;
  assignedBranchId?: string | null; // Привязка к конкретному ПВЗ/складу
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 2. SaaS Subscriptions & Feature Gating
// ==========================================
export interface SubscriptionPlan {
  id: string;
  name: string; // 'Старт', 'Бизнес', 'PRO'
  slug: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  maxPackagesPerMonth: number; // 1000, 10000, -1 (unlimited)
  maxBranches: number;         // 1, 5, -1
  maxUsers: number;            // 3, 15, -1
  features: {
    customBotBYOB: boolean;          // Собственный бот
    whiteLabel: boolean;             // Скрытие "Powered by Cargona"
    wmsShelfBarcodes: boolean;       // Адресный склад полок
    autoChannelPosting: boolean;     // Автопостинг в TG-канал
    marginAnalytics: boolean;        // Аналитика маржи рейсов
    auditLogExport: boolean;         // Экспорт аудита
  };
  isActive: boolean;
}

export type TenantStatus = 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'SUSPENDED';

export interface Tenant {
  id: string;
  name: string;
  slug: string; // используется в /o/:slug
  codePrefix: string; // 'MIR', 'NOOR', 'ABC'
  logoUrl?: string | null;
  baseCurrency: string; // 'USD', 'CNY', 'RUB', 'TJS'
  timezone: string;
  defaultLanguage: 'ru' | 'en' | 'tj' | 'uz' | 'tr' | 'zh';
  status: TenantStatus;
  planId: string;
  subscriptionExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 3. Branches, Warehouses & Storage Cells (WMS)
// ==========================================
export type BranchType = 'ORIGIN_HUB' | 'TRANSIT_HUB' | 'DESTINATION_PVZ';

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  type: BranchType;
  country: string;
  city: string;
  address: string;
  landmark?: string | null;
  phone?: string | null;
  workingHours?: string | null;
  cashBalance: number; // Текущий баланс наличных в кассе точки
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StorageCell {
  id: string;
  tenantId: string;
  branchId: string;
  rack: string;    // Стеллаж (например, "Стеллаж 1")
  shelf: string;   // Полка (например, "Б-14")
  barcode: string; // ШК полки для сканирования ("CELL-S1-B14")
  isOccupied: boolean;
  packageCount: number;
}

// ==========================================
// 4. Customers (Клиенты Карго)
// ==========================================
export interface Customer {
  id: string;
  tenantId: string;
  cargoCode: string; // 'MIR-523'
  fullName: string;
  phone: string;
  telegramUserId?: number | null;
  telegramUsername?: string | null;
  preferredBranchId?: string | null;
  balance: number; // положительный = депозит, отрицательный = долг
  currency: string;
  isBlocked: boolean;
  notes?: string | null;
  createdAt: string;
}

// ==========================================
// 5. Packages (Посылки)
// ==========================================
export type PackageStatus = 
  | 'PRE_REGISTERED'          // Клиент сам внес трек в боте/WebApp
  | 'RECEIVED_AT_ORIGIN'      // Принята в Китае/Турции (взвешена, обмерена)
  | 'PACKED_IN_SACK'          // Упакована в мешок/паллету
  | 'IN_TRANSIT'              // Рейс выехал (в пути)
  | 'CUSTOMS'                 // На таможне
  | 'ARRIVED_AT_PVZ'          // Прибыла в филиал ПВЗ
  | 'READY_FOR_PICKUP'        // На полке в ячейке, готова к выдаче
  | 'RELEASED'                // Выдана клиенту
  | 'LOST_FOUND';             // Неопознанный груз (без кода клиента)

export interface Package {
  id: string;
  tenantId: string;
  trackingNumber: string;       // Китайский трек курьерки (ZTO, SF и др.)
  internalBarcode: string;      // Внутренний ШК карго
  customerId?: string | null;   // Привязанный клиент
  customerCargoCode?: string | null; // Денормализованный код для скорости
  currentBranchId: string;
  storageCellId?: string | null; // Полка на ПВЗ (скрыта от клиента!)
  sackId?: string | null;
  tripId?: string | null;
  weightKg: number;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  volumeM3?: number | null;
  density?: number | null;
  cost: number;
  currency: string;
  photos: string[];
  description?: string | null;
  status: PackageStatus;
  receivedAt?: string | null;
  releasedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 6. Sacks & Pallets (Тарные места)
// ==========================================
export type SackStatus = 'OPEN' | 'SEALED' | 'LOADED' | 'UNLOADED';

export interface Sack {
  id: string;
  tenantId: string;
  sackCode: string;          // 'SACK-08812'
  type: 'SACK' | 'BOX' | 'PALLET' | 'WOODEN_CRATE';
  originBranchId: string;
  destinationBranchId: string;
  tripId?: string | null;
  totalWeightKg: number;
  packageCount: number;
  status: SackStatus;
  createdAt: string;
  sealedAt?: string | null;
}

// ==========================================
// 7. Trips & Routes (Рейсы)
// ==========================================
export type TransportType = 'AUTO' | 'AIR' | 'RAIL' | 'SEA';
export type TripStatus = 
  | 'DRAFT'
  | 'LOADING'
  | 'DISPATCHED'
  | 'CUSTOMS'
  | 'ARRIVED'
  | 'SORTING'
  | 'COMPLETED';

export interface Trip {
  id: string;
  tenantId: string;
  tripCode: string;            // 'AUTO-2026-44'
  transportType: TransportType;
  originBranchId: string;
  destinationBranchId: string;
  driverName?: string | null;
  vehiclePlate?: string | null;
  status: TripStatus;
  totalWeightKg: number;
  totalVolumeM3: number;
  sackCount: number;
  departureDate?: string | null;
  estimatedArrivalDate?: string | null;
  actualArrivalDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 8. Payments & Cash Desks
// ==========================================
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'ONLINE_QR';
export type PaymentType = 'DELIVERY_PAYMENT' | 'TOP_UP' | 'COLLECTION' | 'REFUND';

export interface Payment {
  id: string;
  tenantId: string;
  branchId: string;
  customerId?: string | null;
  packageId?: string | null;
  cashierUserId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  type: PaymentType;
  notes?: string | null;
  createdAt: string;
}

// ==========================================
// 9. Immutable Audit Log
// ==========================================
export type AuditAction = 
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'SCAN'
  | 'WEIGHT_OVERRIDE'
  | 'TARIFF_CHANGE'
  | 'HANDOVER'
  | 'CASH_COLLECTION';

export interface AuditLog {
  id: string;
  tenantId: string;
  branchId?: string | null;
  userId: string;
  userName: string;
  userRole: UserRole;
  entityType: 'PACKAGE' | 'SACK' | 'TRIP' | 'CUSTOMER' | 'PAYMENT' | 'BRANCH' | 'TENANT';
  entityId: string;
  action: AuditAction;
  details: string; // Понятное описание: "Вес изменен с 12.0 кг на 10.5 кг"
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  ipAddress?: string | null;
  deviceInfo?: string | null;
  createdAt: string;
}

// ==========================================
// 10. Dynamic Telegram Multi-Bot Config
// ==========================================
export interface TelegramBotConfig {
  id: string;
  tenantId: string;
  botToken: string;
  botUsername: string;
  welcomeMessage?: string | null;
  channelIdForPosting?: string | null; // @channel_name
  isActive: boolean;
  webhookSecret: string;
  updatedAt: string;
}
