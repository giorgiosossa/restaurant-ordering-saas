import React, { useState } from "react";
import { Delete, Lock, LogIn } from "lucide-react";
import { Button } from "../ui";

interface PinAuthenticationProps {
  restaurantId: string;
  onAdminAuth: (pin: string) => Promise<{ success: boolean; error?: string }>;
  onEmployeeAuth: (pin: string) => Promise<{ success: boolean; error?: string }>;
  onBack?: () => void;
}

const PinAuthentication: React.FC<PinAuthenticationProps> = ({
  // restaurantId, // Not used in component
  onAdminAuth,
  onEmployeeAuth,
  onBack,
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const MAX_PIN_LENGTH = 6; // Support both 4 (employee) and 6 (admin) digit PINs

  const handleDigit = (digit: string) => {
    if (pin.length >= MAX_PIN_LENGTH || loading) return;
    setPin(pin + digit);
    setError("");
  };

  const handleSubmit = async () => {
    if (pin.length < 4 || loading) return;

    setLoading(true);
    setError("");

    // Try employee PIN first (4 digits)
    if (pin.length === 4) {
      const result = await onEmployeeAuth(pin);
      if (result.success) {
        // Employee authenticated successfully
        return;
      }
      // If failed, show error
      setError(result.error || "PIN incorrecto");
      setPin("");
      setLoading(false);
      return;
    }

    // Try admin PIN (6 digits)
    if (pin.length === 6) {
      const result = await onAdminAuth(pin);
      if (result.success) {
        // Admin authenticated successfully
        return;
      }
      setError(result.error || "PIN incorrecto");
      setPin("");
      setLoading(false);
      return;
    }

    // Invalid length (5 digits)
    setError("PIN debe ser de 4 o 6 dígitos");
    setLoading(false);
  };

  const handleBackspace = () => {
    if (loading) return;
    setPin((p) => p.slice(0, -1));
    setError("");
  };

  const handleClear = () => {
    if (loading) return;
    setPin("");
    setError("");
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && pin.length >= 4 && !loading) {
      handleSubmit();
    }
  };

  return (
    <div
      className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-4"
      onKeyPress={handleKeyPress}
      tabIndex={0}
    >
      <div className="w-full max-w-xs">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-neutral-500 dark:text-neutral-400" />
          </div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Ingresa tu PIN
          </h1>
          <p className="text-sm text-neutral-500 mt-1 text-center">
            4 dígitos para empleado, 6 para administrador
          </p>
        </div>

        {/* PIN Dots Display */}
        <div className="flex items-center justify-center gap-3 mb-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full border-2 transition-colors ${
                pin.length > i
                  ? "bg-black dark:bg-white border-black dark:border-white"
                  : "border-neutral-300 dark:border-neutral-700"
              } ${i >= 4 ? "opacity-50" : ""}`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-red-600 dark:text-red-400 mb-4">
            {error}
          </p>
        )}

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              disabled={loading}
              className="h-16 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xl font-semibold text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleClear}
            disabled={loading}
            className="h-16 rounded-xl flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors disabled:opacity-50 text-xs"
          >
            Limpiar
          </button>
          <button
            onClick={() => handleDigit("0")}
            disabled={loading}
            className="h-16 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xl font-semibold text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors disabled:opacity-50"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            disabled={loading}
            className="h-16 rounded-xl flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors disabled:opacity-50"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Enter Button */}
        <button
          onClick={handleSubmit}
          disabled={pin.length < 4 || loading}
          className="w-full h-14 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed mb-4"
        >
          {loading ? (
            <>Validando...</>
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              Entrar
            </>
          )}
        </button>

        {/* Back Button */}
        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
            fullWidth
            className="mt-4"
            disabled={loading}
          >
            Volver al Login
          </Button>
        )}
      </div>
    </div>
  );
};

export default PinAuthentication;
