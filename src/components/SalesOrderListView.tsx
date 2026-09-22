import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { Sale } from '../types';
import {
  ArrowLeft,
  Home,
  Search,
  Calendar,
  X,
  Printer,
  Receipt,
  CheckCircle2,
  Filter,
  Check,
  RotateCcw,
  CalendarDays,
  Edit3,
  Save,
} from 'lucide-react';
import { PrintableInvoiceModal } from './PrintableInvoiceModal';

interface SalesOrderListViewProps {
  onBack: () => void;
  onGoHome: () => void;
}

export const SalesOrderListView: React.FC<SalesOrderListViewProps> = ({
  onBack,
  onGoHome,
}) => {
  const { sales, updateSaleDate } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');

  // Date Filter State
  const [isSetDateModalOpen, setIsSetDateModalOpen] = useState(false);
  const [dateFilterType, setDateFilterType] = useState<'single' | 'range'>('single');
  const [tempSingleDate, setTempSingleDate] = useState<string>('');
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');

  // Active Applied Filter State
  const [appliedDateFilter, setAppliedDateFilter] = useState<{
    active: boolean;
    type: 'single' | 'range';
    singleDate?: string;
    startDate?: string;
    endDate?: string;
    label?: string;
  }>({
    active: false,
    type: 'single',
  });

  // Selected Sale for Detail Modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [printSale, setPrintSale] = useState<Sale | null>(null);

  // Edit Order Date State (within detail modal)
  const [isEditingOrderDate, setIsEditingOrderDate] = useState(false);
  const [editOrderDateValue, setEditOrderDateValue] = useState('');

  // Date formatter: returns DD-MM-YYYY (e.g. 11-09-2026) as seen in user screenshot
  const formatOrderDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr;
    }
  };

  // Helper dates
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Filter sales based on search query and applied date filters
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const saleDateIso = sale.date.split('T')[0];

      // Date Filtering
      if (appliedDateFilter.active) {
        if (appliedDateFilter.type === 'single' && appliedDateFilter.singleDate) {
          if (saleDateIso !== appliedDateFilter.singleDate) return false;
        } else if (appliedDateFilter.type === 'range') {
          if (appliedDateFilter.startDate && saleDateIso < appliedDateFilter.startDate) {
            return false;
          }
          if (appliedDateFilter.endDate && saleDateIso > appliedDateFilter.endDate) {
            return false;
          }
        }
      }

      // Search query filter (Order ID, Customer Name, Customer Phone, Medicine Name)
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchOrderId = sale.invoiceNumber.toLowerCase().includes(q);
      const matchCustomerName = (sale.customerName || 'Unknown').toLowerCase().includes(q);
      const matchCustomerPhone = (sale.customerPhone || 'Unknown').toLowerCase().includes(q);
      const matchItems = sale.items.some((it) =>
        it.medicineName.toLowerCase().includes(q)
      );

      return matchOrderId || matchCustomerName || matchCustomerPhone || matchItems;
    });
  }, [sales, searchQuery, appliedDateFilter]);

  // Open "Set Date" modal with current values preloaded
  const handleOpenSetDateModal = () => {
    if (appliedDateFilter.active) {
      setDateFilterType(appliedDateFilter.type);
      setTempSingleDate(appliedDateFilter.singleDate || '');
      setTempStartDate(appliedDateFilter.startDate || '');
      setTempEndDate(appliedDateFilter.endDate || '');
    } else {
      setTempSingleDate(todayIso);
      setTempStartDate(todayIso);
      setTempEndDate(todayIso);
    }
    setIsSetDateModalOpen(true);
  };

  // Apply single date
  const handleApplySingleDate = (dateVal: string, customLabel?: string) => {
    if (!dateVal) return;
    setAppliedDateFilter({
      active: true,
      type: 'single',
      singleDate: dateVal,
      label: customLabel || formatOrderDate(dateVal),
    });
    setIsSetDateModalOpen(false);
  };

  // Apply date range
  const handleApplyDateRange = () => {
    if (!tempStartDate && !tempEndDate) return;
    const start = tempStartDate || tempEndDate;
    const end = tempEndDate || tempStartDate;
    setAppliedDateFilter({
      active: true,
      type: 'range',
      startDate: start,
      endDate: end,
      label: `${formatOrderDate(start)} to ${formatOrderDate(end)}`,
    });
    setIsSetDateModalOpen(false);
  };

  // Clear date filter
  const handleClearDateFilter = () => {
    setAppliedDateFilter({
      active: false,
      type: 'single',
    });
    setTempSingleDate('');
    setTempStartDate('');
    setTempEndDate('');
    setIsSetDateModalOpen(false);
  };

  // Save updated date for an existing order
  const handleSaveOrderDate = () => {
    if (!selectedSale || !editOrderDateValue) return;
    const updatedIso = `${editOrderDateValue}T12:00:00Z`;
    updateSaleDate(selectedSale.id, updatedIso);
    setSelectedSale({
      ...selectedSale,
      date: updatedIso,
    });
    setIsEditingOrderDate(false);
  };

  return (
    <div className="min-h-full bg-[#0d2723] text-teal-100 flex flex-col font-sans pb-16">
      {/* Top Header Bar */}
      <div className="px-4 py-3.5 border-b border-[#18443e] flex items-center justify-between sticky top-0 bg-[#0d2723]/95 backdrop-blur-md z-30">
        {/* Back Button */}
        <button
          id="btn-sales-list-back"
          onClick={onBack}
          aria-label="Go Back"
          className="w-11 h-11 rounded-xl bg-[#143933] border border-[#1e4e46] flex items-center justify-center text-teal-200 hover:bg-[#1a4a42] active:scale-95 transition-all shadow-xs"
        >
          <ArrowLeft className="w-5 h-5 text-teal-200" />
        </button>

        {/* Centered Title */}
        <h1 className="text-xl font-bold text-teal-50 tracking-wide text-center">
          Sales Order List
        </h1>

        {/* Home Button */}
        <button
          id="btn-sales-list-home"
          onClick={onGoHome}
          aria-label="Back to Home Dashboard"
          className="w-11 h-11 rounded-xl bg-[#143933] border border-[#1e4e46] flex items-center justify-center text-teal-200 hover:bg-[#1a4a42] active:scale-95 transition-all shadow-xs"
        >
          <Home className="w-5 h-5 text-teal-200" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-md sm:max-w-xl mx-auto w-full px-4 pt-4 pb-8 space-y-3.5">
        {/* Search and Date Filter Row */}
        <div className="flex items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-teal-400/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="input-sales-order-search"
              type="text"
              placeholder="Search here..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-9 py-3 bg-[#123631] border border-[#1e4c45] rounded-2xl text-sm text-teal-50 placeholder-teal-400/40 focus:outline-none focus:border-teal-400/80 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-teal-400/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Calendar "Set Date" Button matching screenshot */}
          <button
            id="btn-set-date"
            onClick={handleOpenSetDateModal}
            aria-label="Set Date"
            title="Set Date"
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all shadow-xs active:scale-95 shrink-0 relative ${
              appliedDateFilter.active
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-900/30'
                : 'bg-[#143933] border-[#1e4e46] text-teal-300 hover:bg-[#1a4a42]'
            }`}
          >
            <Calendar className="w-5 h-5" />
            {appliedDateFilter.active && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-[#0d2723] absolute top-2 right-2" />
            )}
          </button>
        </div>

        {/* Active "Date Set" Capsule Indicator */}
        {appliedDateFilter.active && (
          <div className="flex items-center justify-between px-3.5 py-2 bg-[#143f38] border border-[#21655a] rounded-xl text-xs text-teal-100 shadow-xs animate-in fade-in">
            <div
              onClick={handleOpenSetDateModal}
              className="flex items-center gap-2 cursor-pointer hover:underline"
            >
              <CalendarDays className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>
                Date Set:{' '}
                <strong className="text-white font-semibold">
                  {appliedDateFilter.label}
                </strong>
              </span>
            </div>
            <button
              onClick={handleClearDateFilter}
              title="Clear date filter"
              className="p-1 rounded-md text-teal-300/70 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Section Counter matching screenshot: "Total Item: 2" */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[#8faea9] text-base font-medium">
            Total Item: {filteredSales.length}
          </span>
          {searchQuery && (
            <span className="text-xs text-teal-400/70">
              Filtering by &quot;{searchQuery}&quot;
            </span>
          )}
        </div>

        {/* Sales Orders List */}
        <div className="space-y-3.5">
          {filteredSales.length === 0 ? (
            <div className="bg-[#123631] border border-[#1e4c45] rounded-2xl p-8 text-center">
              <Receipt className="w-10 h-10 text-teal-400/40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-teal-100">No Sales Orders Found</p>
              <p className="text-xs text-teal-300/60 mt-1">
                {searchQuery || appliedDateFilter.active
                  ? 'No orders match your search or date filter.'
                  : 'Completed sales will appear in this order list.'}
              </p>
              {(searchQuery || appliedDateFilter.active) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    handleClearDateFilter();
                  }}
                  className="mt-3.5 px-4 py-2 bg-[#1b4b44] hover:bg-[#225e55] text-teal-100 text-xs font-bold rounded-xl"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            filteredSales.map((sale) => {
              const itemCount = sale.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
              const orderId = sale.invoiceNumber;

              return (
                <div
                  key={sale.id}
                  id={`sales-order-card-${sale.id}`}
                  className="bg-[#123631] border border-[#22574f] rounded-2xl p-4 sm:p-5 relative shadow-xs hover:border-teal-400/50 transition-all cursor-pointer group"
                  onClick={() => {
                    setSelectedSale(sale);
                    setIsEditingOrderDate(false);
                    setEditOrderDateValue(sale.date.split('T')[0]);
                  }}
                >
                  <div className="flex items-center justify-between">
                    {/* Left Column Data (Exact format from screenshot) */}
                    <div className="space-y-1 text-sm font-medium text-teal-100/90 leading-snug">
                      <p>
                        Customer Name:{' '}
                        <span className="text-teal-50 font-normal">
                          {sale.customerName || 'Unknown'}
                        </span>
                      </p>
                      <p>
                        Customer Phone:{' '}
                        <span className="text-teal-50 font-normal">
                          {sale.customerPhone || 'Unknown'}
                        </span>
                      </p>
                      <p>
                        Date:{' '}
                        <span className="text-teal-50 font-normal">
                          {formatOrderDate(sale.date)}
                        </span>
                      </p>
                      <p>
                        Total Amount:{' '}
                        <span className="text-teal-50 font-normal">
                          {sale.grandTotal.toFixed(2)} BDT
                        </span>
                      </p>
                      <p>
                        Total Item:{' '}
                        <span className="text-teal-50 font-normal">
                          {sale.items.length > 0 ? sale.items.length : itemCount}
                        </span>
                      </p>
                      <p>
                        Order ID:{' '}
                        <span className="text-teal-50 font-normal font-mono">
                          {orderId}
                        </span>
                      </p>
                    </div>

                    {/* Right Link: View more » (Exact styling from screenshot) */}
                    <div className="self-center pl-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSale(sale);
                          setIsEditingOrderDate(false);
                          setEditOrderDateValue(sale.date.split('T')[0]);
                        }}
                        className="text-[#3ec4ac] group-hover:text-[#5eead4] font-medium text-xs sm:text-sm flex items-center gap-1 transition-colors select-none"
                      >
                        View more »
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. DEDICATED "SET DATE" MODAL DIALOG                     */}
      {/* ========================================================= */}
      {isSetDateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#0f2d29] border border-[#235850] rounded-2xl max-w-sm sm:max-w-md w-full shadow-2xl overflow-hidden text-teal-100 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#1b4a43] flex items-center justify-between bg-[#123631]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1a4a42] flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-emerald-300" />
                </div>
                <h3 className="font-bold text-base text-white">Set Date</h3>
              </div>
              <button
                onClick={() => setIsSetDateModalOpen(false)}
                className="p-1.5 rounded-lg text-teal-300/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Quick Presets */}
              <div>
                <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block mb-2">
                  Quick Presets
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleApplySingleDate(todayIso, 'Today')}
                    className="py-2 px-2 bg-[#123631] hover:bg-[#1a4a42] border border-[#1e4c45] rounded-xl text-teal-100 font-semibold text-center transition-colors active:scale-95"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => handleApplySingleDate(yesterdayIso, 'Yesterday')}
                    className="py-2 px-2 bg-[#123631] hover:bg-[#1a4a42] border border-[#1e4c45] rounded-xl text-teal-100 font-semibold text-center transition-colors active:scale-95"
                  >
                    Yesterday
                  </button>
                  <button
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 7);
                      const start = d.toISOString().split('T')[0];
                      setTempStartDate(start);
                      setTempEndDate(todayIso);
                      setAppliedDateFilter({
                        active: true,
                        type: 'range',
                        startDate: start,
                        endDate: todayIso,
                        label: 'Last 7 Days',
                      });
                      setIsSetDateModalOpen(false);
                    }}
                    className="py-2 px-2 bg-[#123631] hover:bg-[#1a4a42] border border-[#1e4c45] rounded-xl text-teal-100 font-semibold text-center transition-colors active:scale-95"
                  >
                    Last 7 Days
                  </button>
                  <button
                    onClick={() => {
                      const now = new Date();
                      const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                      setAppliedDateFilter({
                        active: true,
                        type: 'range',
                        startDate: start,
                        endDate: todayIso,
                        label: 'This Month',
                      });
                      setIsSetDateModalOpen(false);
                    }}
                    className="py-2 px-2 bg-[#123631] hover:bg-[#1a4a42] border border-[#1e4c45] rounded-xl text-teal-100 font-semibold text-center transition-colors active:scale-95"
                  >
                    This Month
                  </button>
                  <button
                    onClick={handleClearDateFilter}
                    className="py-2 px-2 col-span-2 bg-[#183934] hover:bg-[#1f4a43] border border-[#275d55] rounded-xl text-rose-300 font-semibold text-center transition-colors flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Clear / All Dates
                  </button>
                </div>
              </div>

              {/* Mode Switcher Capsule */}
              <div className="bg-[#123631] border border-[#1e4c45] p-1 rounded-xl flex items-center">
                <button
                  onClick={() => setDateFilterType('single')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dateFilterType === 'single'
                      ? 'bg-[#1b4b44] text-white shadow-xs'
                      : 'text-teal-300/70 hover:text-white'
                  }`}
                >
                  Single Date
                </button>
                <button
                  onClick={() => setDateFilterType('range')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dateFilterType === 'range'
                      ? 'bg-[#1b4b44] text-white shadow-xs'
                      : 'text-teal-300/70 hover:text-white'
                  }`}
                >
                  Date Range
                </button>
              </div>

              {/* Form by Mode */}
              {dateFilterType === 'single' ? (
                <div className="space-y-3 bg-[#123631] border border-[#1e4c45] rounded-xl p-3.5">
                  <label className="font-bold text-teal-200 block text-xs">
                    Choose Order Date:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={tempSingleDate}
                      onChange={(e) => setTempSingleDate(e.target.value)}
                      className="flex-1 bg-[#0d2723] border border-[#1e4c45] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-400"
                    />
                    <button
                      type="button"
                      onClick={() => setTempSingleDate(todayIso)}
                      className="px-3 py-2.5 bg-[#1a4a42] hover:bg-[#225f55] text-teal-100 text-xs font-bold rounded-xl"
                    >
                      Today
                    </button>
                  </div>
                  {tempSingleDate && (
                    <span className="text-[11px] text-emerald-300 block">
                      Selected: <strong>{formatOrderDate(tempSingleDate)}</strong>
                    </span>
                  )}
                </div>
              ) : (
                <div className="space-y-3 bg-[#123631] border border-[#1e4c45] rounded-xl p-3.5">
                  <div>
                    <label className="font-bold text-teal-200 block text-xs mb-1">
                      From Date:
                    </label>
                    <input
                      type="date"
                      value={tempStartDate}
                      onChange={(e) => setTempStartDate(e.target.value)}
                      className="w-full bg-[#0d2723] border border-[#1e4c45] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-teal-200 block text-xs mb-1">
                      To Date:
                    </label>
                    <input
                      type="date"
                      value={tempEndDate}
                      onChange={(e) => setTempEndDate(e.target.value)}
                      className="w-full bg-[#0d2723] border border-[#1e4c45] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#123631] border-t border-[#1b4a43] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsSetDateModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-[#143933] hover:bg-[#1a4a42] text-teal-200 font-bold text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                id="btn-confirm-set-date"
                onClick={() => {
                  if (dateFilterType === 'single') {
                    handleApplySingleDate(tempSingleDate);
                  } else {
                    handleApplyDateRange();
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Set Date</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. ORDER DETAIL MODAL WITH "SET DATE" / EDIT ORDER DATE  */}
      {/* ========================================================= */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#0f2d29] border border-[#235850] rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-teal-100">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#1b4a43] flex items-center justify-between bg-[#123631]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1a4a42] flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Order #{selectedSale.invoiceNumber}
                  </h3>
                  <span className="text-[11px] text-teal-300/70">
                    {formatOrderDate(selectedSale.date)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-1.5 rounded-lg text-teal-300/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Customer & Order Metadata with Date Set Tool */}
              <div className="bg-[#123631] border border-[#1e4c45] rounded-xl p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-teal-400/70 block">Customer Name</span>
                    <span className="font-bold text-white text-xs">
                      {selectedSale.customerName || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-teal-400/70 block">Phone</span>
                    <span className="font-bold text-white text-xs">
                      {selectedSale.customerPhone || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-teal-400/70 block">Payment Method</span>
                    <span className="font-semibold text-emerald-300">
                      {selectedSale.paymentMethod || 'Cash'}
                    </span>
                  </div>
                  <div>
                    <span className="text-teal-400/70 block">Cashier</span>
                    <span className="text-teal-200">
                      {selectedSale.cashierName || 'Counter Staff'}
                    </span>
                  </div>
                </div>

                {/* Edit Order Date Row */}
                <div className="pt-2 border-t border-[#1a4a42] flex items-center justify-between">
                  <span className="text-teal-400/70 text-[11px]">Order Date:</span>
                  {!isEditingOrderDate ? (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono">
                        {formatOrderDate(selectedSale.date)}
                      </span>
                      <button
                        onClick={() => {
                          setIsEditingOrderDate(true);
                          setEditOrderDateValue(selectedSale.date.split('T')[0]);
                        }}
                        className="text-[11px] text-emerald-300 hover:text-emerald-200 flex items-center gap-1 underline"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit Date
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={editOrderDateValue}
                        onChange={(e) => setEditOrderDateValue(e.target.value)}
                        className="bg-[#0d2723] border border-[#1e4c45] rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                      />
                      <button
                        onClick={handleSaveOrderDate}
                        className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold"
                        title="Save Date"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setIsEditingOrderDate(false)}
                        className="p-1 text-teal-300/70 hover:text-white"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Medicine Line Items */}
              <div>
                <h4 className="font-bold text-teal-200 mb-2 uppercase tracking-wider text-[10px]">
                  Ordered Medicines ({selectedSale.items.length} items)
                </h4>
                <div className="border border-[#1e4c45] rounded-xl overflow-hidden bg-[#123631]/80 divide-y divide-[#1b4a43]">
                  {selectedSale.items.map((it, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-white block text-xs truncate">
                          {it.medicineName}
                        </span>
                        <span className="text-[10px] text-teal-300/70">
                          Qty: {it.quantity} × {it.unitPrice.toFixed(2)} BDT
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-300 font-mono text-xs">
                          {it.totalPrice.toFixed(2)} BDT
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-[#123631] border border-[#1e4c45] rounded-xl p-3 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-teal-300/80">
                  <span>Subtotal:</span>
                  <span>{selectedSale.subtotal.toFixed(2)} BDT</span>
                </div>
                {selectedSale.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount:</span>
                    <span>-{selectedSale.discountAmount.toFixed(2)} BDT</span>
                  </div>
                )}
                {selectedSale.taxAmount > 0 && (
                  <div className="flex justify-between text-teal-300/80">
                    <span>VAT / Tax ({selectedSale.taxRate}%):</span>
                    <span>+{selectedSale.taxAmount.toFixed(2)} BDT</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-[#1e4c45]">
                  <span>Total Amount:</span>
                  <span className="text-emerald-300 font-mono">
                    {selectedSale.grandTotal.toFixed(2)} BDT
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-teal-200">
                  <span>Amount Paid:</span>
                  <span>{(selectedSale.paidAmount ?? selectedSale.grandTotal).toFixed(2)} BDT</span>
                </div>
                {(selectedSale.dueAmount || 0) > 0 && (
                  <div className="flex justify-between text-[11px] text-rose-400 font-bold">
                    <span>Due Amount:</span>
                    <span>{selectedSale.dueAmount?.toFixed(2)} BDT</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-[#123631] border-t border-[#1b4a43] flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  const saleToPrint = selectedSale;
                  setSelectedSale(null);
                  setPrintSale(saleToPrint);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>

              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2 bg-[#1b4b44] hover:bg-[#246258] text-white rounded-xl font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE INVOICE MODAL */}
      {printSale && (
        <PrintableInvoiceModal
          sale={printSale}
          onClose={() => setPrintSale(null)}
        />
      )}
    </div>
  );
};
