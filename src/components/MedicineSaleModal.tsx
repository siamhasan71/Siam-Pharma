import React, { useState, useEffect, useMemo } from 'react';
import { Medicine } from '../types';
import { X, Calendar, Minus, Plus, CopyPlus } from 'lucide-react';

interface MedicineSaleModalProps {
  isOpen: boolean;
  medicine: Medicine | null;
  initialQuantity?: number;
  initialDiscountPercent?: number;
  onClose: () => void;
  onSave: (data: {
    medicine: Medicine;
    quantity: number;
    discountPercent: number;
    salesUnitPrice: number;
    purchaseUnitPrice: number;
    batchNumber: string;
    expiryDate: string;
    isSmartSale?: boolean;
  }) => void;
}

export const MedicineSaleModal: React.FC<MedicineSaleModalProps> = ({
  isOpen,
  medicine,
  initialQuantity = 1,
  initialDiscountPercent = 0,
  onClose,
  onSave,
}) => {
  const [quantity, setQuantity] = useState<number>(initialQuantity);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [batchNo, setBatchNo] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<string>('');
  const [purchaseUnitPrice, setPurchaseUnitPrice] = useState<string>('');
  const [salesUnitPrice, setSalesUnitPrice] = useState<string>('');

  useEffect(() => {
    if (medicine) {
      setQuantity(initialQuantity || 1);
      setExpiryDate(medicine.expiryDate || '2027-09-08');
      setBatchNo(medicine.batchNumber || `mo_${Date.now()}`);
      setDiscountPercent(initialDiscountPercent ? initialDiscountPercent.toString() : '');
      setPurchaseUnitPrice(
        medicine.purchasePrice ? medicine.purchasePrice.toFixed(2) : (medicine.sellingPrice * 0.75).toFixed(2)
      );
      setSalesUnitPrice(medicine.sellingPrice ? medicine.sellingPrice.toFixed(2) : '17.50');
    }
  }, [medicine, initialQuantity, initialDiscountPercent]);

  const unitPriceNum = parseFloat(salesUnitPrice) || (medicine?.sellingPrice ?? 0);
  const discountNum = parseFloat(discountPercent) || 0;

  const totalSalesPrice = useMemo(() => {
    return unitPriceNum * quantity;
  }, [unitPriceNum, quantity]);

  const totalWithDiscount = useMemo(() => {
    const discounted = totalSalesPrice * (1 - Math.min(100, Math.max(0, discountNum)) / 100);
    return Math.max(0, discounted);
  }, [totalSalesPrice, discountNum]);

  if (!isOpen || !medicine) return null;

  const isOutOfStock = medicine.stockQuantity <= 0;

  const handleSave = () => {
    onSave({
      medicine,
      quantity: Math.max(1, quantity),
      discountPercent: discountNum,
      salesUnitPrice: unitPriceNum,
      purchaseUnitPrice: parseFloat(purchaseUnitPrice) || (medicine.purchasePrice ?? 0),
      batchNumber: batchNo.trim() || medicine.batchNumber,
      expiryDate: expiryDate || medicine.expiryDate,
      isSmartSale: isOutOfStock,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Bottom Sheet on Mobile / Centered Card on Desktop */}
      <div className="w-full max-w-md bg-[#163b36] border border-[#275d56] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-5 duration-200">
        
        {/* Top Header Matching Screenshot */}
        <div className="pt-4 pb-3 px-5 flex items-center justify-between relative">
          <div className="flex-1 text-center">
            <h2 className="text-base sm:text-lg font-bold text-[#b9d5ce] tracking-wide">
              {medicine.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-[#ff6b4a] hover:text-[#ff8366] transition-colors p-1"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dotted horizontal line matching screenshot */}
        <div className="border-b border-dotted border-teal-500/30 mx-4" />

        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
          {/* Out of Stock Alert / Smart Sale Notification Matching Screenshot */}
          {isOutOfStock ? (
            <div className="border border-[#ff6b4a] rounded-xl p-3 text-xs sm:text-sm text-[#ff8366] leading-relaxed text-center font-normal">
              This product is out of stock! Please click smart sale for direct purchase &amp; add to sales cart
            </div>
          ) : (
            <div className="border border-teal-500/40 bg-[#122e2b] rounded-xl p-2.5 text-xs text-teal-300 flex items-center justify-between px-3">
              <span>Current In-Stock:</span>
              <span className="font-bold text-emerald-400 font-mono">
                {medicine.stockQuantity} units available
              </span>
            </div>
          )}

          {/* Product Meta Details Matching Screenshot */}
          <div className="space-y-0.5 text-xs sm:text-sm text-teal-100">
            <p className="font-normal">
              Strength: <span className="font-medium text-white">{medicine.strength || medicine.dosage || '10mg'}</span>
            </p>
            <p className="font-normal">
              From: <span className="font-medium text-white">{medicine.form || medicine.category || 'Tablet'}</span>
            </p>
            <p className="font-normal">
              Pack Size: <span className="font-medium text-white">{medicine.packSize || "30's pack"}</span>
            </p>
            <p className="font-normal text-[#ff6b4a] pt-0.5">
              Approx. Unit Price: <span className="font-semibold">{medicine.sellingPrice.toFixed(2)}</span>
            </p>
          </div>

          {/* Form Fields Grid with Notched Floating Labels */}
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

            {/* 2. Quantity with Stepper */}
            <div className="relative border border-[#2e6960] rounded-xl bg-[#143732] px-2.5 pt-2.5 pb-2">
              <span className="absolute -top-2 left-2.5 bg-[#163b36] px-1 text-[10px] text-teal-300 font-medium">
                Quantity
              </span>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-6 h-6 rounded-md bg-[#22574f] hover:bg-[#2b6b61] text-teal-200 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-10 text-center bg-transparent text-white text-sm font-bold font-mono focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-6 h-6 rounded-md bg-[#22574f] hover:bg-[#2b6b61] text-teal-200 flex items-center justify-center transition-colors"
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
                placeholder="mo_1788814246646"
                className="w-full bg-transparent text-white text-xs font-mono focus:outline-hidden truncate"
              />
            </div>

            {/* 4. Discount(%) */}
            <div className="relative border border-[#2e6960] rounded-xl bg-[#143732] px-3 py-2.5 flex items-center">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="Discount(%)"
                className="w-full bg-transparent text-white text-xs placeholder-[#789c94] focus:outline-hidden"
              />
            </div>

            {/* 5. Purchase Unit Price */}
            <div className="relative border border-[#2e6960] rounded-xl bg-[#143732] px-3 py-2.5 flex items-center">
              <input
                type="number"
                step="0.01"
                value={purchaseUnitPrice}
                onChange={(e) => setPurchaseUnitPrice(e.target.value)}
                placeholder="Purchase Unit Price"
                className="w-full bg-transparent text-white text-xs placeholder-[#789c94] focus:outline-hidden"
              />
            </div>

            {/* 6. Sales Unit Price */}
            <div className="relative border border-[#2e6960] rounded-xl bg-[#143732] px-3 pt-2.5 pb-2">
              <span className="absolute -top-2 left-2.5 bg-[#163b36] px-1 text-[10px] text-teal-300 font-medium">
                Sales Unit Price
              </span>
              <input
                type="number"
                step="0.01"
                value={salesUnitPrice}
                onChange={(e) => setSalesUnitPrice(e.target.value)}
                placeholder="17.50"
                className="w-full bg-transparent text-white text-xs font-mono focus:outline-hidden font-medium"
              />
            </div>
          </div>

          {/* Pricing Summary Matching Screenshot */}
          <div className="pt-2 space-y-1.5 text-xs sm:text-sm">
            <div className="flex items-center justify-between text-[#a0c2ba]">
              <span>Total Sales Price</span>
              <span className="font-mono font-bold text-white">
                {totalSalesPrice.toFixed(2)} BDT
              </span>
            </div>
            <div className="flex items-center justify-between text-[#a0c2ba]">
              <span>Total with discount</span>
              <span className="font-mono font-bold text-white">
                {totalWithDiscount.toFixed(2)} BDT
              </span>
            </div>
          </div>

          {/* Save Button Matching Screenshot */}
          <div className="pt-2 pb-1">
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-3.5 bg-[#ff5d3b] hover:bg-[#ff4d29] active:scale-[0.98] text-white font-bold text-base rounded-2xl shadow-lg flex items-center justify-center gap-2.5 transition-all"
            >
              <CopyPlus className="w-5 h-5" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
