import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { UserProfile } from '@/api/types';
import api from '@/api';

export function useProfile() {
  const { initialized } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedProfile = await api.auth.getCurrentUser();
      console.log('[useProfile] Fetched raw profile:', JSON.stringify(fetchedProfile));
      
      // Map user_type to role if it exists
      if (fetchedProfile && 'user_type' in fetchedProfile && !fetchedProfile.role) {
        console.log('[useProfile] Mapping user_type to role:', fetchedProfile.user_type);
        fetchedProfile.role = fetchedProfile.user_type as 'owner' | 'tenant' | 'admin' | null;
      }
      
      setProfile(fetchedProfile);
      console.log('[useProfile] Set profile state:', JSON.stringify(fetchedProfile));
    } catch (err: unknown) {
      console.error('Profile fetch error:', err);
      let errorMessage = 'Failed to fetch profile';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'formattedMessage' in err) {
        errorMessage = (err as { formattedMessage: string }).formattedMessage;
      }
      setError(errorMessage);
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

  const updateProfile = useCallback(async (updateData: Partial<UserProfile>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      // Map role to user_type for the API
      const apiUpdateData = { ...updateData };
      if ('role' in apiUpdateData && apiUpdateData.role) {
        apiUpdateData.user_type = apiUpdateData.role;
      }
      
      const updatedProfile = await api.auth.updateUserProfile(apiUpdateData);
      
      // Map user_type to role in the response
      if (updatedProfile && 'user_type' in updatedProfile && !updatedProfile.role) {
        updatedProfile.role = updatedProfile.user_type as 'owner' | 'tenant' | 'admin' | null;
      }
      
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