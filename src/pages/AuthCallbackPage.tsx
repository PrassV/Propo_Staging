import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuthData } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');
        console.log('📍 Current URL:', window.location.href);
        console.log('🌐 Environment:', import.meta.env.PROD ? 'Production' : 'Development');

        // Get the session from URL hash or current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Session error:', error);
          toast.error('Authentication failed');
          navigate('/');
          return;
        }

        if (!session) {
          console.log('⚠️ No session found, redirecting to home');
          navigate('/');
          return;
        }

        console.log('✅ Session found:', {
          user: session.user.email,
          provider: session.user.app_metadata?.provider
        });

        // Transform Supabase session to LoginResponse format
        const loginResponse = {
          access_token: session.access_token,
          refresh_token: session.refresh_token || '',
          token_type: 'bearer',
          expires_in: session.expires_in || 3600,
          user: {
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
            phone: session.user.user_metadata?.phone || '',
            role: session.user.user_metadata?.role || null,
            user_type: session.user.user_metadata?.user_type || null,
            created_at: session.user.created_at,
            updated_at: session.user.updated_at || null,
            first_name: session.user.user_metadata?.first_name || '',
            last_name: session.user.user_metadata?.last_name || '',
            address_line1: null,
            address_line2: null,
            city: null,
            state: null,
            pincode: null,
            id_image_url: null,
            id_type: null
          }
        };

        // Set auth data using the context method
        setAuthData(loginResponse);

        console.log('🔄 Navigating based on profile completion...');

        // Check if user needs to complete profile
        const hasCompleteProfile = session.user.user_metadata?.full_name && 
                                 (session.user.user_metadata?.role || session.user.user_metadata?.user_type);

        // Navigate based on profile completion
        if (hasCompleteProfile) {
          console.log('✅ Profile complete, navigating to dashboard');
          navigate('/dashboard');
        } else {
          console.log('🔄 Profile incomplete, navigating to onboarding');
          navigate('/onboarding');
        }

      } catch (error) {
        console.error('❌ Callback processing error:', error);
        toast.error('Authentication processing failed');
        navigate('/');
      }
    };

    handleAuthCallback();
  }, [navigate, setAuthData]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage; 