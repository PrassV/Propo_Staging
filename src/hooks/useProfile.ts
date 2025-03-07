import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Profile } from '../types/profile';

export function useProfile() {
  const { user, initialized } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          try {
            const { data: newProfile, error: createError } = await supabase
              .from('user_profiles')
              .insert({ 
                id: user.id, 
                email: user.email,
                created_at: new Date().toISOString()
              })
              .select()
              .single();

            if (createError) {
              throw new Error(createError.message || 'Failed to create profile');
            }
            
            setProfile(newProfile);
            return;
          } catch (createErr) {
            throw new Error(createErr instanceof Error ? createErr.message : 'Failed to create profile');
          }
        }
        throw new Error(fetchError.message || 'Failed to fetch profile');
      }

      setProfile(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Profile fetch error:', { error: err, message: errorMessage });
      setError(new Error(errorMessage));
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (initialized) {
      fetchProfile();
    }
  }, [initialized, fetchProfile]);

  const refetch = useCallback(() => {
    return fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch };
}