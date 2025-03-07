import { Coins, Zap, Droplets, Receipt, Clock } from 'lucide-react';
import { Tenant } from '../../types/tenant';
import { formatCurrency } from '../../utils/format';

interface TenantUtilityInfoProps {
  tenant: Tenant;
}

export default function TenantUtilityInfo({ tenant }: TenantUtilityInfoProps) {
  const {
    electricity_responsibility = 'tenant',
    water_responsibility = 'tenant',
    property_tax_responsibility = 'landlord',
    maintenance_fee = 0,
    notice_period_days = 30
  } = tenant.utility_details || {};

  return (
    <div className="bg-gray-50 rounded-lg p-4 mt-4">
      <h4 className="font-medium mb-4">Utility & Maintenance Details</h4>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-600">
            <Zap size={18} className="mr-2" />
            <span>Electricity Bill</span>
          </div>
          <span className="font-medium capitalize">{electricity_responsibility}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-600">
            <Droplets size={18} className="mr-2" />
            <span>Water Bill</span>
          </div>
          <span className="font-medium capitalize">{water_responsibility}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-600">
            <Receipt size={18} className="mr-2" />
            <span>Property Tax</span>
          </div>
          <span className="font-medium capitalize">{property_tax_responsibility}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-600">
            <Coins size={18} className="mr-2" />
            <span>Maintenance Fee</span>
          </div>
          <span className="font-medium">{formatCurrency(maintenance_fee)}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-600">
            <Clock size={18} className="mr-2" />
            <span>Notice Period</span>
          </div>
          <span className="font-medium">{notice_period_days} days</span>
        </div>
      </div>
    </div>
  );
}