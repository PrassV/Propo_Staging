import { lazy, Suspense } from 'react';
import { RouteObject } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import RouteGuard from './RouteGuard';
import LandingPage from '../pages/LandingPage';

const OwnerDashboard = lazy(() => import('../components/dashboard/owner/OwnerDashboard'));
const TenantDashboard = lazy(() => import('../components/dashboard/tenant/TenantDashboard'));
const PropertyList = lazy(() => import('../pages/dashboard/PropertiesPage'));
const PropertyDetailsPage = lazy(() => import('../pages/PropertyDetailsPage'));
const AddProperty = lazy(() => import('../pages/dashboard/AddPropertyPage'));
const Profile = lazy(() => import('../pages/Profile'));
const RentEstimationPage = lazy(() => import('../pages/RentEstimationPage'));
const RentAgreement = lazy(() => import('../pages/RentAgreement'));
const AddTenantPage = lazy(() => import('../pages/dashboard/AddTenantPage'));
const MaintenanceDashboard = lazy(() => import('../pages/maintenance/MaintenanceDashboard'));
const RequestDetails = lazy(() => import('../components/maintenance/RequestDetails'));

const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<LoadingSpinner />}>
    <Component />
  </Suspense>
);

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <LandingPage />
  },
  {
    path: '/dashboard',
    element: (
      <RouteGuard requireAuth requireProfile>
        {withSuspense(OwnerDashboard)}
      </RouteGuard>
    )
  },
  {
    path: '/dashboard/owner',
    element: (
      <RouteGuard requireAuth requireProfile>
        {withSuspense(OwnerDashboard)}
      </RouteGuard>
    )
  },
  {
    path: '/dashboard/tenant',
    element: (
      <RouteGuard requireAuth requireProfile>
        {withSuspense(TenantDashboard)}
      </RouteGuard>
    )
  },
  {
    path: '/dashboard/properties',
    element: (
      <RouteGuard requireAuth requireProfile>
        {withSuspense(PropertyList)}
      </RouteGuard>
    )
  },
  {
    path: '/property/:id',
    element: (
      <RouteGuard requireAuth requireProfile>
        {withSuspense(PropertyDetailsPage)}
      </RouteGuard>
    )
  },
  {
    path: '/dashboard/properties/add',
    element: (
      <RouteGuard requireAuth requireProfile>
        {withSuspense(AddProperty)}
      </RouteGuard>
    )
  },
  {
    path: '/dashboard/rent-estimation',
    element: (
      <RouteGuard requireAuth requireProfile>
        {withSuspense(RentEstimationPage)}
      </RouteGuard>
    )
  },
  {
    path: '/dashboard/rent-agreement',
    element: (
      <RouteGuard requireAuth requireProfile>
        {withSuspense(RentAgreement)}
      </RouteGuard>
    )
  },
  {
    path: '/dashboard/add-tenant',
    element: (
      <RouteGuard requireAuth requireProfile>
        {withSuspense(AddTenantPage)}
      </RouteGuard>
    )
  },
  {
    path: '/dashboard/maintenance',
    element: (
      <RouteGuard requireAuth requireProfile>
        {withSuspense(MaintenanceDashboard)}
      </RouteGuard>
    )
  },
  {
    path: '/dashboard/maintenance/:id',
    element: (
      <RouteGuard requireAuth requireProfile>
        {withSuspense(RequestDetails)}
      </RouteGuard>
    )
  },
  {
    path: '/profile',
    element: (
      <RouteGuard requireAuth>
        {withSuspense(Profile)}
      </RouteGuard>
    )
  }
];
