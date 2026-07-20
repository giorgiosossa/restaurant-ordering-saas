import React, { useState } from "react";
import { X, Lock, AlertCircle } from "lucide-react";
import { Modal } from "./ui";

interface OwnerPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  restaurantName: string;
  onVerifyPin: (pin: string) => Promise<boolean>;
}

export const OwnerPinModal: React.FC<OwnerPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
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

  const handleSubmit = async () => {
    if (pin.length !== 6) {
      setError("El PIN debe tener exactamente 6 dígitos");
      return;
    }

    setLoading(true);
    setError("");

    const isValid = await onVerifyPin(pin);

    if (isValid) {
      setPin("");
      onSuccess();
    } else {
      setError("PIN incorrecto. Intenta de nuevo.");
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
    <Modal isOpen={isOpen} onClose={onClose} title="" size="sm">
      <div className="text-center space-y-6">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10">
          <Lock className="w-8 h-8 text-accent" />
        </div>

        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Acceso Dueño</h2>
          <p className="text-text-secondary">{restaurantName}</p>
          <p className="text-sm text-text-secondary mt-1">
            Ingresa tu PIN de 6 dígitos para acceder al panel de control
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
        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
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

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={pin.length !== 6 || loading}
          className="w-full h-12 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent"
        >
          {loading ? "Verificando..." : "Ingresar"}
        </button>
      </div>
    </Modal>
  );
};
