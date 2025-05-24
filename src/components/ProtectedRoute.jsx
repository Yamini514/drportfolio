import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for admin authentication instead of Firebase
    const adminToken = localStorage.getItem('adminToken');
    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
    
    setIsAuthenticated(adminToken && isAdminLoggedIn);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/admin" replace />;
};

export default ProtectedRoute;