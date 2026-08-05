import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Spinner } from './ui/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isHydrated } = useAuthStore();
  const location = useLocation();

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-4">
        <Spinner size="lg" variant="primary" />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 animate-pulse">
          Hydrating LegalEase Auth Session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

interface LocationState {
  from?: {
    pathname: string;
  };
}

export const PublicOnlyRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
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
