import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Medicine,
  CartItem,
  Sale,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  Customer,
  UserRole,
  User,
  UserProfile,
  PharmaCompany,
  PaymentMethod,
  OnlineOrder,
} from '../types';
import {
  INITIAL_MEDICINES,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_SALES,
  INITIAL_USERS,
  INITIAL_ONLINE_ORDERS,
} from '../data/mockData';
import { useAuth } from './AuthContext';
import {
  fetchUserProfileFromBackend,
  saveUserProfileToBackend,
  createDefaultProfileForUser,
} from '../services/userProfileService';
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
  safeLocalStorageRemove,
  idbGet,
  idbSet,
  idbDelete,
} from '../utils/persistentStorage';
import {
  getUserScopedStorageKey,
  syncDueLedgerToCloud,
  fetchDueLedgerFromCloud,
  loadDueLedgerFromIndexedDB,
  saveDueLedgerToIndexedDB,
  subscribeToSyncEngine,
  getSyncEngineState,
  SyncEngineState,
  syncSingleSaleToCloud,
  syncSinglePurchaseToCloud,
  syncSingleCustomerToCloud,
  syncSingleSupplierToCloud,
  subscribeToUserCloudData,
} from '../services/dueSyncService';
import {
  pharmacyDb,
  getAllMedicinesFromIndexedDB,
  getMedicinesCountFromIndexedDB,
  bulkAddMedicinesToIndexedDB,
  putMedicineToIndexedDB,
  deleteMedicineFromIndexedDB,
  clearAllMedicinesFromIndexedDB,
  getAlertMedicinesFromIndexedDB,
  emitStorageNotification,
} from '../db/pharmacyDb';
import { clearMedicinesFromFirebase } from '../lib/firebase';
import { savePurchaseToFirestore } from '../services/purchaseSyncService';

export const DEFAULT_PHARMA_COMPANIES: PharmaCompany[] = [
  { id: 'c1', name: 'Square Pharmaceuticals Ltd.', iconName: 'Building2', iconColor: 'text-emerald-400' },
  { id: 'c2', name: 'Beximco Pharmaceuticals Ltd.', iconName: 'Factory', iconColor: 'text-blue-400' },
  { id: 'c3', name: 'Incepta Pharmaceuticals Ltd.', iconName: 'ShieldPlus', iconColor: 'text-teal-400' },
  { id: 'c4', name: 'Opsonin Pharma Ltd.', iconName: 'Pill', iconColor: 'text-cyan-400' },
  { id: 'c5', name: 'Renata Limited', iconName: 'Sparkles', iconColor: 'text-purple-400' },
  { id: 'c6', name: 'ACI Limited', iconName: 'Building', iconColor: 'text-amber-400' },
  { id: 'c7', name: 'Healthcare Pharmaceuticals', iconName: 'Cross', iconColor: 'text-rose-400' },
  { id: 'c8', name: 'Eskayef (SK+F) Pharmaceuticals', iconName: 'Briefcase', iconColor: 'text-indigo-400' },
  { id: 'c9', name: 'Aristopharma Ltd.', iconName: 'Building2', iconColor: 'text-emerald-400' },
  { id: 'c10', name: 'The ACME Laboratories Ltd.', iconName: 'Factory', iconColor: 'text-sky-400' },
  { id: 'c11', name: 'Popular Pharmaceuticals', iconName: 'Shield', iconColor: 'text-teal-300' },
];

interface PharmacyContextType {
  // Roles & Auth
  currentUser: User;
  currentRole: UserRole;
  switchRole: (role: UserRole) => void;
  userProfile: UserProfile;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  isProfileLoading: boolean;
  refreshUserProfile: () => Promise<void>;

  // Companies Directory
  companies: PharmaCompany[];
  addCompany: (name: string, iconName?: string, customIconUrl?: string) => void;
  deleteCompany: (id: string) => void;

  // Medicines / Inventory
  medicines: Medicine[];
  totalMedicinesCount: number;
  isMedicinesLoading: boolean;
  refreshMedicines: (page?: number, pageSize?: number) => Promise<Medicine[]>;
  addMedicine: (medicine: Omit<Medicine, 'id'>) => void;
  bulkAddMedicines: (
    medicines: Array<Omit<Medicine, 'id'> | Medicine>,
    onProgress?: (progress: { loaded: number; total: number; percent: number }) => void
  ) => Promise<number> | number;
  updateMedicine: (id: string, updates: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  resetMedicinesDatabase: () => Promise<boolean>;
  restoreSampleMedicines: () => Promise<boolean>;
  inventoryStats: {
    totalItems: number;
    totalStockQty: number;
    totalPurchaseCost: number;
    totalSellingValue: number;
    potentialGrossProfit: number;
    profitMarginPercent: string;
    lowStockCount: number;
  };

  // POS / Cart
  cart: CartItem[];
  cartItems: CartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  addToCart: (medicine: Medicine, quantity?: number) => boolean;
  smartSaleAddToCart: (params: {
    medicine: Medicine;
    quantity: number;
    discountPercent?: number;
    salesUnitPrice?: number;
    purchaseUnitPrice?: number;
    batchNumber?: string;
    expiryDate?: string;
  }) => boolean;
  removeFromCart: (medicineId: string) => void;
  updateCartQuantity: (medicineId: string, quantity: number) => void;
  clearCart: () => void;
  cartDiscountPercent: number;
  setCartDiscountPercent: (discount: number) => void;
  cartTaxRate: number;
  setCartTaxRate: (rate: number) => void;
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  checkoutSale: (
    paymentMethod: PaymentMethod,
    amountTendered: number,
    saleDetails?: {
      customerId?: string;
      customerName?: string;
      customerPhone?: string;
      customerAddress?: string;
      globalDiscount?: number;
      paymentStatus?: 'Full Paid' | 'Partial Paid' | 'Full Due';
      paidAmount?: number;
      dueAmount?: number;
      customGrandTotal?: number;
      saleDate?: string;
      isOneTimeDue?: boolean;
    }
  ) => { success: boolean; sale?: Sale; error?: string };

  // Customers
  customers: Customer[];
  addCustomer: (
    customer: Omit<Customer, 'id' | 'totalPurchases' | 'totalSpent' | 'lastVisit' | 'createdAt'> & {
      id?: string;
      isOneTime?: boolean;
    }
  ) => Customer;
  settleCustomerDue: (customerId: string, amount: number, invoiceId?: string) => void;

  // Online Orders
  onlineOrders: OnlineOrder[];
  updateOnlineOrderStatus: (orderId: string, status: OnlineOrder['status']) => void;

  // Suppliers & Orders
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  addSupplier: (supplier: Omit<Supplier, 'id' | 'dueBalance'> & { id?: string }) => void;
  receivePurchaseStock: (
    supplierId: string,
    medicineId: string,
    quantity: number,
    purchasePrice: number,
    batchNumber: string,
    expiryDate: string,
    paidAmount: number
  ) => void;
  recordPurchase: (params: {
    items: Array<{
      medicineId: string;
      quantity: number;
      purchasePrice: number;
      sellingPrice?: number;
      batchNumber?: string;
      expiryDate?: string;
    }>;
    poNumber?: string;
    supplierId?: string;
    supplierName?: string;
    paidAmount?: number;
    notes?: string;
    totalAmountOverride?: number;
  }) => { success: boolean; purchaseOrder?: PurchaseOrder; error?: string };
  settleSupplierDue: (supplierId: string, amount: number, poId?: string) => void;

  // Sales History
  sales: Sale[];
  updateSaleDate: (saleId: string, newDateIso: string) => void;
  recordDirectSale: (sale: Sale) => void;

  // Alerts & Computed
  lowStockMedicines: Medicine[];
  expiredMedicines: Medicine[];
  expiringSoonMedicines: Medicine[];
  
  // Helpers
  resetToDefaultData: () => void;
  restoreAllData: (data: any) => void;

  // Cloud Auto-Sync & Multi-User Isolated Ledger
  syncState: SyncEngineState;
  triggerSyncNow: () => Promise<void>;
  isUserDataHydrated: boolean;
  restoreFromCloud: () => Promise<boolean>;
}

const PharmacyContext = createContext<PharmacyContextType | undefined>(undefined);

const STORAGE_KEYS = {
  MEDICINES: 'pharmapulse_medicines_v1',
  CUSTOMERS: 'pharmapulse_customers_v1',
  SUPPLIERS: 'pharmapulse_suppliers_v1',
  PURCHASE_ORDERS: 'pharmapulse_pos_v1',
  SALES: 'pharmapulse_sales_v1',
  ROLE: 'pharmapulse_role_v1',
  PROFILE: 'pharmapulse_profile_v1',
  COMPANIES: 'pharmapulse_companies_v1',
};

const EMPTY_PROFILE: UserProfile = {
  id: '',
  name: '',
  email: '',
  phoneCountryCode: '+880',
  phone: '',
  password: '••••••••',
  dateOfBirth: '',
  country: 'BD',
  district: '',
  thana: '',
  postOffice: '',
  village: '',
  avatarUrl: '',
  role: 'pharmacist',
};

export const PharmacyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Role
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const saved = safeLocalStorageGet<string | null>(STORAGE_KEYS.ROLE, null);
    return saved === 'pharmacist' ? 'pharmacist' : 'admin';
  });

  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);

  // User Profile dynamically initialized from user-scoped storage or fresh default
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    if (user?.uid) {
      const saved = safeLocalStorageGet<UserProfile | null>(`pharmapulse_profile_user_${user.uid}`, null);
      if (saved) return saved;
      return createDefaultProfileForUser(user.uid, user);
    }
    return EMPTY_PROFILE;
  });

  // Automatically fetch profile details of currently authenticated user from backend on load/switch
  useEffect(() => {
    if (!user || !user.uid) {
      // Clear profile completely on logout / unauthenticated
      setUserProfile(EMPTY_PROFILE);
      setIsProfileLoading(false);
      return;
    }

    let isMounted = true;
    setIsProfileLoading(true);

    fetchUserProfileFromBackend(user.uid, user)
      .then((profile) => {
        if (isMounted) {
          setUserProfile(profile);
          if (profile.role) {
            setCurrentRole(profile.role);
          }
          setIsProfileLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Could not load user profile in PharmacyProvider:', err);
        if (isMounted) {
          setIsProfileLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const refreshUserProfile = async () => {
    if (!user?.uid) return;
    setIsProfileLoading(true);
    try {
      const profile = await fetchUserProfileFromBackend(user.uid, user);
      setUserProfile(profile);
    } finally {
      setIsProfileLoading(false);
    }
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      const updated = { ...prev, ...updates };
      if (user?.uid) {
        saveUserProfileToBackend(user.uid, updates).catch((err) => {
          console.warn('Background profile save warning:', err);
        });
      }
      return updated;
    });
  };

  const currentUser = useMemo((): User => {
    return {
      id: userProfile.id || user?.uid || '',
      name: userProfile.name || user?.displayName || (user?.email ? user.email.split('@')[0] : 'User'),
      role: currentRole,
      email: userProfile.email || user?.email || '',
      avatarUrl: userProfile.avatarUrl,
    };
  }, [currentRole, userProfile, user]);

  const switchRole = (role: UserRole) => {
    setCurrentRole(role);
    safeLocalStorageSet(STORAGE_KEYS.ROLE, role);
  };

  // Companies State
  const [companies, setCompanies] = useState<PharmaCompany[]>(() => {
    const saved = safeLocalStorageGet<PharmaCompany[] | null>(STORAGE_KEYS.COMPANIES, null);
    return saved && Array.isArray(saved) && saved.length > 0 ? saved : DEFAULT_PHARMA_COMPANIES;
  });

  const addCompany = (name: string, iconName: string = 'Building2', customIconUrl?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newCompany: PharmaCompany = {
      id: `comp_${Date.now()}`,
      name: trimmed,
      iconName: iconName || 'Building2',
      iconColor: 'text-emerald-400',
      customIconUrl,
      createdAt: new Date().toISOString(),
    };
    setCompanies((prev) => {
      if (prev.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      const updated = [newCompany, ...prev];
      idbSet(STORAGE_KEYS.COMPANIES, updated);
      safeLocalStorageSet(STORAGE_KEYS.COMPANIES, updated);
      return updated;
    });
  };

  const deleteCompany = (id: string) => {
    setCompanies((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      idbSet(STORAGE_KEYS.COMPANIES, updated);
      safeLocalStorageSet(STORAGE_KEYS.COMPANIES, updated);
      return updated;
    });
  };

  // Deduplicate helper
  const deduplicateById = <T extends { id: string }>(items: T[]): T[] => {
    const seen = new Set<string>();
    const unique: T[] = [];
    for (const item of items) {
      if (item && item.id && !seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    return unique;
  };

  // Medicines State (Retains active inventory catalog synchronized with local storage and IndexedDB)
  const [medicines, setMedicines] = useState<Medicine[]>(() => {
    const isCleared = safeLocalStorageGet<boolean>('siam_pharma_db_cleared', false);
    if (isCleared) return [];
    const saved = safeLocalStorageGet<Medicine[] | null>(STORAGE_KEYS.MEDICINES, null);
    if (Array.isArray(saved)) {
      return deduplicateById(saved);
    }
    return deduplicateById(INITIAL_MEDICINES);
  });
  const [totalMedicinesCount, setTotalMedicinesCount] = useState<number>(() => {
    const isCleared = safeLocalStorageGet<boolean>('siam_pharma_db_cleared', false);
    if (isCleared) return 0;
    const saved = safeLocalStorageGet<Medicine[] | null>(STORAGE_KEYS.MEDICINES, null);
    if (Array.isArray(saved)) {
      return saved.length;
    }
    return INITIAL_MEDICINES.length;
  });
  const [isMedicinesLoading, setIsMedicinesLoading] = useState<boolean>(false);
  const [dbLowStockMedicines, setDbLowStockMedicines] = useState<Medicine[]>([]);
  const [dbExpiredMedicines, setDbExpiredMedicines] = useState<Medicine[]>([]);
  const [dbExpiringSoonMedicines, setDbExpiringSoonMedicines] = useState<Medicine[]>([]);

  // Synchronously computed & cached inventory statistics for zero-delay instant page navigation
  const inventoryStats = useMemo(() => {
    let totalStockQty = 0;
    let totalPurchaseCost = 0;
    let totalSellingValue = 0;
    let lowStockCount = 0;
    const len = medicines.length;
    for (let i = 0; i < len; i++) {
      const m = medicines[i];
      if (!m) continue;
      const q = m.stockQuantity || 0;
      totalStockQty += q;
      totalPurchaseCost += q * (m.purchasePrice || 0);
      totalSellingValue += q * (m.sellingPrice || 0);
      if (q <= (m.minStockThreshold || 15)) {
        lowStockCount++;
      }
    }
    const potentialGrossProfit = totalSellingValue - totalPurchaseCost;
    const profitMarginPercent = totalSellingValue > 0
      ? ((potentialGrossProfit / totalSellingValue) * 100).toFixed(1)
      : '0.0';
    return {
      totalItems: len || totalMedicinesCount,
      totalStockQty,
      totalPurchaseCost,
      totalSellingValue,
      potentialGrossProfit,
      profitMarginPercent,
      lowStockCount,
    };
  }, [medicines, totalMedicinesCount]);

  // Customers State
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = safeLocalStorageGet<Customer[] | null>(STORAGE_KEYS.CUSTOMERS, null);
    return saved && Array.isArray(saved) && saved.length > 0 ? saved : INITIAL_CUSTOMERS;
  });

  // Suppliers State
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = safeLocalStorageGet<Supplier[] | null>(STORAGE_KEYS.SUPPLIERS, null);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      const existingIds = new Set(saved.map((s) => s.id));
      const missingInitial = INITIAL_SUPPLIERS.filter((s) => !existingIds.has(s.id));
      return [...saved, ...missingInitial];
    }
    return INITIAL_SUPPLIERS;
  });

  // Purchase Orders State
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = safeLocalStorageGet<PurchaseOrder[] | null>(STORAGE_KEYS.PURCHASE_ORDERS, null);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      const existingIds = new Set(saved.map((p) => p.poNumber || p.id));
      const missingInitial = INITIAL_PURCHASE_ORDERS.filter(
        (p) => !existingIds.has(p.poNumber) && !existingIds.has(p.id)
      );
      return [...missingInitial, ...saved];
    }
    return INITIAL_PURCHASE_ORDERS;
  });

  // Sales State
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = safeLocalStorageGet<Sale[] | null>(STORAGE_KEYS.SALES, null);
    return saved && Array.isArray(saved) && saved.length > 0 ? saved : INITIAL_SALES;
  });

  // Online Orders State
  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>(() => {
    const saved = safeLocalStorageGet<OnlineOrder[] | null>('siam_pharma_orders_v1', null);
    return saved && Array.isArray(saved) && saved.length > 0 ? saved : INITIAL_ONLINE_ORDERS;
  });

  // Hydrate initial dataset from IndexedDB on startup (Never blocks UI rendering)
  useEffect(() => {
    let isMounted = true;

    async function hydrateFromIndexedDb() {
      try {
        // Run with micro-delay to let the browser paint the initial UI first
        await new Promise((res) => setTimeout(res, 20));
        if (!isMounted) return;

        // 1. Medicines count & catalog hydration
        try {
          const isExplicitlyCleared = safeLocalStorageGet<boolean>('siam_pharma_db_cleared', false);
          const medCount = await getMedicinesCountFromIndexedDB().catch(() => 0);
          if (medCount === 0) {
            if (!isExplicitlyCleared) {
              // Seed INITIAL_MEDICINES into Dexie IndexedDB
              await pharmacyDb.medicines.bulkPut(INITIAL_MEDICINES).catch(() => {});
              if (isMounted) {
                setTotalMedicinesCount(INITIAL_MEDICINES.length);
                setMedicines(INITIAL_MEDICINES);
              }
            } else {
              // Database was intentionally reset to 0 items
              if (isMounted) {
                setTotalMedicinesCount(0);
                setMedicines([]);
              }
            }
          } else {
            // If not explicitly cleared, check key demo medicines exist
            if (!isExplicitlyCleared) {
              try {
                const hasBexidal = await pharmacyDb.medicines.get('med-bexidal-500').catch(() => null);
                if (!hasBexidal) {
                  const bexidal = INITIAL_MEDICINES.find((m) => m.id === 'med-bexidal-500');
                  if (bexidal) await pharmacyDb.medicines.put(bexidal).catch(() => {});
                }
                const has3Bin = await pharmacyDb.medicines.get('med-3bi-n').catch(() => null);
                if (!has3Bin) {
                  const threeBin = INITIAL_MEDICINES.find((m) => m.id === 'med-3bi-n');
                  if (threeBin) await pharmacyDb.medicines.put(threeBin).catch(() => {});
                }
                const has3Gev = await pharmacyDb.medicines.get('med-3-gevcef').catch(() => null);
                if (!has3Gev) {
                  const threeGev = INITIAL_MEDICINES.find((m) => m.id === 'med-3-gevcef');
                  if (threeGev) await pharmacyDb.medicines.put(threeGev).catch(() => {});
                }
              } catch (seedErr) {
                console.warn('[PharmacyContext] Seed sync check notice:', seedErr);
              }
            }

            // Load active catalog into React state directly from IndexedDB without capping
            const allMeds = await getAllMedicinesFromIndexedDB().catch(() => []);
            if (isMounted && Array.isArray(allMeds) && allMeds.length > 0) {
              setMedicines(allMeds);
              setTotalMedicinesCount(allMeds.length);
              safeLocalStorageSet(STORAGE_KEYS.MEDICINES, allMeds);
            } else if (isMounted) {
              setTotalMedicinesCount(medCount);
            }
          }
        } catch (medHydrateErr) {
          console.warn('[PharmacyContext] Medicines hydration notice:', medHydrateErr);
          if (isMounted) {
            const isExplicitlyCleared = safeLocalStorageGet<boolean>('siam_pharma_db_cleared', false);
            if (isExplicitlyCleared) {
              setMedicines([]);
              setTotalMedicinesCount(0);
            } else {
              setMedicines(INITIAL_MEDICINES);
            }
          }
        }

        // 2. Fetch alert counts & items in background without blocking UI
        getAlertMedicinesFromIndexedDB()
          .then((alerts) => {
            if (isMounted && alerts) {
              setDbLowStockMedicines(alerts.lowStock || []);
              setDbExpiredMedicines(alerts.expired || []);
              setDbExpiringSoonMedicines(alerts.expiringSoon || []);
            }
          })
          .catch((alertErr) => {
            console.warn('[PharmacyContext] Alert medicines fetch notice:', alertErr);
          });

        // 4. Hydrate sales, customers, suppliers, purchase orders with safe fallbacks
        try {
          const idbSales = await idbGet<Sale[]>(STORAGE_KEYS.SALES).catch(() => null);
          if (isMounted && Array.isArray(idbSales) && idbSales.length > 0) {
            setSales((prev) => (idbSales.length >= prev.length ? idbSales : prev));
          }
        } catch (e) {
          console.warn('[PharmacyContext] Sales hydration notice:', e);
        }

        try {
          const idbCustomers = await idbGet<Customer[]>(STORAGE_KEYS.CUSTOMERS).catch(() => null);
          if (isMounted && Array.isArray(idbCustomers) && idbCustomers.length > 0) {
            setCustomers((prev) => (idbCustomers.length >= prev.length ? idbCustomers : prev));
          }
        } catch (e) {
          console.warn('[PharmacyContext] Customers hydration notice:', e);
        }

        try {
          const idbSuppliers = await idbGet<Supplier[]>(STORAGE_KEYS.SUPPLIERS).catch(() => null);
          if (isMounted && Array.isArray(idbSuppliers) && idbSuppliers.length > 0) {
            setSuppliers((prev) => (idbSuppliers.length >= prev.length ? idbSuppliers : prev));
          }
        } catch (e) {
          console.warn('[PharmacyContext] Suppliers hydration notice:', e);
        }

        try {
          const idbOrders = await idbGet<PurchaseOrder[]>(STORAGE_KEYS.PURCHASE_ORDERS).catch(() => null);
          if (isMounted) {
            setPurchaseOrders((prev) => {
              const currentList = Array.isArray(idbOrders) && idbOrders.length > 0 ? idbOrders : prev;
              const existingIds = new Set(currentList.map((p) => p.poNumber || p.id));
              const missingInitial = INITIAL_PURCHASE_ORDERS.filter(
                (p) => !existingIds.has(p.poNumber) && !existingIds.has(p.id)
              );
              return [...missingInitial, ...currentList];
            });
          }
        } catch (e) {
          console.warn('[PharmacyContext] Orders hydration notice:', e);
        }

        try {
          const idbCompanies = await idbGet<PharmaCompany[]>(STORAGE_KEYS.COMPANIES).catch(() => null);
          if (isMounted && Array.isArray(idbCompanies) && idbCompanies.length > 0) {
            setCompanies((prev) => (idbCompanies.length >= prev.length ? idbCompanies : prev));
          }
        } catch (e) {
          console.warn('[PharmacyContext] Companies hydration notice:', e);
        }

        try {
          const idbOnline = await idbGet<OnlineOrder[]>('siam_pharma_orders_v1').catch(() => null);
          if (isMounted && Array.isArray(idbOnline) && idbOnline.length > 0) {
            setOnlineOrders((prev) => (idbOnline.length >= prev.length ? idbOnline : prev));
          }
        } catch (e) {
          console.warn('[PharmacyContext] Online orders hydration notice:', e);
        }
      } catch (err) {
        console.warn('[PersistentStorage] Hydration top-level notice:', err);
      }
    }

    hydrateFromIndexedDb().catch((unhandled) => {
      console.warn('[PharmacyContext] Unhandled hydration error caught:', unhandled);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Cloud Sync Engine State
  const [syncState, setSyncState] = useState<SyncEngineState>(() => getSyncEngineState());

  useEffect(() => {
    const unsub = subscribeToSyncEngine((st) => {
      setSyncState(st);
    });
    return unsub;
  }, []);

  const triggerSyncNow = async () => {
    if (!user?.uid) return;
    await syncDueLedgerToCloud(user.uid, {
      customers,
      sales,
      suppliers,
      purchaseOrders,
    });
  };

  const restoreFromCloud = async (): Promise<boolean> => {
    if (!user?.uid) return false;
    try {
      const cloudData = await fetchDueLedgerFromCloud(user.uid);
      if (cloudData) {
        if (Array.isArray(cloudData.customers)) setCustomers(cloudData.customers);
        if (Array.isArray(cloudData.sales)) setSales(cloudData.sales);
        if (Array.isArray(cloudData.suppliers)) setSuppliers(cloudData.suppliers);
        if (Array.isArray(cloudData.purchaseOrders)) setPurchaseOrders(cloudData.purchaseOrders);
        return true;
      }
    } catch (e) {
      console.error('[PharmacyContext] Cloud restore error:', e);
    }
    return false;
  };

  // Synchronize active medicines to localStorage
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.MEDICINES, medicines);
  }, [medicines]);

  const [isUserDataHydrated, setIsUserDataHydrated] = useState<boolean>(false);

  // Account Data Isolation & Multi-User Privacy:
  // When user.uid changes, load user-specific ledger records
  useEffect(() => {
    if (!user?.uid) {
      setIsUserDataHydrated(true);
      return;
    }
    const activeUid = user.uid;
    let isMounted = true;
    setIsUserDataHydrated(false);

    async function loadUserLedger() {
      try {
        // 1. Check user-scoped cloud Firestore first (users/{userId}/dueLedger/snapshot)
        const cloudData = await fetchDueLedgerFromCloud(activeUid);
        if (cloudData && isMounted) {
          if (Array.isArray(cloudData.customers) && cloudData.customers.length > 0) {
            setCustomers(cloudData.customers);
          }
          if (Array.isArray(cloudData.sales) && cloudData.sales.length > 0) {
            setSales(cloudData.sales);
          }
          if (Array.isArray(cloudData.suppliers) && cloudData.suppliers.length > 0) {
            setSuppliers(cloudData.suppliers);
          }
          if (Array.isArray(cloudData.purchaseOrders) && cloudData.purchaseOrders.length > 0) {
            setPurchaseOrders(cloudData.purchaseOrders);
          }
          setIsUserDataHydrated(true);
          return;
        }

        // 2. Otherwise load from user-scoped Dexie IndexedDB
        const localData = await loadDueLedgerFromIndexedDB(activeUid);
        if (localData && isMounted) {
          if (Array.isArray(localData.customers)) setCustomers(localData.customers);
          if (Array.isArray(localData.sales)) setSales(localData.sales);
          if (Array.isArray(localData.suppliers)) setSuppliers(localData.suppliers);
          if (Array.isArray(localData.purchaseOrders)) setPurchaseOrders(localData.purchaseOrders);
          setIsUserDataHydrated(true);
          return;
        }

        // 3. If fresh account with no prior records, initialize an isolated seed for this user
        const initKey = getUserScopedStorageKey(activeUid, 'initialized');
        const alreadyInit = safeLocalStorageGet<boolean>(initKey, false);
        if (!alreadyInit) {
          safeLocalStorageSet(initKey, true);
          const userCust = INITIAL_CUSTOMERS.map((c) => ({ ...c }));
          const userSales = INITIAL_SALES.map((s) => ({ ...s }));
          const userSuppliers = INITIAL_SUPPLIERS.map((s) => ({ ...s }));
          const userPOs = INITIAL_PURCHASE_ORDERS.map((p) => ({ ...p }));
          if (isMounted) {
            setCustomers(userCust);
            setSales(userSales);
            setSuppliers(userSuppliers);
            setPurchaseOrders(userPOs);
            saveDueLedgerToIndexedDB(activeUid, {
              customers: userCust,
              sales: userSales,
              suppliers: userSuppliers,
              purchaseOrders: userPOs,
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('[PharmacyContext] User-scoped ledger load notice:', err);
      } finally {
        if (isMounted) setIsUserDataHydrated(true);
      }
    }

    loadUserLedger();

    // Attach active realtime listener to user's cloud Firestore partition
    const unsubCloudListener = subscribeToUserCloudData(activeUid, (remoteSnapshot) => {
      if (!isMounted) return;
      if (Array.isArray(remoteSnapshot.customers) && remoteSnapshot.customers.length > 0) {
        setCustomers((prev) => {
          const map = new Map(remoteSnapshot.customers.map((c) => [c.id, c]));
          prev.forEach((c) => { if (!map.has(c.id)) map.set(c.id, c); });
          return Array.from(map.values());
        });
      }
      if (Array.isArray(remoteSnapshot.sales) && remoteSnapshot.sales.length > 0) {
        setSales((prev) => {
          const map = new Map(remoteSnapshot.sales.map((s) => [s.id, s]));
          prev.forEach((s) => { if (!map.has(s.id)) map.set(s.id, s); });
          return Array.from(map.values());
        });
      }
      if (Array.isArray(remoteSnapshot.suppliers) && remoteSnapshot.suppliers.length > 0) {
        setSuppliers((prev) => {
          const map = new Map(remoteSnapshot.suppliers.map((s) => [s.id, s]));
          prev.forEach((s) => { if (!map.has(s.id)) map.set(s.id, s); });
          return Array.from(map.values());
        });
      }
      if (Array.isArray(remoteSnapshot.purchaseOrders) && remoteSnapshot.purchaseOrders.length > 0) {
        setPurchaseOrders((prev) => {
          const map = new Map(remoteSnapshot.purchaseOrders.map((p) => [p.id, p]));
          prev.forEach((p) => { if (!map.has(p.id)) map.set(p.id, p); });
          return Array.from(map.values());
        });
      }
    });

    return () => {
      isMounted = false;
      unsubCloudListener();
    };
  }, [user?.uid]);

  // Persist ledger changes with user.uid isolation & trigger automated Cloud Sync
  useEffect(() => {
    const activeUid = user?.uid;
    if (activeUid) {
      if (!isUserDataHydrated) {
        // Prevent premature local override before cloud hydration completes!
        return;
      }

      const custKey = getUserScopedStorageKey(activeUid, STORAGE_KEYS.CUSTOMERS);
      const supKey = getUserScopedStorageKey(activeUid, STORAGE_KEYS.SUPPLIERS);
      const poKey = getUserScopedStorageKey(activeUid, STORAGE_KEYS.PURCHASE_ORDERS);
      const salesKey = getUserScopedStorageKey(activeUid, STORAGE_KEYS.SALES);

      idbSet(custKey, customers);
      safeLocalStorageSet(custKey, customers);
      idbSet(supKey, suppliers);
      safeLocalStorageSet(supKey, suppliers);
      idbSet(poKey, purchaseOrders);
      safeLocalStorageSet(poKey, purchaseOrders);
      idbSet(salesKey, sales);
      safeLocalStorageSet(salesKey, sales);

      // Automated fast background sync mechanism to Firebase Cloud Storage under users/{userId}/
      const timer = setTimeout(() => {
        syncDueLedgerToCloud(activeUid, {
          customers,
          sales,
          suppliers,
          purchaseOrders,
        }).catch(() => {});
      }, 400);

      return () => clearTimeout(timer);
    } else {
      // Unauthenticated fallback
      idbSet(STORAGE_KEYS.CUSTOMERS, customers);
      safeLocalStorageSet(STORAGE_KEYS.CUSTOMERS, customers);
      idbSet(STORAGE_KEYS.SUPPLIERS, suppliers);
      safeLocalStorageSet(STORAGE_KEYS.SUPPLIERS, suppliers);
      idbSet(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);
      safeLocalStorageSet(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);
      idbSet(STORAGE_KEYS.SALES, sales);
      safeLocalStorageSet(STORAGE_KEYS.SALES, sales);
    }
  }, [customers, sales, suppliers, purchaseOrders, user?.uid]);

  useEffect(() => {
    idbSet('siam_pharma_orders_v1', onlineOrders);
    safeLocalStorageSet('siam_pharma_orders_v1', onlineOrders);
  }, [onlineOrders]);

  const updateOnlineOrderStatus = (orderId: string, status: OnlineOrder['status']) => {
    setOnlineOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  };

  const settleCustomerDue = (customerId: string, amount: number, invoiceId?: string) => {
    const payAmt = Math.max(0, amount);
    if (payAmt <= 0) return;

    let targetCustomerId = customerId;
    if (!targetCustomerId && invoiceId) {
      const foundSale = sales.find((s) => s.id === invoiceId || s.invoiceNumber === invoiceId);
      if (foundSale?.customerId) targetCustomerId = foundSale.customerId;
    }

    // 1. Update customer aggregate due balance
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === targetCustomerId || c.id === customerId
          ? { ...c, dueAmount: Math.max(0, Number(((c.dueAmount || 0) - payAmt).toFixed(2))) }
          : c
      )
    );

    // 2. Update credit sales for this customer (FIFO or specific invoice)
    setSales((prevSales) => {
      let remaining = payAmt;
      return prevSales.map((s) => {
        const isMatch = invoiceId
          ? s.id === invoiceId || s.invoiceNumber === invoiceId
          : s.customerId === customerId;
        if (!isMatch || remaining <= 0) return s;

        const currentDue =
          s.dueAmount !== undefined
            ? s.dueAmount
            : s.paymentStatus === 'Full Due'
            ? s.grandTotal || s.totalAmount || 0
            : s.paymentStatus === 'Partial Paid'
            ? Math.max(0, (s.grandTotal || s.totalAmount || 0) - (s.paidAmount || 0))
            : 0;

        if (currentDue <= 0) return s;

        const paymentToApply = Math.min(currentDue, remaining);
        remaining -= paymentToApply;
        const newDue = Math.max(0, Number((currentDue - paymentToApply).toFixed(2)));
        const newPaid = Number(((s.paidAmount || 0) + paymentToApply).toFixed(2));
        const newStatus = newDue <= 0.01 ? 'Full Paid' : 'Partial Paid';

        return {
          ...s,
          dueAmount: newDue,
          paidAmount: newPaid,
          paymentStatus: newStatus,
        };
      });
    });
  };

  // POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDiscountPercent, setCartDiscountPercent] = useState<number>(0);
  const [cartTaxRate, setCartTaxRate] = useState<number>(5); // 5% default
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>('cust-03');

  // Medicines Actions
  const refreshMedicines = async (page: number = 1, pageSize: number = 50): Promise<Medicine[]> => {
    try {
      const list = await getAllMedicinesFromIndexedDB({ page, limit: pageSize });
      setMedicines(list);
      const count = await getMedicinesCountFromIndexedDB();
      setTotalMedicinesCount(count);
      return list;
    } catch (err) {
      console.error('Refresh medicines error:', err);
      return [];
    }
  };

  const addMedicine = (data: Omit<Medicine, 'id'>) => {
    safeLocalStorageRemove('siam_pharma_db_cleared');
    const newMedicine: Medicine = {
      ...data,
      id: `med-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6)}`,
    };
    putMedicineToIndexedDB(newMedicine).catch((e) => console.error(e));
    setMedicines((prev) => [newMedicine, ...prev.filter((m) => m.id !== newMedicine.id)]);
    setTotalMedicinesCount((prev) => prev + 1);
  };

  const bulkAddMedicines = async (
    items: Array<Omit<Medicine, 'id'> | Medicine>,
    onProgress?: (progress: { loaded: number; total: number; percent: number }) => void
  ): Promise<number> => {
    if (!items || !Array.isArray(items) || items.length === 0) return 0;
    try {
      setIsMedicinesLoading(true);
      const now = Date.now();
      const newMeds: Medicine[] = items
        .filter((item) => item && typeof item === 'object')
        .map((item, idx) => {
          // Guaranteed unique string primary key id
          const id =
            'id' in item && item.id && String(item.id).trim().length > 0
              ? String(item.id).trim()
              : `med_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`;

          const rawPurchase = Number(item.purchasePrice);
          const purchasePrice = Number.isFinite(rawPurchase) && rawPurchase >= 0 ? Number(rawPurchase.toFixed(2)) : 0;

          const rawSelling = Number(item.sellingPrice);
          let sellingPrice = Number.isFinite(rawSelling) && rawSelling >= 0 ? Number(rawSelling.toFixed(2)) : 0;
          if (sellingPrice === 0 && purchasePrice > 0) {
            sellingPrice = Number((purchasePrice * 1.25).toFixed(2));
          }

          const rawStock = Number(item.stockQuantity);
          const stockQuantity = Number.isFinite(rawStock) && rawStock >= 0 ? Math.round(rawStock) : 50;

          const rawMin = Number(item.minStockThreshold);
          const minStockThreshold = Number.isFinite(rawMin) && rawMin >= 0 ? Math.round(rawMin) : 15;

          // Sanitize all text fields so undefined or null values are replaced with empty strings "" or safe defaults
          const name = item.name ? String(item.name).trim() : `Medicine ${idx + 1}`;
          const genericName = item.genericName ? String(item.genericName).trim() : name;
          const category = item.category || 'Tablet';
          const batchNumber = item.batchNumber
            ? String(item.batchNumber).trim()
            : `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          const manufacturer = item.manufacturer ? String(item.manufacturer).trim() : 'General Pharma';
          const barcode = (item as any).barcode ? String((item as any).barcode).trim() : '';
          const expiryDate = item.expiryDate
            ? String(item.expiryDate).trim()
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const unit = item.unit ? String(item.unit).trim() : 'Box';
          const shelfLocation = item.shelfLocation ? String(item.shelfLocation).trim() : 'Shelf A-1';
          const strength = item.strength ? String(item.strength).trim() : '';
          const packSize = item.packSize ? String(item.packSize).trim() : '';

          return {
            ...item,
            id,
            name,
            genericName,
            category,
            batchNumber,
            manufacturer,
            barcode,
            expiryDate,
            purchasePrice,
            sellingPrice,
            stockQuantity,
            minStockThreshold,
            unit,
            shelfLocation,
            strength,
            packSize,
          };
        });

      if (newMeds.length === 0) {
        setIsMedicinesLoading(false);
        return 0;
      }

      // Yielding chunk insertion with 10ms micro-delay directly into IndexedDB
      const res = await bulkAddMedicinesToIndexedDB(newMeds, (progressData: any) => {
        if (onProgress) {
          if (typeof progressData === 'number') {
            onProgress({
              loaded: progressData,
              total: newMeds.length,
              percent: Math.min(100, Math.round((progressData / newMeds.length) * 100)),
            });
          } else if (progressData && typeof progressData === 'object') {
            onProgress(progressData);
          }
        }
      });

      const savedCount = res && typeof res.count === 'number' ? res.count : newMeds.length;
      const isSuccess = res && typeof res.success === 'boolean' ? res.success : savedCount > 0;

      if (isSuccess && savedCount > 0) {
        safeLocalStorageRemove('siam_pharma_db_cleared');
        const newCount = await getMedicinesCountFromIndexedDB();
        setTotalMedicinesCount(newCount);
        // Refresh only the first page (50 items) for immediate UI display
        const topMeds = await getAllMedicinesFromIndexedDB({ page: 1, limit: 50 });
        setMedicines(topMeds);
        // Refresh stock alerts in background
        getAlertMedicinesFromIndexedDB().then((alerts) => {
          setDbLowStockMedicines(alerts.lowStock);
          setDbExpiredMedicines(alerts.expired);
          setDbExpiringSoonMedicines(alerts.expiringSoon);
        });
        emitStorageNotification(
          'success',
          'Import Complete',
          `Successfully saved ${savedCount.toLocaleString()} medicines to IndexedDB without UI freeze.`
        );
      }
      setIsMedicinesLoading(false);
      return savedCount;
    } catch (err: any) {
      console.error('Error during bulkAddMedicines:', err);
      setIsMedicinesLoading(false);
      emitStorageNotification('error', 'Bulk Insert Failed', err?.message || 'Storage error while saving medicines');
      return 0;
    }
  };

  const updateMedicine = (id: string, updates: Partial<Medicine>) => {
    setMedicines((prev) => {
      const target = prev.find((med) => med.id === id);
      if (target) {
        const updated = { ...target, ...updates };
        putMedicineToIndexedDB(updated).catch((e) => console.error(e));
        return prev.map((med) => (med.id === id ? updated : med));
      }
      // If item is on another page, still persist update to IndexedDB
      pharmacyDb.medicines.get(id).then((found) => {
        if (found) {
          const updated = { ...found, ...updates };
          putMedicineToIndexedDB(updated).catch((e) => console.error(e));
        }
      });
      return prev;
    });
  };

  const deleteMedicine = (id: string) => {
    deleteMedicineFromIndexedDB(id).catch((e) => console.error(e));
    setMedicines((prev) => prev.filter((med) => med.id !== id));
    setTotalMedicinesCount((prev) => Math.max(0, prev - 1));
  };

  // Cart Operations
  const addToCart = (medicine: Medicine, qty: number = 1): boolean => {
    const validQty = Math.max(1, qty);

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.medicine.id === medicine.id);
      if (existingIndex > -1) {
        const currentQty = prev[existingIndex].quantity;
        const targetQty = currentQty + validQty;
        const updatedCart = [...prev];
        const existingItem = prev[existingIndex];
        updatedCart[existingIndex] = {
          ...existingItem,
          quantity: targetQty,
          itemTotal:
            targetQty * medicine.sellingPrice * (1 - existingItem.discountPercent / 100),
        };
        return updatedCart;
      } else {
        const newItem: CartItem = {
          medicine,
          quantity: validQty,
          discountPercent: 0,
          itemTotal: validQty * medicine.sellingPrice,
        };
        return [...prev, newItem];
      }
    });

    return true;
  };

  const removeFromCart = (medicineId: string) => {
    setCart((prev) => prev.filter((item) => item.medicine.id !== medicineId));
  };

  const smartSaleAddToCart = ({
    medicine,
    quantity,
    discountPercent = 0,
    salesUnitPrice,
    purchaseUnitPrice,
    batchNumber,
    expiryDate,
  }: {
    medicine: Medicine;
    quantity: number;
    discountPercent?: number;
    salesUnitPrice?: number;
    purchaseUnitPrice?: number;
    batchNumber?: string;
    expiryDate?: string;
  }): boolean => {
    const currentPrice = salesUnitPrice ?? medicine.sellingPrice;
    const currentCost = purchaseUnitPrice ?? medicine.purchasePrice;
    const currentBatch = batchNumber || medicine.batchNumber;
    const currentExpiry = expiryDate || medicine.expiryDate;

    // Smart Sale: direct purchase replenishes or provides required stock
    if (medicine.stockQuantity < quantity) {
      const needed = Math.max(quantity, 30);
      updateMedicine(medicine.id, {
        stockQuantity: needed,
        sellingPrice: currentPrice,
        purchasePrice: currentCost,
        batchNumber: currentBatch,
        expiryDate: currentExpiry,
      });
    } else {
      updateMedicine(medicine.id, {
        sellingPrice: currentPrice,
        purchasePrice: currentCost,
        batchNumber: currentBatch,
        expiryDate: currentExpiry,
      });
    }

    const updatedMedicine: Medicine = {
      ...medicine,
      sellingPrice: currentPrice,
      purchasePrice: currentCost,
      batchNumber: currentBatch,
      expiryDate: currentExpiry,
      stockQuantity: Math.max(quantity, medicine.stockQuantity),
    };

    const itemTotal = quantity * currentPrice * (1 - discountPercent / 100);

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.medicine.id === medicine.id);
      if (existingIndex > -1) {
        const copy = [...prev];
        copy[existingIndex] = {
          medicine: updatedMedicine,
          quantity,
          discountPercent,
          itemTotal,
        };
        return copy;
      } else {
        return [
          ...prev,
          {
            medicine: updatedMedicine,
            quantity,
            discountPercent,
            itemTotal,
          },
        ];
      }
    });

    return true;
  };

  const updateCartQuantity = (medicineId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(medicineId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.medicine.id === medicineId) {
          return {
            ...item,
            quantity,
            itemTotal:
              quantity * item.medicine.sellingPrice * (1 - item.discountPercent / 100),
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setCartDiscountPercent(0);
  };

  // Checkout Sale
  const checkoutSale = (
    paymentMethod: PaymentMethod,
    amountTendered: number,
    saleDetails?: {
      customerId?: string;
      customerName?: string;
      customerPhone?: string;
      customerAddress?: string;
      globalDiscount?: number;
      paymentStatus?: 'Full Paid' | 'Partial Paid' | 'Full Due';
      paidAmount?: number;
      dueAmount?: number;
      customGrandTotal?: number;
      saleDate?: string;
      isOneTimeDue?: boolean;
    }
  ): { success: boolean; sale?: Sale; error?: string } => {
    if (cart.length === 0) {
      return { success: false, error: 'Cart is empty' };
    }

    // Verify item catalog validity (permits zero/low stock checkout)
    for (const item of cart) {
      const currentMed = medicines.find((m) => m.id === item.medicine.id);
      if (!currentMed) {
        // Fallback check in IDB or permit if item is in cart
        if (!item.medicine || !item.medicine.id) {
          return {
            success: false,
            error: `Item not recognized: ${item.medicine?.name || 'Unknown'}`,
          };
        }
      }
    }

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.medicine.sellingPrice, 0);
    const calculatedDiscountAmount = (subtotal * cartDiscountPercent) / 100;
    const finalDiscountAmount = saleDetails?.globalDiscount !== undefined ? saleDetails.globalDiscount : calculatedDiscountAmount;
    const discountedSubtotal = Math.max(0, subtotal - finalDiscountAmount);
    const taxAmount = (discountedSubtotal * cartTaxRate) / 100;
    const standardGrandTotal = Number((discountedSubtotal + taxAmount).toFixed(2));
    const grandTotal = saleDetails?.customGrandTotal !== undefined ? saleDetails.customGrandTotal : standardGrandTotal;

    const finalTendered = amountTendered >= grandTotal ? amountTendered : grandTotal;
    const changeDue = Number(Math.max(0, finalTendered - grandTotal).toFixed(2));

    const cleanPhone = (p?: string) => (p ? p.replace(/\D/g, '').slice(-10) : '');
    const selectedCustomer =
      (saleDetails?.customerId ? customers.find((c) => c.id === saleDetails.customerId) : null) ||
      (selectedCustomerId ? customers.find((c) => c.id === selectedCustomerId) : null) ||
      (saleDetails?.customerPhone && saleDetails.customerPhone !== 'N/A' && cleanPhone(saleDetails.customerPhone)
        ? customers.find((c) => cleanPhone(c.phone) && cleanPhone(c.phone) === cleanPhone(saleDetails.customerPhone))
        : null) ||
      (saleDetails?.customerName && saleDetails.customerName !== 'Unknown' && saleDetails.customerName.trim().length > 1
        ? customers.find((c) => c.name.trim().toLowerCase() === saleDetails.customerName!.trim().toLowerCase())
        : null);

    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(sales.length + 104).padStart(4, '0')}`;
    const nowIso = new Date().toISOString();

    const saleItems = cart.map((item) => ({
      medicineId: item.medicine.id,
      medicineName: item.medicine.name,
      genericName: item.medicine.genericName,
      batchNumber: item.medicine.batchNumber,
      expiryDate: item.medicine.expiryDate,
      unitPrice: item.medicine.sellingPrice,
      costPrice: item.medicine.purchasePrice,
      quantity: item.quantity,
      discountPercent: item.discountPercent,
      totalPrice: Number((item.quantity * item.medicine.sellingPrice).toFixed(2)),
    }));

    const resolvedCustomerName = selectedCustomer?.name || saleDetails?.customerName || 'Unknown';
    const resolvedCustomerPhone = selectedCustomer?.phone || saleDetails?.customerPhone || 'N/A';
    const resolvedPaymentStatus = saleDetails?.paymentStatus || 'Full Paid';
    const resolvedPaidAmount = saleDetails?.paidAmount !== undefined ? saleDetails.paidAmount : (resolvedPaymentStatus === 'Full Due' ? 0 : grandTotal);
    const resolvedDueAmount = saleDetails?.dueAmount !== undefined ? saleDetails.dueAmount : (resolvedPaymentStatus === 'Full Due' ? grandTotal : (resolvedPaymentStatus === 'Partial Paid' ? Math.max(0, grandTotal - resolvedPaidAmount) : 0));

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      invoiceNumber,
      date: saleDetails?.saleDate ? `${saleDetails.saleDate}T12:00:00Z` : nowIso,
      items: saleItems,
      subtotal: Number(subtotal.toFixed(2)),
      discountAmount: Number(finalDiscountAmount.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      taxRate: cartTaxRate,
      grandTotal,
      totalAmount: grandTotal,
      paymentMethod,
      amountTendered: finalTendered,
      changeDue,
      customerId: selectedCustomer?.id,
      customerName: resolvedCustomerName,
      customerPhone: resolvedCustomerPhone,
      cashierName: currentUser.name,
      status: 'Completed',
      paymentStatus: resolvedPaymentStatus,
      paidAmount: resolvedPaidAmount,
      dueAmount: resolvedDueAmount,
      globalDiscount: saleDetails?.globalDiscount,
    };

    // 1. Deduct sold quantities from medicines
    setMedicines((prevMedicines) =>
      prevMedicines.map((med) => {
        const soldItem = cart.find((item) => item.medicine.id === med.id);
        if (soldItem) {
          return {
            ...med,
            stockQuantity: Math.max(0, med.stockQuantity - soldItem.quantity),
          };
        }
        return med;
      })
    );

    // 2. Update customer statistics if known or if due added
    // Check if customer matches an existing Regular customer by ID or Mobile Number
    const resolvedPhoneClean = cleanPhone(resolvedCustomerPhone);

    let matchedRegularCust: Customer | undefined = undefined;
    if (selectedCustomer && !selectedCustomer.isOneTime) {
      matchedRegularCust = customers.find((c) => c.id === selectedCustomer.id && !c.isOneTime);
    }
    if (!matchedRegularCust && saleDetails?.customerId) {
      matchedRegularCust = customers.find((c) => c.id === saleDetails.customerId && !c.isOneTime);
    }
    if (!matchedRegularCust && resolvedPhoneClean && resolvedPhoneClean.length >= 7) {
      matchedRegularCust = customers.find((c) => !c.isOneTime && cleanPhone(c.phone) === resolvedPhoneClean);
    }
    if (
      !matchedRegularCust &&
      resolvedCustomerName &&
      resolvedCustomerName.trim().toLowerCase() !== 'walk-in customer' &&
      resolvedCustomerName.trim().toLowerCase() !== 'unknown' &&
      resolvedCustomerName.trim().toLowerCase() !== 'one-time customer'
    ) {
      matchedRegularCust = customers.find(
        (c) => !c.isOneTime && c.name.trim().toLowerCase() === resolvedCustomerName.trim().toLowerCase()
      );
    }

    if (matchedRegularCust) {
      // Auto-merge into existing Regular profile! DO NOT create a new entry.
      newSale.customerId = matchedRegularCust.id;
      newSale.customerName = matchedRegularCust.name;
      newSale.customerPhone = matchedRegularCust.phone || newSale.customerPhone;
      setCustomers((prevCustomers) =>
        prevCustomers.map((cust) =>
          cust.id === matchedRegularCust!.id
            ? {
                ...cust,
                totalPurchases: cust.totalPurchases + 1,
                totalSpent: Number((cust.totalSpent + grandTotal).toFixed(2)),
                dueAmount: Number(((cust.dueAmount || 0) + resolvedDueAmount).toFixed(2)),
                lastVisit: nowIso,
              }
            : cust
        )
      );
    } else if (resolvedDueAmount > 0) {
      // One-time due: list as independent transaction / one-time customer record
      const isOneTime = true;
      const newCustId = `CUST-OT-${Date.now().toString().slice(-4)}`;

      const newCust: Customer = {
        id: newCustId,
        name:
          resolvedCustomerName === 'Unknown' || !resolvedCustomerName
            ? 'Walk-in Guest'
            : resolvedCustomerName,
        phone: resolvedCustomerPhone === 'N/A' ? '' : resolvedCustomerPhone,
        address: (saleDetails as any)?.customerAddress || '',
        totalPurchases: 1,
        totalSpent: grandTotal,
        dueAmount: resolvedDueAmount,
        lastVisit: nowIso,
        createdAt: nowIso,
        isOneTime,
      };
      newSale.customerId = newCustId;
      setCustomers((prev) => [newCust, ...prev]);
    } else if (selectedCustomer) {
      setCustomers((prevCustomers) =>
        prevCustomers.map((cust) =>
          cust.id === selectedCustomer.id
            ? {
                ...cust,
                totalPurchases: cust.totalPurchases + 1,
                totalSpent: Number((cust.totalSpent + grandTotal).toFixed(2)),
                lastVisit: nowIso,
              }
            : cust
        )
      );
    }

    // 3. Add to sales log
    setSales((prevSales) => [newSale, ...prevSales]);

    // Instantly push sale and linked customer to Cloud Firestore
    if (user?.uid) {
      syncSingleSaleToCloud(user.uid, newSale).catch(() => {});
      if (selectedCustomer) {
        syncSingleCustomerToCloud(user.uid, selectedCustomer).catch(() => {});
      }
    }

    // 4. Clear cart
    clearCart();

    return { success: true, sale: newSale };
  };

  const updateSaleDate = (saleId: string, newDateIso: string) => {
    setSales((prevSales) =>
      prevSales.map((s) => {
        if (s.id === saleId || s.invoiceNumber === saleId) {
          return { ...s, date: newDateIso };
        }
        return s;
      })
    );
  };

  const recordDirectSale = (newSale: Sale) => {
    // 1. Deduct sold quantities from inventory and persist to IndexedDB
    setMedicines((prevMedicines) =>
      prevMedicines.map((med) => {
        const soldItem = newSale.items.find(
          (it) => it.medicineId === med.id || it.medicineName.toLowerCase() === med.name.toLowerCase()
        );
        if (soldItem) {
          const updatedStock = Math.max(0, med.stockQuantity - soldItem.quantity);
          const updatedMed = { ...med, stockQuantity: updatedStock };
          putMedicineToIndexedDB(updatedMed).catch((e) => console.error(e));
          return updatedMed;
        }
        return med;
      })
    );

    // 2. Track customer due if applicable
    if (newSale.dueAmount > 0 && newSale.customerName) {
      setCustomers((prev) => {
        const cleanPhone = (p?: string) => (p ? p.replace(/\D/g, '').slice(-10) : '');
        const targetPhoneClean = cleanPhone(newSale.customerPhone);

        const existingRegular = prev.find(
          (c) =>
            !c.isOneTime &&
            ((newSale.customerId && c.id === newSale.customerId) ||
              (targetPhoneClean && targetPhoneClean.length >= 7 && cleanPhone(c.phone) === targetPhoneClean) ||
              (c.name.toLowerCase() === newSale.customerName.toLowerCase() &&
                c.name.toLowerCase() !== 'walk-in customer' &&
                c.name.toLowerCase() !== 'unknown' &&
                c.name.toLowerCase() !== 'one-time customer'))
        );
        if (existingRegular) {
          return prev.map((c) =>
            c.id === existingRegular.id
              ? {
                  ...c,
                  totalPurchases: c.totalPurchases + 1,
                  totalSpent: Number((c.totalSpent + newSale.grandTotal).toFixed(2)),
                  dueAmount: Number(((c.dueAmount || 0) + newSale.dueAmount).toFixed(2)),
                  lastVisit: newSale.date,
                }
              : c
          );
        } else {
          const newCust: Customer = {
            id: newSale.customerId || `CUST-OT-${Date.now().toString().slice(-4)}`,
            name: newSale.customerName,
            phone: newSale.customerPhone || '',
            address: '',
            totalPurchases: 1,
            totalSpent: newSale.grandTotal,
            dueAmount: newSale.dueAmount,
            lastVisit: newSale.date,
            createdAt: newSale.date,
            isOneTime: true,
          };
          return [newCust, ...prev];
        }
      });
    }

    // 3. Add to sales history
    setSales((prevSales) => [newSale, ...prevSales]);

    // Instantly sync to Cloud Firestore
    if (user?.uid) {
      syncSingleSaleToCloud(user.uid, newSale).catch(() => {});
    }
  };

  // Customers
  const addCustomer = (
    customerData: Omit<Customer, 'id' | 'totalPurchases' | 'totalSpent' | 'lastVisit' | 'createdAt'> & {
      id?: string;
      isOneTime?: boolean;
    }
  ): Customer => {
    const customOrGeneratedId = customerData.id?.trim()
      ? customerData.id.trim()
      : `CUST-${1000 + customers.length + 1}`;

    const newCustomer: Customer = {
      ...customerData,
      id: customOrGeneratedId,
      totalPurchases: 0,
      totalSpent: 0,
      dueAmount: customerData.dueAmount || 0,
      lastVisit: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isOneTime: customerData.isOneTime ?? false,
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    setSelectedCustomerId(newCustomer.id);

    // Instantly sync customer to Cloud Firestore
    if (user?.uid) {
      syncSingleCustomerToCloud(user.uid, newCustomer).catch(() => {});
    }

    return newCustomer;
  };

  // Suppliers & Purchasing
  const addSupplier = (supplierData: Omit<Supplier, 'id' | 'dueBalance'> & { id?: string }) => {
    const customOrGenId = supplierData.id?.trim()
      ? supplierData.id.trim()
      : `sup-${Date.now().toString().slice(-6)}`;
    const newSupplier: Supplier = {
      ...supplierData,
      id: customOrGenId,
      dueBalance: 0,
    };
    setSuppliers((prev) => [newSupplier, ...prev]);

    // Instantly sync supplier to Cloud Firestore
    if (user?.uid) {
      syncSingleSupplierToCloud(user.uid, newSupplier).catch(() => {});
    }
  };

  const receivePurchaseStock = (
    supplierId: string,
    medicineId: string,
    quantity: number,
    purchasePrice: number,
    batchNumber: string,
    expiryDate: string,
    paidAmount: number
  ) => {
    const targetMedicine = medicines.find((m) => m.id === medicineId);
    const targetSupplier = suppliers.find((s) => s.id === supplierId);
    if (!targetMedicine || !targetSupplier) return;

    const totalCost = Number((quantity * purchasePrice).toFixed(2));
    const dueAdded = Math.max(0, totalCost - paidAmount);

    // 1. Update medicine stock & optionally batch/expiry
    setMedicines((prev) =>
      prev.map((med) => {
        if (med.id === medicineId) {
          return {
            ...med,
            stockQuantity: med.stockQuantity + quantity,
            purchasePrice: purchasePrice || med.purchasePrice,
            batchNumber: batchNumber || med.batchNumber,
            expiryDate: expiryDate || med.expiryDate,
          };
        }
        return med;
      })
    );

    // 2. Update supplier due balance
    setSuppliers((prev) =>
      prev.map((sup) => {
        if (sup.id === supplierId) {
          return {
            ...sup,
            dueBalance: Number((sup.dueBalance + dueAdded).toFixed(2)),
          };
        }
        return sup;
      })
    );

    // 3. Log purchase order
    const poNumber = `PO-${new Date().getFullYear()}-${String(purchaseOrders.length + 105).padStart(3, '0')}`;
    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber,
      supplierId,
      supplierName: targetSupplier.name,
      orderDate: new Date().toISOString(),
      receivedDate: new Date().toISOString(),
      status: 'Received',
      items: [
        {
          medicineId,
          medicineName: targetMedicine.name,
          batchNumber: batchNumber || targetMedicine.batchNumber,
          expiryDate: expiryDate || targetMedicine.expiryDate,
          quantity,
          purchasePrice,
          totalCost,
        },
      ],
      totalAmount: totalCost,
      paymentStatus: dueAdded === 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Due',
      paidAmount,
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);
  };

  const recordPurchase = (params: {
    items: Array<{
      medicineId: string;
      quantity: number;
      purchasePrice: number;
      sellingPrice?: number;
      batchNumber?: string;
      expiryDate?: string;
    }>;
    poNumber?: string;
    supplierId?: string;
    supplierName?: string;
    paidAmount?: number;
    notes?: string;
    totalAmountOverride?: number;
  }): { success: boolean; purchaseOrder?: PurchaseOrder; error?: string } => {
    if (!params.items || params.items.length === 0) {
      return { success: false, error: 'No items in purchase order' };
    }

    const poItems: PurchaseOrderItem[] = [];
    let calculatedTotal = 0;

    // Update medicines stock & prices
    setMedicines((prev) => {
      const updated = [...prev];
      for (const item of params.items) {
        const medIndex = updated.findIndex((m) => m.id === item.medicineId);
        if (medIndex > -1) {
          const med = updated[medIndex];
          const lineCost = Number((item.quantity * item.purchasePrice).toFixed(2));
          calculatedTotal += lineCost;

          poItems.push({
            medicineId: med.id,
            medicineName: med.name,
            batchNumber: item.batchNumber || med.batchNumber,
            expiryDate: item.expiryDate || med.expiryDate,
            quantity: item.quantity,
            purchasePrice: item.purchasePrice,
            totalCost: lineCost,
          });

          updated[medIndex] = {
            ...med,
            stockQuantity: med.stockQuantity + item.quantity,
            purchasePrice: item.purchasePrice,
            sellingPrice: item.sellingPrice || med.sellingPrice,
            batchNumber: item.batchNumber || med.batchNumber,
            expiryDate: item.expiryDate || med.expiryDate,
          };
        }
      }
      return updated;
    });

    const finalTotal =
      params.totalAmountOverride !== undefined && params.totalAmountOverride > 0
        ? params.totalAmountOverride
        : calculatedTotal;
    const paid = params.paidAmount !== undefined ? params.paidAmount : finalTotal;
    const due = Math.max(0, finalTotal - paid);

    const supId = params.supplierId || (suppliers[0]?.id ?? 'sup-default');
    const supName =
      params.supplierName ||
      (suppliers.find((s) => s.id === supId)?.name ?? 'Pharma Distributor Co.');

    if (due > 0 && params.supplierId) {
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === params.supplierId ? { ...s, dueBalance: Number((s.dueBalance + due).toFixed(2)) } : s
        )
      );
    }

    const poNumber =
      params.poNumber && params.poNumber.trim() !== ''
        ? params.poNumber.trim()
        : `PO-${new Date().getFullYear()}-${String(purchaseOrders.length + 106).padStart(4, '0')}`;
    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber,
      supplierId: supId,
      supplierName: supName,
      orderDate: new Date().toISOString(),
      receivedDate: new Date().toISOString(),
      status: 'Received',
      items: poItems,
      totalAmount: finalTotal,
      paymentStatus: due === 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Due',
      paidAmount: paid,
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);

    // Save every successful purchase transaction to Firebase Firestore under purchase_history collection
    try {
      savePurchaseToFirestore(newPO, currentUser?.id || currentUser?.email || 'default_store');
    } catch (syncErr) {
      console.warn('[PharmacyContext] Firestore purchase_history save notice:', syncErr);
    }

    // Instantly sync purchase order and supplier state to Cloud Firestore
    if (user?.uid) {
      syncSinglePurchaseToCloud(user.uid, newPO).catch(() => {});
      const supObj = suppliers.find((s) => s.id === supId);
      if (supObj) {
        syncSingleSupplierToCloud(user.uid, {
          ...supObj,
          dueBalance: Number(((supObj.dueBalance || 0) + due).toFixed(2)),
        }).catch(() => {});
      }
    }

    return { success: true, purchaseOrder: newPO };
  };

  const settleSupplierDue = (supplierId: string, amount: number, poId?: string) => {
    const payAmt = Math.max(0, amount);
    if (payAmt <= 0) return;

    // 1. Update supplier aggregate due balance
    setSuppliers((prev) =>
      prev.map((sup) => {
        if (sup.id === supplierId) {
          const updated = {
            ...sup,
            dueBalance: Math.max(0, Number(((sup.dueBalance || 0) - payAmt).toFixed(2))),
          };
          if (user?.uid) {
            syncSingleSupplierToCloud(user.uid, updated).catch(() => {});
          }
          return updated;
        }
        return sup;
      })
    );

    // 2. Update purchase orders for this supplier (FIFO or specific PO)
    setPurchaseOrders((prevPOs) => {
      let remaining = payAmt;
      return prevPOs.map((po) => {
        const isMatch = poId ? po.id === poId || po.poNumber === poId : po.supplierId === supplierId;
        if (!isMatch || remaining <= 0) return po;

        const poDue = Math.max(0, po.totalAmount - (po.paidAmount || 0));
        if (poDue <= 0) return po;

        const paymentToApply = Math.min(poDue, remaining);
        remaining -= paymentToApply;
        const newPaid = Number(((po.paidAmount || 0) + paymentToApply).toFixed(2));
        const newDue = Math.max(0, po.totalAmount - newPaid);
        const newStatus = newDue <= 0.01 ? 'Paid' : 'Partial';

        return {
          ...po,
          paidAmount: newPaid,
          paymentStatus: newStatus,
        };
      });
    });
  };

  // Alerts & Computed Logic
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const lowStockMedicines = useMemo(() => {
    if (dbLowStockMedicines.length > 0) return dbLowStockMedicines;
    return medicines.filter((m) => m.stockQuantity <= m.minStockThreshold);
  }, [dbLowStockMedicines, medicines]);

  const expiredMedicines = useMemo(() => {
    if (dbExpiredMedicines.length > 0) return dbExpiredMedicines;
    return medicines.filter((m) => m.expiryDate < todayStr);
  }, [dbExpiredMedicines, medicines, todayStr]);

  const expiringSoonMedicines = useMemo(() => {
    if (dbExpiringSoonMedicines.length > 0) return dbExpiringSoonMedicines;
    const today = new Date();
    const in60Days = new Date();
    in60Days.setDate(today.getDate() + 60);
    const in60DaysStr = in60Days.toISOString().split('T')[0];

    return medicines.filter((m) => m.expiryDate >= todayStr && m.expiryDate <= in60DaysStr);
  }, [dbExpiringSoonMedicines, medicines, todayStr]);

  const resetToDefaultData = () => {
    safeLocalStorageRemove('siam_pharma_db_cleared');
    setMedicines(INITIAL_MEDICINES);
    setCustomers(INITIAL_CUSTOMERS);
    setSuppliers(INITIAL_SUPPLIERS);
    setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
    setSales(INITIAL_SALES);
    setCart([]);
    safeLocalStorageRemove(STORAGE_KEYS.MEDICINES);
    safeLocalStorageRemove(STORAGE_KEYS.CUSTOMERS);
    safeLocalStorageRemove(STORAGE_KEYS.SUPPLIERS);
    safeLocalStorageRemove(STORAGE_KEYS.PURCHASE_ORDERS);
    safeLocalStorageRemove(STORAGE_KEYS.SALES);
    idbDelete(STORAGE_KEYS.MEDICINES);
    idbDelete(STORAGE_KEYS.CUSTOMERS);
    idbDelete(STORAGE_KEYS.SUPPLIERS);
    idbDelete(STORAGE_KEYS.PURCHASE_ORDERS);
    idbDelete(STORAGE_KEYS.SALES);
  };

  const resetMedicinesDatabase = async (): Promise<boolean> => {
    setIsMedicinesLoading(true);
    try {
      // 1. Clear Dexie IndexedDB table
      await clearAllMedicinesFromIndexedDB();

      // 2. Clear LocalStorage and record explicit clear state
      safeLocalStorageSet(STORAGE_KEYS.MEDICINES, []);
      safeLocalStorageSet('siam_pharma_db_cleared', true);
      idbDelete(STORAGE_KEYS.MEDICINES);

      // 3. Reset React states
      setMedicines([]);
      setTotalMedicinesCount(0);
      setDbLowStockMedicines([]);
      setDbExpiredMedicines([]);
      setDbExpiringSoonMedicines([]);
      clearCart();

      // 4. Update Firebase Cloud backup
      clearMedicinesFromFirebase().catch((fbErr) => {
        console.warn('[PharmacyContext] Firebase clear notice:', fbErr);
      });

      emitStorageNotification(
        'success',
        'Database Reset Complete',
        'All products deleted. Ready for fresh inventory.'
      );
      return true;
    } catch (err: any) {
      console.error('[PharmacyContext] resetMedicinesDatabase error:', err);
      emitStorageNotification('error', 'Reset Failed', err?.message || 'Could not reset medicines database');
      return false;
    } finally {
      setIsMedicinesLoading(false);
    }
  };

  const restoreSampleMedicines = async (): Promise<boolean> => {
    setIsMedicinesLoading(true);
    try {
      safeLocalStorageRemove('siam_pharma_db_cleared');
      await clearAllMedicinesFromIndexedDB();
      await pharmacyDb.medicines.bulkPut(INITIAL_MEDICINES).catch(() => {});
      safeLocalStorageSet(STORAGE_KEYS.MEDICINES, INITIAL_MEDICINES);
      setMedicines(INITIAL_MEDICINES);
      setTotalMedicinesCount(INITIAL_MEDICINES.length);
      getAlertMedicinesFromIndexedDB().then((alerts) => {
        setDbLowStockMedicines(alerts.lowStock);
        setDbExpiredMedicines(alerts.expired);
        setDbExpiringSoonMedicines(alerts.expiringSoon);
      });
      emitStorageNotification(
        'success',
        'Sample Restored',
        `Restored ${INITIAL_MEDICINES.length} sample products to database.`
      );
      return true;
    } catch (err: any) {
      console.error('[PharmacyContext] restoreSampleMedicines error:', err);
      return false;
    } finally {
      setIsMedicinesLoading(false);
    }
  };

  const restoreAllData = (data: any) => {
    if (!data) return;
    if (Array.isArray(data.medicines) && data.medicines.length > 0) {
      setMedicines(data.medicines);
      idbSet(STORAGE_KEYS.MEDICINES, data.medicines);
      safeLocalStorageSet(STORAGE_KEYS.MEDICINES, data.medicines);
    }
    if (Array.isArray(data.sales)) {
      setSales(data.sales);
      idbSet(STORAGE_KEYS.SALES, data.sales);
      safeLocalStorageSet(STORAGE_KEYS.SALES, data.sales);
    }
    if (Array.isArray(data.customers)) {
      setCustomers(data.customers);
      idbSet(STORAGE_KEYS.CUSTOMERS, data.customers);
      safeLocalStorageSet(STORAGE_KEYS.CUSTOMERS, data.customers);
    }
    if (Array.isArray(data.suppliers)) {
      setSuppliers(data.suppliers);
      idbSet(STORAGE_KEYS.SUPPLIERS, data.suppliers);
      safeLocalStorageSet(STORAGE_KEYS.SUPPLIERS, data.suppliers);
    }
    if (Array.isArray(data.purchaseOrders)) {
      setPurchaseOrders(data.purchaseOrders);
      idbSet(STORAGE_KEYS.PURCHASE_ORDERS, data.purchaseOrders);
      safeLocalStorageSet(STORAGE_KEYS.PURCHASE_ORDERS, data.purchaseOrders);
    }
    if (Array.isArray(data.companies) && data.companies.length > 0) {
      setCompanies(data.companies);
      idbSet(STORAGE_KEYS.COMPANIES, data.companies);
      safeLocalStorageSet(STORAGE_KEYS.COMPANIES, data.companies);
    }
    if (Array.isArray(data.onlineOrders)) {
      setOnlineOrders(data.onlineOrders);
      idbSet('siam_pharma_orders_v1', data.onlineOrders);
      safeLocalStorageSet('siam_pharma_orders_v1', data.onlineOrders);
    }
    if (data.profile) {
      setUserProfile((prev) => {
        const updated = { ...prev, ...data.profile };
        if (user?.uid) {
          saveUserProfileToBackend(user.uid, data.profile).catch(() => {});
        }
        return updated;
      });
    }
  };

  return (
    <PharmacyContext.Provider
      value={{
        currentUser,
        currentRole,
        switchRole,
        userProfile,
        updateUserProfile,
        isProfileLoading,
        refreshUserProfile,
        companies,
        addCompany,
        deleteCompany,
        medicines,
        totalMedicinesCount,
        isMedicinesLoading,
        refreshMedicines,
        addMedicine,
        bulkAddMedicines,
        updateMedicine,
        deleteMedicine,
        inventoryStats,
        cart,
        cartItems: cart,
        setCartItems: setCart,
        addToCart,
        smartSaleAddToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartDiscountPercent,
        setCartDiscountPercent,
        cartTaxRate,
        setCartTaxRate,
        selectedCustomerId,
        setSelectedCustomerId,
        checkoutSale,
        customers,
        addCustomer,
        settleCustomerDue,
        onlineOrders,
        updateOnlineOrderStatus,
        suppliers,
        purchaseOrders,
        addSupplier,
        receivePurchaseStock,
        recordPurchase,
        settleSupplierDue,
        sales,
        updateSaleDate,
        recordDirectSale,
        lowStockMedicines,
        expiredMedicines,
        expiringSoonMedicines,
        resetToDefaultData,
        resetMedicinesDatabase,
        restoreSampleMedicines,
        restoreAllData,
        syncState,
        triggerSyncNow,
        isUserDataHydrated,
        restoreFromCloud,
      }}
    >
      {children}
    </PharmacyContext.Provider>
  );
};

export const usePharmacy = () => {
  const context = useContext(PharmacyContext);
  if (!context) {
    throw new Error('usePharmacy must be used within a PharmacyProvider');
  }
  return context;
};
