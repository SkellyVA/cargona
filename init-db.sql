-- CargonaOS PostgreSQL Database Schema Initialization
-- Safe: Uses IF NOT EXISTS so recreating containers NEVER resets or overwrites data!

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    price_yearly NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    max_packages_per_month INTEGER NOT NULL DEFAULT 1000,
    max_branches INTEGER NOT NULL DEFAULT 1,
    max_users INTEGER NOT NULL DEFAULT 3,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tenants (Cargo Organizations)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(80) NOT NULL UNIQUE,
    code_prefix VARCHAR(20) NOT NULL,
    logo_url TEXT,
    base_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Dushanbe',
    default_language VARCHAR(10) NOT NULL DEFAULT 'ru',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    plan_id UUID REFERENCES subscription_plans(id),
    subscription_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Users (Staff & Admins)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    full_name VARCHAR(150) NOT NULL,
    username VARCHAR(80) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    assigned_branch_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Branches & Warehouses (PVZ / Hubs)
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL,
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    landmark TEXT,
    phone VARCHAR(50),
    working_hours VARCHAR(100),
    cash_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Storage Cells (WMS Shelves)
CREATE TABLE IF NOT EXISTS storage_cells (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    code VARCHAR(50) NOT NULL,
    zone VARCHAR(20) NOT NULL,
    tier INTEGER NOT NULL,
    barcode VARCHAR(100) NOT NULL UNIQUE,
    is_occupied BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Customers (Clients)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    cargo_code VARCHAR(50) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    telegram_id BIGINT,
    telegram_username VARCHAR(100),
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    is_blocked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Packages (Parcels)
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    tracking_number VARCHAR(100) NOT NULL,
    internal_barcode VARCHAR(100) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT NOT NULL,
    current_branch_id UUID REFERENCES branches(id),
    storage_cell_id UUID REFERENCES storage_cells(id),
    sack_id UUID,
    trip_id UUID,
    weight_kg NUMERIC(8, 3) NOT NULL DEFAULT 0.000,
    volume_m3 NUMERIC(8, 4) NOT NULL DEFAULT 0.0000,
    cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'PRE_REGISTERED',
    description TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES branches(id),
    user_id UUID,
    user_name VARCHAR(150),
    user_role VARCHAR(50),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
