import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { setAuthData } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setError('Authentication failed: ' + error.message);
          return;
        }

        if (data.session) {
          // Extract user information
          const user = data.session.user;
          const accessToken = data.session.access_token;
          
          // Transform Supabase user data to match your LoginResponse interface
          const loginResponse = {
            access_token: accessToken,
            refresh_token: data.session.refresh_token || '',
            token_type: 'bearer',
            expires_in: data.session.expires_in || 3600,
            user: {
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
              phone: user.user_metadata?.phone || '',
              role: user.user_metadata?.role || null,
              user_type: user.user_metadata?.user_type || null,
              created_at: user.created_at,
              updated_at: user.updated_at || null,
              first_name: user.user_metadata?.first_name || '',
              last_name: user.user_metadata?.last_name || '',
              address_line1: null,
              address_line2: null,
              city: null,
              state: null,
              pincode: null,
              id_image_url: null,
              id_type: null
            }
          };

          // Set auth data in context
          setAuthData(loginResponse);
          
          toast.success('Successfully signed in with Google!');
          
          // Check if user needs to complete profile
          const hasCompleteProfile = user.user_metadata?.full_name && 
                                   (user.user_metadata?.role || user.user_metadata?.user_type);
          
          if (hasCompleteProfile) {
            navigate('/dashboard');
          } else {
            navigate('/onboarding');
          }
        } else {
          setError('No session found. Please try signing in again.');
        }
      } catch (err) {
        console.error('Callback error:', err);
        setError('An unexpected error occurred during authentication.');
      }
    };

    handleAuthCallback();
  }, [navigate, setAuthData]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">Completing your sign-in...</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage; 