import { Link, useLocation } from 'react-router-dom';
import { X, Home, Calculator, FileText, Receipt, Wrench, Video, Settings } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { profile } = useProfile();

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Calculator, label: 'Rent Estimation', path: '/dashboard/rent-estimation' },
    { icon: FileText, label: 'Rent Agreement', path: '/dashboard/rent-agreement' },
    { icon: Receipt, label: 'Tax Payments', path: '/dashboard/tax-payments' },
    { icon: Wrench, label: 'Maintenance', path: '/dashboard/maintenance' },
    { icon: Video, label: 'Monitoring', path: '/dashboard/monitoring' },
    { icon: Settings, label: 'Settings', path: '/profile' }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity duration-200
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r z-40 transform transition-transform duration-200
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        {/* Mobile close button */}
        <button 
          onClick={onClose}
          className="md:hidden absolute right-4 top-4 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>

        {/* User info */}
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold truncate">{profile?.first_name} {profile?.last_name}</h2>
          <p className="text-sm text-gray-600 truncate">{profile?.email}</p>
        </div>

        {/* Menu items */}
        <nav className="p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                      isActive 
                        ? 'bg-black text-white' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}