import { useState } from 'react';
import { User, Mail, Lock, Phone } from 'lucide-react';
import InputField from './InputField';
import { handleSignup } from '../../utils/auth';
import toast from 'react-hot-toast';

interface SignupFormProps {
  onSuccess?: () => void;
}

const SignupForm = ({ onSuccess }: SignupFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await handleSignup(formData);
    
    if (result.success && onSuccess) {
      onSuccess();
    }
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField
        label="Full Name"
        icon={<User size={20} />}
        type="text"
        placeholder="Enter your full name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        disabled={loading}
        required
      />

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
        required
      />

      <InputField
        label="Password"
        icon={<Lock size={20} />}
        type="password"
        placeholder="Create a password"
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

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white py-3 rounded-lg font-semibold tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  );
};

export default SignupForm;