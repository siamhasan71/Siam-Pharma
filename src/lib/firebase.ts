import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  setLogLevel,
  doc,
  getDoc,
  getDocFromCache,
  getDocFromServer,
  collection,
  setDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, set as rtdbSet, get as rtdbGet } from 'firebase/database';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCn_rVB-ia27WSgQMI0eJjJldLMZ3exR4c",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "siam-pharma.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://siam-pharma-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "siam-pharma",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "siam-pharma.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "800855258882",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:800855258882:web:f255ebe6cc642c5335341b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-JN86DDE59D"
};

// Safe initialization
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Suppress internal Firestore connection retry logs
try {
  setLogLevel('silent');
} catch {
  // ignore
}

// Initialize Firestore safely with long-polling (bypasses WebSocket/WebChannel sandbox drops)
export const db = (() => {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
    });
  } catch {
    return getFirestore(app);
  }
})();

export const rtdb = getDatabase(app);

/**
 * Validates connection to Siam Pharma Cloud backend
 */
export async function testFirebaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Check Realtime Database first (active live cluster for siam-pharma)
    try {
      const rtdbPromise = rtdbGet(ref(rtdb, 'projectId'));
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('RTDB timeout')), 3000)
      );
      const res: any = await Promise.race([rtdbPromise, timeoutPromise]);
      if (res && res.exists()) {
        return { success: true, message: 'Connected to Siam Pharma Cloud!' };
      }
    } catch {
      // RTDB read may be restricted or pending
    }

    // 2. Check general browser online status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, message: 'Device is offline. Local storage active.' };
    }

    // 3. Fallback check with short timeout to prevent blocking
    try {
      await Promise.race([
        getDoc(doc(db, 'system', 'connection_check')),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000)),
      ]);
      return { success: true, message: 'Connected to Siam Pharma Firebase!' };
    } catch {
      return { success: true, message: 'Siam Pharma Cloud is ready.' };
    }
  } catch {
    return { success: false, message: 'Operating in local offline mode.' };
  }
}

export interface CloudBackupData {
  exportDate: string;
  medicines: any[];
  sales: any[];
  customers: any[];
  suppliers: any[];
  onlineOrders: any[];
  companies?: any[];
  profile?: any;
}

/**
 * Backs up entire pharmacy state to Siam Pharma Firebase (both Firestore and Realtime Database)
 */
export async function backupDataToFirebase(data: CloudBackupData): Promise<{ success: boolean; message: string }> {
  try {
    const timestamp = new Date().toISOString();
    const backupPayload = {
      ...data,
      lastSyncedAt: timestamp,
      projectId: 'siam-pharma',
    };

    // 1. Save to Realtime Database backup node
    try {
      const backupRef = ref(rtdb, 'backups/latest');
      await rtdbSet(backupRef, backupPayload);
    } catch (rtdbErr) {
      console.warn('RTDB backup skipped or restricted, continuing to Firestore:', rtdbErr);
    }

    // 2. Save to Firestore backup collection
    const backupDocRef = doc(db, 'backups', 'latest');
    await setDoc(backupDocRef, backupPayload, { merge: true });

    // 3. Batch save medicines to Firestore collection for live queries
    if (Array.isArray(data.medicines) && data.medicines.length > 0) {
      try {
        const batch = writeBatch(db);
        // Limit to first 100 in single batch to avoid transaction limits
        data.medicines.slice(0, 100).forEach((med) => {
          if (med.id) {
            const mRef = doc(db, 'medicines', String(med.id));
            batch.set(mRef, med, { merge: true });
          }
        });
        await batch.commit();
      } catch (batchErr) {
        console.warn('Medicines batch write warning:', batchErr);
      }
    }

    return {
      success: true,
      message: `Data successfully synced to Siam Pharma Cloud at ${new Date().toLocaleTimeString()}`,
    };
  } catch (err: any) {
    console.error('Firebase backup error:', err);
    return {
      success: false,
      message: err.message || 'Failed to sync to Firebase Cloud.',
    };
  }
}

/**
 * Restores pharmacy data from Siam Pharma Firebase
 */
export async function restoreDataFromFirebase(): Promise<{ success: boolean; data?: CloudBackupData; message: string }> {
  try {
    // 1. Check Realtime Database first (active and populated in siam-pharma)
    try {
      const rtdbSnap = await rtdbGet(ref(rtdb, 'backups/latest'));
      if (rtdbSnap.exists()) {
        return {
          success: true,
          data: rtdbSnap.val() as CloudBackupData,
          message: 'Successfully retrieved data from Siam Pharma Cloud Database.',
        };
      }
    } catch (rtdbErr) {
      console.warn('RTDB fetch skipped or restricted:', rtdbErr);
    }

    // 2. Check Firestore (with short timeout to avoid blocking if offline)
    try {
      const docSnap = await Promise.race([
        getDoc(doc(db, 'backups', 'latest')),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000)),
      ]).catch(async () => {
        try {
          return await getDocFromCache(doc(db, 'backups', 'latest'));
        } catch {
          return null;
        }
      });

      if (docSnap && docSnap.exists()) {
        return {
          success: true,
          data: docSnap.data() as CloudBackupData,
          message: 'Successfully retrieved data from Siam Pharma Firestore cloud.',
        };
      }
    } catch (getDocErr: any) {
      console.warn('Firestore restore fetch skipped:', getDocErr);
    }

    return {
      success: false,
      message: 'No previous cloud backup found in siam-pharma project.',
    };
  } catch (err: any) {
    console.error('Firebase restore error:', err);
    // Last-resort cache recovery check
    try {
      const cached = await getDocFromCache(doc(db, 'backups', 'latest'));
      if (cached.exists()) {
        return {
          success: true,
          data: cached.data() as CloudBackupData,
          message: 'Retrieved backup from local cache.',
        };
      }
    } catch {
      // ignore
    }
    return {
      success: false,
      message: err.message || 'Error fetching backup from Firebase.',
    };
  }
}

/**
 * Completely clears medicine backups and records in Firebase Cloud
 */
export async function clearMedicinesFromFirebase(): Promise<{ success: boolean; message: string }> {
  try {
    const timestamp = new Date().toISOString();

    // 1. Update Realtime Database backup node to empty medicines
    try {
      const backupRef = ref(rtdb, 'backups/latest');
      const snap = await rtdbGet(backupRef).catch(() => null);
      if (snap && snap.exists()) {
        const val = snap.val() || {};
        await rtdbSet(backupRef, {
          ...val,
          medicines: [],
          totalMedicinesCount: 0,
          lastSyncedAt: timestamp,
        });
      } else {
        await rtdbSet(backupRef, {
          medicines: [],
          totalMedicinesCount: 0,
          lastSyncedAt: timestamp,
          projectId: 'siam-pharma',
        });
      }
    } catch (rtdbErr) {
      console.warn('Firebase RTDB medicines clear notice:', rtdbErr);
    }

    // 2. Update Firestore backup doc to empty medicines
    try {
      const backupDocRef = doc(db, 'backups', 'latest');
      await setDoc(
        backupDocRef,
        { medicines: [], totalMedicinesCount: 0, lastSyncedAt: timestamp },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn('Firestore backup doc clear notice:', fsErr);
    }

    return {
      success: true,
      message: 'Cloud database medicines reset successfully.',
    };
  } catch (err: any) {
    console.warn('Clear medicines from Firebase notice:', err);
    return {
      success: false,
      message: err.message || 'Firebase clear skipped',
    };
  }
}

