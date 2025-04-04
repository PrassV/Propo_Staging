import apiClient from '../client';

// Assuming UserProfile type matches what the backend expects for PUT /auth/me
// You might need to define this type more accurately based on backend models.
export interface UserProfileUpdateData {
  id?: string; // ID might not be needed in body if it's in the URL/token
  first_name?: string;
  last_name?: string;
  email?: string; // Usually not updatable this way
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  id_type?: string;
  id_image_url?: string;
  user_type?: 'owner' | 'tenant';
  // Add any other fields the backend expects/allows for update
}

// Define a more specific response type if known, e.g.:
// interface UserProfileResponse { 
//   id: string;
//   email: string;
//   first_name: string;
//   // ... other fields returned by PUT /auth/me
// }

/**
 * Updates the current authenticated user's profile.
 * Calls the backend's PUT /users/me endpoint.
 * 
 * @param profileData The profile data to update.
 * @returns The updated user profile data (adjust return type as needed).
 * @throws Will throw an error if the update fails.
 */
export const updateUserProfile = async (
  profileData: UserProfileUpdateData
): Promise<unknown> => {
  try {
    // Specify expected response type if known, otherwise use unknown
    const response = await apiClient.put<unknown>('/users/me', profileData);
    
    // Handle different response formats
    if (response.data && typeof response.data === 'object') {
      if ('data' in response.data && response.data.data) {
        // It's wrapped in an ApiResponse
        return response.data.data;
      }
    }
    
    // It's directly the profile object or another format
    return response.data;
  } catch (error) {
    console.error("Error updating user profile:", error);
    
    // Refined error handling
    let errorMessage = 'Failed to update profile';
    if (error && typeof error === 'object' && 'response' in error && 
        error.response && typeof error.response === 'object' && 'data' in error.response &&
        error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data) {
         errorMessage = (error.response.data as { detail: string }).detail;
    } else if (error instanceof Error) {
         errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
}; 