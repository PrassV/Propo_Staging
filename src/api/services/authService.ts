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
  const response = await apiClient.put<ApiResponse<UserProfile>>('/auth/profile', profileData);
  return response.data.data;
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