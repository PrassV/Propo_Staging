import { RouteObject } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import PropertyDashboard from '../components/dashboard/PropertyDashboard';
import PropertiesPage from '../pages/dashboard/PropertiesPage';
import AddPropertyPage from '../pages/dashboard/AddPropertyPage';
import PropertyDetailsPage from '../pages/PropertyDetailsPage';
import OnboardingFlow from '../components/onboarding/OnboardingFlow';
import Profile from '../pages/Profile';
import RouteGuard from './RouteGuard';
import AddTenantPage from '../pages/dashboard/AddTenantPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <RouteGuard requireAuth={false} requireProfile={false}>
        <LandingPage />
      </RouteGuard>
    )
  },
  {
    path: '/dashboard',
    element: (
      <RouteGuard>
        <PropertyDashboard />
      </RouteGuard>
    )
  },
  {
    path: '/dashboard/properties',
    element: (
      <RouteGuard>
        <PropertiesPage />
      </RouteGuard>
    )
  },
  {
    path: '/dashboard/properties/add',
    element: (
      <RouteGuard>
        <AddPropertyPage />
      </RouteGuard>
    )
  },
  {
    path: '/dashboard/tenants/add',
    element: (
      <RouteGuard>
        <AddTenantPage />
      </RouteGuard>
    )
  },
  {
    path: '/property/:id',
    element: (
      <RouteGuard>
        <PropertyDetailsPage />
      </RouteGuard>
    )
  },
  {
    path: '/onboarding',
    element: (
      <RouteGuard requireAuth={true} requireProfile={false}>
        <OnboardingFlow />
      </RouteGuard>
    )
  },
  {
    path: '/profile',
    element: (
      <RouteGuard>
        <Profile />
      </RouteGuard>
    )
  }
];