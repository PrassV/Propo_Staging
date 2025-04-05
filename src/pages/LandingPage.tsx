import { Navigate } from 'react-router-dom';
import Hero from '../components/hero/Hero';
import Features from '../components/features/Features';
import Benefits from '../components/Benefits';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function LandingPage() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  // Show loading spinner while checking auth
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Check if profile is complete (name and role set)
  const isProfileComplete = profile && 
                           profile.first_name && 
                           profile.last_name && 
                           profile.role;

  // If user is logged in and has complete profile, redirect to dashboard
  if (user && isProfileComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  // If user is logged in but no complete profile, redirect to onboarding
  if (user && !isProfileComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  // Show landing page for non-authenticated users
  return (
    <>
      <Navbar />
      <div className="pt-16"> {/* Add padding-top to account for fixed navbar */}
        <Hero />
        <Features />
        <Benefits />
      </div>
    </>
  );
}