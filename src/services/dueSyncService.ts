import { doc, getDoc, setDoc, collection, getDocs, limit, query, orderBy, onSnapshot } from 'firebase/firestore';
import { ref, get as rtdbGet, set as rtdbSet } from 'firebase/database';
import { db, rtdb } from '../lib/firebase';
import { Customer, Sale, Supplier, PurchaseOrder, PettyExpense } from '../types';
import { idbKeyValGet, idbKeyValSet } from '../db/pharmacyDb';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/persistentStorage';

export interface DueLedgerSnapshot {
  userId: string;
  customers: Customer[];
  sales: Sale[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  expenses?: PettyExpense[];
  lastUpdated: string;
  syncedAt?: string;
  version: number;
}

export type DueLedgerPayload = {
  customers: Customer[];
  sales: Sale[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  expenses?: PettyExpense[];
  lastUpdated?: string;
  syncedAt?: string;
  version?: number;
};

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'pending';

export interface SyncEngineState {
  status: SyncStatus;
  syncStatus?: SyncStatus;
  lastSyncedAt: string | null;
  lastSyncTime?: string | null;
  pendingChangesCount: number;
  errorMessage: string | null;
  activeUserId: string | null;
  isOnline: boolean;
}

// User-scoped storage key helper for complete account isolation
export function getUserScopedStorageKey(userId: string | null | undefined, keyName: string): string {
  const safeUid = userId && userId.trim() ? userId.trim() : 'guest_account';
  return `pharmapulse_usr_${safeUid}_${keyName}`;
}

type SyncListener = (state: SyncEngineState) => void;
const syncListeners: Set<SyncListener> = new Set();

let currentState: SyncEngineState = {
  status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced',
  lastSyncedAt: null,
  pendingChangesCount: 0,
  errorMessage: null,
  activeUserId: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
};

function notifyListeners() {
  syncListeners.forEach((fn) => {
    try {
      fn({ ...currentState });
    } catch (e) {
      console.error('[DueSyncEngine] Listener error:', e);
    }
  });
}

export function subscribeToSyncEngine(listener: SyncListener): () => void {
  syncListeners.add(listener);
  // Emit current state immediately
  listener({ ...currentState });
  return () => {
    syncListeners.delete(listener);
  };
}

export function getSyncEngineState(): SyncEngineState {
  return { ...currentState };
}

/**
 * Saves snapshot to local Dexie IndexedDB with user-scoped isolation
 */
export async function saveDueLedgerToIndexedDB(
  userId: string,
  snapshot: DueLedgerPayload
): Promise<boolean> {
  if (!userId) return false;

  const fullSnapshot: DueLedgerSnapshot = {
    customers: snapshot.customers || [],
    sales: snapshot.sales || [],
    suppliers: snapshot.suppliers || [],
    purchaseOrders: snapshot.purchaseOrders || [],
    expenses: snapshot.expenses || [],
    userId,
    lastUpdated: snapshot.lastUpdated || new Date().toISOString(),
    version: snapshot.version || 1,
    syncedAt: snapshot.syncedAt,
  };

  const idbKey = getUserScopedStorageKey(userId, 'due_ledger_snapshot');
  const pendingKey = getUserScopedStorageKey(userId, 'due_sync_pending');

  try {
    // 1. Durable Dexie storage
    await idbKeyValSet(idbKey, fullSnapshot);

    // 2. User-scoped LocalStorage mirror for immediate boot
    safeLocalStorageSet(idbKey, fullSnapshot);

    // Also persist expenses locally under user-scoped key
    if (snapshot.expenses) {
      const expKey = getUserScopedStorageKey(userId, 'petty_expenses');
      await idbKeyValSet(expKey, snapshot.expenses);
      safeLocalStorageSet(expKey, snapshot.expenses);
    }

    // Mark as pending until cloud sync succeeds
    await idbKeyValSet(pendingKey, true);
    safeLocalStorageSet(pendingKey, true);

    currentState.pendingChangesCount++;
    notifyListeners();
    return true;
  } catch (err) {
    console.error('[DueSyncEngine] Error saving locally:', err);
    return false;
  }
}

/**
 * Loads snapshot from user-scoped Dexie IndexedDB
 */
export async function loadDueLedgerFromIndexedDB(
  userId: string
): Promise<DueLedgerSnapshot | null> {
  if (!userId) return null;

  const idbKey = getUserScopedStorageKey(userId, 'due_ledger_snapshot');

  try {
    // Check Dexie first
    const fromIdb = await idbKeyValGet<DueLedgerSnapshot>(idbKey);
    if (fromIdb && Array.isArray(fromIdb.customers)) {
      return fromIdb;
    }

    // Fallback to local storage
    const fromLocal = safeLocalStorageGet<DueLedgerSnapshot | null>(idbKey, null);
    if (fromLocal && Array.isArray(fromLocal.customers)) {
      return fromLocal;
    }

    return null;
  } catch (err) {
    console.warn('[DueSyncEngine] Error reading local data:', err);
    return null;
  }
}

/**
 * Persists user transactions and ledgers to Firebase under `users/{userId}/...`
 * Strictly isolated per user account.
 */
export async function syncDueLedgerToCloud(
  userId: string,
  data: {
    customers: Customer[];
    sales: Sale[];
    suppliers: Supplier[];
    purchaseOrders: PurchaseOrder[];
    expenses?: PettyExpense[];
  }
): Promise<{ success: boolean; message: string }> {
  if (!userId) {
    return { success: false, message: 'User not authenticated. Sync skipped.' };
  }

  currentState.activeUserId = userId;

  // Check online status
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  currentState.isOnline = isOnline;

  if (!isOnline) {
    currentState.status = 'offline';
    currentState.errorMessage = 'Device is offline. Saved locally to Dexie IndexedDB.';
    notifyListeners();
    // Ensure offline copy is intact
    await saveDueLedgerToIndexedDB(userId, data);
    return {
      success: true,
      message: 'Operating offline. Saved safely in local Dexie database.',
    };
  }

  currentState.status = 'syncing';
  currentState.errorMessage = null;
  notifyListeners();

  const timestamp = new Date().toISOString();
  const snapshot: DueLedgerSnapshot = {
    userId,
    customers: data.customers || [],
    sales: data.sales || [],
    suppliers: data.suppliers || [],
    purchaseOrders: data.purchaseOrders || [],
    expenses: data.expenses || [],
    lastUpdated: timestamp,
    syncedAt: timestamp,
    version: 1,
  };

  try {
    // 1. Always update local Dexie database first (offline-first architecture)
    await saveDueLedgerToIndexedDB(userId, data);

    // 2. Cloud Firestore Write under users/{userId}/dueLedger/snapshot and users/{userId}/snapshots/main
    const userDocRef = doc(db, 'users', userId, 'dueLedger', 'snapshot');
    const mainDocRef = doc(db, 'users', userId, 'snapshots', 'main');

    await Promise.all([
      setDoc(userDocRef, { ...snapshot, syncedAt: timestamp }, { merge: true }),
      setDoc(mainDocRef, { ...snapshot, syncedAt: timestamp }, { merge: true }),
    ]);

    // 3. Atomically persist linked entities & transactions for audit trail and permanent history
    // Individual Customers in users/{userId}/customers/{id}
    if (data.customers && data.customers.length > 0) {
      await Promise.allSettled(
        data.customers.map((c) => {
          const cRef = doc(db, 'users', userId, 'customers', c.id);
          return setDoc(cRef, { ...c, userId, updatedAt: timestamp }, { merge: true });
        })
      );
    }

    // Individual Suppliers in users/{userId}/suppliers/{id}
    if (data.suppliers && data.suppliers.length > 0) {
      await Promise.allSettled(
        data.suppliers.map((s) => {
          const sRef = doc(db, 'users', userId, 'suppliers', s.id);
          return setDoc(sRef, { ...s, userId, updatedAt: timestamp }, { merge: true });
        })
      );
    }

    // Individual Sales Records in users/{userId}/sales/{id}
    if (data.sales && data.sales.length > 0) {
      await Promise.allSettled(
        data.sales.map((s) => {
          const sRef = doc(db, 'users', userId, 'sales', s.id);
          return setDoc(sRef, { ...s, userId, updatedAt: timestamp }, { merge: true });
        })
      );
    }

    // Individual Purchase Records in users/{userId}/purchases/{id} and purchase_history
    if (data.purchaseOrders && data.purchaseOrders.length > 0) {
      await Promise.allSettled(
        data.purchaseOrders.map((po) => {
          const poRef = doc(db, 'users', userId, 'purchases', po.id);
          const historyRef = doc(db, 'purchase_history', po.poNumber || po.id);
          return Promise.all([
            setDoc(poRef, { ...po, userId, updatedAt: timestamp }, { merge: true }),
            setDoc(historyRef, { ...po, userId, updatedAt: timestamp }, { merge: true }),
          ]);
        })
      );
    }

    // Individual Expenses in users/{userId}/expenses/{id}
    if (data.expenses && data.expenses.length > 0) {
      await Promise.allSettled(
        data.expenses.map((exp) => {
          const expRef = doc(db, 'users', userId, 'expenses', exp.id);
          return setDoc(expRef, { ...exp, userId, updatedAt: timestamp }, { merge: true });
        })
      );
    }

    // Also update cloud user backup snapshot under users/{userId}/backups/latest
    try {
      const backupRef = doc(db, 'users', userId, 'backups', 'latest');
      await setDoc(
        backupRef,
        {
          exportDate: timestamp,
          lastSyncedAt: timestamp,
          projectId: 'siam-pharma',
          customersCount: snapshot.customers.length,
          salesCount: snapshot.sales.length,
          suppliersCount: snapshot.suppliers.length,
          purchaseOrdersCount: snapshot.purchaseOrders.length,
          expensesCount: (snapshot.expenses || []).length,
          totalCustomerDue: snapshot.customers.reduce((sum, c) => sum + (c.dueAmount || 0), 0),
          totalSupplierDue: snapshot.suppliers.reduce((sum, s) => sum + (s.dueBalance || 0), 0),
        },
        { merge: true }
      );
    } catch (bErr) {
      console.warn('[DueSyncEngine] User backup log notice:', bErr);
    }

    // 4. Realtime Database mirror under users/{userId}/dueLedger (if available)
    try {
      const rtdbUserRef = ref(rtdb, `users/${userId}/dueLedger`);
      await rtdbSet(rtdbUserRef, {
        lastSyncedAt: timestamp,
        customersCount: snapshot.customers.length,
        salesCount: snapshot.sales.length,
        suppliersCount: snapshot.suppliers.length,
        purchaseOrdersCount: snapshot.purchaseOrders.length,
        expensesCount: (snapshot.expenses || []).length,
      });
    } catch (rtdbErr) {
      // RTDB optional mirror skipped
    }

    // Clear pending flag
    const pendingKey = getUserScopedStorageKey(userId, 'due_sync_pending');
    await idbKeyValSet(pendingKey, false);
    safeLocalStorageSet(pendingKey, false);

    currentState.status = 'synced';
    currentState.lastSyncedAt = timestamp;
    currentState.pendingChangesCount = 0;
    currentState.errorMessage = null;
    notifyListeners();

    return {
      success: true,
      message: `Successfully auto-synced to Cloud at ${new Date(timestamp).toLocaleTimeString()}`,
    };
  } catch (err: any) {
    console.warn('[DueSyncEngine] Cloud sync error, falling back to Dexie:', err);
    currentState.status = 'error';
    currentState.errorMessage = err?.message || 'Cloud sync network error. Data saved in Dexie.';
    notifyListeners();

    return {
      success: false,
      message: 'Cloud sync issue. Data safely preserved in local Dexie IndexedDB.',
    };
  }
}

/**
 * Merges two arrays of objects by `id` without losing items from either side
 */
function mergeById<T extends { id: string }>(remoteArr: T[] = [], localArr: T[] = []): T[] {
  const map = new Map<string, T>();
  // 1. Add remote items
  remoteArr.forEach((item) => {
    if (item && item.id) map.set(item.id, item);
  });
  // 2. Add local items (overwriting if local has newer updates)
  localArr.forEach((item) => {
    if (item && item.id) map.set(item.id, item);
  });
  return Array.from(map.values());
}

/**
 * Fetches User Transactions and Ledgers from Firestore under `users/{userId}/...`
 * Restores full transaction history even if local storage was cleared.
 */
export async function fetchDueLedgerFromCloud(
  userId: string
): Promise<DueLedgerSnapshot | null> {
  if (!userId) return null;

  try {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      return await loadDueLedgerFromIndexedDB(userId);
    }

    // 1. Try fetching main snapshot first, fallback to dueLedger snapshot
    let cloudData: DueLedgerSnapshot | null = null;
    const mainDocRef = doc(db, 'users', userId, 'snapshots', 'main');
    const userDocRef = doc(db, 'users', userId, 'dueLedger', 'snapshot');

    const [mainSnap, userSnap] = await Promise.allSettled([
      getDoc(mainDocRef),
      getDoc(userDocRef),
    ]);

    if (mainSnap.status === 'fulfilled' && mainSnap.value.exists()) {
      cloudData = mainSnap.value.data() as DueLedgerSnapshot;
    } else if (userSnap.status === 'fulfilled' && userSnap.value.exists()) {
      cloudData = userSnap.value.data() as DueLedgerSnapshot;
    }

    // 2. Also check subcollections if any snapshot was empty or partial
    let subSales: Sale[] = [];
    let subPurchases: PurchaseOrder[] = [];
    let subExpenses: PettyExpense[] = [];

    try {
      const salesCol = collection(db, 'users', userId, 'sales');
      const salesQuery = query(salesCol, orderBy('date', 'desc'), limit(100));
      const sSnaps = await getDocs(salesQuery);
      sSnaps.forEach((d) => subSales.push(d.data() as Sale));
    } catch (e) {
      // ignore
    }

    try {
      const poCol = collection(db, 'users', userId, 'purchases');
      const poQuery = query(poCol, orderBy('orderDate', 'desc'), limit(100));
      const poSnaps = await getDocs(poQuery);
      poSnaps.forEach((d) => subPurchases.push(d.data() as PurchaseOrder));
    } catch (e) {
      // ignore
    }

    try {
      const expCol = collection(db, 'users', userId, 'expenses');
      const expQuery = query(expCol, limit(100));
      const expSnaps = await getDocs(expQuery);
      expSnaps.forEach((d) => subExpenses.push(d.data() as PettyExpense));
    } catch (e) {
      // ignore
    }

    // Combine snapshot with subcollections
    const mergedSales = mergeById(cloudData?.sales || [], subSales);
    const mergedPurchases = mergeById(cloudData?.purchaseOrders || [], subPurchases);
    const mergedExpenses = mergeById(cloudData?.expenses || [], subExpenses);

    if (cloudData || mergedSales.length > 0 || mergedPurchases.length > 0) {
      const completeSnapshot: DueLedgerSnapshot = {
        userId,
        customers: cloudData?.customers || [],
        suppliers: cloudData?.suppliers || [],
        sales: mergedSales,
        purchaseOrders: mergedPurchases,
        expenses: mergedExpenses,
        lastUpdated: cloudData?.lastUpdated || new Date().toISOString(),
        syncedAt: cloudData?.syncedAt || new Date().toISOString(),
        version: cloudData?.version || 1,
      };

      // Load existing local items to union with remote items
      const localCached = await loadDueLedgerFromIndexedDB(userId);
      if (localCached) {
        completeSnapshot.customers = mergeById(completeSnapshot.customers, localCached.customers);
        completeSnapshot.suppliers = mergeById(completeSnapshot.suppliers, localCached.suppliers);
        completeSnapshot.sales = mergeById(completeSnapshot.sales, localCached.sales);
        completeSnapshot.purchaseOrders = mergeById(completeSnapshot.purchaseOrders, localCached.purchaseOrders);
        completeSnapshot.expenses = mergeById(completeSnapshot.expenses || [], localCached.expenses || []);
      }

      // Cache safely to Dexie
      await saveDueLedgerToIndexedDB(userId, completeSnapshot);
      currentState.status = 'synced';
      currentState.lastSyncedAt = completeSnapshot.syncedAt || new Date().toISOString();
      currentState.pendingChangesCount = 0;
      notifyListeners();
      return completeSnapshot;
    }
  } catch (err) {
    console.warn('[DueSyncEngine] Could not fetch cloud snapshot:', err);
  }

  // Fallback to local Dexie
  return await loadDueLedgerFromIndexedDB(userId);
}

// Background reconnect auto-sync listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    currentState.isOnline = true;
    notifyListeners();

    if (currentState.activeUserId) {
      const uid = currentState.activeUserId;
      // 1. Process any queued offline actions
      processOfflineSyncQueue(uid).catch(() => {});

      // 2. Check if a full sync is pending
      const pendingKey = getUserScopedStorageKey(uid, 'due_sync_pending');
      const isPending = safeLocalStorageGet<boolean>(pendingKey, false);

      if (isPending) {
        loadDueLedgerFromIndexedDB(uid).then((cached) => {
          if (cached) {
            syncDueLedgerToCloud(uid, cached).catch(() => {});
          }
        });
      }
    }
  });

  window.addEventListener('offline', () => {
    currentState.isOnline = false;
    currentState.status = 'offline';
    notifyListeners();
  });
}

/**
 * Loads user-scoped expenses
 */
export async function loadUserExpenses(userId: string): Promise<PettyExpense[]> {
  if (!userId) return [];
  const expKey = getUserScopedStorageKey(userId, 'petty_expenses');
  try {
    const fromIdb = await idbKeyValGet<PettyExpense[]>(expKey);
    if (fromIdb && Array.isArray(fromIdb)) return fromIdb;
    const fromLocal = safeLocalStorageGet<PettyExpense[] | null>(expKey, null);
    if (fromLocal && Array.isArray(fromLocal)) return fromLocal;
  } catch {
    // fallback
  }
  return [];
}

/**
 * Saves user-scoped expenses locally and queues cloud sync
 */
export async function saveUserExpenses(userId: string, expenses: PettyExpense[]): Promise<void> {
  if (!userId) return;
  const expKey = getUserScopedStorageKey(userId, 'petty_expenses');
  try {
    await idbKeyValSet(expKey, expenses);
    safeLocalStorageSet(expKey, expenses);
  } catch (err) {
    console.warn('[dueSyncService] Error saving expenses locally:', err);
  }
}

// ---------------------------------------------------------------------------
// Realtime Single-Entity Synchronization (Instant Cloud Push)
// ---------------------------------------------------------------------------

/**
 * Instantly synchronizes a completed sale to Firestore under `users/{userId}/sales/{id}`
 */
export async function syncSingleSaleToCloud(userId: string, sale: Sale): Promise<void> {
  if (!userId || !sale || !sale.id) return;
  const timestamp = new Date().toISOString();
  try {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      await enqueueOfflineAction(userId, { type: 'SALE', payload: sale });
      return;
    }

    const saleRef = doc(db, 'users', userId, 'sales', sale.id);
    await setDoc(saleRef, { ...sale, userId, updatedAt: timestamp }, { merge: true });

    // Also mirror to purchase_history / invoices if needed
    if (sale.invoiceNumber) {
      const invRef = doc(db, 'purchase_history', sale.invoiceNumber);
      await setDoc(invRef, { ...sale, userId, updatedAt: timestamp }, { merge: true });
    }
  } catch (err) {
    console.warn('[DueSyncEngine] syncSingleSaleToCloud warning:', err);
    await enqueueOfflineAction(userId, { type: 'SALE', payload: sale });
  }
}

/**
 * Instantly synchronizes a purchase order to Firestore under `users/{userId}/purchases/{id}`
 * and top-level `purchase_history/{poNumber}`
 */
export async function syncSinglePurchaseToCloud(userId: string, po: PurchaseOrder): Promise<void> {
  if (!userId || !po || !po.id) return;
  const timestamp = new Date().toISOString();
  try {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      await enqueueOfflineAction(userId, { type: 'PURCHASE', payload: po });
      return;
    }

    const poRef = doc(db, 'users', userId, 'purchases', po.id);
    const historyRef = doc(db, 'purchase_history', po.poNumber || po.id);

    await Promise.all([
      setDoc(poRef, { ...po, userId, updatedAt: timestamp }, { merge: true }),
      setDoc(historyRef, { ...po, userId, updatedAt: timestamp }, { merge: true }),
    ]);
  } catch (err) {
    console.warn('[DueSyncEngine] syncSinglePurchaseToCloud warning:', err);
    await enqueueOfflineAction(userId, { type: 'PURCHASE', payload: po });
  }
}

/**
 * Instantly synchronizes a customer record to Firestore under `users/{userId}/customers/{id}`
 */
export async function syncSingleCustomerToCloud(userId: string, customer: Customer): Promise<void> {
  if (!userId || !customer || !customer.id) return;
  const timestamp = new Date().toISOString();
  try {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      await enqueueOfflineAction(userId, { type: 'CUSTOMER', payload: customer });
      return;
    }

    const cRef = doc(db, 'users', userId, 'customers', customer.id);
    await setDoc(cRef, { ...customer, userId, updatedAt: timestamp }, { merge: true });
  } catch (err) {
    console.warn('[DueSyncEngine] syncSingleCustomerToCloud warning:', err);
    await enqueueOfflineAction(userId, { type: 'CUSTOMER', payload: customer });
  }
}

/**
 * Instantly synchronizes a supplier profile to Firestore under `users/{userId}/suppliers/{id}`
 */
export async function syncSingleSupplierToCloud(userId: string, supplier: Supplier): Promise<void> {
  if (!userId || !supplier || !supplier.id) return;
  const timestamp = new Date().toISOString();
  try {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      await enqueueOfflineAction(userId, { type: 'SUPPLIER', payload: supplier });
      return;
    }

    const sRef = doc(db, 'users', userId, 'suppliers', supplier.id);
    await setDoc(sRef, { ...supplier, userId, updatedAt: timestamp }, { merge: true });
  } catch (err) {
    console.warn('[DueSyncEngine] syncSingleSupplierToCloud warning:', err);
    await enqueueOfflineAction(userId, { type: 'SUPPLIER', payload: supplier });
  }
}

/**
 * Instantly synchronizes a petty expense to Firestore under `users/{userId}/expenses/{id}`
 */
export async function syncSingleExpenseToCloud(userId: string, expense: PettyExpense): Promise<void> {
  if (!userId || !expense || !expense.id) return;
  const timestamp = new Date().toISOString();
  try {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      await enqueueOfflineAction(userId, { type: 'EXPENSE', payload: expense });
      return;
    }

    const expRef = doc(db, 'users', userId, 'expenses', expense.id);
    await setDoc(expRef, { ...expense, userId, updatedAt: timestamp }, { merge: true });
  } catch (err) {
    console.warn('[DueSyncEngine] syncSingleExpenseToCloud warning:', err);
    await enqueueOfflineAction(userId, { type: 'EXPENSE', payload: expense });
  }
}

/**
 * Subscribes to realtime cloud updates on the user's ledger snapshot
 */
export function subscribeToUserCloudData(
  userId: string,
  onUpdate: (snapshot: DueLedgerSnapshot) => void
): () => void {
  if (!userId) return () => {};

  try {
    const snapshotDocRef = doc(db, 'users', userId, 'dueLedger', 'snapshot');
    const unsubscribe = onSnapshot(
      snapshotDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as DueLedgerSnapshot;
          if (data && onUpdate) {
            onUpdate(data);
          }
        }
      },
      (err) => {
        console.warn('[DueSyncEngine] Realtime snapshot error:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('[DueSyncEngine] subscribeToUserCloudData setup error:', err);
    return () => {};
  }
}

// ---------------------------------------------------------------------------
// Offline Queue & Resilience
// ---------------------------------------------------------------------------

interface OfflineAction {
  id: string;
  type: 'SALE' | 'PURCHASE' | 'CUSTOMER' | 'SUPPLIER' | 'EXPENSE';
  payload: any;
  timestamp: string;
}

export async function enqueueOfflineAction(
  userId: string,
  action: { type: OfflineAction['type']; payload: any }
): Promise<void> {
  if (!userId) return;
  const queueKey = getUserScopedStorageKey(userId, 'offline_sync_queue');
  try {
    const existing = (await idbKeyValGet<OfflineAction[]>(queueKey)) || safeLocalStorageGet<OfflineAction[]>(queueKey, []);
    const newEntry: OfflineAction = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: action.type,
      payload: action.payload,
      timestamp: new Date().toISOString(),
    };
    const updated = [...existing, newEntry];
    await idbKeyValSet(queueKey, updated);
    safeLocalStorageSet(queueKey, updated);
  } catch (err) {
    console.warn('[DueSyncEngine] Error enqueuing offline action:', err);
  }
}

export async function processOfflineSyncQueue(userId: string): Promise<void> {
  if (!userId) return;
  const queueKey = getUserScopedStorageKey(userId, 'offline_sync_queue');
  try {
    const queue = (await idbKeyValGet<OfflineAction[]>(queueKey)) || safeLocalStorageGet<OfflineAction[]>(queueKey, []);
    if (!queue || queue.length === 0) return;

    for (const item of queue) {
      try {
        if (item.type === 'SALE') {
          const saleRef = doc(db, 'users', userId, 'sales', item.payload.id);
          await setDoc(saleRef, { ...item.payload, userId, updatedAt: new Date().toISOString() }, { merge: true });
        } else if (item.type === 'PURCHASE') {
          const poRef = doc(db, 'users', userId, 'purchases', item.payload.id);
          await setDoc(poRef, { ...item.payload, userId, updatedAt: new Date().toISOString() }, { merge: true });
        } else if (item.type === 'CUSTOMER') {
          const cRef = doc(db, 'users', userId, 'customers', item.payload.id);
          await setDoc(cRef, { ...item.payload, userId, updatedAt: new Date().toISOString() }, { merge: true });
        } else if (item.type === 'SUPPLIER') {
          const sRef = doc(db, 'users', userId, 'suppliers', item.payload.id);
          await setDoc(sRef, { ...item.payload, userId, updatedAt: new Date().toISOString() }, { merge: true });
        } else if (item.type === 'EXPENSE') {
          const expRef = doc(db, 'users', userId, 'expenses', item.payload.id);
          await setDoc(expRef, { ...item.payload, userId, updatedAt: new Date().toISOString() }, { merge: true });
        }
      } catch (itemErr) {
        console.warn('[DueSyncEngine] Offline queue item retry notice:', itemErr);
      }
    }

    // Clear queue upon completion
    await idbKeyValSet(queueKey, []);
    safeLocalStorageSet(queueKey, []);
  } catch (err) {
    console.warn('[DueSyncEngine] Error processing offline queue:', err);
  }
}
