import React, { useState, useEffect, useMemo } from 'react';
import { Medicine } from '../types';
import { X, Calendar, Minus, Plus, PackageCheck } from 'lucide-react';

interface MedicinePurchaseModalProps {
  isOpen: boolean;
  medicine: Medicine | null;
  initialQuantity?: number;
  initialPurchasePrice?: number;
  initialSalesPrice?: number;
  onClose: () => void;
  onSave: (data: {
    medicine: Medicine;
    quantity: number;
    purchaseUnitPrice: number;
    salesUnitPrice: number;
    batchNumber: string;
    expiryDate: string;
  }) => void;
}

export const MedicinePurchaseModal: React.FC<MedicinePurchaseModalProps> = ({
  isOpen,
  medicine,
  initialQuantity = 10,
  initialPurchasePrice,
  initialSalesPrice,
  onClose,
  onSave,
}) => {
  // State declaration
  const [quantity, setQuantity] = useState<number | ''>(initialQuantity || 1);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [batchNo, setBatchNo] = useState<string>('');
  const [purchaseUnitPrice, setPurchaseUnitPrice] = useState<string>('');
  const [salesUnitPrice, setSalesUnitPrice] = useState<string>('');

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
    }
  };

  // Reset to minimum 1 when user clicks away
  const handleBlur = () => {
    if (quantity === '' || quantity < 1) {
      setQuantity(1);
    }
  };

  // Increment / Decrement Handlers
  const handleIncrement = () => setQuantity((prev) => (Number(prev) || 0) + 1);
  const handleDecrement = () => setQuantity((prev) => Math.max(1, (Number(prev) || 1) - 1));

  useEffect(() => {
    if (medicine) {
      setQuantity(initialQuantity || 10);
      setExpiryDate(medicine.expiryDate || '2028-12-31');
      setBatchNo(medicine.batchNumber || `PO_${Date.now().toString().slice(-6)}`);
      
      const defaultCost = initialPurchasePrice !== undefined 
        ? initialPurchasePrice 
        : medicine.purchasePrice || (medicine.sellingPrice * 0.75);
      setPurchaseUnitPrice(defaultCost.toFixed(2));

      const defaultSell = initialSalesPrice !== undefined 
        ? initialSalesPrice 
        : medicine.sellingPrice || 20.00;
      setSalesUnitPrice(defaultSell.toFixed(2));
    }
  }, [medicine, initialQuantity, initialPurchasePrice, initialSalesPrice]);

  const costNum = parseFloat(purchaseUnitPrice) || (medicine?.purchasePrice ?? 0);
  const totalCost = useMemo(() => {
    return costNum * (Number(quantity) || 0);
  }, [costNum, quantity]);

  if (!isOpen || !medicine) return null;

  const handleSave = () => {
    onSave({
      medicine,
      quantity: Math.max(1, Number(quantity) || 1),
      purchaseUnitPrice: Math.max(0.01, costNum),
      salesUnitPrice: parseFloat(salesUnitPrice) || (medicine.sellingPrice ?? 0),
      batchNumber: batchNo.trim() || medicine.batchNumber,
      expiryDate: expiryDate.trim() || medicine.expiryDate,
    });
    onClose();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-[#163b36] border border-[#275d56] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-5 duration-200">
        {/* Header */}
        <div className="pt-4 pb-3 px-5 flex items-center justify-between relative">
          <div className="flex-1 text-center">
            <h2 className="text-base sm:text-lg font-bold text-[#b9d5ce] tracking-wide">
              {medicine.name}
            </h2>
            <span className="text-[11px] text-teal-300/80">Purchase / Restock Details</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 text-[#ff6b4a] hover:text-[#ff8366] transition-colors p-1 cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dotted horizontal line */}
        <div className="border-b border-dotted border-teal-500/30 mx-4" />

        <form onSubmit={handleFormSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
          {/* Current Stock Banner */}
          <div className="border border-teal-500/40 bg-[#122e2b] rounded-xl p-2.5 text-xs text-teal-300 flex items-center justify-between px-3">
            <span>Current Stock in Inventory:</span>
            <span className="font-bold text-emerald-400 font-mono">
              {medicine.stockQuantity} units
            </span>
          </div>

          {/* Product Meta Details */}
          <div className="space-y-0.5 text-xs sm:text-sm text-teal-100">
            <p className="font-normal">
              Generic: <span className="font-medium text-white">{medicine.genericName}</span>
            </p>
            <p className="font-normal">
              Company: <span className="font-medium text-white">{medicine.manufacturer}</span>
            </p>
            <p className="font-normal">
              Pack Size: <span className="font-medium text-white">{medicine.packSize || "10's pack"}</span>
            </p>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* 1. Expire Date */}
            <div className="relative border border-[#2e6960] rounded-xl bg-[#143732] px-3 pt-2.5 pb-2">
              <span className="absolute -top-2 left-2.5 bg-[#163b36] px-1 text-[10px] text-teal-300 font-medium">
                Expire Date
              </span>
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  className="w-full bg-transparent text-white text-xs font-mono focus:outline-hidden"
                />
                <Calendar className="w-4 h-4 text-teal-400/80 shrink-0 ml-1 pointer-events-none" />
              </div>
            </div>

            {/* 2. Purchase Quantity */}
            <div className="relative border border-[#2e6960] rounded-xl bg-[#143732] px-2.5 pt-2.5 pb-2">
              <span className="absolute -top-2 left-2.5 bg-[#163b36] px-1 text-[10px] text-teal-300 font-medium">
                Quantity
              </span>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="w-6 h-6 rounded-md bg-[#22574f] hover:bg-[#2b6b61] text-teal-200 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={quantity}
                  onChange={handleQuantityChange}
                  onBlur={handleBlur}
                  className="w-12 text-center bg-transparent text-white text-sm font-bold font-mono focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="w-6 h-6 rounded-md bg-[#22574f] hover:bg-[#2b6b61] text-teal-200 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3. Batch No */}
            <div className="relative border border-[#2e6960] rounded-xl bg-[#143732] px-3 pt-2.5 pb-2">
              <span className="absolute -top-2 left-2.5 bg-[#163b36] px-1 text-[10px] text-teal-300 font-medium">
                Batch No
              </span>
              <input
                type="text"
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                placeholder="PO_12345"
                className="w-full bg-transparent text-white text-xs font-mono focus:outline-hidden truncate"
              />
            </div>

            {/* 4. Purchase Unit Price */}
            <div className="relative border border-[#2e6960] rounded-xl bg-[#143732] px-3 pt-2.5 pb-2">
              <span className="absolute -top-2 left-2.5 bg-[#163b36] px-1 text-[10px] text-teal-300 font-medium">
                Purchase Price
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={purchaseUnitPrice}
                onChange={(e) => setPurchaseUnitPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-white text-xs font-mono focus:outline-hidden font-medium"
              />
            </div>

            {/* 5. Selling Unit Price (Retail Sales Unit Price BDT) */}
            <div className="col-span-2 relative border border-[#2e6960] rounded-xl bg-[#143732] px-3 pt-2.5 pb-2">
              <span className="absolute -top-2 left-2.5 bg-[#163b36] px-1 text-[10px] text-teal-300 font-medium">
                Retail Sales Unit Price (BDT)
              </span>
              <input
                id="retail-sales-unit-price-input"
                type="number"
                step="0.01"
                min="0.01"
                enterKeyHint="done"
                value={salesUnitPrice}
                onChange={(e) => setSalesUnitPrice(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                placeholder="0.00"
                className="w-full bg-transparent text-white text-xs font-mono focus:outline-hidden font-medium"
              />
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="pt-2 space-y-1.5 text-xs sm:text-sm">
            <div className="flex items-center justify-between text-[#a0c2ba]">
              <span>Purchase Line Cost:</span>
              <span className="font-mono font-bold text-white">
                {totalCost.toFixed(2)} BDT
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-teal-300/80">
              <span>New Total Stock After Purchase:</span>
              <span className="font-mono text-emerald-300 font-semibold">
                {medicine.stockQuantity + (Number(quantity) || 0)} units
              </span>
            </div>
          </div>

          {/* Add to Purchase Order Button */}
          <div className="pt-2 pb-1">
            <button
              type="submit"
              id="btn-add-to-purchase-order"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-base rounded-2xl shadow-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <PackageCheck className="w-5 h-5" />
              <span>Add to Purchase Order</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
