import { useState } from 'react';
import { Mail, Lock, User, Phone } from 'lucide-react';
import InputField from './InputField';
import { handleSignup } from '@/utils/auth';
import { UserProfile } from '@/api/types';

interface SignupFormProps {
  onSuccess?: (userProfile: UserProfile) => void;
}

const SignupForm = ({ onSuccess }: SignupFormProps) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    user_type: 'owner' as 'owner' | 'tenant',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    setLoading(true);
    
    try {
      const result = await handleSignup({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        user_type: formData.user_type,
      });
      
      if (result.success && result.data) {
        // Call the onSuccess callback if provided
        if (onSuccess) {
          onSuccess(result.data as UserProfile);
        } else {
          // Route to onboarding page for profile completion
          window.location.href = '/onboarding';
        }
      }
    } catch (error) {
      console.error('Error during signup:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="First Name"
          icon={<User size={20} />}
          type="text"
          placeholder="Enter your first name"
          value={formData.first_name}
          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
          disabled={loading}
          required
        />
        <InputField
          label="Last Name"
          icon={<User size={20} />}
          type="text"
          placeholder="Enter your last name"
          value={formData.last_name}
          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
          disabled={loading}
          required
        />
      </div>
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
        label="Phone Number"
        icon={<Phone size={20} />}
        type="tel"
        placeholder="Enter your phone number"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        disabled={loading}
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
      <InputField
        label="Confirm Password"
        icon={<Lock size={20} />}
        type="password"
        placeholder="Confirm your password"
        value={formData.confirmPassword}
        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
        disabled={loading}
        required
      />
      <div className="space-y-2">
         <label className="block text-sm font-medium text-gray-700">I am a:</label>
         <div className="flex space-x-4">
            <label className="flex items-center">
                <input 
                    type="radio" 
                    name="userType"
                    value="owner" 
                    checked={formData.user_type === 'owner'}
                    onChange={() => setFormData({ ...formData, user_type: 'owner' })}
                    className="mr-2"
                />
                Property Owner / Manager
            </label>
             <label className="flex items-center">
                <input 
                    type="radio" 
                    name="userType" 
                    value="tenant" 
                    checked={formData.user_type === 'tenant'}
                    onChange={() => setFormData({ ...formData, user_type: 'tenant' })}
                    className="mr-2"
                />
                Tenant
            </label>
         </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white py-3 rounded-lg font-semibold tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {loading ? 'Signing up...' : 'Sign Up'}
      </button>
    </form>
  );
};

export default SignupForm;