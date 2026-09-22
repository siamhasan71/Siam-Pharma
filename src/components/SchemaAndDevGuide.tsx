import React, { useState } from 'react';
import {
  Database,
  Code2,
  BookOpen,
  Layers,
  CheckCircle2,
  Copy,
  Check,
  Server,
  Cpu,
  ShieldCheck,
  Terminal,
} from 'lucide-react';

export const SchemaAndDevGuide: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'stack' | 'schema' | 'guide' | 'backendCode'>('stack');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sqlSchema = `-- ==========================================================
-- SIAM PHARMA PHARMACY MANAGEMENT SYSTEM
-- Production-Ready PostgreSQL Relational Schema
-- ==========================================================

-- Enable UUID extension
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

-- Indexes for lightning fast POS searching
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

-- 7. Trigger to automatically deduct stock on sale completion
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
EXECUTE FUNCTION deduct_medicine_stock_on_sale();`;

  const backendCodeSnippet = `// server/app.ts - Node.js Express Backend Starter with Atomic POS Checkout
import express, { Request, Response } from 'express';
import { Pool } from 'pg';

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/siam_pharma',
});

// 1. Medicines List & Fast Search Endpoint
app.get('/api/medicines', async (req: Request, res: Response) => {
  try {
    const { search, category, status } = req.query;
    let query = 'SELECT * FROM medicines WHERE 1=1';
    const params: any[] = [];

    if (search) {
      params.push(\`%\${search}%\`);
      query += \` AND (LOWER(name) LIKE LOWER($\${params.length}) OR LOWER(generic_name) LIKE LOWER($\${params.length}) OR batch_number LIKE $\${params.length})\`;
    }

    if (category && category !== 'All') {
      params.push(category);
      query += \` AND category = $\${params.length}\`;
    }

    query += ' ORDER BY name ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Database query failed' });
  }
});

// 2. Atomic POS Checkout Transaction (Deducts Stock Safely with Row Locking)
app.post('/api/pos/checkout', async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const { items, customerId, cashierId, paymentMethod, amountTendered, discountPercent, taxRate } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    await client.query('BEGIN'); // Start ACID transaction

    let subtotal = 0;
    const validatedItems = [];

    // Lock and verify stock for all items
    for (const item of items) {
      const medRes = await client.query(
        'SELECT id, name, generic_name, batch_number, expiry_date, selling_price, purchase_price, stock_quantity FROM medicines WHERE id = $1 FOR UPDATE',
        [item.medicineId]
      );

      if (medRes.rows.length === 0) {
        throw new Error(\`Medicine ID \${item.medicineId} not found\`);
      }

      const med = medRes.rows[0];
      if (med.stock_quantity < item.quantity) {
        throw new Error(\`Insufficient stock for \${med.name}. Available: \${med.stock_quantity}\`);
      }

      const itemTotal = Number((item.quantity * med.selling_price).toFixed(2));
      subtotal += itemTotal;

      validatedItems.push({
        ...item,
        unitPrice: med.selling_price,
        costPrice: med.purchase_price,
        totalPrice: itemTotal,
        batchNumber: med.batch_number,
        expiryDate: med.expiry_date,
      });
    }

    // Calculate totals
    const discountAmount = Number(((subtotal * (discountPercent || 0)) / 100).toFixed(2));
    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = Number(((discountedSubtotal * (taxRate || 5)) / 100).toFixed(2));
    const grandTotal = Number((discountedSubtotal + taxAmount).toFixed(2));

    const invoiceNumber = \`INV-\${new Date().getFullYear()}-\${Date.now().toString().slice(-6)}\`;

    // Insert Sale record
    const saleRes = await client.query(
      \`INSERT INTO sales (invoice_number, customer_id, cashier_id, subtotal, discount_amount, tax_amount, tax_rate, grand_total, payment_method, amount_tendered, change_due)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *\`,
      [
        invoiceNumber,
        customerId || null,
        cashierId || null,
        subtotal,
        discountAmount,
        taxAmount,
        taxRate || 5,
        grandTotal,
        paymentMethod,
        amountTendered || grandTotal,
        Math.max(0, (amountTendered || grandTotal) - grandTotal),
      ]
    );

    const createdSale = saleRes.rows[0];

    // Insert Sale Items and deduct stock
    for (const item of validatedItems) {
      await client.query(
        \`INSERT INTO sale_items (sale_id, medicine_id, batch_number, expiry_date, unit_price, cost_price, quantity, discount_percent, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)\`,
        [createdSale.id, item.medicineId, item.batchNumber, item.expiryDate, item.unitPrice, item.costPrice, item.quantity, 0, item.totalPrice]
      );

      await client.query(
        'UPDATE medicines SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [item.quantity, item.medicineId]
      );
    }

    // Update Customer Statistics
    if (customerId) {
      await client.query(
        'UPDATE customers SET total_purchases = total_purchases + 1, total_spent = total_spent + $1, last_visit = NOW() WHERE id = $2',
        [grandTotal, customerId]
      );
    }

    await client.query('COMMIT'); // Commit atomic transaction
    res.status(201).json({ success: true, sale: createdSale });
  } catch (error: any) {
    await client.query('ROLLBACK'); // Rollback on any failure
    res.status(400).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`Siam Pharma Server listening on port \${PORT}\`));`;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Scalable Tech Stack, Architecture & Database Schema</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Engineering blueprint, PostgreSQL relational schema, and production backend starter code.
        </p>
      </div>

      {/* Sub navigation pills */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab('stack')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'stack'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Recommended Tech Stack</span>
        </button>

        <button
          onClick={() => setActiveSubTab('schema')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'schema'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>PostgreSQL Database Schema (DDL)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('guide')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'guide'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Step-by-Step Implementation Guide</span>
        </button>

        <button
          onClick={() => setActiveSubTab('backendCode')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'backendCode'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Backend POS Starter Code</span>
        </button>
      </div>

      {/* SUB-TAB 1: Recommended Scalable Tech Stack */}
      {activeSubTab === 'stack' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                FE
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Frontend Layer</h3>
              <p className="text-xs text-slate-600 font-semibold">React 19 / Next.js + Tailwind CSS</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Optimized for ultra-responsive POS keyboards, instant fuzzy search for medicines & barcode scanners, and direct ESC/POS thermal printing.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                BE
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Backend API Layer</h3>
              <p className="text-xs text-slate-600 font-semibold">Node.js (Express / NestJS) + TypeScript</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Strict type safety, robust middleware for Role-Based Access Control (RBAC), and ACID transaction handlers for atomic stock deductions.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                DB
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Database & ORM</h3>
              <p className="text-xs text-slate-600 font-semibold">PostgreSQL 16 + Drizzle / Prisma</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Relational integrity, row-level locking (`FOR UPDATE`) to prevent overselling race conditions, and composite indexes for sub-millisecond lookups.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                OPS
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Cache & Infrastructure</h3>
              <p className="text-xs text-slate-600 font-semibold">Redis + Docker + Cloud Run</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Redis for session tokens & frequent medicine catalog caching. Containerized microservices deploying to managed Cloud Run or Kubernetes.
              </p>
            </div>
          </div>

          {/* Architecture Comparison Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Why PostgreSQL Over MongoDB for Pharmacies?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>PostgreSQL (Recommended Choice)</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Pharmacies deal with regulated substances, exact financial invoices, and strict stock limits. PostgreSQL provides ACID transactions, foreign keys to prevent orphan sale items, and triggers for stock updates that never drift.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Server className="w-4 h-4 text-slate-600" />
                  <span>MongoDB (Alternative)</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  MongoDB works well for unstructured catalogs, but multi-document transactions require careful replica set management, and lack of native table constraints can lead to inventory discrepancies under heavy concurrent checkout loads.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Database Schema (DDL) */}
      {activeSubTab === 'schema' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900">
                schema.sql — 8 Core Relational Tables with Indexes & Triggers
              </span>
            </div>
            <button
              onClick={() => handleCopy(sqlSchema, 'sql')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              {copiedId === 'sql' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'sql' ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
            </button>
          </div>

          <div className="relative bg-slate-950 text-slate-200 rounded-2xl p-5 font-mono text-xs overflow-x-auto max-h-[580px] shadow-lg border border-slate-800">
            <pre className="leading-relaxed">{sqlSchema}</pre>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Step-by-Step Implementation Guide */}
      {activeSubTab === 'guide' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <h2 className="text-base font-bold text-slate-900">
            End-to-End Implementation Roadmap: From Scratch to Production
          </h2>

          <div className="space-y-4">
            {[
              {
                step: 'Phase 1',
                title: 'Database Provisioning & Migrations',
                desc: 'Set up PostgreSQL 16 on Cloud SQL or local Docker. Run migrations using Prisma or Drizzle ORM to generate schemas for users, medicines, suppliers, purchase_orders, customers, and sales. Configure unique index constraints on batch numbers and barcodes.',
              },
              {
                step: 'Phase 2',
                title: 'Authentication & Role-Based Access Control (RBAC)',
                desc: 'Implement JWT authentication with Bcrypt password hashing. Create custom Express middleware (requireAuth, requireRole("admin")) to protect wholesale cost margins, deletion of medicine records, and financial sales reports from cashier accounts.',
              },
              {
                step: 'Phase 3',
                title: 'Inventory Management Engine',
                desc: 'Create CRUD endpoints for medicines. Implement background cron job surveillance that automatically tags batches expiring within 60 days and flags stock falling below min_stock_threshold with real-time WebSocket alerts to the dashboard.',
              },
              {
                step: 'Phase 4',
                title: 'Ergonomic Point of Sale (POS) Billing',
                desc: 'Build the fast POS billing screen with debounced search. On checkout, execute an ACID transaction with "SELECT ... FOR UPDATE" to lock medicine rows, verify stock sufficiency, insert the sale record, and deduct stock quantities atomically.',
              },
              {
                step: 'Phase 5',
                title: 'Supplier Supply Chain & Inbound Restocking',
                desc: 'Build vendor tracking, inbound purchase order receipts, and accounts payable ledger. When receiving stock from wholesalers, update medicine batches, average cost price, and increment stock quantity.',
              },
              {
                step: 'Phase 6',
                title: 'Financial Auditing & Regulatory Reporting',
                desc: 'Generate daily prescription logs, cost of goods sold (COGS), gross profit margins, and exportable CSV reports for tax authorities and pharmacy compliance audits.',
              },
            ].map((phase, idx) => (
              <div key={idx} className="flex gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/60">
                <div className="w-16 shrink-0 font-bold text-xs text-emerald-700 bg-emerald-100/70 h-7 flex items-center justify-center rounded-lg">
                  {phase.step}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">{phase.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{phase.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: Backend Starter Code */}
      {activeSubTab === 'backendCode' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900">
                server/app.ts — Node.js Express REST API & Transactional POS Checkout
              </span>
            </div>
            <button
              onClick={() => handleCopy(backendCodeSnippet, 'backend')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              {copiedId === 'backend' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'backend' ? 'Copied!' : 'Copy Backend Code'}</span>
            </button>
          </div>

          <div className="relative bg-slate-950 text-slate-200 rounded-2xl p-5 font-mono text-xs overflow-x-auto max-h-[580px] shadow-lg border border-slate-800">
            <pre className="leading-relaxed">{backendCodeSnippet}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
