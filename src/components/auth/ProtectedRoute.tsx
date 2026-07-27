import React, { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean; // If true, only admin can access (blocks employees)
}

/**
 * ProtectedRoute - Restricts access based on authentication type
 * - requireAdmin=true: Only admin users can access (redirects employees to /comandas)
 * - requireAdmin=false: Both admin and employees can access
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const navigate = useNavigate();

  // Check if user is authenticated
  const userSession = localStorage.getItem("user");
  const employeeSession = localStorage.getItem("employee_session");

  // Not authenticated at all
  if (!userSession && !employeeSession) {
    return <Navigate to="/login" replace />;
  }

  // Employee trying to access admin-only route
  if (requireAdmin && employeeSession && !userSession) {
    return <Navigate to="/comandas" replace />;
  }

  // Parse sessions to check auth type
  try {
    const parsedEmployeeSession = employeeSession
      ? JSON.parse(employeeSession)
      : null;

    // If employee session exists and authType is employee, restrict to /comandas
    if (parsedEmployeeSession?.authType === "employee" && requireAdmin) {
      return <Navigate to="/comandas" replace />;
    }
  } catch (err) {
    console.error("Error parsing session:", err);
  }

  return <>{children}</>;
};

export default ProtectedRoute;
