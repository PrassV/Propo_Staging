import { NavLink, useLocation } from 'react-router-dom';
import { Home, Calculator, LayoutDashboard, FileText, Receipt, Wrench, Settings, X, Users } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { profile } = useProfile();

  const menuItems = [
    { 
      icon: LayoutDashboard, 
      label: 'Dashboard', 
      path: '/dashboard',
      iconClassName: 'text-gray-600'
    },
    { 
      icon: Home, 
      label: 'Properties', 
      path: '/dashboard/properties',
      iconClassName: 'text-gray-600'
    },
    { 
      icon: Users, 
      label: 'Tenants', 
      path: '/dashboard/tenants',
      iconClassName: 'text-gray-600'
    },
    { 
      icon: Wrench, 
      label: 'Maintenance', 
      path: '/dashboard/maintenance',
      iconClassName: 'text-gray-600'
    },

    { 
      icon: Calculator, 
      label: 'Rent Estimation', 
      path: '/dashboard/rent-estimation',
      iconClassName: 'text-gray-600'
    },
    { 
      icon: FileText, 
      label: 'Rent Agreement', 
      path: '/dashboard/rent-agreement',
      iconClassName: 'text-gray-600'
    },
    { 
      icon: Receipt, 
      label: 'Tax Payments', 
      path: '/dashboard/tax-payments',
      iconClassName: 'text-gray-600'
    },
    { 
      icon: Settings, 
      label: 'Settings', 
      path: '/profile',
      iconClassName: 'text-gray-600'
    }
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
      <aside className={`sticky top-[theme(spacing.16)] left-0 h-[calc(100vh-theme(spacing.16))] w-64 bg-white border-r z-40 transform transition-transform duration-200
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        {/* Mobile close button - Position relative to sidebar */}
        <button 
          onClick={onClose}
          className="md:hidden absolute right-4 top-4 text-gray-500 hover:text-gray-700 z-50" /* Ensure button is above */
        >
          <X size={24} />
        </button>

        {/* User info */}
        <div className="px-6 py-8">
          <h2 className="text-xl font-semibold truncate">{profile?.first_name} {profile?.last_name}</h2>
          <p className="text-sm text-gray-600 truncate">{profile?.email}</p>
        </div>

        {/* Menu items */}
        <nav className="px-3">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                      isActive 
                        ? 'bg-black text-white' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon size={20} className={isActive ? 'text-white' : item.iconClassName} />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
