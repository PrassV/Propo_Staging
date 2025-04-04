import { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import InputField from './InputField';
import { handleLogin } from '@/utils/auth';
import toast from 'react-hot-toast';
import { LoginResponse } from '@/api/types';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormProps {
  onSuccess?: (loginResponse: LoginResponse) => void;
}

const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { setAuthData } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await handleLogin(formData);
    
    if (result.success && result.data && onSuccess) {
      setAuthData(result.data as LoginResponse);
      onSuccess(result.data as LoginResponse);
    }
    
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const oauthUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/oauth/google/login`;
      window.location.href = oauthUrl;
    } catch (error) {
      console.error('Error initiating Google Sign-In:', error);
      toast.error('Failed to start Google Sign-In');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField
        label="Email Address"
        icon={<Mail size={20} />}
        type="email"
        placeholder="Enter your email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        disabled={loading}
        required
      />

      <InputField
        label="Password"
        icon={<Lock size={20} />}
        type="password"
        placeholder="Enter your password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        disabled={loading}
        required
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white py-3 rounded-lg font-semibold tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Log In'}
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold tracking-wide hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Sign in with Google
      </button>
    </form>
  );
};

export default LoginForm;