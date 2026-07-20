import React, { useState } from "react";
import { Lock, AlertCircle } from "lucide-react";
import { Card } from "./ui";

interface PinPadEntryProps {
  restaurantName: string;
  onVerifyPin: (pin: string) => Promise<{ success: boolean; message?: string }>;
}

export const PinPadEntry: React.FC<PinPadEntryProps> = ({
  restaurantName,
  onVerifyPin,
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setError("");

      // Auto-submit only when PIN reaches exactly 6 digits
      if (newPin.length === 6) {
        handleSubmit(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError("");
  };

  const handleClear = () => {
    setPin("");
    setError("");
  };

  const handleSubmit = async (pinToVerify?: string) => {
    const finalPin = pinToVerify || pin;

    if (finalPin.length !== 6) {
      setError("El PIN debe tener exactamente 6 dígitos");
      return;
    }

    setLoading(true);
    setError("");

    const result = await onVerifyPin(finalPin);

    if (!result.success) {
      setError(result.message || "PIN incorrecto. Intenta de nuevo.");
      setPin("");
    }

    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key >= "0" && e.key <= "9") {
      handlePinInput(e.key);
    } else if (e.key === "Backspace") {
      handleBackspace();
    } else if (e.key === "Enter" && pin.length === 6) {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-bg-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center space-y-6 p-6">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10">
            <Lock className="w-8 h-8 text-accent" />
          </div>

          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-text mb-2">{restaurantName}</h2>
            <p className="text-text-secondary">
              Ingresa tu PIN de 6 dígitos para acceder
            </p>
          </div>

          {/* PIN Display */}
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                  index < pin.length
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-bg-subtle text-text-secondary"
                }`}
              >
                {index < pin.length ? "●" : ""}
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center justify-center gap-2 text-error text-sm bg-error/10 border border-error/20 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handlePinInput(num.toString())}
                disabled={loading}
                className="h-16 text-2xl font-semibold rounded-lg border-2 border-border hover:border-accent hover:bg-accent/5 active:bg-accent/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onKeyDown={handleKeyPress}
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              disabled={loading}
              className="h-16 text-sm font-medium rounded-lg border-2 border-border hover:border-error hover:bg-error/5 active:bg-error/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Borrar
            </button>
            <button
              onClick={() => handlePinInput("0")}
              disabled={loading}
              className="h-16 text-2xl font-semibold rounded-lg border-2 border-border hover:border-accent hover:bg-accent/5 active:bg-accent/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              disabled={loading}
              className="h-16 text-sm font-medium rounded-lg border-2 border-border hover:border-warning hover:bg-warning/5 active:bg-warning/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ←
            </button>
          </div>

          {loading && (
            <p className="text-sm text-text-secondary">Verificando...</p>
          )}
        </div>
      </Card>
    </div>
  );
};
