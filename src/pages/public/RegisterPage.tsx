import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Store, ArrowLeft, CheckCircle, Lock } from "lucide-react";
import {
  Button,
  Input,
  Select,
  Textarea,
  Alert,
  Card,
} from "../../components/ui";
import { APP_CONFIG } from "../../config/config";
import { supabase } from "../../config/supabase";
import { isValidEmail, isValidPhone } from "../../utils/helpers";

interface FormData {
  restaurant_name: string;
  owner_name: string;
  phone: string;
  email: string;
  password: string;
  confirm_password: string;
  owner_pin: string;
  confirm_owner_pin: string;
  city: string;
  address: string;
  restaurant_type: string;
  heard_from: string;
  notes: string;
}

const RegisterPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<FormData>({
    restaurant_name: "",
    owner_name: "",
    phone: "",
    email: "",
    password: "",
    confirm_password: "",
    owner_pin: "",
    confirm_owner_pin: "",
    city: "",
    address: "",
    restaurant_type: "",
    heard_from: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.restaurant_name.trim()) {
      newErrors.restaurant_name = "El nombre del restaurante es obligatorio";
    }

    if (!formData.owner_name.trim()) {
      newErrors.owner_name = "El nombre del dueño es obligatorio";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "El teléfono es obligatorio";
    } else if (!isValidPhone(formData.phone)) {
      newErrors.phone = "Ingresa un teléfono válido a 10 dígitos";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El correo es obligatorio";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Ingresa un correo electrónico válido";
    }

    if (!formData.city.trim()) {
      newErrors.city = "La ciudad es obligatoria";
    }

    if (!formData.restaurant_type) {
      newErrors.restaurant_type = "El tipo de restaurante es obligatorio";
    }

    if (!formData.password) {
      newErrors.password = "La contraseña es obligatoria";
    } else if (formData.password.length < 8) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    }

    if (formData.confirm_password !== formData.password) {
      newErrors.confirm_password = "Las contraseñas no coinciden";
    }

    if (!formData.owner_pin) {
      newErrors.owner_pin = "El PIN es obligatorio";
    } else if (!/^\d{6}$/.test(formData.owner_pin)) {
      newErrors.owner_pin = "El PIN debe tener exactamente 6 dígitos";
    }

    if (formData.confirm_owner_pin !== formData.owner_pin) {
      newErrors.confirm_owner_pin = "Los PINs no coinciden";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const email = formData.email.trim().toLowerCase();

      // Create the owner's real login account (this becomes their
      // restaurant dashboard login once an admin approves the request)
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password: formData.password,
      });

      if (signUpError) {
        throw signUpError;
      }

      // Insert registration request into Supabase
      const { error: insertError } = await supabase
        .from("registration_requests")
        .insert([
          {
            restaurant_name: formData.restaurant_name.trim(),
            owner_name: formData.owner_name.trim(),
            phone: formData.phone.replace(/[\s\-()]/g, ""),
            email: email || null,
            city: formData.city.trim(),
            address: formData.address.trim() || null,
            restaurant_type: formData.restaurant_type,
            heard_from: formData.heard_from || null,
            notes: formData.notes.trim() || null,
            owner_pin: formData.owner_pin,
            status: "pending",
          },
        ])
        .select();

      if (insertError) {
        throw insertError;
      }

      // Don't leave them signed in until an admin approves the restaurant
      await supabase.auth.signOut();

      // Success!
      setSuccess(true);

      // TODO: In production, send confirmation email to restaurant
      // TODO: Send notification to admin panel
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(
        err.message || "No se pudo enviar el registro. Intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Success Screen
  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card className="max-w-lg w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-6">
            <CheckCircle className="w-12 h-12 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-text mb-3">
            ¡Registro Enviado!
          </h1>
          <p className="text-text-secondary mb-6">
            ¡Gracias por tu interés en {APP_CONFIG.appName}! Nuestro equipo
            verificará tus datos y te contactará en menos de 24 horas al{" "}
            <strong>{formData.phone}</strong>
            {formData.email && ` y a ${formData.email}`}.
          </p>
          <div className="space-y-3">
            <div className="bg-bg-subtle rounded-lg p-4 text-left">
              <h3 className="font-semibold text-text mb-2">
                ¿Qué sigue?
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-start">
                  <span className="text-accent mr-2">1.</span>
                  <span>Nuestro equipo revisa tu registro</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent mr-2">2.</span>
                  <span>
                    Te llamamos para verificar tus datos y explicarte el proceso
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent mr-2">3.</span>
                  <span>
                    Una vez verificado, inicia sesión con el correo,
                    contraseña y PIN que acabas de crear
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent mr-2">4.</span>
                  <span>¡Comienza tu prueba gratis de 14 días de inmediato!</span>
                </li>
              </ul>
            </div>
            <Link to="/">
              <Button variant="outline" fullWidth>
                Volver al Inicio
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-text-secondary hover:text-text mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Inicio
          </Link>
          <div className="flex items-center space-x-3 mb-4">
            <Store className="w-10 h-10 text-accent" />
            <div>
              <h1 className="text-3xl font-bold text-text">
                Registra tu Restaurante
              </h1>
              <p className="text-text-secondary">
                Comienza hoy tu transformación digital
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          {error && <Alert type="error" message={error} className="mb-6" />}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Restaurant Details */}
            <div>
              <h2 className="text-lg font-semibold text-text mb-4">
                Datos del Restaurante
              </h2>
              <div className="space-y-4">
                <Input
                  label="Nombre del Restaurante"
                  name="restaurant_name"
                  value={formData.restaurant_name}
                  onChange={handleChange}
                  error={errors.restaurant_name}
                  placeholder="ej. Restaurante Sabores"
                  required
                />

                <Select
                  label="Tipo de Restaurante"
                  name="restaurant_type"
                  value={formData.restaurant_type}
                  onChange={handleChange}
                  error={errors.restaurant_type}
                  options={APP_CONFIG.restaurantTypes.map((type) => ({
                    value: type,
                    label: type,
                  }))}
                  required
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Ciudad"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    error={errors.city}
                    placeholder="ej. Guadalajara"
                    required
                  />

                  <Input
                    label="Dirección (Opcional)"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Dirección completa"
                  />
                </div>
              </div>
            </div>

            {/* Owner Details */}
            <div>
              <h2 className="text-lg font-semibold text-text mb-4">
                Datos del Dueño
              </h2>
              <div className="space-y-4">
                <Input
                  label="Nombre del Dueño"
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleChange}
                  error={errors.owner_name}
                  placeholder="Tu nombre completo"
                  required
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Teléfono"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    placeholder="Celular a 10 dígitos"
                    required
                  />

                  <Input
                    label="Correo Electrónico"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    placeholder="tucorreo@ejemplo.com"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Contraseña"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    placeholder="Al menos 8 caracteres"
                    required
                  />

                  <Input
                    label="Confirmar Contraseña"
                    name="confirm_password"
                    type="password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    error={errors.confirm_password}
                    placeholder="Vuelve a ingresar tu contraseña"
                    required
                  />
                </div>
                <p className="text-xs text-text-secondary">
                  Esta será tu contraseña para iniciar sesión una vez que tu
                  restaurante sea aprobado.
                </p>
              </div>
            </div>

            {/* Owner PIN Section */}
            <div>
              <h2 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
                <Lock className="w-5 h-5 text-accent" />
                Crea tu PIN de Acceso
              </h2>
              <p className="text-sm text-text-secondary mb-4">
                Este PIN (6 dígitos) te dará acceso al panel de control después de
                iniciar sesión con tu correo y contraseña. <strong>¡Guárdalo bien!</strong>
              </p>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="PIN de Dueño (6 dígitos)"
                    name="owner_pin"
                    type="password"
                    value={formData.owner_pin}
                    onChange={(e) => {
                      // Only allow digits, exactly 6 characters
                      const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setFormData((prev) => ({ ...prev, owner_pin: value }));
                      if (errors.owner_pin) {
                        setErrors((prev) => ({ ...prev, owner_pin: "" }));
                      }
                    }}
                    error={errors.owner_pin}
                    placeholder="6 dígitos"
                    required
                    maxLength={6}
                  />

                  <Input
                    label="Confirmar PIN (6 dígitos)"
                    name="confirm_owner_pin"
                    type="password"
                    value={formData.confirm_owner_pin}
                    onChange={(e) => {
                      // Only allow digits, exactly 6 characters
                      const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setFormData((prev) => ({ ...prev, confirm_owner_pin: value }));
                      if (errors.confirm_owner_pin) {
                        setErrors((prev) => ({ ...prev, confirm_owner_pin: "" }));
                      }
                    }}
                    error={errors.confirm_owner_pin}
                    placeholder="Confirma tu PIN de 6 dígitos"
                    required
                    maxLength={6}
                  />
                </div>
                <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 text-sm">
                  <p className="text-text-secondary">
                    <strong className="text-accent">Importante:</strong> Después de
                    iniciar sesión con tu correo, necesitarás este PIN para acceder
                    a todas las funciones del panel (menú, pedidos, reportes, etc.).
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div>
              <h2 className="text-lg font-semibold text-text mb-4">
                Información Adicional
              </h2>
              <div className="space-y-4">
                <Select
                  label="¿Cómo te enteraste de nosotros?"
                  name="heard_from"
                  value={formData.heard_from}
                  onChange={handleChange}
                  options={APP_CONFIG.heardFromOptions.map((option) => ({
                    value: option,
                    label: option,
                  }))}
                />

                <Textarea
                  label="Notas Adicionales (Opcional)"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Alguna necesidad específica o pregunta..."
                  rows={3}
                />
              </div>
            </div>

            {/* Terms */}
            <div className="bg-bg-subtle rounded-lg p-4 text-sm text-text-secondary">
              Al enviar este formulario, aceptas nuestros Términos de Servicio
              y Política de Privacidad. Nuestro equipo te contactará en menos
              de 24 horas para verificar tus datos.
            </div>

            {/* Submit Button */}
            <Button type="submit" loading={loading} fullWidth size="lg">
              Enviar Registro
            </Button>

            {/* Login Link */}
            <p className="text-center text-sm text-text-secondary">
              ¿Ya tienes una cuenta?{" "}
              <Link
                to="/login"
                className="text-accent font-medium hover:underline"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
