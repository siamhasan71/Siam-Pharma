import React, { useState, useEffect, useRef } from 'react';
import { Medicine } from '../types';
import {
  Check,
  X,
  Plus,
  Minus,
  Pill,
  CornerDownLeft,
  AlertTriangle,
  Banknote,
  Delete,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface QuantityNumpadModalProps {
  isOpen: boolean;
  medicine: Medicine | null;
  initialQuantity?: number;
  theme?: 'teal' | 'slate';
  onConfirm: (quantity: number) => void;
  onClose: () => void;
}

export const QuantityNumpadModal: React.FC<QuantityNumpadModalProps> = ({
  isOpen,
  medicine,
  initialQuantity = 1,
  theme = 'teal',
  onConfirm,
  onClose,
}) => {
  const [rawVal, setRawVal] = useState<string>(String(initialQuantity || 1));
  const [isFreshInput, setIsFreshInput] = useState<boolean>(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state & trigger explicit auto-focus + select on open
  useEffect(() => {
    if (isOpen && medicine) {
      const startQty = initialQuantity > 0 ? initialQuantity : 1;
      setRawVal(String(startQty));
      setIsFreshInput(true);

      // Explicit focus and select call to trigger mobile soft keypad & desktop auto-select
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [isOpen, medicine, initialQuantity]);

  if (!isOpen || !medicine) return null;

  const currentQty = parseInt(rawVal, 10) || 0;
  const unitPrice = medicine.sellingPrice || 0;
  const lineTotal = (currentQty * unitPrice).toFixed(2);
  const isOverStock = medicine.stockQuantity > 0 && currentQty > medicine.stockQuantity;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsFreshInput(false);
    const val = e.target.value;
    if (val === '') {
      setRawVal('');
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0) {
      setRawVal(String(num));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleDigitPress = (digit: string) => {
    if (isFreshInput || rawVal === '' || rawVal === '0') {
      setRawVal(digit);
      setIsFreshInput(false);
    } else {
      const next = rawVal + digit;
      if (parseInt(next, 10) <= 99999) {
        setRawVal(next);
      }
    }
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setRawVal('');
    setIsFreshInput(false);
    inputRef.current?.focus();
  };

  const handleBackspace = () => {
    setIsFreshInput(false);
    if (rawVal.length > 1) {
      setRawVal(rawVal.slice(0, -1));
    } else {
      setRawVal('');
    }
    inputRef.current?.focus();
  };

  const handleStep = (delta: number) => {
    setIsFreshInput(false);
    const base = parseInt(rawVal, 10) || 1;
    const next = Math.max(1, base + delta);
    setRawVal(String(next));
    inputRef.current?.focus();
  };

  const handlePreset = (qty: number) => {
    setRawVal(String(qty));
    setIsFreshInput(false);
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  };

  const handleConfirm = () => {
    const finalQty = Math.max(1, parseInt(rawVal, 10) || 1);
    onConfirm(finalQty);
  };

  const isTeal = theme === 'teal';

  // Quick preset pills
  const presets = [1, 2, 5, 10, 20, 30];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl border flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150 ${
          isTeal
            ? 'bg-[#103b37] border-[#226861] text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header: Medicine Info + Close */}
        <div
          className={`px-4 py-3 border-b flex items-start justify-between gap-2 ${
            isTeal ? 'bg-[#0d332f] border-[#1c554f]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm sm:text-base leading-tight truncate">
                {medicine.name}
              </span>
              {medicine.strength && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    isTeal
                      ? 'bg-[#1a5a54] text-teal-200 border border-[#246e67]'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {medicine.strength}
                </span>
              )}
            </div>
            <p
              className={`text-xs mt-0.5 truncate ${
                isTeal ? 'text-teal-200/80' : 'text-slate-500'
              }`}
            >
              {medicine.genericName} • Stock: <strong>{medicine.stockQuantity}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
              isTeal
                ? 'bg-[#154641] hover:bg-[#1a5a54] text-teal-200 hover:text-white'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Central Display: Quantity Input + Steppers + Line Total */}
        <div className="p-4 space-y-3">
          {/* Overstock notice */}
          {isOverStock && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Requested quantity exceeds available stock ({medicine.stockQuantity})</span>
            </div>
          )}

          {/* Stepper + Big Numeric Input Field */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleStep(-1)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-all active:scale-95 cursor-pointer shadow-xs ${
                isTeal
                  ? 'bg-[#154a45] hover:bg-[#1d635d] text-white border border-[#247068]'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
              }`}
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="1"
                value={rawVal}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="1"
                className={`w-full h-12 text-center text-2xl font-black font-mono rounded-2xl border transition-all focus:outline-hidden shadow-inner ${
                  isTeal
                    ? 'bg-[#092825] border-[#297a72] text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
              <span
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold pointer-events-none ${
                  isTeal ? 'text-teal-300/70' : 'text-slate-400'
                }`}
              >
                {medicine.category || 'Units'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleStep(1)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-all active:scale-95 cursor-pointer shadow-xs ${
                isTeal
                  ? 'bg-[#154a45] hover:bg-[#1d635d] text-white border border-[#247068]'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
              }`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Real-time Math Summary: [Qty] x [Price] = [Total] */}
          <div
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
              isTeal ? 'bg-[#0c312d] text-teal-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <span className="flex items-center gap-1">
              <Pill className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {currentQty} × {formatCurrency(unitPrice)}
              </span>
            </span>

            <span className="flex items-center gap-1 font-mono font-bold text-sm text-emerald-400">
              <Banknote className="w-4 h-4 text-emerald-400" />
              <span>{formatCurrency(Number(lineTotal))}</span>
            </span>
          </div>

          {/* Quick Preset Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider shrink-0 mr-1 ${
                isTeal ? 'text-teal-300/70' : 'text-slate-400'
              }`}
            >
              Quick:
            </span>
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePreset(preset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs ${
                  currentQty === preset
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                    : isTeal
                    ? 'bg-[#134944] hover:bg-[#1b5d56] text-teal-100 border border-[#216760]'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Soft On-Screen Numpad Grid (3 x 4) */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigitPress(digit)}
                className={`h-11 rounded-xl font-bold font-mono text-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs ${
                  isTeal
                    ? 'bg-[#144b46] hover:bg-[#1b5e58] active:bg-[#237870] text-white border border-[#236861]'
                    : 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 border border-slate-200'
                }`}
              >
                {digit}
              </button>
            ))}

            {/* Clear Button */}
            <button
              type="button"
              onClick={handleClear}
              className={`h-11 rounded-xl font-bold text-xs tracking-wider uppercase transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs ${
                isTeal
                  ? 'bg-[#19403c] hover:bg-rose-950/60 text-rose-300 border border-rose-900/40'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              }`}
            >
              Clear
            </button>

            {/* Zero Button */}
            <button
              type="button"
              onClick={() => handleDigitPress('0')}
              className={`h-11 rounded-xl font-bold font-mono text-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs ${
                isTeal
                  ? 'bg-[#144b46] hover:bg-[#1b5e58] active:bg-[#237870] text-white border border-[#236861]'
                  : 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 border border-slate-200'
              }`}
            >
              0
            </button>

            {/* Backspace Button */}
            <button
              type="button"
              onClick={handleBackspace}
              className={`h-11 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs ${
                isTeal
                  ? 'bg-[#144b46] hover:bg-[#1b5e58] text-teal-200 border border-[#236861]'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
              title="Backspace"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Confirm Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-600/30 transition-all active:scale-98 cursor-pointer"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>Done / Set</span>
              <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-800/80 text-emerald-100 text-xs font-mono">
                <span>Enter</span>
                <CornerDownLeft className="w-3 h-3" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
