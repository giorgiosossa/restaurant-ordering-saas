import React from "react";
import { User, Users, Store } from "lucide-react";
import { Card } from "../../components/ui";

interface AccessLandingProps {
  restaurantName: string;
  onOwnerAccess: () => void;
  onEmployeeAccess: () => void;
}

const AccessLanding: React.FC<AccessLandingProps> = ({
  restaurantName,
  onOwnerAccess,
  onEmployeeAccess,
}) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10 mb-4">
            <Store className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-text">
            Bienvenido a {restaurantName}
          </h1>
          <p className="text-text-secondary text-lg">
            Selecciona tu tipo de acceso
          </p>
        </div>

        {/* Access Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Owner Access */}
          <Card className="hover:shadow-xl transition-all cursor-pointer group">
            <button
              onClick={onOwnerAccess}
              className="w-full text-left p-6 space-y-6"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <User className="w-8 h-8 text-accent" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-text">Acceso Dueño</h2>
                <p className="text-text-secondary">
                  Panel completo de administración
                </p>
              </div>

              <div className="space-y-2 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                  <span>Gestión de menú</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                  <span>Reportes y análisis</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                  <span>Configuración del sistema</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                  <span>Gestión de empleados</span>
                </div>
              </div>

              <div className="pt-4">
                <div className="inline-flex items-center justify-center w-full h-12 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors">
                  Ingresar con PIN
                </div>
              </div>
            </button>
          </Card>

          {/* Employee Access */}
          <Card className="hover:shadow-xl transition-all cursor-pointer group">
            <button
              onClick={onEmployeeAccess}
              className="w-full text-left p-6 space-y-6"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-secondary/10 group-hover:bg-accent-secondary/20 transition-colors">
                <Users className="w-8 h-8 text-accent-secondary" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-text">Acceso Empleado</h2>
                <p className="text-text-secondary">
                  Sistema de comandas y pedidos
                </p>
              </div>

              <div className="space-y-2 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-secondary"></div>
                  <span>Gestión de pedidos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-secondary"></div>
                  <span>Cocina / Caja / Mesero</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-secondary"></div>
                  <span>Pantalla de comandas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-secondary"></div>
                  <span>Control de turnos</span>
                </div>
              </div>

              <div className="pt-4">
                <div className="inline-flex items-center justify-center w-full h-12 bg-accent-secondary hover:bg-accent-secondary/90 text-white font-semibold rounded-lg transition-colors">
                  Ingresar con PIN
                </div>
              </div>
            </button>
          </Card>
        </div>

        {/* Footer Note */}
        <div className="text-center text-sm text-text-secondary mt-8">
          <p>
            ¿Olvidaste tu PIN? Contacta con el administrador del sistema
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccessLanding;
