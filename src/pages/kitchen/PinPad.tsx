import React, { useState } from "react";
import { Delete, Lock, ShieldCheck } from "lucide-react";
import { useEmployeeSession } from "../../contexts/EmployeeSessionContext";

interface PinPadProps {
  restaurantId: string;
}

const PinPad: React.FC<PinPadProps> = ({ restaurantId }) => {
  const { clockIn, continueAsAdmin, loading } = useEmployeeSession();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleDigit = async (digit: string) => {
    if (pin.length >= 4 || loading) return;
    const next = pin + digit;
    setPin(next);
    setError("");

    if (next.length === 4) {
      const { error: clockInError } = await clockIn(restaurantId, next);
      if (clockInError) {
        setError(clockInError);
        setPin("");
      }
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setPin((p) => p.slice(0, -1));
    setError("");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-xs">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-neutral-500 dark:text-neutral-400" />
          </div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">Ingresa tu PIN</h1>
          <p className="text-sm text-neutral-500 mt-1">Identifícate para abrir tu turno</p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                pin.length > i
                  ? "bg-black dark:bg-white border-black dark:border-white"
                  : "border-neutral-300 dark:border-neutral-700"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
        )}

        <div className="grid grid-cols-3 gap-3">
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
          <div />
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

        <button
          onClick={continueAsAdmin}
          className="mt-6 w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-neutral-400 dark:text-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Continuar como administrador
        </button>
      </div>
    </div>
  );
};

export default PinPad;
