import fs from 'node:fs';
import path from 'node:path';
import {
  Tenant,
  Branch,
  StorageCell,
  Customer,
  Package,
  Sack,
  Trip,
  Payment,
  AuditLog,
  SubscriptionPlan,
  TelegramBotConfig,
  User,
  CashAccount,
  FinancialTransaction,
  CashCollection,
  ExpenseCategory,
  TripExpense,
} from '@cargona/types';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'cargona-store.json');

/**
 * CargonaOS In-Memory & Persistent State Store
 * Automatically syncs with disk so restarts/recreates never reset state.
 */
class CargonaDataStore {
  /** Generate next sequential ID like "tenant-001", "branch-042" etc. */
  public nextId(prefix: string, existing: { id: string }[]): string {
    let max = 0;
    for (const item of existing) {
      if (!item?.id) continue;
      const m = item.id.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  }

  /** Generate next sequential cargo code like "CRG-001", "CRG-002" etc. for a tenant */
  public nextCargoCode(tenant: Tenant): string {
    const prefix = (tenant.codePrefix || tenant.slug.substring(0, 3) || 'CRG').toUpperCase().trim();
    let max = 0;
    const tenantCustomers = this.customers.filter((c) => c.tenantId === tenant.id);
    for (const c of tenantCustomers) {
      if (!c.cargoCode) continue;
      const m = c.cargoCode.match(/(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  }

  public plans: SubscriptionPlan[] = [
    {
      id: 'plan-start',
      name: 'Старт',
      slug: 'start',
      priceMonthly: 49,
      priceYearly: 490,
      currency: 'USD',
      maxPackagesPerMonth: 1000,
      maxBranches: 1,
      maxUsers: 3,
      features: {
        customBotBYOB: false,
        whiteLabel: false,
        wmsShelfBarcodes: false,
        autoChannelPosting: false,
        marginAnalytics: false,
        auditLogExport: false,
      },
      isActive: true,
    },
    {
      id: 'plan-business',
      name: 'Бизнес',
      slug: 'business',
      priceMonthly: 149,
      priceYearly: 1490,
      currency: 'USD',
      maxPackagesPerMonth: 10000,
      maxBranches: 5,
      maxUsers: 15,
      features: {
        customBotBYOB: true,
        whiteLabel: false,
        wmsShelfBarcodes: true,
        autoChannelPosting: true,
        marginAnalytics: true,
        auditLogExport: true,
      },
      isActive: true,
    },
    {
      id: 'plan-pro',
      name: 'PRO',
      slug: 'pro',
      priceMonthly: 399,
      priceYearly: 3990,
      currency: 'USD',
      maxPackagesPerMonth: -1,
      maxBranches: -1,
      maxUsers: -1,
      features: {
        customBotBYOB: true,
        whiteLabel: true,
        wmsShelfBarcodes: true,
        autoChannelPosting: true,
        marginAnalytics: true,
        auditLogExport: true,
      },
      isActive: true,
    },
  ];

  public tenants: Tenant[] = [];

  public users: User[] = [
    {
      id: 'user-superadmin',
      tenantId: null,
      email: 'owner@cargona.com',
      fullName: 'Cargona Admin',
      username: 'cargona_owner',
      role: 'SUPER_ADMIN',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  public branches: Branch[] = [];
  public storageCells: StorageCell[] = [];
  public customers: Customer[] = [];
  public packages: Package[] = [];
  public sacks: Sack[] = [];
  public trips: Trip[] = [];
  public payments: Payment[] = [];
  public auditLogs: AuditLog[] = [];
  public botConfigs: TelegramBotConfig[] = [];
  public tenantSettings: Record<string, any> = {};
  public originWarehouses: any[] = [];
  public cashAccounts: CashAccount[] = [];
  public financialTransactions: FinancialTransaction[] = [];
  public cashCollections: CashCollection[] = [];
  public tripExpenses: TripExpense[] = [];
  public expenseCategories: ExpenseCategory[] = [];

  constructor() {
    this.loadFromFile();
  }

  public loadFromFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(STORE_FILE)) {
        const content = fs.readFileSync(STORE_FILE, 'utf8');
        const data = JSON.parse(content);
        if (Array.isArray(data.plans)) this.plans = data.plans;
        if (Array.isArray(data.tenants)) this.tenants = data.tenants;
        if (Array.isArray(data.branches)) this.branches = data.branches;
        if (Array.isArray(data.storageCells)) this.storageCells = data.storageCells;
        if (Array.isArray(data.customers)) this.customers = data.customers;
        if (Array.isArray(data.packages)) this.packages = data.packages;
        if (Array.isArray(data.sacks)) this.sacks = data.sacks;
        if (Array.isArray(data.trips)) this.trips = data.trips;
        if (Array.isArray(data.payments)) this.payments = data.payments;
        if (Array.isArray(data.auditLogs)) this.auditLogs = data.auditLogs;
        if (Array.isArray(data.botConfigs)) this.botConfigs = data.botConfigs;
        if (Array.isArray(data.users)) this.users = data.users;
        if (data.tenantSettings && typeof data.tenantSettings === 'object') this.tenantSettings = data.tenantSettings;
        if (Array.isArray(data.originWarehouses)) this.originWarehouses = data.originWarehouses;
        if (Array.isArray(data.cashAccounts)) this.cashAccounts = data.cashAccounts;
        if (Array.isArray(data.financialTransactions)) this.financialTransactions = data.financialTransactions;
        if (Array.isArray(data.cashCollections)) this.cashCollections = data.cashCollections;
        if (Array.isArray(data.tripExpenses)) this.tripExpenses = data.tripExpenses;
        if (Array.isArray(data.expenseCategories)) this.expenseCategories = data.expenseCategories;
        console.log(`[Store] Successfully loaded persistent state from ${STORE_FILE}`);
      } else {
        this.saveToFile();
      }
    } catch (err) {
      console.error('[Store] Failed to load state from disk:', err);
    }
  }

  public saveToFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = {
        plans: this.plans,
        tenants: this.tenants,
        branches: this.branches,
        storageCells: this.storageCells,
        customers: this.customers,
        packages: this.packages,
        sacks: this.sacks,
        trips: this.trips,
        payments: this.payments,
        auditLogs: this.auditLogs,
        botConfigs: this.botConfigs,
        users: this.users,
        tenantSettings: this.tenantSettings,
        originWarehouses: this.originWarehouses,
        cashAccounts: this.cashAccounts,
        financialTransactions: this.financialTransactions,
        cashCollections: this.cashCollections,
        tripExpenses: this.tripExpenses,
        expenseCategories: this.expenseCategories,
      };
      fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('[Store] Failed to save state to disk:', err);
    }
  }
}

export const store = new CargonaDataStore();
