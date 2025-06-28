import React, { createContext, useContext, useEffect, useState } from 'react';
import { clearTokens, getStoredToken, storeToken } from '../utils/token';
import api from '../api';
import toast from 'react-hot-toast';
import { UserProfile, LoginResponse, Session, AuthError } from '@/api/types';
import { supabase } from '../lib/supabase';

// AuthContextType uses correct types
interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  setAuthData: (loginResponse: LoginResponse) => void;
  logoutUser: () => Promise<{ error?: AuthError } | void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  initialized: false,
  setAuthData: () => {},
  logoutUser: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const setAuthData = (loginResponse: LoginResponse) => {
    if (loginResponse.access_token && loginResponse.user) {
      storeToken(loginResponse.access_token);
      const sessionData: Session = {
        access_token: loginResponse.access_token,
        user: loginResponse.user,
      };
      setSession(sessionData);
      setUser(loginResponse.user);
      setLoading(false);
      setInitialized(true);
    } else {
      console.error("Invalid login response passed to setAuthData:", loginResponse);
    }
  };

  const logoutUser = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      await api.auth.logout();
      clearTokens();
      setUser(null);
      setSession(null);
      setLoading(false);
      toast.success("Logged out successfully!");
    } catch (error) {
      const authError = error as AuthError;
      console.error("Error logging out:", authError);
      toast.error("Failed to log out.");
      return { error: authError };
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const initializeAuth = async () => {
      try {
        // First check if we have a Supabase session
        const { data: { session: supabaseSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting Supabase session:', error);
        }

        if (supabaseSession && mounted) {
          // We have a Supabase session, transform it to our format
          const supabaseUser = supabaseSession.user;
          const userProfile: UserProfile = {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            full_name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || '',
            phone: supabaseUser.user_metadata?.phone || '',
            role: supabaseUser.user_metadata?.role || null,
            user_type: supabaseUser.user_metadata?.user_type || null,
            created_at: supabaseUser.created_at,
            updated_at: supabaseUser.updated_at || null,
            first_name: supabaseUser.user_metadata?.first_name || '',
            last_name: supabaseUser.user_metadata?.last_name || '',
            address_line1: null,
            address_line2: null,
            city: null,
            state: null,
            pincode: null,
            id_image_url: null,
            id_type: null
          };

          const sessionData: Session = {
            access_token: supabaseSession.access_token,
            user: userProfile
          };

          storeToken(supabaseSession.access_token);
          setSession(sessionData);
          setUser(userProfile);
        } else {
          // Fallback to stored token method for regular auth
          const token = getStoredToken();
          
          if (token && mounted) {
            try {
              // Fetch current user profile with the stored token
              const userProfile = await api.auth.getCurrentUser();
              
              if (userProfile) {
                const sessionData: Session = {
                  access_token: token,
                  user: userProfile
                };
                
                setSession(sessionData);
                setUser(userProfile);
              } else {
                clearTokens();
              }
            } catch (error) {
              console.error('Error fetching user with stored token:', error);
              clearTokens();
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        clearTokens();
      } finally {
         if (mounted) {
            setLoading(false);
            setInitialized(true);
         }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setSession(null);
          clearTokens();
        } else if (event === 'SIGNED_IN' && session) {
          // Handle sign in
          const supabaseUser = session.user;
          const userProfile: UserProfile = {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            full_name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || '',
            phone: supabaseUser.user_metadata?.phone || '',
            role: supabaseUser.user_metadata?.role || null,
            user_type: supabaseUser.user_metadata?.user_type || null,
            created_at: supabaseUser.created_at,
            updated_at: supabaseUser.updated_at || null,
            first_name: supabaseUser.user_metadata?.first_name || '',
            last_name: supabaseUser.user_metadata?.last_name || '',
            address_line1: null,
            address_line2: null,
            city: null,
            state: null,
            pincode: null,
            id_image_url: null,
            id_type: null
          };

          const sessionData: Session = {
            access_token: session.access_token,
            user: userProfile
          };

          storeToken(session.access_token);
          setSession(sessionData);
          setUser(userProfile);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, initialized, setAuthData, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};