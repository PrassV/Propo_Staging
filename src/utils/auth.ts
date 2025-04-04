import api from '@/api'; // Use central API client
import toast from 'react-hot-toast';
// Import types from central location
import { LoginRequest, UserProfile } from '@/api/types'; 

// Removed redundant LoginData interface, use LoginRequest directly

// Define SignupData based on api.auth.register requirements
interface SignupData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
  // Revert back to user_type as expected by /auth/register endpoint
  user_type: 'owner' | 'tenant'; 
}

// Use LoginRequest type directly
export const handleLogin = async ({ email, password }: LoginRequest) => { 
  try {
    const loginResponse = await api.auth.login({ email, password }); 

    if (!loginResponse?.access_token) {
       throw new Error("Login failed: No access token received.");
    }
    
    toast.success('Successfully logged in!');
    return { success: true, data: loginResponse }; 
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed due to an unexpected error';
    toast.error(message);
    return { success: false, error };
  }
};

// Refactor handleSignup to use api.auth.register
export const handleSignup = async (signupData: SignupData) => {
  try {
    // Call the register service function
    const userProfile: UserProfile = await api.auth.register(signupData);

    toast.success('Successfully signed up! You can now log in.'); 
    // Return success and the created user profile
    return { success: true, data: userProfile };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Signup failed due to an unexpected error';
    toast.error(message);
    return { success: false, error };
  }
};

// handleLogout can be removed or left unused, as AuthContext handles it now.
// export const handleLogout = async () => {
//   // ... (logic using api.auth.logout if needed elsewhere, but likely redundant)
// };