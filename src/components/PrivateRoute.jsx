// src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

const PrivateRoute = ({ isLoggedIn, userRole, allowedRoles, children }) => {
  const location = useLocation();

  if (!isLoggedIn) {
    toast.error("You must be logged in to access this page.");
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    toast.error("You do not have permission to access this page.");
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
