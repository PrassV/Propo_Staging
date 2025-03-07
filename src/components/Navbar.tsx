import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthModal from './auth/AuthModal';

const Navbar = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-2xl font-bold tracking-wider">Propo</Link>
          
          <div className="flex items-center space-x-8">
            <Link to="#features" className="hover:text-gray-600 tracking-wide">Features</Link>
            <Link to="#pricing" className="hover:text-gray-600 tracking-wide">Pricing</Link>
            <Link to="#about" className="hover:text-gray-600 tracking-wide">About</Link>
            <button 
              onClick={() => setShowAuthModal(true)}
              className="bg-black text-white px-6 py-2 rounded-lg tracking-wide hover:bg-gray-800 transition-colors"
            >
              Log In
            </button>
          </div>
        </div>
      </div>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </nav>
  );
};

export default Navbar;