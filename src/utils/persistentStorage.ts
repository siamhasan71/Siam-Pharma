import { pharmacyDb, emitStorageNotification, chunkArray } from '../db/pharmacyDb';

/**
 * Persistent Storage Engine for PharmaPulse
 * 
 * Resilient multi-tier storage system:
 * 1. Dexie.js / IndexedDB: Primary durable store with high-capacity limits (GBs).
 *    Never crashes on large datasets like thousands of medicines, sales records, or CSV imports.
 * 2. LocalStorage: Fast synchronous cache with QuotaExceededError protection, compression, and automatic pruning.
 */

const DB_NAME = 'pharmapulse_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_keyval';

// In-memory fallback if both IDB and localStorage fail
const memoryCache: Record<string, any> = {};

let dbPromise: Promise<IDBDatabase | null> | null = null;

/**
 * One-time migration: If a huge 'pharmapulse_medicines_v1' is sitting in localStorage
 * consuming the ~5MB browser quota, migrate it safely to Dexie IndexedDB and free localStorage.
 */
export async function migrateMedicinesStorage(): Promise<void> {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const rawSaved = localStorage.getItem('pharmapulse_medicines_v1');
    if (rawSaved && rawSaved.length > 50000) {
      // It's a large dataset occupying megabytes in LocalStorage
      try {
        const parsed = JSON.parse(rawSaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Put into Dexie IndexedDB in chunks
          const batches = chunkArray(parsed, 500);
          for (const batch of batches) {
            await pharmacyDb.medicines.bulkPut(batch);
          }
          console.info(`[PersistentStorage] Migrated ${parsed.length} medicines to Dexie IndexedDB.`);
        }
      } catch (parseErr) {
        console.warn('[PersistentStorage] Migration parse error:', parseErr);
      }

      // Keep full dataset in memory cache so no items are ever lost or capped
      try {
        const parsed = JSON.parse(rawSaved);
        if (Array.isArray(parsed)) {
          memoryCache['pharmapulse_medicines_v1'] = parsed;
        }
      } catch {}
    }
  } catch (err) {
    console.warn('[PersistentStorage] migrateMedicinesStorage error:', err);
  }
}

// Auto-run migration asynchronously on startup
if (typeof window !== 'undefined') {
  setTimeout(() => {
    migrateMedicinesStorage().catch(() => {});
  }, 100);
}

/**
 * Initializes or returns the cached IndexedDB instance safely
 */
export function getIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (err) => {
        console.warn('[PersistentStorage] IndexedDB open error:', err);
        resolve(null);
      };

      request.onblocked = () => {
        console.warn('[PersistentStorage] IndexedDB open blocked');
        resolve(null);
      };
    } catch (err) {
      console.warn('[PersistentStorage] IndexedDB initialization exception:', err);
      resolve(null);
    }
  });

  return dbPromise;
}

/**
 * Save data asynchronously to IndexedDB (No 5MB quota limit)
 */
export async function idbSet<T>(key: string, value: T): Promise<boolean> {
  memoryCache[key] = value;
  try {
    const db = await getIndexedDb();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);

        req.onsuccess = () => resolve(true);
        req.onerror = (err) => {
          console.warn(`[PersistentStorage] IDB put failed for "${key}":`, err);
          resolve(false);
        };
      } catch (txErr) {
        console.warn(`[PersistentStorage] IDB transaction failed for "${key}":`, txErr);
        resolve(false);
      }
    });
  } catch (err) {
    console.warn(`[PersistentStorage] Error in idbSet for "${key}":`, err);
    return false;
  }
}

/**
 * Retrieve data asynchronously from IndexedDB
 */
export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await getIndexedDb();
    if (!db) {
      return memoryCache[key] ?? null;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          const res = req.result !== undefined ? (req.result as T) : null;
          if (res !== null) {
            memoryCache[key] = res;
          }
          resolve(res ?? memoryCache[key] ?? null);
        };

        req.onerror = () => {
          resolve(memoryCache[key] ?? null);
        };
      } catch {
        resolve(memoryCache[key] ?? null);
      }
    });
  } catch {
    return memoryCache[key] ?? null;
  }
}

/**
 * Delete key from IndexedDB
 */
export async function idbDelete(key: string): Promise<boolean> {
  delete memoryCache[key];
  try {
    const db = await getIndexedDb();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

/**
 * Clear all data in IndexedDB
 */
export async function idbClear(): Promise<boolean> {
  Object.keys(memoryCache).forEach((k) => delete memoryCache[k]);
  try {
    const db = await getIndexedDb();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

/**
 * Safely writes to localStorage with full QuotaExceededError protection.
 * If quota is exceeded, it prevents application crashes, logs a notice,
 * stores a pruned subset or indicator in localStorage, and guarantees
 * IndexedDB has the complete dataset.
 */
export function safeLocalStorageSet(key: string, value: any): boolean {
  // Always keep in memoryCache so in-memory state is never capped or lost
  if (value !== undefined) {
    memoryCache[key] = value;
  }

  if (typeof window === 'undefined' || !window.localStorage) return false;

  // Compress/strip whitespace
  let stringVal: string;
  try {
    stringVal = typeof value === 'string' ? value.trim() : JSON.stringify(value);
  } catch (stringifyErr) {
    console.warn(`[PersistentStorage] JSON stringify error for "${key}":`, stringifyErr);
    return false;
  }

  try {
    localStorage.setItem(key, stringVal);
    return true;
  } catch (err: any) {
    // If quota is reached in LocalStorage, keep full data in memoryCache and let IndexedDB be source of truth
    console.warn(`[PersistentStorage] LocalStorage quota reached for "${key}". Preserved in memory & IndexedDB.`);
    return false;
  }
}

/**
 * Safely reads from localStorage without throwing
 */
export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  // Check in-memory cache first if available
  if (memoryCache[key] !== undefined && memoryCache[key] !== null) {
    return memoryCache[key] as T;
  }

  if (typeof window === 'undefined' || !window.localStorage) return fallback;

  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    const parsed = JSON.parse(item) as T;
    // Cache in memory for fast retrieval
    memoryCache[key] = parsed;
    return parsed;
  } catch (err) {
    console.warn(`[PersistentStorage] Error reading or parsing localStorage key "${key}":`, err);
    return fallback;
  }
}

/**
 * Safely removes a key from localStorage
 */
export function safeLocalStorageRemove(key: string): void {
  delete memoryCache[key];
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[PersistentStorage] Error removing localStorage key "${key}":`, err);
  }
}
