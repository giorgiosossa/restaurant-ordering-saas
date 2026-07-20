import React, { createContext, useContext, useEffect, useState } from "react";
import type { EmployeeRole } from "../config/supabase";
import { endShift, startOrResumeShift, validatePin } from "../services/employeeService";

const SESSION_STORAGE_KEY = "employee_shift";

export interface EmployeeSession {
  employeeId: string;
  name: string;
  roles: EmployeeRole[];
  shiftId: string;
  isAdminBypass: false;
}

interface AdminBypassSession {
  employeeId?: undefined;
  name: "Administrador";
  roles: EmployeeRole[];
  shiftId?: undefined;
  isAdminBypass: true;
}

type ActiveSession = EmployeeSession | AdminBypassSession;

interface EmployeeSessionContextValue {
  session: ActiveSession | null;
  loading: boolean;
  clockIn: (restaurantId: string, pin: string) => Promise<{ error: string | null }>;
  continueAsAdmin: () => void;
  clockOut: () => Promise<void>;
}

const ALL_ROLES: EmployeeRole[] = ["caja", "cocina", "mesero"];

const EmployeeSessionContext = createContext<EmployeeSessionContextValue | undefined>(undefined);

const getStoredSession = (): ActiveSession | null => {
  const stored = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as ActiveSession;
  } catch {
    return null;
  }
};

export const EmployeeSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<ActiveSession | null>(getStoredSession);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [session]);

  const clockIn = async (restaurantId: string, pin: string) => {
    setLoading(true);
    try {
      const employee = await validatePin(restaurantId, pin);
      if (!employee) {
        return { error: "PIN incorrecto o empleado inactivo" };
      }

      const { data: shift, error } = await startOrResumeShift(employee.id, restaurantId);
      if (error || !shift) {
        return { error: "No se pudo iniciar el turno. Intenta de nuevo." };
      }

      setSession({
        employeeId: employee.id,
        name: employee.name,
        roles: employee.roles,
        shiftId: shift.id,
        isAdminBypass: false,
      });
      return { error: null };
    } finally {
      setLoading(false);
    }
  };

  const continueAsAdmin = () => {
    setSession({ name: "Administrador", roles: ALL_ROLES, isAdminBypass: true });
  };

  const clockOut = async () => {
    if (session && !session.isAdminBypass) {
      await endShift(session.shiftId);
    }
    setSession(null);
  };

  return (
    <EmployeeSessionContext.Provider value={{ session, loading, clockIn, continueAsAdmin, clockOut }}>
      {children}
    </EmployeeSessionContext.Provider>
  );
};

export const useEmployeeSession = (): EmployeeSessionContextValue => {
  const context = useContext(EmployeeSessionContext);
  if (!context) throw new Error("useEmployeeSession must be used within an EmployeeSessionProvider");
  return context;
};
