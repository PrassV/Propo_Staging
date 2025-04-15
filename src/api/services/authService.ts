import apiClient from '../client';
import { ApiResponse, LoginRequest, LoginResponse, UserProfile } from '../types';
import { storeToken, storeRefreshToken, clearTokens } from '../../utils/token';

// Login user
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
  
  // Store the tokens
  storeToken(response.data.access_token);
  if (response.data.refresh_token) {
    storeRefreshToken(response.data.refresh_token);
  }
  
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
}): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/signup', userData);
  
  // Store tokens exactly like we do in the login function
  storeToken(response.data.access_token);
  if (response.data.refresh_token) {
    storeRefreshToken(response.data.refresh_token);
  }
  
  return response.data;
};

// Get current user profile
export const getCurrentUser = async (): Promise<UserProfile> => {
  const response = await apiClient.get<UserProfile>('/users/me');
  return response.data;
};

// Update user profile
export const updateUserProfile = async (profileData: Partial<UserProfile>): Promise<UserProfile> => {
  try {
    // Call the primary /users/me endpoint
    const response = await apiClient.put<ApiResponse<UserProfile> | UserProfile>('/users/me', profileData);

    // Handle different response formats from /users/me
    if (response.data && 'data' in response.data && response.data.data) {
      // It's wrapped in an ApiResponse like { data: UserProfile, message: string }
      return response.data.data;
    } else if (response.data && ('id' in response.data || 'email' in response.data)) {
      // It's directly the profile object (UserProfile)
      return response.data as UserProfile; // Type assertion needed
    } else {
      // Handle unexpected response structure
      console.error("Unexpected response structure from /users/me:", response.data);
      throw new Error("Failed to update profile due to unexpected response.");
    }
  } catch (error) {
    console.error("Error updating profile with /users/me:", error);

    // Construct a user-friendly error message
    let errorMessage = 'Failed to update profile';
    if (error && typeof error === 'object') {
      if ('response' in error && error.response) {
        const response = error.response as { data?: unknown; status?: number };
        if (response.data &&
            typeof response.data === 'object' &&
            response.data !== null &&
            'detail' in response.data &&
            typeof (response.data as { detail: string }).detail === 'string') {
          errorMessage = `Server error: ${(response.data as { detail: string }).detail}`;
        } else {
          errorMessage = `Server error (${response.status || 'unknown'})`;
        }
      } else if ('message' in error) {
        errorMessage = `Network error: ${(error as Error).message}`;
      }
    }
    throw new Error(errorMessage);
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