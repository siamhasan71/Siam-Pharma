import React, { useState, useMemo, useRef, useEffect, useCallback, useDeferredValue } from 'react';
import { motion } from 'motion/react';
import { usePharmacy } from '../context/PharmacyContext';
import { Medicine, PaymentMethod } from '../types';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  CreditCard,
  Banknote,
  Smartphone,
  ShieldAlert,
  Printer,
  Sparkles,
  Percent,
  Wallet,
  BookOpen,
  Users,
  Check,
  MapPin,
  UserCheck,
  Keyboard,
} from 'lucide-react';
import { PrintableInvoiceModal } from './PrintableInvoiceModal';
import { QuantityNumpadModal } from './QuantityNumpadModal';
import { formatCurrency } from '../utils/formatters';
import { filterMedicinesForSales } from './SalesSearchBar';
import {
  matchMedicineSearch,
  normalizeMedicine,
} from '../db/pharmacyDb';

interface POSCartItemProps {
  item: { medicine: Medicine; quantity: number };
  index: number;
  onUpdateQuantity: (medicineId: string, quantity: number) => void;
  onRemove: (medicineId: string) => void;
  onOpenNumpad?: (medicine: Medicine, initialQty: number) => void;
}

const POSCartItem: React.FC<POSCartItemProps> = ({ item, index, onUpdateQuantity, onRemove, onOpenNumpad }) => {
  // State declaration
  const [quantity, setQuantity] = useState<number | ''>(item.quantity);

  useEffect(() => {
    setQuantity(item.quantity);
  }, [item.quantity]);

  // Handle Typing in Input Field
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string so user can clear and retype
    if (value === '') {
      setQuantity('');
      return;
    }
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setQuantity(parsed);
      if (parsed > 0) {
        onUpdateQuantity(item.medicine.id, Math.min(parsed, item.medicine.stockQuantity));
      }
    }
  };

  // Reset to minimum 1 when user clicks away
  const handleBlur = () => {
    if (quantity === '' || quantity < 1) {
      setQuantity(1);
      onUpdateQuantity(item.medicine.id, 1);
    }
  };

  // Increment / Decrement Handlers
  const handleIncrement = () => {
    const next = Math.min((Number(quantity) || 0) + 1, item.medicine.stockQuantity);
    setQuantity(next);
    onUpdateQuantity(item.medicine.id, next);
  };

  const handleDecrement = () => {
    const next = Math.max(1, (Number(quantity) || 1) - 1);
    setQuantity(next);
    onUpdateQuantity(item.medicine.id, next);
  };

  return (
    <div key={`${item.medicine.id}-${index}`} className="py-2.5 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-900 truncate">{item.medicine.name}</p>
        <p className="text-[11px] text-slate-500">
          {formatCurrency(item.medicine.sellingPrice)} each • Stock: {item.medicine.stockQuantity}
        </p>
      </div>

      {/* Quantity Stepper & On-Screen Numpad Trigger */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
        <button
          type="button"
          onClick={handleDecrement}
          className="p-1 hover:bg-white rounded text-slate-700 transition-colors cursor-pointer"
          title="Decrease"
        >
          <Minus className="w-3 h-3" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          value={quantity}
          onChange={handleQuantityChange}
          onFocus={(e) => e.target.select()}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="w-10 text-center text-xs font-bold font-mono text-slate-900 bg-transparent focus:outline-hidden focus:ring-1 focus:ring-emerald-500 rounded"
        />
        <button
          type="button"
          disabled={Number(quantity) >= item.medicine.stockQuantity}
          onClick={handleIncrement}
          className={`p-1 hover:bg-white rounded text-slate-700 transition-colors cursor-pointer ${
            Number(quantity) >= item.medicine.stockQuantity ? 'opacity-30 cursor-not-allowed' : ''
          }`}
          title="Increase"
        >
          <Plus className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => onOpenNumpad?.(item.medicine, Number(quantity) || 1)}
          className="p-1 hover:bg-white rounded text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer border-l border-slate-200"
          title="Open On-Screen Numpad"
        >
          <Keyboard className="w-3 h-3" />
        </button>
      </div>

      {/* Item Total */}
      <div className="text-right min-w-[60px]">
        <span className="text-xs font-bold text-slate-900">
          {formatCurrency((Number(quantity) || 0) * item.medicine.sellingPrice)}
        </span>
      </div>

      {/* Remove Button */}
      <button
        onClick={() => onRemove(item.medicine.id)}
        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

interface POSMedicineCardProps {
  medicine: Medicine;
  cartQty: number;
  todayStr: string;
  onSelect: (med: Medicine) => void;
}

const POSMedicineCard = React.memo<POSMedicineCardProps>(({
  medicine,
  cartQty,
  todayStr,
  onSelect,
}) => {
  const isExpired = medicine.expiryDate < todayStr;
  const isLowStock = medicine.stockQuantity <= medicine.minStockThreshold && medicine.stockQuantity > 0;
  const isOutOfStock = medicine.stockQuantity <= 0;
  const remainingStock = medicine.stockQuantity - cartQty;

  return (
    <div
      className={`bg-white rounded-xl p-3.5 border transition-all flex flex-col justify-between ${
        isExpired
          ? 'border-rose-200 bg-rose-50/30'
          : isOutOfStock
          ? 'border-slate-200 opacity-60'
          : 'border-slate-200 hover:border-emerald-300 hover:shadow-xs'
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-md">
            {medicine.category}
          </span>

          {isExpired ? (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-md flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Expired
            </span>
          ) : isOutOfStock ? (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-700 rounded-md">
              Out of Stock
            </span>
          ) : isLowStock ? (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-md">
              Low: {remainingStock} left
            </span>
          ) : (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-md">
              {remainingStock} available
            </span>
          )}
        </div>

        {/* Medicine Details */}
        <h3 className="font-bold text-slate-900 text-sm leading-snug">{medicine.name}</h3>
        <p className="text-xs text-slate-500 italic truncate" title={medicine.genericName}>
          {medicine.genericName}
        </p>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
          <span>Batch: {medicine.batchNumber}</span>
          <span>Exp: {medicine.expiryDate}</span>
        </div>
      </div>

      {/* Price & Add Action */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <div>
          <span className="text-base font-bold text-slate-900">
            {formatCurrency(medicine.sellingPrice)}
          </span>
          <span className="text-[10px] text-slate-400 block">per unit</span>
        </div>

        <button
          disabled={isExpired || remainingStock <= 0}
          onClick={() => onSelect(medicine)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isExpired || remainingStock <= 0
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer'
          }`}
          title="Add and set quantity"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
          {cartQty > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-emerald-800 text-[10px] rounded-full">
              {cartQty}
            </span>
          )}
        </button>
      </div>
    </div>
  );
});

export const POSBilling: React.FC = () => {
  const {
    medicines,
    cart,
    cartItems,
    setCartItems,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    cartDiscountPercent,
    setCartDiscountPercent,
    cartTaxRate,
    setCartTaxRate,
    selectedCustomerId,
    setSelectedCustomerId,
    customers,
    addCustomer,
    checkoutSale,
    currentUser,
  } = usePharmacy();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const deferredSearch = useDeferredValue(debouncedSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Dual Due System States
  const [dueType, setDueType] = useState<'regular' | 'onetime'>('regular');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [onetimeName, setOnetimeName] = useState('');
  const [onetimePhone, setOnetimePhone] = useState('');
  const [onetimeAddress, setOnetimeAddress] = useState('');
  const [downpayment, setDownpayment] = useState('0');

  // New Customer inline modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustId, setNewCustId] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustInitialDue, setNewCustInitialDue] = useState('0');
  const [newCustIsOneTime, setNewCustIsOneTime] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fast Quantity Entry & Soft Numpad Modal State
  const [isNumpadOpen, setIsNumpadOpen] = useState(false);
  const [activeNumpadMedicine, setActiveNumpadMedicine] = useState<Medicine | null>(null);
  const [numpadInitialQty, setNumpadInitialQty] = useState(1);

  // Auto-Focus & Keyboard Trigger on Item Tap
  const handleSelectMedicine = useCallback((medicine: Medicine) => {
    const existing = cart.find((i) => i.medicine.id === medicine.id);
    const startQty = existing ? existing.quantity : 1;
    if (!existing) {
      addToCart(medicine, 1);
    }
    setActiveNumpadMedicine(medicine);
    setNumpadInitialQty(startQty);
    setIsNumpadOpen(true);
  }, [cart, addToCart]);

  // Fast Checkout Flow: Confirm quantity, clear search, and refocus search input
  const handleConfirmNumpadQuantity = (quantity: number) => {
    if (activeNumpadMedicine) {
      updateCartQuantity(activeNumpadMedicine.id, quantity);
    }
    setIsNumpadOpen(false);
    setActiveNumpadMedicine(null);
    setSearchTerm('');
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 60);
  };

  const handleCloseNumpad = () => {
    setIsNumpadOpen(false);
    setActiveNumpadMedicine(null);
    setSearchTerm('');
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 60);
  };

  const categories = ['All', 'Tablet', 'Capsule', 'Syrup', 'Injection', 'Inhaler', 'Drops', 'Ointment'];

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Standard lightweight search filtering with useMemo directly on medicines React state
  const filteredMedicines = useMemo(() => {
    let list = medicines || [];
    if (selectedCategory && selectedCategory !== 'All') {
      list = list.filter((m) => m.category === selectedCategory);
    }
    if (!searchTerm.trim()) {
      return list.filter((item) => Number(item.stockQuantity) > 0).slice(0, 30);
    }
    return filterMedicinesForSales(list, searchTerm);
  }, [medicines, searchTerm, selectedCategory]);

  // Selected customer helper
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Searchable customer list for picker
  const searchableCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers.slice(0, 15);
    const q = customerSearchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.address && c.address.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [customers, customerSearchQuery]);

  // Cart financial calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.medicine.sellingPrice, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (subtotal * cartDiscountPercent) / 100;
  }, [subtotal, cartDiscountPercent]);

  const discountedSubtotal = subtotal - discountAmount;

  const taxAmount = useMemo(() => {
    return (discountedSubtotal * cartTaxRate) / 100;
  }, [discountedSubtotal, cartTaxRate]);

  const grandTotal = Number((discountedSubtotal + taxAmount).toFixed(2));

  // Cart total quantity tracking to trigger pulse/highlight animation when an item is added
  const totalCartQuantity = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const [isTotalPulsing, setIsTotalPulsing] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const prevCartQuantityRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevCartQuantityRef.current === null) {
      prevCartQuantityRef.current = totalCartQuantity;
      return;
    }

    // Only pulse when item(s) are added (quantity increased)
    if (totalCartQuantity > prevCartQuantityRef.current) {
      setIsTotalPulsing(true);
      setPulseKey((k) => k + 1);
      const timer = setTimeout(() => {
        setIsTotalPulsing(false);
      }, 750);
      prevCartQuantityRef.current = totalCartQuantity;
      return () => clearTimeout(timer);
    }

    prevCartQuantityRef.current = totalCartQuantity;
  }, [totalCartQuantity]);

  const tenderedNumber = parseFloat(amountTendered) || 0;
  const changeDue = Math.max(0, tenderedNumber - grandTotal);

  // Remaining due calculation for Due / Credit sales
  const downpaymentNumber = Math.max(0, parseFloat(downpayment) || 0);
  const remainingDue = Math.max(0, Number((grandTotal - downpaymentNumber).toFixed(2)));

  const handleCheckout = () => {
    setCheckoutError(null);
    if (cart.length === 0) {
      setCheckoutError('Please add medicines to cart before completing sale.');
      return;
    }

    const isDueSale = paymentMethod === 'Due / Credit';
    let finalTendered = 0;
    let resolvedPaidAmount = 0;
    let resolvedDueAmount = 0;
    let resolvedPaymentStatus: 'Full Paid' | 'Partial Paid' | 'Full Due' = 'Full Paid';
    let finalCustId: string | undefined = undefined;
    let finalCustName: string = 'Walk-in Customer';
    let finalCustPhone: string = 'N/A';
    let finalCustAddress: string | undefined = undefined;
    let isOneTime = false;

    if (isDueSale) {
      if (downpaymentNumber > grandTotal) {
        setCheckoutError(`Downpayment (${formatCurrency(downpaymentNumber)}) cannot exceed total bill (${formatCurrency(grandTotal)}).`);
        return;
      }

      if (dueType === 'regular') {
        if (!selectedCustomer) {
          setCheckoutError('Please select or register a Regular Customer to link this credit sale.');
          return;
        }
        finalCustId = selectedCustomer.id;
        finalCustName = selectedCustomer.name;
        finalCustPhone = selectedCustomer.phone;
        finalCustAddress = selectedCustomer.address;
        isOneTime = false;
      } else {
        if (!onetimeName.trim()) {
          setCheckoutError('Please enter Customer Name for this One-time Due entry.');
          return;
        }
        if (!onetimePhone.trim()) {
          setCheckoutError('Please enter Contact Phone Number for this One-time Due entry.');
          return;
        }
        finalCustName = onetimeName.trim();
        finalCustPhone = onetimePhone.trim();
        finalCustAddress = onetimeAddress.trim() || undefined;
        isOneTime = true;
      }

      resolvedPaidAmount = Number(downpaymentNumber.toFixed(2));
      resolvedDueAmount = remainingDue;
      finalTendered = resolvedPaidAmount;
      resolvedPaymentStatus = resolvedDueAmount <= 0.001 ? 'Full Paid' : resolvedPaidAmount > 0 ? 'Partial Paid' : 'Full Due';
    } else {
      if (paymentMethod === 'Cash' && tenderedNumber > 0 && tenderedNumber < grandTotal) {
        setCheckoutError(`Tendered amount (${formatCurrency(tenderedNumber)}) is less than total (${formatCurrency(grandTotal)}).`);
        return;
      }
      finalTendered = paymentMethod === 'Cash' && tenderedNumber > 0 ? tenderedNumber : grandTotal;
      resolvedPaidAmount = grandTotal;
      resolvedDueAmount = 0;
      resolvedPaymentStatus = 'Full Paid';
      if (selectedCustomer) {
        finalCustId = selectedCustomer.id;
        finalCustName = selectedCustomer.name;
        finalCustPhone = selectedCustomer.phone;
        finalCustAddress = selectedCustomer.address;
      }
    }

    const result = checkoutSale(paymentMethod, finalTendered, {
      customerId: finalCustId,
      customerName: finalCustName,
      customerPhone: finalCustPhone,
      customerAddress: finalCustAddress,
      paidAmount: resolvedPaidAmount,
      dueAmount: resolvedDueAmount,
      paymentStatus: resolvedPaymentStatus,
      isOneTimeDue: isOneTime,
    });

    if (result.success && result.sale) {
      setCartItems([]);
      clearCart();
      setCartDiscountPercent(0);
      setCompletedSale(result.sale);
      setAmountTendered('');
      setDownpayment('0');
      setOnetimeName('');
      setOnetimePhone('');
      setOnetimeAddress('');
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setCheckoutError(result.error || 'Failed to complete sale.');
    }
  };

  const handleOpenAddCustomer = () => {
    const nextSeq = 1000 + customers.length + 1;
    setNewCustId(`CUST-${nextSeq}`);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustEmail('');
    setNewCustInitialDue('0');
    setNewCustIsOneTime(false);
    setShowAddCustomerModal(true);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      setCheckoutError('Customer name and phone are required.');
      return;
    }

    const initDue = Math.max(0, parseFloat(newCustInitialDue) || 0);

    const created = addCustomer({
      id: newCustId.trim() || undefined,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim() || undefined,
      email: newCustEmail.trim() || undefined,
      dueAmount: initDue,
      isOneTime: newCustIsOneTime,
    });

    setSelectedCustomerId(created.id);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustEmail('');
    setNewCustInitialDue('0');
    setShowAddCustomerModal(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Point of Sale (POS) & Billing</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Fast barcode & generic search • Instant receipt generation • Live inventory sync
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-500">Active Cashier:</span>
            <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-medium transition-colors"
            >
              Clear Cart
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Medicine Catalog (Left) + Cart & Billing Register (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Search & Medicine Selection (7 Cols on desktop) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="pos-billing-search-input"
              ref={searchInputRef}
              type="search"
              enterKeyHint="next"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (filteredMedicines.length > 0 && searchTerm.trim()) {
                    e.preventDefault();
                    const firstAvail = filteredMedicines.find(m => m.stockQuantity > 0) || filteredMedicines[0];
                    handleSelectMedicine(firstAvail);
                    setSearchTerm('');
                  } else if (cart.length > 0) {
                    e.preventDefault();
                    const checkoutBtn = document.getElementById('pos-checkout-btn');
                    checkoutBtn?.scrollIntoView({ behavior: 'smooth' });
                    checkoutBtn?.focus();
                  }
                }
              }}
              placeholder="Search by Brand (Aro, Max, 360-ml) or Generics"
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-xs [&::-webkit-search-cancel-button]:hidden"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Medicine Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredMedicines.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-slate-200 p-6">
                <p className="text-sm font-semibold text-slate-700">No medicines found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Try searching for another generic formula or switch the category filter.
                </p>
              </div>
            ) : (
              filteredMedicines.map((medicine) => {
                const cartQty = cart.find((i) => i.medicine.id === medicine.id)?.quantity || 0;
                return (
                  <POSMedicineCard
                    key={medicine.id}
                    medicine={medicine}
                    cartQty={cartQty}
                    todayStr={todayStr}
                    onSelect={handleSelectMedicine}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: POS Cart & Checkout Register (5 Cols on desktop) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-20">
          {/* Cart Header */}
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="font-bold text-sm">Active Bill & Cart</h2>
                <p className="text-[11px] text-slate-400">{cart.length} item{cart.length !== 1 ? 's' : ''} in cart</p>
              </div>
            </div>

            {/* Customer Selector */}
            <div className="flex items-center gap-1.5">
              <div className="text-right">
                <select
                  value={selectedCustomerId || ''}
                  onChange={(e) => setSelectedCustomerId(e.target.value || null)}
                  className="bg-slate-800 text-slate-200 text-xs py-1.5 px-2 rounded-lg border border-slate-700 max-w-[140px] truncate focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id})
                    </option>
                  ))}
                </select>
                {selectedCustomer && (selectedCustomer.dueAmount || 0) > 0 && (
                  <div className="text-[10px] text-amber-400 font-bold mt-0.5">
                    Due: ৳{(selectedCustomer.dueAmount || 0).toFixed(2)}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleOpenAddCustomer}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
                title="Add New Customer Profile"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="p-4 max-h-[260px] overflow-y-auto divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-2 stroke-1" />
                <p className="text-sm font-semibold text-slate-700">No items added yet. Search or scan to add medicines.</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select medicines from the left to begin billing
                </p>
              </div>
            ) : (
              cart.map((item, index) => (
                <POSCartItem
                  key={`${item.medicine.id}-${index}`}
                  item={item}
                  index={index}
                  onUpdateQuantity={updateCartQuantity}
                  onRemove={removeFromCart}
                  onOpenNumpad={(med, qty) => {
                    setActiveNumpadMedicine(med);
                    setNumpadInitialQty(qty);
                    setIsNumpadOpen(true);
                  }}
                />
              ))
            )}
          </div>

          {/* Checkout Controls */}
          {cart.length > 0 && (
            <div className="p-4 bg-slate-50/80 border-t border-slate-200 space-y-3">
              {/* Discount & Tax Row */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Discount (%)</label>
                  <div className="flex items-center gap-1">
                    {[0, 5, 10].map((d) => (
                      <button
                        key={d}
                        onClick={() => setCartDiscountPercent(d)}
                        className={`flex-1 py-1 rounded text-[11px] font-semibold transition-colors ${
                          cartDiscountPercent === d
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {d}%
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-medium mb-1">Tax Rate</label>
                  <div className="flex items-center gap-1">
                    {[0, 5].map((t) => (
                      <button
                        key={t}
                        onClick={() => setCartTaxRate(t)}
                        className={`flex-1 py-1 rounded text-[11px] font-semibold transition-colors ${
                          cartTaxRate === t
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {t}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Financial Calculation summary */}
              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount ({cartDiscountPercent}%):</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax ({cartTaxRate}%):</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <div
                  id="pos-payable-total-row"
                  className={`flex justify-between items-center text-base font-bold pt-1.5 pb-1 px-2.5 -mx-1 rounded-xl border-t border-slate-200 transition-all duration-300 ${
                    isTotalPulsing
                      ? 'bg-emerald-50/90 text-emerald-900 ring-1 ring-emerald-400/50 shadow-xs'
                      : 'text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    Payable Total:
                    {isTotalPulsing && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full animate-pulse tracking-wide">
                        + Added
                      </span>
                    )}
                  </span>
                  <motion.span
                    id="pos-grand-total-display"
                    key={pulseKey}
                    animate={
                      isTotalPulsing
                        ? {
                            scale: [1, 1.15, 1],
                            color: ['#047857', '#059669', '#047857'],
                            textShadow: [
                              '0 0 0px rgba(16,185,129,0)',
                              '0 0 10px rgba(16,185,129,0.4)',
                              '0 0 0px rgba(16,185,129,0)',
                            ],
                          }
                        : { scale: 1 }
                    }
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="text-emerald-700 font-mono text-lg font-bold tracking-tight inline-block"
                  >
                    {formatCurrency(grandTotal)}
                  </motion.span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Cash', 'Credit/Debit Card', 'Digital / UPI', 'Insurance'] as PaymentMethod[]).map(
                    (method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                          paymentMethod === method
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {method === 'Cash' && <Banknote className="w-3.5 h-3.5" />}
                        {method === 'Credit/Debit Card' && <CreditCard className="w-3.5 h-3.5" />}
                        {method === 'Digital / UPI' && <Smartphone className="w-3.5 h-3.5" />}
                        {method === 'Insurance' && <ShieldAlert className="w-3.5 h-3.5" />}
                        <span className="truncate">{method}</span>
                      </button>
                    )
                  )}
                </div>

                {/* Due / Credit Sale Option */}
                <div className="mt-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Due / Credit')}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                      paymentMethod === 'Due / Credit'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-400/40'
                        : 'bg-amber-50/70 text-amber-900 border-amber-200 hover:bg-amber-100/80'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Due / Credit Sale (Customer Ledger)</span>
                  </button>
                </div>
              </div>

              {/* DUAL CUSTOMER DUE SYSTEM PANEL */}
              {paymentMethod === 'Due / Credit' && (
                <div className="p-3.5 bg-amber-50/60 border border-amber-200/90 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-amber-700" />
                      <span>Dual Customer Due System</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                      Credit Ledger
                    </span>
                  </div>

                  {/* Dual Mode Switcher */}
                  <div className="grid grid-cols-2 gap-1 bg-amber-100/60 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setDueType('regular')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        dueType === 'regular'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-amber-900 hover:text-slate-900'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Regular Customer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDueType('onetime');
                        setSelectedCustomerId(null);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        dueType === 'onetime'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-amber-900 hover:text-slate-900'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 text-amber-700" />
                      <span>One-time Due</span>
                    </button>
                  </div>

                  {/* Mode A: Regular Customer Picker */}
                  {dueType === 'regular' && (
                    <div className="space-y-2">
                      {selectedCustomer ? (
                        <div className="p-2.5 bg-white border border-amber-200 rounded-xl flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{selectedCustomer.name}</span>
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold rounded">
                                {selectedCustomer.id}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>📞 {selectedCustomer.phone}</span>
                              {selectedCustomer.address && <span>📍 {selectedCustomer.address}</span>}
                            </div>
                            <div className="text-[11px] font-bold text-amber-800 mt-1">
                              Existing Outstanding Due: {formatCurrency(selectedCustomer.dueAmount || 0)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedCustomerId(null)}
                            className="text-xs text-slate-500 hover:text-rose-600 font-semibold underline ml-2"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <label className="font-semibold text-slate-700">Select Regular Customer Account *</label>
                            <button
                              type="button"
                              onClick={handleOpenAddCustomer}
                              className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Register Profile
                            </button>
                          </div>
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search by Customer ID, Name, or Phone..."
                              value={customerSearchQuery}
                              onChange={(e) => {
                                setCustomerSearchQuery(e.target.value);
                                setShowCustomerPicker(true);
                              }}
                              onFocus={() => setShowCustomerPicker(true)}
                              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                            {showCustomerPicker && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-30 p-1 divide-y divide-slate-100">
                                {searchableCustomers.length === 0 ? (
                                  <div className="p-2 text-center text-xs text-slate-500">
                                    No customer found.
                                    <button
                                      type="button"
                                      onClick={handleOpenAddCustomer}
                                      className="block mx-auto mt-1 text-emerald-600 font-bold underline"
                                    >
                                      Create New Profile
                                    </button>
                                  </div>
                                ) : (
                                  searchableCustomers.map((c) => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedCustomerId(c.id);
                                        setShowCustomerPicker(false);
                                        setCustomerSearchQuery('');
                                      }}
                                      className="w-full p-2 text-left hover:bg-amber-50 rounded-lg flex items-center justify-between transition-colors"
                                    >
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-xs font-bold text-slate-900">{c.name}</span>
                                          <span className="text-[10px] font-mono px-1 py-0.2 bg-slate-100 text-slate-700 rounded">
                                            {c.id}
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-slate-500">📞 {c.phone}</span>
                                      </div>
                                      <span className="text-xs font-bold text-amber-700">
                                        Due: {formatCurrency(c.dueAmount || 0)}
                                      </span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode B: One-time / Non-Registered Due */}
                  {dueType === 'onetime' && (
                    <div className="space-y-2 bg-white/80 p-2.5 rounded-xl border border-amber-200 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-amber-900 font-bold">
                        <span>Quick Walk-in Due Entry</span>
                        <span className="font-mono text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                          Auto-ID: CUST-OT-XXXX
                        </span>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Customer Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rafiqul Islam"
                          value={onetimeName}
                          onChange={(e) => setOnetimeName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. 017XXXXXXXX"
                          value={onetimePhone}
                          onChange={(e) => setOnetimePhone(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Address / Area (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. House 12, Road 4, Mirpur"
                          value={onetimeAddress}
                          onChange={(e) => setOnetimeAddress(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Payment Split & Downpayment */}
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-slate-700">Cash Paid Today (৳)</label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setDownpayment('0')}
                          className="px-2 py-0.5 text-[10px] bg-amber-100 hover:bg-amber-200 font-bold rounded text-amber-900"
                        >
                          Full Due (৳0)
                        </button>
                        <button
                          type="button"
                          onClick={() => setDownpayment(String((grandTotal * 0.5).toFixed(2)))}
                          className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 font-bold rounded text-slate-700"
                        >
                          50%
                        </button>
                        <button
                          type="button"
                          onClick={() => setDownpayment(String(grandTotal))}
                          className="px-2 py-0.5 text-[10px] bg-emerald-50 hover:bg-emerald-100 font-bold rounded text-emerald-800"
                        >
                          Clear Full
                        </button>
                      </div>
                    </div>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={grandTotal}
                      placeholder="0.00"
                      value={downpayment}
                      onChange={(e) => setDownpayment(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />

                    {/* Due Summary Row */}
                    <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-600">Balance Carried to Due:</span>
                        <span className="text-amber-800 font-mono text-sm">{formatCurrency(remainingDue)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Credit Status:</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            remainingDue === grandTotal
                              ? 'bg-rose-100 text-rose-800'
                              : remainingDue > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {remainingDue === grandTotal ? 'Full Due' : remainingDue > 0 ? 'Partial Paid' : 'Full Paid'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cash Tendered & Change (If Cash selected) */}
              {paymentMethod === 'Cash' && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-700">Cash Tendered (৳)</label>
                    <div className="flex gap-1">
                      {[20, 50, 100, 500].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setAmountTendered(String(amt))}
                          className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 font-bold rounded text-slate-700"
                        >
                          {formatCurrency(amt)}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setAmountTendered(String(grandTotal))}
                        className="px-2 py-0.5 text-[10px] bg-emerald-50 hover:bg-emerald-100 font-bold rounded text-emerald-800"
                      >
                        Exact
                      </button>
                    </div>
                  </div>

                  <input
                    type="number"
                    step="0.01"
                    placeholder={`e.g. ${grandTotal.toFixed(2)}`}
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />

                  {tenderedNumber > 0 && (
                    <div className="flex justify-between text-xs pt-1 border-t border-slate-100 font-bold">
                      <span className="text-slate-600">Change Due:</span>
                      <span className="text-emerald-700 font-mono">{formatCurrency(changeDue)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {checkoutError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                id="pos-checkout-btn"
                type="button"
                onClick={handleCheckout}
                className={`w-full py-3 px-4 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm ${
                  paymentMethod === 'Due / Credit'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {paymentMethod === 'Due / Credit' ? (
                  <>
                    <BookOpen className="w-4 h-4" />
                    <span>
                      Confirm Credit Sale{' '}
                      <span className="font-mono">
                        ({remainingDue > 0 ? `৳${remainingDue.toFixed(2)} Due` : 'Paid'})
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    <span>
                      Pay & Print Invoice{' '}
                      <motion.span
                        key={`btn-total-${pulseKey}`}
                        animate={isTotalPulsing ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="inline-block font-mono"
                      >
                        ({formatCurrency(grandTotal)})
                      </motion.span>
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <span>Add New Customer Account</span>
              </h2>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Register regular or one-time credit profile for ledger tracking and sales reports
            </p>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              {/* Profile Type Toggle */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setNewCustIsOneTime(false)}
                  className={`py-1.5 rounded-lg font-bold text-xs transition-all ${
                    !newCustIsOneTime ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Regular Account
                </button>
                <button
                  type="button"
                  onClick={() => setNewCustIsOneTime(true)}
                  className={`py-1.5 rounded-lg font-bold text-xs transition-all ${
                    newCustIsOneTime ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  One-time / Walk-in
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer ID *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. CUST-1005"
                  value={newCustId}
                  onChange={(e) => setNewCustId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Kabir Ahmed"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  required
                  type="tel"
                  placeholder="e.g. 01711223344"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Sector 7, Uttara, Dhaka"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. customer@example.com"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Opening Due (৳)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={newCustInitialDue}
                    onChange={(e) => setNewCustInitialDue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs"
                >
                  Save & Select Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice Receipt Modal */}
      {completedSale && (
        <PrintableInvoiceModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
        />
      )}

      {/* Fast Floating / Compact On-Screen Numpad Modal */}
      <QuantityNumpadModal
        isOpen={isNumpadOpen}
        medicine={activeNumpadMedicine}
        initialQuantity={numpadInitialQty}
        theme="slate"
        onConfirm={handleConfirmNumpadQuantity}
        onClose={handleCloseNumpad}
      />
    </div>
  );
};
