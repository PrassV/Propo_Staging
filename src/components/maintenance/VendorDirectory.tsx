import { useState } from 'react';
import { Star, Plus, Phone, Mail, MapPin } from 'lucide-react';
import { useVendors } from '../../hooks/useVendors';
import { MaintenanceCategory } from '../../types/maintenance';
import VendorForm from './VendorForm';

export default function VendorDirectory() {
  const [selectedCategory, setSelectedCategory] = useState<MaintenanceCategory | 'all'>('all');
  const [showVendorForm, setShowVendorForm] = useState(false);
  const { vendors = [], loading, refetch } = useVendors(selectedCategory === 'all' ? undefined : selectedCategory);

  const renderRatingStars = (rating: number) => {
    return [...Array(5)].map((_, index) => (
      <Star
        key={index}
        size={16}
        className={`${index < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Preferred Vendors</h2>
          <p className="text-gray-600">Trusted service providers</p>
        </div>
        <button 
          onClick={() => setShowVendorForm(true)}
          className="flex items-center space-x-2 text-black hover:text-gray-600"
        >
          <Plus size={20} />
          <span>Add Vendor</span>
        </button>
      </div>

      <div className="mb-4">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as MaintenanceCategory | 'all')}
          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-black"
        >
          <option value="all">All Categories</option>
          <option value="plumbing">Plumbing</option>
          <option value="electrical">Electrical</option>
          <option value="carpentry">Carpentry</option>
          <option value="painting">Painting</option>
          <option value="appliance">Appliance Repair</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-4 text-gray-600">Loading vendors...</div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-4 text-gray-600">No vendors found</div>
        ) : (
          vendors.map((vendor) => (
            <div key={vendor.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">{vendor.name}</h3>
                  <div className="flex items-center space-x-1 mt-1">
                    {renderRatingStars(vendor.rating)}
                  </div>
                </div>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {vendor.categories[0]}
                </span>
              </div>
              
              <div className="space-y-2 mt-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Phone size={16} />
                  <span>{vendor.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail size={16} />
                  <span>{vendor.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin size={16} />
                  <span>{vendor.address}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showVendorForm && (
        <VendorForm
          onClose={() => setShowVendorForm(false)}
          onSubmit={() => {
            setShowVendorForm(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}