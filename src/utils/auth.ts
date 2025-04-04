import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface LoginData {
  email: string;
  password: string;
}

interface SignupData {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export const handleLogin = async ({ email, password }: LoginData) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      return { success: false, error };
    }

    toast.success('Successfully logged in!');
    return { success: true, data };
  } catch (error) {
    toast.error('An unexpected error occurred');
    return { success: false, error };
  }
};

export const handleSignup = async ({ email, password, name, phone }: SignupData) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone: phone,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      return { success: false, error };
    }

    toast.success('Successfully signed up! Please check your email for verification.');
    return { success: true, data };
  } catch (error) {
    toast.error('An unexpected error occurred');
    return { success: false, error };
  }
};

export const handleLogout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return { success: false, error };
    }

    toast.success('Successfully logged out!');
    return { success: true };
  } catch (error) {
    toast.error('An unexpected error occurred');
    return { success: false, error };
  }
};