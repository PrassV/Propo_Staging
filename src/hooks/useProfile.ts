import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { UserProfile, UserUpdate } from '../api/types';
import api from '../api';

export function useProfile() {
  const { initialized } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedProfile = await api.auth.getCurrentUserProfile();
      setProfile(fetchedProfile);
    } catch (err: unknown) {
      console.error('Profile fetch error:', err);
      let errorMessage = 'Failed to fetch profile';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'formattedMessage' in err) {
        errorMessage = (err as { formattedMessage: string }).formattedMessage;
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialized) {
      fetchProfile();
    }
  }, [initialized, fetchProfile]);

  const refetch = useCallback(() => {
    return fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (updateData: UserUpdate): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const updatedProfile = await api.auth.updateCurrentUserProfile(updateData);
      setProfile(updatedProfile);
      toast.success('Profile updated successfully!');
      return true;
    } catch (err: unknown) {
      console.error('Profile update error:', err);
      let errorMessage = 'Failed to update profile';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'formattedMessage' in err) {
        errorMessage = (err as { formattedMessage: string }).formattedMessage;
      }
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { profile, loading, error, refetch, updateProfile };
}