import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Store, ArrowLeft, Mail, Lock, AlertCircle } from "lucide-react";
import { Button, Input, Alert, Card } from "../../components/ui";
import { APP_CONFIG } from "../../config/config";
import { supabase } from "../../config/supabase";
import { isValidEmail } from "../../utils/helpers";
import PinAuthentication from "../../components/auth/PinAuthentication";
import { validateAdminPin, validateEmployeePin, isPinRequired } from "../../services/pinAuthService";
import { startOrResumeShift } from "../../services/employeeService";
// import type { Employee } from "../../config/supabase"; // Not used

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPinPad, setShowPinPad] = useState(false);
  const [restaurantData, setRestaurantData] = useState<{
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    userId: string;
    userEmail: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Ingresa tu correo y contraseña");
      return;
    }

    if (!isValidEmail(formData.email)) {
      setError("Ingresa un correo electrónico válido");
      return;
    }

    setLoading(true);

    try {
      const email = formData.email.trim().toLowerCase();

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password: formData.password,
        });

      if (authError || !authData.user) {
        setError("Correo o contraseña incorrectos");
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(
          "id, email, role, restaurant_id, temp_password, restaurants(name, slug, is_active, status)"
        )
        .eq("id", authData.user.id)
        .single();

      if (userError || !userData) {
        setError("Correo o contraseña incorrectos");
        setLoading(false);
        return;
      }

      if (!userData.restaurant_id) {
        // Check if registration is still pending
        const { data: registrationData } = await supabase
          .from("registration_requests")
          .select("status")
          .eq("email", email)
          .single();

        await supabase.auth.signOut();

        if (registrationData && registrationData.status === "pending") {
          setError("pending");
        } else {
          setError(
            "Tu restaurante aún no ha sido aprobado. Contacta a soporte."
          );
        }
        setLoading(false);
        return;
      }

      const restaurant = Array.isArray(userData.restaurants)
        ? userData.restaurants[0]
        : userData.restaurants;

      // Check if restaurant is active
      if (!restaurant?.is_active) {
        await supabase.auth.signOut();
        setError(
          "Tu cuenta de restaurante ha sido desactivada. Contacta a soporte."
        );
        setLoading(false);
        return;
      }

      // Email/Password authentication successful
      // Check if PIN is required for this restaurant
      const pinCheck = await isPinRequired(userData.restaurant_id);

      if (pinCheck.required) {
        // PIN is required - show PIN pad
        setRestaurantData({
          id: userData.restaurant_id,
          name: restaurant.name,
          slug: restaurant.slug,
          is_active: restaurant.is_active,
          userId: userData.id,
          userEmail: userData.email,
        });
        setShowPinPad(true);
        setLoading(false);
      } else {
        // PIN not required - grant admin access directly
        console.log("📌 [LOGIN] PIN not required, granting admin access directly");
        localStorage.setItem(
          "user",
          JSON.stringify({
            id: userData.id,
            email: userData.email,
            role: userData.role,
            restaurant_id: userData.restaurant_id,
            restaurant: {
              name: restaurant.name,
              slug: restaurant.slug,
              is_active: restaurant.is_active,
            },
            temp_password: userData.temp_password,
            authType: "admin",
          })
        );
        navigate("/restaurant");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      // Show detailed error for debugging
      const errorMsg =
        err?.message ||
        err?.toString() ||
        "Error de red. Revisa tu conexión.";
      setError(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleAdminPinAuth = async (pin: string) => {
    if (!restaurantData) {
      return { success: false, error: "Error de sesión" };
    }

    const result = await validateAdminPin(restaurantData.id, pin);

    if (result.success) {
      // Admin authenticated - grant full access
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: restaurantData.userId,
          email: restaurantData.userEmail,
          role: "owner",
          restaurant_id: restaurantData.id,
          restaurant: {
            name: restaurantData.name,
            slug: restaurantData.slug,
            is_active: restaurantData.is_active,
          },
          authType: "admin", // Mark as admin access
        })
      );

      // Redirect to full restaurant dashboard
      navigate("/restaurant");
      return { success: true };
    }

    return { success: false, error: result.error };
  };

  const handleEmployeePinAuth = async (pin: string) => {
    if (!restaurantData) {
      return { success: false, error: "Error de sesión" };
    }

    const result = await validateEmployeePin(restaurantData.id, pin);

    if (result.success && result.employee) {
      // Employee authenticated - start shift and restrict to Comandas
      const { data: shift, error: shiftError } = await startOrResumeShift(
        result.employee.id,
        restaurantData.id
      );

      if (shiftError || !shift) {
        return { success: false, error: "No se pudo iniciar el turno" };
      }

      // Store employee session
      localStorage.setItem(
        "employee_session",
        JSON.stringify({
          employeeId: result.employee.id,
          name: result.employee.name,
          roles: result.employee.roles,
          shiftId: shift.id,
          isAdminBypass: false,
          restaurantId: restaurantData.id,
          authType: "employee", // Mark as employee access
        })
      );

      // Sign out from Supabase auth (employees don't need it)
      await supabase.auth.signOut();

      // Redirect to Comandas only
      navigate("/comandas");
      return { success: true };
    }

    return { success: false, error: result.error };
  };

  const handleBackToLogin = () => {
    setShowPinPad(false);
    setRestaurantData(null);
    supabase.auth.signOut();
  };

  // Show PIN pad if email/password auth succeeded
  if (showPinPad && restaurantData) {
    return (
      <PinAuthentication
        restaurantId={restaurantData.id}
        onAdminAuth={handleAdminPinAuth}
        onEmployeeAuth={handleEmployeePinAuth}
        onBack={handleBackToLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <Link
          to="/"
          className="inline-flex items-center text-text-secondary hover:text-text mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Inicio
        </Link>

        {/* Login Card */}
        <Card>
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/5 mb-4">
              <Store className="w-10 h-10 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-text mb-2">Bienvenido de Nuevo</h1>
            <p className="text-text-secondary">
              Inicia sesión en el panel de tu restaurante
            </p>
          </div>

          {/* Pending Registration Alert */}
          {error === "pending" && (
            <Alert
              type="warning"
              title="Cuenta Pendiente de Verificación"
              message="Tu registro está en revisión. Nuestro equipo te contactará en menos de 24 horas para completar la configuración."
              className="mb-6"
            />
          )}

          {/* Error Alert */}
          {error && error !== "pending" && (
            <Alert type="error" message={error} className="mb-6" />
          )}

          {/* Demo Credentials */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-800 mb-2">
              🎯 Cuenta Demo - ¡Pruébala!
            </p>
            <div className="text-sm text-blue-700 space-y-1">
              <p>
                <span className="font-medium">Correo:</span>{" "}
                demorestaurant@gmail.com
              </p>
              <p>
                <span className="font-medium">Contraseña:</span> ATVSW679
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo Electrónico"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tucorreo@ejemplo.com"
              icon={<Mail className="w-5 h-5" />}
              required
              autoComplete="email"
            />

            <Input
              label="Contraseña"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Ingresa tu contraseña"
              icon={<Lock className="w-5 h-5" />}
              required
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-text-secondary">
                <input type="checkbox" className="mr-2 rounded border-border" />
                Recordarme
              </label>
              <a href="#" className="text-accent hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <Button type="submit" loading={loading} fullWidth size="lg">
              Iniciar Sesión
            </Button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center text-sm text-text-secondary">
            ¿No tienes una cuenta?{" "}
            <Link
              to="/register"
              className="text-accent font-medium hover:underline"
            >
              Registra tu restaurante
            </Link>
          </div>

          {/* Admin Login */}
          <div className="mt-6 pt-6 border-t border-border text-center">
            <Link
              to="/admin/login"
              className="text-sm text-text-secondary hover:text-text flex items-center justify-center"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Acceso de Administrador
            </Link>
          </div>
        </Card>

        {/* Help Text */}
        <p className="mt-6 text-center text-sm text-text-secondary">
          ¿Necesitas ayuda? Contáctanos en support@
          {APP_CONFIG.appName.toLowerCase()}.com
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
