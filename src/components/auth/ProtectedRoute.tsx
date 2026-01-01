import { useAuth } from '@/contexts';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

/**
 * A component that renders its children only if the user is an authenticated admin.
 * Otherwise, it redirects them to the login page.
 * It preserves the original location to allow redirection after successful login.
 */
export const ProtectedRoute = () => {
  const { isAuthenticated, canAccessAdmin, isLoading } = useAuth();
  const location = useLocation();

  // If authentication status is still loading, render a spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  // If not authenticated, redirect to the login page
  if (!isAuthenticated) {
    return <Navigate to="/dang-nhap" state={{ from: location }} replace />;
  }

  // If authenticated but does not have admin-area access, send them to the public home page
  if (isAuthenticated && !canAccessAdmin) {
    return <Navigate to="/" replace />;
  }

  // Authenticated and authorized
  return <Outlet />;
};
