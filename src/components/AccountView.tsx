import React, { useState, useMemo, useEffect } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { safeLocalStorageGet, safeLocalStorageSet, idbSet } from '../utils/persistentStorage';
import { isToday, isThisMonth, formatDateSafe } from '../utils/dateUtils';
import { loadUserExpenses, saveUserExpenses } from '../services/dueSyncService';
import {
  ArrowLeft,
  Plus,
  Trash2,
  X,
  Search,
  Calendar,
  Filter,
  CheckCircle2,
  Receipt,
  Truck,
  DollarSign,
  TrendingDown,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Sale, PurchaseOrder, PettyExpense } from '../types';
import { SalesOrderListView } from './SalesOrderListView';

interface AccountViewProps {
  onBack: () => void;
}

const STORAGE_EXPENSES_KEY = 'siam_pharma_petty_expenses';

// SVG Icon 1: Checklist document (Total Sales & Total Purchase) matching the screenshot
const StatChecklistIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg className={className} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Teal document body */}
    <rect x="8" y="7" width="28" height="32" rx="4" fill="#2ca895" />
    {/* Clip top header */}
    <rect x="15" y="4" width="14" height="5" rx="1.5" fill="#3dd6be" />
    {/* 3 checklist / content lines with left bullet notches */}
    <rect x="12" y="14" width="5" height="3" rx="0.75" fill="#123d37" />
    <rect x="19" y="14" width="13" height="3" rx="0.75" fill="#123d37" />
    <rect x="12" y="20" width="5" height="3" rx="0.75" fill="#123d37" />
    <rect x="19" y="20" width="13" height="3" rx="0.75" fill="#123d37" />
    <rect x="12" y="26" width="5" height="3" rx="0.75" fill="#123d37" />
    <rect x="19" y="26" width="10" height="3" rx="0.75" fill="#123d37" />
    <rect x="12" y="32" width="20" height="2" rx="0.5" fill="#123d37" />
  </svg>
);

// SVG Icon 2: Document spreadsheet with orange coin badge (Total Amount, Receive, Paid, Due) matching the screenshot
const StatDocumentCoinIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg className={className} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Teal document body */}
    <rect x="11" y="8" width="25" height="31" rx="4" fill="#2ca895" />
    {/* Grid / table spreadsheet cells */}
    <rect x="14.5" y="16" width="8" height="3.5" rx="0.75" fill="#123d37" />
    <rect x="24" y="16" width="8.5" height="3.5" rx="0.75" fill="#123d37" />
    <rect x="14.5" y="21.5" width="8" height="3.5" rx="0.75" fill="#123d37" />
    <rect x="24" y="21.5" width="8.5" height="3.5" rx="0.75" fill="#123d37" />
    <rect x="14.5" y="27" width="8" height="3.5" rx="0.75" fill="#123d37" />
    <rect x="24" y="27" width="8.5" height="3.5" rx="0.75" fill="#123d37" />
    <rect x="14.5" y="32.5" width="18" height="2" rx="0.5" fill="#123d37" />
    {/* Orange / Golden coin badge at top-left corner */}
    <circle cx="13" cy="9" r="5" fill="#f59e0b" stroke="#0d2824" strokeWidth="1.5" />
    <circle cx="13" cy="9" r="3" fill="#fbbf24" />
  </svg>
);

export const AccountView: React.FC<AccountViewProps> = ({ onBack }) => {
  const { sales, purchaseOrders, currentUser } = usePharmacy();
  const userKey = currentUser?.id || currentUser?.email || 'default_user';
  const [activeTab, setActiveTab] = useState<'account' | 'expense'>('account');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'this_month'>('all');
  const [showSalesOrderList, setShowSalesOrderList] = useState(false);

  // Detail inspection modal
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    title: string;
    type: 'sales' | 'purchases' | 'sales_due' | 'purchase_due';
  }>({
    isOpen: false,
    title: '',
    type: 'sales',
  });

  // Petty Expense State with persistence
  const [expenses, setExpenses] = useState<PettyExpense[]>(() => {
    const saved = safeLocalStorageGet<PettyExpense[] | null>(STORAGE_EXPENSES_KEY, null);
    if (saved && Array.isArray(saved)) return saved;
    return [
      { id: 'exp-1', category: 'Packaging & Bags', note: 'Medicine polythene & paper bags', amount: 15.0, date: new Date().toISOString().split('T')[0] },
      { id: 'exp-2', category: 'Electricity & Utility', note: 'Store cold-storage cooling fan run', amount: 25.0, date: new Date().toISOString().split('T')[0] },
    ];
  });

  // Load user-isolated expenses on boot
  useEffect(() => {
    let active = true;
    loadUserExpenses(userKey).then((saved) => {
      if (active && saved && saved.length > 0) {
        setExpenses(saved);
      }
    });
    return () => {
      active = false;
    };
  }, [userKey]);

  useEffect(() => {
    idbSet(STORAGE_EXPENSES_KEY, expenses);
    safeLocalStorageSet(STORAGE_EXPENSES_KEY, expenses);
    saveUserExpenses(userKey, expenses);
  }, [expenses, userKey]);

  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('All');
  const [expenseForm, setExpenseForm] = useState({
    category: 'Packaging & Bags',
    note: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Safe Filter Sales based on time filter
  const filteredSales = useMemo(() => {
    if (!Array.isArray(sales)) return [];
    if (timeFilter === 'today') {
      return sales.filter((s) => s && isToday(s.date));
    }
    if (timeFilter === 'this_month') {
      return sales.filter((s) => s && isThisMonth(s.date));
    }
    return sales;
  }, [sales, timeFilter]);

  // Safe Filter Purchases based on time filter
  const filteredPurchases = useMemo(() => {
    if (!Array.isArray(purchaseOrders)) return [];
    if (timeFilter === 'today') {
      return purchaseOrders.filter((po) => po && isToday(po.orderDate));
    }
    if (timeFilter === 'this_month') {
      return purchaseOrders.filter((po) => po && isThisMonth(po.orderDate));
    }
    return purchaseOrders;
  }, [purchaseOrders, timeFilter]);

  // Sales Statistics
  const salesStats = useMemo(() => {
    const count = filteredSales.length;
    const totalAmount = filteredSales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);
    const totalReceive = filteredSales.reduce((acc, s) => {
      if (s.paidAmount !== undefined) return acc + s.paidAmount;
      return acc + Math.max(0, (s.grandTotal || 0) - (s.dueAmount || 0));
    }, 0);
    const totalDue = filteredSales.reduce((acc, s) => acc + (s.dueAmount || 0), 0);

    return {
      count,
      totalAmount,
      totalReceive,
      totalDue,
    };
  }, [filteredSales]);

  // Purchase Statistics
  const purchaseStats = useMemo(() => {
    const count = filteredPurchases.length;
    const totalAmount = filteredPurchases.reduce((acc, po) => acc + (po.totalAmount || 0), 0);
    const totalPaid = filteredPurchases.reduce((acc, po) => acc + (po.paidAmount || 0), 0);
    const totalDue = filteredPurchases.reduce((acc, po) => {
      const due = Math.max(0, (po.totalAmount || 0) - (po.paidAmount || 0));
      return acc + due;
    }, 0);

    return {
      count,
      totalAmount,
      totalPaid,
      totalDue,
    };
  }, [filteredPurchases]);

  // Expense stats
  const totalExpenses = useMemo(() => {
    return expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  }, [expenses]);

  const todayExpenses = useMemo(() => {
    return expenses
      .filter((e) => isToday(e.date))
      .reduce((acc, e) => acc + (e.amount || 0), 0);
  }, [expenses]);

  // Currency Formatter matching screenshot: e.g. "16.0 BDT" or "0 BDT" or "65.0 BDT"
  const formatBDT = (amount: number): string => {
    if (!amount || amount === 0) return '0 BDT';
    const hasDecimal = amount % 1 !== 0;
    const formatted = hasDecimal ? amount.toFixed(2) : amount.toFixed(1);
    return `${formatted} BDT`;
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(expenseForm.amount);
    if (isNaN(val) || val <= 0) return;

    const currentIsoDate = new Date().toISOString().split('T')[0];
    const newExp: PettyExpense = {
      id: `exp-${Date.now()}`,
      category: expenseForm.category,
      note: expenseForm.note || 'General expense',
      amount: val,
      date: expenseForm.date || currentIsoDate,
      userId: userKey,
    };

    setExpenses([newExp, ...expenses]);
    setExpenseForm({
      category: 'Packaging & Bags',
      note: '',
      amount: '',
      date: currentIsoDate,
    });
    setIsAddingExpense(false);
  };

  const handleDeleteExpense = (id: string) => {
    if (window.confirm('Delete this recorded expense?')) {
      setExpenses(expenses.filter((e) => e.id !== id));
    }
  };

  const filteredExpenseList = useMemo(() => {
    return expenses.filter((e) => {
      const matchCat = expenseCategoryFilter === 'All' || e.category === expenseCategoryFilter;
      const matchSearch =
        e.note.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        e.category.toLowerCase().includes(expenseSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [expenses, expenseCategoryFilter, expenseSearch]);

  if (showSalesOrderList) {
    return (
      <SalesOrderListView
        onBack={() => setShowSalesOrderList(false)}
        onGoHome={onBack}
      />
    );
  }

  return (
    <div className="min-h-full bg-[#0d2723] text-teal-100 flex flex-col font-sans pb-16">
      {/* Top Header Bar */}
      <div className="px-4 py-3.5 border-b border-[#18443e] flex items-center justify-between sticky top-0 bg-[#0d2723]/95 backdrop-blur-md z-30">
        <button
          id="btn-account-back"
          onClick={onBack}
          aria-label="Back to Home"
          className="w-10 h-10 rounded-xl bg-[#143933] border border-[#1e4e46] flex items-center justify-center text-teal-200 hover:bg-[#1a4a42] active:scale-95 transition-all shadow-xs"
        >
          <ArrowLeft className="w-5 h-5 text-teal-200" />
        </button>

        <h1 className="text-lg sm:text-xl font-bold text-teal-50 tracking-wide text-center">
          Account
        </h1>

        {/* Placeholder to keep header title mathematically centered */}
        <div className="w-10 h-10" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-md sm:max-w-xl mx-auto w-full px-4 pt-4 pb-8">
        {/* Capsule Tab Switcher: [ Account ]  [ Expense ] */}
        <div className="bg-[#133833] border border-[#1b4841] p-1 rounded-full flex items-center max-w-md mx-auto mb-5 shadow-inner">
          <button
            id="tab-btn-account"
            onClick={() => setActiveTab('account')}
            className={`flex-1 py-2 rounded-full text-center text-sm font-semibold transition-all duration-200 ${
              activeTab === 'account'
                ? 'bg-[#1b4b44] text-teal-100 shadow-sm'
                : 'text-teal-300/60 hover:text-teal-100'
            }`}
          >
            Account
          </button>
          <button
            id="tab-btn-expense"
            onClick={() => setActiveTab('expense')}
            className={`flex-1 py-2 rounded-full text-center text-sm font-semibold transition-all duration-200 ${
              activeTab === 'expense'
                ? 'bg-[#1b4b44] text-teal-100 shadow-sm'
                : 'text-teal-300/60 hover:text-teal-100'
            }`}
          >
            Expense
          </button>
        </div>

        {/* VIEW 1: ACCOUNT STATISTICS (Matching the User Screenshot Exactly) */}
        {activeTab === 'account' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Quick Period Filter */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-teal-400/80 uppercase tracking-wider">
                Period Filter
              </span>
              <div className="flex items-center gap-1 bg-[#123631] p-0.5 rounded-lg border border-[#1e4c45] text-[11px]">
                <button
                  onClick={() => setTimeFilter('all')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    timeFilter === 'all'
                      ? 'bg-[#1e4e46] text-teal-100 font-bold'
                      : 'text-teal-400/70 hover:text-teal-200'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setTimeFilter('today')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    timeFilter === 'today'
                      ? 'bg-[#1e4e46] text-teal-100 font-bold'
                      : 'text-teal-400/70 hover:text-teal-200'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setTimeFilter('this_month')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    timeFilter === 'this_month'
                      ? 'bg-[#1e4e46] text-teal-100 font-bold'
                      : 'text-teal-400/70 hover:text-teal-200'
                  }`}
                >
                  This Month
                </button>
              </div>
            </div>

            {/* 1. Sales Statistics Section */}
            <div>
              <h2 className="text-[#83a6a0] text-base font-medium mb-3">
                Sales statistics
              </h2>

              <div className="grid grid-cols-2 gap-3.5">
                {/* 1.1 Total Sales */}
                <div
                  id="card-total-sales"
                  onClick={() => setShowSalesOrderList(true)}
                  className="bg-[#123631] border border-[#1e4c45] rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-xs cursor-pointer active:scale-[0.98] hover:border-teal-500/40 transition-all group"
                >
                  <div className="group-hover:scale-105 transition-transform">
                    <StatChecklistIcon className="w-10 h-10" />
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-teal-50 mt-3 tracking-tight">
                    {salesStats.count}
                  </span>
                  <span className="text-[#7d9f99] text-xs sm:text-sm font-medium mt-1">
                    Total Sales
                  </span>
                </div>

                {/* 1.2 Total Amount */}
                <div
                  id="card-total-sales-amount"
                  onClick={() => setShowSalesOrderList(true)}
                  className="bg-[#123631] border border-[#1e4c45] rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-xs cursor-pointer active:scale-[0.98] hover:border-teal-500/40 transition-all group"
                >
                  <div className="group-hover:scale-105 transition-transform">
                    <StatDocumentCoinIcon className="w-10 h-10" />
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-teal-50 mt-3 tracking-tight">
                    {formatBDT(salesStats.totalAmount)}
                  </span>
                  <span className="text-[#7d9f99] text-xs sm:text-sm font-medium mt-1">
                    Total Amount
                  </span>
                </div>

                {/* 1.3 Total Receive */}
                <div
                  id="card-total-sales-receive"
                  onClick={() => setShowSalesOrderList(true)}
                  className="bg-[#123631] border border-[#1e4c45] rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-xs cursor-pointer active:scale-[0.98] hover:border-teal-500/40 transition-all group"
                >
                  <div className="group-hover:scale-105 transition-transform">
                    <StatDocumentCoinIcon className="w-10 h-10" />
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-teal-50 mt-3 tracking-tight">
                    {formatBDT(salesStats.totalReceive)}
                  </span>
                  <span className="text-[#7d9f99] text-xs sm:text-sm font-medium mt-1">
                    Total Receive
                  </span>
                </div>

                {/* 1.4 Total Due (Prominent Orange Border as in Screenshot) */}
                <div
                  onClick={() =>
                    setDetailModal({
                      isOpen: true,
                      title: 'Customer Sales Due List',
                      type: 'sales_due',
                    })
                  }
                  className="bg-[#123631] border border-[#e0694b] rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-[0_0_12px_rgba(224,105,75,0.12)] cursor-pointer active:scale-[0.98] hover:border-[#f38164] transition-all group"
                >
                  <div className="group-hover:scale-105 transition-transform">
                    <StatDocumentCoinIcon className="w-10 h-10" />
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-teal-50 mt-3 tracking-tight">
                    {formatBDT(salesStats.totalDue)}
                  </span>
                  <span className="text-[#7d9f99] text-xs sm:text-sm font-medium mt-1">
                    Total Due
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Purchase Statistics Section */}
            <div>
              <h2 className="text-[#83a6a0] text-base font-medium mb-3 mt-4">
                Purchase statistics
              </h2>

              <div className="grid grid-cols-2 gap-3.5">
                {/* 2.1 Total Purchase */}
                <div
                  onClick={() =>
                    setDetailModal({
                      isOpen: true,
                      title: 'Purchase Orders',
                      type: 'purchases',
                    })
                  }
                  className="bg-[#123631] border border-[#1e4c45] rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-xs cursor-pointer active:scale-[0.98] hover:border-teal-500/40 transition-all group"
                >
                  <div className="group-hover:scale-105 transition-transform">
                    <StatChecklistIcon className="w-10 h-10" />
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-teal-50 mt-3 tracking-tight">
                    {purchaseStats.count}
                  </span>
                  <span className="text-[#7d9f99] text-xs sm:text-sm font-medium mt-1">
                    Total Purchase
                  </span>
                </div>

                {/* 2.2 Total Amount */}
                <div
                  onClick={() =>
                    setDetailModal({
                      isOpen: true,
                      title: 'Purchase Order Value',
                      type: 'purchases',
                    })
                  }
                  className="bg-[#123631] border border-[#1e4c45] rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-xs cursor-pointer active:scale-[0.98] hover:border-teal-500/40 transition-all group"
                >
                  <div className="group-hover:scale-105 transition-transform">
                    <StatDocumentCoinIcon className="w-10 h-10" />
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-teal-50 mt-3 tracking-tight">
                    {formatBDT(purchaseStats.totalAmount)}
                  </span>
                  <span className="text-[#7d9f99] text-xs sm:text-sm font-medium mt-1">
                    Total Amount
                  </span>
                </div>

                {/* 2.3 Total Paid */}
                <div
                  onClick={() =>
                    setDetailModal({
                      isOpen: true,
                      title: 'Supplier Paid Payments',
                      type: 'purchases',
                    })
                  }
                  className="bg-[#123631] border border-[#1e4c45] rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-xs cursor-pointer active:scale-[0.98] hover:border-teal-500/40 transition-all group"
                >
                  <div className="group-hover:scale-105 transition-transform">
                    <StatDocumentCoinIcon className="w-10 h-10" />
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-teal-50 mt-3 tracking-tight">
                    {formatBDT(purchaseStats.totalPaid)}
                  </span>
                  <span className="text-[#7d9f99] text-xs sm:text-sm font-medium mt-1">
                    Total Paid
                  </span>
                </div>

                {/* 2.4 Total Due (Prominent Orange Border as in Screenshot) */}
                <div
                  onClick={() =>
                    setDetailModal({
                      isOpen: true,
                      title: 'Supplier Accounts Payable Due',
                      type: 'purchase_due',
                    })
                  }
                  className="bg-[#123631] border border-[#e0694b] rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-[0_0_12px_rgba(224,105,75,0.12)] cursor-pointer active:scale-[0.98] hover:border-[#f38164] transition-all group"
                >
                  <div className="group-hover:scale-105 transition-transform">
                    <StatDocumentCoinIcon className="w-10 h-10" />
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-teal-50 mt-3 tracking-tight">
                    {formatBDT(purchaseStats.totalDue)}
                  </span>
                  <span className="text-[#7d9f99] text-xs sm:text-sm font-medium mt-1">
                    Total Due
                  </span>
                </div>
              </div>
            </div>

            {/* Tap card helper note */}
            <div className="text-center pt-2">
              <span className="text-[11px] text-teal-300/60 font-medium">
                💡 Tip: Tap any card to inspect detailed transaction list
              </span>
            </div>
          </div>
        )}

        {/* VIEW 2: EXPENSE TAB (Matching Theme with Full Functionality) */}
        {activeTab === 'expense' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Expense KPI summary */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="bg-[#123631] border border-[#1e4c45] rounded-2xl p-3 text-center">
                <span className="text-[10px] sm:text-xs text-[#7d9f99] font-medium block">
                  Total Expense
                </span>
                <span className="text-base sm:text-lg font-bold text-teal-50 mt-1 block">
                  {formatBDT(totalExpenses)}
                </span>
              </div>
              <div className="bg-[#123631] border border-[#1e4c45] rounded-2xl p-3 text-center">
                <span className="text-[10px] sm:text-xs text-[#7d9f99] font-medium block">
                  Today
                </span>
                <span className="text-base sm:text-lg font-bold text-emerald-300 mt-1 block">
                  {formatBDT(todayExpenses)}
                </span>
              </div>
              <div className="bg-[#123631] border border-[#1e4c45] rounded-2xl p-3 text-center">
                <span className="text-[10px] sm:text-xs text-[#7d9f99] font-medium block">
                  Records
                </span>
                <span className="text-base sm:text-lg font-bold text-teal-50 mt-1 block">
                  {expenses.length}
                </span>
              </div>
            </div>

            {/* Add Expense Action Button */}
            <button
              id="btn-record-expense"
              onClick={() => setIsAddingExpense(true)}
              className="w-full py-3 bg-[#1d5c52] hover:bg-[#236e62] active:scale-[0.99] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border border-[#2b7e71] shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Record New Store Expense</span>
            </button>

            {/* Search & Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-teal-300/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search expense description..."
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#123631] border border-[#1e4c45] rounded-xl text-xs text-teal-100 placeholder-teal-300/40 focus:outline-none focus:border-teal-400"
                />
              </div>
              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="bg-[#123631] border border-[#1e4c45] rounded-xl text-xs text-teal-100 px-2 py-2 focus:outline-none"
              >
                <option value="All">All Categories</option>
                <option value="Packaging & Bags">Packaging</option>
                <option value="Electricity & Utility">Utility</option>
                <option value="Staff Refreshment">Staff</option>
                <option value="Shop Maintenance">Maintenance</option>
                <option value="Store Rent">Rent</option>
                <option value="Stationery / Receipts">Stationery</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Expense Records List */}
            <div className="space-y-2.5">
              {filteredExpenseList.length === 0 ? (
                <div className="bg-[#123631] border border-[#1e4c45] rounded-2xl p-8 text-center">
                  <Receipt className="w-8 h-8 text-teal-300/40 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-teal-100">No Expenses Recorded</p>
                  <p className="text-xs text-teal-300/60 mt-1">
                    Tap &quot;Record New Store Expense&quot; above to log pharmacy costs.
                  </p>
                </div>
              ) : (
                filteredExpenseList.map((exp) => (
                  <div
                    key={exp.id}
                    className="bg-[#123631] border border-[#1e4c45] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs hover:border-[#275e55] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#194b43] text-teal-200 text-[10px] font-semibold">
                          {exp.category}
                        </span>
                        <span className="text-[10px] text-teal-300/60 font-mono">
                          {exp.date}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-teal-50 mt-1 truncate">
                        {exp.note}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm sm:text-base font-bold text-rose-300 font-mono">
                        -{formatBDT(exp.amount)}
                      </span>
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        title="Delete expense"
                        className="p-1.5 rounded-lg text-teal-300/50 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL (Opens when clicking any statistics card) */}
      {detailModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#0f2d29] border border-[#235850] rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-teal-100">
            {/* Modal Header */}
            <div className="px-4 py-3.5 border-b border-[#1b4a43] flex items-center justify-between bg-[#123631]">
              <div className="flex items-center gap-2">
                <StatChecklistIcon className="w-6 h-6" />
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {detailModal.title}
                </h3>
              </div>
              <button
                onClick={() => setDetailModal({ ...detailModal, isOpen: false })}
                className="p-1.5 rounded-lg text-teal-300/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal List Content */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1 divide-y divide-[#18443e]">
              {detailModal.type === 'sales' && (
                filteredSales.length === 0 ? (
                  <p className="text-xs text-center text-teal-300/60 py-6">No sales found in this period.</p>
                ) : (
                  filteredSales.map((s) => (
                    <div key={s.id} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white block">{s.invoiceNumber}</span>
                        <span className="text-[11px] text-teal-300/70">
                          {s.customerName || 'Walk-in Customer'} • {s.paymentMethod}
                        </span>
                        <span className="text-[10px] text-teal-400/50 block font-mono">
                          {s.date.split('T')[0]}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold font-mono text-emerald-300 block">
                          {formatBDT(s.grandTotal)}
                        </span>
                        <span className="text-[10px] text-teal-300/60">
                          {s.status}
                        </span>
                      </div>
                    </div>
                  ))
                )
              )}

              {detailModal.type === 'sales_due' && (
                filteredSales.filter((s) => (s.dueAmount || 0) > 0).length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-white">All Sales are Fully Paid!</p>
                    <p className="text-[11px] text-teal-300/60 mt-0.5">There is currently 0 customer due balance.</p>
                  </div>
                ) : (
                  filteredSales
                    .filter((s) => (s.dueAmount || 0) > 0)
                    .map((s) => (
                      <div key={s.id} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-white block">{s.invoiceNumber}</span>
                          <span className="text-[11px] text-teal-200">
                            Customer: {s.customerName || 'Walk-in'} ({s.customerPhone || 'N/A'})
                          </span>
                          <span className="text-[10px] text-teal-400/50 block font-mono">
                            {s.date.split('T')[0]}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold font-mono text-rose-400 block">
                            Due: {formatBDT(s.dueAmount || 0)}
                          </span>
                          <span className="text-[10px] text-teal-300/60">
                            Total: {formatBDT(s.grandTotal)}
                          </span>
                        </div>
                      </div>
                    ))
                )
              )}

              {detailModal.type === 'purchases' && (
                filteredPurchases.length === 0 ? (
                  <p className="text-xs text-center text-teal-300/60 py-6">No purchase orders found.</p>
                ) : (
                  filteredPurchases.map((po) => (
                    <div key={po.id} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white block">{po.poNumber}</span>
                        <span className="text-[11px] text-teal-200">
                          Supplier: {po.supplierName}
                        </span>
                        <span className="text-[10px] text-teal-400/50 block font-mono">
                          {po.orderDate} • {po.items.length} items
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold font-mono text-teal-100 block">
                          {formatBDT(po.totalAmount)}
                        </span>
                        <span className="text-[10px] text-emerald-400">
                          Paid: {formatBDT(po.paidAmount)}
                        </span>
                      </div>
                    </div>
                  ))
                )
              )}

              {detailModal.type === 'purchase_due' && (
                filteredPurchases.filter((po) => po.totalAmount - po.paidAmount > 0).length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-white">All Purchase Orders Fully Paid!</p>
                    <p className="text-[11px] text-teal-300/60 mt-0.5">No outstanding supplier payables.</p>
                  </div>
                ) : (
                  filteredPurchases
                    .filter((po) => po.totalAmount - po.paidAmount > 0)
                    .map((po) => (
                      <div key={po.id} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-white block">{po.poNumber}</span>
                          <span className="text-[11px] text-teal-200">
                            Supplier: {po.supplierName}
                          </span>
                          <span className="text-[10px] text-teal-400/50 block font-mono">
                            Ordered: {po.orderDate}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold font-mono text-rose-400 block">
                            Due: {formatBDT(po.totalAmount - po.paidAmount)}
                          </span>
                          <span className="text-[10px] text-teal-300/60">
                            Total: {formatBDT(po.totalAmount)}
                          </span>
                        </div>
                      </div>
                    ))
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#123631] border-t border-[#1b4a43] text-right">
              <button
                onClick={() => setDetailModal({ ...detailModal, isOpen: false })}
                className="px-4 py-1.5 rounded-xl bg-[#1b4b44] hover:bg-[#235f56] text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD EXPENSE MODAL */}
      {isAddingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#0f2d29] border border-[#235850] rounded-2xl max-w-sm w-full p-5 shadow-2xl text-teal-100 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1b4a43] pb-3">
              <h3 className="font-bold text-base text-white">Record Store Expense</h3>
              <button
                onClick={() => setIsAddingExpense(false)}
                className="p-1 rounded-lg text-teal-300/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-teal-200 block mb-1">Expense Category *</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full p-2.5 bg-[#123631] border border-[#1e4c45] rounded-xl text-white focus:outline-none focus:border-teal-400"
                >
                  <option value="Packaging & Bags">Packaging & Bags</option>
                  <option value="Electricity & Utility">Electricity & Utility</option>
                  <option value="Staff Refreshment">Staff Refreshment & Tea</option>
                  <option value="Shop Maintenance">Shop Maintenance</option>
                  <option value="Store Rent">Store Rent</option>
                  <option value="Stationery / Receipts">Stationery / Receipt Paper</option>
                  <option value="Logistics / Delivery">Logistics & Delivery</option>
                  <option value="Other">Other General Expense</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-teal-200 block mb-1">Description / Note *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Medicine packaging poly bags"
                  value={expenseForm.note}
                  onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })}
                  className="w-full p-2.5 bg-[#123631] border border-[#1e4c45] rounded-xl text-white placeholder-teal-400/40 focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="font-bold text-teal-200 block mb-1">Amount (BDT ৳) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full p-2.5 bg-[#123631] border border-[#1e4c45] rounded-xl text-white font-mono font-bold placeholder-teal-400/40 focus:outline-none focus:border-teal-400 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-teal-200 block mb-1">Date</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full p-2 bg-[#123631] border border-[#1e4c45] rounded-xl text-white focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingExpense(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#143933] hover:bg-[#1a4a42] text-teal-200 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors shadow-sm"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
