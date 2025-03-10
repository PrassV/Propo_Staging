import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Don't show layout on auth pages
  const isAuthPage = location.pathname.startsWith('/invite/');
  if (isAuthPage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed navbar */}
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Main content */}
      <div className="flex">
        {user && (
          <Sidebar 
            isOpen={sidebarOpen} 
            onClose={() => setSidebarOpen(false)} 
          />
        )}

        <main className={`flex-1 transition-all duration-200 ${user ? 'md:pl-64' : ''} pt-16`}>
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}