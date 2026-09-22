import React, { useState, useMemo, useRef, useEffect, useCallback, useDeferredValue } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { Medicine, PaymentMethod, Sale } from '../types';
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  Check,
  Pill,
  Banknote,
  ChevronDown,
  Printer,
  Sparkles,
  Keyboard,
  ShoppingCart,
} from 'lucide-react';
import { AddBrandModal } from './AddBrandModal';
import { PrintableInvoiceModal } from './PrintableInvoiceModal';
import { QuantityNumpadModal } from './QuantityNumpadModal';
import { SalesSearchBar, SalesSearchBarHandle } from './SalesSearchBar';
import { safeLocalStorageGet } from '../utils/persistentStorage';

interface EasySalesViewProps {
  onBack: () => void;
  onGoHome?: () => void;
  onSwitchToDesktopPOS?: () => void;
}

// Helper to format numbers with Bengali digits
const toBengaliNumber = (num: number | string): string => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num
    .toString()
    .replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit, 10)]);
};

// Generate 20-point starburst/jagged seal SVG path
const generateSealPath = (points = 20, innerRadius = 42, outerRadius = 50): string => {
  let path = '';
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const x = 50 + r * Math.sin(angle);
    const y = 50 - r * Math.cos(angle);
    path += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return path + ' Z';
};

interface EasySalesCartItemProps {
  item: { medicine: Medicine; quantity: number };
  index: number;
  onUpdateQuantity: (medicineId: string, quantity: number) => void;
  onRemove: (medicineId: string) => void;
  onOpenNumpad?: (medicine: Medicine, initialQty: number) => void;
}

const EasySalesCartItem: React.FC<EasySalesCartItemProps> = ({
  item,
  index,
  onUpdateQuantity,
  onRemove,
  onOpenNumpad,
}) => {
  const med = item.medicine;
  const isMon5mg = med.name.toLowerCase().includes('mon 5mg');
  const packSize = med.packSize || (isMon5mg ? "30's pack" : "10's pack");
  const unitPrice = med.sellingPrice || 8.0;

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
        onUpdateQuantity(med.id, parsed);
      }
    }
  };

  // Reset to minimum 1 when user clicks away
  const handleBlur = () => {
    if (quantity === '' || quantity < 1) {
      setQuantity(1);
      onUpdateQuantity(med.id, 1);
    }
  };

  // Increment / Decrement Handlers
  const handleIncrement = () => {
    const next = (Number(quantity) || 0) + 1;
    setQuantity(next);
    onUpdateQuantity(med.id, next);
  };

  const handleDecrement = () => {
    const next = Math.max(1, (Number(quantity) || 1) - 1);
    setQuantity(next);
    onUpdateQuantity(med.id, next);
  };

  const displayQuantity = Number(quantity) || 1;
  const displayTotal = (displayQuantity * unitPrice).toFixed(1);

  return (
    <div
      key={`${med.id}-${index}`}
      id={`product-card-${med.id}`}
      className="bg-[#0e3b37] border border-[#236a64] rounded-2xl p-4 shadow-md transition-all hover:border-[#328b83] space-y-3"
    >
      {/* Top Header: Title, Generic, & Trash Bin Icon */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight leading-snug">
            {med.name}
          </h3>
          <p className="text-xs text-teal-200/90 font-medium">
            {med.genericName}
          </p>
        </div>

        {/* Trash Bin Icon for removal */}
        <button
          id={`remove-item-${med.id}`}
          onClick={() => onRemove(med.id)}
          className="w-8 h-8 rounded-lg bg-[#144743] hover:bg-rose-500/20 text-teal-300 hover:text-rose-300 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          title="Remove product"
        >
          <Trash2 className="w-4 h-4 stroke-[1.8]" />
        </button>
      </div>

      {/* Second Line: Pack Size & Unit Sale Price in Red */}
      <div className="flex items-center gap-3 text-xs flex-wrap">
        <span className="text-teal-200">
          Pack Size: <strong className="text-white font-semibold">{packSize}</strong>
        </span>
        <span className="text-teal-400/60">•</span>
        <span className="text-rose-400 font-bold">
          Unit Sale Price: {unitPrice.toFixed(1)}
        </span>
      </div>

      {/* Third Line: Pill Icon ("1 Tablet") & Cash Icon ("8.0 ৳") & Stepper */}
      <div className="flex items-center justify-between pt-1 border-t border-[#18534d]">
        <div className="flex items-center gap-2">
          {/* Pill Icon: Clickable to trigger Numpad */}
          <button
            type="button"
            onClick={() => onOpenNumpad?.(med, displayQuantity)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#144743] hover:bg-[#195650] border border-[#236a64] text-xs font-semibold text-white transition-all active:scale-95 cursor-pointer"
            title="Tap to change quantity with Numpad"
          >
            <Pill className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{displayQuantity} {med.category || 'Tablet'}</span>
          </button>

          {/* Cash Icon: "8.0 ৳" */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#144743] border border-[#236a64] text-xs font-bold text-emerald-300 font-mono">
            <Banknote className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{displayTotal} ৳</span>
          </div>
        </div>

        {/* Quantity Adjustment Buttons */}
        <div className="flex items-center gap-1 bg-[#0b2f2c] border border-[#1f635c] rounded-xl p-0.5">
          <button
            type="button"
            onClick={handleDecrement}
            className="w-6 h-6 rounded-lg bg-[#144743] hover:bg-[#1a5a54] text-white flex items-center justify-center transition-all cursor-pointer"
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
            className="w-10 text-center text-xs font-bold font-mono text-white bg-transparent focus:outline-hidden focus:ring-1 focus:ring-emerald-400 rounded"
          />
          <button
            type="button"
            onClick={handleIncrement}
            className="w-6 h-6 rounded-lg bg-[#144743] hover:bg-[#1a5a54] text-white flex items-center justify-center transition-all cursor-pointer"
            title="Increase"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onOpenNumpad?.(med, displayQuantity)}
            className="w-6 h-6 rounded-lg bg-[#144743] hover:bg-[#1c645e] text-teal-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border-l border-[#1f635c]"
            title="Open On-Screen Numpad"
          >
            <Keyboard className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const EasySalesView: React.FC<EasySalesViewProps> = ({
  onBack,
  onGoHome,
  onSwitchToDesktopPOS,
}) => {
  const {
    medicines,
    cart,
    cartItems,
    setCartItems,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    checkoutSale,
    customers,
  } = usePharmacy();

  const searchBarRef = useRef<SalesSearchBarHandle>(null);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);

  // Fast Quantity Entry & Soft Numpad Modal State
  const [isNumpadOpen, setIsNumpadOpen] = useState(false);
  const [activeNumpadMedicine, setActiveNumpadMedicine] = useState<Medicine | null>(null);
  const [numpadInitialQty, setNumpadInitialQty] = useState(1);

  // Auto-Focus & Keyboard Trigger on Item Tap
  const handleSelectMedicine = useCallback((med: Medicine) => {
    const existing = cart.find((i) => i.medicine.id === med.id);
    const startQty = existing ? existing.quantity : 1;
    if (!existing) {
      addToCart(med, 1);
    }

    setActiveNumpadMedicine(med);
    setNumpadInitialQty(startQty);
    setIsNumpadOpen(true);
  }, [cart, addToCart]);

  const handleQuickAdd = useCallback((med: Medicine) => {
    addToCart(med, 1);
    searchBarRef.current?.clearAndFocus();
  }, [addToCart]);

  const handleConfirmNumpadQuantity = (quantity: number) => {
    if (activeNumpadMedicine) {
      updateCartQuantity(activeNumpadMedicine.id, quantity);
    }
    setIsNumpadOpen(false);
    setActiveNumpadMedicine(null);
    searchBarRef.current?.clearAndFocus();
  };

  const handleCloseNumpad = () => {
    setIsNumpadOpen(false);
    setActiveNumpadMedicine(null);
    searchBarRef.current?.clearAndFocus();
  };

  // 1. Screen state management:
  // - Flow states: 'product_selection' -> 'order_confirmation' (modal) -> 'order_success' (modal/view)
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showPrintInvoice, setShowPrintInvoice] = useState(false);

  // 2. Order Confirmation Form State (image_6.png)
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id?: string; name: string; phone: string; isOneTime?: boolean } | null>(null);
  const [customerName, setCustomerName] = useState('Unknown');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isOneTimeDue, setIsOneTimeDue] = useState(false);
  const [countryCode] = useState('+880');
  const [invoiceDate, setInvoiceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [discountPercent, setDiscountPercent] = useState<string>('0');
  const [flatDiscount, setFlatDiscount] = useState<string>('');
  
  // Radio buttons for "পরিশোধের ধরন (প্রয়োজনীয়)" (Payment Method): Full Paid, Partial Paid, Full Due
  const [paymentMethod, setPaymentMethod] = useState<'Full Paid' | 'Partial Paid' | 'Full Due'>('Full Paid');
  const [partialPaidAmount, setPartialPaidAmount] = useState<string>('');

  // Radio buttons for "পেমেন্টের ধরন (প্রয়োজনীয়)" (Payment Type): Cash, Online
  const [paymentType, setPaymentType] = useState<'Cash' | 'Online'>('Cash');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter customers for the dropdown
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // Calculations
  const totalPrice = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.medicine.sellingPrice), 0);
  }, [cart]);

  const numericPercentDiscount = useMemo(() => {
    const parsed = parseFloat(discountPercent) || 0;
    return Math.max(0, Math.min(100, parsed));
  }, [discountPercent]);

  const percentDiscountAmount = useMemo(() => {
    return (totalPrice * numericPercentDiscount) / 100;
  }, [totalPrice, numericPercentDiscount]);

  const numericFlatDiscount = useMemo(() => {
    const parsed = parseFloat(flatDiscount) || 0;
    return Math.max(0, parsed);
  }, [flatDiscount]);

  const totalDiscountAmount = useMemo(() => {
    return percentDiscountAmount + numericFlatDiscount;
  }, [percentDiscountAmount, numericFlatDiscount]);

  // Dynamic Grand Total: (Subtotal - Percentage Discount - Direct BDT Discount)
  const discountedTotal = useMemo(() => {
    return Math.max(0, totalPrice - percentDiscountAmount - numericFlatDiscount);
  }, [totalPrice, percentDiscountAmount, numericFlatDiscount]);

  // Due calculation for partial payment
  const numericPartialPaid = parseFloat(partialPaidAmount) || 0;
  const calculatedDueAmount = useMemo(() => {
    if (paymentMethod === 'Full Due') return discountedTotal;
    if (paymentMethod === 'Partial Paid') return Math.max(0, discountedTotal - numericPartialPaid);
    return 0;
  }, [paymentMethod, discountedTotal, numericPartialPaid]);

  // Select customer from dropdown
  const handleSelectCustomer = (cust: { id?: string; name: string; phone: string; isOneTime?: boolean }) => {
    setSelectedCustomer(cust);
    setCustomerName(cust.name);
    setCustomerPhone(cust.phone.replace('+880', '').replace('880', ''));
    setCustomerSearch(`[${cust.id}] ${cust.name}`);
    setIsOneTimeDue(cust.isOneTime ?? false);
    setIsCustomerDropdownOpen(false);
  };

  // Open confirmation modal
  const handleOpenConfirmation = () => {
    if (cart.length === 0) {
      setErrorMessage('Please add at least one item before sales.');
      return;
    }
    setErrorMessage(null);
    setShowOrderConfirmation(true);
  };

  // Handle Order Confirmation submit
  const handleConfirmOrder = () => {
    if (paymentMethod === 'Partial Paid' && (isNaN(numericPartialPaid) || numericPartialPaid <= 0)) {
      setErrorMessage('Please enter a valid partial paid amount.');
      return;
    }

    const paid = paymentMethod === 'Full Paid' 
      ? discountedTotal 
      : paymentMethod === 'Partial Paid' 
        ? numericPartialPaid 
        : 0;

    const actualPaymentMethod: PaymentMethod = paymentType === 'Cash' ? 'Cash' : 'Digital / UPI';

    const result = checkoutSale(actualPaymentMethod, paid, {
      customerId: selectedCustomer?.id,
      customerName: customerName.trim() || (isOneTimeDue ? 'One-time Customer' : 'Unknown'),
      customerPhone: customerPhone ? `${countryCode}${customerPhone}` : 'N/A',
      globalDiscount: totalDiscountAmount,
      paymentStatus: paymentMethod,
      paidAmount: paid,
      dueAmount: calculatedDueAmount,
      customGrandTotal: discountedTotal,
      saleDate: invoiceDate,
      isOneTimeDue: isOneTimeDue,
    });

    if (result.success && result.sale) {
      // ১. ডাটাবেজ / সার্ভারে সেলস সেভ হয়েছে (checkoutSale সম্পন্ন)
      // ২. সেল শেষ হলে কার্ট সম্পূর্ণ খালি করে দেওয়া
      setCartItems([]);
      clearCart();
      setDiscountPercent('0');
      setFlatDiscount('');
      setCustomerName('Unknown');
      setCustomerPhone('');
      setCustomerSearch('');
      setSelectedCustomer(null);
      setPaymentMethod('Full Paid');
      setPaymentType('Cash');
      setPartialPaidAmount('');
      searchBarRef.current?.clearAndFocus();
      setCompletedSale(result.sale);
      setShowOrderConfirmation(false);
      setShowOrderSuccess(true);
    } else {
      setErrorMessage(result.error || 'Failed to complete sale transaction.');
    }
  };

  // Finish sale from success screen - Ready for next transaction with clean empty cart
  const handleFinishSale = () => {
    setShowOrderSuccess(false);
    setCompletedSale(null);
    setCartItems([]);
    clearCart();
    setDiscountPercent('0');
    setFlatDiscount('');
    setCustomerName('Unknown');
    setCustomerPhone('');
    setCustomerSearch('');
    setSelectedCustomer(null);
    setPaymentMethod('Full Paid');
    setPaymentType('Cash');
    setPartialPaidAmount('');
    searchBarRef.current?.clearAndFocus();
    setErrorMessage(null);
    // Keep the user on the Sales page, ready for a new transaction with an empty cart
  };

  const sealPath = useMemo(() => generateSealPath(22, 42, 50), []);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#102d29] text-white flex flex-col items-center justify-start p-2 sm:p-4 select-none">
      
      {/* 
        ========================================================================
        STATE 1: PRODUCT SELECTION (image_5.png)
        - Title: "Sales" with Back Arrow & "+" Button
        - "Search here..." text field with Magnifying Glass
        - Central detailed product card for "Mon 5mg" (Montelukast):
          * Pack Size: 30's pack
          * Unit Sale Price: 8.0 (in red)
          * Pill icon labels "1 Tablet"
          * Cash icon shows "8.0 ৳"
          * Trash bin icon for removal
        - Fixed bottom panel:
          * Total Price: 8.00 BDT
          * Total with discount: 8.00 BDT
          * Large green "Sales" button below it
        ========================================================================
      */}
      <div className="w-full max-w-md bg-[#134E4A] border border-[#1f665f] rounded-3xl shadow-2xl flex flex-col min-h-[86vh] overflow-hidden relative">
        
        {/* Top Navigation Bar: Back Arrow & "+" Button */}
        <header className="px-4 py-3.5 flex items-center justify-between border-b border-[#1f665f] bg-[#11433f] sticky top-0 z-20">
          <button
            id="sales-back-btn"
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-[#0e3b37] hover:bg-[#18534d] text-white flex items-center justify-center transition-all active:scale-95 shadow-xs"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          <h1 className="text-lg font-bold text-white tracking-wide">Sales</h1>

          <button
            id="sales-add-plus-btn"
            onClick={() => setShowAddBrandModal(true)}
            className="w-10 h-10 rounded-xl bg-[#0e3b37] hover:bg-[#18534d] text-emerald-300 flex items-center justify-center transition-all active:scale-95 shadow-xs"
            title="Add Product / Brand"
          >
            <Plus className="w-5 h-5 stroke-[2.2]" />
          </button>
        </header>

        {/* Isolated, debounced sales search bar */}
        <SalesSearchBar
          ref={searchBarRef}
          medicines={medicines}
          cart={cart}
          onSelectMedicine={handleSelectMedicine}
          onQuickAdd={handleQuickAdd}
          onOpenAddModal={(suggestedName) => {
            setShowAddBrandModal(true);
          }}
          onCheckoutTrigger={handleOpenConfirmation}
        />

        {/* Error notification */}
        {errorMessage && (
          <div className="mx-4 my-2 p-2.5 bg-rose-900/70 border border-rose-500/60 rounded-xl text-rose-200 text-xs flex items-center justify-between animate-in fade-in">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Central Area: Product Card(s) Matching image_5.png */}
        <div className="flex-1 px-4 py-2 overflow-y-auto space-y-3">
          {cart.length > 0 ? (
            cart.map((item, index) => (
              <EasySalesCartItem
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
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-teal-200/90 my-auto">
              <div className="w-16 h-16 rounded-3xl bg-[#0e3b37] border border-[#236a64] flex items-center justify-center mb-4 text-teal-400 shadow-inner">
                <ShoppingCart className="w-8 h-8 stroke-[1.75]" />
              </div>
              <p className="text-base font-bold text-white tracking-wide">
                No items added yet. Search or scan to add medicines.
              </p>
              <p className="text-xs text-teal-300/70 mt-1.5 max-w-xs leading-relaxed">
                Use the search bar above to look up medicines by name, generic, or brand to start adding to your sales bill.
              </p>
            </div>
          )}
        </div>

        {/* Fixed Bottom Panel Matching image_5.png */}
        <div className="p-4 bg-[#11433f] border-t border-[#1f665f] space-y-3 mt-auto">
          {/* Total Price & Total with discount labels */}
          <div className="space-y-1.5 text-sm font-medium">
            <div className="flex justify-between items-center text-teal-100">
              <span>Total Price:</span>
              <span className="font-bold text-white font-mono">
                {totalPrice.toFixed(2)} BDT
              </span>
            </div>

            <div className="flex justify-between items-center text-emerald-300 font-semibold">
              <span>Total with discount:</span>
              <span className="font-bold text-emerald-300 font-mono">
                {discountedTotal.toFixed(2)} BDT
              </span>
            </div>
          </div>

          {/* Large Green "Sales" Button */}
          <button
            id="btn-trigger-sales-modal"
            onClick={handleOpenConfirmation}
            disabled={cart.length === 0}
            className={`w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all shadow-lg flex items-center justify-center cursor-pointer ${
              cart.length > 0
                ? 'bg-[#059669] hover:bg-[#10B981] active:scale-[0.98] text-white shadow-emerald-950/50'
                : 'bg-[#0c312e] text-teal-400/40 border border-[#1b5550] cursor-not-allowed'
            }`}
          >
            Sales
          </button>
        </div>
      </div>

      {/* 
        ========================================================================
        STATE 2: ORDER CONFIRMATION MODAL (image_6.png)
        - Overlays previous screen with slight dimming backdrop
        - Titled "Order Confirmation" with an 'X' close button
        - Elements:
          1. Searchable dropdown menu: "Search customer here..."
          2. "OR" label separating fields
          3. Text input with label "Name" and placeholder "Unknown"
          4. Separate inputs for "BD +880" and "Phone"
          5. Percentage discount input field with placeholder "0"
          6. Radio buttons for "পরিশোধের ধরন (প্রয়োজনীয়)": Full Paid, Partial Paid, Full Due
          7. Radio buttons for "পেমেন্টের ধরন (প্রয়োজনীয়)": Cash, Online
          8. Subtotal area: "মোট মূল্য ৮.০০ BDT" and "ছাড়সহ মোট মূল্য ৮.০০ BDT"
          9. Large button at bottom: "নিশ্চিত করুন"
        ========================================================================
      */}
      {showOrderConfirmation && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div
            id="modal-order-confirmation"
            className="w-full max-w-md bg-[#134E4A] border border-[#236a64] rounded-3xl shadow-2xl text-white flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Modal Top Header */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-[#1f665f] bg-[#11433f]">
              <h2 className="text-lg font-bold text-white tracking-wide">
                Order Confirmation
              </h2>
              <button
                id="close-order-confirmation-btn"
                onClick={() => setShowOrderConfirmation(false)}
                className="w-8 h-8 rounded-lg bg-[#0e3b37] hover:bg-[#18534d] text-teal-200 hover:text-white flex items-center justify-center transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with inputs */}
            <div className="p-5 overflow-y-auto space-y-4">
              
              {/* 1. Searchable dropdown: "Search customer here..." */}
              <div className="relative">
                <label className="block text-xs font-semibold text-teal-200 mb-1.5">
                  Select Customer
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setIsCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                    placeholder="Search customer here..."
                    className="w-full bg-[#0e3b37] border border-[#236a64] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-teal-300/60 focus:outline-hidden focus:border-emerald-400 font-medium"
                  />
                  <ChevronDown className="w-4 h-4 text-teal-300 absolute right-3 top-3 pointer-events-none" />
                </div>

                {isCustomerDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-[#0c312e] border border-[#236a64] rounded-xl shadow-xl max-h-44 overflow-y-auto z-30 divide-y divide-[#18534d]">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((cust, index) => (
                        <button
                          key={`${cust.id}-${index}`}
                          type="button"
                          onClick={() => handleSelectCustomer(cust)}
                          className="w-full text-left px-3.5 py-2 hover:bg-[#144743] flex items-center justify-between text-xs text-white"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                              {cust.id}
                            </span>
                            <span className="font-semibold">{cust.name}</span>
                            {cust.isOneTime && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                                One-Time
                              </span>
                            )}
                          </div>
                          <span className="text-teal-300 font-mono text-[11px]">{cust.phone}</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-teal-300">
                        No customer found. You can enter details below.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick One-time Due switch */}
              <div className="flex items-center justify-between bg-[#0e3b37]/70 border border-[#236a64] rounded-xl px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-white">Non-Registered / One-time Due</p>
                  <p className="text-[10px] text-teal-300">Quick credit checkout without full account registration</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !isOneTimeDue;
                    setIsOneTimeDue(nextVal);
                    if (nextVal) {
                      setSelectedCustomer(null);
                      setCustomerName('One-time Customer');
                      setCustomerSearch('');
                    }
                  }}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    isOneTimeDue
                      ? 'bg-amber-400 text-neutral-900 font-bold shadow-sm'
                      : 'bg-[#18534d] text-teal-200 hover:bg-[#1f665f]'
                  }`}
                >
                  {isOneTimeDue ? 'Active (One-Time)' : 'Enable'}
                </button>
              </div>

              {/* 2. "OR" label separating fields */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#1f665f]"></div>
                <span className="flex-shrink mx-3 text-[11px] font-bold text-teal-300 px-2.5 py-0.5 rounded-full bg-[#0e3b37] border border-[#236a64]">
                  OR
                </span>
                <div className="flex-grow border-t border-[#1f665f]"></div>
              </div>

              {/* 3. Text input with label "Name" and placeholder "Unknown" */}
              <div>
                <label className="block text-xs font-semibold text-teal-200 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Unknown"
                  className="w-full bg-[#0e3b37] border border-[#236a64] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-teal-300/60 focus:outline-hidden focus:border-emerald-400 font-medium"
                />
              </div>

              {/* 4. Separate inputs for "BD +880" and "Phone" */}
              <div>
                <label className="block text-xs font-semibold text-teal-200 mb-1">
                  Phone
                </label>
                <div className="flex items-center">
                  <div className="px-3.5 py-2.5 bg-[#0b2f2c] border border-[#236a64] rounded-l-xl text-xs font-bold text-teal-200 flex items-center gap-1.5 shrink-0 select-none">
                    <span>BD</span>
                    <span className="font-mono">+880</span>
                  </div>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Phone"
                    className="w-full bg-[#0e3b37] border border-[#236a64] border-l-0 rounded-r-xl px-3.5 py-2.5 text-sm text-white placeholder-teal-300/60 focus:outline-hidden focus:border-emerald-400 font-mono"
                  />
                </div>
              </div>

              {/* Invoice Date Set */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-teal-200">
                    Invoice Date
                  </label>
                  <button
                    type="button"
                    onClick={() => setInvoiceDate(new Date().toISOString().split('T')[0])}
                    className="text-[10px] text-emerald-300 font-bold hover:underline"
                  >
                    Set Today
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full bg-[#0e3b37] border border-[#236a64] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* 5. Percentage discount input field with placeholder "0" */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-teal-200">
                    Discount (%)
                  </label>
                  {numericPercentDiscount > 0 && (
                    <span className="text-[11px] text-emerald-300 font-semibold">
                      - {percentDiscountAmount.toFixed(2)} BDT
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#0e3b37] border border-[#236a64] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-teal-300/60 focus:outline-hidden focus:border-emerald-400 font-mono"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-teal-300 font-bold pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* Fixed Flat Discount (সরাসরি টাকা ছাড়): Direct BDT input field below Discount (%) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-teal-200">
                    Discount Amount (সরাসরি টাকা ছাড়)
                  </label>
                  {numericFlatDiscount > 0 && (
                    <span className="text-[11px] text-emerald-300 font-semibold">
                      - {numericFlatDiscount.toFixed(2)} BDT
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={flatDiscount}
                    onChange={(e) => setFlatDiscount(e.target.value)}
                    placeholder="Discount Amount "
                    className="w-full bg-[#0e3b37] border border-[#236a64] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-teal-300/60 focus:outline-hidden focus:border-emerald-400 font-mono"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-teal-300 font-bold pointer-events-none">
                    ৳
                  </span>
                </div>
              </div>

              {/* 1. পরিশোধের ধরন (প্রয়োজনীয়): [Full Paid] [Partial Paid] [Full Due] directly above Payment Method */}
              <div className="space-y-2 pt-1 border-t border-[#1f665f]">
                <label className="block text-xs font-bold text-teal-100">
                  পরিশোধের ধরন (প্রয়োজনীয়)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Full Paid', 'Partial Paid', 'Full Due'] as const).map((method) => {
                    const isSelected = paymentMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-[#059669] text-white border-emerald-400 shadow-sm'
                            : 'bg-[#0e3b37] text-teal-200/90 border-[#236a64] hover:bg-[#144743]'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-white bg-white' : 'border-teal-400'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />}
                        </span>
                        <span className="truncate">{method}</span>
                      </button>
                    );
                  })}
                </div>

                {/* If Partial Paid: input amount and calculate due */}
                {paymentMethod === 'Partial Paid' && (
                  <div className="p-3 bg-[#0b2f2c] border border-[#1f635c] rounded-xl space-y-2 animate-in fade-in">
                    <label className="block text-[11px] text-teal-200 font-medium">
                      Paid Amount (BDT):
                    </label>
                    <input
                      type="number"
                      value={partialPaidAmount}
                      onChange={(e) => setPartialPaidAmount(e.target.value)}
                      placeholder="Enter amount paid"
                      className="w-full bg-[#0e3b37] border border-[#236a64] rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                    <div className="flex justify-between text-xs pt-1 border-t border-[#18534d]">
                      <span className="text-teal-300">Due Balance:</span>
                      <span className="font-bold text-amber-300 font-mono">
                        {calculatedDueAmount.toFixed(2)} BDT
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Payment Method: পেমেন্টের ধরন (Cash, Online) */}
              <div className="space-y-2 pt-1 border-t border-[#1f665f]">
                <label className="block text-xs font-bold text-teal-100">
                  পেমেন্টের ধরন
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['Cash', 'Online'] as const).map((type) => {
                    const isSelected = paymentType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setPaymentType(type)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-[#059669] text-white border-emerald-400 shadow-sm'
                            : 'bg-[#0e3b37] text-teal-200/90 border-[#236a64] hover:bg-[#144743]'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-white bg-white' : 'border-teal-400'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />}
                        </span>
                        <span>{type}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 8. Subtotal area: Subtotal, Percentage Discount, Flat Discount, and Grand Total */}
              <div className="p-3.5 bg-[#0e3b37] border border-[#236a64] rounded-2xl space-y-1.5 text-xs font-medium">
                <div className="flex justify-between items-center text-teal-100">
                  <span>মোট মূল্য {toBengaliNumber(totalPrice.toFixed(2))} BDT</span>
                  <span className="font-mono text-white font-bold">{totalPrice.toFixed(2)} ৳</span>
                </div>
                {percentDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-teal-200 text-[11px]">
                    <span>শতাংশ ছাড় ({numericPercentDiscount}%):</span>
                    <span className="font-mono text-emerald-300 font-semibold">- {percentDiscountAmount.toFixed(2)} ৳</span>
                  </div>
                )}
                {numericFlatDiscount > 0 && (
                  <div className="flex justify-between items-center text-teal-200 text-[11px]">
                    <span>সরাসরি টাকা ছাড় (Flat):</span>
                    <span className="font-mono text-emerald-300 font-semibold">- {numericFlatDiscount.toFixed(2)} ৳</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-emerald-300 font-bold text-sm pt-1 border-t border-[#18534d]">
                  <span>ছাড়সহ মোট মূল্য {toBengaliNumber(discountedTotal.toFixed(2))} BDT</span>
                  <span className="font-mono text-emerald-300 font-bold">{discountedTotal.toFixed(2)} ৳</span>
                </div>
                {paymentMethod === 'Partial Paid' && (
                  <div className="flex justify-between items-center text-amber-300 font-medium text-xs pt-1 border-t border-[#18534d]/60">
                    <span>বকেয়া পরিমাণ:</span>
                    <span className="font-mono font-bold text-amber-300">{calculatedDueAmount.toFixed(2)} ৳</span>
                  </div>
                )}
                {paymentMethod === 'Full Due' && (
                  <div className="flex justify-between items-center text-amber-300 font-medium text-xs pt-1 border-t border-[#18534d]/60">
                    <span>সম্পূর্ণ বকেয়া:</span>
                    <span className="font-mono font-bold text-amber-300">{discountedTotal.toFixed(2)} ৳</span>
                  </div>
                )}
              </div>

              {/* 9. Large button at bottom: "নিশ্চিত করুন" */}
              <button
                id="btn-confirm-order"
                onClick={handleConfirmOrder}
                className="w-full py-3.5 rounded-2xl bg-[#059669] hover:bg-[#10B981] active:scale-[0.98] text-white font-bold text-base shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                নিশ্চিত করুন (Complete Sale / Execute Sale)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        STATE 3: ORDER SUCCESS FULL-SCREEN CONFIRMATION (image_7.png)
        - Screen transitions to full-screen confirmation page (dimming background further)
        - Main element is a green jagged-edge seal with a central checkmark
        - Below this is the large text "Success!"
        - Detailed message: "Congratulations! Your order has been placed successfully."
        - Very bottom: central green button reads "সম্পন্ন"
        ========================================================================
      */}
      {showOrderSuccess && completedSale && (
        <div
          id="screen-order-success"
          className="fixed inset-0 z-50 bg-[#0c2825]/95 backdrop-blur-md flex flex-col items-center justify-between p-6 sm:p-8 animate-in fade-in duration-300"
        >
          {/* Top spacer / App Branding */}
          <div className="pt-4 text-center">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-semibold tracking-wide">
              Siam Pharma POS
            </span>
          </div>

          {/* Central Main Content: Jagged Seal, Success! & Congratulations message */}
          <div className="flex flex-col items-center justify-center text-center my-auto max-w-sm px-4">
            
            {/* Green jagged-edge seal with central checkmark matching image_7.png */}
            <div className="relative flex items-center justify-center mb-6">
              <svg
                className="w-32 h-32 sm:w-36 sm:h-36 text-[#10b981] drop-shadow-[0_12px_28px_rgba(16,185,129,0.4)] animate-in zoom-in-50 duration-500"
                viewBox="0 0 100 100"
              >
                {/* 22-point Jagged Rosette Outer Path */}
                <path d={sealPath} fill="currentColor" />

                {/* Concentric rings inside the seal */}
                <circle cx="50" cy="50" r="39" fill="#059669" />
                <circle cx="50" cy="50" r="35" fill="#047857" />
                <circle
                  cx="50"
                  cy="50"
                  r="32"
                  fill="none"
                  stroke="#a7f3d0"
                  strokeWidth="1.2"
                  strokeDasharray="3 2"
                />
              </svg>

              {/* Bold White Central Checkmark */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Check className="w-14 h-14 text-white stroke-[3.5] animate-in zoom-in-75 duration-300" />
              </div>
            </div>

            {/* Large Text: "Success!" */}
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none mb-3">
              Success!
            </h1>

            {/* Detailed Message: "Congratulations! Your order has been placed successfully." */}
            <p className="text-sm sm:text-base text-teal-100/90 font-medium leading-relaxed max-w-xs">
              Congratulations! Your order has been placed successfully.
            </p>

            {/* Order Details Brief Pill */}
            <div className="mt-5 w-full bg-[#11433f] border border-[#1f665f] rounded-2xl p-3.5 text-xs text-teal-200 text-left space-y-1.5 shadow-inner">
              <div className="flex justify-between">
                <span>Invoice:</span>
                <span className="font-bold text-white font-mono">#{completedSale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-semibold text-emerald-300">{completedSale.customerName || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment:</span>
                <span className="text-white font-medium">{completedSale.paymentMethod} • {completedSale.paymentStatus}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#18534d] font-bold">
                <span className="text-teal-100">Amount:</span>
                <span className="text-emerald-300 font-mono text-sm">{(completedSale.totalAmount ?? completedSale.grandTotal).toFixed(2)} BDT</span>
              </div>
            </div>
          </div>

          {/* Bottom Action Area: Central Green Button: "সম্পন্ন" */}
          <div className="w-full max-w-sm pb-4 space-y-2.5">
            {/* Primary "সম্পন্ন" Button */}
            <button
              id="btn-order-success-complete"
              onClick={handleFinishSale}
              className="w-full py-4 rounded-2xl bg-[#059669] hover:bg-[#10B981] active:scale-[0.98] text-white font-bold text-base shadow-xl shadow-emerald-950/60 transition-all flex items-center justify-center cursor-pointer"
            >
              সম্পন্ন (Complete Sale / New Sale)
            </button>

            {/* Secondary Option: Print Invoice Receipt */}
            <button
              id="btn-print-receipt"
              onClick={() => {
                clearCart();
                setDiscountPercent('0');
                setShowPrintInvoice(true);
              }}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-teal-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>রশিদ প্রিন্ট করুন (Print Receipt)</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Brand / Add Other Product Modal */}
      <AddBrandModal
        isOpen={showAddBrandModal}
        onClose={() => setShowAddBrandModal(false)}
        onGoHome={onGoHome || onBack}
        onProductAdded={(name) => {
          searchBarRef.current?.setSearchQuery(name);
        }}
      />

      {/* Printable Thermal Receipt Modal */}
      {showPrintInvoice && completedSale && (
        <PrintableInvoiceModal
          isOpen={showPrintInvoice}
          onClose={() => {
            setShowPrintInvoice(false);
            handleFinishSale();
          }}
          sale={completedSale}
        />
      )}

      {/* Fast Floating / Compact On-Screen Numpad Modal */}
      <QuantityNumpadModal
        isOpen={isNumpadOpen}
        medicine={activeNumpadMedicine}
        initialQuantity={numpadInitialQty}
        theme="teal"
        onConfirm={handleConfirmNumpadQuantity}
        onClose={handleCloseNumpad}
      />
    </div>
  );
};

export const SalesView = EasySalesView;

