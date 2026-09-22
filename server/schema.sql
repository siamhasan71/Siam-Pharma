-- ==========================================================
-- SIAM PHARMA PHARMACY MANAGEMENT SYSTEM
-- Production-Ready PostgreSQL Relational Schema
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users & RBAC
CREATE TYPE user_role AS ENUM ('admin', 'pharmacist');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'pharmacist',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Medicine Categories & Inventory
CREATE TYPE medicine_category AS ENUM (
    'Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Inhaler', 'Other'
);

CREATE TABLE medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    generic_name VARCHAR(150) NOT NULL,
    category medicine_category NOT NULL DEFAULT 'Tablet',
    batch_number VARCHAR(80) NOT NULL,
    manufacturer VARCHAR(150) NOT NULL,
    expiry_date DATE NOT NULL,
    purchase_price NUMERIC(10, 2) NOT NULL CHECK (purchase_price >= 0),
    selling_price NUMERIC(10, 2) NOT NULL CHECK (selling_price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    min_stock_threshold INTEGER NOT NULL DEFAULT 15,
    shelf_location VARCHAR(80),
    dosage VARCHAR(80),
    barcode VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medicines_name ON medicines (LOWER(name));
CREATE INDEX idx_medicines_generic_name ON medicines (LOWER(generic_name));
CREATE INDEX idx_medicines_batch_number ON medicines (batch_number);
CREATE INDEX idx_medicines_expiry_date ON medicines (expiry_date);
CREATE INDEX idx_medicines_stock ON medicines (stock_quantity);

-- 3. Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(40) UNIQUE NOT NULL,
    email VARCHAR(160),
    address TEXT,
    total_purchases INTEGER DEFAULT 0,
    total_spent NUMERIC(12, 2) DEFAULT 0.00,
    last_visit TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_phone ON customers (phone);

-- 4. Suppliers & Vendors
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(120),
    phone VARCHAR(40) NOT NULL,
    email VARCHAR(160),
    address TEXT,
    due_balance NUMERIC(12, 2) DEFAULT 0.00 CHECK (due_balance >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Inbound Purchase Orders
CREATE TYPE po_status AS ENUM ('Pending', 'Received', 'Cancelled');
CREATE TYPE payment_status AS ENUM ('Paid', 'Partial', 'Due');

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(80) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    received_date TIMESTAMP WITH TIME ZONE,
    status po_status NOT NULL DEFAULT 'Received',
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_status payment_status NOT NULL DEFAULT 'Paid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
    batch_number VARCHAR(80) NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    purchase_price NUMERIC(10, 2) NOT NULL,
    total_cost NUMERIC(12, 2) NOT NULL
);

-- 6. POS Sales & Invoices
CREATE TYPE payment_method AS ENUM ('Cash', 'Credit/Debit Card', 'Digital / UPI', 'Insurance');
CREATE TYPE sale_status AS ENUM ('Completed', 'Refunded');

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(80) UNIQUE NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    cashier_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) DEFAULT 5.00,
    grand_total NUMERIC(12, 2) NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'Cash',
    amount_tendered NUMERIC(12, 2),
    change_due NUMERIC(12, 2) DEFAULT 0.00,
    status sale_status NOT NULL DEFAULT 'Completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_invoice_number ON sales (invoice_number);
CREATE INDEX idx_sales_date ON sales (date);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
    batch_number VARCHAR(80) NOT NULL,
    expiry_date DATE NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    cost_price NUMERIC(10, 2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    discount_percent NUMERIC(5, 2) DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL
);

-- 7. Trigger to automatically deduct stock on sale insertion
CREATE OR REPLACE FUNCTION deduct_medicine_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE medicines
    SET stock_quantity = stock_quantity - NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.medicine_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deduct_medicine_stock
AFTER INSERT ON sale_items
FOR EACH ROW
EXECUTE FUNCTION deduct_medicine_stock_on_sale();
