import type { InvitationVerificationResponse, InvitationData, InvitationResponse } from '../types/invitation';

export async function verifyInvitationToken(token: string): Promise<InvitationVerificationResponse> {
  try {
    // Using fetch API to make the API call
    const response = await fetch(`${import.meta.env.VITE_API_URL}/invitations/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    
    return await response.json();
  } catch (error: unknown) {
    console.error('Error verifying invitation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid invitation'
    };
  }
}

// Other invitation-related functions
export async function sendInvitation(data: InvitationData): Promise<InvitationResponse> {
  try {
    // Using fetch API to make the call
    const response = await fetch(`${import.meta.env.VITE_API_URL}/invitations/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    return await response.json();
  } catch (error: unknown) {
    console.error('Error sending invitation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send invitation';
    throw new Error(errorMessage);
  }
}