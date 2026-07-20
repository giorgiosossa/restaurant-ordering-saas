import React, { useState, useEffect } from "react";
import {
  Download,
  QrCode as QrCodeIcon,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
} from "lucide-react";
import { Card, Button, Loading, Alert } from "../../components/ui";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../config/supabase";
import type { Restaurant } from "../../config/supabase";

const RestaurantSettings: React.FC = () => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // PIN settings state
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinEnabled, setPinEnabled] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinSuccess, setPinSuccess] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  // Terminal payment settings state
  const [terminalAutoApprove, setTerminalAutoApprove] = useState(false);
  const [terminalLoading, setTerminalLoading] = useState(false);
  const [terminalError, setTerminalError] = useState("");
  const [terminalSuccess, setTerminalSuccess] = useState("");

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (!user.restaurant_id) {
          setError("No se encontró el ID del restaurante");
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("restaurants")
          .select("*")
          .eq("id", user.restaurant_id)
          .single();

        if (fetchError) throw fetchError;
        setRestaurant(data);
        setPinEnabled(data.pin_enabled || false);
        setTerminalAutoApprove(data.terminal_payment_auto_approve || false);
      } catch (err) {
        setError("No se pudieron cargar los datos del restaurante");
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, []);

  const handleSaveTerminalSettings = async () => {
    setTerminalError("");
    setTerminalSuccess("");
    setTerminalLoading(true);

    try {
      const { error: updateError } = await supabase
        .from("restaurants")
        .update({ terminal_payment_auto_approve: terminalAutoApprove })
        .eq("id", restaurant?.id);

      if (updateError) throw updateError;

      setTerminalSuccess("Configuración guardada correctamente");

      // Reload restaurant data
      const { data, error: fetchError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", restaurant?.id)
        .single();

      if (!fetchError && data) {
        setRestaurant(data);
      }
    } catch (err) {
      setTerminalError("Error al guardar la configuración");
    } finally {
      setTerminalLoading(false);
    }
  };

  const handleSavePin = async () => {
    setPinError("");
    setPinSuccess("");

    // Validate PIN
    if (newPin.length !== 6) {
      setPinError("El PIN debe tener exactamente 6 dígitos");
      return;
    }

    if (!/^\d{6}$/.test(newPin)) {
      setPinError("El PIN debe contener solo 6 dígitos numéricos");
      return;
    }

    if (newPin !== confirmPin) {
      setPinError("Los PINs no coinciden");
      return;
    }

    setPinLoading(true);

    try {
      const { error: setError } = await supabase.rpc("set_owner_pin", {
        p_restaurant_id: restaurant?.id,
        p_new_pin: newPin,
        p_enable: pinEnabled,
      });

      if (setError) throw setError;

      setPinSuccess("PIN configurado correctamente");
      setNewPin("");
      setConfirmPin("");

      // Reload restaurant data
      const { data, error: fetchError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", restaurant?.id)
        .single();

      if (!fetchError && data) {
        setRestaurant(data);
      }
    } catch (err: any) {
      setPinError(err.message || "Error al configurar el PIN");
    } finally {
      setPinLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!restaurant) return;

    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `${restaurant.slug}-qr-code.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (loading) {
    return <Loading text="Cargando configuración..." />;
  }

  if (error || !restaurant) {
    return <Alert type="error" message={error || "Restaurante no encontrado"} />;
  }

  const menuUrl = `${window.location.origin}/menu/${restaurant.slug}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text mb-2">Configuración</h2>
        <p className="text-text-secondary">
          Administra el código QR y el acceso a tu menú
        </p>
      </div>

      {/* QR Code Section */}
      <Card>
        <div className="flex items-start space-x-2 mb-4">
          <QrCodeIcon className="w-6 h-6 text-accent" />
          <div>
            <h3 className="text-xl font-bold text-text">Código QR del Menú</h3>
            <p className="text-text-secondary text-sm">
              Los clientes pueden escanear este código para acceder a tu menú
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* QR Code Display */}
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <QRCodeSVG
                id="qr-code-svg"
                value={menuUrl}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>

            <Button
              icon={<Download className="w-5 h-5" />}
              onClick={downloadQRCode}
              fullWidth
            >
              Descargar Código QR
            </Button>
          </div>

          {/* QR Code Info */}
          <div className="space-y-4">
            <div>
              <label className="label mb-2">Nombre del Restaurante</label>
              <div className="p-3 bg-bg-subtle rounded-lg text-text font-medium">
                {restaurant.name}
              </div>
            </div>

            <div>
              <label className="label mb-2">URL del Menú</label>
              <div className="p-3 bg-bg-subtle rounded-lg break-all text-text-secondary text-sm">
                {menuUrl}
              </div>
              <a
                href={menuUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-accent hover:text-accent-secondary mt-2 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir página del menú</span>
              </a>
            </div>

            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
              <h4 className="font-semibold text-text mb-2">Cómo usarlo:</h4>
              <ol className="space-y-2 text-text-secondary text-sm">
                <li>1. Descarga la imagen del código QR</li>
                <li>2. Imprímelo y colócalo en mesas, mostrador o entrada</li>
                <li>3. Los clientes lo escanean con la cámara de su celular</li>
                <li>4. Acceden al instante a tu menú actualizado</li>
              </ol>
            </div>

            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <p className="text-success text-sm">
                ✓ El menú se actualiza automáticamente en tiempo real
              </p>
              <p className="text-success text-sm">
                ✓ No requiere instalar ninguna app
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Owner PIN Security Settings */}
      <Card>
        <div className="flex items-start space-x-2 mb-4">
          <Lock className="w-6 h-6 text-accent" />
          <div>
            <h3 className="text-xl font-bold text-text">Seguridad de Acceso</h3>
            <p className="text-text-secondary text-sm">
              Configura un PIN para proteger el acceso al panel de administración
            </p>
          </div>
        </div>

        {pinError && <Alert type="error" message={pinError} onClose={() => setPinError("")} className="mb-4" />}
        {pinSuccess && <Alert type="success" message={pinSuccess} onClose={() => setPinSuccess("")} className="mb-4" />}

        <div className="space-y-6">
          {/* Enable/Disable PIN */}
          <div className="flex items-center justify-between p-4 bg-bg-subtle rounded-lg">
            <div>
              <label className="font-semibold text-text">Activar protección con PIN</label>
              <p className="text-text-secondary text-sm">
                {restaurant?.owner_pin
                  ? "Requiere PIN para acceder al panel de dueño"
                  : "Primero configura un PIN a continuación"}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={pinEnabled}
                onChange={(e) => setPinEnabled(e.target.checked)}
                disabled={!restaurant?.owner_pin}
              />
              <div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"></div>
            </label>
          </div>

          {/* PIN Configuration */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="label mb-2">Nuevo PIN (6 dígitos)</label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="****"
                  maxLength={6}
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text"
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label mb-2">Confirmar PIN</label>
              <input
                type={showPin ? "text" : "password"}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="****"
                maxLength={6}
                className="input-field"
              />
            </div>
          </div>

          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
            <h4 className="font-semibold text-text mb-2">Información Importante:</h4>
            <ul className="space-y-1 text-text-secondary text-sm">
              <li>• El PIN debe tener exactamente 6 dígitos numéricos</li>
              <li>• Con el PIN activado, se mostrará un teclado numérico al acceder</li>
              <li>• Los empleados accederán con su propio PIN a la pantalla de comandas</li>
              <li>• Como dueño, usarás tu PIN para acceder a todas las funciones</li>
              <li>• Guarda tu PIN en un lugar seguro</li>
            </ul>
          </div>

          <Button
            onClick={handleSavePin}
            loading={pinLoading}
            disabled={!newPin || !confirmPin || newPin.length !== 6}
            icon={<Lock className="w-5 h-5" />}
          >
            {restaurant?.owner_pin ? "Actualizar PIN" : "Configurar PIN"}
          </Button>

          {restaurant?.owner_pin && (
            <div className="flex items-center gap-2 text-success text-sm">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <span>PIN configurado {pinEnabled ? "y activo" : "(desactivado)"}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Terminal Payment Settings */}
      <Card>
        <div className="flex items-start space-x-2 mb-4">
          <Smartphone className="w-6 h-6 text-accent" />
          <div>
            <h3 className="text-xl font-bold text-text">Pago con Terminal a la Mesa</h3>
            <p className="text-text-secondary text-sm">
              Configura cómo se procesan los pedidos cuando el cliente solicita terminal en la mesa
            </p>
          </div>
        </div>

        {terminalError && <Alert type="error" message={terminalError} onClose={() => setTerminalError("")} className="mb-4" />}
        {terminalSuccess && <Alert type="success" message={terminalSuccess} onClose={() => setTerminalSuccess("")} className="mb-4" />}

        <div className="space-y-6">
          <div className="bg-bg-subtle rounded-lg p-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={terminalAutoApprove}
                onChange={(e) => setTerminalAutoApprove(e.target.checked)}
                className="mt-1 w-5 h-5 text-accent rounded border-gray-300 focus:ring-accent"
              />
              <div className="flex-1">
                <div className="font-semibold text-text">Aprobar pedidos automáticamente</div>
                <p className="text-sm text-text-secondary mt-1">
                  Si está <strong>activado</strong>: Los pedidos con terminal se envían automáticamente a cocina.
                  Ideal para negocios que cobran después del servicio.
                </p>
                <p className="text-sm text-text-secondary mt-2">
                  Si está <strong>desactivado</strong>: Los pedidos quedan bloqueados hasta que el cajero confirme el pago.
                  Ideal para negocios que cobran antes de preparar.
                </p>
              </div>
            </label>
          </div>

          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
            <h4 className="font-semibold text-text mb-2">¿Cómo funciona?</h4>
            <ul className="space-y-2 text-text-secondary text-sm">
              <li>
                <strong className="text-text">Con auto-aprobación:</strong> El pedido llega directamente a "Preparando"
                y el cliente solo espera su orden. El pago se cobra después con la terminal.
              </li>
              <li>
                <strong className="text-text">Sin auto-aprobación:</strong> El pedido llega como "Pendiente" bloqueado.
                El cajero lleva la terminal, cobra, y confirma el pago en el sistema para desbloquear la orden.
              </li>
            </ul>
          </div>

          <Button
            onClick={handleSaveTerminalSettings}
            loading={terminalLoading}
            icon={<Smartphone className="w-5 h-5" />}
          >
            Guardar Configuración
          </Button>
        </div>
      </Card>

      {/* Additional Settings Placeholder */}
      <Card className="bg-bg-subtle">
        <h3 className="text-lg font-bold text-text mb-3">
          Configuración Adicional (Próximamente)
        </h3>
        <ul className="space-y-2 text-text-secondary text-sm">
          <li>• Actualizar perfil del restaurante e información de contacto</li>
          <li>• Subir logo e imágenes de portada</li>
          <li>• Personalizar el tema de la página de pedidos</li>
          <li>• Configurar horarios de atención y días festivos</li>
          <li>• Cambiar contraseña y configuración de seguridad</li>
        </ul>
      </Card>
    </div>
  );
};

export default RestaurantSettings;
