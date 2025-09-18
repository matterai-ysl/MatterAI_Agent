import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthPage } from './AuthPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAuth = true 
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated, show auth page
  if (requireAuth && !isAuthenticated) {
    return <AuthPage />;
  }

  // If user is authenticated but trying to access auth page, redirect to main app
  if (!requireAuth && isAuthenticated) {
    const base = (process.env.PUBLIC_URL && process.env.PUBLIC_URL !== '.') ? process.env.PUBLIC_URL : '/agent';
    window.location.href = base.endsWith('/') ? base : `${base}/`;
    return null;
  }

  return <>{children}</>;
};