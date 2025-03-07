import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { sendTenantInvitation } from '../../utils/invitation';
import toast from 'react-hot-toast';
import { useProfile } from '../../hooks/useProfile';
import { useParams } from 'react-router-dom';

interface InviteTenantButtonProps {
  tenantId: string;
  tenantEmail: string;
}

export default function InviteTenantButton({ tenantId, tenantEmail }: InviteTenantButtonProps) {
  const [loading, setLoading] = useState(false);
  const { profile } = useProfile();
  const { id: propertyId } = useParams();

  const handleInvite = async () => {
    if (!profile?.first_name) {
      toast.error('Unable to send invitation: Profile not found');
      return;
    }

    if (!propertyId) {
      toast.error('Unable to send invitation: Property not found');
      return;
    }

    setLoading(true);
    try {
      const ownerName = `${profile.first_name} ${profile.last_name || ''}`.trim();
      const result = await sendTenantInvitation({
        propertyId,
        tenantId,
        ownerName,
        email: tenantEmail
      });
      
      if (result.success) {
        toast.success('Invitation sent successfully');
      } else {
        throw result.error;
      }
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleInvite}
      disabled={loading}
      className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 disabled:opacity-50"
      title="Send Invitation"
    >
      <UserPlus size={18} />
      <span>{loading ? 'Sending...' : 'Invite to Platform'}</span>
    </button>
  );
}