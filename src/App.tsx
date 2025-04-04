import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { routes } from './routes';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PropertyDialogProvider } from './contexts/PropertyDialogContext';
import LoadingSpinner from './components/common/LoadingSpinner';

// New component to handle initialization state
const AppContent = () => {
  const { initialized } = useAuth();

  // Show loading spinner until auth context is initialized
  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Render the main app content once initialized
  return (
    <PropertyDialogProvider>
      <Router>
        <Layout>
          <Routes>
            {routes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={route.element}
              />
            ))}
          </Routes>
        </Layout>
        <Toaster position="top-right" />
      </Router>
    </PropertyDialogProvider>
  );
};

export default function App() {
  return (
    // AuthProvider wraps the component that checks initialization
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}