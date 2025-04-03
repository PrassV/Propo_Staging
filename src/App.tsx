import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { routes } from './routes';
import Layout from './components/Layout';
import { AuthProvider } from './contexts/AuthContext';
import { PropertyDialogProvider } from './contexts/PropertyDialogContext';

export default function App() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}