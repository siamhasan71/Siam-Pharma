import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import {
  isToday,
  isYesterday,
  isLast7Days,
  isLast30Days,
  isThisMonth,
  parseRecordDate,
} from '../utils/dateUtils';
import {
  ArrowLeft,
  Search,
  Calendar,
  SlidersHorizontal,
  ChevronRight,
  Pill,
  X,
  Printer,
  FileText,
  ShoppingBag,
  ShoppingCart,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { Medicine, Sale, PurchaseOrder } from '../types';

interface ReportScreenProps {
  onBack?: () => void;
}

type ReportTab = 'sales' | 'purchase' | 'stock';
type TimeframeOption = '7days' | 'today' | 'yesterday' | '30days' | 'month';

export const ReportScreen: React.FC<ReportScreenProps> = ({ onBack }) => {
  const { sales, purchaseOrders, medicines } = usePharmacy();

  // Active Tab
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');

  // Search & Filter state
  const [dateSearch, setDateSearch] = useState<string>('');
  const [stockSearch, setStockSearch] = useState<string>('');
  const deferredStockSearch = useDeferredValue(stockSearch);
  const [stockPage, setStockPage] = useState<number>(1);
  const STOCK_PAGE_SIZE = 40;

  const [timeframe, setTimeframe] = useState<TimeframeOption>('7days');
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [stockFilterCategory, setStockFilterCategory] = useState<string>('all');
  const [stockFilterStatus, setStockFilterStatus] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');

  // Reset pagination on filter change
  useEffect(() => {
    setStockPage(1);
  }, [deferredStockSearch, stockFilterCategory, stockFilterStatus]);

  // Order Details Modal State
  const [showSalesOrdersModal, setShowSalesOrdersModal] = useState<boolean>(false);
  const [showPurchaseOrdersModal, setShowPurchaseOrdersModal] = useState<boolean>(false);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);
  const [selectedPODetail, setSelectedPODetail] = useState<PurchaseOrder | null>(null);

  // Selected Stock Item Detail Modal
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

  // Helper timeframe filter
  const matchesTimeframe = (dateStr?: string | null) => {
    if (!dateStr) return false;
    if (timeframe === 'today') return isToday(dateStr);
    if (timeframe === 'yesterday') return isYesterday(dateStr);
    if (timeframe === '7days') return isLast7Days(dateStr);
    if (timeframe === '30days') return isLast30Days(dateStr);
    if (timeframe === 'month') return isThisMonth(dateStr);
    return true;
  };

  // Sales calculations filtered by date search & timeframe
  const filteredSales = useMemo(() => {
    if (!Array.isArray(sales)) return [];
    return sales.filter((s) => {
      if (!s) return false;
      if (dateSearch.trim()) {
        const query = dateSearch.trim().toLowerCase();
        const dateStr = s.date ? String(s.date).slice(0, 10).toLowerCase() : '';
        const invStr = s.invoiceNumber ? String(s.invoiceNumber).toLowerCase() : '';
        if (!dateStr.includes(query) && !invStr.includes(query)) return false;
      }
      return matchesTimeframe(s.date);
    });
  }, [sales, dateSearch, timeframe]);

  const totalSalesCount = filteredSales.length;
  const totalSalesAmount = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);
  }, [filteredSales]);

  // Purchase calculations filtered by date search & timeframe
  const filteredPurchases = useMemo(() => {
    if (!Array.isArray(purchaseOrders)) return [];
    return purchaseOrders.filter((po) => {
      if (!po) return false;
      if (dateSearch.trim()) {
        const query = dateSearch.trim().toLowerCase();
        const dateStr = po.orderDate ? String(po.orderDate).slice(0, 10).toLowerCase() : '';
        const numStr = po.poNumber ? String(po.poNumber).toLowerCase() : '';
        if (!dateStr.includes(query) && !numStr.includes(query)) return false;
      }
      return matchesTimeframe(po.orderDate);
    });
  }, [purchaseOrders, dateSearch, timeframe]);

  const totalPurchaseCount = filteredPurchases.length;
  const totalPurchaseAmount = useMemo(() => {
    return filteredPurchases.reduce((acc, po) => acc + (po.totalAmount || 0), 0);
  }, [filteredPurchases]);

  // Statistics Chart Data: Days of the week (Sun to Sat)
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Sales Statistics chart calculation
  const salesStats = useMemo(() => {
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    let hasSales = false;

    filteredSales.forEach((s) => {
      const d = parseRecordDate(s.date);
      if (d) {
        const dayIndex = d.getDay(); // 0 = Sun, 6 = Sat
        dayTotals[dayIndex] += s.grandTotal || 0;
        hasSales = true;
      }
    });

    const maxVal = Math.max(...dayTotals, 16);
    return {
      dayTotals,
      maxVal,
      hasSales,
      ticks: [
        maxVal,
        Math.round(maxVal * 0.625),
        Math.round(maxVal * 0.312),
        0,
      ],
    };
  }, [filteredSales]);

  // Purchase Statistics chart calculation
  const purchaseStats = useMemo(() => {
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    let hasPurchases = false;

    filteredPurchases.forEach((po) => {
      const d = parseRecordDate(po.orderDate);
      if (d) {
        const dayIndex = d.getDay();
        dayTotals[dayIndex] += po.totalAmount || 0;
        hasPurchases = true;
      }
    });

    const maxVal = Math.max(...dayTotals, 65);
    return {
      dayTotals,
      maxVal,
      hasPurchases,
      ticks: [
        maxVal,
        Math.round(maxVal * 0.66),
        Math.round(maxVal * 0.32),
        0,
      ],
    };
  }, [filteredPurchases]);

  // Stock items & sales count mapping
  const medicineSalesCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!Array.isArray(sales)) return map;
    sales.forEach((s) => {
      (s.items || []).forEach((item) => {
        if (!item) return;
        if (item.medicineId) {
          map[item.medicineId] = (map[item.medicineId] || 0) + (item.quantity || 1);
        }
        if (item.medicineName) {
          map[item.medicineName.toLowerCase()] = (map[item.medicineName.toLowerCase()] || 0) + (item.quantity || 1);
        }
      });
    });
    return map;
  }, [sales]);

  // Filtered medicines for Stock Report
  const filteredMedicines = useMemo(() => {
    if (!Array.isArray(medicines)) return [];
    const q = deferredStockSearch.toLowerCase().trim();

    return medicines.filter((med) => {
      if (!med) return false;
      // Text search
      if (q) {
        const matchesName = (med.name || '').toLowerCase().includes(q);
        const matchesGen = (med.genericName || '').toLowerCase().includes(q);
        const matchesMfr = (med.manufacturer || '').toLowerCase().includes(q);
        if (!matchesName && !matchesGen && !matchesMfr) return false;
      }
      // Dosage form category filter
      if (stockFilterCategory !== 'all') {
        if (med.category !== stockFilterCategory) return false;
      }
      // Stock status filter
      if (stockFilterStatus === 'in_stock' && (med.stockQuantity || 0) <= 0) return false;
      if (stockFilterStatus === 'out_of_stock' && (med.stockQuantity || 0) > 0) return false;

      return true;
    });
  }, [medicines, deferredStockSearch, stockFilterCategory, stockFilterStatus]);

  // Visible medicines subset for ultra-fast rendering
  const visibleMedicines = useMemo(() => {
    return filteredMedicines.slice(0, stockPage * STOCK_PAGE_SIZE);
  }, [filteredMedicines, stockPage, STOCK_PAGE_SIZE]);

  // Stock summary metrics
  const totalStockItems = filteredMedicines.length;
  const totalStockUnits = useMemo(() => {
    return filteredMedicines.reduce((sum, m) => sum + (m.stockQuantity || 0), 0);
  }, [filteredMedicines]);

  const totalStockValue = useMemo(() => {
    return filteredMedicines.reduce((sum, m) => sum + (m.stockQuantity || 0) * (m.purchasePrice || 0), 0);
  }, [filteredMedicines]);

  return (
    <div className="min-h-screen bg-[#0e2621] text-neutral-200 pb-16 flex flex-col font-sans select-none">
      {/* 1. Header Bar matching Screenshot */}
      <header className="sticky top-0 z-20 bg-[#0e2621]/95 backdrop-blur-md px-4 py-3 border-b border-[#1b3e37] flex items-center justify-between">
        <button
          onClick={onBack}
          aria-label="Back to Dashboard"
          className="w-10 h-10 rounded-xl bg-[#14342e] border border-[#1f4b42] flex items-center justify-center text-teal-300 hover:text-white hover:bg-[#1a443c] active:scale-95 transition-all shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-xl font-bold text-white tracking-tight">Report</h1>

        <div className="w-10 flex justify-end">
          {/* Subtle placeholder / sync dot */}
          <span className="w-2 h-2 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-md w-full mx-auto px-4 pt-3 flex-1 flex flex-col space-y-4">
        {/* 2. Top Segmented 3-Tab Pill Control */}
        <nav
          aria-label="Report Sub Navigation"
          className="p-1 rounded-full bg-[#a6c2bb] shadow-inner flex items-center justify-between"
        >
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex-1 py-2 text-center text-xs sm:text-sm font-bold rounded-full transition-all duration-200 ${
              activeTab === 'sales'
                ? 'bg-[#1a3d36] text-[#99c4ba] shadow-sm'
                : 'text-[#1a3d36] hover:text-[#0b1f1b]'
            }`}
          >
            Sales Report
          </button>

          <button
            onClick={() => setActiveTab('purchase')}
            className={`flex-1 py-2 text-center text-xs sm:text-sm font-bold rounded-full transition-all duration-200 ${
              activeTab === 'purchase'
                ? 'bg-[#1a3d36] text-[#99c4ba] shadow-sm'
                : 'text-[#1a3d36] hover:text-[#0b1f1b]'
            }`}
          >
            Purchase Report
          </button>

          <button
            onClick={() => setActiveTab('stock')}
            className={`flex-1 py-2 text-center text-xs sm:text-sm font-bold rounded-full transition-all duration-200 ${
              activeTab === 'stock'
                ? 'bg-[#1a3d36] text-[#99c4ba] shadow-sm'
                : 'text-[#1a3d36] hover:text-[#0b1f1b]'
            }`}
          >
            Stock Report
          </button>
        </nav>

        {/* TAB 1: SALES REPORT */}
        {activeTab === 'sales' && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Search with date bar */}
            <div className="relative rounded-xl bg-[#13312c] border border-[#214c44] flex items-center px-3 py-2.5 shadow-sm">
              <Search className="w-4 h-4 text-cyan-400 shrink-0 mr-2.5" />
              <input
                type="text"
                value={dateSearch}
                onChange={(e) => setDateSearch(e.target.value)}
                placeholder="Search with date..."
                className="w-full bg-transparent text-sm text-white placeholder-[#7faaa0] focus:outline-none"
              />
              {dateSearch && (
                <button
                  onClick={() => setDateSearch('')}
                  className="p-1 text-[#7faaa0] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Total Sales Summary Card */}
            <section className="rounded-2xl bg-[#153831] border border-[#23534a] p-4 shadow-lg">
              {/* Row 1 Header */}
              <div className="flex items-center justify-between text-xs font-semibold text-[#8ab3a9] mb-1">
                <span>Total Sales</span>
                <span>Total Amount</span>
              </div>

              {/* Row 1 Content */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {totalSalesCount}
                  </div>
                  <div className="text-xs text-[#7ea89e] mt-0.5">
                    Salesman Id: 164020
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {totalSalesAmount.toFixed(2)} BDT
                  </div>
                </div>
              </div>

              {/* Divider Line */}
              <div className="border-t border-[#23534a] my-3" />

              {/* Row 2 Content */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {totalSalesCount}
                  </div>
                  <div className="text-xs text-[#7ea89e] mt-0.5">
                    Total Sales
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg sm:text-xl font-bold text-[#ff6b6b] tracking-tight">
                    {totalSalesAmount.toFixed(2)} BDT
                  </div>
                  <div className="text-xs text-[#7ea89e] mt-0.5">
                    Total Amount
                  </div>
                </div>
              </div>
            </section>

            {/* Sales Statistics Bar Chart Card */}
            <section className="rounded-2xl bg-[#153831] border border-[#23534a] p-4 shadow-lg">
              {/* Header with Timeframe Select */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Sales Statistics
                </h2>
                <div className="relative">
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value as TimeframeOption)}
                    className="bg-[#14342e] border border-[#23534a] rounded-lg px-2.5 py-1 text-xs text-[#a0c7be] font-medium focus:outline-none appearance-none pr-6 cursor-pointer"
                  >
                    <option value="7days">Last 7 Days</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="month">This Month</option>
                  </select>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#a0c7be] text-[10px]">
                    ▼
                  </span>
                </div>
              </div>

              {/* Chart Visual matching Screenshot */}
              <div className="h-44 sm:h-48 flex items-stretch gap-2 pt-2">
                {/* Y-Axis labels */}
                <div className="w-6 flex flex-col justify-between text-[11px] text-[#7ea89e] text-right pr-1 pb-6">
                  {salesStats.ticks.map((tick, idx) => (
                    <span key={idx}>{tick}</span>
                  ))}
                </div>

                {/* Bars Area */}
                <div className="flex-1 flex flex-col justify-between">
                  {/* Bars Grid */}
                  <div className="flex-1 flex items-end justify-between px-2 gap-2 border-b border-[#23534a]/80 pb-1 relative">
                    {daysOfWeek.map((day, idx) => {
                      const val = salesStats.dayTotals[idx];
                      const heightPercent = salesStats.maxVal > 0 ? (val / salesStats.maxVal) * 100 : 0;
                      const hasValue = val > 0;

                      return (
                        <div
                          key={day}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative"
                        >
                          {/* Tooltip on hover */}
                          {hasValue && (
                            <div className="absolute -top-7 opacity-0 group-hover:opacity-100 bg-black/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded pointer-events-none transition-opacity whitespace-nowrap z-10 border border-emerald-500/40">
                              {val.toFixed(2)} BDT
                            </div>
                          )}

                          {/* Bar Element */}
                          <div
                            style={{ height: hasValue ? `${Math.max(12, heightPercent)}%` : '0%' }}
                            className={`w-full max-w-[28px] rounded-t-sm transition-all duration-500 ${
                              hasValue
                                ? 'bg-[#5b8f84] group-hover:bg-[#72ad9f]'
                                : 'bg-transparent'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* X-Axis labels */}
                  <div className="flex justify-between px-2 pt-2 text-[11px] text-[#7ea89e]">
                    {daysOfWeek.map((day) => (
                      <span key={day} className="flex-1 text-center truncate">
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Bottom Button: All Sales Order */}
            <button
              onClick={() => setShowSalesOrdersModal(true)}
              className="w-full py-3.5 px-4 rounded-xl bg-[#527d73] hover:bg-[#5e8d82] active:scale-[0.99] text-white flex items-center justify-between shadow-md transition-all group cursor-pointer"
            >
              <span className="text-sm font-semibold tracking-wide font-serif">
                All Sales Order
              </span>
              <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

        {/* TAB 2: PURCHASE REPORT */}
        {activeTab === 'purchase' && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Search with date bar */}
            <div className="relative rounded-xl bg-[#13312c] border border-[#214c44] flex items-center px-3 py-2.5 shadow-sm">
              <Search className="w-4 h-4 text-cyan-400 shrink-0 mr-2.5" />
              <input
                type="text"
                value={dateSearch}
                onChange={(e) => setDateSearch(e.target.value)}
                placeholder="Search with date..."
                className="w-full bg-transparent text-sm text-white placeholder-[#7faaa0] focus:outline-none"
              />
              {dateSearch && (
                <button
                  onClick={() => setDateSearch('')}
                  className="p-1 text-[#7faaa0] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Total Purchase Summary Card */}
            <section className="rounded-2xl bg-[#153831] border border-[#23534a] p-4 shadow-lg">
              {/* Row 1 Header */}
              <div className="flex items-center justify-between text-xs font-semibold text-[#8ab3a9] mb-1">
                <span>Total Purchase</span>
                <span>Total Amount</span>
              </div>

              {/* Row 1 Content */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {totalPurchaseCount}
                  </div>
                  <div className="text-xs text-[#7ea89e] mt-0.5">
                    Salesman Id: 164020
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {totalPurchaseAmount.toFixed(2)} BDT
                  </div>
                </div>
              </div>

              {/* Divider Line */}
              <div className="border-t border-[#23534a] my-3" />

              {/* Row 2 Content */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {totalPurchaseCount}
                  </div>
                  <div className="text-xs text-[#7ea89e] mt-0.5">
                    Total Purchase
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg sm:text-xl font-bold text-[#ff6b6b] tracking-tight">
                    {totalPurchaseAmount.toFixed(2)} BDT
                  </div>
                  <div className="text-xs text-[#7ea89e] mt-0.5">
                    Total Amount
                  </div>
                </div>
              </div>
            </section>

            {/* Purchase Statistics Bar Chart Card */}
            <section className="rounded-2xl bg-[#153831] border border-[#23534a] p-4 shadow-lg">
              {/* Header with Timeframe Select */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Purchase Statistics
                </h2>
                <div className="relative">
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value as TimeframeOption)}
                    className="bg-[#14342e] border border-[#23534a] rounded-lg px-2.5 py-1 text-xs text-[#a0c7be] font-medium focus:outline-none appearance-none pr-6 cursor-pointer"
                  >
                    <option value="7days">Last 7 Days</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="month">This Month</option>
                  </select>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#a0c7be] text-[10px]">
                    ▼
                  </span>
                </div>
              </div>

              {/* Chart Visual matching Screenshot */}
              <div className="h-44 sm:h-48 flex items-stretch gap-2 pt-2">
                {/* Y-Axis labels */}
                <div className="w-6 flex flex-col justify-between text-[11px] text-[#7ea89e] text-right pr-1 pb-6">
                  {purchaseStats.ticks.map((tick, idx) => (
                    <span key={idx}>{tick}</span>
                  ))}
                </div>

                {/* Bars Area */}
                <div className="flex-1 flex flex-col justify-between">
                  {/* Bars Grid */}
                  <div className="flex-1 flex items-end justify-between px-2 gap-2 border-b border-[#23534a]/80 pb-1 relative">
                    {daysOfWeek.map((day, idx) => {
                      const val = purchaseStats.dayTotals[idx];
                      const heightPercent = purchaseStats.maxVal > 0 ? (val / purchaseStats.maxVal) * 100 : 0;
                      const hasValue = val > 0;

                      return (
                        <div
                          key={day}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative"
                        >
                          {/* Tooltip on hover */}
                          {hasValue && (
                            <div className="absolute -top-7 opacity-0 group-hover:opacity-100 bg-black/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded pointer-events-none transition-opacity whitespace-nowrap z-10 border border-emerald-500/40">
                              {val.toFixed(2)} BDT
                            </div>
                          )}

                          {/* Bar Element */}
                          <div
                            style={{ height: hasValue ? `${Math.max(12, heightPercent)}%` : '0%' }}
                            className={`w-full max-w-[28px] rounded-t-sm transition-all duration-500 ${
                              hasValue
                                ? 'bg-[#5b8f84] group-hover:bg-[#72ad9f]'
                                : 'bg-transparent'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* X-Axis labels */}
                  <div className="flex justify-between px-2 pt-2 text-[11px] text-[#7ea89e]">
                    {daysOfWeek.map((day) => (
                      <span key={day} className="flex-1 text-center truncate">
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Bottom Button: All Purchase Order */}
            <button
              onClick={() => setShowPurchaseOrdersModal(true)}
              className="w-full py-3.5 px-4 rounded-xl bg-[#527d73] hover:bg-[#5e8d82] active:scale-[0.99] text-white flex items-center justify-between shadow-md transition-all group cursor-pointer"
            >
              <span className="text-sm font-semibold tracking-wide font-serif">
                All Purchase Order
              </span>
              <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

        {/* TAB 3: STOCK REPORT */}
        {activeTab === 'stock' && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Search and Filter Row */}
            <div className="flex items-center gap-2.5">
              {/* Search input */}
              <div className="flex-1 relative rounded-xl bg-[#13312c] border border-[#214c44] flex items-center px-3 py-2.5 shadow-sm">
                <Search className="w-4 h-4 text-cyan-400 shrink-0 mr-2.5" />
                <input
                  type="text"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  placeholder="Search here..."
                  className="w-full bg-transparent text-sm text-white placeholder-[#7faaa0] focus:outline-none"
                />
                {stockSearch && (
                  <button
                    onClick={() => setStockSearch('')}
                    className="p-1 text-[#7faaa0] hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Button */}
              <button
                onClick={() => setShowFilterModal(true)}
                className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all ${
                  stockFilterCategory !== 'all' || stockFilterStatus !== 'all'
                    ? 'bg-[#1b4e43] border-cyan-400 text-cyan-300'
                    : 'bg-[#13312c] border-[#214c44] text-[#7faaa0] hover:text-white hover:border-[#2f665b]'
                }`}
                title="Filter Stock Items"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Metric Badges Row matching Screenshot 3 */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {/* 1. Total Item */}
              <div className="rounded-xl overflow-hidden border border-[#214c44] shadow-sm flex flex-col text-center">
                <div className="bg-[#a8c2ba] py-2 px-1 text-base sm:text-lg font-bold text-[#1a3d36]">
                  {totalStockItems}
                </div>
                <div className="bg-[#5d7d76] py-1.5 px-1 text-[11px] font-semibold text-white truncate">
                  Total Item
                </div>
              </div>

              {/* 2. Total Stock */}
              <div className="rounded-xl overflow-hidden border border-[#214c44] shadow-sm flex flex-col text-center">
                <div className="bg-[#a8c2ba] py-2 px-1 text-base sm:text-lg font-bold text-[#1a3d36]">
                  {totalStockUnits}
                </div>
                <div className="bg-[#5d7d76] py-1.5 px-1 text-[11px] font-semibold text-white truncate">
                  Total Stock
                </div>
              </div>

              {/* 3. Stock Value */}
              <div className="rounded-xl overflow-hidden border border-[#214c44] shadow-sm flex flex-col text-center">
                <div className="bg-[#a8c2ba] py-2 px-1 text-base sm:text-lg font-bold text-[#1a3d36] truncate">
                  {totalStockValue > 0 ? `${totalStockValue.toFixed(1)} ৳` : '0.0 ৳'}
                </div>
                <div className="bg-[#5d7d76] py-1.5 px-1 text-[11px] font-semibold text-white truncate">
                  Stock Value
                </div>
              </div>
            </div>

            {/* Stock Items List */}
            <div className="space-y-3 pt-1">
              {filteredMedicines.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-[#13312c] border border-[#214c44]">
                  <Pill className="w-10 h-10 text-[#7faaa0] mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-neutral-300 font-medium">No medicines found</p>
                  <p className="text-xs text-[#7faaa0] mt-1">Try changing your search or filter query</p>
                </div>
              ) : (
                <>
                  {visibleMedicines.map((med) => {
                    const salesCount = medicineSalesCountMap[med.id] || medicineSalesCountMap[med.name.toLowerCase()] || 0;
                    const isAvailable = (med.stockQuantity || 0) > 0;

                    return (
                      <article
                        key={med.id}
                        onClick={() => setSelectedMedicine(med)}
                        className="rounded-2xl bg-[#13312c] border border-[#5e4141] hover:border-[#8f5a5a] active:scale-[0.99] transition-all p-3.5 shadow-md cursor-pointer group"
                      >
                        <div className="flex items-start gap-3">
                          {/* Left Side: 3D Medicine Jar Icon & Form Tag */}
                          <div className="flex flex-col items-center justify-center shrink-0 w-16">
                            <div className="w-12 h-12 rounded-xl bg-black/40 border border-[#27584e] flex items-center justify-center relative shadow-inner mb-1">
                              {/* Medical jar illustration with tablets */}
                              <svg className="w-7 h-7 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M7 3h10v3H7z" fill="rgba(6,182,212,0.2)" />
                                <rect x="5" y="6" width="14" height="15" rx="3" fill="rgba(16,185,129,0.15)" />
                                <path d="M12 10v6M9 13h6" stroke="white" strokeWidth="2" />
                              </svg>
                            </div>
                            <span className="text-[11px] text-[#7faaa0] font-medium truncate max-w-[64px]">
                              {med.category || 'Tablet'}
                            </span>
                          </div>

                          {/* Center/Right: Details */}
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <h3 className="font-bold text-white text-base tracking-tight truncate group-hover:text-cyan-300 transition-colors">
                              {med.name.replace(/\s*\d+mg/i, '')}{' '}
                              <span className="text-xs text-neutral-300 font-normal">
                                {med.strength || med.name.match(/\d+mg/i)?.[0] || ''}
                              </span>
                            </h3>

                            <p className="text-xs text-[#8cb8ad] truncate font-medium">
                              {med.genericName || 'Tenoxicam'}
                            </p>

                            <p className="text-xs font-semibold text-[#52a694] truncate">
                              {med.manufacturer || 'Beximco Pharmaceuticals Ltd.'}
                            </p>

                            <p className="text-xs text-[#8cb8ad] truncate">
                              Total Batch: 1
                            </p>
                          </div>
                        </div>

                        {/* Bottom Status Row separated by divider */}
                        <div className="border-t border-[#1f4840] pt-2 mt-2.5 flex items-center justify-between text-xs px-2">
                          <span className="text-[#52a694] font-medium flex items-center gap-1.5">
                            <Pill className="w-3.5 h-3.5 text-[#52a694]" />
                            <span>{salesCount} sales</span>
                          </span>

                          <span className="text-[#2a5c53]">|</span>

                          <span className={`font-semibold flex items-center gap-1.5 ${
                            isAvailable ? 'text-emerald-400' : 'text-[#ff6b6b]'
                          }`}>
                            <Pill className="w-3.5 h-3.5" />
                            <span>{med.stockQuantity} available</span>
                          </span>
                        </div>
                      </article>
                    );
                  })}

                  {visibleMedicines.length < filteredMedicines.length && (
                    <div className="pt-2 pb-6 text-center">
                      <button
                        onClick={() => setStockPage((prev) => prev + 1)}
                        className="px-5 py-2.5 rounded-xl bg-[#1d463d] hover:bg-[#25574c] text-teal-200 text-xs font-semibold shadow border border-[#2c685b] transition-all active:scale-95 cursor-pointer"
                      >
                        Load More ({filteredMedicines.length - visibleMedicines.length} remaining)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FILTER MODAL for Stock Report */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-[#13312c] border border-[#214c44] rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#214c44] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                Filter Stock Items
              </h3>
              <button
                onClick={() => setShowFilterModal(false)}
                className="p-1 text-[#7faaa0] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stock Availability */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8cb8ad]">Availability</label>
              <div className="grid grid-cols-3 gap-2">
                {(['all', 'in_stock', 'out_of_stock'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStockFilterStatus(status)}
                    className={`py-1.5 px-2 text-xs rounded-lg font-medium capitalize border transition-all ${
                      stockFilterStatus === status
                        ? 'bg-[#1a3d36] border-emerald-400 text-white shadow-xs'
                        : 'bg-[#102723] border-[#214c44] text-[#7faaa0]'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Dosage Form Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8cb8ad]">Dosage Form</label>
              <div className="grid grid-cols-3 gap-2">
                {['all', 'Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setStockFilterCategory(cat)}
                    className={`py-1.5 px-2 text-xs rounded-lg font-medium border transition-all ${
                      stockFilterCategory === cat
                        ? 'bg-[#1a3d36] border-emerald-400 text-white shadow-xs'
                        : 'bg-[#102723] border-[#214c44] text-[#7faaa0]'
                    }`}
                  >
                    {cat === 'all' ? 'All Forms' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-[#214c44]">
              <button
                onClick={() => {
                  setStockFilterCategory('all');
                  setStockFilterStatus('all');
                  setShowFilterModal(false);
                }}
                className="flex-1 py-2 text-xs font-semibold text-[#7faaa0] hover:text-white bg-[#102723] rounded-xl"
              >
                Reset
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                className="flex-1 py-2 text-xs font-bold text-white bg-[#527d73] hover:bg-[#5e8d82] rounded-xl shadow-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALL SALES ORDERS MODAL */}
      {showSalesOrdersModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#112d28] border border-[#214c44] rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#214c44] flex items-center justify-between bg-[#153831]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-400" />
                  All Sales Orders
                </h3>
                <p className="text-xs text-[#8cb8ad]">Showing customer invoices & billing</p>
              </div>
              <button
                onClick={() => setShowSalesOrdersModal(false)}
                className="w-8 h-8 rounded-lg bg-[#13312c] text-[#7faaa0] hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Orders List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {filteredSales.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  No sales orders recorded yet.
                </div>
              ) : (
                filteredSales.map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => setSelectedSaleDetail(sale)}
                    className="p-3 rounded-xl bg-[#14342e] border border-[#214c44] hover:border-emerald-500/40 cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-emerald-400">
                        INV: {sale.invoiceNumber}
                      </span>
                      <span className="font-bold text-white">
                        {sale.grandTotal.toFixed(2)} BDT
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#8cb8ad]">
                      <span>{sale.customerName || 'Walk-in Customer'}</span>
                      <span>{new Date(sale.date).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#7faaa0] border-t border-[#1f4840] pt-1">
                      <span>Items: {sale.items?.length || 0}</span>
                      <span className="capitalize">{sale.paymentMethod}</span>
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <Eye className="w-3 h-3" /> View
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ALL PURCHASE ORDERS MODAL */}
      {showPurchaseOrdersModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#112d28] border border-[#214c44] rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#214c44] flex items-center justify-between bg-[#153831]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  All Purchase Orders
                </h3>
                <p className="text-xs text-[#8cb8ad]">Showing supplier stock invoices</p>
              </div>
              <button
                onClick={() => setShowPurchaseOrdersModal(false)}
                className="w-8 h-8 rounded-lg bg-[#13312c] text-[#7faaa0] hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Orders List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {filteredPurchases.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  No purchase orders recorded yet.
                </div>
              ) : (
                filteredPurchases.map((po) => (
                  <div
                    key={po.id}
                    onClick={() => setSelectedPODetail(po)}
                    className="p-3 rounded-xl bg-[#14342e] border border-[#214c44] hover:border-emerald-500/40 cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-emerald-400">
                        {po.poNumber}
                      </span>
                      <span className="font-bold text-white">
                        {po.totalAmount.toFixed(2)} BDT
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#8cb8ad]">
                      <span className="truncate">{po.supplierName}</span>
                      <span>{new Date(po.orderDate).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] border-t border-[#1f4840] pt-1">
                      <span className="text-[#7faaa0]">Items: {po.items?.length || 0}</span>
                      <span className={`px-2 py-0.5 rounded font-semibold ${
                        po.status === 'Received'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        {po.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SELECTED SALE DETAIL MODAL */}
      {selectedSaleDetail && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#13312c] border border-[#214c44] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#214c44] pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Invoice #{selectedSaleDetail.invoiceNumber}
                </h3>
                <p className="text-xs text-[#8cb8ad]">
                  {new Date(selectedSaleDetail.date).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedSaleDetail(null)}
                className="p-1 text-[#7faaa0] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#8cb8ad]">Customer:</span>
                <span className="text-white font-semibold">{selectedSaleDetail.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8cb8ad]">Payment:</span>
                <span className="text-white font-semibold capitalize">{selectedSaleDetail.paymentMethod}</span>
              </div>
            </div>

            {/* Items list */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto border-t border-b border-[#214c44] py-2">
              {selectedSaleDetail.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs py-1">
                  <span className="text-neutral-200">
                    {item.medicineName} <span className="text-[#7faaa0]">× {item.quantity}</span>
                  </span>
                  <span className="text-white font-medium">{item.totalPrice.toFixed(2)} BDT</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-sm font-bold pt-1">
              <span className="text-white">Total Amount:</span>
              <span className="text-[#ff6b6b] text-base">{selectedSaleDetail.grandTotal.toFixed(2)} BDT</span>
            </div>

            <button
              onClick={() => setSelectedSaleDetail(null)}
              className="w-full py-2 bg-[#527d73] hover:bg-[#5e8d82] text-white text-xs font-bold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* SELECTED PO DETAIL MODAL */}
      {selectedPODetail && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#13312c] border border-[#214c44] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#214c44] pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Order #{selectedPODetail.poNumber}
                </h3>
                <p className="text-xs text-[#8cb8ad]">
                  {new Date(selectedPODetail.orderDate).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedPODetail(null)}
                className="p-1 text-[#7faaa0] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#8cb8ad]">Supplier:</span>
                <span className="text-white font-semibold">{selectedPODetail.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8cb8ad]">Status:</span>
                <span className="text-emerald-400 font-semibold">{selectedPODetail.status}</span>
              </div>
            </div>

            {/* Items list */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto border-t border-b border-[#214c44] py-2">
              {selectedPODetail.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs py-1">
                  <span className="text-neutral-200">
                    {item.medicineName} <span className="text-[#7faaa0]">× {item.quantity}</span>
                  </span>
                  <span className="text-white font-medium">{item.totalCost.toFixed(2)} BDT</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-sm font-bold pt-1">
              <span className="text-white">Total Purchase:</span>
              <span className="text-[#ff6b6b] text-base">{selectedPODetail.totalAmount.toFixed(2)} BDT</span>
            </div>

            <button
              onClick={() => setSelectedPODetail(null)}
              className="w-full py-2 bg-[#527d73] hover:bg-[#5e8d82] text-white text-xs font-bold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* SELECTED MEDICINE DETAIL MODAL */}
      {selectedMedicine && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#13312c] border border-[#214c44] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#214c44] pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedMedicine.name}
                </h3>
                <p className="text-xs text-[#8cb8ad]">
                  {selectedMedicine.genericName}
                </p>
              </div>
              <button
                onClick={() => setSelectedMedicine(null)}
                className="p-1 text-[#7faaa0] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-[#102723] border border-[#214c44]">
                <span className="text-[#7faaa0] block text-[10px]">MANUFACTURER</span>
                <span className="font-semibold text-white">{selectedMedicine.manufacturer}</span>
              </div>
              <div className="p-2 rounded-lg bg-[#102723] border border-[#214c44]">
                <span className="text-[#7faaa0] block text-[10px]">DOSAGE FORM</span>
                <span className="font-semibold text-white">{selectedMedicine.category}</span>
              </div>
              <div className="p-2 rounded-lg bg-[#102723] border border-[#214c44]">
                <span className="text-[#7faaa0] block text-[10px]">CURRENT STOCK</span>
                <span className={`font-bold ${selectedMedicine.stockQuantity > 0 ? 'text-emerald-400' : 'text-[#ff6b6b]'}`}>
                  {selectedMedicine.stockQuantity} units
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[#102723] border border-[#214c44]">
                <span className="text-[#7faaa0] block text-[10px]">SELLING PRICE</span>
                <span className="font-bold text-white">{selectedMedicine.sellingPrice.toFixed(2)} BDT</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedMedicine(null)}
              className="w-full py-2 bg-[#527d73] hover:bg-[#5e8d82] text-white text-xs font-bold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
