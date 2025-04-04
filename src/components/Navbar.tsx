import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut } from 'lucide-react';
import AuthModal from './auth/AuthModal';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import NotificationDropdown from './notifications/NotificationDropdown';
import { LoginResponse } from '@/api/types';

interface NavbarProps {
  onMenuClick?: () => void;
}

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { user, logoutUser } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleLoginSuccess = (loginResponse: LoginResponse) => {
    setShowAuthModal(false);
    const userProfile = loginResponse.user;
    if (userProfile && userProfile.user_type) {
      navigate('/dashboard');
    } else {
      navigate('/profile');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-card text-card-foreground border-b z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            {user && (
              <button
                onClick={onMenuClick}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground focus:outline-none md:hidden mr-2"
              >
                <Menu size={24} />
              </button>
            )}
            <Link to={user ? "/dashboard" : "/"} className="text-xl font-bold tracking-wide text-primary hover:opacity-90 transition-opacity">
              Propify
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setIsDropdownOpen(prev => !prev)}
                    className="relative p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none"
                    aria-label="View notifications"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 block h-3 w-3 transform translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center">
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

                <button
                  onClick={handleLogout}
                  className="flex items-center p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none"
                  aria-label="Logout"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <>
                <Link to="#features" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</Link>
                <Link to="#pricing" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
                <Link to="#about" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</Link>
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
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
           onLoginSuccess={handleLoginSuccess}
         />
      )}
    </nav>
  );
};

export default Navbar;