import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useDeferredValue,
} from 'react';
import { Search, X, Plus } from 'lucide-react';
import { Medicine } from '../types';
import { usePharmacy } from '../context/PharmacyContext';

export interface SalesSearchBarHandle {
  clearAndFocus: () => void;
  focus: () => void;
  setSearchQuery: (query: string) => void;
}

interface SalesSearchBarProps {
  medicines?: Medicine[];
  cart: { medicine: Medicine; quantity: number }[];
  onSelectMedicine: (med: Medicine) => void;
  onQuickAdd: (med: Medicine) => void;
  onOpenAddModal: (suggestedName: string) => void;
  onCheckoutTrigger: () => void;
}

interface SearchItemCardProps {
  med: Medicine;
  cartQuantity: number;
  onSelect: (med: Medicine) => void;
  onQuickAdd: (med: Medicine) => void;
}

/**
 * Normalises a string value: converts to lowercase string and trims whitespace.
 */
export const normalizeText = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  return val.toString().toLowerCase().trim();
};

/**
 * Strips out hyphens, spaces, dots, slashes, and non-alphanumeric characters.
 */
export const stripSpecialChars = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  try {
    return val
      .toString()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, '');
  } catch {
    return val
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }
};

/**
 * Utility export for other components (PurchaseView, POSBilling)
 */
export function filterMedicinesForSales(
  medicines: Medicine[] | undefined | null,
  searchInput: string
): Medicine[] {
  const query = (searchInput || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!query) return [];
  const list = medicines || [];
  const matches: Medicine[] = [];

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!item) continue;
    const brand = (item.name || (item as any).brandName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const generic = (item.genericName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const barcode = (item.barcode || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    if (brand.includes(query) || generic.includes(query) || barcode.includes(query)) {
      matches.push(item);
      if (matches.length >= 10) break;
    }
  }

  return matches;
}

/**
 * Memoized Result Row / Card
 * Prevents unnecessary re-rendering while typing
 * Uses flat colors and zero heavy CSS animations/shadows for GPU efficiency
 */
const SearchItemCard = React.memo<SearchItemCardProps>(
  ({ med, cartQuantity, onSelect, onQuickAdd }) => {
    const isOutOfStock = (med.stockQuantity || 0) <= 0;
    const isLowStock =
      (med.stockQuantity || 0) > 0 &&
      (med.stockQuantity || 0) <= (med.minStockThreshold || 15);

    return (
      <div
        id={`sales-search-item-${med.id}`}
        className="w-full flex flex-col gap-1 p-2.5 mb-1.5 rounded-lg bg-[#0e3530] hover:bg-[#13443e] border border-[#194e47] hover:border-emerald-500/50 cursor-pointer text-left last:mb-0"
        onClick={() => onSelect(med)}
      >
        {/* Top row: Medicine title, strength/dosage, in-cart badge, price */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center flex-wrap gap-1.5 min-w-0">
            <span className="font-bold text-sm text-white leading-snug">
              {med.name}
            </span>
            {med.strength && (
              <span className="inline-flex items-center text-[10px] leading-none px-2 py-0.5 rounded-md bg-teal-950 text-teal-200 border border-teal-800 font-mono font-medium shrink-0">
                {med.strength}
              </span>
            )}
            {cartQuantity > 0 && (
              <span className="inline-flex items-center text-[10px] leading-none px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono font-bold shrink-0">
                In Cart: {cartQuantity}
              </span>
            )}
          </div>

          <div className="text-right shrink-0">
            <span className="font-bold text-sm text-emerald-300 font-mono leading-snug block">
              ৳{(med.sellingPrice || 0).toFixed(1)}
            </span>
          </div>
        </div>

        {/* Middle row: Generic name & manufacturer */}
        <div className="text-xs leading-normal flex items-center flex-wrap gap-x-2 gap-y-0.5 text-teal-200/90">
          <span className="text-emerald-400/90 font-medium">
            Generic: {med.genericName || 'N/A'}
          </span>
          {med.manufacturer && (
            <>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400 text-[11px]">{med.manufacturer}</span>
            </>
          )}
        </div>

        {/* Bottom row: Stock status badge & Actions */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#1a4a44] mt-0.5 text-[11px]">
          <div className="flex items-center gap-2 flex-wrap">
            {isOutOfStock ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-800 text-[10px] font-bold leading-tight">
                Stock: 0 (Out of Stock)
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-800 text-[10px] font-bold leading-tight">
                Low Stock: {med.stockQuantity}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-teal-950 text-emerald-300 border border-teal-800 text-[10px] font-medium leading-tight">
                Stock: {med.stockQuantity ?? 0}
              </span>
            )}
            {med.category && (
              <span className="text-[10px] text-teal-300/70 font-mono leading-tight">
                {med.category}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(med);
              }}
              className="text-[11px] leading-tight text-teal-300 hover:text-white px-2 py-1 rounded bg-[#16433e] hover:bg-[#1c554e] cursor-pointer"
            >
              + Set Qty
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(med);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold leading-tight cursor-pointer"
              title={isOutOfStock ? 'Add to Cart (Zero Stock)' : 'Quick Add 1 to Cart'}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.med.id === next.med.id &&
    prev.cartQuantity === next.cartQuantity &&
    prev.med.stockQuantity === next.med.stockQuantity &&
    prev.med.sellingPrice === next.med.sellingPrice &&
    prev.onSelect === next.onSelect &&
    prev.onQuickAdd === next.onQuickAdd
);

SearchItemCard.displayName = 'SearchItemCard';

/**
 * Zero-Lag 60 FPS Sales Search Bar:
 * - Separates input state from filtering state.
 * - Wraps the search term with useDeferredValue for synchronous keyboard input.
 * - Pure String Comparison: Normalized query computed only when deferredQuery changes via useMemo.
 * - Results rows memoized with React.memo and strict equality.
 * - Render Cap: Limited to maximum 10 items for instantaneous rendering.
 * - Disabled heavy CSS animations, complex box-shadows, and layout shifts.
 */
export const SalesSearchBar = forwardRef<SalesSearchBarHandle, SalesSearchBarProps>(
  (
    {
      medicines: propMedicines,
      cart,
      onSelectMedicine,
      onQuickAdd,
      onOpenAddModal,
      onCheckoutTrigger,
    },
    ref
  ) => {
    const { medicines: contextMedicines } = usePharmacy();
    const masterMedicines = useMemo(() => {
      if (propMedicines && propMedicines.length > 0) {
        return propMedicines;
      }
      return contextMedicines || [];
    }, [propMedicines, contextMedicines]);

    // 1. Separate Input State from Filtering State
    const [inputVal, setInputVal] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    // 2. Use useDeferredValue: prioritize keyboard input immediately at 60 FPS
    const deferredQuery = useDeferredValue(inputVal);

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 3. Pure String Comparison: Normalized query is computed only when deferredQuery changes
    const normalizedQuery = useMemo(() => {
      const q = deferredQuery.trim();
      if (!q) return '';
      return q.toLowerCase().replace(/[^a-z0-9]/g, '');
    }, [deferredQuery]);

    // 4. Filter calculation using cached normalizedQuery, capped at 10 items for zero-lag rendering
    const filteredMedicines = useMemo(() => {
      if (!normalizedQuery) return [];

      const list = masterMedicines;
      const results: Medicine[] = [];

      for (let i = 0; i < list.length; i++) {
        const m = list[i];
        if (!m) continue;
        const brand = (m.name || (m as any).brandName || '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        const generic = (m.genericName || '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        const barcode = (m.barcode || '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');

        if (
          brand.includes(normalizedQuery) ||
          generic.includes(normalizedQuery) ||
          barcode.includes(normalizedQuery)
        ) {
          results.push(m);
          // Render Cap (Max 10 Items) for instantaneous DOM paint
          if (results.length >= 10) break;
        }
      }

      return results;
    }, [normalizedQuery, masterMedicines]);

    // Fast synchronous input handler: uncoupled from heavy filtering for lag-free 60 FPS typing
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputVal(value);
      setIsOpen(value.trim().length > 0);
    };

    useImperativeHandle(
      ref,
      () => ({
        clearAndFocus: () => {
          setInputVal('');
          setIsOpen(false);
          inputRef.current?.focus({ preventScroll: true });
        },
        focus: () => {
          inputRef.current?.focus({ preventScroll: true });
        },
        setSearchQuery: (query: string) => {
          setInputVal(query);
          if (query.trim().length > 0) {
            setIsOpen(true);
          }
          inputRef.current?.focus({ preventScroll: true });
        },
      }),
      []
    );

    // Dismiss dropdown on outside click
    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleOutsideClick);
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
      };
    }, []);

    // Stable callback functions to prevent child re-renders
    const handleSelectItem = useCallback(
      (med: Medicine) => {
        onSelectMedicine(med);
        setInputVal('');
        setIsOpen(false);
      },
      [onSelectMedicine]
    );

    const handleQuickAddItem = useCallback(
      (med: Medicine) => {
        onQuickAdd(med);
        setInputVal('');
        setIsOpen(false);
      },
      [onQuickAdd]
    );

    // Fast O(1) cart quantity lookup map
    const cartMap = useMemo(() => {
      const map = new Map<string, number>();
      for (let i = 0; i < cart.length; i++) {
        map.set(cart[i].medicine.id, cart[i].quantity);
      }
      return map;
    }, [cart]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (inputVal.trim() && filteredMedicines.length > 0) {
          handleSelectItem(filteredMedicines[0]);
        } else if (cart.length > 0) {
          setIsOpen(false);
          inputRef.current?.blur();
          onCheckoutTrigger();
        }
      }
    };

    const showDropdown = isOpen && inputVal.trim().length > 0;
    const isStale = deferredQuery !== inputVal;

    return (
      <div ref={containerRef} className="p-4 pb-2 relative z-30">
        <div className="relative">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-teal-300">
            <Search className="w-5 h-5" />
          </div>

          <input
            id="sales-search-input"
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={handleInputChange}
            onFocus={() => {
              if (inputVal.trim().length > 0) {
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search by Brand (Aro, Max, 360-ml) or Generics"
            className="w-full bg-[#0e3b37] text-white text-sm rounded-xl border border-[#236a64] pl-11 pr-10 py-3 placeholder-teal-200/60 focus:outline-hidden focus:border-emerald-400 font-medium"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />

          {inputVal && (
            <button
              type="button"
              onClick={() => {
                setInputVal('');
                setIsOpen(false);
                inputRef.current?.focus({ preventScroll: true });
              }}
              className="absolute inset-y-0 right-3 flex items-center text-teal-300 hover:text-white cursor-pointer"
              title="Clear Search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Instant Search drop-down list (Flat background, no blur, no heavy shadows) */}
        {showDropdown && (
          <div
            id="sales-search-dropdown-menu"
            className="absolute left-4 right-4 mt-1 bg-[#0a2723] border border-[#1f665f] rounded-xl overflow-hidden z-40"
          >
            <div className="px-3.5 py-1.5 bg-[#0e3b37] border-b border-[#1f665f] text-[11px] text-teal-300/80 flex items-center justify-between">
              <span className="font-medium">
                Matching Medicines ({filteredMedicines.length})
                {isStale && (
                  <span className="ml-2 text-teal-400/60 italic text-[10px]">Filtering...</span>
                )}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Top 10 Matches</span>
            </div>

            {filteredMedicines.length > 0 ? (
              <div className="max-h-[340px] overflow-y-auto p-2">
                {filteredMedicines.map((med) => (
                  <SearchItemCard
                    key={med.id}
                    med={med}
                    cartQuantity={cartMap.get(med.id) || 0}
                    onSelect={handleSelectItem}
                    onQuickAdd={handleQuickAddItem}
                  />
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-teal-200">
                <p className="text-teal-200/80 mb-2">No matching medicine found for "{inputVal}".</p>
                <p className="text-[11px] text-teal-300/60 mb-2.5">Searched across brand name, generic composition, and barcode.</p>
                <button
                  type="button"
                  onClick={() => {
                    onOpenAddModal(inputVal);
                    setInputVal('');
                    setIsOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-emerald-100 font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add "{inputVal}" as New Medicine
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

SalesSearchBar.displayName = 'SalesSearchBar';
export default SalesSearchBar;
