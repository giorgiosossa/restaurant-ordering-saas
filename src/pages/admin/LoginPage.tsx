import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, ArrowLeft, Mail, Lock } from "lucide-react";
import { Button, Input, Alert, Card } from "../../components/ui";
import { supabase } from "../../config/supabase";
import { isValidEmail, hashPassword } from "../../utils/helpers";

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
      // Hash password and use RPC function for admin login
      const passwordHash = await hashPassword(formData.password);
      const { data: adminData, error: adminError } = await supabase.rpc(
        "admin_login",
        {
          p_email: formData.email.toLowerCase(),
          p_password_hash: passwordHash,
        }
      );

      if (adminError) {
        console.error("Admin login RPC error:", adminError);
        setError("Correo o contraseña incorrectos");
        setLoading(false);
        return;
      }

      if (!adminData || adminData.length === 0) {
        setError("Correo o contraseña incorrectos");
        setLoading(false);
        return;
      }

      const admin = adminData[0];

      // Login successful - store admin data
      localStorage.setItem(
        "admin",
        JSON.stringify({
          id: admin.id,
          email: admin.email,
          name: admin.name,
        })
      );

      // Redirect to admin dashboard
      navigate("/admin");
    } catch (err: any) {
      console.error("Admin login error:", err);
      setError("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

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
              <Shield className="w-10 h-10 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-text mb-2">Acceso de Admin</h1>
            <p className="text-text-secondary">Accede al panel de administración</p>
          </div>

          {/* Error Alert */}
          {error && <Alert type="error" message={error} className="mb-6" />}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo Electrónico"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@ejemplo.com"
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

            <Button type="submit" loading={loading} fullWidth size="lg">
              Iniciar Sesión
            </Button>
          </form>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-bg-subtle rounded-lg">
            <p className="text-sm text-text-secondary">
              <strong>Credenciales por defecto:</strong>
              <br />
              Correo: admin@foodorder.com
              <br />
              Contraseña: admin123
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
