import {
  doc,
  getDoc,
  setDoc,
  getDocFromCache,
  getDocFromServer,
} from 'firebase/firestore';
import { ref, get as rtdbGet, set as rtdbSet } from 'firebase/database';
import { updateProfile } from 'firebase/auth';
import { auth, db, rtdb } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { AuthUser } from '../context/AuthContext';
import { safeLocalStorageGet, safeLocalStorageSet, safeLocalStorageRemove } from '../utils/persistentStorage';
import { idbKeyValGet, idbKeyValSet } from '../db/pharmacyDb';

const PROFILE_STORAGE_PREFIX = 'pharmapulse_profile_user_';

/**
 * Creates a clean default profile for a specific authenticated user
 * Initialized with standard default dummy values per user requirements
 */
export function createDefaultProfileForUser(uid: string, authUser?: AuthUser | null): UserProfile {
  const email = authUser?.email || auth.currentUser?.email || '';
  const fallbackName =
    authUser?.displayName ||
    auth.currentUser?.displayName ||
    (email ? email.split('@')[0] : 'Siam Hasan');

  // Determine default avatar or shop logo
  const avatarUrl =
    auth.currentUser?.photoURL ||
    (email.includes('siam')
      ? '/src/assets/images/profile_avatar_3d_1789066596560.jpg'
      : 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80');

  return {
    id: uid,
    name: fallbackName,
    email: email,
    phoneCountryCode: '+88',
    phone: '01846493071',
    password: '••••••••',
    dateOfBirth: '',
    country: 'BD',
    district: 'Dhaka',
    thana: '',
    postOffice: '',
    village: '',
    avatarUrl: avatarUrl,
    role: (authUser?.role as UserRole) || (email.includes('admin') || email === 'siamhasansanto999@gmail.com' ? 'admin' : 'pharmacist'),

    // Business & Professional Details with requested default values
    businessName: 'Siam Pharmacy',
    qualification: 'B.Pharm, Professional Registered Pharmacist (Reg No: A-19482)',
    contactNumber: '+88 01846493071',
    licenseNumber: 'DL-DHK-2024-88291',
    address: 'Dhaka, Bangladesh',
    shopLogoUrl: avatarUrl,
  } as UserProfile;
}

/**
 * Fetches the user profile from Firebase Firestore / Realtime Database / Dexie IndexedDB,
 * with graceful fallback to cached/user-scoped storage and default template.
 */
export async function fetchUserProfileFromBackend(
  uid: string,
  authUser?: AuthUser | null
): Promise<UserProfile> {
  if (!uid) {
    throw new Error('User ID is required to fetch profile');
  }

  const defaultProfile = createDefaultProfileForUser(uid, authUser);
  const userStorageKey = `${PROFILE_STORAGE_PREFIX}${uid}`;

  // 1. Instant Local Cache Check (LocalStorage & Dexie IndexedDB)
  const cached = safeLocalStorageGet<Partial<UserProfile> | null>(userStorageKey, null);
  if (cached && (cached.name || cached.businessName)) {
    const mergedCached: UserProfile = {
      ...defaultProfile,
      ...cached,
      id: uid,
    };
    // Re-verify in Dexie async
    idbKeyValGet<Partial<UserProfile>>(`profile_${uid}`).catch(() => {});
    return mergedCached;
  }

  try {
    const idbProfile = await idbKeyValGet<Partial<UserProfile>>(`profile_${uid}`);
    if (idbProfile && (idbProfile.name || idbProfile.businessName)) {
      const merged: UserProfile = {
        ...defaultProfile,
        ...idbProfile,
        id: uid,
      };
      safeLocalStorageSet(userStorageKey, merged);
      return merged;
    }
  } catch {
    // continue to network fetch
  }

  // 2. Try Realtime Database First (Active live database for siam-pharma)
  try {
    const rtdbRef = ref(rtdb, `users/${uid}`);
    const rtdbPromise = rtdbGet(rtdbRef);
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('RTDB timeout')), 3500)
    );
    const rtdbSnap: any = await Promise.race([rtdbPromise, timeoutPromise]);
    
    if (rtdbSnap && rtdbSnap.exists()) {
      const data = rtdbSnap.val() as Partial<UserProfile>;
      const mergedProfile: UserProfile = {
        id: uid,
        name: data.name || defaultProfile.name,
        email: data.email || defaultProfile.email,
        phoneCountryCode: data.phoneCountryCode || defaultProfile.phoneCountryCode,
        phone: data.phone !== undefined ? data.phone : defaultProfile.phone,
        password: data.password || defaultProfile.password,
        dateOfBirth: data.dateOfBirth || defaultProfile.dateOfBirth,
        country: data.country || defaultProfile.country,
        district: data.district || defaultProfile.district,
        thana: data.thana || defaultProfile.thana,
        postOffice: data.postOffice || defaultProfile.postOffice,
        village: data.village || defaultProfile.village,
        avatarUrl: data.avatarUrl || defaultProfile.avatarUrl,
        role: (data.role as UserRole) || defaultProfile.role,
        businessName: data.businessName || defaultProfile.businessName,
        qualification: data.qualification || defaultProfile.qualification,
        licenseNumber: data.licenseNumber || defaultProfile.licenseNumber,
        address: data.address || defaultProfile.address,
        shopLogoUrl: data.shopLogoUrl || data.avatarUrl || defaultProfile.shopLogoUrl,
      };

      safeLocalStorageSet(userStorageKey, mergedProfile);
      idbKeyValSet(`profile_${uid}`, mergedProfile).catch(() => {});
      return mergedProfile;
    }
  } catch (rtdbErr) {
    // RTDB skipped or offline
  }

  // 3. Fallback: Safe non-blocking Firestore check
  try {
    const userDocRef = doc(db, 'users', uid);
    const firestorePromise = getDoc(userDocRef);
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore timeout')), 2500)
    );
    const snap: any = await Promise.race([firestorePromise, timeoutPromise]).catch(() => null);

    if (snap && snap.exists()) {
      const data = snap.data() as Partial<UserProfile>;
      const mergedProfile: UserProfile = {
        id: uid,
        name: data.name || defaultProfile.name,
        email: data.email || defaultProfile.email,
        phoneCountryCode: data.phoneCountryCode || defaultProfile.phoneCountryCode,
        phone: data.phone !== undefined ? data.phone : defaultProfile.phone,
        password: data.password || defaultProfile.password,
        dateOfBirth: data.dateOfBirth || defaultProfile.dateOfBirth,
        country: data.country || defaultProfile.country,
        district: data.district || defaultProfile.district,
        thana: data.thana || defaultProfile.thana,
        postOffice: data.postOffice || defaultProfile.postOffice,
        village: data.village || defaultProfile.village,
        avatarUrl: data.avatarUrl || defaultProfile.avatarUrl,
        role: (data.role as UserRole) || defaultProfile.role,
        businessName: data.businessName || defaultProfile.businessName,
        qualification: data.qualification || defaultProfile.qualification,
        licenseNumber: data.licenseNumber || defaultProfile.licenseNumber,
        address: data.address || defaultProfile.address,
        shopLogoUrl: data.shopLogoUrl || data.avatarUrl || defaultProfile.shopLogoUrl,
      };

      safeLocalStorageSet(userStorageKey, mergedProfile);
      idbKeyValSet(`profile_${uid}`, mergedProfile).catch(() => {});
      return mergedProfile;
    }
  } catch {
    // Firestore unavailable or not provisioned
  }

  // 4. Auto-seed default profile to local caches and RTDB
  safeLocalStorageSet(userStorageKey, defaultProfile);
  idbKeyValSet(`profile_${uid}`, defaultProfile).catch(() => {});

  // Background seed to cloud stores
  rtdbSet(ref(rtdb, `users/${uid}`), defaultProfile).catch(() => {});
  setDoc(doc(db, 'users', uid), {
    ...defaultProfile,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, { merge: true }).catch(() => {});

  return defaultProfile;
}

/**
 * Saves and syncs profile updates across Firestore, RTDB, Dexie IndexedDB, Firebase Auth, and local cache
 */
export async function saveUserProfileToBackend(
  uid: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  if (!uid) {
    throw new Error('User ID is required to save profile');
  }

  const userStorageKey = `${PROFILE_STORAGE_PREFIX}${uid}`;
  
  // Fetch current or default
  const cached = safeLocalStorageGet<UserProfile | null>(userStorageKey, null);
  const currentProfile: UserProfile = cached || createDefaultProfileForUser(uid);

  const merged: UserProfile = {
    ...currentProfile,
    ...updates,
    id: uid,
  };

  // 1. Update Dexie IndexedDB immediately
  try {
    await idbKeyValSet(`profile_${uid}`, merged);
  } catch (dexieErr) {
    console.warn('Could not save profile to Dexie:', dexieErr);
  }

  // 2. Update user-scoped local storage immediately
  safeLocalStorageSet(userStorageKey, merged);

  // 3. Update Firebase Auth displayName and photoURL if active
  if (auth.currentUser && auth.currentUser.uid === uid) {
    try {
      await updateProfile(auth.currentUser, {
        displayName: merged.name,
        photoURL: merged.shopLogoUrl || merged.avatarUrl,
      });
    } catch (authErr) {
      console.warn('Could not update Firebase Auth user profile:', authErr);
    }
  }

  // 4. Persist to RTDB first (active and verified on siam-pharma)
  try {
    await rtdbSet(ref(rtdb, `users/${uid}`), {
      ...merged,
      updatedAt: new Date().toISOString(),
    });
  } catch (rtdbErr) {
    console.warn('Failed to save user profile to RTDB:', rtdbErr);
  }

  // 5. Persist to Firestore (secondary / optional)
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(
      userDocRef,
      {
        ...merged,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch {
    // Firestore may operate in offline cache mode
  }

  return merged;
}

/**
 * Clears user profile session cache from storage
 */
export function clearUserProfileStorage(uid?: string) {
  if (uid) {
    safeLocalStorageRemove(`${PROFILE_STORAGE_PREFIX}${uid}`);
  }
}
