import React, { useState, useMemo, useDeferredValue } from 'react';
import { Medicine } from '../types';
import { usePharmacy } from '../context/PharmacyContext';

export interface MedicineSearchProps {
  medicines?: Medicine[];
  onSelect?: (medicine: Medicine) => void;
  placeholder?: string;
  className?: string;
}

const MedicineSearchResultItem = React.memo<{
  med: Medicine;
  onSelect?: (med: Medicine) => void;
}>(({ med, onSelect }) => {
  const isOutOfStock = (med.stockQuantity || 0) <= 0;
  const isLowStock = (med.stockQuantity || 0) > 0 && (med.stockQuantity || 0) <= (med.minStockThreshold || 15);

  return (
    <li
      onClick={() => onSelect?.(med)}
      className="flex flex-col gap-1 p-3 mb-2 rounded-lg bg-gray-800/50 hover:bg-gray-800/80 border border-gray-700/60 hover:border-emerald-500/40 text-left transition-all cursor-pointer last:mb-0 shadow-xs"
    >
      {/* Top row: Medicine title, strength/dosage, selling price */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center flex-wrap gap-1.5 min-w-0">
          <span className="font-bold text-sm text-white leading-snug">
            {med.name}
          </span>
          {med.strength && (
            <span className="inline-flex items-center text-[10px] leading-none px-2 py-0.5 rounded-md bg-teal-900/60 text-teal-200 border border-teal-700/50 font-mono font-medium shrink-0">
              {med.strength}
            </span>
          )}
        </div>
        <div className="text-right shrink-0">
          <span className="text-emerald-400 font-bold text-xs bg-emerald-950/60 px-2 py-1 rounded border border-emerald-500/30 font-mono leading-none block">
            ৳{Number(med.sellingPrice || 0).toFixed(1)}
          </span>
        </div>
      </div>

      {/* Middle row: Generic Name & Manufacturer */}
      <div className="text-xs leading-normal text-emerald-400/90 font-medium">
        Generic: {med.genericName || (med as any).generic || 'N/A'}
        {med.manufacturer && (
          <span className="text-gray-400 text-[11px] ml-1.5">({med.manufacturer})</span>
        )}
      </div>

      {/* Bottom row: Stock badge */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-700/40 mt-0.5 text-[11px]">
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
        {med.category && (
          <span className="text-[10px] text-teal-300/70 font-mono leading-tight">
            {med.category}
          </span>
        )}
      </div>
    </li>
  );
});

export function MedicineSearch({
  medicines: propMedicines,
  onSelect,
  placeholder = 'Search by Brand (Aro, Max, 360-ml) or Generics',
  className = '',
}: MedicineSearchProps) {
  const { medicines: contextMedicines } = usePharmacy();
  const masterMedicines = useMemo(() => {
    if (propMedicines && propMedicines.length > 0) {
      return propMedicines;
    }
    return contextMedicines || [];
  }, [propMedicines, contextMedicines]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(value.trim().length > 0);
  };

  const deferredSearch = useDeferredValue(searchTerm);

  const filteredMedicines = useMemo(() => {
    if (!deferredSearch.trim()) return [];
    const query = deferredSearch.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const rawQuery = deferredSearch.toLowerCase().trim();

    const matches = masterMedicines.filter((m) => {
      if (!m) return false;
      const brand = (m.name || (m as any).brandName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const generic = (m.genericName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (brand.includes(query) || generic.includes(query)) return true;

      const rawBrand = (m.name || (m as any).brandName || '').toLowerCase();
      const rawGeneric = (m.genericName || '').toLowerCase();
      if (rawBrand.includes(rawQuery) || rawGeneric.includes(rawQuery)) return true;
      if (m.barcode && m.barcode.toLowerCase().includes(rawQuery)) return true;
      return false;
    });

    return matches.slice(0, 50);
  }, [deferredSearch, masterMedicines]);

  const handleSelectItem = (med: Medicine) => {
    onSelect?.(med);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => {
          if (searchTerm.trim().length > 0) {
            setIsOpen(true);
          }
        }}
        placeholder={placeholder}
        className="w-full bg-slate-800 text-white rounded-xl px-4 py-2.5 border border-slate-700 focus:outline-hidden focus:border-emerald-500 text-sm"
      />
      {isOpen && searchTerm.trim().length > 0 && filteredMedicines.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl max-h-80 overflow-y-auto z-50 p-2.5 shadow-2xl">
          {filteredMedicines.map((med) => (
            <MedicineSearchResultItem
              key={med.id}
              med={med}
              onSelect={handleSelectItem}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default MedicineSearch;
