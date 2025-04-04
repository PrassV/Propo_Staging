import apiClient from '../client';
import { ApiResponse, LoginRequest, LoginResponse, UserProfile, UserUpdate } from '../types';
import { storeToken, storeRefreshToken, clearTokens } from '../../utils/token';

// Login user
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/login', credentials);
  
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
  const response = await apiClient.post<ApiResponse<{ user: UserProfile }>>('/auth/register', userData);
  return response.data.data.user;
};

// Get current user profile
export const getCurrentUser = async (): Promise<UserProfile> => {
  const response = await apiClient.get<ApiResponse<UserProfile>>('/auth/me');
  return response.data.data;
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

// Function to get current user profile
export const getCurrentUserProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get<UserProfile>('/auth/me'); 
  return response.data;
};

// Function to update current user profile
export const updateCurrentUserProfile = async (updateData: UserUpdate): Promise<UserProfile> => {
  const response = await apiClient.put<UserProfile>('/users/me', updateData);
  return response.data;
};

/* Potential alternative using /users/me for getting profile
export const getCurrentUserProfileViaUsers = async (): Promise<UserProfile> => {
  const response = await apiClient.get<UserProfile>('/users/me'); 
  return response.data;
};
*/ 