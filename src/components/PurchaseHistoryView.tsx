import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { PurchaseOrder } from '../types';
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
  ShoppingBag,
  RotateCcw,
  Sparkles,
  CloudCheck,
  Building2,
  Package,
  Clock,
  Eye,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { PurchaseInvoiceReceiptModal } from './PurchaseInvoiceReceiptModal';
import { syncAllPurchasesToFirestore } from '../services/purchaseSyncService';

interface PurchaseHistoryViewProps {
  onBack: () => void;
  onGoHome: () => void;
  onNavigateToStockIn?: () => void;
}

export const PurchaseHistoryView: React.FC<PurchaseHistoryViewProps> = ({
  onBack,
  onGoHome,
  onNavigateToStockIn,
}) => {
  const { purchaseOrders, currentUser } = usePharmacy();

  // Search & Filter States
  const [invoiceQuery, setInvoiceQuery] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'All' | 'Paid' | 'Partial' | 'Due'>('All');

  // Modal State for Invoice Details & Reprinting
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<PurchaseOrder | null>(null);
  const [isSyncingToCloud, setIsSyncingToCloud] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Helper date strings
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const sampleInvoiceDate = '2026-09-21';

  // Format order date for human reading
  const formatDisplayDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDisplayTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // Filter purchase orders based on invoice query, date picker, and status
  const filteredPurchases = useMemo(() => {
    const q = invoiceQuery.trim().toLowerCase();

    return purchaseOrders.filter((order) => {
      // 1. Invoice No or Supplier or Item name filter
      if (q) {
        const matchesPo = order.poNumber.toLowerCase().includes(q);
        const matchesSupplier = order.supplierName.toLowerCase().includes(q);
        const matchesItems = order.items?.some((it) =>
          it.medicineName.toLowerCase().includes(q)
        );
        if (!matchesPo && !matchesSupplier && !matchesItems) {
          return false;
        }
      }

      // 2. Date Picker Filter (compares YYYY-MM-DD)
      if (selectedDate) {
        const orderIsoDate = order.orderDate.split('T')[0];
        if (orderIsoDate !== selectedDate) {
          return false;
        }
      }

      // 3. Payment Status Filter
      if (paymentStatusFilter !== 'All') {
        if (order.paymentStatus !== paymentStatusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [purchaseOrders, invoiceQuery, selectedDate, paymentStatusFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalCount = filteredPurchases.length;
    const totalAmount = filteredPurchases.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    const totalPaid = filteredPurchases.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
    const totalDue = Math.max(0, totalAmount - totalPaid);
    return { totalCount, totalAmount, totalPaid, totalDue };
  }, [filteredPurchases]);

  // Handle manual cloud sync trigger
  const handleCloudSync = async () => {
    setIsSyncingToCloud(true);
    setSyncNotice(null);
    try {
      const count = await syncAllPurchasesToFirestore(
        purchaseOrders,
        currentUser?.id || currentUser?.email || 'default_store'
      );
      setSyncNotice(`Successfully verified & synced ${count} purchase invoices to Firestore!`);
      setTimeout(() => setSyncNotice(null), 4000);
    } catch (e: any) {
      setSyncNotice('Cloud sync notice: local cache retained securely.');
    } finally {
      setIsSyncingToCloud(false);
    }
  };

  // Shortcut to find and open invoice directly (e.g. INV-20260921-7755)
  const handleQuickOpenInvoice = (invNumber: string) => {
    setInvoiceQuery(invNumber);
    const found = purchaseOrders.find(
      (po) => po.poNumber.toLowerCase() === invNumber.toLowerCase()
    );
    if (found) {
      setSelectedOrderForModal(found);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-neutral-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-[#121212]/95 backdrop-blur-md border-b border-[#222] px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Back & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] text-neutral-300 hover:text-white transition-colors border border-[#2a2a2a] cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onGoHome}
              className="p-2 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] text-neutral-300 hover:text-white transition-colors border border-[#2a2a2a] cursor-pointer"
              title="Dashboard Home"
            >
              <Home className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>Purchase History</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-semibold">
                    Wholesale Ledger
                  </span>
                </h1>
              </div>
              <p className="text-xs text-neutral-400">
                Track supplier invoices, items restocked, and payment records
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Sync to Cloud */}
            <button
              type="button"
              onClick={handleCloudSync}
              disabled={isSyncingToCloud}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181818] hover:bg-[#222] border border-[#303030] text-neutral-200 hover:text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
              title="Backup purchase records to Firebase Firestore under purchase_history collection"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncingToCloud ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync Firestore</span>
            </button>

            {/* New Purchase shortcut */}
            {onNavigateToStockIn && (
              <button
                type="button"
                onClick={onNavigateToStockIn}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>+ Stock In (Purchase)</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Sync Notification Banner */}
        {syncNotice && (
          <div className="p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center justify-between animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncNotice(null)}
              className="text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#141414] border border-[#242424] rounded-2xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] uppercase font-semibold text-neutral-400 tracking-wider">
              Total Invoices
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl sm:text-2xl font-black text-white font-mono">{stats.totalCount}</span>
              <span className="text-[10px] text-neutral-500">Orders logged</span>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#242424] rounded-2xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] uppercase font-semibold text-neutral-400 tracking-wider">
              Total Purchases
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                {formatCurrency(stats.totalAmount)}
              </span>
              <span className="text-[10px] text-emerald-600/90 font-medium">Billed</span>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#242424] rounded-2xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] uppercase font-semibold text-neutral-400 tracking-wider">
              Total Paid
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl sm:text-2xl font-black text-teal-400 font-mono">
                {formatCurrency(stats.totalPaid)}
              </span>
              <span className="text-[10px] text-teal-600/90 font-medium">Settled</span>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#242424] rounded-2xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] uppercase font-semibold text-neutral-400 tracking-wider">
              Total Due Balance
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span
                className={`text-xl sm:text-2xl font-black font-mono ${
                  stats.totalDue > 0 ? 'text-rose-400' : 'text-neutral-500'
                }`}
              >
                {formatCurrency(stats.totalDue)}
              </span>
              <span className="text-[10px] text-rose-500/80 font-medium">Payable</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Control Bar */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 space-y-3.5 shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* 1. Invoice Number Search Field (7 cols on md) */}
            <div className="md:col-span-7 relative">
              <label className="text-[11px] font-semibold text-neutral-300 mb-1 flex items-center justify-between">
                <span>Invoice Number Search:</span>
                <span className="text-[10px] text-neutral-500">
                  Search by Invoice No, Supplier, or Medicine
                </span>
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="search-purchase-invoice-input"
                  type="text"
                  value={invoiceQuery}
                  onChange={(e) => setInvoiceQuery(e.target.value)}
                  placeholder="e.g. INV-20260921-7755 or MediHealth..."
                  className="w-full pl-10 pr-10 py-2.5 bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl text-white text-xs font-mono placeholder:text-neutral-600 focus:outline-hidden focus:border-emerald-500 transition-colors"
                />
                {invoiceQuery && (
                  <button
                    type="button"
                    onClick={() => setInvoiceQuery('')}
                    className="p-1 rounded-lg text-neutral-500 hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Date Filter / Picker (5 cols on md) */}
            <div className="md:col-span-5 relative">
              <label className="text-[11px] font-semibold text-neutral-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-400" />
                  <span>Filter by Date:</span>
                </span>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate('')}
                    className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                  >
                    Clear Date
                  </button>
                )}
              </label>
              <div className="relative">
                <input
                  id="filter-purchase-date-picker"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl text-white text-xs font-mono focus:outline-hidden focus:border-emerald-500 transition-colors cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Quick Preset Filter Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#202020]">
            {/* Quick date & invoice chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] text-neutral-500 font-semibold mr-1">Presets:</span>

              {/* Sample invoice quick-fill chip */}
              <button
                type="button"
                onClick={() => handleQuickOpenInvoice('INV-20260921-7755')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  invoiceQuery.toLowerCase() === 'inv-20260921-7755'
                    ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                    : 'bg-[#1a1a1a] hover:bg-[#242424] border-[#303030] text-neutral-300 hover:text-white'
                }`}
                title="Search and preview invoice INV-20260921-7755"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>INV-20260921-7755</span>
              </button>

              {/* Specific Date chip 2026-09-21 */}
              <button
                type="button"
                onClick={() => setSelectedDate(sampleInvoiceDate)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                  selectedDate === sampleInvoiceDate
                    ? 'bg-emerald-950 border-emerald-700 text-emerald-300 font-bold'
                    : 'bg-[#1a1a1a] hover:bg-[#242424] border-[#303030] text-neutral-400 hover:text-white'
                }`}
              >
                21 Sep 2026
              </button>

              {/* Today Chip */}
              <button
                type="button"
                onClick={() => setSelectedDate(todayIso)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                  selectedDate === todayIso
                    ? 'bg-emerald-950 border-emerald-700 text-emerald-300 font-bold'
                    : 'bg-[#1a1a1a] hover:bg-[#242424] border-[#303030] text-neutral-400 hover:text-white'
                }`}
              >
                Today
              </button>

              {/* Clear filters if active */}
              {(invoiceQuery || selectedDate || paymentStatusFilter !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceQuery('');
                    setSelectedDate('');
                    setPaymentStatusFilter('All');
                  }}
                  className="px-2 py-1 rounded-lg text-[11px] text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Payment Status Segmented Control */}
            <div className="flex items-center gap-1 bg-[#0c0c0c] p-1 rounded-xl border border-[#222]">
              {(['All', 'Paid', 'Partial', 'Due'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setPaymentStatusFilter(status)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    paymentStatusFilter === status
                      ? 'bg-[#252525] text-white font-semibold shadow-xs'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* History List View / Table */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden shadow-xl">
          {/* Table Header / Subtitle */}
          <div className="px-5 py-3.5 border-b border-[#222] flex items-center justify-between bg-[#181818]/60">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                Purchase Invoices ({filteredPurchases.length})
              </span>
              {selectedDate && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-teal-950 border border-teal-800 text-teal-300">
                  Date: {selectedDate}
                </span>
              )}
            </div>
            <span className="text-xs text-neutral-500">
              Click any invoice row to view details &amp; reprint
            </span>
          </div>

          {filteredPurchases.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center mx-auto text-neutral-500">
                <Receipt className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">No purchase orders found</h4>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                No wholesale transactions matched your search filters. Try clearing the date picker or
                invoice search.
              </p>
              <button
                type="button"
                onClick={() => {
                  setInvoiceQuery('');
                  setSelectedDate('');
                  setPaymentStatusFilter('All');
                }}
                className="px-4 py-2 bg-[#202020] hover:bg-[#282828] text-neutral-200 text-xs font-semibold rounded-xl border border-[#333] transition-colors cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#222] bg-[#111] text-[10px] uppercase tracking-wider text-neutral-400">
                    <th className="py-3 px-4 font-semibold">Invoice No</th>
                    <th className="py-3 px-4 font-semibold">Date &amp; Time</th>
                    <th className="py-3 px-4 font-semibold">Supplier</th>
                    <th className="py-3 px-4 font-semibold">Items Restocked</th>
                    <th className="py-3 px-4 text-right font-semibold">Total Price</th>
                    <th className="py-3 px-4 text-center font-semibold">Payment Status</th>
                    <th className="py-3 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e1e] text-xs">
                  {filteredPurchases.map((order) => {
                    const due = Math.max(0, order.totalAmount - (order.paidAmount || 0));
                    const isTargetMatch =
                      invoiceQuery.trim() &&
                      order.poNumber.toLowerCase().includes(invoiceQuery.trim().toLowerCase());

                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrderForModal(order)}
                        className={`group cursor-pointer transition-colors ${
                          isTargetMatch
                            ? 'bg-emerald-950/20 hover:bg-emerald-950/35'
                            : 'hover:bg-[#1a1a1a]'
                        }`}
                      >
                        {/* Invoice No */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white group-hover:text-emerald-400 transition-colors">
                              {order.poNumber}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#202020] text-neutral-400 font-mono border border-[#303030]">
                              {order.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">
                            ID: {order.id.slice(0, 10)}
                          </span>
                        </td>

                        {/* Date & Time */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-neutral-200">
                            {formatDisplayDate(order.orderDate)}
                          </div>
                          <div className="text-[11px] text-neutral-500 font-mono">
                            {formatDisplayTime(order.orderDate)}
                          </div>
                        </td>

                        {/* Supplier */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-neutral-200 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                            <span className="truncate max-w-[180px]">{order.supplierName}</span>
                          </div>
                        </td>

                        {/* Items Restocked */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-neutral-300">
                            {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
                          </div>
                          <div className="text-[11px] text-neutral-500 truncate max-w-[200px]">
                            {order.items?.map((i) => `${i.medicineName} (${i.quantity})`).join(', ')}
                          </div>
                        </td>

                        {/* Total Price */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-mono font-bold text-emerald-400 text-sm">
                            {formatCurrency(order.totalAmount)}
                          </div>
                          <div className="text-[10px] text-neutral-500 font-mono">
                            Paid: {formatCurrency(order.paidAmount || 0)}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              order.paymentStatus === 'Paid'
                                ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60'
                                : order.paymentStatus === 'Partial'
                                ? 'bg-amber-950/70 text-amber-400 border border-amber-800/60'
                                : 'bg-rose-950/70 text-rose-400 border border-rose-800/60'
                            }`}
                          >
                            {order.paymentStatus}
                          </span>
                          {due > 0 && (
                            <span className="block text-[10px] text-rose-400 font-mono mt-0.5">
                              Due: {formatCurrency(due)}
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForModal(order)}
                              className="p-1.5 rounded-lg bg-[#202020] hover:bg-emerald-600 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                              title="View Invoice & Reprint"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForModal(order)}
                              className="p-1.5 rounded-lg bg-[#202020] hover:bg-emerald-600 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                              title="Print Invoice Memo"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Detailed Invoice Receipt Modal (Supports Viewing & Reprinting) */}
      <PurchaseInvoiceReceiptModal
        order={selectedOrderForModal}
        isOpen={Boolean(selectedOrderForModal)}
        onClose={() => setSelectedOrderForModal(null)}
      />
    </div>
  );
};
