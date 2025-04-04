import apiClient from '../client';
import { ApiResponse, LoginRequest, LoginResponse, UserProfile } from '../types';
import { storeToken, storeRefreshToken, clearTokens } from '../../utils/token';

// Login user
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
  
  // Store the tokens
  storeToken(response.data.access_token);
  storeRefreshToken(response.data.refresh_token);
  
  return response.data;
};

// Register new user
export const register = async (userData: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  user_type: 'owner' | 'tenant';
}): Promise<UserProfile> => {
  // The actual response structure matches LoginResponse
  const response = await apiClient.post<LoginResponse>('/auth/register', userData);
  
  // Store tokens exactly like we do in the login function
  if (response.data.access_token) {
    storeToken(response.data.access_token);
    if (response.data.refresh_token) {
      storeRefreshToken(response.data.refresh_token);
    }
  }
  
  return response.data.user;
};

// Get current user profile
export const getCurrentUser = async (): Promise<UserProfile> => {
  const response = await apiClient.get<UserProfile>('/users/me');
  return response.data;
};

// Update user profile
export const updateUserProfile = async (profileData: Partial<UserProfile>): Promise<UserProfile> => {
  try {
    // First try the /users/me endpoint (our primary endpoint)
    const response = await apiClient.put<ApiResponse<UserProfile> | UserProfile>('/users/me', profileData);
    
    // Handle different response formats
    if (response.data && 'data' in response.data) {
      // It's wrapped in an ApiResponse
      return response.data.data;
    } else {
      // It's directly the profile object
      return response.data;
    }
  } catch (error) {
    console.error("Error updating profile with /users/me, trying fallback endpoint", error);
    
    // If first attempt fails, try the /auth/profile endpoint as fallback
    try {
      const fallbackResponse = await apiClient.put<ApiResponse<UserProfile> | UserProfile>('/auth/profile', profileData);
      
      // Handle different response formats
      if (fallbackResponse.data && 'data' in fallbackResponse.data) {
        // It's wrapped in an ApiResponse
        return fallbackResponse.data.data;
      } else {
        // It's directly the profile object
        return fallbackResponse.data;
      }
    } catch (fallbackError) {
      console.error("Both profile update endpoints failed", fallbackError);
      
      // Create a better error message for debugging
      let errorMessage = 'Failed to update profile';
      if (fallbackError && typeof fallbackError === 'object') {
        if ('response' in fallbackError && fallbackError.response) {
          const responseData = fallbackError.response as { data?: any; status?: number };
          if (responseData.data && typeof responseData.data === 'object' && 'detail' in responseData.data) {
            errorMessage = `Server error: ${responseData.data.detail}`;
          } else {
            errorMessage = `Server error (${responseData.status || 'unknown'})`;
          }
        } else if ('message' in fallbackError) {
          errorMessage = `Network error: ${(fallbackError as Error).message}`;
        }
      }
      
      throw new Error(errorMessage);
    }
  }
};

// Logout user
export const logout = async (): Promise<void> => {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    // Clear tokens even if the API call fails
    clearTokens();
  }
};

// Remove duplicate/alternative functions if getCurrentUser is the primary one
// export const getCurrentUserProfile = async (): Promise<UserProfile> => { ... };
// export const updateCurrentUserProfile = async (updateData: UserUpdate): Promise<UserProfile> => { ... };
// export const getCurrentUserProfileViaUsers = async (): Promise<UserProfile> => { ... }; 