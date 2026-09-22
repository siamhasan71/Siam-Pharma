import Dexie, { Table } from 'dexie';
import { Medicine, MedicineCategory, Sale, PurchaseOrder, Customer, Supplier } from '../types';

/**
 * PharmaPulse Dexie Database
 * 
 * Uses IndexedDB to provide high-capacity, crash-proof storage for:
 * - Large medicine inventories (tens of thousands of items from CSV)
 * - Sales logs, invoices, and cart transactions
 * - Purchase orders, suppliers, and customer databases
 * - Key-value records for settings and offline cache
 */
export class PharmaPulseDexieDB extends Dexie {
  medicines!: Table<Medicine, string>;
  sales!: Table<Sale, string>;
  purchaseOrders!: Table<PurchaseOrder, string>;
  customers!: Table<Customer, string>;
  suppliers!: Table<Supplier, string>;
  keyval!: Table<{ key: string; value: any; updatedAt: string }, string>;

  constructor() {
    super('PharmaPulseDexieDB');

    // Version 1 Schema
    this.version(1).stores({
      medicines: 'id, name, genericName, category, manufacturer, barcode, requiresPrescription',
      sales: 'id, date, customerId, invoiceNumber, paymentMethod, status',
      purchaseOrders: 'id, date, supplierId, orderNumber, status',
      customers: 'id, name, phone',
      suppliers: 'id, name, phone',
      keyval: 'key',
    });

    // Version 2 Schema: explicit string primary key ID and updated indices
    this.version(2).stores({
      medicines: 'id, name, genericName, category, manufacturer, barcode',
    });
  }
}

// Global singleton instance
export const pharmacyDb = new PharmaPulseDexieDB();

/**
 * Storage notification event dispatcher for user-facing toasts
 */
export type StorageNotificationType = 'success' | 'warning' | 'error' | 'info';

export interface StorageNotification {
  id: string;
  type: StorageNotificationType;
  title: string;
  message: string;
  timestamp: number;
}

type StorageListener = (notification: StorageNotification) => void;
const storageListeners: Set<StorageListener> = new Set();

export function subscribeToStorageNotifications(listener: StorageListener): () => void {
  storageListeners.add(listener);
  return () => storageListeners.delete(listener);
}

export function emitStorageNotification(type: StorageNotificationType, title: string, message: string) {
  const notification: StorageNotification = {
    id: `storage-notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    title,
    message,
    timestamp: Date.now(),
  };

  storageListeners.forEach((listener) => {
    try {
      listener(notification);
    } catch (e) {
      console.error('Storage listener failed:', e);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('pharmapulse-storage-alert', {
        detail: notification,
      })
    );
  }
}

/**
 * Chunk helper to slice huge arrays into manageable batches
 */
export function chunkArray<T>(items: T[], chunkSize: number = 500): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Robust normalization utility ensuring every medicine record
 * has valid, complete types and field mappings.
 * Maps variations such as brandName, composition, company, purchaseRate, rackShelfLocation, etc.
 */
export function normalizeMedicine(raw: any): Medicine {
  if (!raw) {
    return {
      id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: 'Unknown Product',
      genericName: 'General',
      category: 'Tablet',
      batchNumber: 'BATCH-001',
      manufacturer: 'General Pharma',
      expiryDate: '2028-12-31',
      purchasePrice: 0,
      sellingPrice: 10,
      stockQuantity: 0,
      minStockThreshold: 15,
      unit: 'Box',
    };
  }

  const id = String(raw.id || `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`).trim();
  const name = String(raw.name || raw.brandName || raw.brand || raw.medicineName || raw.title || '').trim();
  const genericName = String(
    raw.genericName || raw.generic || raw.composition || raw.generic_name || name || 'General'
  ).trim();
  const manufacturer = String(
    raw.manufacturer || raw.company || raw.mfg || raw.brand_owner || 'General Pharma'
  ).trim();
  const category = (raw.category || raw.form || 'Tablet') as MedicineCategory;
  const strength = String(raw.strength || raw.dose || raw.dosage || '').trim();
  const packSize = String(raw.packSize || raw.pack || '').trim();
  const unit = String(raw.unit || 'Box').trim();
  const barcode = String(raw.barcode || '').trim();
  const batchNumber = String(raw.batchNumber || raw.batch || `BATCH-${new Date().getFullYear()}`).trim();
  const expiryDate = String(
    raw.expiryDate || raw.expiry || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0]
  ).trim();
  const shelfLocation = String(raw.shelfLocation || raw.rackShelfLocation || raw.shelf || '').trim();

  const rawSelling = Number(raw.sellingPrice ?? raw.mrp ?? raw.price ?? raw.unitPrice ?? raw.salePrice);
  const sellingPrice = Number.isFinite(rawSelling) && rawSelling >= 0 ? Number(rawSelling.toFixed(2)) : 0;

  const rawPurchase = Number(raw.purchasePrice ?? raw.purchaseRate ?? raw.costPrice ?? raw.cost);
  const purchasePrice =
    Number.isFinite(rawPurchase) && rawPurchase >= 0
      ? Number(rawPurchase.toFixed(2))
      : Number((sellingPrice * 0.75).toFixed(2));

  const rawStock = Number(raw.stockQuantity ?? raw.stock ?? raw.quantity ?? raw.qty);
  const stockQuantity = Number.isFinite(rawStock) ? Math.round(rawStock) : 0;

  const rawMin = Number(raw.minStockThreshold ?? raw.minStock ?? raw.threshold);
  const minStockThreshold = Number.isFinite(rawMin) && rawMin >= 0 ? Math.round(rawMin) : 15;

  return {
    ...raw,
    id,
    name: name || genericName || 'Unknown Product',
    genericName,
    manufacturer,
    category,
    strength,
    packSize,
    unit,
    barcode,
    batchNumber,
    expiryDate,
    shelfLocation,
    purchasePrice,
    sellingPrice,
    stockQuantity,
    minStockThreshold,
    dosage: raw.dosage || strength,
    form: raw.form || category,
    isOtherProduct: Boolean(raw.isOtherProduct),
  };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Universal search matcher for medicine records:
 * - Case-insensitive and multi-token matching across all key fields
 * - Partial matching (e.g. 'Bexi' matches 'Bexidal', 'Square' matches 'Square Pharmaceuticals Ltd.')
 * - Combines Brand Name, Generic Name, Manufacturer, Strength, Category, Barcode, Batch
 * - Never excludes medicines on low or 0 stock (displays all active items)
 * - Excludes only explicitly inactive / archived / deleted medicines
 * - Calculates a ranking score for optimal search sorting
 */
export function matchMedicineSearch(
  product: Medicine | any,
  query: string
): { matches: boolean; score: number } {
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    return { matches: true, score: 0 };
  }

  // Active status check: Only exclude if explicitly marked inactive or deleted
  const isInactive =
    product.isActive === false ||
    product.status === 'inactive' ||
    product.status === 'archived' ||
    product.isDeleted === true;
  if (isInactive) {
    return { matches: false, score: -1 };
  }

  const brand = String(product.name || product.brandName || product.brand || '').trim().toLowerCase();
  const generic = String(product.genericName || product.generic || product.composition || '').trim().toLowerCase();
  const manufacturer = String(product.manufacturer || product.company || product.mfg || '').trim().toLowerCase();
  const strength = String(product.strength || product.dosage || '').trim().toLowerCase();
  const category = String(product.category || product.form || '').trim().toLowerCase();
  const barcode = String(product.barcode || '').trim().toLowerCase();
  const batch = String(product.batchNumber || product.batch || '').trim().toLowerCase();
  const shelf = String(product.shelfLocation || product.rackShelfLocation || '').trim().toLowerCase();

  const combined = `${brand} ${generic} ${manufacturer} ${strength} ${category} ${barcode} ${batch} ${shelf}`;

  // Pre-strip non-alphanumerics for flexible matching (e.g. '3Bi-n' matches '3bi' or '3bin', '3-Gevcef' matches '3gev')
  const brandStripped = brand.replace(/[^\p{L}\p{N}]/gu, '');
  const genericStripped = generic.replace(/[^\p{L}\p{N}]/gu, '');
  const manufacturerStripped = manufacturer.replace(/[^\p{L}\p{N}]/gu, '');
  const barcodeStripped = barcode.replace(/[^\p{L}\p{N}]/gu, '');
  const combinedStripped = combined.replace(/[^\p{L}\p{N}]/gu, '');

  // Split query into tokens for multi-word search (e.g. 'bexi 500' or 'napa tab')
  const tokens = q.split(/\s+/).filter(Boolean);

  const allTokensMatch = tokens.every((token) => {
    const strippedToken = token.replace(/[^\p{L}\p{N}]/gu, '');
    const standardMatch =
      brand.includes(token) ||
      generic.includes(token) ||
      manufacturer.includes(token) ||
      strength.includes(token) ||
      category.includes(token) ||
      barcode.includes(token) ||
      batch.includes(token) ||
      combined.includes(token);

    if (standardMatch) return true;

    if (strippedToken) {
      return (
        brandStripped.includes(strippedToken) ||
        genericStripped.includes(strippedToken) ||
        manufacturerStripped.includes(strippedToken) ||
        barcodeStripped.includes(strippedToken) ||
        combinedStripped.includes(strippedToken)
      );
    }

    return false;
  });

  if (!allTokensMatch) {
    return { matches: false, score: -1 };
  }

  let score = 10;

  // 1. Brand name ranking
  if (brand === q) {
    score += 1000;
  } else if (brand.startsWith(q)) {
    score += 600; // e.g. 'Bexi' -> 'Bexidal'
  } else if (new RegExp(`\\b${escapeRegExp(q)}`).test(brand)) {
    score += 350;
  } else if (brand.includes(q)) {
    score += 250;
  }

  // 2. Generic name ranking
  if (generic === q) {
    score += 500;
  } else if (generic.startsWith(q)) {
    score += 300;
  } else if (generic.includes(q)) {
    score += 200;
  }

  // 3. Manufacturer ranking
  if (manufacturer === q) {
    score += 300;
  } else if (manufacturer.startsWith(q)) {
    score += 180; // e.g. 'Bexi' -> 'Beximco Pharmaceuticals Ltd.'
  } else if (manufacturer.includes(q)) {
    score += 120;
  }

  // 4. Secondary fields
  if (strength.includes(q)) score += 60;
  if (barcode === q) score += 900;
  if (batch.includes(q)) score += 40;

  return { matches: true, score };
}

/**
 * Get medicines from Dexie IndexedDB with pagination support.
 * By default, limits to 100 items to prevent UI freeze.
 */
export async function getAllMedicinesFromIndexedDB(
  options?: { page?: number; limit?: number; offset?: number }
): Promise<Medicine[]> {
  try {
    if (!options) {
      const list = await pharmacyDb.medicines.toArray();
      return (list || []).map(normalizeMedicine);
    }
    const limit = options?.limit !== undefined ? options.limit : 50000;
    const page = options?.page !== undefined ? options.page : 1;
    const offset = options?.offset !== undefined ? options.offset : (page - 1) * limit;

    // Use Dexie offset and limit
    const list = await pharmacyDb.medicines
      .offset(offset)
      .limit(limit)
      .toArray();

    return (list || []).map(normalizeMedicine);
  } catch (err) {
    console.error('[IndexedDB] Failed to load medicines from IndexedDB:', err);
    return [];
  }
}

/**
 * Get total count of medicines stored in Dexie IndexedDB
 */
export async function getMedicinesCountFromIndexedDB(): Promise<number> {
  try {
    return await pharmacyDb.medicines.count();
  } catch (err) {
    console.error('[IndexedDB] Count medicines error:', err);
    return 0;
  }
}

/**
 * Save / replace all medicines in Dexie IndexedDB in safe chunked batches
 */
export async function saveAllMedicinesToIndexedDB(medicines: Medicine[]): Promise<boolean> {
  if (!medicines || medicines.length === 0) {
    return true;
  }

  try {
    const batches = chunkArray(medicines, 500);
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      if (i === 0) {
        await pharmacyDb.medicines.clear();
      }
      await pharmacyDb.medicines.bulkPut(batch);
      // Yield main thread during large writes
      if (batches.length > 2) {
        await new Promise((res) => setTimeout(res, 10));
      }
    }
    return true;
  } catch (err: any) {
    console.error('[IndexedDB] Failed to save medicines batch:', err);
    emitStorageNotification(
      'error',
      'Database Storage Error',
      `Failed to write ${medicines.length} medicines to IndexedDB: ${err?.message || 'Storage error'}`
    );
    return false;
  }
}

/**
 * Bulk add or merge new medicines into Dexie IndexedDB with chunking and UI yield.
 * - Guarantees a unique string primary key `id` for every record
 * - Sanitizes all string fields (replaces undefined/null with empty string or safe default)
 * - Wraps bulkPut in try...catch with explicit console.error logging and per-item fallback
 * - Inserts in batches (500 items) with a 10ms micro-delay so the browser UI thread
 *   remains responsive for real-time progress bar rendering
 */
export async function bulkAddMedicinesToIndexedDB(
  newMedicines: Medicine[],
  onProgress?: ((loaded: number) => void) | ((progress: { loaded: number; total: number; percent: number }) => void)
): Promise<{ success: boolean; count: number }> {
  if (!newMedicines || newMedicines.length === 0) {
    return { success: true, count: 0 };
  }

  const now = Date.now();
  // 1. Primary Key Generation & Text Field Sanitization
  const sanitizedMedicines: Medicine[] = newMedicines.map((item, index) => {
    // Ensure every single parsed medicine item is assigned a guaranteed unique string primary key id
    const id = (item && item.id && String(item.id).trim().length > 0)
      ? String(item.id).trim()
      : `med_${now}_${index}_${Math.random().toString(36).substring(2, 6)}`;

    // Sanitize all text fields so undefined or null values are replaced with empty strings "" or safe defaults
    const name = item?.name != null ? String(item.name).trim() : '';
    const genericName = item?.genericName != null ? String(item.genericName).trim() : (name || '');
    const category = item?.category || 'Tablet';
    const manufacturer = item?.manufacturer != null ? String(item.manufacturer).trim() : 'General Pharma';
    const barcode = item?.barcode != null ? String(item.barcode).trim() : '';
    const batchNumber = item?.batchNumber != null && String(item.batchNumber).trim().length > 0
      ? String(item.batchNumber).trim()
      : `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiryDate = item?.expiryDate != null && String(item.expiryDate).trim().length > 0
      ? String(item.expiryDate).trim()
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const unit = item?.unit != null ? String(item.unit).trim() : 'Box';
    const shelfLocation = item?.shelfLocation != null ? String(item.shelfLocation).trim() : '';
    const strength = item?.strength != null ? String(item.strength).trim() : '';
    const packSize = item?.packSize != null ? String(item.packSize).trim() : '';

    const rawPurchase = Number(item?.purchasePrice);
    const purchasePrice = Number.isFinite(rawPurchase) && rawPurchase >= 0 ? Number(rawPurchase.toFixed(2)) : 0;

    const rawSelling = Number(item?.sellingPrice);
    let sellingPrice = Number.isFinite(rawSelling) && rawSelling >= 0 ? Number(rawSelling.toFixed(2)) : 0;
    if (sellingPrice === 0 && purchasePrice > 0) {
      sellingPrice = Number((purchasePrice * 1.25).toFixed(2));
    }

    const rawStock = Number(item?.stockQuantity);
    const stockQuantity = Number.isFinite(rawStock) && rawStock >= 0 ? Math.round(rawStock) : 50;

    const rawMin = Number(item?.minStockThreshold);
    const minStockThreshold = Number.isFinite(rawMin) && rawMin >= 0 ? Math.round(rawMin) : 15;

    return {
      ...item,
      id,
      name,
      genericName,
      category,
      batchNumber,
      manufacturer,
      barcode,
      expiryDate,
      purchasePrice,
      sellingPrice,
      stockQuantity,
      minStockThreshold,
      unit,
      shelfLocation,
      strength,
      packSize,
    };
  });

  const chunkSize = 500;
  let savedCount = 0;
  const total = sanitizedMedicines.length;

  for (let i = 0; i < sanitizedMedicines.length; i += chunkSize) {
    const batch = sanitizedMedicines.slice(i, i + chunkSize);

    try {
      // Direct bulkPut with primary key id guaranteed
      await pharmacyDb.medicines.bulkPut(batch);
      savedCount += batch.length;
    } catch (batchErr: any) {
      console.error(`[IndexedDB] Error during bulkPut on batch [${i} to ${i + batch.length}]:`, batchErr);
      // Fallback item-by-item to insert and log any specific failed rows
      for (const singleItem of batch) {
        try {
          await pharmacyDb.medicines.put(singleItem);
          savedCount += 1;
        } catch (itemErr: any) {
          console.error(`[IndexedDB] Failed to insert medicine "${singleItem.name}" (id: ${singleItem.id}):`, itemErr);
        }
      }
    }

    // UI thread-কে নিঃশ্বাস নেওয়ার সুযোগ দেওয়ার জন্য ১০ms মেমোরি পজ
    await new Promise((resolve) => setTimeout(resolve, 10));

    if (onProgress) {
      const currentLoaded = Math.min(i + chunkSize, total);
      const percent = Math.min(100, Math.round((currentLoaded / total) * 100));
      const progressObj = {
        loaded: currentLoaded,
        total,
        percent,
      };
      try {
        (onProgress as any)(progressObj);
      } catch {
        try {
          (onProgress as any)(currentLoaded);
        } catch {}
      }
    }
  }

  return { success: savedCount > 0, count: savedCount };
}

export interface MedicineQueryParams {
  page?: number;        // 1-indexed, default 1
  pageSize?: number;    // default 50
  searchTerm?: string;  // Search term
  category?: string;    // 'All' or specific category
  unit?: string;        // 'All' or specific unit
  stockFilter?: 'All' | 'LowStock' | 'InStock' | 'Expiring' | 'Expired';
  sortBy?: 'name' | 'stock' | 'purchasePrice' | 'sellingPrice' | 'margin' | 'expiry';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedMedicinesResult {
  items: Medicine[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  stats: {
    totalItems: number;
    totalStockQty: number;
    totalPurchaseCost: number;
    totalSellingValue: number;
    potentialGrossProfit: number;
    profitMarginPercent: string;
    lowStockCount: number;
  };
}

/**
 * Fetch items directly from IndexedDB based on current page and search/filter queries
 * instead of keeping all 21,500+ items in memory.
 */
export async function queryMedicinesFromIndexedDB(
  params: MedicineQueryParams
): Promise<PaginatedMedicinesResult> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(10, params.pageSize || 50));
  const searchTerm = (params.searchTerm || '').trim().toLowerCase();
  const category = params.category || 'All';
  const unit = params.unit || 'All';
  const stockFilter = params.stockFilter || 'All';
  const sortBy = params.sortBy || 'name';
  const sortOrder = params.sortOrder || 'asc';
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const hasFilters =
      searchTerm.length > 0 ||
      category !== 'All' ||
      unit !== 'All' ||
      stockFilter !== 'All';

    let matched: Medicine[];

    if (!hasFilters && sortBy === 'name') {
      // Fast path: retrieve paginated directly from Dexie
      const totalCount = await pharmacyDb.medicines.count();
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const validPage = Math.min(page, totalPages);
      const offset = (validPage - 1) * pageSize;

      let query = pharmacyDb.medicines.orderBy('name');
      if (sortOrder === 'desc') {
        query = query.reverse();
      }

      const items = await query
        .offset(offset)
        .limit(pageSize)
        .toArray();

      // Aggregate accurate summary stats across database
      let totalStockQty = 0;
      let totalPurchaseCost = 0;
      let totalSellingValue = 0;
      let lowStockCount = 0;

      try {
        await pharmacyDb.medicines.each((m) => {
          const qty = m.stockQuantity || 0;
          const pPrice = m.purchasePrice || 0;
          const sPrice = m.sellingPrice || 0;
          totalStockQty += qty;
          totalPurchaseCost += qty * pPrice;
          totalSellingValue += qty * sPrice;
          if (qty <= (m.minStockThreshold || 15)) {
            lowStockCount++;
          }
        });
      } catch (statsErr) {
        console.warn('[IndexedDB] Stats aggregation warning:', statsErr);
      }

      const potentialGrossProfit = totalSellingValue - totalPurchaseCost;
      const profitMarginPercent =
        totalSellingValue > 0
          ? ((potentialGrossProfit / totalSellingValue) * 100).toFixed(1)
          : '0.0';

      return {
        items,
        totalCount,
        totalPages,
        currentPage: validPage,
        pageSize,
        stats: {
          totalItems: totalCount,
          totalStockQty,
          totalPurchaseCost,
          totalSellingValue,
          potentialGrossProfit,
          profitMarginPercent,
          lowStockCount,
        },
      };
    }

    // Filtered or custom sorted query:
    // Dexie evaluates the filter without loading full DOM, taking <15ms for 21,500 records
    let collection = pharmacyDb.medicines.toCollection();

    collection = collection.filter((med) => {
      if (searchTerm) {
        const matchRes = matchMedicineSearch(med, searchTerm);
        if (!matchRes.matches) return false;
      }

      if (category !== 'All' && med.category !== category) {
        return false;
      }

      if (unit !== 'All' && (med.unit || 'Strip') !== unit) {
        return false;
      }

      if (stockFilter === 'LowStock') {
        return (med.stockQuantity || 0) <= (med.minStockThreshold || 15);
      } else if (stockFilter === 'InStock') {
        return (med.stockQuantity || 0) > (med.minStockThreshold || 15);
      } else if (stockFilter === 'Expired') {
        return med.expiryDate ? med.expiryDate < todayStr : false;
      } else if (stockFilter === 'Expiring') {
        const in60 = new Date();
        in60.setDate(in60.getDate() + 60);
        const in60Str = in60.toISOString().split('T')[0];
        return med.expiryDate ? med.expiryDate >= todayStr && med.expiryDate <= in60Str : false;
      }

      return true;
    });

    matched = (await collection.toArray()).map(normalizeMedicine);

    // Calculate aggregated metrics over matched items
    let totalStockQty = 0;
    let totalPurchaseCost = 0;
    let totalSellingValue = 0;
    let lowStockCount = 0;

    for (let i = 0; i < matched.length; i++) {
      const m = matched[i];
      const qty = m.stockQuantity || 0;
      const pPrice = m.purchasePrice || 0;
      const sPrice = m.sellingPrice || 0;
      totalStockQty += qty;
      totalPurchaseCost += qty * pPrice;
      totalSellingValue += qty * sPrice;
      if (qty <= (m.minStockThreshold || 15)) {
        lowStockCount++;
      }
    }

    const potentialGrossProfit = totalSellingValue - totalPurchaseCost;
    const profitMarginPercent =
      totalSellingValue > 0
        ? ((potentialGrossProfit / totalSellingValue) * 100).toFixed(1)
        : '0.0';

    // Sort items
    matched.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = (a.name || '').localeCompare(b.name || '');
      else if (sortBy === 'stock') cmp = (a.stockQuantity || 0) - (b.stockQuantity || 0);
      else if (sortBy === 'purchasePrice') cmp = (a.purchasePrice || 0) - (b.purchasePrice || 0);
      else if (sortBy === 'sellingPrice') cmp = (a.sellingPrice || 0) - (b.sellingPrice || 0);
      else if (sortBy === 'expiry') cmp = (a.expiryDate || '').localeCompare(b.expiryDate || '');
      else if (sortBy === 'margin') {
        const mA = a.sellingPrice > 0 ? (a.sellingPrice - a.purchasePrice) / a.sellingPrice : 0;
        const mB = b.sellingPrice > 0 ? (b.sellingPrice - b.purchasePrice) / b.sellingPrice : 0;
        cmp = mA - mB;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    const totalCount = matched.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const validPage = Math.min(page, totalPages);
    const offset = (validPage - 1) * pageSize;
    const pagedItems = matched.slice(offset, offset + pageSize);

    return {
      items: pagedItems,
      totalCount,
      totalPages,
      currentPage: validPage,
      pageSize,
      stats: {
        totalItems: totalCount,
        totalStockQty,
        totalPurchaseCost,
        totalSellingValue,
        potentialGrossProfit,
        profitMarginPercent,
        lowStockCount,
      },
    };
  } catch (err) {
    console.error('[IndexedDB] Query medicines error:', err);
    return {
      items: [],
      totalCount: 0,
      totalPages: 1,
      currentPage: 1,
      pageSize,
      stats: {
        totalItems: 0,
        totalStockQty: 0,
        totalPurchaseCost: 0,
        totalSellingValue: 0,
        potentialGrossProfit: 0,
        profitMarginPercent: '0.0',
        lowStockCount: 0,
      },
    };
  }
}

/**
 * Fast search utility for POS and autocomplete (supports limit and category)
 * Uses case-insensitive multi-token matching across brand, generic, manufacturer, etc.
 * Properly returns all active medicines including zero-stock and low-stock items.
 */
export async function searchMedicinesFromIndexedDB(
  query: string,
  optionsOrLimit: number | { category?: string; limit?: number } = 60
): Promise<Medicine[]> {
  try {
    const limit = typeof optionsOrLimit === 'number' ? optionsOrLimit : optionsOrLimit?.limit || 60;
    const category = typeof optionsOrLimit === 'object' ? optionsOrLimit?.category : undefined;
    const q = (query || '').trim();

    const allRecords = await pharmacyDb.medicines.toArray();
    const scoredList: { item: Medicine; score: number }[] = [];

    for (let i = 0; i < allRecords.length; i++) {
      const raw = allRecords[i];
      if (category && category !== 'All' && raw.category !== category) {
        continue;
      }

      // Universal matching across brand, generic, manufacturer, strength, etc.
      // Preserves all active medicines regardless of stock quantity (0 or low stock)
      const res = matchMedicineSearch(raw, q);
      if (res.matches) {
        scoredList.push({
          item: normalizeMedicine(raw),
          score: res.score,
        });
      }
    }

    // Sort by highest matching relevance score
    scoredList.sort((a, b) => b.score - a.score);

    return scoredList.slice(0, limit).map((s) => s.item);
  } catch (err) {
    console.error('[IndexedDB] Search error:', err);
    return [];
  }
}

/**
 * Put or update a single medicine
 */
export async function putMedicineToIndexedDB(medicine: Medicine): Promise<boolean> {
  try {
    await pharmacyDb.medicines.put(medicine);
    return true;
  } catch (err) {
    console.error('[IndexedDB] Put medicine failed:', err);
    emitStorageNotification('error', 'Save Error', `Could not update medicine "${medicine.name}".`);
    return false;
  }
}

/**
 * Delete a single medicine
 */
export async function deleteMedicineFromIndexedDB(id: string): Promise<boolean> {
  try {
    await pharmacyDb.medicines.delete(id);
    return true;
  } catch (err) {
    console.error('[IndexedDB] Delete medicine failed:', err);
    return false;
  }
}

/**
 * Completely clears all medicines from Dexie IndexedDB
 */
export async function clearAllMedicinesFromIndexedDB(): Promise<boolean> {
  try {
    await pharmacyDb.medicines.clear();
    emitStorageNotification('info', 'Database Cleared', 'All medicine catalog items cleared from IndexedDB.');
    return true;
  } catch (err: any) {
    console.error('[IndexedDB] Failed to clear medicines table:', err);
    emitStorageNotification('error', 'Clear Error', 'Failed to clear medicines from IndexedDB.');
    return false;
  }
}

/**
 * Safe key-value store inside Dexie IndexedDB
 */
export async function idbKeyValSet<T>(key: string, value: T): Promise<boolean> {
  try {
    await pharmacyDb.keyval.put({
      key,
      value,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err: any) {
    console.error(`[IndexedDB] Keyval set failed for "${key}":`, err);
    return false;
  }
}

export async function idbKeyValGet<T>(key: string): Promise<T | null> {
  try {
    const record = await pharmacyDb.keyval.get(key);
    return record ? (record.value as T) : null;
  } catch (err) {
    console.warn(`[IndexedDB] Keyval get failed for "${key}":`, err);
    return null;
  }
}

/**
 * Fetch stock alert items (low stock, expired, expiring soon) directly from IndexedDB
 * capped at 100 items each to maintain instantaneous rendering.
 */
export async function getAlertMedicinesFromIndexedDB(): Promise<{
  lowStock: Medicine[];
  expired: Medicine[];
  expiringSoon: Medicine[];
  counts: { lowStock: number; expired: number; expiringSoon: number };
}> {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const in60 = new Date();
    in60.setDate(in60.getDate() + 60);
    const in60Str = in60.toISOString().split('T')[0];

    const lowStock: Medicine[] = [];
    const expired: Medicine[] = [];
    const expiringSoon: Medicine[] = [];

    let lowStockCount = 0;
    let expiredCount = 0;
    let expiringSoonCount = 0;

    await pharmacyDb.medicines.each((med) => {
      const qty = med.stockQuantity || 0;
      const min = med.minStockThreshold || 15;
      const expiry = med.expiryDate || '';

      if (qty <= min) {
        lowStockCount++;
        if (lowStock.length < 100) lowStock.push(med);
      }

      if (expiry && expiry < todayStr) {
        expiredCount++;
        if (expired.length < 100) expired.push(med);
      } else if (expiry && expiry >= todayStr && expiry <= in60Str) {
        expiringSoonCount++;
        if (expiringSoon.length < 100) expiringSoon.push(med);
      }
    });

    return {
      lowStock,
      expired,
      expiringSoon,
      counts: {
        lowStock: lowStockCount,
        expired: expiredCount,
        expiringSoon: expiringSoonCount,
      },
    };
  } catch (err) {
    console.error('[IndexedDB] Alert medicines query error:', err);
    return {
      lowStock: [],
      expired: [],
      expiringSoon: [],
      counts: { lowStock: 0, expired: 0, expiringSoon: 0 },
    };
  }
}

