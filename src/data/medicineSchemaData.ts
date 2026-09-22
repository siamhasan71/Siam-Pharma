/**
 * Medicine Item List & Pricing Schema and Sample Dataset
 * Prepared for Siam Pharma Pharmacy Management System
 */

export const SAMPLE_MEDICINES_DATA = [
  {
    id: "med-3bi-n",
    name: "3Bi-n",
    genericName: "Vitamin B1 + B6 + B12",
    category: "Tablet",
    unit: "Strip",
    purchaseRate: 8.50,
    sellingPrice: 10.00,
    stockQuantity: 240,
    minStockThreshold: 20,
    expiryDate: "2028-06-30",
    rackShelfLocation: "Rack V-01",
    batchNumber: "3BIN-2025-01",
    manufacturer: "Popular Pharmaceuticals Ltd."
  },
  {
    id: "med-bexidal-500",
    name: "Bexidal 500mg",
    genericName: "Paracetamol",
    category: "Tablet",
    unit: "Strip",
    purchaseRate: 1.20,
    sellingPrice: 1.50,
    stockQuantity: 150,
    minStockThreshold: 20,
    expiryDate: "2028-10-25",
    rackShelfLocation: "Rack B-02",
    batchNumber: "BXD-2025-01",
    manufacturer: "Beximco Pharmaceuticals Ltd."
  },
  {
    id: "med-mon-05",
    name: "Mon 5mg",
    genericName: "Montelukast Sodium",
    category: "Tablet",
    unit: "Box",
    purchaseRate: 6.00,
    sellingPrice: 8.00,
    stockQuantity: 240,
    minStockThreshold: 30,
    expiryDate: "2028-06-30",
    rackShelfLocation: "Rack M-01",
    batchNumber: "MON-2025-01",
    manufacturer: "Square Pharmaceuticals Ltd."
  },
  {
    id: "med-napa-extra",
    name: "Napa Extra",
    genericName: "Paracetamol 500mg + Caffeine 65mg",
    category: "Tablet",
    unit: "Strip",
    purchaseRate: 2.20,
    sellingPrice: 3.00,
    stockQuantity: 350,
    minStockThreshold: 50,
    expiryDate: "2027-12-31",
    rackShelfLocation: "Rack A-01",
    batchNumber: "NPX-2025-44",
    manufacturer: "Beximco Pharmaceuticals Ltd."
  },
  {
    id: "med-seclo-20",
    name: "Seclo 20mg",
    genericName: "Omeprazole",
    category: "Capsule",
    unit: "Box",
    purchaseRate: 4.50,
    sellingPrice: 6.00,
    stockQuantity: 180,
    minStockThreshold: 25,
    expiryDate: "2027-08-15",
    rackShelfLocation: "Rack S-04",
    batchNumber: "SCL-2025-09",
    manufacturer: "Square Pharmaceuticals Ltd."
  },
  {
    id: "med-ciprocin-500",
    name: "Ciprocin 500mg",
    genericName: "Ciprofloxacin HCl",
    category: "Tablet",
    unit: "Strip",
    purchaseRate: 12.00,
    sellingPrice: 16.00,
    stockQuantity: 90,
    minStockThreshold: 20,
    expiryDate: "2027-03-20",
    rackShelfLocation: "Rack C-02",
    batchNumber: "CPR-2024-81",
    manufacturer: "Square Pharmaceuticals Ltd."
  },
  {
    id: "med-maxpro-20",
    name: "Maxpro 20mg",
    genericName: "Esomeprazole Magnesium",
    category: "Capsule",
    unit: "Box",
    purchaseRate: 6.50,
    sellingPrice: 9.00,
    stockQuantity: 220,
    minStockThreshold: 30,
    expiryDate: "2027-10-10",
    rackShelfLocation: "Rack M-03",
    batchNumber: "MXP-2025-11",
    manufacturer: "Renata Limited"
  },
  {
    id: "med-tofen-syrup",
    name: "Tofen Syrup 100ml",
    genericName: "Ketotifen Fumarate",
    category: "Syrup",
    unit: "Bottle",
    purchaseRate: 45.00,
    sellingPrice: 60.00,
    stockQuantity: 65,
    minStockThreshold: 15,
    expiryDate: "2026-11-30",
    rackShelfLocation: "Shelf SY-02",
    batchNumber: "TFN-2024-03",
    manufacturer: "Beximco Pharmaceuticals Ltd."
  },
  {
    id: "med-ceftron-1g",
    name: "Ceftron 1g IV/IM",
    genericName: "Ceftriaxone Sodium",
    category: "Injection",
    unit: "Ampoule",
    purchaseRate: 135.00,
    sellingPrice: 175.00,
    stockQuantity: 40,
    minStockThreshold: 10,
    expiryDate: "2026-09-15",
    rackShelfLocation: "Cold Storage C-1",
    batchNumber: "CFT-2024-67",
    manufacturer: "Square Pharmaceuticals Ltd."
  },
  {
    id: "med-fexo-120",
    name: "Fexo 120mg",
    genericName: "Fexofenadine Hydrochloride",
    category: "Tablet",
    unit: "Box",
    purchaseRate: 7.50,
    sellingPrice: 10.00,
    stockQuantity: 160,
    minStockThreshold: 25,
    expiryDate: "2027-09-25",
    rackShelfLocation: "Rack F-02",
    batchNumber: "FXO-2025-05",
    manufacturer: "Square Pharmaceuticals Ltd."
  },
  {
    id: "med-alatrol-10",
    name: "Alatrol 10mg",
    genericName: "Cetirizine Dihydrochloride",
    category: "Tablet",
    unit: "Strip",
    purchaseRate: 2.50,
    sellingPrice: 3.50,
    stockQuantity: 300,
    minStockThreshold: 40,
    expiryDate: "2028-02-14",
    rackShelfLocation: "Rack A-02",
    batchNumber: "ALT-2025-18",
    manufacturer: "Square Pharmaceuticals Ltd."
  },
  {
    id: "med-clofenac-gel",
    name: "Clofenac Gel 20g",
    genericName: "Diclofenac Diethylamine",
    category: "Ointment",
    unit: "Tube",
    purchaseRate: 38.00,
    sellingPrice: 50.00,
    stockQuantity: 55,
    minStockThreshold: 15,
    expiryDate: "2027-07-22",
    rackShelfLocation: "Rack O-01",
    batchNumber: "CLF-2025-02",
    manufacturer: "Square Pharmaceuticals Ltd."
  }
];

export const POSTGRESQL_SCHEMA = `-- ==========================================================
-- PostgreSQL Database Schema: Medicine Items & Pricing Rates
-- Target Database: PostgreSQL 14+ / Supabase / Neon / Cloud SQL
-- ==========================================================

-- 1. Create Enums for Categories and Packaging Units
CREATE TYPE medicine_category AS ENUM (
    'Tablet',
    'Capsule',
    'Syrup',
    'Injection',
    'Ointment',
    'Drops',
    'Inhaler',
    'Other'
);

CREATE TYPE medicine_unit AS ENUM (
    'Strip',
    'Box',
    'Pcs',
    'Bottle',
    'Ampoule',
    'Tube',
    'Vial',
    'Canister'
);

-- 2. Create the Medicines Table
CREATE TABLE medicines (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    generic_name VARCHAR(150) NOT NULL,
    category medicine_category NOT NULL DEFAULT 'Tablet',
    unit medicine_unit NOT NULL DEFAULT 'Strip',
    purchase_rate NUMERIC(10, 2) NOT NULL CHECK (purchase_rate >= 0),
    selling_price NUMERIC(10, 2) NOT NULL CHECK (selling_price >= purchase_rate),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    min_stock_threshold INTEGER NOT NULL DEFAULT 15 CHECK (min_stock_threshold >= 0),
    expiry_date DATE NOT NULL,
    rack_shelf_location VARCHAR(80),
    batch_number VARCHAR(80),
    manufacturer VARCHAR(150),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Optimal Query Performance Indexes
CREATE INDEX idx_medicines_name ON medicines (name);
CREATE INDEX idx_medicines_generic_name ON medicines (generic_name);
CREATE INDEX idx_medicines_category ON medicines (category);
CREATE INDEX idx_medicines_unit ON medicines (unit);
CREATE INDEX idx_medicines_expiry_date ON medicines (expiry_date);
CREATE INDEX idx_medicines_stock_qty ON medicines (stock_quantity);

-- 4. Automatic 'updated_at' Timestamp Trigger
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_medicines_updated_at
BEFORE UPDATE ON medicines
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();
`;

export const PRISMA_SCHEMA = `// ==========================================================
// Prisma ORM Schema: Medicine Items & Pricing Rates
// Target ORM: Prisma 5+ with PostgreSQL / SQLite / MySQL
// ==========================================================

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum MedicineCategory {
  Tablet
  Capsule
  Syrup
  Injection
  Ointment
  Drops
  Inhaler
  Other
}

enum MedicineUnit {
  Strip
  Box
  Pcs
  Bottle
  Ampoule
  Tube
  Vial
  Canister
}

model Medicine {
  id                String           @id @default(cuid()) @db.VarChar(64)
  name              String           @db.VarChar(150)
  genericName       String           @map("generic_name") @db.VarChar(150)
  category          MedicineCategory @default(Tablet)
  unit              MedicineUnit     @default(Strip)
  purchaseRate      Decimal          @map("purchase_rate") @db.Decimal(10, 2)
  sellingPrice      Decimal          @map("selling_price") @db.Decimal(10, 2)
  stockQuantity     Int              @default(0) @map("stock_quantity")
  minStockThreshold Int              @default(15) @map("min_stock_threshold")
  expiryDate        DateTime         @map("expiry_date") @db.Date
  rackShelfLocation String?          @map("rack_shelf_location") @db.VarChar(80)
  batchNumber       String?          @map("batch_number") @db.VarChar(80)
  manufacturer      String?          @db.VarChar(150)
  isActive          Boolean          @default(true) @map("is_active")
  createdAt         DateTime         @default(now()) @map("created_at")
  updatedAt         DateTime         @updatedAt @map("updated_at")

  @@index([name])
  @@index([genericName])
  @@index([category])
  @@index([expiryDate])
  @@index([stockQuantity])
  @@map("medicines")
}
`;
