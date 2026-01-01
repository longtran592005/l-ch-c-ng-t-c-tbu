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

  // If authentication status is still loading, render nothing or a loading spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  // If user is authenticated and has admin-area access, allow access to the protected route
  if (isAuthenticated && canAccessAdmin) {
    return <Outlet />;
  }

  // If not authenticated or not an admin, redirect to the login page
  return <Navigate to="/dang-nhap" state={{ from: location }} replace />;
};
