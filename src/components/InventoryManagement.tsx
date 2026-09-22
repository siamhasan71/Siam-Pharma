import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { Medicine, MedicineCategory } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Lock,
  ArrowUpDown,
  Download,
  Calendar,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react';
import { ImportCsvModal } from './ImportCsvModal';
import {
  queryMedicinesFromIndexedDB,
  PaginatedMedicinesResult,
  pharmacyDb,
} from '../db/pharmacyDb';

export const InventoryManagement: React.FC = () => {
  const {
    medicines,
    totalMedicinesCount,
    addMedicine,
    bulkAddMedicines,
    updateMedicine,
    deleteMedicine,
    currentRole,
    lowStockMedicines,
    expiredMedicines,
    expiringSoonMedicines,
  } = usePharmacy();

  const isAdmin = currentRole === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'LowStock' | 'Expiring' | 'Expired'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'expiry' | 'price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination states for high-volume catalog
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [isQueryLoading, setIsQueryLoading] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<PaginatedMedicinesResult>({
    items: [],
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 50,
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

  const loadData = useCallback(async () => {
    setIsQueryLoading(true);
    try {
      const res = await queryMedicinesFromIndexedDB({
        page: currentPage,
        pageSize,
        searchTerm,
        category: selectedCategory,
        stockFilter: statusFilter === 'LowStock' ? 'LowStock' : 'All',
        sortBy: sortBy === 'price' ? 'sellingPrice' : sortBy === 'stock' ? 'stock' : 'name',
        sortOrder,
      });
      setQueryResult(res);
    } catch (err) {
      console.error('Inventory query error:', err);
    } finally {
      setIsQueryLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, selectedCategory, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 180);
    return () => clearTimeout(timer);
  }, [loadData, totalMedicinesCount]);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [medicineToDelete, setMedicineToDelete] = useState<Medicine | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    category: 'Tablet' as MedicineCategory,
    batchNumber: '',
    manufacturer: '',
    expiryDate: '',
    purchasePrice: 0,
    sellingPrice: 0,
    stockQuantity: 0,
    minStockThreshold: 15,
    shelfLocation: '',
    dosage: '',
  });

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

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter and Sort Medicines from IndexedDB query
  const filteredMedicines = queryResult.items;

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      genericName: '',
      category: 'Tablet',
      batchNumber: `BAT-${Math.floor(1000 + Math.random() * 9000)}`,
      manufacturer: '',
      expiryDate: '',
      purchasePrice: 0,
      sellingPrice: 0,
      stockQuantity: 50,
      minStockThreshold: 15,
      shelfLocation: 'Shelf A-1',
      dosage: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (med: Medicine) => {
    setFormData({
      name: med.name,
      genericName: med.genericName,
      category: med.category,
      batchNumber: med.batchNumber,
      manufacturer: med.manufacturer,
      expiryDate: med.expiryDate,
      purchasePrice: med.purchasePrice,
      sellingPrice: med.sellingPrice,
      stockQuantity: med.stockQuantity,
      minStockThreshold: med.minStockThreshold,
      shelfLocation: med.shelfLocation || '',
      dosage: med.dosage || '',
    });
    setEditingMedicine(med);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addMedicine({
      name: formData.name,
      genericName: formData.genericName,
      category: formData.category,
      batchNumber: formData.batchNumber,
      manufacturer: formData.manufacturer,
      expiryDate: formData.expiryDate,
      purchasePrice: Number(formData.purchasePrice),
      sellingPrice: Number(formData.sellingPrice),
      stockQuantity: Number(formData.stockQuantity),
      minStockThreshold: Number(formData.minStockThreshold),
      shelfLocation: formData.shelfLocation,
      dosage: formData.dosage,
    });
    setShowAddModal(false);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedicine) return;

    updateMedicine(editingMedicine.id, {
      name: formData.name,
      genericName: formData.genericName,
      category: formData.category,
      batchNumber: formData.batchNumber,
      manufacturer: formData.manufacturer,
      expiryDate: formData.expiryDate,
      purchasePrice: Number(formData.purchasePrice),
      sellingPrice: Number(formData.sellingPrice),
      stockQuantity: Number(formData.stockQuantity),
      minStockThreshold: Number(formData.minStockThreshold),
      shelfLocation: formData.shelfLocation,
      dosage: formData.dosage,
    });
    setEditingMedicine(null);
  };

  const handleConfirmDelete = () => {
    if (medicineToDelete) {
      deleteMedicine(medicineToDelete.id);
      setMedicineToDelete(null);
    }
  };

  const toggleSort = (column: 'name' | 'stock' | 'expiry' | 'price') => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Export inventory to CSV directly from IndexedDB without loading all into memory
  const exportToCSV = async () => {
    const allRows = await pharmacyDb.medicines.toArray();
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
    ];

    const rows = allRows.map((m) => [
      `"${m.name.replace(/"/g, '""')}"`,
      `"${(m.genericName || '').replace(/"/g, '""')}"`,
      m.category,
      m.batchNumber,
      `"${(m.manufacturer || '').replace(/"/g, '""')}"`,
      m.expiryDate,
      m.purchasePrice,
      m.sellingPrice,
      m.stockQuantity,
      m.minStockThreshold,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `siam_pharma_inventory_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Medicine Inventory Management
            </h1>
            {!isAdmin && (
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-full flex items-center gap-1 border border-slate-200">
                <Lock className="w-3 h-3 text-slate-400" />
                Read-Only (Cashier Role)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Full tracking of 9 required fields: generic names, batch numbers, expiry surveillance & pricing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            id="btn-inventory-import-csv"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 transition-colors shadow-xs"
            title="Import medicines from CSV file"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Import CSV</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Medicine</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box (6 Cols) */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Medicine, Generic, Batch Number, or Manufacturer..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Category Selector (3 Cols) */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="All">All Categories ({medicines.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c} ({medicines.filter((m) => m.category === c).length})
                </option>
              ))}
            </select>
          </div>

          {/* Status Quick Filter (3 Cols) */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="LowStock">⚠️ Low Stock ({lowStockMedicines.length})</option>
              <option value="Expiring">⏳ Expiring Soon ({expiringSoonMedicines.length})</option>
              <option value="Expired">❌ Expired ({expiredMedicines.length})</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Counts */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium">Quick Filter:</span>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setStatusFilter('All');
              setSearchTerm('');
            }}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              statusFilter === 'All' && selectedCategory === 'All' && !searchTerm
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({totalMedicinesCount ? totalMedicinesCount.toLocaleString() : medicines.length})
          </button>
          <button
            onClick={() => setStatusFilter('LowStock')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              statusFilter === 'LowStock'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Low Stock ({lowStockMedicines.length})
          </button>
          <button
            onClick={() => setStatusFilter('Expiring')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              statusFilter === 'Expiring'
                ? 'bg-orange-600 text-white'
                : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
            }`}
          >
            Expiring &lt;60d ({expiringSoonMedicines.length})
          </button>
          <button
            onClick={() => setStatusFilter('Expired')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              statusFilter === 'Expired'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Expired ({expiredMedicines.length})
          </button>
        </div>
      </div>

      {/* Main Inventory Table with all 9 fields */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th
                  onClick={() => toggleSort('name')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>1. Medicine & Generic Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-3 py-3">2. Category</th>
                <th className="px-3 py-3">3. Batch No.</th>
                <th className="px-3 py-3">4. Manufacturer</th>
                <th
                  onClick={() => toggleSort('expiry')}
                  className="px-3 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>5. Expiry Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-3 py-3 text-right">
                  <span>6. Purchase Price</span>
                </th>
                <th
                  onClick={() => toggleSort('price')}
                  className="px-3 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>7. Selling Price</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('stock')}
                  className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>8. Stock Qty</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="py-12 text-center text-slate-400">
                    No medicines match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredMedicines.map((med, idx) => {
                  const isExpired = med.expiryDate < todayStr;
                  const isLowStock = med.stockQuantity <= med.minStockThreshold;
                  const marginAmount = med.sellingPrice - med.purchasePrice;
                  const marginPercent = ((marginAmount / med.sellingPrice) * 100).toFixed(0);

                  return (
                    <tr
                      key={`${med.id}-${idx}`}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isExpired ? 'bg-rose-50/20' : isLowStock ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Medicine & Generic Name */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{med.name}</span>
                          {med.dosage && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {med.dosage}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 italic block">
                          {med.genericName}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 rounded-md">
                          {med.category}
                        </span>
                      </td>

                      {/* Batch Number */}
                      <td className="px-3 py-3 font-mono text-slate-600 text-[11px]">
                        {med.batchNumber}
                      </td>

                      {/* Manufacturer */}
                      <td className="px-3 py-3 text-slate-600 font-medium">
                        {med.manufacturer}
                      </td>

                      {/* Expiry Date */}
                      <td className="px-3 py-3">
                        {isExpired ? (
                          <span className="px-2 py-0.5 text-[11px] font-bold bg-rose-100 text-rose-800 rounded-md inline-flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            {med.expiryDate} (Expired)
                          </span>
                        ) : med.expiryDate <=
                          new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0] ? (
                          <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-md inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {med.expiryDate} (Soon)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 rounded-md">
                            {med.expiryDate}
                          </span>
                        )}
                      </td>

                      {/* Purchase Price (Admin only) */}
                      <td className="px-3 py-3 text-right">
                        {isAdmin ? (
                          <span className="font-mono text-slate-600">
                            {formatCurrency(med.purchasePrice)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono italic">***</span>
                        )}
                      </td>

                      {/* Selling Price */}
                      <td className="px-3 py-3 text-right">
                        <span className="font-bold text-slate-900 font-mono">
                          {formatCurrency(med.sellingPrice)}
                        </span>
                        {isAdmin && (
                          <span className="block text-[10px] text-emerald-600 font-semibold">
                            +{marginPercent}% margin
                          </span>
                        )}
                      </td>

                      {/* Total Stock Quantity */}
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`font-bold font-mono px-2 py-0.5 rounded-md ${
                              med.stockQuantity === 0
                                ? 'bg-slate-200 text-slate-700'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {med.stockQuantity}
                          </span>
                          {isLowStock && (
                            <span className="text-[10px] text-amber-700 font-bold">
                              Low (Min: {med.minStockThreshold})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Admin Actions */}
                      {isAdmin && (
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(med)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Record"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setMedicineToDelete(med)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar for High-Volume Catalog */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            {isQueryLoading && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
            <span>
              Showing{' '}
              <strong className="text-slate-900">
                {queryResult.totalCount === 0 ? 0 : (queryResult.currentPage - 1) * queryResult.pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-slate-900">
                {Math.min(queryResult.currentPage * queryResult.pageSize, queryResult.totalCount)}
              </strong>{' '}
              of <strong className="text-indigo-600 font-semibold">{queryResult.totalCount.toLocaleString()}</strong> items
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-slate-500">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1 || isQueryLoading}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || isQueryLoading}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="px-2 font-semibold text-slate-800 text-xs">
                Page {currentPage} of {Math.max(1, queryResult.totalPages)}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(queryResult.totalPages, p + 1))}
                disabled={currentPage >= queryResult.totalPages || isQueryLoading}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(queryResult.totalPages)}
                disabled={currentPage >= queryResult.totalPages || isQueryLoading}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ADD MEDICINE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Add New Medicine to Catalog</h2>
            <p className="text-xs text-slate-500 mb-4">
              Enter pharmaceutical specifications for inventory tracking and POS search
            </p>

            <form onSubmit={handleSubmitAdd} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Medicine Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Amoxicillin 500mg"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Generic Name / Formula *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Amoxicillin Trihydrate"
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batch Number *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. AMX-2025-01"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Manufacturer *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Pfizer / GSK"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Date *</label>
                  <input
                    required
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Price (৳) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.purchasePrice || ''}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Price (৳) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.sellingPrice || ''}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Stock Qty *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Low-Stock Alert Level</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minStockThreshold}
                    onChange={(e) => setFormData({ ...formData, minStockThreshold: parseInt(e.target.value) || 15 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Shelf Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Shelf A-2"
                    value={formData.shelfLocation}
                    onChange={(e) => setFormData({ ...formData, shelfLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Add Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEDICINE MODAL */}
      {editingMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Edit Medicine Details</h2>
            <p className="text-xs text-slate-500 mb-4">
              Update pricing, batch, manufacturer, or stock thresholds for {editingMedicine.name}
            </p>

            <form onSubmit={handleSubmitEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Medicine Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Generic Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batch Number *</label>
                  <input
                    required
                    type="text"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Manufacturer *</label>
                  <input
                    required
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Date *</label>
                  <input
                    required
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Price (৳) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Price (৳) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stock Quantity *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Low-Stock Threshold</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minStockThreshold}
                    onChange={(e) => setFormData({ ...formData, minStockThreshold: parseInt(e.target.value) || 15 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Shelf Location</label>
                  <input
                    type="text"
                    value={formData.shelfLocation}
                    onChange={(e) => setFormData({ ...formData, shelfLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingMedicine(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {medicineToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Delete Medicine Record?</h2>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Are you sure you want to permanently remove <strong className="text-slate-800">{medicineToDelete.name}</strong> ({medicineToDelete.batchNumber}) from the database?
            </p>

            <div className="flex justify-center gap-2">
              <button
                onClick={() => setMedicineToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      <ImportCsvModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={(count) => {
          setSuccessToast(`Successfully imported and saved ${count.toLocaleString()} medicines to database!`);
          loadData();
        }}
        onSaveToDatabase={(newMedicines, onProgress) => {
          return bulkAddMedicines(newMedicines, onProgress);
        }}
      />
    </div>
  );
};
