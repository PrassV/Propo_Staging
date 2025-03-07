import { useState } from 'react';
import { Plus } from 'lucide-react';
import MaintenanceStats from '../../components/maintenance/MaintenanceStats';
import MaintenanceRequestList from '../../components/maintenance/MaintenanceRequestList';
import VendorDirectory from '../../components/maintenance/VendorDirectory';
import NewRequestModal from '../../components/maintenance/NewRequestModal';
import { useProfile } from '../../hooks/useProfile';

export default function MaintenanceDashboard() {
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const { profile } = useProfile();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-wide">Maintenance & Repairs</h1>
          <p className="text-gray-600">Manage maintenance requests and vendors</p>
        </div>
        <button
          onClick={() => setShowNewRequestModal(true)}
          className="flex items-center space-x-2 bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={20} />
          <span>New Request</span>
        </button>
      </div>

      <MaintenanceStats />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <MaintenanceRequestList userType={profile?.user_type} />
        </div>
        <div className="lg:col-span-1">
          <VendorDirectory />
        </div>
      </div>

      {showNewRequestModal && (
        <NewRequestModal
          onClose={() => setShowNewRequestModal(false)}
          onSubmit={() => {
            setShowNewRequestModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}