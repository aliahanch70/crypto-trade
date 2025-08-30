// src/components/ProtectedRoute.tsx

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

type Props = {
  children: React.ReactNode;
};

export function ProtectedRoute({ children }: Props) {
  const { user, isDemoMode } = useAuth();
  const location = useLocation();

  // (THE FIX) - اگر کاربر لاگین نکرده بود و همزمان در حالت دمو هم نبود، او را به صفحه لاگین بفرست
  if (!user && !isDemoMode) {
    // ما مسیر فعلی را به صفحه لاگین می‌فرستیم تا بعد از لاگین به همین صفحه برگردد
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // در غیر این صورت، اجازه دسترسی به صفحه را بده
  return <>{children}</>;
}