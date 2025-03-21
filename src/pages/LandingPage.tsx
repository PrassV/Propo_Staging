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

  // If user is logged in and has profile, redirect to dashboard
  if (user && profile?.first_name) {
    return <Navigate to="/dashboard" replace />;
  }

  // If user is logged in but no profile, redirect to onboarding
  if (user && !profile?.first_name) {
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