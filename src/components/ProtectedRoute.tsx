import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getCurrentUserRole } from '../lib/userService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'trainer' | 'trainee';
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  redirectTo: _redirectTo,
}) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        setIsAuthenticated(true);
        
        // Get user role
        const role = await getCurrentUserRole();
        setUserRole(role);

        // Redirect based on role if no specific role required
        if (!requiredRole) {
          if (role === 'admin' && !location.pathname.startsWith('/admin')) {
            // Admin trying to access non-admin route
            return;
          } else if (role === 'trainee' && location.pathname.startsWith('/admin')) {
            // Trainee trying to access admin route
            return;
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [location.pathname, requiredRole]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#26313E' }}>
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check role-specific access
  if (requiredRole && userRole !== requiredRole) {
    // Redirect to appropriate dashboard
    if (userRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (userRole === 'trainer') {
      return <Navigate to="/admin/trainees" replace />;
    } else if (userRole === 'trainee') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Auto-redirect based on role if accessing root dashboard
  if (location.pathname === '/dashboard' && userRole === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (location.pathname === '/dashboard' && userRole === 'trainer') {
    return <Navigate to="/admin/trainees" replace />;
  }

  if (location.pathname === '/admin/dashboard' && userRole === 'trainee') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
