import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePharmacy } from '../context/PharmacyContext';
import { UserProfile } from '../types';
import {
  fetchUserProfileFromBackend,
  saveUserProfileToBackend,
} from '../services/userProfileService';

export interface UseUserProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  successMessage: string | null;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  refetchProfile: () => Promise<void>;
  user: ReturnType<typeof useAuth>['user'];
}

/**
 * Custom React hook for dynamic user profile data loading, input binding,
 * and persistence tied to the active authentication session.
 */
export function useUserProfile(): UseUserProfileReturn {
  const { user } = useAuth();
  const { updateUserProfile: updatePharmacyProfile } = usePharmacy();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch user profile dynamically when auth session changes or component mounts
  const loadProfile = useCallback(async (isRefresh = false) => {
    if (!user || !user.uid) {
      // Clear profile completely on logout
      setProfile(null);
      setIsLoading(false);
      return;
    }

    if (!isRefresh) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const fetchedProfile = await fetchUserProfileFromBackend(user.uid, user);
      setProfile(fetchedProfile);
      // Sync into pharmacy global context as well
      updatePharmacyProfile(fetchedProfile);
    } catch (err: any) {
      console.error('Failed to fetch user profile:', err);
      setError(err?.message || 'Failed to load profile from database.');
    } finally {
      setIsLoading(false);
    }
  }, [user, updatePharmacyProfile]);

  useEffect(() => {
    // Reset state whenever user ID changes (account switch / logout / login)
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetchUserProfileFromBackend(user.uid, user)
      .then((data) => {
        if (isMounted) {
          setProfile(data);
          updatePharmacyProfile(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Failed to fetch user profile');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  // Update profile handler
  const handleUpdateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!user || !user.uid) {
      setError('You must be logged in to update your profile.');
      return false;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updated = await saveUserProfileToBackend(user.uid, updates);
      setProfile(updated);
      updatePharmacyProfile(updated);
      setSuccessMessage('Profile updated successfully!');
      return true;
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setError(err?.message || 'Failed to save changes to database.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const refetchProfile = async () => {
    await loadProfile(true);
  };

  return {
    profile,
    isLoading,
    isSaving,
    error,
    successMessage,
    updateProfile: handleUpdateProfile,
    refetchProfile,
    user,
  };
}
