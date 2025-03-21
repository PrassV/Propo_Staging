import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import { TenantInvitation, TenantInvitationCreate } from '../api/types';

export function useInvitationsApi(filters?: { property_id?: string; status?: string }) {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<TenantInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const invitationsData = await api.invitation.getInvitations(filters);
      setInvitations(invitationsData);
    } catch (error: unknown) {
      console.error('Error fetching invitations:', error);
      let errorMessage = 'Failed to fetch invitations';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Create a new invitation
  const createInvitation = async (invitationData: TenantInvitationCreate) => {
    try {
      const createdInvitation = await api.invitation.createInvitation(invitationData);
      setInvitations(prev => [...prev, createdInvitation]);
      return { success: true, invitation: createdInvitation };
    } catch (error: unknown) {
      console.error('Error creating invitation:', error);
      let errorMessage = 'Failed to create invitation';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      return { success: false, error: errorMessage };
    }
  };

  // Resend an invitation
  const resendInvitation = async (invitationId: string) => {
    try {
      const updatedInvitation = await api.invitation.resendInvitation(invitationId);
      setInvitations(prev => prev.map(i => i.id === invitationId ? updatedInvitation : i));
      return { success: true, invitation: updatedInvitation };
    } catch (error: unknown) {
      console.error('Error resending invitation:', error);
      let errorMessage = 'Failed to resend invitation';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      return { success: false, error: errorMessage };
    }
  };

  // Cancel an invitation
  const cancelInvitation = async (invitationId: string) => {
    try {
      const success = await api.invitation.cancelInvitation(invitationId);
      if (success) {
        setInvitations(prev => prev.filter(i => i.id !== invitationId));
      }
      return { success };
    } catch (error: unknown) {
      console.error('Error canceling invitation:', error);
      let errorMessage = 'Failed to cancel invitation';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      return { success: false, error: errorMessage };
    }
  };

  useEffect(() => {
    if (user) {
      fetchInvitations();
    }
  }, [user, JSON.stringify(filters)]);

  return {
    invitations,
    loading,
    error,
    refetch: fetchInvitations,
    createInvitation,
    resendInvitation,
    cancelInvitation
  };
}

// Hook for verifying and accepting invitations
export function useInvitationVerify() {
  const [invitation, setInvitation] = useState<TenantInvitation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verify an invitation token
  const verifyInvitation = async (token: string) => {
    try {
      setLoading(true);
      setError(null);

      const invitationData = await api.invitation.verifyInvitation(token);
      setInvitation(invitationData);
      return { success: true, invitation: invitationData };
    } catch (error: unknown) {
      console.error('Error verifying invitation:', error);
      let errorMessage = 'Failed to verify invitation';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Accept an invitation
  const acceptInvitation = async (token: string, userData: {
    user_id?: string;
    email?: string;
    password?: string;
    first_name?: string;
    last_name?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const acceptedInvitation = await api.invitation.acceptInvitation(token, userData);
      setInvitation(acceptedInvitation);
      return { success: true, invitation: acceptedInvitation };
    } catch (error: unknown) {
      console.error('Error accepting invitation:', error);
      let errorMessage = 'Failed to accept invitation';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    invitation,
    loading,
    error,
    verifyInvitation,
    acceptInvitation
  };
} 