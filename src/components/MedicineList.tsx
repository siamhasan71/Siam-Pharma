import React, { useState, useMemo, useCallback, useEffect, useDeferredValue } from 'react';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { usePharmacy } from '../context/PharmacyContext';
import { Medicine, MedicineCategory } from '../types';
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  TrendingUp,
  Boxes,
  BadgeDollarSign,
  AlertCircle,
  Database,
  Copy,
  Check,
  X,
  Calendar,
  Layers,
  MapPin,
  CheckCircle2,
  SlidersHorizontal,
  ArrowUpDown,
  LayoutGrid,
  Table as TableIcon,
  Tag,
  Download,
  UploadCloud,
  FileSpreadsheet,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import {
  SAMPLE_MEDICINES_DATA,
  POSTGRESQL_SCHEMA,
  PRISMA_SCHEMA,
} from '../data/medicineSchemaData';
import { ImportCsvModal } from './ImportCsvModal';
import { ResetDatabaseModal } from './ResetDatabaseModal';
import {
  queryMedicinesFromIndexedDB,
  PaginatedMedicinesResult,
  pharmacyDb,
} from '../db/pharmacyDb';

export interface MedicineListProps {
  onBack?: () => void;
}

interface TableRowData {
  items: Medicine[];
  onEdit: (med: Medicine) => void;
  onDelete: (med: Medicine) => void;
}

/**
 * Memoized Virtual Table Row for 60 FPS Inventory Rendering
 */
const VirtualTableRow = React.memo(({ index, style, data }: ListChildComponentProps<TableRowData>) => {
  const med = data.items[index];
  if (!med) return null;

  const unitProfit = Math.max(0, med.sellingPrice - med.purchasePrice);
  const marginPercent =
    med.sellingPrice > 0
      ? ((unitProfit / med.sellingPrice) * 100).toFixed(1)
      : '0.0';
  const isLow = (med.stockQuantity || 0) <= (med.minStockThreshold || 15);

  return (
    <div
      style={style}
      className="grid grid-cols-[2.5fr_1.2fr_1.2fr_1fr_1.2fr_1.2fr_0.8fr_1fr] min-w-[920px] items-center px-4 hover:bg-[#165651] transition-colors border-b border-[#1b5852] text-xs text-teal-100 box-border"
    >
      {/* Medicine & Generic */}
      <div className="py-2 pr-3 min-w-0">
        <div className="font-bold text-white text-sm flex items-center gap-1.5 truncate">
          <span className="truncate">{med.name}</span>
          {med.strength && (
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#0e3b37] border border-[#236a64] text-teal-200 shrink-0">
              {med.strength}
            </span>
          )}
        </div>
        <div className="text-[11px] text-teal-300/80 flex items-center gap-1.5 mt-0.5 truncate">
          <span className="truncate">Generic: {med.genericName}</span>
          {med.manufacturer && (
            <>
              <span className="text-teal-400/30 shrink-0">•</span>
              <span className="text-teal-300/60 text-[10px] truncate">{med.manufacturer}</span>
            </>
          )}
        </div>
      </div>

      {/* Category & Unit */}
      <div className="py-2 px-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#0e3b37] border border-[#236a64] text-[11px] font-medium text-teal-200">
          {med.category}
        </span>
        <span className="block text-[10px] text-teal-300/70 mt-0.5">
          Unit: {med.unit || 'Strip'}
        </span>
      </div>

      {/* Batch & Expiry */}
      <div className="py-2 px-2">
        <span className="font-mono text-[11px] text-teal-200 block truncate">
          {med.batchNumber || 'N/A'}
        </span>
        <span className="text-[10px] text-teal-300/70 flex items-center gap-1 mt-0.5">
          <Calendar className="w-3 h-3 text-teal-400/70 shrink-0" />
          {med.expiryDate || 'N/A'}
        </span>
      </div>

      {/* Purchase Price */}
      <div className="py-2 px-2 text-right font-mono font-semibold text-teal-200">
        ৳{med.purchasePrice.toFixed(2)}
      </div>

      {/* Selling Price */}
      <div className="py-2 px-2 text-right font-mono font-bold text-emerald-300 text-sm">
        ৳{med.sellingPrice.toFixed(2)}
      </div>

      {/* Profit & Margin */}
      <div className="py-2 px-2 text-right font-mono">
        <span className="text-emerald-300 font-bold block">
          +৳{unitProfit.toFixed(2)}
        </span>
        <span className="text-[10px] text-teal-300/80 font-medium">
          {marginPercent}% margin
        </span>
      </div>

      {/* Stock */}
      <div className="py-2 px-2 text-center">
        <span
          className={`inline-flex items-center justify-center font-bold font-mono px-2.5 py-0.5 rounded-lg text-xs ${
            isLow
              ? 'bg-amber-900/60 border border-amber-500/50 text-amber-200'
              : 'bg-emerald-900/40 border border-emerald-500/40 text-emerald-200'
          }`}
        >
          {med.stockQuantity}
        </span>
      </div>

      {/* Actions */}
      <div className="py-2 px-2 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => data.onEdit(med)}
            className="p-1.5 rounded-lg bg-[#0e3b37] hover:bg-emerald-600 border border-[#236a64] text-teal-200 hover:text-white transition-all cursor-pointer"
            title="Edit Medicine"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => data.onDelete(med)}
            className="p-1.5 rounded-lg bg-[#0e3b37] hover:bg-rose-600 border border-[#236a64] text-rose-300 hover:text-white transition-all cursor-pointer"
            title="Delete Medicine"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
});

VirtualTableRow.displayName = 'VirtualTableRow';

interface MedicineCardItemProps {
  med: Medicine;
  onEdit: (med: Medicine) => void;
  onDelete: (med: Medicine) => void;
}

/**
 * Memoized Card View Item for Lag-Free Filtering
 */
const MedicineCardItem = React.memo(({ med, onEdit, onDelete }: MedicineCardItemProps) => {
  const unitProfit = Math.max(0, med.sellingPrice - med.purchasePrice);
  const marginPercent =
    med.sellingPrice > 0
      ? ((unitProfit / med.sellingPrice) * 100).toFixed(1)
      : '0.0';
  const isLow = (med.stockQuantity || 0) <= (med.minStockThreshold || 15);

  return (
    <div
      key={med.id}
      className="bg-[#134E4A] border border-[#1d635d] rounded-2xl p-4 shadow-md flex flex-col justify-between hover:border-emerald-500/50 transition-all group"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors truncate">
                {med.name}
              </h4>
              {med.strength && (
                <span className="text-[10px] px-1.5 py-0.5 bg-[#0e3b37] text-teal-200 border border-[#236a64] rounded font-mono">
                  {med.strength}
                </span>
              )}
            </div>
            <p className="text-xs text-teal-300/80 mt-0.5 truncate">
              Generic: {med.genericName}
            </p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0e3b37] border border-[#236a64] text-teal-200 shrink-0 font-medium">
            {med.category}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#1b5852] text-xs">
          <div>
            <span className="text-[11px] text-teal-300/70 block">Purchase Rate</span>
            <span className="font-mono font-semibold text-teal-100">
              ৳{med.purchasePrice.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-teal-300/70 block">Selling MRP</span>
            <span className="font-mono font-bold text-emerald-300">
              ৳{med.sellingPrice.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2.5 text-xs text-teal-200">
          <span>Profit: +৳{unitProfit.toFixed(2)} ({marginPercent}%)</span>
          <span
            className={`font-mono px-2 py-0.5 rounded-md font-bold text-xs ${
              isLow
                ? 'bg-amber-900/60 text-amber-200 border border-amber-500/50'
                : 'bg-emerald-900/40 text-emerald-200 border border-emerald-500/40'
            }`}
          >
            Stock: {med.stockQuantity}
          </span>
        </div>
      </div>

      <div className="mt-3.5 pt-3 border-t border-[#1b5852] flex items-center justify-between text-xs">
        <span className="text-[10px] text-teal-300/60 font-mono">
          Batch: {med.batchNumber || 'N/A'}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEdit(med)}
            className="p-1.5 rounded-lg bg-[#0e3b37] hover:bg-emerald-600 border border-[#236a64] text-teal-200 hover:text-white transition-all cursor-pointer"
            title="Edit Medicine"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(med)}
            className="p-1.5 rounded-lg bg-[#0e3b37] hover:bg-rose-600 border border-[#236a64] text-rose-300 hover:text-white transition-all cursor-pointer"
            title="Delete Medicine"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
});

MedicineCardItem.displayName = 'MedicineCardItem';

export const MedicineList: React.FC<MedicineListProps> = ({ onBack }) => {
  const {
    medicines,
    totalMedicinesCount,
    isMedicinesLoading,
    refreshMedicines,
    addMedicine,
    bulkAddMedicines,
    updateMedicine,
    deleteMedicine,
    resetMedicinesDatabase,
    restoreSampleMedicines,
    currentRole,
    inventoryStats,
  } = usePharmacy();

  // Reset Database State
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedUnit, setSelectedUnit] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'LowStock' | 'InStock'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'purchasePrice' | 'sellingPrice' | 'margin'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  // Database Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [isQueryLoading, setIsQueryLoading] = useState<boolean>(false);
  const [jumpPageInput, setJumpPageInput] = useState<string>('');

  // 150ms debounce for heavy search filtering logic - keeps typing instant at 60fps
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Smooth Non-Blocking Search via useDeferredValue
  const deferredSearch = useDeferredValue(debouncedSearch);

  // Initialize immediately from cached global medicines in context so opening is instant without "0 Products" delay
  const [queryResult, setQueryResult] = useState<PaginatedMedicinesResult>(() => {
    const initialList = medicines && medicines.length > 0 ? medicines : [];
    const count = initialList.length || totalMedicinesCount || 0;
    const items = initialList.slice(0, 50);
    return {
      items,
      totalCount: count,
      totalPages: Math.max(1, Math.ceil(count / 50)),
      currentPage: 1,
      pageSize: 50,
      stats: inventoryStats || {
        totalItems: count,
        totalStockQty: 0,
        totalPurchaseCost: 0,
        totalSellingValue: 0,
        potentialGrossProfit: 0,
        profitMarginPercent: '0.0',
        lowStockCount: 0,
      },
    };
  });

  // Fast in-memory filtering & pagination from preloaded parent medicines array
  const loadData = useCallback(async () => {
    if (medicines && medicines.length > 0) {
      setIsQueryLoading(false);
      let list = medicines;
      const term = deferredSearch.trim().toLowerCase();
      if (term) {
        const query = term.replace(/[^a-z0-9]/g, '');
        list = list.filter((m) => {
          const brand = (m.name || (m as any).brandName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const generic = (m.genericName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (brand.includes(query) || generic.includes(query)) return true;
          const rawBrand = (m.name || (m as any).brandName || '').toLowerCase();
          const rawGeneric = (m.genericName || '').toLowerCase();
          if (rawBrand.includes(term) || rawGeneric.includes(term)) return true;
          if (m.barcode && m.barcode.toLowerCase().includes(term)) return true;
          return false;
        });
      }

      if (selectedCategory !== 'All') {
        list = list.filter((m) => m.category === selectedCategory);
      }
      if (selectedUnit !== 'All') {
        list = list.filter((m) => (m.unit || 'Strip') === selectedUnit);
      }
      if (stockFilter === 'LowStock') {
        list = list.filter((m) => (m.stockQuantity || 0) <= (m.minStockThreshold || 15));
      } else if (stockFilter === 'InStock') {
        list = list.filter((m) => (m.stockQuantity || 0) > (m.minStockThreshold || 15));
      }

      const sorted = [...list].sort((a, b) => {
        if (sortBy === 'stock') {
          const diff = (a.stockQuantity || 0) - (b.stockQuantity || 0);
          return sortOrder === 'asc' ? diff : -diff;
        }
        if (sortBy === 'purchasePrice') {
          const diff = (a.purchasePrice || 0) - (b.purchasePrice || 0);
          return sortOrder === 'asc' ? diff : -diff;
        }
        if (sortBy === 'sellingPrice') {
          const diff = (a.sellingPrice || 0) - (b.sellingPrice || 0);
          return sortOrder === 'asc' ? diff : -diff;
        }
        if (sortBy === 'margin') {
          const mA = a.sellingPrice > 0 ? (a.sellingPrice - a.purchasePrice) / a.sellingPrice : 0;
          const mB = b.sellingPrice > 0 ? (b.sellingPrice - b.purchasePrice) / b.sellingPrice : 0;
          return sortOrder === 'asc' ? mA - mB : mB - mA;
        }
        return sortOrder === 'asc'
          ? (a.name || '').localeCompare(b.name || '')
          : (b.name || '').localeCompare(a.name || '');
      });

      const totalCount = sorted.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const validPage = Math.min(currentPage, totalPages);
      const items = sorted.slice((validPage - 1) * pageSize, validPage * pageSize);

      let totalStockQty = 0;
      let totalPurchaseCost = 0;
      let totalSellingValue = 0;
      let lowStockCount = 0;
      for (let i = 0; i < sorted.length; i++) {
        const m = sorted[i];
        const q = m.stockQuantity || 0;
        totalStockQty += q;
        totalPurchaseCost += q * (m.purchasePrice || 0);
        totalSellingValue += q * (m.sellingPrice || 0);
        if (q <= (m.minStockThreshold || 15)) lowStockCount++;
      }
      const potentialGrossProfit = totalSellingValue - totalPurchaseCost;
      const profitMarginPercent = totalSellingValue > 0
        ? ((potentialGrossProfit / totalSellingValue) * 100).toFixed(1)
        : '0.0';

      setQueryResult({
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
      });
      return;
    }

    // If medicines catalog is empty and total count is 0 (database reset)
    if ((!medicines || medicines.length === 0) && (totalMedicinesCount === 0 || !totalMedicinesCount)) {
      setIsQueryLoading(false);
      setQueryResult({
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
      });
      return;
    }

    // Fallback to IndexedDB query if master medicines is still hydrating
    setIsQueryLoading(true);
    try {
      const res = await queryMedicinesFromIndexedDB({
        page: currentPage,
        pageSize,
        searchTerm: deferredSearch,
        category: selectedCategory,
        unit: selectedUnit,
        stockFilter,
        sortBy,
        sortOrder,
      });
      setQueryResult(res);
    } catch (err) {
      console.error('Failed to query medicines from IndexedDB:', err);
    } finally {
      setIsQueryLoading(false);
    }
  }, [
    medicines,
    currentPage,
    pageSize,
    deferredSearch,
    selectedCategory,
    selectedUnit,
    stockFilter,
    sortBy,
    sortOrder,
  ]);

  // Synchronize smoothly whenever dependencies change without artificial debounces
  useEffect(() => {
    loadData();
  }, [loadData, totalMedicinesCount]);

  // Modal states
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [deletingMedicine, setDeletingMedicine] = useState<Medicine | null>(null);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeSchemaTab, setActiveSchemaTab] = useState<'postgres' | 'prisma' | 'sampleJson'>('postgres');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State for Entry & Edit
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    category: 'Tablet' as MedicineCategory,
    unit: 'Strip',
    purchasePrice: 0,
    sellingPrice: 0,
    stockQuantity: 100,
    minStockThreshold: 15,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    shelfLocation: '',
    batchNumber: '',
    manufacturer: 'Square Pharmaceuticals Ltd.',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleOpenAdd = () => {
    setEditingMedicine(null);
    setFormData({
      name: '',
      genericName: '',
      category: 'Tablet',
      unit: 'Strip',
      purchasePrice: 0,
      sellingPrice: 0,
      stockQuantity: 100,
      minStockThreshold: 15,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      shelfLocation: 'Rack A-01',
      batchNumber: `BAT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      manufacturer: 'Square Pharmaceuticals Ltd.',
    });
    setFormErrors({});
    setShowEntryModal(true);
  };

  const handleOpenEdit = useCallback((med: Medicine) => {
    setEditingMedicine(med);
    setFormData({
      name: med.name,
      genericName: med.genericName,
      category: med.category,
      unit: med.unit || (med.category === 'Syrup' ? 'Bottle' : med.category === 'Injection' ? 'Ampoule' : 'Strip'),
      purchasePrice: med.purchasePrice,
      sellingPrice: med.sellingPrice,
      stockQuantity: med.stockQuantity,
      minStockThreshold: med.minStockThreshold || 15,
      expiryDate: med.expiryDate,
      shelfLocation: med.shelfLocation || '',
      batchNumber: med.batchNumber || '',
      manufacturer: med.manufacturer || '',
    });
    setFormErrors({});
    setShowEntryModal(true);
  }, []);

  const handleOpenDelete = useCallback((med: Medicine) => {
    setDeletingMedicine(med);
  }, []);

  const formUnitProfit = Math.max(0, formData.sellingPrice - formData.purchasePrice);
  const formProfitMargin =
    formData.sellingPrice > 0
      ? ((formUnitProfit / formData.sellingPrice) * 100).toFixed(1)
      : '0.0';
  const formTotalBatchCost = (formData.purchasePrice * formData.stockQuantity).toFixed(2);
  const formTotalBatchRevenue = (formData.sellingPrice * formData.stockQuantity).toFixed(2);

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Medicine name is required';
    if (!formData.genericName.trim()) errors.genericName = 'Generic name is required';
    if (formData.purchasePrice < 0) errors.purchasePrice = 'Purchase price must be >= 0';
    if (formData.sellingPrice < 0) errors.sellingPrice = 'Selling price must be >= 0';
    if (formData.sellingPrice < formData.purchasePrice) {
      errors.sellingPrice = 'Selling price (MRP) is lower than purchase cost';
    }
    if (formData.stockQuantity < 0) errors.stockQuantity = 'Stock quantity cannot be negative';
    if (!formData.expiryDate) errors.expiryDate = 'Expiry date is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingMedicine) {
      updateMedicine(editingMedicine.id, {
        name: formData.name.trim(),
        genericName: formData.genericName.trim(),
        category: formData.category,
        unit: formData.unit,
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        stockQuantity: Number(formData.stockQuantity),
        minStockThreshold: Number(formData.minStockThreshold),
        expiryDate: formData.expiryDate,
        shelfLocation: formData.shelfLocation.trim(),
        batchNumber: formData.batchNumber.trim(),
        manufacturer: formData.manufacturer.trim(),
      });
      triggerToast(`Updated "${formData.name.trim()}" successfully.`);
    } else {
      addMedicine({
        name: formData.name.trim(),
        genericName: formData.genericName.trim(),
        category: formData.category,
        unit: formData.unit,
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        stockQuantity: Number(formData.stockQuantity),
        minStockThreshold: Number(formData.minStockThreshold),
        expiryDate: formData.expiryDate,
        shelfLocation: formData.shelfLocation.trim(),
        batchNumber: formData.batchNumber.trim(),
        manufacturer: formData.manufacturer.trim(),
      });
      triggerToast(`Added "${formData.name.trim()}" to inventory.`);
    }

    setShowEntryModal(false);
  };

  const handleConfirmDelete = () => {
    if (deletingMedicine) {
      deleteMedicine(deletingMedicine.id);
      triggerToast(`Deleted "${deletingMedicine.name}" from inventory.`);
      setDeletingMedicine(null);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(label);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const metrics = queryResult.stats;
  const filteredMedicines = queryResult.items;

  // Memoized data container for virtualized table rows
  const tableItemData = useMemo<TableRowData>(() => ({
    items: filteredMedicines,
    onEdit: handleOpenEdit,
    onDelete: handleOpenDelete,
  }), [filteredMedicines, handleOpenEdit, handleOpenDelete]);

  const handleExportCSV = async () => {
    try {
      triggerToast('Generating CSV export...');
      const allRows = medicines.length > 0 ? medicines : await pharmacyDb.medicines.toArray();
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

      const rows = allRows.map((m) => [
        `"${m.name.replace(/"/g, '""')}"`,
        `"${(m.genericName || '').replace(/"/g, '""')}"`,
        m.category || 'Tablet',
        m.batchNumber || '',
        `"${(m.manufacturer || '').replace(/"/g, '""')}"`,
        m.expiryDate || '',
        m.purchasePrice || 0,
        m.sellingPrice || 0,
        m.stockQuantity || 0,
        m.minStockThreshold || 15,
        m.unit || 'Box',
        `"${(m.strength || '').replace(/"/g, '""')}"`,
        `"${(m.shelfLocation || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `siam_pharma_medicines_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast(`Exported all ${allRows.length.toLocaleString()} medicines to CSV!`);
    } catch (err: any) {
      console.error('Export error:', err);
      triggerToast('Export failed: ' + (err?.message || 'Storage error'));
    }
  };

  const categories: MedicineCategory[] = [
    'Tablet',
    'Capsule',
    'Syrup',
    'Injection',
    'Ointment',
    'Drops',
    'Inhaler',
    'Other',
  ];

  const units = ['Strip', 'Box', 'Pcs', 'Bottle', 'Ampoule', 'Tube', 'Vial'];

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      const ok = await resetMedicinesDatabase();
      if (ok) {
        setSuccessToast('All products deleted and database reset to 0 items.');
        setTimeout(() => setSuccessToast(null), 4000);
      }
    } catch (err: any) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleRestoreSample = async () => {
    setIsResetting(true);
    try {
      const ok = await restoreSampleMedicines();
      if (ok) {
        setSuccessToast('Sample demo medicines restored successfully.');
        setTimeout(() => setSuccessToast(null), 4000);
      }
    } catch (err: any) {
      console.error('Restore error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d3430] text-white flex flex-col">
      {/* Top Navigation Header */}
      <header className="bg-[#134E4A] border-b border-[#1d635d] sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="w-9 h-9 rounded-xl bg-[#0e3b37] hover:bg-[#18534d] border border-[#236a64] flex items-center justify-center text-teal-200 hover:text-white transition-all shadow-xs cursor-pointer"
                title="Back to Home"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-[#1b5852] border border-[#28776f] flex items-center justify-center text-emerald-300 shadow-inner">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-tight flex items-center gap-2">
                <span>Medicine Item List & Pricing</span>
                <span className="text-[10px] font-mono font-bold bg-[#0e3b37] text-teal-200 border border-[#236a64] px-2 py-0.5 rounded-full">
                  Dark Teal UI
                </span>
              </h1>
              <p className="text-xs text-teal-200/80">
                Live Inventory Catalog, Purchase Rates & Profit Margin Tracker
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {/* Database Schema Button */}
            <button
              id="btn-view-schema-modal"
              onClick={() => setShowSchemaModal(true)}
              className="px-3 py-2 rounded-xl bg-[#0e3b37] hover:bg-[#18534d] border border-[#236a64] text-xs font-semibold text-teal-100 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Database Schema</span>
            </button>

            {/* Clear All Products / Reset Database Button */}
            <button
              id="btn-reset-database-header"
              onClick={() => setShowResetModal(true)}
              className="px-3 py-2 rounded-xl bg-[#0e3b37] hover:bg-rose-950/80 border border-rose-500/40 hover:border-rose-500/80 text-xs font-semibold text-rose-300 hover:text-rose-100 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              title="Clear all demo/sample products and reset database to 0 items"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">Clear All Products</span>
              <span className="sm:hidden">Reset DB</span>
            </button>

            {/* Export CSV Button */}
            <button
              id="btn-export-csv-header"
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-xl bg-[#0e3b37] hover:bg-[#18534d] border border-[#236a64] text-xs font-semibold text-teal-100 hover:text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Export all medicines to CSV file"
            >
              <Download className="w-4 h-4 text-teal-300" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {/* Import CSV Button */}
            <button
              id="btn-import-csv-header"
              onClick={() => setShowImportModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#0e3b37] hover:bg-[#18534d] border border-emerald-500/60 text-xs font-bold text-emerald-300 hover:text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ring-1 ring-emerald-500/30 active:scale-95"
              title="Upload CSV file and save all medicines to the database at once"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Import CSV</span>
            </button>

            {/* Add Medicine Button */}
            <button
              id="btn-add-medicine-header"
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Medicine</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 flex-1 space-y-5">
        {/* Toast Notification */}
        {successToast && (
          <div className="p-3 bg-emerald-900/80 border border-emerald-400/70 rounded-xl text-xs font-medium text-emerald-100 flex items-center gap-2 shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="flex-1">{successToast}</span>
            <button onClick={() => setSuccessToast(null)}>
              <X className="w-3.5 h-3.5 text-emerald-300" />
            </button>
          </div>
        )}

        {/* 1. Summary Cards at Top */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Card 1: Total Items */}
          <div className="bg-[#134E4A] border border-[#1d635d] rounded-2xl p-4 shadow-md relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-teal-200">Total Items in Catalog</p>
                <h3 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">
                  {metrics.totalItems}
                  <span className="text-xs font-semibold text-teal-300 ml-1.5">Products</span>
                </h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#1b5852] border border-[#267068] flex items-center justify-center text-teal-200 group-hover:scale-105 transition-transform">
                <Boxes className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-3.5 pt-3 border-t border-[#1b5852] flex items-center justify-between text-xs text-teal-200/90">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {metrics.totalStockQty} Units Stocked
              </span>
              {metrics.lowStockCount > 0 ? (
                <span className="text-amber-300 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {metrics.lowStockCount} Low Stock
                </span>
              ) : (
                <span className="text-emerald-300 font-medium">Healthy Inventory</span>
              )}
            </div>
          </div>

          {/* Card 2: Total Stock Value (Purchase Cost) */}
          <div className="bg-[#134E4A] border border-[#1d635d] rounded-2xl p-4 shadow-md relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-teal-200">Total Stock Value (Cost)</p>
                <h3 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight font-mono">
                  ৳{metrics.totalPurchaseCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#1b5852] border border-[#267068] flex items-center justify-center text-emerald-300 group-hover:scale-105 transition-transform">
                <BadgeDollarSign className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-3.5 pt-3 border-t border-[#1b5852] flex items-center justify-between text-xs text-teal-200/90">
              <span>Potential Retail: ৳{metrics.totalSellingValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-teal-300 font-mono">Cost Basis</span>
            </div>
          </div>

          {/* Card 3: Potential Gross Margin */}
          <div className="bg-[#134E4A] border border-[#1d635d] rounded-2xl p-4 shadow-md relative overflow-hidden group sm:col-span-2 lg:col-span-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-teal-200">Potential Gross Profit</p>
                <h3 className="text-2xl sm:text-3xl font-black text-emerald-300 mt-1 tracking-tight font-mono">
                  ৳{metrics.potentialGrossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#1b5852] border border-[#267068] flex items-center justify-center text-emerald-300 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-3.5 pt-3 border-t border-[#1b5852] flex items-center justify-between text-xs text-teal-200/90">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-300">
                Avg. Margin: {metrics.profitMarginPercent}%
              </span>
              <span className="text-teal-200/80">Inventory Return</span>
            </div>
          </div>
        </section>

        {/* 2. Search, Filter & View Controls */}
        <section className="bg-[#134E4A] border border-[#1d635d] rounded-2xl p-4 shadow-md space-y-3.5">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-teal-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="search-medicines-input"
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by brand name, generic name, barcode..."
                className="w-full bg-[#0e3b37] border border-[#236a64] rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-teal-200/60 focus:outline-hidden focus:border-emerald-400 transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setDebouncedSearch('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-300 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Category Dropdown */}
              <select
                id="filter-category-select"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-[#0e3b37] border border-[#236a64] rounded-xl px-3 py-2 text-teal-100 text-xs focus:outline-hidden focus:border-emerald-400"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Unit Dropdown */}
              <select
                id="filter-unit-select"
                value={selectedUnit}
                onChange={(e) => {
                  setSelectedUnit(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-[#0e3b37] border border-[#236a64] rounded-xl px-3 py-2 text-teal-100 text-xs focus:outline-hidden focus:border-emerald-400"
              >
                <option value="All">All Units</option>
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>

              {/* Stock Filter */}
              <select
                id="filter-stock-select"
                value={stockFilter}
                onChange={(e) => {
                  setStockFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="bg-[#0e3b37] border border-[#236a64] rounded-xl px-3 py-2 text-teal-100 text-xs focus:outline-hidden focus:border-emerald-400"
              >
                <option value="All">All Stock Levels</option>
                <option value="InStock">In Stock (&gt; 15)</option>
                <option value="LowStock">Low Stock (&le; 15)</option>
              </select>

              {/* Sort By Dropdown */}
              <select
                id="sort-medicines-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#0e3b37] border border-[#236a64] rounded-xl px-3 py-2 text-teal-100 text-xs focus:outline-hidden focus:border-emerald-400"
              >
                <option value="name">Sort: Brand Name</option>
                <option value="stock">Sort: Stock Quantity</option>
                <option value="purchasePrice">Sort: Purchase Rate</option>
                <option value="sellingPrice">Sort: Selling Rate (MRP)</option>
                <option value="margin">Sort: Profit Margin</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 rounded-xl bg-[#0e3b37] border border-[#236a64] text-teal-200 hover:text-white text-xs transition-colors cursor-pointer"
                title={`Order: ${sortOrder.toUpperCase()}`}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>

              {/* Table / Card View Mode */}
              <div className="flex items-center bg-[#0e3b37] border border-[#236a64] rounded-xl p-0.5">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'table' ? 'bg-[#1b5852] text-white shadow-xs' : 'text-teal-300 hover:text-white'
                  }`}
                  title="Table View"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'card' ? 'bg-[#1b5852] text-white shadow-xs' : 'text-teal-300 hover:text-white'
                  }`}
                  title="Card View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-[11px] font-semibold text-teal-300/80 mr-1 shrink-0">
              Category:
            </span>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                selectedCategory === 'All'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-[#0e3b37] text-teal-200 hover:bg-[#164d47] border border-[#236a64]'
              }`}
            >
              All ({medicines.length})
            </button>
            {categories.map((cat) => {
              const count = medicines.filter((m) => m.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                      : 'bg-[#0e3b37] text-teal-200 hover:bg-[#164d47] border border-[#236a64]'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. Medicines List Table / Card View */}
        {viewMode === 'table' ? (
          <div className="bg-[#134E4A] border border-[#1d635d] rounded-2xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[920px]">
                {/* Header */}
                <div className="grid grid-cols-[2.5fr_1.2fr_1.2fr_1fr_1.2fr_1.2fr_0.8fr_1fr] bg-[#0e3b37] text-teal-200 font-semibold uppercase tracking-wider text-[11px] border-b border-[#1d635d] px-4 py-3.5 items-center">
                  <div>Medicine & Generic</div>
                  <div>Category / Unit</div>
                  <div>Batch & Expiry</div>
                  <div className="text-right">Purchase Price</div>
                  <div className="text-right">Selling Price (MRP)</div>
                  <div className="text-right">Profit / Margin</div>
                  <div className="text-center">Stock</div>
                  <div className="text-center">Actions</div>
                </div>

                {/* Virtualized Rows via React-Window */}
                {filteredMedicines.length === 0 ? (
                  <div className="py-12 text-center text-teal-300/80">
                    {isQueryLoading ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                        <span>Loading inventory...</span>
                      </div>
                    ) : totalMedicinesCount === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-4 max-w-md mx-auto">
                        <div className="w-14 h-14 rounded-2xl bg-[#0e3b37] border border-teal-600/40 flex items-center justify-center text-teal-300 shadow-inner">
                          <Package className="w-7 h-7 text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-base">Database is Empty (0 Products)</p>
                          <p className="text-xs text-teal-300/80 mt-1">
                            All products have been cleared. You can now build your own inventory catalog manually or import via CSV.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            id="btn-table-empty-add"
                            onClick={handleOpenAdd}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Medicine</span>
                          </button>
                          <button
                            id="btn-table-empty-csv"
                            onClick={() => setShowImportModal(true)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#0e3b37] hover:bg-[#18534d] border border-emerald-500/60 text-xs font-bold text-emerald-300 hover:text-white flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Import CSV</span>
                          </button>
                          <button
                            id="btn-table-empty-restore"
                            onClick={handleRestoreSample}
                            className="px-3 py-1.5 rounded-xl bg-[#0e3b37] hover:bg-[#18534d] border border-teal-700/60 text-xs text-teal-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                            title="Load standard demo medicines"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore Demo</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="w-8 h-8 text-teal-400/50 mb-1" />
                        <p className="font-semibold text-white text-sm">No medicines found</p>
                        <p className="text-xs text-teal-300/60 max-w-sm">
                          Try clearing your search or filter options, or add a new medicine.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <FixedSizeList
                    height={Math.min(filteredMedicines.length * 68, 544)}
                    itemCount={filteredMedicines.length}
                    itemSize={68}
                    width="100%"
                    itemData={tableItemData}
                  >
                    {VirtualTableRow}
                  </FixedSizeList>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Card View with React.memo components */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredMedicines.length === 0 ? (
              <div className="col-span-full py-12 text-center text-teal-300/80 bg-[#134E4A] border border-[#1d635d] rounded-2xl">
                {totalMedicinesCount === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-4 max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-[#0e3b37] border border-teal-600/40 flex items-center justify-center text-teal-300 shadow-inner">
                      <Package className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-base">Database is Empty (0 Products)</p>
                      <p className="text-xs text-teal-300/80 mt-1">
                        All products have been cleared. You can now build your own inventory catalog manually or import via CSV.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={handleOpenAdd}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Medicine</span>
                      </button>
                      <button
                        onClick={() => setShowImportModal(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#0e3b37] hover:bg-[#18534d] border border-emerald-500/60 text-xs font-bold text-emerald-300 hover:text-white flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Import CSV</span>
                      </button>
                      <button
                        onClick={handleRestoreSample}
                        className="px-3 py-1.5 rounded-xl bg-[#0e3b37] hover:bg-[#18534d] border border-teal-700/60 text-xs text-teal-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore Demo</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Package className="w-8 h-8 text-teal-400/50 mb-1 mx-auto" />
                    <p className="font-semibold text-white text-sm">No medicines found</p>
                    <p className="text-xs text-teal-300/60 max-w-sm mx-auto mt-1">
                      Try clearing your search or filter options, or add a new medicine.
                    </p>
                  </>
                )}
              </div>
            ) : (
              filteredMedicines.map((med) => (
                <MedicineCardItem
                  key={med.id}
                  med={med}
                  onEdit={handleOpenEdit}
                  onDelete={handleOpenDelete}
                />
              ))
            )}
          </div>
        )}

        {/* 4. Pagination Controls */}
        <section className="bg-[#134E4A] border border-[#1d635d] rounded-2xl p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-teal-200/90 text-center sm:text-left">
            Showing{' '}
            <strong className="text-white font-mono">
              {queryResult.totalCount === 0 ? 0 : (queryResult.currentPage - 1) * queryResult.pageSize + 1}
            </strong>{' '}
            to{' '}
            <strong className="text-white font-mono">
              {Math.min(queryResult.currentPage * queryResult.pageSize, queryResult.totalCount)}
            </strong>{' '}
            of <strong className="text-emerald-300 font-mono">{queryResult.totalCount.toLocaleString()}</strong> items
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1 || isQueryLoading}
              className="p-2 rounded-xl bg-[#0e3b37] hover:bg-[#18534d] disabled:opacity-40 disabled:pointer-events-none border border-[#236a64] text-teal-200 hover:text-white transition-colors cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isQueryLoading}
              className="p-2 rounded-xl bg-[#0e3b37] hover:bg-[#18534d] disabled:opacity-40 disabled:pointer-events-none border border-[#236a64] text-teal-200 hover:text-white transition-colors cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 bg-[#0e3b37] border border-[#236a64] rounded-xl text-xs font-bold text-white font-mono">
              Page {currentPage} of {Math.max(1, queryResult.totalPages)}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(queryResult.totalPages, p + 1))}
              disabled={currentPage >= queryResult.totalPages || isQueryLoading}
              className="p-2 rounded-xl bg-[#0e3b37] hover:bg-[#18534d] disabled:opacity-40 disabled:pointer-events-none border border-[#236a64] text-teal-200 hover:text-white transition-colors cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(queryResult.totalPages)}
              disabled={currentPage >= queryResult.totalPages || isQueryLoading}
              className="p-2 rounded-xl bg-[#0e3b37] hover:bg-[#18534d] disabled:opacity-40 disabled:pointer-events-none border border-[#236a64] text-teal-200 hover:text-white transition-colors cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>

      {/* Entry / Edit Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#134E4A] border border-[#1d635d] rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1b5852] pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>{editingMedicine ? 'Edit Medicine & Pricing' : 'Add New Medicine Item'}</span>
              </h3>
              <button
                onClick={() => setShowEntryModal(false)}
                className="text-teal-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-teal-200 font-medium mb-1">Brand Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#0e3b37] border border-[#236a64] rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-emerald-400"
                    placeholder="e.g. Napa Extra"
                  />
                  {formErrors.name && <p className="text-rose-400 text-[10px] mt-1">{formErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-teal-200 font-medium mb-1">Generic Name *</label>
                  <input
                    type="text"
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    className="w-full bg-[#0e3b37] border border-[#236a64] rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-emerald-400"
                    placeholder="e.g. Paracetamol + Caffeine"
                  />
                  {formErrors.genericName && <p className="text-rose-400 text-[10px] mt-1">{formErrors.genericName}</p>}
                </div>

                <div>
                  <label className="block text-teal-200 font-medium mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-[#0e3b37] border border-[#236a64] rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-emerald-400"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-teal-200 font-medium mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-[#0e3b37] border border-[#236a64] rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-emerald-400"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-teal-200 font-medium mb-1">Purchase Rate (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0e3b37] border border-[#236a64] rounded-xl px-3 py-2 text-white font-mono focus:outline-hidden focus:border-emerald-400"
                  />
                  {formErrors.purchasePrice && <p className="text-rose-400 text-[10px] mt-1">{formErrors.purchasePrice}</p>}
                </div>

                <div>
                  <label className="block text-teal-200 font-medium mb-1">Selling Rate / MRP (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0e3b37] border border-[#236a64] rounded-xl px-3 py-2 text-emerald-300 font-bold font-mono focus:outline-hidden focus:border-emerald-400"
                  />
                  {formErrors.sellingPrice && <p className="text-rose-400 text-[10px] mt-1">{formErrors.sellingPrice}</p>}
                </div>

                <div>
                  <label className="block text-teal-200 font-medium mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0e3b37] border border-[#236a64] rounded-xl px-3 py-2 text-white font-mono focus:outline-hidden focus:border-emerald-400"
                  />
                  {formErrors.stockQuantity && <p className="text-rose-400 text-[10px] mt-1">{formErrors.stockQuantity}</p>}
                </div>

                <div>
                  <label className="block text-teal-200 font-medium mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full bg-[#0e3b37] border border-[#236a64] rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-emerald-400"
                  />
                  {formErrors.expiryDate && <p className="text-rose-400 text-[10px] mt-1">{formErrors.expiryDate}</p>}
                </div>
              </div>

              {/* Profit Indicator */}
              <div className="p-3 bg-[#0e3b37] border border-[#236a64] rounded-xl flex items-center justify-between text-xs">
                <span>Unit Profit: <strong className="text-emerald-300 font-mono">+৳{formUnitProfit.toFixed(2)}</strong></span>
                <span>Margin: <strong className="text-emerald-300 font-mono">{formProfitMargin}%</strong></span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1b5852]">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#0e3b37] hover:bg-[#18534d] border border-[#236a64] text-teal-200 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/40"
                >
                  {editingMedicine ? 'Update Medicine' : 'Save Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMedicine && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#134E4A] border border-[#1d635d] rounded-2xl max-w-sm w-full p-5 shadow-2xl text-white">
            <h4 className="text-sm font-bold text-rose-300 flex items-center gap-2 mb-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Confirm Deletion</span>
            </h4>
            <p className="text-xs text-teal-200/90 mb-4 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">"{deletingMedicine.name}"</strong>? This will remove it from the catalog.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeletingMedicine(null)}
                className="px-3.5 py-1.5 rounded-xl bg-[#0e3b37] border border-[#236a64] text-xs font-semibold text-teal-200 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      <ImportCsvModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={(count) => {
          setShowImportModal(false);
          triggerToast(`Successfully imported ${count} medicines!`);
          refreshMedicines();
        }}
        onSaveToDatabase={bulkAddMedicines}
      />

      {/* Database Schema Modal */}
      {showSchemaModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#134E4A] border border-[#1d635d] rounded-2xl max-w-2xl w-full p-5 shadow-2xl text-white max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#1b5852] pb-3 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Medicine Database Schema</span>
              </h3>
              <button
                onClick={() => setShowSchemaModal(false)}
                className="text-teal-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 border-b border-[#1b5852] pb-2 mb-3 text-xs">
              <button
                onClick={() => setActiveSchemaTab('postgres')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeSchemaTab === 'postgres' ? 'bg-[#0e3b37] text-emerald-300 border border-[#236a64]' : 'text-teal-300'
                }`}
              >
                PostgreSQL SQL
              </button>
              <button
                onClick={() => setActiveSchemaTab('prisma')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeSchemaTab === 'prisma' ? 'bg-[#0e3b37] text-emerald-300 border border-[#236a64]' : 'text-teal-300'
                }`}
              >
                Prisma Schema
              </button>
              <button
                onClick={() => setActiveSchemaTab('sampleJson')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeSchemaTab === 'sampleJson' ? 'bg-[#0e3b37] text-emerald-300 border border-[#236a64]' : 'text-teal-300'
                }`}
              >
                Sample JSON
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#0a2723] rounded-xl p-3 border border-[#1b5852]">
              <pre className="text-[11px] font-mono text-teal-200 whitespace-pre-wrap leading-relaxed">
                {activeSchemaTab === 'postgres'
                  ? POSTGRESQL_SCHEMA
                  : activeSchemaTab === 'prisma'
                  ? PRISMA_SCHEMA
                  : JSON.stringify(SAMPLE_MEDICINES_DATA, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#1b5852] mt-3 text-xs">
              {copySuccess ? (
                <span className="text-emerald-300 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Copied to clipboard!
                </span>
              ) : (
                <span className="text-teal-300/60">Ready for backend database setup</span>
              )}
              <button
                onClick={() =>
                  handleCopy(
                    activeSchemaTab === 'postgres'
                      ? POSTGRESQL_SCHEMA
                      : activeSchemaTab === 'prisma'
                      ? PRISMA_SCHEMA
                      : JSON.stringify(SAMPLE_MEDICINES_DATA, null, 2),
                    activeSchemaTab
                  )
                }
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Schema</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Database / Clear All Products Confirmation Modal */}
      <ResetDatabaseModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirmReset={handleConfirmReset}
        totalCount={totalMedicinesCount || medicines.length}
        isResetting={isResetting}
      />
    </div>
  );
};

export const MedicinePricingListView = MedicineList;
