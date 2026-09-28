import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/common/Button';

/**
 * ProtectedRoute — renders <Outlet> if authenticated,
 * redirects to /login otherwise.
 * Shows a centered spinner while checking auth state.
 */
export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg-base)',
        }}
        role="status"
        aria-label="Checking authentication"
      >
        <Loader size={28} />
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

/**
 * PublicRoute — redirects authenticated users away from auth pages.
 */
export function PublicRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg-base)',
        }}
        role="status"
        aria-label="Loading"
      >
        <Loader size={28} />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/chat" replace /> : <Outlet />;
}
