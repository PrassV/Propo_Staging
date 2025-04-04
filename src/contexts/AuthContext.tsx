import { createContext, useContext, useEffect, useState } from 'react';
import { clearTokens, getStoredToken } from '../utils/token';
import api from '../api';
import toast from 'react-hot-toast';

// Create type definitions compatible with our API structure
interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  user_type?: 'owner' | 'tenant' | 'admin';
}

interface Session {
  access_token: string;
  user: User;
}

interface AuthError {
  message: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  logoutUser: () => Promise<{ error: AuthError } | void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  session: null, 
  loading: true,
  initialized: false,
  logoutUser: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const logoutUser = async () => {
    try {
      await api.auth.logout();
      clearTokens();
      setUser(null);
      setSession(null);
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
          const sessionData = {
            access_token: token,
            user: userProfile
          };
          
          setSession(sessionData);
          setUser(userProfile);
          setLoading(false);
          setInitialized(true);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Token might be invalid, clear it
        clearTokens();
        
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // We don't have real-time auth state changes without supabase,
    // so we'll need to rely on manual auth state updates

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, initialized, logoutUser }}>
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