import { Building, User } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api';

interface UserTypeSelectionProps {
  onSelect: (type: 'owner' | 'tenant') => void;
}

const UserTypeSelection = ({ onSelect }: UserTypeSelectionProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSelection = async (type: 'owner' | 'tenant') => {
    if (!user) return;
    setLoading(true);
    
    toast.loading('Setting up your profile...');

    try {
      // Use auth service to update profile with both role and user_type
      await api.auth.updateUserProfile({ 
        role: type,
        user_type: type 
      });
      toast.dismiss();
      toast.success('Profile updated successfully!');
      
      // First call the onSelect callback
      onSelect(type);
      
      // Then navigate to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (error: unknown) {
      console.error('Error setting user type:', error);
      toast.dismiss();
      
      let errorMessage = 'Failed to set user type. Please try again.';
      if (error && typeof error === 'object' && 'response' in error && 
          error.response && typeof error.response === 'object' && 'data' in error.response &&
          error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data) {
           errorMessage = (error.response.data as { detail: string }).detail;
      } else if (error instanceof Error) {
           errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-4xl w-full mx-auto p-8">
        <h1 className="text-4xl font-bold text-center mb-12 tracking-wide">Welcome to Propify</h1>
        <p className="text-xl text-gray-600 text-center mb-12 tracking-wide">
          Please select your role to continue
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <button
            onClick={() => handleSelection('owner')}
            disabled={loading}
            className="p-8 border-2 rounded-xl hover:border-black transition-colors group disabled:opacity-50"
          >
            <div className="flex flex-col items-center space-y-4">
              <Building size={48} className="group-hover:text-black" />
              <h2 className="text-2xl font-semibold tracking-wide">Property Owner</h2>
              <p className="text-gray-600 text-center tracking-wide">
                I want to list and manage my properties
              </p>
            </div>
          </button>

          <button
            onClick={() => handleSelection('tenant')}
            disabled={loading}
            className="p-8 border-2 rounded-xl hover:border-black transition-colors group disabled:opacity-50"
          >
            <div className="flex flex-col items-center space-y-4">
              <User size={48} className="group-hover:text-black" />
              <h2 className="text-2xl font-semibold tracking-wide">Tenant</h2>
              <p className="text-gray-600 text-center tracking-wide">
                I'm looking to rent a property
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserTypeSelection;