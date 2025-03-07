import { LayoutDashboard, Building2, Users, Wrench, DollarSign } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Building2, label: 'Properties', path: '/dashboard/properties' },
  { icon: Users, label: 'Tenants', path: '/dashboard/tenants' },
  { icon: Wrench, label: 'Maintenance', path: '/dashboard/maintenance' },
  { icon: DollarSign, label: 'Financials', path: '/dashboard/financials' }
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 bg-white h-screen fixed left-0 top-0 shadow-sm pt-20">
      <nav className="px-4 py-6">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
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
    </div>
  );
}