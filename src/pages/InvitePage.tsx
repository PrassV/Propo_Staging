import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building, Mail, Phone, User } from 'lucide-react';
import { verifyInvitation } from '../utils/invitation';
import { formatCurrency } from '../utils/format';
import { formatDate } from '../utils/date';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { storeInvitationToken } from '../utils/token';
import AuthModal from '../components/auth/AuthModal';
import toast from 'react-hot-toast';

export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const fetchInvitationData = async () => {
      if (!token) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      try {
        const invitation = await verifyInvitation(token);
        setInvitationData(invitation);
      } catch (err: any) {
        console.error('Error verifying invitation:', err);
        setError(err.message || 'Invalid invitation');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitationData();
  }, [token]);

  const handleAcceptInvitation = async () => {
    try {
      if (!user) {
        setShowAuthModal(true);
        return;
      }

      setLoading(true);
      
      // Store invitation token
      if (token) {
        storeInvitationToken(token);
      }
      
      navigate('/onboarding');
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || 'Failed to accept invitation');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  if (!invitationData) return null;

  const { property, tenant } = invitationData;

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Welcome to Propify</h1>
              <p className="text-gray-600">
                You've been invited to join {property.property_name} on Propify's property management platform.
              </p>
            </div>

            {/* Property Details */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Property Details</h2>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-white rounded-lg">
                    <Building size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{property.property_name}</h3>
                    <p className="text-gray-600">
                      {property.address_line1}, {property.city}, {property.state}
                    </p>
                    <p className="text-gray-600 mt-1 capitalize">
                      Type: {property.property_type}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rental Details */}
            {tenant.rental_type && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Rental Details</h2>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="space-y-3">
                    <p className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium capitalize">{tenant.rental_type}</span>
                    </p>
                    {tenant.rental_type === 'rent' && (
                      <>
                        <p className="flex justify-between">
                          <span className="text-gray-600">Rent Amount:</span>
                          <span className="font-medium">{formatCurrency(tenant.rental_amount || 0)}</span>
                        </p>
                        {tenant.maintenance_fee > 0 && (
                          <p className="flex justify-between">
                            <span className="text-gray-600">Maintenance Fee:</span>
                            <span className="font-medium">{formatCurrency(tenant.maintenance_fee)}</span>
                          </p>
                        )}
                        <p className="flex justify-between">
                          <span className="text-gray-600">Frequency:</span>
                          <span className="font-medium capitalize">{tenant.rental_frequency}</span>
                        </p>
                      </>
                    )}
                    <p className="flex justify-between">
                      <span className="text-gray-600">Period:</span>
                      <span className="font-medium">
                        {formatDate(tenant.rental_start_date || '')} - 
                        {formatDate(tenant.rental_end_date || '')}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Owner Details */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Property Owner</h2>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-white rounded-lg">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {property.owner.first_name} {property.owner.last_name}
                    </h3>
                    <div className="space-y-2 mt-2">
                      <p className="flex items-center text-gray-600">
                        <Mail size={16} className="mr-2" />
                        {property.owner.email}
                      </p>
                      <p className="flex items-center text-gray-600">
                        <Phone size={16} className="mr-2" />
                        {property.owner.phone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="text-center">
              <button
                onClick={handleAcceptInvitation}
                disabled={loading}
                className="bg-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Accept Invitation'}
              </button>
              <p className="text-sm text-gray-500 mt-4">
                {user ? 
                  'Click accept to continue to your account setup.' :
                  'You\'ll need to create an account or sign in to accept this invitation.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}