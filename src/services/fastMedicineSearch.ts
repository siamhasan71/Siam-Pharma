import { Medicine } from '../types';

export interface FastSearchOptions {
  category?: string;
  limit?: number;
  requireStock?: boolean;
}

export const normalizeText = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  return val.toString().toLowerCase().trim();
};

export const stripSpecialChars = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  try {
    return val
      .toString()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, '');
  } catch {
    return val
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }
};

/**
 * Super lightweight, non-blocking search helper.
 * Zero external indexing engines, zero background loops, and zero memory overhead.
 */
export function fastSearchMedicines(
  query: string,
  options: FastSearchOptions = {},
  medicinesList: Medicine[] = []
): Medicine[] {
  const { category, limit, requireStock = false } = options;
  const rawQuery = normalizeText(query);

  let list = medicinesList || [];
  if (category && category !== 'All') {
    list = list.filter((m) => m.category === category);
  }

  if (requireStock) {
    list = list.filter((m) => Number(m.stockQuantity) > 0);
  }

  if (!rawQuery) {
    return limit ? list.slice(0, limit) : list;
  }

  const strippedQuery = stripSpecialChars(rawQuery);

  const results = list.filter((item) => {
    if (!item) return false;

    const name = normalizeText(item.name);
    const brandName = normalizeText((item as any).brandName || (item as any).brand);
    const genericName = normalizeText(item.genericName || (item as any).generic);
    const barcode = normalizeText(item.barcode);
    const manufacturer = normalizeText(item.manufacturer);
    const strength = normalizeText(item.strength);

    // Standard substring match
    if (
      (name && name.includes(rawQuery)) ||
      (brandName && brandName.includes(rawQuery)) ||
      (genericName && genericName.includes(rawQuery)) ||
      (barcode && barcode.includes(rawQuery)) ||
      (manufacturer && manufacturer.includes(rawQuery)) ||
      (strength && strength.includes(rawQuery))
    ) {
      return true;
    }

    // Stripped non-alphanumeric match (handles '3Bi-n' matching '3bi' or '3bin', '3-Gevcef' matching '3gev', etc.)
    if (strippedQuery) {
      const strippedName = stripSpecialChars(item.name);
      const strippedBrandName = stripSpecialChars((item as any).brandName || (item as any).brand);
      const strippedGeneric = stripSpecialChars(item.genericName || (item as any).generic);
      const strippedBarcode = stripSpecialChars(item.barcode);
      const strippedMfg = stripSpecialChars(item.manufacturer);
      const strippedStrength = stripSpecialChars(item.strength);

      if (
        (strippedName && strippedName.includes(strippedQuery)) ||
        (strippedBrandName && strippedBrandName.includes(strippedQuery)) ||
        (strippedGeneric && strippedGeneric.includes(strippedQuery)) ||
        (strippedBarcode && strippedBarcode.includes(strippedQuery)) ||
        (strippedMfg && strippedMfg.includes(strippedQuery)) ||
        (strippedStrength && strippedStrength.includes(strippedQuery))
      ) {
        return true;
      }
    }

    return false;
  });

  return limit ? results.slice(0, limit) : results;
}

// Safe no-op functions to eliminate heavy indexing and avoid runtime crashes
export async function preloadMedicineSearchIndex(): Promise<void> {
  return Promise.resolve();
}

export function addOrUpdateMedicineInSearchIndex(_rawMed?: any): void {
  // Safe no-op
}

export function removeMedicineFromSearchIndex(_id?: string): void {
  // Safe no-op
}

export function getAllPreloadedMedicines(): Medicine[] {
  return [];
}

export function isSearchIndexPreloaded(): boolean {
  return true;
}
