import React, { useState, useEffect } from "react";
import {
  Download,
  QrCode as QrCodeIcon,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  CreditCard,
} from "lucide-react";
import { Card, Button, Loading, Alert } from "../../components/ui";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../config/supabase";
import type { Restaurant } from "../../config/supabase";
import { registerRestaurant } from "../../services/openpayFrontendService";

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

  // Openpay settings state
  const [openpayData, setOpenpayData] = useState({
    rfc: "",
    clabe: "",
    bankHolderName: "",
    bankName: "",
    address: "",
    postalCode: "",
    state: "",
    city: "",
  });
  const [openpayLoading, setOpenpayLoading] = useState(false);
  const [openpayError, setOpenpayError] = useState("");
  const [openpaySuccess, setOpenpaySuccess] = useState("");

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

  const handleRegisterOpenpay = async () => {
    setOpenpayError("");
    setOpenpaySuccess("");

    // Validate input
    if (!openpayData.rfc || !openpayData.clabe || !openpayData.bankHolderName || !openpayData.bankName) {
      setOpenpayError("Por favor completa todos los campos obligatorios");
      return;
    }

    // Validate CLABE
    if (openpayData.clabe.length !== 18) {
      setOpenpayError("La CLABE debe tener exactamente 18 dígitos");
      return;
    }

    if (!/^\d{18}$/.test(openpayData.clabe)) {
      setOpenpayError("La CLABE debe contener solo dígitos");
      return;
    }

    setOpenpayLoading(true);

    try {
      const result = await registerRestaurant({
        restaurantId: restaurant!.id,
        businessName: restaurant!.name,
        rfc: openpayData.rfc,
        email: restaurant!.email,
        phone: restaurant!.phone,
        address: {
          line1: openpayData.address || restaurant!.address || "Sin dirección",
          postal_code: openpayData.postalCode || "00000",
          state: openpayData.state || restaurant!.city || "CDMX",
          city: openpayData.city || restaurant!.city || "Ciudad de México",
          country_code: "MX",
        },
        bankAccount: {
          clabe: openpayData.clabe,
          holder_name: openpayData.bankHolderName,
          bank_name: openpayData.bankName,
        },
      });

      setOpenpaySuccess(`¡Restaurante registrado en Openpay! ID: ${result.data.openpayCustomerId}`);

      // Reload restaurant data
      const { data, error: fetchError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", restaurant?.id)
        .single();

      if (!fetchError && data) {
        setRestaurant(data);
      }

      // Clear form
      setOpenpayData({
        rfc: "",
        clabe: "",
        bankHolderName: "",
        bankName: "",
        address: "",
        postalCode: "",
        state: "",
        city: "",
      });
    } catch (err: any) {
      setOpenpayError(err.message || "Error al registrar en Openpay");
    } finally {
      setOpenpayLoading(false);
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

      {/* Openpay Payment Integration */}
      <Card>
        <div className="flex items-start space-x-2 mb-4">
          <CreditCard className="w-6 h-6 text-accent" />
          <div>
            <h3 className="text-xl font-bold text-text">Pagos con Openpay</h3>
            <p className="text-text-secondary text-sm">
              Configura tu cuenta de Openpay para recibir pagos con tarjeta directamente
            </p>
          </div>
        </div>

        {openpayError && (
          <Alert type="error" message={openpayError} onClose={() => setOpenpayError("")} className="mb-4" />
        )}
        {openpaySuccess && (
          <Alert type="success" message={openpaySuccess} onClose={() => setOpenpaySuccess("")} className="mb-4" />
        )}

        {restaurant?.openpay_customer_id ? (
          <div className="space-y-4">
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-success mb-2">
                <div className="w-2 h-2 rounded-full bg-success"></div>
                <span className="font-semibold">Openpay Configurado</span>
              </div>
              <p className="text-text-secondary text-sm">
                Customer ID: <span className="font-mono text-text">{restaurant.openpay_customer_id}</span>
              </p>
              <p className="text-success text-sm mt-2">
                ✓ Tu restaurante ya puede recibir pagos con tarjeta
              </p>
            </div>

            <Button
              onClick={async () => {
                if (!window.confirm('¿Estás seguro de que deseas desregistrar tu cuenta de Openpay? Esta acción eliminará la configuración de pagos.')) {
                  return;
                }

                setOpenpayLoading(true);
                setOpenpayError("");
                setOpenpaySuccess("");

                try {
                  const { error } = await supabase
                    .from('restaurants')
                    .update({ openpay_customer_id: null, updated_at: new Date().toISOString() })
                    .eq('id', restaurant.id);

                  if (error) throw error;

                  setOpenpaySuccess("Cuenta de Openpay desregistrada exitosamente");

                  // Reload restaurant data
                  const { data: updatedRestaurant } = await supabase
                    .from('restaurants')
                    .select('*')
                    .eq('id', restaurant.id)
                    .single();

                  if (updatedRestaurant) {
                    setRestaurant(updatedRestaurant);
                  }
                } catch (err: any) {
                  console.error('Error removing Openpay:', err);
                  setOpenpayError(err.message || "Error al desregistrar cuenta de Openpay");
                } finally {
                  setOpenpayLoading(false);
                }
              }}
              variant="outline"
              loading={openpayLoading}
              className="border-error text-error hover:bg-error/10"
            >
              Desregistrar Openpay
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
              <h4 className="font-semibold text-text mb-2">¿Por qué registrar tu cuenta?</h4>
              <ul className="space-y-1 text-text-secondary text-sm">
                <li>• Acepta pagos con tarjeta de débito y crédito</li>
                <li>• El dinero se deposita DIRECTO a tu cuenta bancaria</li>
                <li>• Sin comisiones adicionales de la plataforma</li>
                <li>• Integración segura con Openpay</li>
              </ul>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label mb-2">RFC * (Registro Federal de Contribuyentes)</label>
                <input
                  type="text"
                  value={openpayData.rfc}
                  onChange={(e) => setOpenpayData({ ...openpayData, rfc: e.target.value.toUpperCase() })}
                  placeholder="XAXX010101000"
                  maxLength={13}
                  className="input-field uppercase"
                />
              </div>

              <div>
                <label className="label mb-2">CLABE Interbancaria * (18 dígitos)</label>
                <input
                  type="text"
                  value={openpayData.clabe}
                  onChange={(e) => setOpenpayData({ ...openpayData, clabe: e.target.value.replace(/\D/g, "") })}
                  placeholder="012298026516924616"
                  maxLength={18}
                  className="input-field font-mono"
                />
              </div>

              <div>
                <label className="label mb-2">Titular de la Cuenta *</label>
                <input
                  type="text"
                  value={openpayData.bankHolderName}
                  onChange={(e) => setOpenpayData({ ...openpayData, bankHolderName: e.target.value })}
                  placeholder="Nombre del titular"
                  className="input-field"
                />
              </div>

              <div>
                <label className="label mb-2">Banco *</label>
                <select
                  value={openpayData.bankName}
                  onChange={(e) => setOpenpayData({ ...openpayData, bankName: e.target.value })}
                  className="input-field"
                >
                  <option value="">Selecciona tu banco</option>
                  <option value="BBVA Bancomer">BBVA Bancomer</option>
                  <option value="Santander">Santander</option>
                  <option value="Banamex">Banamex</option>
                  <option value="Banorte">Banorte</option>
                  <option value="HSBC">HSBC</option>
                  <option value="Scotiabank">Scotiabank</option>
                  <option value="Inbursa">Inbursa</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="label mb-2">Dirección (Opcional)</label>
                <input
                  type="text"
                  value={openpayData.address}
                  onChange={(e) => setOpenpayData({ ...openpayData, address: e.target.value })}
                  placeholder="Calle y número"
                  className="input-field"
                />
              </div>

              <div>
                <label className="label mb-2">Código Postal (Opcional)</label>
                <input
                  type="text"
                  value={openpayData.postalCode}
                  onChange={(e) => setOpenpayData({ ...openpayData, postalCode: e.target.value.replace(/\D/g, "") })}
                  placeholder="06000"
                  maxLength={5}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label mb-2">Estado (Opcional)</label>
                <input
                  type="text"
                  value={openpayData.state}
                  onChange={(e) => setOpenpayData({ ...openpayData, state: e.target.value })}
                  placeholder="CDMX"
                  className="input-field"
                />
              </div>

              <div>
                <label className="label mb-2">Ciudad (Opcional)</label>
                <input
                  type="text"
                  value={openpayData.city}
                  onChange={(e) => setOpenpayData({ ...openpayData, city: e.target.value })}
                  placeholder="Ciudad de México"
                  className="input-field"
                />
              </div>
            </div>

            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <p className="text-warning text-sm font-semibold mb-1">⚠️ Importante:</p>
              <ul className="text-text-secondary text-sm space-y-1">
                <li>• Asegúrate de que la CLABE sea correcta (18 dígitos)</li>
                <li>• El titular de la cuenta debe coincidir con el RFC del restaurante</li>
                <li>• Esta información se enviará de forma segura a Openpay</li>
              </ul>
            </div>

            <Button
              onClick={handleRegisterOpenpay}
              loading={openpayLoading}
              disabled={!openpayData.rfc || !openpayData.clabe || !openpayData.bankHolderName || !openpayData.bankName}
              icon={<CreditCard className="w-5 h-5" />}
            >
              Registrar en Openpay
            </Button>
          </div>
        )}
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
