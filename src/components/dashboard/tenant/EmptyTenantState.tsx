import { Building2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyTenantStateProps {
  tenant: {
    name: string;
    email: string;
  };
}

export default function EmptyTenantState({ tenant }: EmptyTenantStateProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-wide">Welcome, {tenant.name}!</h1>
          <p className="text-gray-600">{tenant.email}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-8 h-8 text-gray-600" />
          </div>
          
          <h2 className="text-2xl font-semibold mb-4">No Property Assigned Yet</h2>
          <p className="text-gray-600 mb-8">
            Please wait for your property owner to send you an invitation. Once you receive 
            the invitation, you'll be able to access your property details here.
          </p>

          <Link
            to="/profile"
            className="inline-flex items-center space-x-2 text-black hover:text-gray-600"
          >
            <span>View Profile</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}