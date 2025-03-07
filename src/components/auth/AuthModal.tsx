import { useState } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { handleLogout } from '../../utils/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const { user } = useAuth();

  if (!isOpen) return null;

  if (user) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full relative">
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>

          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-wide text-center">Welcome!</h2>
            <p className="text-center text-gray-600">
              Logged in as: {user.email}
            </p>
            <button
              onClick={async () => {
                await handleLogout();
                onClose();
              }}
              className="w-full bg-black text-white py-3 rounded-lg font-semibold tracking-wide hover:bg-gray-800 transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>

        <h2 className="text-3xl font-bold mb-6 tracking-wide text-center">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        {isLogin ? <LoginForm onSuccess={onClose} /> : <SignupForm onSuccess={onClose} />}

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-gray-600 hover:text-black tracking-wide"
          >
            {isLogin ? 
              "Don't have an account? Sign up" : 
              "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;