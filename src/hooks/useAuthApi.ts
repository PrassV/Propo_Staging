import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { getStoredToken, clearTokens } from '../utils/token';
import { UserProfile } from '../api/types';

export const useAuthApi = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Get current user profile
  const fetchUser = useCallback(async () => {
    const token = getStoredToken();

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const userProfile = await api.auth.getCurrentUser();
      setUser(userProfile);
    } catch (error: unknown) {
      console.error('Error fetching user profile:', error);
      let errorMessage = 'Failed to fetch user profile';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      
      setError(errorMessage);
      setUser(null);
      clearTokens();
    } finally {
      setLoading(false);
    }
  }, []);

  // Login user
  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const userProfile = await api.auth.login({ email, password });
      setUser(userProfile);
      return { success: true, user: userProfile };
    } catch (error: unknown) {
      console.error('Login error:', error);
      let errorMessage = 'Failed to login';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Register new user
  const register = async (userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    user_type: 'owner' | 'tenant';
  }) => {
    try {
      setError(null);
      const userProfile = await api.auth.register(userData);
      return { success: true, user: userProfile };
    } catch (error: unknown) {
      console.error('Registration error:', error);
      let errorMessage = 'Failed to register';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      clearTokens();
      navigate('/login');
    }
  };

  // Update user profile
  const updateProfile = async (profileData: Partial<UserProfile>) => {
    try {
      setError(null);
      const updatedProfile = await api.auth.updateUserProfile(profileData);
      setUser(prev => prev ? { ...prev, ...updatedProfile } : updatedProfile);
      return { success: true, user: updatedProfile };
    } catch (error: unknown) {
      console.error('Profile update error:', error);
      let errorMessage = 'Failed to update profile';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Check authentication on component mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    refreshUser: fetchUser,
  };
}; 