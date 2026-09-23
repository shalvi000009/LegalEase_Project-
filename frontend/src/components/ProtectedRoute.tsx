import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Spinner } from './ui/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { user, isAuthenticated, isHydrated, isLoading } = useAuthStore();
  const location = useLocation();

  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-4">
        <Spinner size="lg" variant="primary" />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 animate-pulse">
          Loading LegalEase Session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin Role Check (allowed if user.role === 'admin' OR in dev preview mode)
  if (requireAdmin && user?.role && user.role !== 'admin' && process.env.NODE_ENV === 'production') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

interface LocationState {
  from?: {
    pathname: string;
  };
}

export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isHydrated } = useAuthStore();
  const location = useLocation();

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-4">
        <Spinner size="lg" variant="primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    const state = location.state as LocationState | null;
    const from = state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};
