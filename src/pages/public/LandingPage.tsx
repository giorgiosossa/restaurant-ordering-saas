import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  QrCode,
  Smartphone,
  TrendingUp,
  Clock,
  Check,
  Store,
  Menu as MenuIcon,
  X,
} from "lucide-react";
import { Button } from "../../components/ui";
import { APP_CONFIG } from "../../config/config";

const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-bg">
      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 bg-white/95 backdrop-blur-sm z-40">
        <div className="container-custom">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <Store className="w-8 h-8 text-accent" />
              <span className="text-xl font-bold text-text">
                {APP_CONFIG.appName}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#features"
                className="text-text-secondary hover:text-text transition-colors"
              >
                Funciones
              </a>
              <a
                href="#pricing"
                className="text-text-secondary hover:text-text transition-colors"
              >
                Precios
              </a>
              <a
                href="#how-it-works"
                className="text-text-secondary hover:text-text transition-colors"
              >
                Cómo Funciona
              </a>
              <Link
                to="/login"
                className="text-text-secondary hover:text-text transition-colors"
              >
                Iniciar Sesión
              </Link>
              <Link to="/register">
                <Button size="sm">Comenzar</Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-text"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <MenuIcon className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-3 border-t border-border">
              <a
                href="#features"
                className="block py-2 text-text-secondary hover:text-text transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Funciones
              </a>
              <a
                href="#pricing"
                className="block py-2 text-text-secondary hover:text-text transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Precios
              </a>
              <a
                href="#how-it-works"
                className="block py-2 text-text-secondary hover:text-text transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Cómo Funciona
              </a>
              <Link
                to="/login"
                className="block py-2 text-text-secondary hover:text-text transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Iniciar Sesión
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button fullWidth>Comenzar</Button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 md:py-32 overflow-hidden">
        <div className="container-custom">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-text mb-6 leading-tight">
              Digitaliza tu Restaurante
              <br />
              en Minutos
            </h1>
            <p className="text-lg md:text-xl text-text-secondary mb-10 max-w-2xl mx-auto">
              Ten tu propio sistema de pedidos por QR. Deja que tus clientes
              pidan directamente desde su celular. Sin descargar apps, sin
              comisiones ocultas, solo pedidos sin fricción.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" icon={<ArrowRight className="w-5 h-5" />}>
                  Comenzar Prueba Gratis
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline">
                  Ver Cómo Funciona
                </Button>
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
              <div>
                <div className="text-3xl font-bold text-text mb-1">50+</div>
                <div className="text-sm text-text-secondary">
                  Restaurantes Activos
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-text mb-1">10k+</div>
                <div className="text-sm text-text-secondary">
                  Pedidos Procesados
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-text mb-1">4.9</div>
                <div className="text-sm text-text-secondary">
                  Calificación de Clientes
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-bg-subtle">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
              Todo lo que necesitas para digitalizarte
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Un sistema de pedidos completo diseñado especialmente para
              restaurantes, cafeterías y food trucks
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: QrCode,
                title: "Pedidos por Código QR",
                description:
                  "Tus clientes escanean tu código QR único para ver el menú y hacer pedidos al instante",
              },
              {
                icon: Smartphone,
                title: "Diseño Mobile-First",
                description:
                  "Una interfaz hermosa y rápida que funciona perfecto en cualquier dispositivo",
              },
              {
                icon: TrendingUp,
                title: "Actualizaciones en Tiempo Real",
                description:
                  "Recibe notificaciones instantáneas de nuevos pedidos. Actualiza la disponibilidad del menú al momento",
              },
              {
                icon: Clock,
                title: "Ahorra Tiempo",
                description:
                  "Ya no tomes pedidos a mano. Enfócate en cocinar y servir",
              },
            ].map((feature, index) => (
              <div key={index} className="card text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/5 mb-4">
                  <feature.icon className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-text mb-2">
                  {feature.title}
                </h3>
                <p className="text-text-secondary">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
              Precios simples y transparentes
            </h2>
            <p className="text-lg text-text-secondary">
              Comienza con 14 días de prueba gratis. No necesitas tarjeta de crédito.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {Object.entries(APP_CONFIG.plans).map(([key, plan]) => (
              <div
                key={key}
                className={`card ${
                  key === "starter" ? "ring-2 ring-accent relative" : ""
                }`}
              >
                {key === "starter" && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-white px-4 py-1 rounded-full text-sm font-medium">
                    Más Popular
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-text mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-text">
                      {APP_CONFIG.defaultCurrency}
                      {plan.price}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-text-secondary">
                        /{plan.duration}
                      </span>
                    )}
                  </div>
                  {plan.price === 0 && (
                    <span className="text-sm text-text-secondary">
                      {plan.duration}
                    </span>
                  )}
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-success mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-text-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/register">
                  <Button
                    variant={key === "starter" ? "primary" : "outline"}
                    fullWidth
                  >
                    {plan.price === 0 ? "Comenzar Prueba Gratis" : "Comenzar"}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 bg-bg-subtle">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
              Empieza en 3 simples pasos
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                title: "Registra tu Restaurante",
                description:
                  "Llena un formulario rápido con los datos de tu restaurante. Nuestro equipo lo verificará y te contactará en menos de 24 horas.",
              },
              {
                step: "02",
                title: "Configura tu Menú",
                description:
                  "Agrega tus platillos, precios, fotos y categorías desde nuestro panel fácil de usar.",
              },
              {
                step: "03",
                title: "Empieza a Recibir Pedidos",
                description:
                  "Coloca tu código QR en las mesas. Los clientes escanean, piden, ¡y te avisamos al instante!",
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent text-white text-2xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-text mb-3">
                  {item.title}
                </h3>
                <p className="text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container-custom">
          <div className="bg-accent rounded-lg p-12 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              ¿Listo para digitalizar tu restaurante?
            </h2>
            <p className="text-lg mb-8 text-white/90 max-w-2xl mx-auto">
              Únete a más de 50 restaurantes que ya usan {APP_CONFIG.appName}{" "}
              para optimizar sus operaciones
            </p>
            <Link to="/register">
              <Button
                size="lg"
                variant="outline"
                className="bg-white text-accent hover:bg-white/90"
              >
                Comienza Gratis
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container-custom">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Store className="w-6 h-6 text-accent" />
                <span className="text-lg font-bold text-text">
                  {APP_CONFIG.appName}
                </span>
              </div>
              <p className="text-sm text-text-secondary">
                Pedidos digitales simples para restaurantes
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-text mb-4">Producto</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#features"
                    className="text-sm text-text-secondary hover:text-text"
                  >
                    Funciones
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-sm text-text-secondary hover:text-text"
                  >
                    Precios
                  </a>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="text-sm text-text-secondary hover:text-text"
                  >
                    Cómo Funciona
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-text mb-4">Empresa</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-sm text-text-secondary hover:text-text"
                  >
                    Nosotros
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-text-secondary hover:text-text"
                  >
                    Contacto
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-text-secondary hover:text-text"
                  >
                    Soporte
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-text mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-sm text-text-secondary hover:text-text"
                  >
                    Política de Privacidad
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-text-secondary hover:text-text"
                  >
                    Términos de Servicio
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-text-secondary">
            © {new Date().getFullYear()} {APP_CONFIG.appName}. Todos los
            derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
