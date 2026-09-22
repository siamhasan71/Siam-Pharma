import Papa from 'papaparse';
import { Medicine, MedicineCategory } from '../types';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface ParsedCsvResult {
  medicines: Array<Omit<Medicine, 'id'>>;
  errors: string[];
  totalRowsCount: number;
}

/**
 * Validates the uploaded file object before any parsing or state updates
 */
export function validateCsvFile(file: unknown): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'No file was provided for upload.' };
  }

  if (!(file instanceof File)) {
    return { valid: false, error: 'Invalid file object received.' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The selected CSV file is empty (0 bytes). Please choose a valid spreadsheet.' };
  }

  // Max 20MB limit to prevent browser memory freezing
  const maxBytes = 20 * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: 'The CSV file exceeds the 20MB maximum size limit.' };
  }

  const fileName = (file.name || '').toLowerCase();
  const isCsvExtension = fileName.endsWith('.csv');
  const allowedMimeTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'text/plain',
    'application/csv',
    'text/x-csv',
    'application/x-csv',
    'text/comma-separated-values',
    'text/x-comma-separated-values',
  ];

  const hasAllowedMime = !file.type || allowedMimeTypes.includes(file.type.toLowerCase());

  if (!isCsvExtension && !hasAllowedMime) {
    return {
      valid: false,
      error: 'Invalid file format. Please upload a standard Comma Separated Values (.csv) file.',
    };
  }

  return { valid: true };
}

/**
 * Normalizes raw string to a valid MedicineCategory
 */
function normalizeCategory(rawCategory: unknown): MedicineCategory {
  if (typeof rawCategory !== 'string' || !rawCategory.trim()) {
    return 'Tablet';
  }
  const clean = rawCategory.trim().toLowerCase();
  if (clean.includes('tablet') || clean.includes('tab')) return 'Tablet';
  if (clean.includes('capsule') || clean.includes('cap')) return 'Capsule';
  if (clean.includes('syrup') || clean.includes('suspension') || clean.includes('syr') || clean.includes('liquid'))
    return 'Syrup';
  if (clean.includes('injection') || clean.includes('inj') || clean.includes('vial') || clean.includes('ampoule'))
    return 'Injection';
  if (clean.includes('ointment') || clean.includes('cream') || clean.includes('gel')) return 'Ointment';
  if (clean.includes('drop') || clean.includes('eye') || clean.includes('ear') || clean.includes('nasal'))
    return 'Drops';
  if (clean.includes('inhaler') || clean.includes('resp') || clean.includes('rotacap')) return 'Inhaler';
  return 'Other';
}

/**
 * Normalizes and guarantees a valid YYYY-MM-DD date string
 */
function normalizeExpiryDate(rawDate: unknown): string {
  const defaultFutureDate = (): string => {
    const d = new Date();
    d.setMonth(d.getMonth() + 18);
    return d.toISOString().split('T')[0];
  };

  if (typeof rawDate !== 'string' || !rawDate.trim()) {
    return defaultFutureDate();
  }

  const clean = rawDate.trim();

  // If already standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // MM/YYYY
  const myMatch = clean.match(/^(\d{1,2})[/-](\d{4})$/);
  if (myMatch) {
    const month = myMatch[1].padStart(2, '0');
    const year = myMatch[2];
    return `${year}-${month}-28`;
  }

  // Try standard timestamp parse
  try {
    const parsed = Date.parse(clean);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().split('T')[0];
    }
  } catch {
    // ignore
  }

  return defaultFutureDate();
}

/**
 * Safe numeric extraction with absolute default fallback
 */
function safeNumber(val: unknown, fallback: number = 0): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? Math.max(0, Number(val.toFixed(2))) : fallback;
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? Math.max(0, Number(num.toFixed(2))) : fallback;
  }
  return fallback;
}

/**
 * Safe integer extraction with absolute default fallback
 */
function safeInteger(val: unknown, fallback: number = 0): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? Math.max(0, Math.round(val)) : fallback;
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9-]/g, '');
    const num = parseInt(cleaned, 10);
    return Number.isFinite(num) ? Math.max(0, num) : fallback;
  }
  return fallback;
}

/**
 * Main CSV parsing function using standard PapaParse with try...catch
 * and guaranteed default fallbacks on EVERY row.
 */
export function parseMedicinesFromCSV(csvText: string): ParsedCsvResult {
  const result: ParsedCsvResult = {
    medicines: [],
    errors: [],
    totalRowsCount: 0,
  };

  try {
    if (!csvText || typeof csvText !== 'string' || !csvText.trim()) {
      result.errors.push('The uploaded CSV file is empty or does not contain readable text.');
      return result;
    }

    // Strip BOM (\uFEFF) if present
    let cleanText = csvText;
    if (cleanText.charCodeAt(0) === 0xfeff) {
      cleanText = cleanText.slice(1);
    }

    // Parse using standard PapaParse
    const parsed = Papa.parse<string[]>(cleanText, {
      skipEmptyLines: 'greedy',
      header: false,
    });

    if (parsed.errors && parsed.errors.length > 0) {
      parsed.errors.forEach((err) => {
        if (err.message) {
          result.errors.push(`CSV format warning at row ${err.row ?? '?'}: ${err.message}`);
        }
      });
    }

    const allRows = parsed.data || [];
    if (allRows.length === 0) {
      result.errors.push('No data rows found in the CSV file.');
      return result;
    }

    // First row as headers
    const rawHeaders = allRows[0] || [];
    const headers = rawHeaders.map((h) => String(h || '').trim());
    const dataRows = allRows.slice(1);
    result.totalRowsCount = dataRows.length;

    if (dataRows.length === 0) {
      result.errors.push('The CSV file contains a header row, but no medicine data rows were found.');
      return result;
    }

    // Find column index via alias mapping
    const findIndex = (aliases: string[]): number => {
      return headers.findIndex((h) => {
        const normalized = h.toLowerCase().replace(/[\s_\-#.]+/g, '');
        return aliases.some((alias) => normalized.includes(alias.toLowerCase().replace(/[\s_\-#.]+/g, '')));
      });
    };

    const nameIdx = findIndex(['medicinename', 'productname', 'brandname', 'itemname', 'name', 'title', 'product']);
    const genericIdx = findIndex(['genericname', 'generic', 'composition', 'molecule', 'salt']);
    const categoryIdx = findIndex(['category', 'form', 'dosageform', 'type']);
    const batchIdx = findIndex(['batchnumber', 'batchno', 'batch', 'lotnumber', 'lot', 'lotno']);
    const manufacturerIdx = findIndex(['manufacturer', 'company', 'brand', 'pharma', 'supplier', 'maker', 'mfg']);
    const expiryIdx = findIndex(['expirydate', 'expiry', 'expdate', 'expiration', 'validity', 'exp']);
    const purchasePriceIdx = findIndex(['purchaseprice', 'costprice', 'purchase', 'cost', 'buyprice', 'unitcost', 'rate']);
    const sellingPriceIdx = findIndex(['sellingprice', 'saleprice', 'retailprice', 'price', 'mrp', 'salesrate', 'unitprice']);
    const stockIdx = findIndex(['stockquantity', 'quantity', 'stock', 'qty', 'units', 'currentstock', 'inventory']);
    const minStockIdx = findIndex(['minthreshold', 'minstockthreshold', 'minstock', 'min_threshold', 'reorderlevel', 'alertlevel']);
    const unitIdx = findIndex(['unit', 'packsize', 'packaging', 'pack', 'uom']);
    const strengthIdx = findIndex(['strength', 'power', 'dosage', 'potency', 'mg']);
    const shelfIdx = findIndex(['shelflocation', 'shelf', 'location', 'rack', 'cabinet']);

    // If no header matches, check if index 0 has valid medicine names
    const effectiveNameIdx = nameIdx !== -1 ? nameIdx : 0;

    dataRows.forEach((row, rowIndex) => {
      try {
        if (!Array.isArray(row) || row.length === 0) return;

        // Extract raw strings with safe bounds
        const getVal = (idx: number): string => {
          if (idx < 0 || idx >= row.length) return '';
          return String(row[idx] ?? '').trim();
        };

        const rawName = getVal(effectiveNameIdx);
        // Skip purely blank rows
        if (!rawName && row.every((c) => !String(c || '').trim())) {
          return;
        }

        const name = rawName || `Medicine Row ${rowIndex + 1}`;
        const rawGeneric = genericIdx !== -1 ? getVal(genericIdx) : '';
        const genericName = rawGeneric || name;

        const rawCat = categoryIdx !== -1 ? getVal(categoryIdx) : 'Tablet';
        const category = normalizeCategory(rawCat);

        const currentYear = new Date().getFullYear();
        const randCode = Math.floor(1000 + Math.random() * 9000);
        const rawBatch = batchIdx !== -1 ? getVal(batchIdx) : '';
        const batchNumber = rawBatch || `BATCH-${currentYear}-${randCode}`;

        const rawMfg = manufacturerIdx !== -1 ? getVal(manufacturerIdx) : '';
        const manufacturer = rawMfg || 'General Pharma';

        const rawExp = expiryIdx !== -1 ? getVal(expiryIdx) : '';
        const expiryDate = normalizeExpiryDate(rawExp);

        const rawPurchase = purchasePriceIdx !== -1 ? getVal(purchasePriceIdx) : '0';
        const purchasePrice = safeNumber(rawPurchase, 0);

        const rawSelling = sellingPriceIdx !== -1 ? getVal(sellingPriceIdx) : '0';
        let sellingPrice = safeNumber(rawSelling, 0);
        if (sellingPrice === 0 && purchasePrice > 0) {
          sellingPrice = safeNumber(purchasePrice * 1.25, 0);
        }

        const rawStock = stockIdx !== -1 ? getVal(stockIdx) : '50';
        const stockQuantity = safeInteger(rawStock, 50);

        const rawMin = minStockIdx !== -1 ? getVal(minStockIdx) : '15';
        const minStockThreshold = safeInteger(rawMin, 15);

        const rawUnit = unitIdx !== -1 ? getVal(unitIdx) : 'Box';
        const unit = rawUnit || 'Box';

        const rawStrength = strengthIdx !== -1 ? getVal(strengthIdx) : '';
        const strength = rawStrength || undefined;

        const rawShelf = shelfIdx !== -1 ? getVal(shelfIdx) : '';
        const shelfLocation = rawShelf || 'Shelf A-1';

        result.medicines.push({
          name,
          genericName,
          category,
          batchNumber,
          manufacturer,
          expiryDate,
          purchasePrice,
          sellingPrice,
          stockQuantity,
          minStockThreshold,
          unit,
          strength,
          shelfLocation,
        });
      } catch (rowErr: any) {
        result.errors.push(`Row ${rowIndex + 2}: Error parsing line: ${rowErr?.message || 'Invalid row data'}`);
      }
    });

    if (result.medicines.length === 0 && result.errors.length === 0) {
      result.errors.push('No valid medicine records could be extracted from the file.');
    }
  } catch (globalErr: any) {
    result.errors.push(`Fatal CSV parsing error: ${globalErr?.message || 'Unable to process CSV structure'}`);
    result.medicines = [];
  }

  return result;
}

/**
 * Generate standard Sample CSV content with sample medicine records
 */
export function generateSampleCsvContent(): string {
  const headers = [
    'Medicine Name',
    'Generic Name',
    'Category',
    'Batch Number',
    'Manufacturer',
    'Expiry Date',
    'Purchase Price',
    'Selling Price',
    'Stock Quantity',
    'Min Threshold',
    'Unit',
    'Strength',
    'Shelf Location',
  ];

  const sampleRows = [
    [
      'Napa Extra 500mg/65mg',
      'Paracetamol + Caffeine',
      'Tablet',
      'NP-2025-01',
      'Beximco Pharmaceuticals Ltd',
      '2026-12-31',
      '2.20',
      '3.00',
      '250',
      '25',
      'Strip',
      '500mg+65mg',
      'Rack A-1',
    ],
    [
      'Monas 10mg',
      'Montelukast Sodium',
      'Tablet',
      'MN-2025-88',
      'Acme Laboratories Ltd',
      '2026-10-15',
      '14.50',
      '17.00',
      '120',
      '20',
      'Box',
      '10mg',
      'Rack B-3',
    ],
    [
      'Maxpro 20mg',
      'Esomeprazole Magnesium',
      'Capsule',
      'MX-2025-44',
      'Square Pharmaceuticals Ltd',
      '2027-02-28',
      '6.40',
      '8.00',
      '180',
      '30',
      'Strip',
      '20mg',
      'Rack A-4',
    ],
    [
      'Tofen 100ml Syrup',
      'Ketotifen',
      'Syrup',
      'TF-2024-91',
      'Beximco Pharmaceuticals Ltd',
      '2026-08-30',
      '52.00',
      '65.00',
      '45',
      '10',
      'Bottle',
      '100ml',
      'Shelf C-2',
    ],
    [
      'Ceevit 250mg Chewable',
      'Ascorbic Acid (Vitamin C)',
      'Tablet',
      'CV-2025-12',
      'Square Pharmaceuticals Ltd',
      '2027-06-30',
      '1.80',
      '2.50',
      '400',
      '50',
      'Box',
      '250mg',
      'Rack D-1',
    ],
  ];

  try {
    return Papa.unparse({
      fields: headers,
      data: sampleRows,
    });
  } catch {
    // Fallback if unparse fails
    const csvRows = [headers.join(','), ...sampleRows.map((r) => r.join(','))];
    return csvRows.join('\n');
  }
}

/**
 * Trigger browser download of sample CSV template
 */
export function downloadSampleCsv(): void {
  try {
    const content = generateSampleCsvContent();
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'siam_pharma_sample_medicine_import.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to trigger sample CSV download:', err);
  }
}

export interface ParsedGenericsResult {
  generics: string[];
  skippedDuplicates: number;
  totalRowsCount: number;
  errors: string[];
}

/**
 * Parses generic names from a CSV file or text stream
 */
export function parseGenericsFromCSV(csvText: string, existingGenerics: string[] = []): ParsedGenericsResult {
  const result: ParsedGenericsResult = {
    generics: [],
    skippedDuplicates: 0,
    totalRowsCount: 0,
    errors: [],
  };

  try {
    if (!csvText || typeof csvText !== 'string' || !csvText.trim()) {
      result.errors.push('The uploaded CSV file is empty or does not contain readable text.');
      return result;
    }

    let cleanText = csvText;
    if (cleanText.charCodeAt(0) === 0xfeff) {
      cleanText = cleanText.slice(1);
    }

    const parsed = Papa.parse<string[]>(cleanText, {
      skipEmptyLines: 'greedy',
      header: false,
    });

    if (parsed.errors && parsed.errors.length > 0) {
      parsed.errors.forEach((err) => {
        if (err.message) {
          result.errors.push(`CSV format warning at row ${err.row ?? '?'}: ${err.message}`);
        }
      });
    }

    const allRows = parsed.data || [];
    if (allRows.length === 0) {
      result.errors.push('No data rows found in the CSV file.');
      return result;
    }

    // Determine if first row is header
    const firstRow = allRows[0] || [];
    let startIdx = 0;
    let genericColIdx = 0;

    const isHeaderCandidate = firstRow.some((cell) => {
      const norm = (cell || '').toLowerCase().replace(/[\s_\-#.]+/g, '');
      return norm.includes('generic') || norm.includes('molecule') || norm.includes('name') || norm.includes('salt');
    });

    if (isHeaderCandidate) {
      startIdx = 1;
      const colIdx = firstRow.findIndex((cell) => {
        const norm = (cell || '').toLowerCase().replace(/[\s_\-#.]+/g, '');
        return norm.includes('generic') || norm.includes('molecule') || norm.includes('salt') || norm.includes('name');
      });
      if (colIdx >= 0) {
        genericColIdx = colIdx;
      }
    }

    const existingLowerSet = new Set(existingGenerics.map((g) => g.trim().toLowerCase()));
    const seenInBatchSet = new Set<string>();
    const extractedList: string[] = [];

    const dataRows = allRows.slice(startIdx);
    result.totalRowsCount = dataRows.length;

    for (let r = 0; r < dataRows.length; r++) {
      const row = dataRows[r];
      if (!row || row.length === 0) continue;

      let val = row[genericColIdx];
      if (!val || !val.trim()) {
        val = row.find((c) => c && c.trim()) || '';
      }

      val = val.trim().replace(/^["']+|["']+$/g, '').trim();
      if (!val) continue;

      const valLower = val.toLowerCase();
      if (valLower === 'generic' || valLower === 'generic name' || valLower === 'molecule' || valLower === 'name') {
        continue;
      }

      if (existingLowerSet.has(valLower) || seenInBatchSet.has(valLower)) {
        result.skippedDuplicates++;
        continue;
      }

      seenInBatchSet.add(valLower);
      extractedList.push(val);
    }

    result.generics = extractedList;
    if (extractedList.length === 0 && result.skippedDuplicates === 0) {
      result.errors.push('No valid generic names found in the CSV.');
    }
  } catch (err: any) {
    result.errors.push(`Error parsing CSV: ${err?.message || 'Unknown parsing error'}`);
  }

  return result;
}

/**
 * Generate standard Sample CSV content for Generics bulk import
 */
export function generateSampleGenericsCsvContent(): string {
  const headers = ['Generic Name', 'Therapeutic Class', 'Notes'];
  const sampleRows = [
    ['Paracetamol', 'Analgesic & Antipyretic', 'Fast pain & fever relief'],
    ['Esomeprazole', 'Proton Pump Inhibitor (PPI)', 'Reduces stomach acid'],
    ['Omeprazole', 'Proton Pump Inhibitor (PPI)', 'Gastric ulcer treatment'],
    ['Ciprofloxacin', 'Fluoroquinolone Antibiotic', 'Bacterial infections'],
    ['Azithromycin', 'Macrolide Antibiotic', 'Respiratory and skin infections'],
    ['Montelukast', 'Leukotriene Receptor Antagonist', 'Asthma and allergy relief'],
    ['Metformin HCl', 'Antidiabetic Agent', 'Type 2 diabetes management'],
    ['Amlodipine', 'Calcium Channel Blocker', 'Hypertension and chest pain'],
    ['Cetirizine HCl', 'Antihistamine', 'Allergy symptoms'],
    ['Pantoprazole', 'Proton Pump Inhibitor (PPI)', 'Acid reflux and GERD'],
    ['Fexofenadine', 'Antihistamine', 'Seasonal allergic rhinitis'],
    ['Losartan Potassium', 'Angiotensin II Receptor Blocker', 'Blood pressure management'],
  ];

  try {
    return Papa.unparse({
      fields: headers,
      data: sampleRows,
    });
  } catch {
    return [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
  }
}

/**
 * Trigger browser download of sample Generics CSV template
 */
export function downloadSampleGenericsCsv(): void {
  try {
    const content = generateSampleGenericsCsvContent();
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'siam_pharma_sample_generics_import.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to trigger sample generics CSV download:', err);
  }
}

