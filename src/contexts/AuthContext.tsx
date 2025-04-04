import { createContext, useContext, useEffect, useState } from 'react';
import { clearTokens, getStoredToken, storeToken } from '../utils/token';
import api from '../api';
import toast from 'react-hot-toast';
import { UserProfile, LoginResponse, Session, AuthError } from '@/api/types';

// AuthContextType uses correct types
interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  setAuthData: (loginResponse: LoginResponse) => void;
  logoutUser: () => Promise<{ error: AuthError } | void>;
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
        const token = getStoredToken();
        
        if (!token) {
          if (mounted) {
            setLoading(false);
            setInitialized(true);
          }
          return;
        }
        
        // Fetch current user profile with the stored token
        const userProfile = await api.auth.getCurrentUser();
        
        if (mounted && userProfile) {
          const sessionData: Session = {
            access_token: token,
            user: userProfile
          };
          
          setSession(sessionData);
          setUser(userProfile);
        } else if (mounted) {
           clearTokens();
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

    return () => {
      mounted = false;
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