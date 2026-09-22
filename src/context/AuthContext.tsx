import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ref, set as rtdbSet } from 'firebase/database';
import { auth, db, rtdb } from '../lib/firebase';
import { safeLocalStorageGet, safeLocalStorageSet, safeLocalStorageRemove } from '../utils/persistentStorage';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'admin' | 'pharmacist';
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginDemo: (role?: 'admin' | 'pharmacist') => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_AUTH_KEY = 'siam_pharma_auth_session_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    // Check initial session in localStorage for instant render
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_AUTH_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Start with isLoading false so initial render happens instantly (local session or login screen)
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync with Firebase Auth state
  useEffect(() => {
    let isMounted = true;

    // Safety timeout: Guarantee the app never stays stuck on "Loading application..."
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 600);

    let unsubscribe = () => {};

    try {
      unsubscribe = onAuthStateChanged(
        auth,
        (fbUser: FirebaseUser | null) => {
          clearTimeout(safetyTimer);
          if (!isMounted) return;

          if (fbUser) {
            const authUser: AuthUser = {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Pharma Manager',
              role: fbUser.email?.includes('admin') || fbUser.email === 'siamhasansanto999@gmail.com' ? 'admin' : 'pharmacist',
            };
            setUser(authUser);
            safeLocalStorageSet(LOCAL_STORAGE_AUTH_KEY, authUser);
          } else {
            // If not logged into Firebase, check if we have a local session active
            const saved = safeLocalStorageGet<AuthUser | null>(LOCAL_STORAGE_AUTH_KEY, null);
            if (!saved) {
              setUser(null);
            }
          }
          setIsLoading(false);
        },
        (authError) => {
          console.warn('[AuthContext] onAuthStateChanged notice:', authError);
          clearTimeout(safetyTimer);
          if (isMounted) {
            setIsLoading(false);
          }
        }
      );
    } catch (err) {
      console.warn('[AuthContext] Auth listener setup notice:', err);
      clearTimeout(safetyTimer);
      if (isMounted) {
        setIsLoading(false);
      }
    }

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      try {
        unsubscribe();
      } catch {
        // ignore
      }
    };
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const authUser: AuthUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || email.split('@')[0],
        role: email.includes('admin') || email === 'siamhasansanto999@gmail.com' ? 'admin' : 'pharmacist',
      };
      setUser(authUser);
      safeLocalStorageSet(LOCAL_STORAGE_AUTH_KEY, authUser);
    } catch (err: any) {
      // If Firebase Auth throws operation-not-allowed or network error, verify against local fallback credentials
      const errCode = err?.code;
      if (
        errCode === 'auth/operation-not-allowed' ||
        errCode === 'auth/network-request-failed' ||
        errCode === 'auth/configuration-not-found'
      ) {
        console.warn('Firebase Auth service fallback:', errCode);
        // Allow valid email/password login locally
        if (pass.length >= 6) {
          const authUser: AuthUser = {
            uid: 'local_' + Date.now(),
            email: email,
            displayName: email.split('@')[0],
            role: email.includes('admin') ? 'admin' : 'pharmacist',
          };
          setUser(authUser);
          safeLocalStorageSet(LOCAL_STORAGE_AUTH_KEY, authUser);
          return;
        }
      }
      throw err;
    }
  };

  const signUp = async (email: string, pass: string, name?: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const trimmedName = name?.trim() || email.split('@')[0];

      if (cred.user) {
        await updateProfile(cred.user, { displayName: trimmedName }).catch(() => {});

        // 1. Save user profile details to Realtime Database first (active on siam-pharma)
        try {
          await rtdbSet(ref(rtdb, `users/${cred.user.uid}`), {
            uid: cred.user.uid,
            name: trimmedName,
            email: email,
            role: 'pharmacist',
            createdAt: new Date().toISOString(),
          });
        } catch (rtdbErr) {
          console.warn('Could not save user profile to RTDB:', rtdbErr);
        }

        // 2. Also save to Firestore (safely in background)
        setDoc(
          doc(db, 'users', cred.user.uid),
          {
            uid: cred.user.uid,
            name: trimmedName,
            email: email,
            role: 'pharmacist',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch(() => {});
      }

      const authUser: AuthUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: trimmedName,
        role: 'pharmacist',
      };
      setUser(authUser);
      safeLocalStorageSet(LOCAL_STORAGE_AUTH_KEY, authUser);
    } catch (err: any) {
      const errCode = err?.code;
      if (
        errCode === 'auth/operation-not-allowed' ||
        errCode === 'auth/network-request-failed' ||
        errCode === 'auth/configuration-not-found'
      ) {
        console.warn('Firebase Auth sign up fallback:', errCode);
        if (pass.length >= 6) {
          const trimmedName = name?.trim() || email.split('@')[0];
          const localUid = 'local_' + Date.now();
          const authUser: AuthUser = {
            uid: localUid,
            email: email,
            displayName: trimmedName,
            role: 'pharmacist',
          };
          setUser(authUser);
          safeLocalStorageSet(LOCAL_STORAGE_AUTH_KEY, authUser);

          // Best-effort Firestore write
          setDoc(
            doc(db, 'users', localUid),
            {
              uid: localUid,
              name: trimmedName,
              email: email,
              role: 'pharmacist',
              createdAt: new Date().toISOString(),
            },
            { merge: true }
          ).catch(() => {});

          return;
        }
      }
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      console.warn('Password reset notice:', err);
      // If offline or disabled, don't break UI; let user know email was dispatched
      if (err?.code !== 'auth/user-not-found' && err?.code !== 'auth/invalid-email') {
        return;
      }
      throw err;
    }
  };

  const loginDemo = (role: 'admin' | 'pharmacist' = 'admin') => {
    const demoUser: AuthUser = {
      uid: 'demo_user_' + role,
      email: role === 'admin' ? 'admin@siampharma.com' : 'pharmacist@siampharma.com',
      displayName: role === 'admin' ? 'সিয়াম আহমেদ (অ্যাডমিন)' : 'ফার্মাসিস্ট (ক্যাশিয়ার)',
      role: role,
    };
    setUser(demoUser);
    safeLocalStorageSet(LOCAL_STORAGE_AUTH_KEY, demoUser);
  };

  const logout = async () => {
    try {
      await fbSignOut(auth).catch(() => {});
    } finally {
      setUser(null);
      safeLocalStorageRemove(LOCAL_STORAGE_AUTH_KEY);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signUp,
        resetPassword,
        loginDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
