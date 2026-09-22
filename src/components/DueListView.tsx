import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Users,
  Building2,
  ArrowLeft,
  CheckCircle2,
  Search,
  Wallet,
  Phone,
  Calendar,
  UserPlus,
  Receipt,
  X,
  Printer,
  ArrowUpRight,
  Eye,
  Tag,
  MapPin,
  Mail,
  TrendingDown,
  TrendingUp,
  Layers,
  RefreshCw,
  Lock,
  Clock,
  Sparkles,
  CreditCard,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { Customer, Supplier, Sale, PurchaseOrder } from '../types';
import { formatCurrency } from '../utils/formatters';
import { PrintableInvoiceModal } from './PrintableInvoiceModal';
import { PrintableStatementModal } from './PrintableStatementModal';

interface DueListViewProps {
  onBack: () => void;
}

type SegmentFilter = 'all' | 'due' | 'regular' | 'onetime' | 'settled';
type SupplierStatusFilter = 'all' | 'outstanding' | 'settled';

export interface OneTimeDueItem {
  id: string;
  guestName: string;
  guestPhone: string;
  invoiceRef: string;
  dueAmount: number;
  totalAmount: number;
  paidAmount: number;
  date: string;
  items: Array<{
    medicineId: string;
    medicineName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    batchNumber?: string;
  }>;
  cashierName?: string;
  saleId?: string;
  customerId?: string;
}

const getInitials = (name: string): string => {
  if (!name) return 'CU';
  const clean = name.trim().replace(/^(mr|md|ms|mrs|dr)\.?\s+/i, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CU';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const DueListView: React.FC<DueListViewProps> = ({ onBack }) => {
  const { user } = useAuth();
  const {
    customers,
    suppliers,
    sales,
    purchaseOrders,
    addCustomer,
    settleCustomerDue,
    settleSupplierDue,
    syncState,
    triggerSyncNow,
  } = usePharmacy();

  // Active Tab: Customer vs Supplier
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');

  // Search and Filter Pills
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>('due');
  const [supplierFilter, setSupplierFilter] = useState<SupplierStatusFilter>('outstanding');

  // Modals & Details State
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<Customer | null>(null);
  const [selectedOneTimeDetail, setSelectedOneTimeDetail] = useState<OneTimeDueItem | null>(null);
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState<Supplier | null>(null);

  // Settlement Modal State
  const [settlementTarget, setSettlementTarget] = useState<{
    id: string;
    name: string;
    totalDue: number;
    type: 'customer' | 'supplier';
    invoiceOrPoId?: string;
    referenceNumber?: string;
  } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  // Add Customer Modal State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustId, setNewCustId] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustInitialDue, setNewCustInitialDue] = useState('');
  const [newCustIsOneTime, setNewCustIsOneTime] = useState(false);

  // Print Previews
  const [previewSale, setPreviewSale] = useState<Sale | null>(null);
  const [customerToPrintStatement, setCustomerToPrintStatement] = useState<Customer | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await triggerSyncNow();
      showToast('Cloud & Dexie sync completed successfully!');
    } catch {
      showToast('Sync updated locally in IndexedDB.');
    } finally {
      setTimeout(() => setIsManualSyncing(false), 600);
    }
  };

  // Helper: Extract all sales linked to a specific customer
  const getCustomerSales = (customer: Customer): Sale[] => {
    const cleanPhone = (p?: string) => (p ? p.replace(/\D/g, '').slice(-10) : '');
    const custPhoneClean = cleanPhone(customer.phone);

    return sales.filter((s) => {
      if (s.customerId && s.customerId === customer.id) return true;
      if (custPhoneClean && s.customerPhone && cleanPhone(s.customerPhone) === custPhoneClean) {
        return true;
      }
      if (
        customer.name &&
        s.customerName &&
        s.customerName.trim().toLowerCase() === customer.name.trim().toLowerCase() &&
        customer.name.trim().toLowerCase() !== 'unknown' &&
        customer.name.trim().toLowerCase() !== 'walk-in customer'
      ) {
        return true;
      }
      return false;
    });
  };

  // Helper: Calculate due amount on a specific sale
  const getSaleDue = (sale: Sale): number => {
    if (sale.dueAmount !== undefined) return sale.dueAmount;
    if (sale.paymentStatus === 'Full Due') return sale.grandTotal || sale.totalAmount || 0;
    if (sale.paymentStatus === 'Partial Paid') {
      return Math.max(0, (sale.grandTotal || sale.totalAmount || 0) - (sale.paidAmount || 0));
    }
    return 0;
  };

  // Helper: Extract purchase orders linked to a supplier
  const getSupplierPOs = (supplier: Supplier): PurchaseOrder[] => {
    return purchaseOrders.filter((po) => {
      if (po.supplierId && po.supplierId === supplier.id) return true;
      if (
        po.supplierName &&
        supplier.name &&
        po.supplierName.trim().toLowerCase() === supplier.name.trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    });
  };

  // Helper: Calculate due amount on a PO
  const getPODue = (po: PurchaseOrder): number => {
    return Math.max(0, po.totalAmount - (po.paidAmount || 0));
  };

  // Format date helper
  const formatDateDisplay = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // ---------------------------------------------------------------------------
  // 1. DATA ARCHITECTURE: REGULAR PROFILES vs ONE-TIME DUE TRANSACTIONS
  // ---------------------------------------------------------------------------

  // A. Regular Customers (Saved Profiles)
  const regularCustomers = useMemo(() => {
    return customers.filter((c) => !c.isOneTime);
  }, [customers]);

  // B. One-Time Due Transactions (Independent entries without requiring full profile)
  const oneTimeDuesList = useMemo<OneTimeDueItem[]>(() => {
    const list: OneTimeDueItem[] = [];
    const recordedSaleIds = new Set<string>();

    // 1. Scan sales for guest/one-time transactions with due or marked one-time
    sales.forEach((s) => {
      const saleDue = getSaleDue(s);
      const isOneTimeCustomer =
        s.customerId?.startsWith('CUST-OT-') ||
        customers.some((c) => c.id === s.customerId && c.isOneTime);
      const isGuestOrWalkin =
        !s.customerId ||
        s.customerName === 'Unknown' ||
        s.customerName === 'Walk-in Customer' ||
        s.customerName === 'Walk-in Guest';

      if (s.isOneTimeDue || isOneTimeCustomer || (saleDue > 0 && isGuestOrWalkin)) {
        recordedSaleIds.add(s.id);
        list.push({
          id: s.id,
          guestName: s.customerName && s.customerName !== 'Unknown' ? s.customerName : 'Walk-in Guest',
          guestPhone: s.customerPhone && s.customerPhone !== 'N/A' ? s.customerPhone : 'N/A',
          invoiceRef: s.invoiceNumber || `INV-${s.id.slice(-6)}`,
          dueAmount: saleDue,
          totalAmount: s.grandTotal || s.totalAmount || 0,
          paidAmount: s.paidAmount !== undefined ? s.paidAmount : (s.grandTotal || s.totalAmount || 0) - saleDue,
          date: s.date,
          items: (s.items || []).map((it) => ({
            medicineId: it.medicineId,
            medicineName: it.medicineName,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            totalPrice: it.totalPrice !== undefined ? it.totalPrice : it.unitPrice * it.quantity,
            batchNumber: it.batchNumber,
          })),
          cashierName: s.cashierName || 'Cashier',
          saleId: s.id,
          customerId: s.customerId,
        });
      }
    });

    // 2. Scan customer records marked isOneTime (e.g. manually added One-time Dues without sales yet)
    customers
      .filter((c) => c.isOneTime)
      .forEach((c) => {
        const hasMatchedSale = list.some((it) => it.customerId === c.id);
        if (!hasMatchedSale) {
          list.push({
            id: c.id,
            guestName: c.name || 'Walk-in Guest',
            guestPhone: c.phone || 'N/A',
            invoiceRef: c.id.startsWith('CUST-OT-')
              ? `INV-${c.id.replace(/\D/g, '').slice(-4) || 'OT'}`
              : `INV-${c.id}`,
            dueAmount: c.dueAmount || 0,
            totalAmount: c.totalSpent || c.dueAmount || 0,
            paidAmount: Math.max(0, (c.totalSpent || 0) - (c.dueAmount || 0)),
            date: c.createdAt || c.lastVisit || new Date().toISOString(),
            items: [],
            cashierName: 'Admin',
            customerId: c.id,
          });
        }
      });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, customers]);

  // Dynamic Metrics & Stats Breakdown (Synced in Real-time)
  const metrics = useMemo(() => {
    const regularDueTotal = regularCustomers.reduce((sum, c) => sum + (c.dueAmount || 0), 0);
    const oneTimeDueTotal = oneTimeDuesList.reduce((sum, item) => sum + item.dueAmount, 0);
    const totalCustomerDue = Number((regularDueTotal + oneTimeDueTotal).toFixed(2));

    const regularDueCount = regularCustomers.filter((c) => (c.dueAmount || 0) > 0).length;
    const oneTimeDueCount = oneTimeDuesList.filter((item) => item.dueAmount > 0).length;
    const totalActiveDebtors = regularDueCount + oneTimeDueCount;

    const totalSupplierDue = suppliers.reduce((sum, s) => sum + (s.dueBalance || 0), 0);
    const suppliersWithDueCount = suppliers.filter((s) => (s.dueBalance || 0) > 0).length;

    return {
      totalCustomerDue,
      regularDueTotal,
      oneTimeDueTotal,
      regularDueCount,
      oneTimeDueCount,
      totalActiveDebtors,
      totalSupplierDue,
      suppliersWithDueCount,
    };
  }, [regularCustomers, oneTimeDuesList, suppliers]);

  // Filtered Regular Customers
  const filteredRegularCustomers = useMemo(() => {
    if (segmentFilter === 'onetime') return [];

    return regularCustomers.filter((c) => {
      const due = c.dueAmount || 0;
      if (segmentFilter === 'due' && due <= 0) return false;
      if (segmentFilter === 'settled' && due > 0) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchId = c.id.toLowerCase().includes(term);
        const matchName = c.name.toLowerCase().includes(term);
        const matchPhone = c.phone.toLowerCase().includes(term);
        const matchAddr = c.address ? c.address.toLowerCase().includes(term) : false;
        return matchId || matchName || matchPhone || matchAddr;
      }
      return true;
    });
  }, [regularCustomers, segmentFilter, searchTerm]);

  // Filtered One-Time Due Transactions
  const filteredOneTimeTransactions = useMemo(() => {
    if (segmentFilter === 'regular') return [];

    return oneTimeDuesList.filter((item) => {
      if (segmentFilter === 'due' && item.dueAmount <= 0) return false;
      if (segmentFilter === 'settled' && item.dueAmount > 0) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchRef = item.invoiceRef.toLowerCase().includes(term);
        const matchName = item.guestName.toLowerCase().includes(term);
        const matchPhone = item.guestPhone.toLowerCase().includes(term);
        const matchId = item.id.toLowerCase().includes(term);
        return matchRef || matchName || matchPhone || matchId;
      }
      return true;
    });
  }, [oneTimeDuesList, segmentFilter, searchTerm]);

  // Filtered Suppliers List
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const due = s.dueBalance || 0;
      if (supplierFilter === 'outstanding' && due <= 0) return false;
      if (supplierFilter === 'settled' && due > 0) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = s.name.toLowerCase().includes(term);
        const matchContact = s.contactPerson.toLowerCase().includes(term);
        const matchPhone = s.phone.toLowerCase().includes(term);
        const matchId = s.id.toLowerCase().includes(term);
        return matchName || matchContact || matchPhone || matchId;
      }
      return true;
    });
  }, [suppliers, supplierFilter, searchTerm]);

  // Open Settlement Modal
  const openSettlement = (
    id: string,
    name: string,
    due: number,
    type: 'customer' | 'supplier',
    invoiceOrPoId?: string,
    referenceNumber?: string
  ) => {
    setSettlementTarget({
      id,
      name,
      totalDue: due,
      type,
      invoiceOrPoId,
      referenceNumber,
    });
    setPaymentAmount(due > 0 ? due.toString() : '0');
  };

  // Submit Settlement Payment
  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlementTarget) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid positive payment amount.');
      return;
    }

    if (settlementTarget.type === 'customer') {
      settleCustomerDue(settlementTarget.id, amt, settlementTarget.invoiceOrPoId);
      showToast(
        `Collected ${formatCurrency(amt)} payment for ${settlementTarget.name}${
          settlementTarget.referenceNumber ? ` (${settlementTarget.referenceNumber})` : ''
        }`
      );

      // Keep regular customer detail view updated
      if (selectedCustomerDetail && selectedCustomerDetail.id === settlementTarget.id) {
        setSelectedCustomerDetail((prev) =>
          prev
            ? {
                ...prev,
                dueAmount: Math.max(0, Number(((prev.dueAmount || 0) - amt).toFixed(2))),
              }
            : null
        );
      }

      // Keep one-time detail view updated
      if (
        selectedOneTimeDetail &&
        (selectedOneTimeDetail.id === settlementTarget.id ||
          selectedOneTimeDetail.invoiceRef === settlementTarget.referenceNumber ||
          selectedOneTimeDetail.saleId === settlementTarget.invoiceOrPoId)
      ) {
        setSelectedOneTimeDetail((prev) =>
          prev
            ? {
                ...prev,
                dueAmount: Math.max(0, Number((prev.dueAmount - amt).toFixed(2))),
                paidAmount: Number((prev.paidAmount + amt).toFixed(2)),
              }
            : null
        );
      }
    } else {
      settleSupplierDue(settlementTarget.id, amt, settlementTarget.invoiceOrPoId);
      showToast(
        `Paid ${formatCurrency(amt)} to supplier ${settlementTarget.name}${
          settlementTarget.referenceNumber ? ` (${settlementTarget.referenceNumber})` : ''
        }`
      );
      if (selectedSupplierDetail && selectedSupplierDetail.id === settlementTarget.id) {
        setSelectedSupplierDetail((prev) =>
          prev
            ? {
                ...prev,
                dueBalance: Math.max(0, Number(((prev.dueBalance || 0) - amt).toFixed(2))),
              }
            : null
        );
      }
    }

    setSettlementTarget(null);
    setPaymentAmount('');
  };

  // Open Add Customer Modal
  const handleOpenAddCustomer = () => {
    const nextId = `CUST-${1000 + customers.length + 1}`;
    setNewCustId(nextId);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustEmail('');
    setNewCustInitialDue('');
    setNewCustIsOneTime(false);
    setShowAddCustomerModal(true);
  };

  // Submit New Customer
  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      showToast('Please enter customer full name and phone number.');
      return;
    }

    const initialDue = parseFloat(newCustInitialDue) || 0;

    const created = addCustomer({
      id: newCustId.trim() || undefined,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim() || undefined,
      email: newCustEmail.trim() || undefined,
      dueAmount: initialDue,
      isOneTime: newCustIsOneTime,
    });

    setShowAddCustomerModal(false);
    showToast(
      `Created ${newCustIsOneTime ? 'one-time' : 'regular'} customer ${created.name} (${created.id}) with ৳${initialDue.toFixed(2)} due.`
    );
  };

  return (
    <div className="min-h-screen bg-[#061B14] text-white p-3 sm:p-5 md:p-6 select-none font-sans">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
        {/* ========================================================================= */}
        {/* TOP HEADER: Clean Navigation & Module Title                              */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#00E676]/20">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 sm:p-2.5 rounded-xl bg-[#0B251C] border border-[#00E676]/30 hover:border-[#00E676] text-white hover:bg-[#061B14] transition-all flex items-center gap-1.5 text-xs font-bold shadow-[0_0_15px_rgba(0,230,118,0.08)] cursor-pointer active:scale-95"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-[#00E676]" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#00E676]" />
                <span>Due Ledger & Credit Balances</span>
              </h1>
              <p className="text-[11px] sm:text-xs text-neutral-300 font-medium mt-0.5">
                Consolidated Regular Customer Credit Ledgers, One-Time Guest Dues & Supplier Accounts
              </p>
            </div>
          </div>

          {/* Right Header Action: Customer/Supplier Switch & Add Party */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenAddCustomer}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#00E676] hover:bg-[#00c864] text-[#061B14] rounded-xl text-xs font-black shadow-[0_0_16px_rgba(0,230,118,0.35)] transition-all cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Customer</span>
            </button>

            {/* Tab Selector (Customer Dues vs Supplier Dues) */}
            <div className="flex items-center bg-[#061B14] p-1 rounded-xl border border-[#00E676]/25 shadow-inner">
              <button
                onClick={() => {
                  setActiveTab('customer');
                  setSelectedSupplierDetail(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'customer'
                    ? 'bg-[#00E676] text-[#061B14] font-black shadow-[0_0_12px_rgba(0,230,118,0.4)]'
                    : 'text-neutral-300 hover:text-white hover:bg-[#0B251C]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Customer Dues ({metrics.totalActiveDebtors})</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('supplier');
                  setSelectedCustomerDetail(null);
                  setSelectedOneTimeDetail(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'supplier'
                    ? 'bg-[#00E676] text-[#061B14] font-black shadow-[0_0_12px_rgba(0,230,118,0.4)]'
                    : 'text-neutral-300 hover:text-white hover:bg-[#0B251C]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Supplier Dues ({metrics.suppliersWithDueCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="p-3 bg-[#0B251C] border border-[#00E676] text-[#00E676] rounded-xl text-xs font-bold flex items-center justify-between shadow-[0_0_20px_rgba(0,230,118,0.2)] animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00E676] shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-[#00E676] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Minimalist Sync Indicator Banner */}
        <div className="py-2 px-3 bg-[#0B251C]/90 rounded-xl flex items-center justify-between gap-3 shadow-inner border border-[#00E676]/20 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  syncState.status === 'syncing' || isManualSyncing
                    ? 'bg-blue-400'
                    : syncState.isOnline
                    ? 'bg-[#00E676]'
                    : 'bg-amber-400'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  syncState.status === 'syncing' || isManualSyncing
                    ? 'bg-blue-500'
                    : syncState.isOnline
                    ? 'bg-[#00E676]'
                    : 'bg-amber-500'
                }`}
              ></span>
            </span>

            <span className="font-bold text-neutral-200 shrink-0 text-xs">
              {syncState.status === 'syncing' || isManualSyncing
                ? 'Syncing...'
                : syncState.isOnline
                ? 'Realtime Cloud Ledger'
                : 'Offline Storage Active'}
            </span>

            <span className="text-neutral-600">|</span>

            <div className="flex items-center gap-1.5 truncate text-[11px] text-neutral-300">
              <Lock className="w-3 h-3 text-[#00E676] shrink-0 inline" />
              <span>Active Pharmacist:</span>
              <span className="font-mono text-[#00E676] font-bold bg-[#061B14] px-1.5 py-0.5 rounded border border-[#00E676]/30">
                {user?.displayName || user?.email || 'Siam Hasan'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleManualSync}
              disabled={isManualSyncing}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#061B14] hover:bg-[#0B251C] text-[#00E676] rounded-lg text-[11px] font-bold border border-[#00E676]/30 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              title="Backup ledger changes to Cloud"
            >
              <RefreshCw className={`w-3 h-3 ${isManualSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ANALYTICS CARDS LAYOUT (2x2 GRID): Dark Glassmorphism with Glowing Green */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          {/* Card 1: Customer Receivable */}
          <div className="bg-[#0B251C]/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-[#00E676]/35 shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_18px_rgba(0,230,118,0.08)] hover:border-[#00E676]/60 hover:shadow-[0_4px_30px_rgba(0,0,0,0.6),0_0_24px_rgba(0,230,118,0.18)] transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#00E676] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#00E676] shrink-0" />
                <span>Customer Receivable</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/40 shadow-[0_0_10px_rgba(0,230,118,0.15)]">
                <Users className="w-3 h-3 text-[#00E676]" />
                <span>{metrics.totalActiveDebtors} parties due</span>
              </span>
            </div>
            <div className="my-3">
              <p className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                {formatCurrency(metrics.totalCustomerDue)}
              </p>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#00E676]/15 text-neutral-300">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E676]"></span>
                <span>Total outstanding amount due</span>
              </span>
              <span className="font-mono text-xs text-[#00E676] font-bold">
                {metrics.regularDueCount} Reg • {metrics.oneTimeDueCount} 1-Time
              </span>
            </div>
          </div>

          {/* Card 2: Supplier Payable */}
          <div className="bg-[#0B251C]/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-amber-500/35 shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_18px_rgba(245,158,11,0.08)] hover:border-amber-400/60 hover:shadow-[0_4px_30px_rgba(0,0,0,0.6),0_0_24px_rgba(245,158,11,0.18)] transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Supplier Payable</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                <Building2 className="w-3 h-3 text-amber-300" />
                <span>{metrics.suppliersWithDueCount} wholesalers</span>
              </span>
            </div>
            <div className="my-3">
              <p className="text-2xl sm:text-3xl font-black font-mono text-amber-300 tracking-tight">
                {formatCurrency(metrics.totalSupplierDue)}
              </p>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-amber-500/15 text-neutral-300">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Total supplier payable debt</span>
              </span>
              <span className="font-mono text-xs text-amber-300 font-bold">
                {suppliers.length} Total Vendors
              </span>
            </div>
          </div>

          {/* Card 3: Net Credit Position */}
          {(() => {
            const net = metrics.totalCustomerDue - metrics.totalSupplierDue;
            const isPositive = net >= 0;
            return (
              <div
                className={`bg-[#0B251C]/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between group ${
                  isPositive
                    ? 'border-[#00E676]/35 shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_18px_rgba(0,230,118,0.08)] hover:border-[#00E676]/60'
                    : 'border-rose-500/35 shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_18px_rgba(244,63,94,0.08)] hover:border-rose-500/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                      isPositive ? 'text-[#00E676]' : 'text-rose-400'
                    }`}
                  >
                    <Wallet className="w-4 h-4 shrink-0" />
                    <span>Net Credit Position</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                      isPositive
                        ? 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/40 shadow-[0_0_10px_rgba(0,230,118,0.15)]'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.15)]'
                    }`}
                  >
                    <ArrowUpRight className={`w-3 h-3 ${isPositive ? '' : 'rotate-90 text-rose-300'}`} />
                    <span>{isPositive ? 'Net Surplus' : 'Net Deficit'}</span>
                  </span>
                </div>
                <div className="my-3">
                  <p
                    className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                      isPositive ? 'text-white' : 'text-rose-300'
                    }`}
                  >
                    {isPositive ? '+' : '-'} {formatCurrency(Math.abs(net))}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#00E676]/15 text-neutral-300">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-[#00E676]' : 'bg-rose-400'}`}></span>
                    <span>{isPositive ? 'Receivable balance exceeds payable' : 'Supplier debts exceed receivables'}</span>
                  </span>
                  <span className={`font-mono text-xs font-bold ${isPositive ? 'text-[#00E676]' : 'text-rose-400'}`}>
                    {isPositive ? 'Clean Position' : 'Action Required'}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Card 4: Due Breakdown */}
          <div className="bg-[#0B251C]/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-[#00E676]/35 shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_18px_rgba(0,230,118,0.08)] hover:border-[#00E676]/60 hover:shadow-[0_4px_30px_rgba(0,0,0,0.6),0_0_24px_rgba(0,230,118,0.18)] transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#00E676] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00E676] shrink-0" />
                <span>Due Breakdown</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#061B14] text-neutral-300 border border-[#00E676]/30">
                <Tag className="w-3 h-3 text-[#00E676]" />
                <span>{metrics.totalActiveDebtors} active debtors</span>
              </span>
            </div>
            
            {/* Styled mini-cards separating 'Regular' vs 'One-Time' debtor counts cleanly */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 my-2.5">
              <div className="bg-[#061B14] border border-[#00E676]/40 p-2.5 sm:p-3 rounded-xl flex flex-col justify-between shadow-inner">
                <span className="text-[11px] font-bold text-[#00E676] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse"></span>
                  Regular
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl sm:text-2xl font-black font-mono text-white">
                    {metrics.regularDueCount}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Profiles
                  </span>
                </div>
              </div>

              <div className="bg-[#061B14] border border-amber-500/40 p-2.5 sm:p-3 rounded-xl flex flex-col justify-between shadow-inner">
                <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  One-Time
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl sm:text-2xl font-black font-mono text-amber-300">
                    {metrics.oneTimeDueCount}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Walk-ins
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#00E676]/15 text-neutral-300">
              <span>Auto-merged profiles & walk-in bills</span>
              <span className="font-mono text-xs text-[#00E676] font-bold">
                {regularCustomers.length} Reg Profiles
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEARCH & FILTER BAR SECTION: Modern Emerald Theme                          */}
        {/* ========================================================================= */}
        <div className="sticky top-2 z-20 bg-[#0B251C]/95 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-[#00E676]/30 shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_18px_rgba(0,230,118,0.08)] flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
          {/* Modernized Search Box */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-[#00E676] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Customer ID, Name, Phone..."
              className="w-full pl-10 pr-9 py-2 bg-[#061B14] border border-[#00E676]/30 rounded-xl text-xs font-medium text-white placeholder-neutral-400 focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676]/40 transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tabs: Horizontal pills with sleek green selection highlights */}
          {activeTab === 'customer' ? (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 md:pb-0">
              <div className="flex items-center bg-[#061B14] p-1 rounded-xl border border-[#00E676]/25 shadow-inner gap-1">
                {/* [All (count)] */}
                <button
                  onClick={() => setSegmentFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    segmentFilter === 'all'
                      ? 'bg-[#00E676] text-[#061B14] font-black shadow-[0_0_12px_rgba(0,230,118,0.4)]'
                      : 'text-neutral-300 hover:text-white hover:bg-[#0B251C]'
                  }`}
                >
                  <span>All ({regularCustomers.length + oneTimeDuesList.length})</span>
                </button>

                {/* [With Due (count)] */}
                <button
                  onClick={() => setSegmentFilter('due')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    segmentFilter === 'due'
                      ? 'bg-[#00E676] text-[#061B14] font-black shadow-[0_0_12px_rgba(0,230,118,0.4)]'
                      : 'text-neutral-300 hover:text-white hover:bg-[#0B251C]'
                  }`}
                >
                  <span>With Due ({metrics.totalActiveDebtors})</span>
                </button>

                {/* [Regular (count)] */}
                <button
                  onClick={() => setSegmentFilter('regular')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    segmentFilter === 'regular'
                      ? 'bg-[#00E676] text-[#061B14] font-black shadow-[0_0_12px_rgba(0,230,118,0.4)]'
                      : 'text-neutral-300 hover:text-white hover:bg-[#0B251C]'
                  }`}
                >
                  <span>Regular ({regularCustomers.length})</span>
                </button>

                {/* [One-Time (count)] */}
                <button
                  onClick={() => setSegmentFilter('onetime')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    segmentFilter === 'onetime'
                      ? 'bg-[#00E676] text-[#061B14] font-black shadow-[0_0_12px_rgba(0,230,118,0.4)]'
                      : 'text-neutral-300 hover:text-white hover:bg-[#0B251C]'
                  }`}
                >
                  <span>One-Time ({oneTimeDuesList.length})</span>
                </button>

                {/* [Settled (৳0)] */}
                <button
                  onClick={() => setSegmentFilter('settled')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    segmentFilter === 'settled'
                      ? 'bg-[#00E676] text-[#061B14] font-black shadow-[0_0_12px_rgba(0,230,118,0.4)]'
                      : 'text-neutral-300 hover:text-white hover:bg-[#0B251C]'
                  }`}
                >
                  <span>Settled (৳0)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Supplier Filter Pills */
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 md:pb-0">
              <div className="flex items-center bg-[#061B14] p-1 rounded-xl border border-[#00E676]/25 shadow-inner gap-1">
                <button
                  onClick={() => setSupplierFilter('outstanding')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    supplierFilter === 'outstanding'
                      ? 'bg-[#00E676] text-[#061B14] font-black shadow-[0_0_12px_rgba(0,230,118,0.4)]'
                      : 'text-neutral-300 hover:text-white hover:bg-[#0B251C]'
                  }`}
                >
                  <span>With Payable ({metrics.suppliersWithDueCount})</span>
                </button>
                <button
                  onClick={() => setSupplierFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    supplierFilter === 'all'
                      ? 'bg-[#00E676] text-[#061B14] font-black shadow-[0_0_12px_rgba(0,230,118,0.4)]'
                      : 'text-neutral-300 hover:text-white hover:bg-[#0B251C]'
                  }`}
                >
                  <span>All Suppliers ({suppliers.length})</span>
                </button>
                <button
                  onClick={() => setSupplierFilter('settled')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    supplierFilter === 'settled'
                      ? 'bg-[#00E676] text-[#061B14] font-black shadow-[0_0_12px_rgba(0,230,118,0.4)]'
                      : 'text-neutral-300 hover:text-white hover:bg-[#0B251C]'
                  }`}
                >
                  <span>Settled (৳0)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MAIN LEDGER VIEW: Customer Accounts & Consolidated Credit Ledgers          */}
        {/* ========================================================================= */}
        {activeTab === 'customer' ? (
          <div className="bg-[#0B251C] rounded-2xl border border-[#00E676]/30 shadow-[0_4px_30px_rgba(0,0,0,0.6),0_0_20px_rgba(0,230,118,0.06)] overflow-hidden">
            {/* Customer Accounts & Ledger Section Header */}
            <div className="px-4 py-3.5 bg-[#0B251C] border-b border-[#00E676]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#061B14] border border-[#00E676]/40 flex items-center justify-center text-[#00E676] shadow-sm">
                  <FileText className="w-4 h-4 text-[#00E676]" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2">
                    <span>Customer Accounts & Consolidated Credit Ledgers</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#061B14] text-[#00E676] border border-[#00E676]/35 shadow-sm">
                      {filteredRegularCustomers.length + filteredOneTimeTransactions.length} records
                    </span>
                  </h2>
                </div>
              </div>
              <span className="text-[11px] text-emerald-100/70 hidden md:inline">
                Click any Regular customer for full credit ledger, or One-Time due for invoice bill breakdown
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#061B14] border-b border-[#00E676]/20 text-neutral-300 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Customer / Guest Party</th>
                    <th className="px-4 py-3">Reference / Contact</th>
                    <th className="px-4 py-3 text-center">Type / Invoices</th>
                    <th className="px-4 py-3">Last Activity / Date</th>
                    <th className="px-4 py-3 text-right">Total Outstanding Due</th>
                    <th className="px-4 py-3 text-center">Quick Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#00E676]/15">
                  {filteredRegularCustomers.length === 0 && filteredOneTimeTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-neutral-400">
                        <CheckCircle2 className="w-8 h-8 text-[#00E676] mx-auto mb-2" />
                        <p className="font-bold text-neutral-200 text-sm">No due records match the active filter</p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Try switching to [All] or clearing your search keywords.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {/* 1. RENDER REGULAR CUSTOMER CARDS / ROWS */}
                      {filteredRegularCustomers.map((cust) => {
                        const custSales = getCustomerSales(cust);
                        const creditInvoices = custSales.filter((s) => getSaleDue(s) > 0);
                        const dueAmt = cust.dueAmount || 0;
                        const lastActivityDate = cust.lastVisit || (custSales.length > 0 ? custSales[0].date : cust.createdAt);

                        return (
                          <tr
                            key={`reg-${cust.id}`}
                            onClick={() => setSelectedCustomerDetail(cust)}
                            className="hover:bg-[#061B14]/80 transition-colors group cursor-pointer border-b border-[#00E676]/10"
                          >
                            {/* Customer Party: Avatar + Name + ID + Regular Badge */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#061B14] border border-[#00E676]/40 text-[#00E676] flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                                  {getInitials(cust.name)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-white text-xs sm:text-sm group-hover:text-[#00E676] transition-colors truncate">
                                      {cust.name}
                                    </span>
                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#061B14] text-[#00E676] border border-[#00E676]/30 shrink-0">
                                      {cust.id}
                                    </span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/40 shrink-0">
                                      Regular Profile
                                    </span>
                                  </div>
                                  {cust.address && (
                                    <span className="text-neutral-400 text-[11px] truncate max-w-[220px] flex items-center gap-1 mt-0.5">
                                      <MapPin className="w-3 h-3 text-[#00E676] shrink-0" />
                                      {cust.address}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Contact / Phone */}
                            <td className="px-4 py-3.5">
                              <div className="flex flex-col">
                                <span className="flex items-center gap-1 font-mono text-neutral-200 font-semibold text-xs">
                                  <Phone className="w-3 h-3 text-[#00E676]/70 shrink-0" />
                                  {cust.phone || 'N/A'}
                                </span>
                                <span className="text-neutral-400 text-[10px] mt-0.5 font-mono">
                                  Spent: {formatCurrency(cust.totalSpent || 0)}
                                </span>
                              </div>
                            </td>

                            {/* Type / Invoices Count */}
                            <td className="px-4 py-3.5 text-center">
                              <span
                                className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  creditInvoices.length > 1
                                    ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                                    : creditInvoices.length === 1
                                    ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                                    : 'bg-[#061B14] text-neutral-300 border-[#00E676]/20'
                                }`}
                              >
                                <FileText className="w-2.5 h-2.5 text-current opacity-80" />
                                {creditInvoices.length} {creditInvoices.length === 1 ? 'due inv' : 'due invs'}
                              </span>
                            </td>

                            {/* 'Last Activity' Date */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-medium">
                                <Clock className="w-3 h-3 text-[#00E676] shrink-0" />
                                <span>{formatDateDisplay(lastActivityDate)}</span>
                              </div>
                            </td>

                            {/* Total Outstanding Due Amount */}
                            <td className="px-4 py-3.5 text-right">
                              <span
                                className={`font-mono text-sm sm:text-base font-black ${
                                  dueAmt > 0 ? 'text-amber-300' : 'text-[#00E676]'
                                }`}
                              >
                                {formatCurrency(dueAmt)}
                              </span>
                              {dueAmt === 0 && (
                                <span className="block text-[9px] font-bold text-[#00E676] uppercase tracking-wider">
                                  Settled
                                </span>
                              )}
                            </td>

                            {/* Quick Actions */}
                            <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setSelectedCustomerDetail(cust)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-[#061B14] hover:bg-[#00E676]/20 text-[#00E676] rounded-lg text-xs font-bold border border-[#00E676]/30 transition-colors cursor-pointer"
                                  title="View Detailed Credit Ledger"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#00E676]" />
                                  <span className="hidden sm:inline">View Ledger</span>
                                </button>

                                {dueAmt > 0 ? (
                                  <button
                                    onClick={() => openSettlement(cust.id, cust.name, dueAmt, 'customer')}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-[#00E676] hover:bg-[#00c864] text-[#061B14] rounded-lg text-xs font-black transition-all shadow-[0_0_12px_rgba(0,230,118,0.35)] cursor-pointer active:scale-95"
                                    title="Collect Outstanding Payment"
                                  >
                                    <Receipt className="w-3.5 h-3.5 stroke-[2.5]" />
                                    <span>Receive Payment</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setCustomerToPrintStatement(cust)}
                                    className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#061B14] rounded-lg transition-colors cursor-pointer"
                                    title="Print Account Statement"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* 2. RENDER ONE-TIME INDEPENDENT DUE TRANSACTIONS */}
                      {filteredOneTimeTransactions.map((item) => {
                        return (
                          <tr
                            key={`ot-${item.id}`}
                            onClick={() => setSelectedOneTimeDetail(item)}
                            className="hover:bg-[#061B14]/80 transition-colors group cursor-pointer bg-[#0B251C]/40 border-b border-amber-500/15"
                          >
                            {/* Guest Party: Avatar + Guest Name + One-Time Badge */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#061B14] border border-amber-500/40 text-amber-300 flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                                  {getInitials(item.guestName)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-white text-xs sm:text-sm group-hover:text-amber-300 transition-colors truncate">
                                      {item.guestName}
                                    </span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40 shrink-0">
                                      One-Time Due
                                    </span>
                                  </div>
                                  <span className="text-neutral-400 text-[11px] flex items-center gap-1 mt-0.5 font-mono">
                                    <Receipt className="w-3 h-3 text-amber-400 shrink-0" />
                                    Ref: {item.invoiceRef}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Guest Contact & Invoice Reference */}
                            <td className="px-4 py-3.5">
                              <div className="flex flex-col">
                                <span className="flex items-center gap-1 font-mono text-neutral-200 font-semibold text-xs">
                                  <Phone className="w-3 h-3 text-amber-400/70 shrink-0" />
                                  {item.guestPhone}
                                </span>
                                <span className="font-mono text-amber-300/90 text-[10px] mt-0.5 font-bold">
                                  Invoice: {item.invoiceRef}
                                </span>
                              </div>
                            </td>

                            {/* Type Indicator */}
                            <td className="px-4 py-3.5 text-center">
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40">
                                <Tag className="w-2.5 h-2.5 text-current opacity-80" />
                                1-Time Transaction
                              </span>
                            </td>

                            {/* Transaction Date */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-medium">
                                <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>{formatDateDisplay(item.date)}</span>
                              </div>
                            </td>

                            {/* Outstanding Due Amount */}
                            <td className="px-4 py-3.5 text-right">
                              <span
                                className={`font-mono text-sm sm:text-base font-black ${
                                  item.dueAmount > 0 ? 'text-amber-300' : 'text-[#00E676]'
                                }`}
                              >
                                {formatCurrency(item.dueAmount)}
                              </span>
                              {item.dueAmount === 0 && (
                                <span className="block text-[9px] font-bold text-[#00E676] uppercase tracking-wider">
                                  Settled
                                </span>
                              )}
                            </td>

                            {/* Quick Actions */}
                            <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setSelectedOneTimeDetail(item)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-[#061B14] hover:bg-amber-500/20 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/30 transition-colors cursor-pointer"
                                  title="View Invoice Bill Breakdown"
                                >
                                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                                  <span className="hidden sm:inline">View Bill</span>
                                </button>

                                {item.dueAmount > 0 && (
                                  <button
                                    onClick={() =>
                                      openSettlement(
                                        item.customerId || item.id,
                                        item.guestName,
                                        item.dueAmount,
                                        'customer',
                                        item.saleId || item.id,
                                        item.invoiceRef
                                      )
                                    }
                                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#061B14] rounded-lg text-xs font-black transition-all shadow-[0_0_12px_rgba(251,191,36,0.35)] cursor-pointer active:scale-95"
                                    title="Collect Payment for this Bill"
                                  >
                                    <Receipt className="w-3.5 h-3.5 stroke-[2.5]" />
                                    <span>Receive Payment</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* SUPPLIER ACCOUNTS PAYABLE LEDGER TABLE                                    */
          /* ========================================================================= */
          <div className="bg-[#0B251C] rounded-2xl border border-[#00E676]/30 shadow-[0_4px_30px_rgba(0,0,0,0.6),0_0_20px_rgba(0,230,118,0.06)] overflow-hidden">
            <div className="px-4 py-3 bg-[#061B14] border-b border-[#00E676]/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs text-white">
                  Supplier Accounts & Payable Balance Consolidation ({filteredSuppliers.length})
                </span>
              </div>
              <span className="hidden sm:inline text-[11px] text-emerald-100/70">
                Click any supplier row to inspect purchase orders & payment history
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#061B14] border-b border-[#00E676]/20 text-neutral-300 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Supplier / Wholesaler</th>
                    <th className="px-4 py-3">Contact Person & Phone</th>
                    <th className="px-4 py-3 text-center">Inbound POs</th>
                    <th className="px-4 py-3 text-right">Outstanding Payable Debt</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#00E676]/15">
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-neutral-400">
                        <CheckCircle2 className="w-8 h-8 text-[#00E676] mx-auto mb-2" />
                        <p className="font-bold text-neutral-200 text-sm">No suppliers match the filter</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((sup) => {
                      const pos = getSupplierPOs(sup);
                      const dueAmt = sup.dueBalance || 0;

                      return (
                        <tr
                          key={sup.id}
                          onClick={() => setSelectedSupplierDetail(sup)}
                          className="hover:bg-[#061B14]/80 transition-colors group cursor-pointer border-b border-[#00E676]/10"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#061B14] border border-amber-500/40 text-amber-300 flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                                {sup.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-white text-xs sm:text-sm group-hover:text-amber-300 transition-colors block">
                                  {sup.name}
                                </span>
                                <span className="font-mono text-[10px] text-neutral-400">{sup.id}</span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-medium text-neutral-200 text-xs">
                                {sup.contactPerson || 'Official Representative'}
                              </span>
                              <span className="font-mono text-neutral-400 text-[11px] flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-[#00E676]/70" />
                                {sup.phone}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#061B14] text-neutral-200 border border-[#00E676]/20">
                              <Building2 className="w-2.5 h-2.5 text-amber-400" />
                              {pos.length} Orders
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <span
                              className={`font-mono text-sm sm:text-base font-black ${
                                dueAmt > 0 ? 'text-amber-300' : 'text-[#00E676]'
                              }`}
                            >
                              {formatCurrency(dueAmt)}
                            </span>
                            {dueAmt === 0 && (
                              <span className="block text-[9px] font-bold text-[#00E676] uppercase tracking-wider">
                                Settled
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedSupplierDetail(sup)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#061B14] hover:bg-amber-500/20 text-neutral-200 hover:text-white rounded-lg text-xs font-bold border border-[#00E676]/30 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-amber-400" />
                                <span className="hidden sm:inline">View POs</span>
                              </button>

                              {dueAmt > 0 && (
                                <button
                                  onClick={() => openSettlement(sup.id, sup.name, dueAmt, 'supplier')}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#061B14] rounded-lg text-xs font-black transition-all shadow-[0_0_12px_rgba(251,191,36,0.35)] cursor-pointer active:scale-95"
                                >
                                  <Wallet className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Pay Debt</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DETAIL MODAL 1: REGULAR CUSTOMER FULL CREDIT LEDGER                       */}
        {/* ========================================================================= */}
        {selectedCustomerDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="bg-[#0B251C] rounded-3xl w-full max-w-4xl border border-[#00E676]/40 shadow-[0_0_35px_rgba(0,230,118,0.15)] overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 text-white">
              {/* Modal Header */}
              <div className="p-5 sm:p-6 bg-[#061B14] border-b border-[#00E676]/20 flex items-start justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-[#061B14] text-[#00E676] font-mono text-xs font-black rounded-md border border-[#00E676]/40">
                      {selectedCustomerDetail.id}
                    </span>
                    <span className="px-2 py-0.5 bg-[#00E676]/15 text-[#00E676] text-[10px] font-bold rounded-md border border-[#00E676]/40">
                      Regular Saved Profile
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">{selectedCustomerDetail.name}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-300 pt-0.5">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#00E676]" />
                      {selectedCustomerDetail.phone || 'N/A'}
                    </span>
                    {selectedCustomerDetail.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#00E676]" />
                        {selectedCustomerDetail.address}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-neutral-400">
                      <Clock className="w-3.5 h-3.5 text-[#00E676]" />
                      Last Activity: {formatDateDisplay(selectedCustomerDetail.lastVisit)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerToPrintStatement(selectedCustomerDetail)}
                    className="px-3 py-1.5 bg-[#061B14] hover:bg-[#00E676]/20 text-[#00E676] rounded-xl text-xs font-bold border border-[#00E676]/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Generate Printable Statement"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Print Statement</span>
                  </button>

                  {(selectedCustomerDetail.dueAmount || 0) > 0 && (
                    <button
                      onClick={() =>
                        openSettlement(
                          selectedCustomerDetail.id,
                          selectedCustomerDetail.name,
                          selectedCustomerDetail.dueAmount || 0,
                          'customer'
                        )
                      }
                      className="px-3.5 py-1.5 bg-[#00E676] hover:bg-[#00c864] text-[#061B14] rounded-xl text-xs font-black shadow-[0_0_12px_rgba(0,230,118,0.35)] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Receipt className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Receive Payment</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedCustomerDetail(null)}
                    className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-[#061B14] transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Balances Summary Banner */}
              <div className="p-4 bg-[#061B14]/80 border-b border-[#00E676]/20 grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase text-neutral-400">Total Invoiced</span>
                  <p className="text-base font-black text-white font-mono mt-0.5">
                    {formatCurrency(selectedCustomerDetail.totalSpent || 0)}
                  </p>
                </div>
                <div className="border-x border-[#00E676]/20">
                  <span className="text-[10px] font-bold uppercase text-neutral-400">Total Settled</span>
                  <p className="text-base font-black text-[#00E676] font-mono mt-0.5">
                    {formatCurrency(
                      Math.max(
                        0,
                        (selectedCustomerDetail.totalSpent || 0) - (selectedCustomerDetail.dueAmount || 0)
                      )
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-400">Outstanding Due</span>
                  <p className="text-lg font-black text-amber-300 font-mono mt-0.5">
                    {formatCurrency(selectedCustomerDetail.dueAmount || 0)}
                  </p>
                </div>
              </div>

              {/* Consolidated Invoices & Date-Wise Item Breakdown */}
              <div className="p-4 sm:p-6 space-y-4 max-h-[500px] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-[#00E676]" />
                    <span>Transaction History & Item Breakdown ({getCustomerSales(selectedCustomerDetail).length})</span>
                  </h3>
                  <span className="text-[11px] text-emerald-100/70">
                    All credit transactions auto-merged under {selectedCustomerDetail.id}
                  </span>
                </div>

                {getCustomerSales(selectedCustomerDetail).length === 0 ? (
                  <div className="py-8 text-center bg-[#061B14] rounded-2xl border border-dashed border-[#00E676]/20">
                    <p className="text-xs text-neutral-400 font-medium">
                      No sales recorded yet for this customer profile.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getCustomerSales(selectedCustomerDetail).map((sale) => {
                      const dueAmt = getSaleDue(sale);
                      const paidAmt = sale.paidAmount !== undefined ? sale.paidAmount : (sale.grandTotal - dueAmt);

                      return (
                        <div
                          key={sale.id}
                          className="p-4 rounded-2xl border border-[#00E676]/20 bg-[#061B14] hover:border-[#00E676]/40 transition-all space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-white bg-[#0B251C] px-2 py-0.5 rounded border border-[#00E676]/30">
                                {sale.invoiceNumber}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  dueAmt <= 0
                                    ? 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/40'
                                    : sale.paymentStatus === 'Partial Paid'
                                    ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                                    : 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
                                }`}
                              >
                                {dueAmt <= 0 ? 'Full Paid' : sale.paymentStatus || 'Due'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-neutral-400 font-medium">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-[#00E676]" />
                                {new Date(sale.date).toLocaleDateString('en-GB')}
                              </span>
                              <span>•</span>
                              <span>Staff: {sale.cashierName || 'Admin'}</span>
                            </div>
                          </div>

                          {/* Date-wise Purchased Items breakdown table */}
                          <div className="bg-[#0B251C] rounded-xl border border-[#00E676]/20 overflow-hidden">
                            <div className="px-3 py-1.5 bg-[#061B14] border-b border-[#00E676]/20 text-[10px] font-bold text-neutral-300 uppercase tracking-wider flex justify-between">
                              <span>Date-wise Item Breakdown</span>
                              <span>{sale.items.length} item(s)</span>
                            </div>
                            <div className="p-2 space-y-1 text-[11px]">
                              {sale.items.map((i, idx) => (
                                <div key={idx} className="flex items-center justify-between text-neutral-300">
                                  <span className="font-medium text-white">
                                    • {i.medicineName} <span className="text-[#00E676] font-mono">({i.quantity}x)</span>
                                  </span>
                                  <span className="font-mono text-neutral-400">
                                    {formatCurrency(i.unitPrice)} each ={' '}
                                    <span className="text-white font-bold">
                                      {formatCurrency(i.totalPrice !== undefined ? i.totalPrice : i.unitPrice * i.quantity)}
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Financials & Quick Action */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[#00E676]/20 text-xs">
                            <div className="flex items-center gap-4">
                              <div>
                                <span className="text-[10px] text-neutral-400 block">Total</span>
                                <span className="font-bold text-white font-mono">
                                  {formatCurrency(sale.grandTotal || sale.totalAmount || 0)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-neutral-400 block">Paid</span>
                                <span className="font-bold text-[#00E676] font-mono">
                                  {formatCurrency(paidAmt)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-neutral-400 block">Due</span>
                                <span
                                  className={`font-bold font-mono ${
                                    dueAmt > 0 ? 'text-amber-300' : 'text-neutral-500'
                                  }`}
                                >
                                  {formatCurrency(dueAmt)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setPreviewSale(sale)}
                                className="px-2.5 py-1.5 bg-[#061B14] hover:bg-[#0B251C] text-white rounded-lg font-bold text-xs flex items-center gap-1 border border-[#00E676]/30 transition-colors cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5 text-[#00E676]" />
                                <span>Receipt</span>
                              </button>
                              {dueAmt > 0 && (
                                <button
                                  onClick={() =>
                                    openSettlement(
                                      selectedCustomerDetail.id,
                                      selectedCustomerDetail.name,
                                      dueAmt,
                                      'customer',
                                      sale.id,
                                      sale.invoiceNumber
                                    )
                                  }
                                  className="px-3 py-1.5 bg-[#00E676] hover:bg-[#00c864] text-[#061B14] rounded-lg font-black text-xs shadow-[0_0_12px_rgba(0,230,118,0.35)] transition-all cursor-pointer active:scale-95"
                                >
                                  Settle Invoice
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-[#061B14] border-t border-[#00E676]/20 flex justify-end">
                <button
                  onClick={() => setSelectedCustomerDetail(null)}
                  className="px-4 py-2 bg-[#0B251C] hover:bg-[#061B14] text-white rounded-xl font-bold text-xs border border-[#00E676]/30 transition-colors cursor-pointer"
                >
                  Close Ledger
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DETAIL MODAL 2: ONE-TIME DUE SPECIFIC INVOICE BILL BREAKDOWN              */}
        {/* ========================================================================= */}
        {selectedOneTimeDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="bg-[#0B251C] rounded-3xl w-full max-w-2xl border border-amber-500/40 shadow-[0_0_35px_rgba(251,191,36,0.15)] overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 text-white">
              {/* Modal Header */}
              <div className="p-5 sm:p-6 bg-[#061B14] border-b border-amber-500/20 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-950 text-amber-300 font-mono text-xs font-bold rounded-md border border-amber-500/40">
                      Ref: {selectedOneTimeDetail.invoiceRef}
                    </span>
                    <span className="px-2 py-0.5 bg-[#0B251C] text-neutral-300 text-[10px] font-bold rounded-md border border-amber-500/30">
                      One-Time Walk-in Due
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">{selectedOneTimeDetail.guestName}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-300 pt-0.5">
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      {selectedOneTimeDetail.guestPhone}
                    </span>
                    <span className="flex items-center gap-1 text-neutral-400">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      Date: {formatDateDisplay(selectedOneTimeDetail.date)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedOneTimeDetail(null)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-[#061B14] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Bill Financial Summary */}
              <div className="p-4 bg-[#061B14]/80 border-b border-amber-500/20 grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase text-neutral-400">Total Bill</span>
                  <p className="text-base font-black text-white font-mono mt-0.5">
                    {formatCurrency(selectedOneTimeDetail.totalAmount)}
                  </p>
                </div>
                <div className="border-x border-amber-500/20">
                  <span className="text-[10px] font-bold uppercase text-neutral-400">Amount Paid</span>
                  <p className="text-base font-black text-[#00E676] font-mono mt-0.5">
                    {formatCurrency(selectedOneTimeDetail.paidAmount)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-400">Remaining Due</span>
                  <p className="text-lg font-black text-amber-300 font-mono mt-0.5">
                    {formatCurrency(selectedOneTimeDetail.dueAmount)}
                  </p>
                </div>
              </div>

              {/* Specific Invoice Bill Breakdown Table */}
              <div className="p-5 sm:p-6 space-y-4 max-h-[460px] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-amber-400" />
                    <span>Specific Invoice Bill Breakdown</span>
                  </h3>
                  <span className="text-[11px] text-amber-100/70">
                    Items billed for reference #{selectedOneTimeDetail.invoiceRef}
                  </span>
                </div>

                {selectedOneTimeDetail.items.length === 0 ? (
                  <div className="py-6 text-center bg-[#061B14] rounded-2xl border border-dashed border-amber-500/30">
                    <p className="text-xs text-neutral-400 font-medium">
                      Direct balance entry without itemized medicine lines.
                    </p>
                  </div>
                ) : (
                  <div className="border border-amber-500/20 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#061B14] border-b border-amber-500/20 text-neutral-300 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-3 py-2.5">Medicine Name</th>
                          <th className="px-3 py-2.5 text-center">Qty</th>
                          <th className="px-3 py-2.5 text-right">Unit Price</th>
                          <th className="px-3 py-2.5 text-right">Item Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-500/15 bg-[#061B14]/60">
                        {selectedOneTimeDetail.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-medium text-white">
                              {it.medicineName}
                              {it.batchNumber && (
                                <span className="block text-[10px] font-mono text-neutral-400">
                                  Batch: {it.batchNumber}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center font-mono font-bold text-[#00E676]">
                              {it.quantity}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-neutral-300">
                              {formatCurrency(it.unitPrice)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-white">
                              {formatCurrency(it.totalPrice !== undefined ? it.totalPrice : it.unitPrice * it.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 bg-[#061B14] border-t border-amber-500/20 flex items-center justify-between">
                <button
                  onClick={() => setSelectedOneTimeDetail(null)}
                  className="px-4 py-2 bg-[#0B251C] hover:bg-[#061B14] text-white rounded-xl font-bold text-xs border border-amber-500/30 transition-colors cursor-pointer"
                >
                  Close Bill
                </button>

                {selectedOneTimeDetail.dueAmount > 0 && (
                  <button
                    onClick={() => {
                      const item = selectedOneTimeDetail;
                      setSelectedOneTimeDetail(null);
                      openSettlement(
                        item.customerId || item.id,
                        item.guestName,
                        item.dueAmount,
                        'customer',
                        item.saleId || item.id,
                        item.invoiceRef
                      );
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-[#061B14] font-black rounded-xl text-xs shadow-[0_0_12px_rgba(251,191,36,0.35)] transition-all cursor-pointer active:scale-95"
                  >
                    <Receipt className="w-4 h-4 stroke-[2.5]" />
                    <span>Receive Payment (৳{selectedOneTimeDetail.dueAmount.toFixed(2)})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DETAIL MODAL 3: SUPPLIER PURCHASE ORDERS DRAWER                           */}
        {/* ========================================================================= */}
        {selectedSupplierDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="bg-[#0B251C] rounded-3xl w-full max-w-3xl border border-[#00E676]/40 shadow-[0_0_35px_rgba(0,230,118,0.15)] overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 text-white">
              <div className="p-5 sm:p-6 bg-[#061B14] border-b border-[#00E676]/20 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#061B14] text-amber-300 font-mono text-xs font-bold rounded-md border border-amber-500/40">
                      {selectedSupplierDetail.id}
                    </span>
                    <span className="px-2 py-0.5 bg-[#0B251C] text-neutral-300 text-[10px] font-bold rounded-md border border-[#00E676]/30">
                      Pharmaceutical Wholesaler
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">{selectedSupplierDetail.name}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-300 pt-0.5">
                    <span>Contact: {selectedSupplierDetail.contactPerson}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-[#00E676]" />
                      {selectedSupplierDetail.phone}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(selectedSupplierDetail.dueBalance || 0) > 0 && (
                    <button
                      onClick={() =>
                        openSettlement(
                          selectedSupplierDetail.id,
                          selectedSupplierDetail.name,
                          selectedSupplierDetail.dueBalance || 0,
                          'supplier'
                        )
                      }
                      className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#061B14] rounded-xl text-xs font-black shadow-[0_0_12px_rgba(251,191,36,0.35)] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Wallet className="w-3.5 h-3.5 stroke-[2.5]" />
                      Pay Total Due
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedSupplierDetail(null)}
                    className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-[#061B14] transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Balance Summary */}
              <div className="p-4 bg-[#061B14]/80 border-b border-[#00E676]/20 grid grid-cols-2 gap-3 text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase text-neutral-400">Inbound Orders</span>
                  <p className="text-base font-black text-white font-mono mt-0.5">
                    {getSupplierPOs(selectedSupplierDetail).length} Orders
                  </p>
                </div>
                <div className="border-l border-[#00E676]/20">
                  <span className="text-[10px] font-bold uppercase text-amber-400">Total Payable Debt</span>
                  <p className="text-lg font-black text-amber-300 font-mono mt-0.5">
                    {formatCurrency(selectedSupplierDetail.dueBalance || 0)}
                  </p>
                </div>
              </div>

              {/* PO List */}
              <div className="p-5 sm:p-6 space-y-3 max-h-[460px] overflow-y-auto">
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>Linked Purchase Orders & Inbound Invoices</span>
                </h3>

                {getSupplierPOs(selectedSupplierDetail).length === 0 ? (
                  <div className="py-8 text-center bg-[#061B14] rounded-2xl border border-dashed border-[#00E676]/20">
                    <p className="text-xs text-neutral-400 font-medium">
                      No purchase orders recorded for this supplier yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getSupplierPOs(selectedSupplierDetail).map((po) => {
                      const dueAmt = getPODue(po);
                      const paidAmt = po.paidAmount || 0;

                      return (
                        <div
                          key={po.id}
                          className="p-4 rounded-2xl border border-[#00E676]/20 bg-[#061B14] space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-white bg-[#0B251C] px-2 py-0.5 rounded border border-[#00E676]/30">
                                {po.poNumber}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  dueAmt <= 0
                                    ? 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/40'
                                    : 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                                }`}
                              >
                                {dueAmt <= 0 ? 'Paid' : 'Due'}
                              </span>
                            </div>
                            <span className="text-xs text-neutral-400">
                              {new Date(po.orderDate).toLocaleDateString('en-GB')}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-[#00E676]/20 text-xs">
                            <div className="flex items-center gap-4">
                              <div>
                                <span className="text-[10px] text-neutral-400 block">Total</span>
                                <span className="font-bold text-white font-mono">{formatCurrency(po.totalAmount)}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-neutral-400 block">Paid</span>
                                <span className="font-bold text-[#00E676] font-mono">{formatCurrency(paidAmt)}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-neutral-400 block">Due</span>
                                <span className="font-bold text-amber-300 font-mono">{formatCurrency(dueAmt)}</span>
                              </div>
                            </div>

                            {dueAmt > 0 && (
                              <button
                                onClick={() =>
                                  openSettlement(
                                    selectedSupplierDetail.id,
                                    selectedSupplierDetail.name,
                                    dueAmt,
                                    'supplier',
                                    po.id,
                                    po.poNumber
                                  )
                                }
                                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#061B14] rounded-lg font-black text-xs shadow-[0_0_12px_rgba(251,191,36,0.35)] transition-all cursor-pointer active:scale-95"
                              >
                                Pay PO Balance
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#061B14] border-t border-[#00E676]/20 flex justify-end">
                <button
                  onClick={() => setSelectedSupplierDetail(null)}
                  className="px-4 py-2 bg-[#0B251C] hover:bg-[#061B14] text-white rounded-xl font-bold text-xs border border-[#00E676]/30 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAYMENT SETTLEMENT MODAL (DARK EMERALD THEME)                             */}
        {/* ========================================================================= */}
        {settlementTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0B251C] rounded-3xl p-6 w-full max-w-sm border border-[#00E676]/40 shadow-[0_0_35px_rgba(0,230,118,0.15)] space-y-4 animate-in fade-in zoom-in-95 duration-150 text-white">
              <div className="flex items-center justify-between pb-2 border-b border-[#00E676]/20">
                <h3 className="text-base font-black text-white flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-[#00E676]" />
                  <span>
                    {settlementTarget.type === 'customer'
                      ? 'Receive Customer Payment'
                      : 'Pay Supplier Payable'}
                  </span>
                </h3>
                <button
                  onClick={() => setSettlementTarget(null)}
                  className="p-1 text-neutral-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-[#061B14] p-3.5 rounded-2xl border border-[#00E676]/25 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Account / Party:</span>
                  <span className="font-bold text-white">{settlementTarget.name}</span>
                </div>
                {settlementTarget.referenceNumber && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Invoice / PO:</span>
                    <span className="font-mono font-bold text-[#00E676]">
                      {settlementTarget.referenceNumber}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t border-[#00E676]/20">
                  <span className="text-neutral-400">Outstanding Due:</span>
                  <span className="font-mono font-black text-amber-300 text-sm">
                    {formatCurrency(settlementTarget.totalDue)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-neutral-300">Received Amount (৳):</label>
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(settlementTarget.totalDue.toString())}
                      className="text-[11px] font-bold text-[#00E676] hover:underline cursor-pointer"
                    >
                      Settle Full Balance
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={settlementTarget.totalDue}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full p-2.5 bg-[#061B14] border border-[#00E676]/30 rounded-xl font-mono text-sm font-black text-white focus:outline-none focus:border-[#00E676]"
                    required
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSettlementTarget(null)}
                    className="flex-1 py-2.5 rounded-xl bg-[#061B14] hover:bg-[#0B251C] text-neutral-300 font-bold border border-[#00E676]/30 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#00E676] hover:bg-[#00c864] text-[#061B14] font-black transition-all shadow-[0_0_15px_rgba(0,230,118,0.35)] cursor-pointer active:scale-95"
                  >
                    Confirm Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADD NEW CUSTOMER MODAL (REGULAR OR ONE-TIME)                              */}
        {/* ========================================================================= */}
        {showAddCustomerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0B251C] rounded-3xl p-6 w-full max-w-md border border-[#00E676]/40 shadow-[0_0_35px_rgba(0,230,118,0.15)] space-y-4 animate-in fade-in zoom-in-95 duration-150 text-white">
              <div className="flex items-center justify-between pb-2 border-b border-[#00E676]/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#061B14] text-[#00E676] border border-[#00E676]/30 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Add Customer Account</h3>
                    <p className="text-[11px] text-emerald-100/70">Register Regular profile or One-time credit</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddCustomerModal(false)}
                  className="p-1 text-neutral-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomerSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-neutral-300 mb-1">
                    Customer ID (Auto-generated or custom)
                  </label>
                  <input
                    type="text"
                    value={newCustId}
                    onChange={(e) => setNewCustId(e.target.value)}
                    placeholder="e.g. CUST-1005"
                    className="w-full px-3 py-2 bg-[#061B14] border border-[#00E676]/30 rounded-xl text-white font-mono focus:outline-none focus:border-[#00E676]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="e.g. Mohammad Rahim"
                    className="w-full px-3 py-2 bg-[#061B14] border border-[#00E676]/30 rounded-xl text-white focus:outline-none focus:border-[#00E676]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-300 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="e.g. 01711 000000"
                    className="w-full px-3 py-2 bg-[#061B14] border border-[#00E676]/30 rounded-xl text-white focus:outline-none focus:border-[#00E676]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-300 mb-1">Address (Optional)</label>
                  <input
                    type="text"
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    placeholder="e.g. Mirpur-10, Dhaka"
                    className="w-full px-3 py-2 bg-[#061B14] border border-[#00E676]/30 rounded-xl text-white focus:outline-none focus:border-[#00E676]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-300 mb-1">
                    Opening Due Balance (৳ Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newCustInitialDue}
                    onChange={(e) => setNewCustInitialDue(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-[#061B14] border border-[#00E676]/30 rounded-xl text-white font-mono focus:outline-none focus:border-[#00E676]"
                  />
                </div>

                {/* Account Type Selection */}
                <div className="pt-1">
                  <label className="block font-bold text-neutral-300 mb-1.5">Account Profile Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewCustIsOneTime(false)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        !newCustIsOneTime
                          ? 'bg-[#061B14] border-[#00E676] text-white font-bold shadow-[0_0_10px_rgba(0,230,118,0.2)]'
                          : 'bg-[#061B14]/50 border-[#00E676]/20 text-neutral-400'
                      }`}
                    >
                      <p className="text-xs text-[#00E676] font-bold">Regular Profile</p>
                      <p className="text-[10px] text-emerald-100/70 font-normal">Auto-merges repeated dues</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCustIsOneTime(true)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        newCustIsOneTime
                          ? 'bg-amber-950/80 border-amber-500 text-white font-bold shadow-[0_0_10px_rgba(251,191,36,0.2)]'
                          : 'bg-[#061B14]/50 border-[#00E676]/20 text-neutral-400'
                      }`}
                    >
                      <p className="text-xs text-amber-300 font-bold">One-time Due</p>
                      <p className="text-[10px] text-amber-100/70 font-normal">Temporary walk-in bill</p>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-[#00E676]/20">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerModal(false)}
                    className="flex-1 py-2.5 bg-[#061B14] hover:bg-[#0B251C] text-neutral-300 font-bold rounded-xl border border-[#00E676]/30 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#00E676] hover:bg-[#00c864] text-[#061B14] font-black rounded-xl shadow-[0_0_15px_rgba(0,230,118,0.35)] transition-all cursor-pointer active:scale-95"
                  >
                    Save Customer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PRINT MODALS */}
        {previewSale && (
          <PrintableInvoiceModal
            sale={previewSale}
            onClose={() => setPreviewSale(null)}
            isOpen={true}
          />
        )}

        {customerToPrintStatement && (
          <PrintableStatementModal
            customer={customerToPrintStatement}
            sales={getCustomerSales(customerToPrintStatement)}
            onClose={() => setCustomerToPrintStatement(null)}
          />
        )}
      </div>
    </div>
  );
};
