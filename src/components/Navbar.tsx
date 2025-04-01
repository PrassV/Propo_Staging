import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import AuthModal from './auth/AuthModal';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import NotificationDropdown from './notifications/NotificationDropdown';

interface NavbarProps {
  onMenuClick?: () => void;
}

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            {user && (
              <button
                onClick={onMenuClick}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 focus:outline-none md:hidden"
              >
                <Menu size={24} />
              </button>
            )}
            <Link to={user ? "/dashboard" : "/"} className="text-2xl font-bold tracking-wider ml-2">Propify</Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(prev => !prev)}
                  className="relative p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
                >
                  <span className="sr-only">View notifications</span>
                  <Bell size={24} />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-4 w-4 transform -translate-y-1/2 translate-x-1/2 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {isDropdownOpen && (
                  <NotificationDropdown 
                    notifications={notifications}
                    unreadCount={unreadCount}
                    onMarkAsRead={markAsRead}
                    onMarkAllAsRead={markAllAsRead}
                    onClose={() => setIsDropdownOpen(false)}
                  />
                )}
              </div>
            ) : (
              <>
                <Link to="#features" className="hidden sm:block hover:text-gray-600 tracking-wide">Features</Link>
                <Link to="#pricing" className="hidden sm:block hover:text-gray-600 tracking-wide">Pricing</Link>
                <Link to="#about" className="hidden sm:block hover:text-gray-600 tracking-wide">About</Link>
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="bg-black text-white px-6 py-2 rounded-lg tracking-wide hover:bg-gray-800 transition-colors"
                >
                  Log In
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {!user && showAuthModal && (
         <AuthModal 
           isOpen={showAuthModal}
           onClose={() => setShowAuthModal(false)}
         />
      )}
    </nav>
  );
};

export default Navbar;