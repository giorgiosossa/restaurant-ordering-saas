import React, { createContext, useContext, useState } from "react";
import { supabase } from "../config/supabase";
import { useNavigate } from "react-router-dom";

type AccessType = "owner" | "employee" | null;

interface EmployeeData {
  id: string;
  name: string;
  roles: string[];
}

interface AccessResult {
  accessType: AccessType;
  employeeData?: EmployeeData;
}

interface OwnerAuthContextType {
  isPinVerified: boolean;
  accessType: AccessType;
  employeeData: EmployeeData | null;
  verifyPin: (restaurantId: string, pin: string) => Promise<AccessResult>;
  logout: () => void;
}

const OwnerAuthContext = createContext<OwnerAuthContextType | undefined>(undefined);

export const OwnerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [accessType, setAccessType] = useState<AccessType>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);

  const verifyPin = async (
    restaurantId: string,
    pin: string
  ): Promise<AccessResult> => {
    try {
      const { data, error } = await supabase.rpc("verify_access_pin", {
        p_restaurant_id: restaurantId,
        p_pin: pin,
      });

      if (error) {
        console.error("Error verifying PIN:", error);
        return { accessType: null };
      }

      // The function returns an array with one result
      const result = data && data.length > 0 ? data[0] : null;

      if (!result || !result.access_type) {
        return { accessType: null };
      }

      const access = result.access_type as AccessType;
      setIsPinVerified(true);
      setAccessType(access);

      if (access === "employee") {
        const empData: EmployeeData = {
          id: result.employee_id,
          name: result.employee_name,
          roles: result.employee_roles || [],
        };
        setEmployeeData(empData);

        // Store employee session
        localStorage.setItem(
          "pinSession",
          JSON.stringify({
            type: "employee",
            restaurantId,
            employeeData: empData,
            timestamp: Date.now(),
          })
        );

        return { accessType: access, employeeData: empData };
      } else {
        // Owner access
        setEmployeeData(null);

        // Store owner session
        localStorage.setItem(
          "pinSession",
          JSON.stringify({
            type: "owner",
            restaurantId,
            timestamp: Date.now(),
          })
        );

        return { accessType: access };
      }
    } catch (error) {
      console.error("Error verifying PIN:", error);
      return { accessType: null };
    }
  };

  const logout = () => {
    setIsPinVerified(false);
    setAccessType(null);
    setEmployeeData(null);
    localStorage.removeItem("pinSession");
  };

  return (
    <OwnerAuthContext.Provider
      value={{
        isPinVerified,
        accessType,
        employeeData,
        verifyPin,
        logout,
      }}
    >
      {children}
    </OwnerAuthContext.Provider>
  );
};

export const useOwnerAuth = () => {
  const context = useContext(OwnerAuthContext);
  if (context === undefined) {
    throw new Error("useOwnerAuth must be used within an OwnerAuthProvider");
  }
  return context;
};
