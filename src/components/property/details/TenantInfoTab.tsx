import React from 'react';
import { TenantLeaseInfo } from '@/api/types';
import { Link } from 'react-router-dom';
import { User, Mail, ArrowRight } from 'lucide-react';

interface TenantInfoTabProps {
  tenant: TenantLeaseInfo | null | undefined;
}

export default function TenantInfoTab({ tenant }: TenantInfoTabProps) {
  if (!tenant) return <p className="text-sm text-muted-foreground">Tenant details not available.</p>;

  return (
    <div className="space-y-4 p-2">
        <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg border">
          <div className="flex-shrink-0">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
              <User className="h-6 w-6 text-gray-600" />
            </span>
          </div>
          <div className="flex-1 min-w-0">
                          <p className="text-lg font-medium text-gray-900 truncate">{tenant.name}</p>
            <p className="text-sm text-gray-500 truncate flex items-center">
              <Mail className="mr-2 h-4 w-4"/>
              {tenant.email}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-3 pt-2">
          <Link 
              to={`/tenants/${tenant.id}`} 
              className="flex-1 inline-flex items-center justify-center text-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
              View Full Profile
              <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <button 
            className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
            onClick={() => window.open(`mailto:${tenant.email}`, '_blank')}
          >
            Send Email
          </button>
        </div>
    </div>
  );
} 