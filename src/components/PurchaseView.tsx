import React, { useState, useMemo, useEffect, useRef, useDeferredValue } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { Medicine, PurchaseOrder, Supplier } from '../types';
import { filterMedicinesForSales } from './SalesSearchBar';
import {
  ArrowLeft,
  Search,
  ScanBarcode,
  Plus,
  Trash2,
  Package,
  Minus,
  CheckCircle2,
  Printer,
  Calendar,
  AlertCircle,
  Building2,
  FileText,
  Edit3,
  RefreshCw,
  Percent,
  Truck,
  Check,
  X,
  Sparkles,
  ShoppingBag,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Info,
  PackageCheck,
  History,
  Eye,
  Receipt,
  Save,
  RotateCcw,
  FileCode,
  Upload,
  CheckCircle,
} from 'lucide-react';
import { AddBrandModal } from './AddBrandModal';
import { MedicinePurchaseModal } from './MedicinePurchaseModal';
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
  safeLocalStorageRemove,
} from '../utils/persistentStorage';

const DEFAULT_SAMPLE_INVOICE_JSON = `{
  "invoiceNo": "INV-20260921-7755",
  "purchaseDate": "2026-09-21",
  "timestamp": "2026-09-21T23:37:00Z",
  "supplier": "MediHealth Wholesalers Inc.",
  "totalAmount": 130.00,
  "paidAmount": 130.00,
  "paymentStatus": "Paid",
  "items": [
    {
      "name": "Azithromycin 500mg",
      "quantity": 20,
      "unitPrice": 6.50,
      "lineTotal": 130.00,
      "batchNo": "AZT-2024-19",
      "expireDate": "2026-10-10"
    }
  ]
}`;

interface PurchaseItemState {
  medicine: Medicine;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  batchNumber: string;
  expiryDate: string;
}

interface PurchaseOrderDraft {
  selectedSupplierId?: string;
  invoiceNumber?: string;
  purchaseItems?: PurchaseItemState[];
  discountType?: 'percent' | 'fixed';
  discountValue?: string;
  paymentStatus?: 'Paid' | 'Partial' | 'Due';
  customPaidAmount?: string;
  savedAt?: string;
}

const STORAGE_KEY_PURCHASE_DRAFT = 'pharmapulse_purchase_order_draft_v1';

interface PurchaseViewProps {
  onBack: () => void;
  onGoHome?: () => void;
  onNavigateToHistory?: () => void;
}

export const PurchaseView: React.FC<PurchaseViewProps> = ({ onBack, onGoHome, onNavigateToHistory }) => {
  const { medicines, suppliers, addSupplier, recordPurchase, lowStockMedicines, purchaseOrders } = usePharmacy();

  // Read saved draft from local storage (if any)
  const initialDraft = useMemo<PurchaseOrderDraft | null>(() => {
    return safeLocalStorageGet<PurchaseOrderDraft | null>(STORAGE_KEY_PURCHASE_DRAFT, null);
  }, []);

  // 1. Supplier & Order Header State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(() => {
    return initialDraft?.selectedSupplierId || suppliers[0]?.id || 'sup-sq-01';
  });
  const [invoiceNumber, setInvoiceNumber] = useState<string>(() => {
    if (initialDraft?.invoiceNumber) return initialDraft.invoiceNumber;
    const today = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = Math.floor(1000 + Math.random() * 9000);
    return `INV-${datePart}-${randPart}`;
  });
  const [isEditingInvoice, setIsEditingInvoice] = useState<boolean>(false);

  // Quick Add Supplier Modal State
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [newSupplierAddress, setNewSupplierAddress] = useState('');

  // 2. Search, Barcode & Restock State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const deferredSearch = useDeferredValue(debouncedSearch);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Barcode Scanner Modal State
  const [showBarcodeScannerModal, setShowBarcodeScannerModal] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeScanFeedback, setBarcodeScanFeedback] = useState<string | null>(null);

  // 3. Purchase Cart / Item List State
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItemState[]>(() => {
    if (initialDraft && Array.isArray(initialDraft.purchaseItems)) {
      return initialDraft.purchaseItems;
    }
    return [];
  });

  // Modals for editing/adding products
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedMedicineForModal, setSelectedMedicineForModal] = useState<Medicine | null>(null);
  const [modalInitialQty, setModalInitialQty] = useState<number>(10);
  const [modalInitialCost, setModalInitialCost] = useState<number | undefined>(undefined);
  const [modalInitialSell, setModalInitialSell] = useState<number | undefined>(undefined);

  // 4. Sticky Summary & Payment Breakdown State
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>(() => {
    return initialDraft?.discountType || 'percent';
  });
  const [discountValue, setDiscountValue] = useState<string>(() => {
    return initialDraft?.discountValue || '0';
  });
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Partial' | 'Due'>(() => {
    return initialDraft?.paymentStatus || 'Paid';
  });
  const [customPaidAmount, setCustomPaidAmount] = useState<string>(() => {
    return initialDraft?.customPaidAmount || '';
  });

  // Draft auto-save tracking
  const [draftSavedTime, setDraftSavedTime] = useState<string | null>(() => {
    if (initialDraft?.savedAt) {
      try {
        return new Date(initialDraft.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        return null;
      }
    }
    return null;
  });

  // Success Confirmation Modal
  const [completedPO, setCompletedPO] = useState<PurchaseOrder | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Recent Orders Drawer State
  const [showRecentOrdersDrawer, setShowRecentOrdersDrawer] = useState<boolean>(false);
  const [selectedOrderForPreview, setSelectedOrderForPreview] = useState<PurchaseOrder | null>(null);

  // JSON Invoice Import Modal State
  const [showImportJsonModal, setShowImportJsonModal] = useState<boolean>(false);
  const [jsonInputText, setJsonInputText] = useState<string>(DEFAULT_SAMPLE_INVOICE_JSON);
  const [jsonErrorMessage, setJsonErrorMessage] = useState<string | null>(null);

  // Parsed invoice computation
  const parsedInvoice = useMemo(() => {
    if (!jsonInputText.trim()) return null;
    try {
      const obj = JSON.parse(jsonInputText);
      const invoiceNo = String(obj.invoiceNo || obj.invoiceNumber || obj.poNumber || obj.memoNo || '').trim();
      const supplierName = String(obj.supplier || obj.supplierName || 'MediHealth Wholesalers Inc.').trim();
      const totalAmount = Number(obj.totalAmount || obj.total || 0);
      const paidAmount = Number(obj.paidAmount !== undefined ? obj.paidAmount : totalAmount);
      const paymentStatus: 'Paid' | 'Partial' | 'Due' =
        obj.paymentStatus === 'Due' ? 'Due' : obj.paymentStatus === 'Partial' ? 'Partial' : 'Paid';
      const itemsRaw = Array.isArray(obj.items) ? obj.items : [];
      const items = itemsRaw.map((it: any) => ({
        name: String(it.name || it.medicineName || 'Medicine Item').trim(),
        quantity: Math.max(1, Number(it.quantity || it.qty || 1)),
        unitPrice: Math.max(0, Number(it.unitPrice || it.purchasePrice || it.price || 0)),
        lineTotal: Math.max(
          0,
          Number(it.lineTotal || Number(it.quantity || 1) * Number(it.unitPrice || it.purchasePrice || 0))
        ),
        batchNo: String(it.batchNo || it.batchNumber || 'AZT-2024-19').trim(),
        expireDate: String(it.expireDate || it.expiryDate || '2026-10-10').trim(),
      }));

      return {
        invoiceNo: invoiceNo || `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-7755`,
        supplierName,
        totalAmount,
        paidAmount,
        paymentStatus,
        purchaseDate: obj.purchaseDate || obj.timestamp || new Date().toISOString(),
        items,
      };
    } catch {
      return null;
    }
  }, [jsonInputText]);

  // Load parsed invoice into purchase form
  const handleLoadInvoiceToForm = () => {
    if (!parsedInvoice) {
      setJsonErrorMessage('Please provide valid JSON format for the invoice.');
      return;
    }

    setInvoiceNumber(parsedInvoice.invoiceNo);

    const matchedSup = suppliers.find(
      (s) => s.name.toLowerCase() === parsedInvoice.supplierName.toLowerCase()
    );
    if (matchedSup) {
      setSelectedSupplierId(matchedSup.id);
    } else {
      addSupplier({
        name: parsedInvoice.supplierName,
        contactPerson: 'Wholesale Rep',
        phone: '+1 (800) 555-0199',
        email: 'orders@wholesaler.com',
        address: 'Wholesale Logistics Hub',
        medicinesSupplied: parsedInvoice.items.map((i) => i.name),
      });
    }

    const newItems: PurchaseItemState[] = parsedInvoice.items.map((item) => {
      const cleanItemName = item.name.toLowerCase();
      const existingMed = medicines.find(
        (m) =>
          m.name.toLowerCase() === cleanItemName ||
          m.name.toLowerCase().includes(cleanItemName) ||
          cleanItemName.includes(m.name.toLowerCase())
      );

      const baseMed: Medicine = existingMed || {
        id: `med-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: item.name,
        genericName: item.name,
        category: 'Tablet',
        batchNumber: item.batchNo,
        manufacturer: parsedInvoice.supplierName,
        expiryDate: item.expireDate,
        purchasePrice: item.unitPrice,
        sellingPrice: Number((item.unitPrice * 1.5).toFixed(2)),
        stockQuantity: 0,
        minStockThreshold: 15,
        shelfLocation: 'Shelf A-1',
        dosage: '500mg',
        unit: 'Strip',
      };

      return {
        medicine: baseMed,
        quantity: item.quantity,
        purchasePrice: item.unitPrice,
        sellingPrice: baseMed.sellingPrice,
        batchNumber: item.batchNo || baseMed.batchNumber,
        expiryDate: item.expireDate || baseMed.expiryDate,
      };
    });

    setPurchaseItems(newItems);
    setPaymentStatus(parsedInvoice.paymentStatus);
    setCustomPaidAmount(String(parsedInvoice.paidAmount));
    setShowImportJsonModal(false);
    setJsonErrorMessage(null);
  };

  // Directly record parsed invoice to persistent store
  const handleDirectRecordInvoice = () => {
    if (!parsedInvoice) {
      setJsonErrorMessage('Please provide valid JSON format for the invoice.');
      return;
    }

    let supId = selectedSupplierId;
    let supName = parsedInvoice.supplierName;
    const matchedSup = suppliers.find(
      (s) => s.name.toLowerCase() === parsedInvoice.supplierName.toLowerCase()
    );
    if (matchedSup) {
      supId = matchedSup.id;
      supName = matchedSup.name;
    } else {
      addSupplier({
        name: parsedInvoice.supplierName,
        contactPerson: 'Wholesale Rep',
        phone: '+1 (800) 555-0199',
        email: 'orders@wholesaler.com',
        address: 'Wholesale Logistics Hub',
        medicinesSupplied: parsedInvoice.items.map((i) => i.name),
      });
    }

    const payloadItems = parsedInvoice.items.map((item) => {
      const cleanItemName = item.name.toLowerCase();
      const existingMed = medicines.find(
        (m) =>
          m.name.toLowerCase() === cleanItemName ||
          m.name.toLowerCase().includes(cleanItemName) ||
          cleanItemName.includes(m.name.toLowerCase())
      );
      const medId = existingMed ? existingMed.id : `med-${Date.now()}`;
      return {
        medicineId: medId,
        quantity: item.quantity,
        purchasePrice: item.unitPrice,
        sellingPrice: existingMed ? existingMed.sellingPrice : Number((item.unitPrice * 1.5).toFixed(2)),
        batchNumber: item.batchNo,
        expiryDate: item.expireDate,
      };
    });

    const res = recordPurchase({
      items: payloadItems,
      poNumber: parsedInvoice.invoiceNo,
      supplierId: supId,
      supplierName: supName,
      totalAmountOverride: parsedInvoice.totalAmount,
      paidAmount: parsedInvoice.paidAmount,
      notes: `Imported via Wholesale JSON • Invoice #${parsedInvoice.invoiceNo}`,
    });

    if (res.success && res.purchaseOrder) {
      setCompletedPO(res.purchaseOrder);
      setShowSuccessModal(true);
      setShowImportJsonModal(false);
      setJsonErrorMessage(null);
      safeLocalStorageRemove(STORAGE_KEY_PURCHASE_DRAFT);
      setPurchaseItems([]);
      setDiscountValue('0');
      setCustomPaidAmount('');
      setDraftSavedTime(null);
      handleRegenerateInvoice();
    }
  };

  // Auto-save draft to local storage on any changes with a light debounce
  const isFirstDraftRun = useRef(true);
  useEffect(() => {
    if (isFirstDraftRun.current) {
      isFirstDraftRun.current = false;
      return;
    }

    // If completely clear (no items, default discount, no custom paid amount), remove draft
    if (purchaseItems.length === 0 && (!discountValue || discountValue === '0') && !customPaidAmount) {
      safeLocalStorageRemove(STORAGE_KEY_PURCHASE_DRAFT);
      setDraftSavedTime(null);
      return;
    }

    const timer = setTimeout(() => {
      const now = new Date();
      const draft: PurchaseOrderDraft = {
        selectedSupplierId,
        invoiceNumber,
        purchaseItems,
        discountType,
        discountValue,
        paymentStatus,
        customPaidAmount,
        savedAt: now.toISOString(),
      };
      safeLocalStorageSet(STORAGE_KEY_PURCHASE_DRAFT, draft);
      setDraftSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 300);

    return () => clearTimeout(timer);
  }, [
    selectedSupplierId,
    invoiceNumber,
    purchaseItems,
    discountType,
    discountValue,
    paymentStatus,
    customPaidAmount,
  ]);

  // Synchronous immediate save on visibility change (switching tabs), window blur, or unmount
  useEffect(() => {
    const persistDraftImmediate = () => {
      if (purchaseItems.length > 0 || (discountValue && discountValue !== '0') || customPaidAmount) {
        const draft: PurchaseOrderDraft = {
          selectedSupplierId,
          invoiceNumber,
          purchaseItems,
          discountType,
          discountValue,
          paymentStatus,
          customPaidAmount,
          savedAt: new Date().toISOString(),
        };
        safeLocalStorageSet(STORAGE_KEY_PURCHASE_DRAFT, draft);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistDraftImmediate();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', persistDraftImmediate);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', persistDraftImmediate);
      persistDraftImmediate();
    };
  }, [
    selectedSupplierId,
    invoiceNumber,
    purchaseItems,
    discountType,
    discountValue,
    paymentStatus,
    customPaidAmount,
  ]);

  // Clear draft action handler
  const handleClearDraft = () => {
    safeLocalStorageRemove(STORAGE_KEY_PURCHASE_DRAFT);
    setPurchaseItems([]);
    setDiscountValue('0');
    setCustomPaidAmount('');
    setDraftSavedTime(null);
    handleRegenerateInvoice();
  };

  // Last 5 finalized purchase orders
  const recentFinalizedOrders = useMemo(() => {
    if (!purchaseOrders || purchaseOrders.length === 0) return [];
    return [...purchaseOrders]
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 5);
  }, [purchaseOrders]);

  // Ensure selected supplier is valid
  useEffect(() => {
    if (suppliers.length > 0 && !suppliers.some((s) => s.id === selectedSupplierId)) {
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [suppliers, selectedSupplierId]);

  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];
  }, [suppliers, selectedSupplierId]);

  // Regenerate auto Invoice / Memo No.
  const handleRegenerateInvoice = () => {
    const today = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = Math.floor(1000 + Math.random() * 9000);
    setInvoiceNumber(`INV-${datePart}-${randPart}`);
  };

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered search results for quick-add dropdown using normalized matching
  const searchResults = useMemo(() => {
    if (!deferredSearch.trim()) return [];
    return filterMedicinesForSales(medicines || [], deferredSearch).slice(0, 30);
  }, [medicines, deferredSearch]);

  // Open modal for a medicine with pre-filled details
  const handleOpenRestockModal = (
    med: Medicine,
    options?: { qty?: number; cost?: number; sell?: number }
  ) => {
    setSelectedMedicineForModal(med);
    setModalInitialQty(options?.qty ?? 10);
    setModalInitialCost(options?.cost ?? (med.purchasePrice || med.sellingPrice * 0.75));
    setModalInitialSell(options?.sell ?? med.sellingPrice);
    setShowItemModal(true);
    setSearchTerm('');
    setIsSearchFocused(false);
  };

  // Save / Update item from modal into purchase order cart
  const handleSaveItemFromModal = (data: {
    medicine: Medicine;
    quantity: number;
    purchaseUnitPrice: number;
    salesUnitPrice: number;
    batchNumber: string;
    expiryDate: string;
  }) => {
    setPurchaseItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.medicine.id === data.medicine.id);
      const newEntry: PurchaseItemState = {
        medicine: data.medicine,
        quantity: data.quantity,
        purchasePrice: data.purchaseUnitPrice,
        sellingPrice: data.salesUnitPrice,
        batchNumber: data.batchNumber,
        expiryDate: data.expiryDate,
      };

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = newEntry;
        return updated;
      }
      return [newEntry, ...prev];
    });

    setShowItemModal(false);
    setSelectedMedicineForModal(null);
  };

  // Quantity adjustments in cart table
  const handleUpdateItemQty = (medicineId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(medicineId);
      return;
    }
    setPurchaseItems((prev) =>
      prev.map((item) =>
        item.medicine.id === medicineId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const handleRemoveItem = (medicineId: string) => {
    setPurchaseItems((prev) => prev.filter((item) => item.medicine.id !== medicineId));
  };

  // Calculate Financials: Total TP, Discount, Net Payable
  const totalTradePrice = useMemo(() => {
    return purchaseItems.reduce(
      (sum, item) => sum + item.quantity * item.purchasePrice,
      0
    );
  }, [purchaseItems]);

  const discountAmount = useMemo(() => {
    const rawVal = parseFloat(discountValue) || 0;
    if (rawVal <= 0) return 0;
    if (discountType === 'percent') {
      return (totalTradePrice * Math.min(100, rawVal)) / 100;
    }
    return Math.min(totalTradePrice, rawVal);
  }, [totalTradePrice, discountType, discountValue]);

  const netPayable = useMemo(() => {
    return Math.max(0, totalTradePrice - discountAmount);
  }, [totalTradePrice, discountAmount]);

  // Compute Paid and Due amounts
  const computedPaidAmount = useMemo(() => {
    if (paymentStatus === 'Paid') return netPayable;
    if (paymentStatus === 'Due') return 0;
    // Partial payment
    const entered = parseFloat(customPaidAmount);
    if (isNaN(entered) || entered <= 0) return 0;
    return Math.min(netPayable, entered);
  }, [paymentStatus, customPaidAmount, netPayable]);

  const remainingDue = useMemo(() => {
    return Math.max(0, netPayable - computedPaidAmount);
  }, [netPayable, computedPaidAmount]);

  // Barcode Scanner Lookup Logic
  const handleProcessBarcode = (code: string) => {
    const clean = code.trim().toLowerCase();
    if (!clean) return;

    // Find medicine by barcode, or ID, or batch, or exact name
    const found = medicines.find(
      (m) =>
        (m.barcode && m.barcode.toLowerCase() === clean) ||
        m.id.toLowerCase() === clean ||
        (m.batchNumber && m.batchNumber.toLowerCase() === clean) ||
        m.name.toLowerCase() === clean
    );

    if (found) {
      setBarcodeScanFeedback(`Found: ${found.name}`);
      setTimeout(() => {
        setShowBarcodeScannerModal(false);
        setBarcodeInput('');
        setBarcodeScanFeedback(null);
        handleOpenRestockModal(found);
      }, 350);
    } else {
      setBarcodeScanFeedback(`No item found for code "${clean}". Try another.`);
    }
  };

  // Execute Purchase Order
  const handleCompletePurchase = () => {
    setPurchaseError(null);

    if (purchaseItems.length === 0) {
      setPurchaseError('Please add at least one medicine to the purchase order.');
      return;
    }

    if (!selectedSupplier) {
      setPurchaseError('Please select a supplier / wholesaler.');
      return;
    }

    const payload = {
      items: purchaseItems.map((item) => ({
        medicineId: item.medicine.id,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        sellingPrice: item.sellingPrice,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
      })),
      poNumber: invoiceNumber.trim(),
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      totalAmountOverride: netPayable,
      paidAmount: computedPaidAmount,
      notes: `Memo No: ${invoiceNumber} • Extra Discount: ৳${discountAmount.toFixed(2)}`,
    };

    const res = recordPurchase(payload);

    if (res.success && res.purchaseOrder) {
      safeLocalStorageRemove(STORAGE_KEY_PURCHASE_DRAFT);
      setDraftSavedTime(null);
      setCompletedPO(res.purchaseOrder);
      setShowSuccessModal(true);
      setPurchaseItems([]);
      setDiscountValue('0');
      setCustomPaidAmount('');
      handleRegenerateInvoice();
    } else {
      setPurchaseError(res.error || 'Failed to process purchase order. Please check inputs.');
    }
  };

  // Quick Add Supplier Form Submit
  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;

    const newSupData: Omit<Supplier, 'id' | 'dueBalance'> = {
      name: newSupplierName.trim(),
      contactPerson: newSupplierContact.trim() || 'Distribution Executive',
      phone: newSupplierPhone.trim() || '+880 1700-000000',
      email: newSupplierEmail.trim() || `${newSupplierName.toLowerCase().replace(/\s+/g, '')}@pharma.com`,
      address: newSupplierAddress.trim() || 'Dhaka, Bangladesh',
      medicinesSupplied: [],
    };

    addSupplier(newSupData);
    setShowAddSupplierModal(false);
    setNewSupplierName('');
    setNewSupplierContact('');
    setNewSupplierPhone('');
    setNewSupplierEmail('');
    setNewSupplierAddress('');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 flex flex-col items-center select-none font-sans pb-36">
      {/* Main Container */}
      <div className="w-full max-w-5xl px-3 sm:px-6 py-4 sm:py-6 space-y-5">
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER & SUPPLIER SELECTION CARD                                  */}
        {/* ========================================================================= */}
        <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222222] pb-3.5">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-xl bg-[#1a1a1a] hover:bg-[#252525] active:scale-95 text-white border border-[#2e2e2e] flex items-center justify-center transition-all shadow-xs cursor-pointer"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Purchase &amp; Restock Order</span>
                  <span className="hidden sm:inline-flex text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
                    Wholesale B2B
                  </span>
                </h1>
                <p className="text-xs text-neutral-400">
                  Select supplier, verify trade price (TP), and update stock inventory
                </p>
              </div>
            </div>

            {/* Header Right Badges: Draft Auto-Save Status & Date */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Purchase History Button */}
              {onNavigateToHistory && (
                <button
                  type="button"
                  id="btn-nav-purchase-history-top"
                  onClick={onNavigateToHistory}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-[#181818] hover:bg-[#222] border border-[#333] text-neutral-200 hover:text-white px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
                  title="View Purchase History & Invoices"
                >
                  <History className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Purchase History</span>
                  {purchaseOrders.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 font-mono border border-emerald-800">
                      {purchaseOrders.length}
                    </span>
                  )}
                </button>
              )}

              {/* Import JSON Invoice Button */}
              <button
                type="button"
                id="btn-open-import-json"
                onClick={() => {
                  setShowImportJsonModal(true);
                  if (!jsonInputText.trim()) {
                    setJsonInputText(DEFAULT_SAMPLE_INVOICE_JSON);
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-300 hover:text-white px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
                title="Paste or import wholesale purchase invoice JSON"
              >
                <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>Import JSON Invoice</span>
              </button>

              {draftSavedTime && (
                <div
                  id="draft-autosave-indicator"
                  className="flex items-center gap-1.5 text-xs font-mono bg-emerald-950/40 border border-emerald-800/50 px-3 py-1.5 rounded-xl text-emerald-300 transition-all"
                  title="Your order changes are automatically saved to local storage so you won't lose items when switching tabs."
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Draft saved {draftSavedTime}</span>
                </div>
              )}

              {/* Date / Time Badge */}
              <div className="flex items-center gap-2 text-xs font-mono bg-[#181818] border border-[#282828] px-3 py-1.5 rounded-xl text-neutral-300">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          {/* Supplier Selector & Invoice / Memo Header Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-1">
            {/* Supplier / Wholesaler Selector (7 cols on md) */}
            <div className="md:col-span-7 bg-[#161616] border border-[#262626] rounded-xl p-3.5 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>Select Supplier / Wholesaler:</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(true)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Supplier</span>
                </button>
              </div>

              {/* Selector Dropdown */}
              <div className="relative">
                <select
                  id="supplier-select"
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full bg-[#101010] text-white border border-[#333333] rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-hidden focus:border-emerald-500 transition-all appearance-none cursor-pointer pr-10"
                >
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name} {sup.dueBalance > 0 ? `(Due: ৳${sup.dueBalance.toFixed(0)})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Active Supplier Details Sub-Card */}
              {selectedSupplier && (
                <div className="pt-1 flex flex-wrap items-center justify-between text-[11px] text-neutral-400 gap-2 border-t border-[#202020]">
                  <span className="flex items-center gap-1 truncate">
                    <Truck className="w-3 h-3 text-neutral-500 shrink-0" />
                    <span>Contact: {selectedSupplier.contactPerson} ({selectedSupplier.phone})</span>
                  </span>
                  <span className="font-mono">
                    Ledger Due:{' '}
                    <span className={`font-bold ${selectedSupplier.dueBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      ৳{selectedSupplier.dueBalance.toFixed(2)}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Invoice / Memo No. Generator & Editor (5 cols on md) */}
            <div className="md:col-span-5 bg-[#161616] border border-[#262626] rounded-xl p-3.5 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-teal-400" />
                  <span>Invoice / Memo No:</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleRegenerateInvoice}
                    className="p-1 rounded-md bg-[#222222] hover:bg-[#2c2c2c] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    title="Generate New Memo Number"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportJsonModal(true);
                      if (!jsonInputText.trim()) {
                        setJsonInputText(DEFAULT_SAMPLE_INVOICE_JSON);
                      }
                    }}
                    className="p-1 rounded-md bg-[#222222] hover:bg-[#2c2c2c] text-emerald-400 hover:text-white transition-colors cursor-pointer"
                    title="Import JSON Invoice"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingInvoice(!isEditingInvoice)}
                    className="p-1 rounded-md bg-[#222222] hover:bg-[#2c2c2c] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    title="Manual Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Memo Input */}
              <div className="relative">
                <input
                  id="invoice-memo-input"
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. SQ-2026-9812"
                  className="w-full bg-[#101010] text-white border border-[#333333] rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold focus:outline-hidden focus:border-teal-500 transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-500 uppercase tracking-wider font-semibold pointer-events-none">
                  {isEditingInvoice ? 'Manual' : 'Auto'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-[#202020]">
                <span>Vendor Receipt Ref</span>
                <span className="text-teal-400/80 font-medium">Editable for custom challan #</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SMART RESTOCK & QUICK ADD SECTION                                     */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          {/* Search Bar with Barcode Scanner Icon & Add Brand (+) */}
          <div ref={searchContainerRef} className="relative z-30">
            <div className="flex items-center gap-2">
              {/* Search Field with Barcode Scanner Icon Button */}
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                <input
                  id="purchase-search-input"
                  ref={searchInputRef}
                  type="search"
                  enterKeyHint="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchResults.length > 0) {
                      e.preventDefault();
                      handleOpenRestockModal(searchResults[0]);
                    }
                  }}
                  placeholder="Search medicine by Brand (Atova), Generic, or scan barcode..."
                  className="w-full bg-[#121212] text-white placeholder-neutral-500 rounded-2xl border border-[#282828] pl-11 pr-24 py-3.5 text-sm focus:outline-hidden focus:border-emerald-500 font-medium transition-all shadow-inner [&::-webkit-search-cancel-button]:hidden"
                  autoComplete="off"
                />

                {/* Right actions: Clear button + Barcode Scanner Trigger */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="w-7 h-7 rounded-lg text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                      title="Clear"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* Barcode Scanner Icon Button */}
                  <button
                    type="button"
                    id="btn-barcode-scanner"
                    onClick={() => setShowBarcodeScannerModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                    title="Scan Barcode for Fast Stock Entry"
                  >
                    <ScanBarcode className="w-4 h-4" />
                    <span className="hidden sm:inline text-[11px]">Scan</span>
                  </button>
                </div>
              </div>

              {/* Add Brand / New Product Button [+] */}
              <button
                type="button"
                id="btn-add-brand"
                onClick={() => setShowAddBrandModal(true)}
                className="w-12 h-12 rounded-2xl bg-[#161616] hover:bg-[#202020] active:scale-95 border border-[#2e2e2e] flex items-center justify-center text-white transition-all shrink-0 shadow-md cursor-pointer group"
                title="Create New Brand / Medicine"
              >
                <Plus className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* Live Autocomplete Search Dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-14 mt-2 bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-2xl z-40 max-h-80 overflow-y-auto p-2.5">
                <div className="p-2 mb-2 text-[11px] text-neutral-400 bg-[#0e0e0e] border border-[#222] rounded-lg px-3 font-semibold flex items-center justify-between">
                  <span>Tap medicine to configure restock:</span>
                  <span className="text-[10px] text-emerald-400 font-mono">{searchResults.length} matches</span>
                </div>
                {searchResults.map((med, idx) => {
                  const estCost = med.purchasePrice || med.sellingPrice * 0.75;
                  const isOutOfStock = (med.stockQuantity || 0) <= 0;
                  const isLowStock = (med.stockQuantity || 0) > 0 && (med.stockQuantity || 0) <= (med.minStockThreshold || 15);
                  return (
                    <button
                      key={`${med.id}-${idx}`}
                      type="button"
                      onClick={() => handleOpenRestockModal(med)}
                      className="w-full flex flex-col gap-1 p-3 mb-2 rounded-lg bg-gray-800/50 hover:bg-gray-800/80 border border-gray-700/60 hover:border-emerald-500/40 text-left transition-all cursor-pointer last:mb-0 shadow-xs"
                    >
                      {/* Top Row: Title, Strength/Dosage, MRP / Restock Action */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center flex-wrap gap-1.5 min-w-0">
                          <span className="font-bold text-sm text-white leading-snug">
                            {med.name}
                          </span>
                          {(med.strength || med.category) && (
                            <span className="inline-flex items-center text-[10px] leading-none px-2 py-0.5 rounded-md bg-teal-900/60 text-teal-200 border border-teal-700/50 font-mono font-medium shrink-0">
                              {med.strength || med.category}
                            </span>
                          )}
                        </div>

                        <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold leading-tight transition-all shrink-0">
                          + Restock
                        </span>
                      </div>

                      {/* Middle Row: Generic Name & Manufacturer */}
                      <div className="text-xs leading-normal text-emerald-400/90 font-medium">
                        {med.genericName || 'N/A'}
                        {med.manufacturer && (
                          <span className="text-neutral-400 text-[11px] ml-1.5">({med.manufacturer})</span>
                        )}
                      </div>

                      {/* Bottom Row: Stock Badge & Pricing */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-700/40 mt-0.5 text-[11px]">
                        <div className="flex items-center gap-2">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold leading-tight">
                              Stock: 0 (Out of Stock)
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold leading-tight">
                              Low Stock: {med.stockQuantity}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-medium leading-tight">
                              Stock: {med.stockQuantity ?? 0}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-neutral-300 font-mono text-[11px]">
                          <span>Cost (TP): <strong className="text-emerald-400">৳{estCost.toFixed(2)}</strong></span>
                          <span className="text-neutral-500">•</span>
                          <span>MRP: ৳{med.sellingPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* LOW STOCK CHIPS (Directly Clickable to Open Restock Modal) */}
          {lowStockMedicines && lowStockMedicines.length > 0 && (
            <div className="bg-[#141414] border border-amber-900/40 rounded-2xl p-3.5 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Low Stock Urgent Alerts ({lowStockMedicines.length})</span>
                </div>
                <span className="text-[11px] text-neutral-400">Tap chip to restock instantly</span>
              </div>

              {/* Directly Clickable Medicine Chips */}
              <div className="flex flex-wrap gap-2 pt-0.5">
                {lowStockMedicines.slice(0, 8).map((med, idx) => (
                  <button
                    key={`low-chip-${med.id}-${idx}`}
                    type="button"
                    onClick={() => handleOpenRestockModal(med, { qty: 20 })}
                    className="px-3 py-1.5 rounded-xl bg-[#1c1a16] hover:bg-[#26221c] border border-amber-800/50 hover:border-amber-500/80 text-xs text-white flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 group"
                    title={`Tap to restock ${med.name}`}
                  >
                    <span className="font-semibold text-neutral-200 group-hover:text-white">
                      {med.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-800/60 font-bold">
                      {med.stockQuantity} left
                    </span>
                    <Plus className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-125 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error Notification */}
        {purchaseError && (
          <div className="p-3.5 bg-rose-950/80 border border-rose-600/70 rounded-2xl text-rose-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{purchaseError}</span>
            </div>
            <button
              onClick={() => setPurchaseError(null)}
              className="text-rose-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. PURCHASE CART / ITEM LIST TABLE                                       */}
        {/* ========================================================================= */}
        <div className="bg-[#121212] border border-[#222222] rounded-2xl overflow-hidden shadow-xl">
          {/* Table Header Bar */}
          <div className="p-4 bg-[#161616] border-b border-[#242424] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">
                Purchase Order Items{' '}
                <span className="text-xs font-mono font-normal text-neutral-400">
                  ({purchaseItems.length} {purchaseItems.length === 1 ? 'line' : 'lines'})
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2.5">
              {draftSavedTime && (
                <div
                  className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2.5 py-1 rounded-lg"
                  title="Changes saved automatically to local storage"
                >
                  <Save className="w-3 h-3 text-emerald-400" />
                  <span>Auto-saved {draftSavedTime}</span>
                </div>
              )}

              {purchaseItems.length > 0 && (
                <button
                  id="btn-clear-purchase-draft"
                  type="button"
                  onClick={handleClearDraft}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2.5 py-1 rounded-lg hover:bg-rose-950/30 transition-colors cursor-pointer flex items-center gap-1.5 border border-rose-900/30"
                  title="Clear draft and reset order"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Draft</span>
                </button>
              )}
            </div>
          </div>

          {/* If Cart is Empty */}
          {purchaseItems.length === 0 ? (
            <div className="p-10 text-center space-y-3 bg-[#0e0e0e]">
              <Package className="w-12 h-12 text-neutral-600 mx-auto stroke-1" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-neutral-300">Your Purchase Cart is Empty</h4>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Search medicines above, tap the Barcode Scanner icon, or tap any Low Stock alert chip to add restock items.
                </p>
              </div>
            </div>
          ) : (
            /* High-Density Dark Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[680px]">
                <thead>
                  <tr className="border-b border-[#242424] bg-[#141414] text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Medicine &amp; Generic</th>
                    <th className="py-3 px-3">Batch &amp; Expiry</th>
                    <th className="py-3 px-3 text-center">Buy Qty &amp; Unit Cost (TP)</th>
                    <th className="py-3 px-3 text-right">MRP / Margin</th>
                    <th className="py-3 px-4 text-right">Total (৳)</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e1e] text-xs">
                  {purchaseItems.map((item, idx) => {
                    const lineTotal = item.quantity * item.purchasePrice;
                    const marginPct =
                      item.purchasePrice > 0
                        ? (((item.sellingPrice - item.purchasePrice) / item.purchasePrice) * 100).toFixed(0)
                        : '0';

                    return (
                      <tr
                        key={`${item.medicine.id}-${idx}`}
                        className="hover:bg-[#181818] transition-colors group"
                      >
                        {/* 1. Medicine Name & Generic */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">
                            {item.medicine.name}
                          </div>
                          <div className="text-[11px] text-neutral-400 truncate max-w-xs">
                            {item.medicine.genericName || 'Generic formula'} •{' '}
                            {item.medicine.manufacturer}
                          </div>
                        </td>

                        {/* 2. Batch No & Expiry */}
                        <td className="py-3 px-3">
                          <div className="font-mono text-neutral-300 text-xs font-semibold">
                            {item.batchNumber || '—'}
                          </div>
                          <div className="text-[11px] text-teal-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-neutral-500" />
                            <span>Exp: {item.expiryDate || '—'}</span>
                          </div>
                        </td>

                        {/* 3. Buy Qty Stepper & Unit Cost */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1 bg-[#101010] border border-[#2e2e2e] rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(item.medicine.id, item.quantity - 1)}
                                className="w-6 h-6 rounded bg-[#1e1e1e] hover:bg-[#282828] text-neutral-200 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val)) handleUpdateItemQty(item.medicine.id, val);
                                }}
                                className="w-12 text-center text-xs font-bold font-mono text-white bg-transparent focus:outline-hidden"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(item.medicine.id, item.quantity + 1)}
                                className="w-6 h-6 rounded bg-[#1e1e1e] hover:bg-[#282828] text-neutral-200 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="text-[11px] text-neutral-400 font-mono">
                              @ ৳{item.purchasePrice.toFixed(2)}
                            </span>
                          </div>
                        </td>

                        {/* 4. MRP / Sale Price */}
                        <td className="py-3 px-3 text-right">
                          <div className="font-mono text-neutral-200 font-semibold">
                            ৳{item.sellingPrice.toFixed(2)}
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/40">
                            +{marginPct}% margin
                          </span>
                        </td>

                        {/* 5. Total Line Amount */}
                        <td className="py-3 px-4 text-right">
                          <span className="font-mono font-bold text-sm text-emerald-400">
                            ৳{lineTotal.toFixed(2)}
                          </span>
                        </td>

                        {/* 6. Action (Edit / Remove) */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMedicineForModal(item.medicine);
                                setModalInitialQty(item.quantity);
                                setModalInitialCost(item.purchasePrice);
                                setModalInitialSell(item.sellingPrice);
                                setShowItemModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-[#1e1e1e] hover:bg-[#282828] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                              title="Edit batch, price or expiry"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.medicine.id)}
                              className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/70 text-rose-400 hover:text-rose-200 transition-colors cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

        {/* Quick Help Guide */}
        <div className="text-xs text-neutral-500 flex items-center justify-between px-1">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-neutral-400" />
            Stock levels for each medicine update automatically upon order confirmation.
          </span>
          <span className="font-mono text-[11px]">Wholesale VAT &amp; Trade Pricing standard</span>
        </div>

        {/* ========================================================================= */}
        {/* 3.5 RECENT ORDERS DRAWER (LAST 5 FINALIZED PURCHASE ORDERS)              */}
        {/* ========================================================================= */}
        <div className="bg-[#121212] border border-[#242424] rounded-2xl overflow-hidden shadow-lg transition-all">
          {/* Drawer Header & Toggle Button */}
          <button
            type="button"
            id="toggle-recent-orders-drawer"
            onClick={() => setShowRecentOrdersDrawer((prev) => !prev)}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[#181818] active:bg-[#1c1c1c] transition-colors cursor-pointer text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <History className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white tracking-tight">Recent Orders</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#1e1e1e] border border-[#333] text-neutral-300">
                    Last {recentFinalizedOrders.length > 0 ? recentFinalizedOrders.length : '5'}
                  </span>
                  {recentFinalizedOrders.length > 0 && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                      <Check className="w-3 h-3" />
                      Finalized
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400">
                  Quick reference drawer for finalized wholesaler invoices, restocked products &amp; payment status
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-xs font-medium text-neutral-400 group-hover:text-neutral-200 transition-colors hidden sm:inline-block">
                {showRecentOrdersDrawer ? 'Hide Drawer' : 'Show Recent Orders'}
              </span>
              <div
                className={`w-7 h-7 rounded-lg bg-[#1a1a1a] border border-[#2e2e2e] flex items-center justify-center text-neutral-300 transition-transform duration-200 ${
                  showRecentOrdersDrawer ? 'rotate-180 text-emerald-400 border-emerald-500/30' : ''
                }`}
              >
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </button>

          {/* Drawer Content Body */}
          {showRecentOrdersDrawer && (
            <div className="border-t border-[#202020] bg-[#0c0c0c] p-3 sm:p-4 space-y-3 animate-in fade-in duration-200">
              {recentFinalizedOrders.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-[#181818] border border-[#282828] flex items-center justify-center mx-auto text-neutral-500">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-neutral-300">No finalized purchase orders recorded yet</p>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                    When you complete purchase orders from this screen, the last 5 records will automatically appear in this drawer for rapid reference.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#222]">
                  <table className="w-full text-left text-xs text-neutral-300">
                    <thead className="bg-[#141414] text-neutral-400 font-semibold border-b border-[#222] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Memo / PO #</th>
                        <th className="py-2.5 px-3">Supplier</th>
                        <th className="py-2.5 px-3">Order Date</th>
                        <th className="py-2.5 px-3">Restocked Items</th>
                        <th className="py-2.5 px-3 text-right">Total (৳)</th>
                        <th className="py-2.5 px-3 text-center">Payment</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e1e1e]">
                      {recentFinalizedOrders.map((po) => {
                        const itemsCount = po.items?.length || 0;
                        const itemsSummary = po.items
                          ?.map((it) => it.medicineName)
                          .filter(Boolean)
                          .slice(0, 2)
                          .join(', ');
                        const hasMore = itemsCount > 2;

                        return (
                          <tr key={po.id} className="hover:bg-[#161616] transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-white whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Receipt className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>{po.poNumber}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-neutral-200">
                                <Building2 className="w-3 h-3 text-neutral-500 shrink-0" />
                                <span className="font-medium truncate max-w-[140px]">{po.supplierName}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-neutral-400 font-mono text-[11px]">
                              {new Date(po.orderDate).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="text-neutral-300">
                                <span className="font-semibold text-white">
                                  {itemsCount} item{itemsCount !== 1 ? 's' : ''}
                                </span>
                                {itemsSummary && (
                                  <span className="text-neutral-400 text-[11px] ml-1.5 truncate inline-block max-w-[170px] align-bottom">
                                    ({itemsSummary}{hasMore ? '...' : ''})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                              ৳{po.totalAmount.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  po.paymentStatus === 'Paid'
                                    ? 'bg-emerald-950/70 border-emerald-800/60 text-emerald-400'
                                    : po.paymentStatus === 'Partial'
                                    ? 'bg-amber-950/70 border-amber-800/60 text-amber-400'
                                    : 'bg-rose-950/70 border-rose-800/60 text-rose-400'
                                }`}
                              >
                                {po.paymentStatus}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedOrderForPreview(po)}
                                className="px-2.5 py-1 rounded-lg bg-[#1c1c1c] hover:bg-[#282828] text-neutral-200 hover:text-white border border-[#303030] text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="View full order details & print receipt"
                              >
                                <Eye className="w-3 h-3 text-emerald-400" />
                                <span>Details</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. STICKY SUMMARY & PAYMENT BREAKDOWN (FLOATING BOTTOM PANEL)             */}
      {/* ========================================================================= */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-[#0d0d0d]/95 backdrop-blur-md border-t border-[#262626] shadow-2xl p-3 sm:p-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Financial Breakdown (Trade Price, Discount, Net Payable) */}
          <div className="flex flex-wrap items-center justify-between md:justify-start gap-4 sm:gap-6 flex-1">
            {/* Total Trade Price (TP) */}
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                Total Trade Price (TP)
              </span>
              <div className="text-sm sm:text-base font-bold font-mono text-white">
                ৳{totalTradePrice.toFixed(2)}
              </div>
            </div>

            {/* Extra Discount Input (% or BDT) */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                  Extra Discount
                </span>
                <div className="inline-flex rounded-md bg-[#1c1c1c] p-0.5 border border-[#303030]">
                  <button
                    type="button"
                    onClick={() => setDiscountType('percent')}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      discountType === 'percent' ? 'bg-emerald-600 text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      discountType === 'fixed' ? 'bg-emerald-600 text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    ৳
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  id="discount-input"
                  type="number"
                  min="0"
                  step="0.5"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-24 bg-[#141414] text-white font-mono text-xs font-bold px-2.5 py-1.5 rounded-lg border border-[#333333] focus:outline-hidden focus:border-emerald-500"
                  placeholder="0"
                />
                {discountAmount > 0 && (
                  <span className="text-[10px] text-emerald-400 font-mono ml-2">
                    (-৳{discountAmount.toFixed(2)})
                  </span>
                )}
              </div>
            </div>

            {/* Net Payable Amount */}
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Net Payable Amount
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-tight">
                ৳{netPayable.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Payment Status Segmented Control & Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Payment Status Toggle */}
            <div className="flex flex-col space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                Payment Status
              </span>
              <div className="inline-flex rounded-xl bg-[#181818] p-1 border border-[#2e2e2e]">
                <button
                  type="button"
                  id="btn-pay-full"
                  onClick={() => setPaymentStatus('Paid')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    paymentStatus === 'Paid'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Paid in Full
                </button>
                <button
                  type="button"
                  id="btn-pay-partial"
                  onClick={() => setPaymentStatus('Partial')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    paymentStatus === 'Partial'
                      ? 'bg-amber-600 text-white shadow-xs font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Partial
                </button>
                <button
                  type="button"
                  id="btn-pay-due"
                  onClick={() => setPaymentStatus('Due')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    paymentStatus === 'Due'
                      ? 'bg-rose-600 text-white shadow-xs font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Due / Credit
                </button>
              </div>

              {/* Partial Amount Input if selected */}
              {paymentStatus === 'Partial' && (
                <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                  <span className="text-[10px] text-neutral-400">Paid Now:</span>
                  <input
                    type="number"
                    min="0"
                    max={netPayable}
                    step="1"
                    value={customPaidAmount}
                    onChange={(e) => setCustomPaidAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-24 bg-[#141414] text-white font-mono text-xs px-2 py-1 rounded border border-amber-600/60 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-amber-400 font-mono">
                    Due: ৳{remainingDue.toFixed(2)}
                  </span>
                </div>
              )}

              {paymentStatus === 'Due' && (
                <span className="text-[10px] text-rose-400 font-mono">
                  Full ৳{netPayable.toFixed(2)} added to supplier due
                </span>
              )}
            </div>

            {/* Glowing Emerald Main Action Button */}
            <button
              type="button"
              id="btn-complete-purchase"
              onClick={handleCompletePurchase}
              disabled={purchaseItems.length === 0}
              className={`px-6 py-3.5 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg ${
                purchaseItems.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.38)] active:scale-[0.98]'
                  : 'bg-[#1c1c1c] text-neutral-500 border border-[#2a2a2a] cursor-not-allowed'
              }`}
            >
              <PackageCheck className="w-5 h-5 text-white" />
              <span>Complete Purchase &amp; Update Stock</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. MODALS & SUB-FLOWS                                                    */}
      {/* ========================================================================= */}

      {/* Barcode Scanner Modal */}
      {showBarcodeScannerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#141414] border border-[#2a2a2a] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#242424] pb-3">
              <div className="flex items-center gap-2 text-white font-bold">
                <ScanBarcode className="w-5 h-5 text-emerald-400" />
                <span>Barcode Fast Stock Scanner</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBarcodeScannerModal(false);
                  setBarcodeInput('');
                  setBarcodeScanFeedback(null);
                }}
                className="text-neutral-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scanner Visual Frame */}
            <div className="relative h-44 bg-[#0a0a0a] border border-dashed border-emerald-500/50 rounded-2xl flex flex-col items-center justify-center p-4 overflow-hidden">
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-400/80 shadow-[0_0_12px_#34d399] animate-pulse" />
              <ScanBarcode className="w-16 h-16 text-emerald-500/30 mb-2" />
              <p className="text-xs text-neutral-400 text-center relative z-10">
                Point hardware scanner or type barcode digits below:
              </p>
            </div>

            {/* Manual / USB Barcode Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessBarcode(barcodeInput);
              }}
              className="space-y-3"
            >
              <div className="relative">
                <input
                  id="barcode-scanner-field"
                  type="text"
                  autoFocus
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan or enter barcode / product name..."
                  className="w-full bg-[#0d0d0d] text-white border border-[#333333] rounded-xl px-4 py-3 text-sm font-mono focus:outline-hidden focus:border-emerald-400"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Lookup
                </button>
              </div>

              {barcodeScanFeedback && (
                <p className="text-xs text-amber-300 font-medium">{barcodeScanFeedback}</p>
              )}

              {/* Quick Sample Barcode Pills */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                  Quick test items:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {medicines.slice(0, 4).map((m) => (
                    <button
                      key={`sample-${m.id}`}
                      type="button"
                      onClick={() => handleProcessBarcode(m.barcode || m.name)}
                      className="text-[11px] px-2 py-1 rounded bg-[#202020] hover:bg-[#2a2a2a] text-neutral-300 font-mono transition-colors cursor-pointer"
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#141414] border border-[#2a2a2a] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#242424] pb-3">
              <div className="flex items-center gap-2 text-white font-bold">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <span>Add Wholesaler / Supplier</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="text-neutral-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="e.g. Square Pharmaceuticals Ltd."
                  className="w-full bg-[#0d0d0d] text-white border border-[#333] rounded-xl px-3.5 py-2.5 text-xs focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Contact Person</label>
                  <input
                    type="text"
                    value={newSupplierContact}
                    onChange={(e) => setNewSupplierContact(e.target.value)}
                    placeholder="Depot Manager"
                    className="w-full bg-[#0d0d0d] text-white border border-[#333] rounded-xl px-3.5 py-2.5 text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Phone Number</label>
                  <input
                    type="text"
                    value={newSupplierPhone}
                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                    placeholder="+880 1711-000000"
                    className="w-full bg-[#0d0d0d] text-white border border-[#333] rounded-xl px-3.5 py-2.5 text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Email (Optional)</label>
                <input
                  type="email"
                  value={newSupplierEmail}
                  onChange={(e) => setNewSupplierEmail(e.target.value)}
                  placeholder="orders@supplier.com"
                  className="w-full bg-[#0d0d0d] text-white border border-[#333] rounded-xl px-3.5 py-2.5 text-xs focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Address / Depot Location</label>
                <input
                  type="text"
                  value={newSupplierAddress}
                  onChange={(e) => setNewSupplierAddress(e.target.value)}
                  placeholder="Mohakhali C/A, Dhaka"
                  className="w-full bg-[#0d0d0d] text-white border border-[#333] rounded-xl px-3.5 py-2.5 text-xs focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#202020] text-neutral-300 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Brand / New Product Modal */}
      <AddBrandModal
        isOpen={showAddBrandModal}
        onClose={() => setShowAddBrandModal(false)}
        onGoHome={onGoHome}
        onProductAdded={(newProductName) => {
          setSearchTerm(newProductName);
        }}
      />

      {/* Medicine Purchase Item Detail Modal */}
      <MedicinePurchaseModal
        isOpen={showItemModal}
        medicine={selectedMedicineForModal}
        initialQuantity={modalInitialQty}
        initialPurchasePrice={modalInitialCost}
        initialSalesPrice={modalInitialSell}
        onClose={() => {
          setShowItemModal(false);
          setSelectedMedicineForModal(null);
        }}
        onSave={handleSaveItemFromModal}
      />

      {/* Purchase Completed Receipt / Confirmation Modal */}
      {showSuccessModal && completedPO && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#121212] border border-[#2a2a2a] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Purchase Order Completed!</h3>
              <p className="text-xs text-neutral-400">
                Inventory stock replenished and ledger updated.
              </p>
            </div>

            <div className="bg-[#0a0a0a] border border-[#222222] rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Invoice / Memo No:</span>
                <span className="font-mono font-bold text-white">{completedPO.poNumber}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Supplier:</span>
                <span className="font-semibold text-white">{completedPO.supplierName}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Products Restocked:</span>
                <span className="font-semibold text-white">
                  {completedPO.items.length} items
                </span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Net Total Amount:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ৳{completedPO.totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Paid Amount:</span>
                <span className="font-mono font-semibold text-white">
                  ৳{completedPO.paidAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Payment Status:</span>
                <span
                  className={`font-semibold ${
                    completedPO.paymentStatus === 'Paid'
                      ? 'text-emerald-400'
                      : completedPO.paymentStatus === 'Partial'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {completedPO.paymentStatus}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-3 bg-[#1e1e1e] hover:bg-[#262626] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors border border-[#333333] cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Purchase Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  setCompletedPO(null);
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-colors shadow-md cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Order Detail & Receipt Preview Modal */}
      {selectedOrderForPreview && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#121212] border border-[#2a2a2a] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#242424] pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Purchase Order Details</h3>
                  <p className="text-xs text-neutral-400 font-mono">{selectedOrderForPreview.poNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForPreview(null)}
                className="w-8 h-8 rounded-lg bg-[#1c1c1c] hover:bg-[#252525] text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Meta info summary grid */}
            <div className="bg-[#0c0c0c] border border-[#222] rounded-xl p-3 grid grid-cols-2 gap-2 text-xs shrink-0">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Supplier</span>
                <span className="text-white font-medium truncate block">{selectedOrderForPreview.supplierName}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Order Date</span>
                <span className="text-white font-mono">
                  {new Date(selectedOrderForPreview.orderDate).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Stock Status</span>
                <span className="text-emerald-400 font-medium">{selectedOrderForPreview.status}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Payment</span>
                <span
                  className={`font-semibold ${
                    selectedOrderForPreview.paymentStatus === 'Paid'
                      ? 'text-emerald-400'
                      : selectedOrderForPreview.paymentStatus === 'Partial'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {selectedOrderForPreview.paymentStatus} (Paid: ৳{selectedOrderForPreview.paidAmount.toFixed(2)})
                </span>
              </div>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[120px]">
              <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Restocked Items ({selectedOrderForPreview.items?.length || 0})
              </div>
              <div className="space-y-1.5">
                {selectedOrderForPreview.items?.map((it, idx) => (
                  <div
                    key={idx}
                    className="bg-[#161616] border border-[#242424] rounded-xl p-2.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{it.medicineName}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        Batch: {it.batchNumber || 'N/A'} • Exp: {it.expiryDate || 'N/A'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-400">
                        ৳{it.totalCost.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        {it.quantity} × ৳{it.purchasePrice.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary & Actions */}
            <div className="border-t border-[#222] pt-3 space-y-3 shrink-0">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400 font-medium">Grand Total</span>
                <span className="font-mono font-black text-base text-emerald-400">
                  ৳{selectedOrderForPreview.totalAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 bg-[#1e1e1e] hover:bg-[#282828] text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 border border-[#333] transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Memo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderForPreview(null)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs transition-colors shadow-md cursor-pointer text-center"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. IMPORT JSON PURCHASE INVOICE MODAL                                     */}
      {/* ========================================================================= */}
      {showImportJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#121212] border border-[#2a2a2a] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#242424] pb-3.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-950/70 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Import Purchase Invoice</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono">
                      JSON Direct
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Paste supplier invoice payload or upload .json to restock inventory
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportJsonModal(false);
                  setJsonErrorMessage(null);
                }}
                className="w-8 h-8 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Top Toolbar (Preload invoice INV-20260921-7755, file upload, clear) */}
            <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 bg-[#161616] p-2.5 rounded-xl border border-[#242424]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setJsonInputText(DEFAULT_SAMPLE_INVOICE_JSON)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/60 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Load invoice INV-20260921-7755 (MediHealth / Azithromycin 500mg)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Preload INV-20260921-7755</span>
                </button>

                <label className="px-2.5 py-1 rounded-lg bg-[#202020] hover:bg-[#282828] border border-[#303030] text-neutral-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-teal-400" />
                  <span>Upload .json</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const content = event.target?.result as string;
                          if (content) setJsonInputText(content);
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>
              </div>

              {jsonInputText && (
                <button
                  type="button"
                  onClick={() => setJsonInputText('')}
                  className="text-xs text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {/* JSON Textarea */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                  <span>Raw JSON Payload:</span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    Supports invoiceNo, supplier, items, totalAmount, paidAmount
                  </span>
                </label>
                <textarea
                  id="json-invoice-textarea"
                  value={jsonInputText}
                  onChange={(e) => {
                    setJsonInputText(e.target.value);
                    setJsonErrorMessage(null);
                  }}
                  rows={8}
                  placeholder={`{\n  "invoiceNo": "INV-20260921-7755",\n  "supplier": "MediHealth Wholesalers Inc.",\n  "totalAmount": 130.00,\n  "paidAmount": 130.00,\n  "paymentStatus": "Paid",\n  "items": [\n    {\n      "name": "Azithromycin 500mg",\n      "quantity": 20,\n      "unitPrice": 6.50,\n      "batchNo": "AZT-2024-19",\n      "expireDate": "2026-10-10"\n    }\n  ]\n}`}
                  className="w-full bg-[#0a0a0a] text-emerald-400 font-mono text-xs p-3.5 rounded-2xl border border-[#262626] focus:outline-hidden focus:border-emerald-500 leading-relaxed transition-all shadow-inner"
                />
              </div>

              {/* Error Notice (if any) */}
              {jsonErrorMessage && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{jsonErrorMessage}</span>
                </div>
              )}

              {/* Parsed Preview Card */}
              {parsedInvoice ? (
                <div className="bg-[#161616] border border-emerald-800/40 rounded-2xl p-3.5 space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-[#242424] pb-2">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                      <CheckCircle className="w-4 h-4" />
                      <span>Valid Invoice Payload Detected</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white bg-[#222] px-2 py-0.5 rounded-md">
                      {parsedInvoice.invoiceNo}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-[#101010] p-2 rounded-xl border border-[#222]">
                      <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Supplier</span>
                      <span className="font-semibold text-neutral-200 truncate block">
                        {parsedInvoice.supplierName}
                      </span>
                    </div>
                    <div className="bg-[#101010] p-2 rounded-xl border border-[#222]">
                      <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Total Bill</span>
                      <span className="font-mono font-bold text-emerald-400">
                        ৳{parsedInvoice.totalAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-[#101010] p-2 rounded-xl border border-[#222]">
                      <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Paid Amount</span>
                      <span className="font-mono font-bold text-teal-400">
                        ৳{parsedInvoice.paidAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-[#101010] p-2 rounded-xl border border-[#222]">
                      <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Status</span>
                      <span
                        className={`font-semibold ${
                          parsedInvoice.paymentStatus === 'Paid'
                            ? 'text-emerald-400'
                            : parsedInvoice.paymentStatus === 'Partial'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {parsedInvoice.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Restocked Items breakdown */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Restock Items ({parsedInvoice.items.length})
                    </span>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {parsedInvoice.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-[#0e0e0e] border border-[#222] text-xs"
                        >
                          <div>
                            <div className="font-semibold text-white">{it.name}</div>
                            <div className="text-[10px] text-neutral-400 font-mono">
                              Batch: {it.batchNo} • Exp: {it.expireDate}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-emerald-400">
                              ৳{it.lineTotal.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono">
                              {it.quantity} × ৳{it.unitPrice.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                jsonInputText.trim() && (
                  <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Incomplete JSON structure. Please verify syntax with curly braces and quotes.</span>
                  </div>
                )
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="border-t border-[#222] pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowImportJsonModal(false);
                  setJsonErrorMessage(null);
                }}
                className="py-2.5 px-4 rounded-xl bg-[#1a1a1a] hover:bg-[#222] text-neutral-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-load-json-to-form"
                  onClick={handleLoadInvoiceToForm}
                  disabled={!parsedInvoice}
                  className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    parsedInvoice
                      ? 'bg-[#202020] hover:bg-[#2a2a2a] text-white border border-[#3a3a3a]'
                      : 'bg-[#181818] text-neutral-600 border border-[#242424] cursor-not-allowed'
                  }`}
                  title="Populate current form fields with this invoice"
                >
                  <Receipt className="w-3.5 h-3.5 text-teal-400" />
                  <span>Load into Order Form</span>
                </button>

                <button
                  type="button"
                  id="btn-direct-record-json"
                  onClick={handleDirectRecordInvoice}
                  disabled={!parsedInvoice}
                  className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md ${
                    parsedInvoice
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                      : 'bg-[#181818] text-neutral-600 border border-[#242424] cursor-not-allowed'
                  }`}
                  title="Directly commit purchase to database and update stock inventory"
                >
                  <PackageCheck className="w-4 h-4 text-white" />
                  <span>Directly Record &amp; Restock</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
