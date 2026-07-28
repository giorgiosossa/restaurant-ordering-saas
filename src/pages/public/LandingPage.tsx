import React from "react";
import { Link } from "react-router-dom";
import { Menu as MenuIcon, X } from "lucide-react";
import { APP_CONFIG } from "../../config/config";

const CANTERA = {
  bg: "#0D1712",
  cream: "#F3EEE3",
  sage: "#7C9683",
  copper: "#C17A45",
  copperHover: "rgba(193,122,69,0.9)",
};

const serif = "'Fraunces', serif";

const NAV_LINKS = [
  { label: "Producto", href: "#producto" },
  { label: "Soluciones", href: "#soluciones" },
  { label: "Precios", href: "#precios" },
  { label: "Compañía", href: "#compania" },
];

const INFO_ROWS = [
  { num: "01", label: "Comandas conectadas" },
  { num: "02", label: "Inventario vivo" },
  { num: "03", label: "Reportes editoriales" },
];

const SOLUTION_CARDS = [
  {
    title: "Comandas en tiempo real",
    body: "De la barra a la cocina sin fricción, sin papel perdido, sin gritos entre estaciones.",
  },
  {
    title: "Reportes que se entienden de un vistazo",
    body: "Ventas, márgenes e inventario, sin exportar una sola hoja de cálculo.",
  },
  {
    title: "Un sistema que crece con vos",
    body: "De una barra a varias sucursales, sin cambiar de plataforma ni reentrenar al equipo.",
  },
];

const FEATURES = [
  { title: "Comandas conectadas", body: "Cocina, barra y caja sincronizadas en tiempo real." },
  { title: "Inventario vivo", body: "Mermas, costo por platillo y alertas de stock automáticas." },
  {
    title: "Pagos y cobros",
    body: "Tarjeta, QR, split de cuenta y propinas, todo desde la misma terminal.",
  },
  { title: "Reportes editoriales", body: "Ventas por hora, platillo estrella y margen real, sin ruido." },
  { title: "Multi-sucursal", body: "El mismo estándar de operación en cada punto de venta." },
];

const TESTIMONIALS = [
  {
    quote:
      "“Desde que migramos a Cocina Cantera, los tiempos de comanda bajaron a la mitad. Se siente hecho para cocinas de verdad.”",
    name: "Renata Duarte",
    role: "Chef y propietaria, Fonda Verde Bosque",
  },
  {
    quote:
      "“El reporte de márgenes por platillo cambió cómo armamos el menú. Ahora decidimos con datos, no con intuición.”",
    name: "Mateo Salcido",
    role: "Director de Operaciones, Grupo Cantera Hospitality",
  },
  {
    quote:
      "“Es el primer POS que no tuvimos que 'aprender' — se sintió intuitivo desde el primer turno.”",
    name: "Ximena Roldán",
    role: "Gerente General, Café Terracota",
  },
];

const CanteraMark: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: size, height: size, color: CANTERA.cream }}>
    <path d="M12 2L22 12L12 22L2 12Z" fill="currentColor" />
    <path d="M12 7.5L16.5 12L12 16.5L7.5 12Z" fill={CANTERA.bg} />
  </svg>
);

const useFadeIn = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const style: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(12px)",
    transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
  };

  return { ref, style };
};

const LandingPage: React.FC = () => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fadeSoluciones = useFadeIn();
  const fadeProducto = useFadeIn();
  const fadeTestimonios = useFadeIn();
  const fadePrecios = useFadeIn();

  const freeTrial = APP_CONFIG.plans.free_trial as any;
  const commission = APP_CONFIG.plans.commission as any;
  const fixed = APP_CONFIG.plans.fixed as any;

  const plans = [
    {
      name: freeTrial.name,
      tier: "Esencial",
      desc: `${freeTrial.duration}, sin tarjeta de crédito. ${freeTrial.features?.[0] ?? ""}`,
      price: "$0",
    },
    {
      name: commission.name,
      tier: "Crecimiento",
      desc: `${commission.duration}. Pedidos ilimitados, reportes en tiempo real.`,
      price: commission.priceLabel,
    },
    {
      name: fixed.name,
      tier: "Premium",
      desc: "Multi-sucursal, soporte prioritario y marca personalizada.",
      price: `${APP_CONFIG.defaultCurrency}${fixed.price} /${fixed.duration}`,
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: CANTERA.bg,
        color: CANTERA.cream,
        overflowX: "hidden",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes heroZoom { from { transform: scale(1); } to { transform: scale(1.06); } }
        @keyframes ccArrowDrift { 0%, 100% { transform: translateX(0) rotate(0deg); } 50% { transform: translateX(4px) rotate(4deg); } }
        .cc-info-row:hover .cc-arrow { stroke: ${CANTERA.copper}; transform: translateX(2px); }
        .cc-arrow { transition: all 0.2s; }
        @media (min-width: 768px) {
          .cc-nav-links { display: flex !important; }
          .cc-nav-cta { display: inline-block !important; }
          .cc-nav-burger { display: none !important; }
          .cc-grid-3 { grid-template-columns: repeat(3, 1fr) !important; }
          .cc-grid-features { grid-template-columns: repeat(2, 1fr) !important; }
          .cc-grid-2 { grid-template-columns: repeat(2, 1fr) !important; }
          .cc-footer-grid { flex-direction: row !important; justify-content: space-between !important; }
        }
      `}</style>

      {/* NAV */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          transition: "background 0.3s, border-color 0.3s",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: scrolled ? "rgba(13,23,18,0.9)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: `1px solid ${scrolled ? "rgba(124,150,131,0.15)" : "transparent"}`,
        }}
      >
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CanteraMark />
          <span
            style={{
              fontWeight: 600,
              fontSize: 14,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: CANTERA.cream,
            }}
          >
            {APP_CONFIG.appName}
          </span>
        </Link>

        <div className="cc-nav-links" style={{ display: "none", gap: 32 }}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{ fontSize: 14, color: "rgba(243,238,227,0.7)", transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = CANTERA.cream)}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(243,238,227,0.7)")}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            to="/login"
            className="cc-nav-cta"
            style={{
              display: "none",
              fontSize: 14,
              color: "rgba(243,238,227,0.7)",
            }}
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="cc-nav-cta"
            style={{
              display: "none",
              padding: "10px 20px",
              background: CANTERA.copper,
              color: CANTERA.bg,
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 8,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = CANTERA.copperHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = CANTERA.copper)}
          >
            Empezar gratis
          </Link>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="cc-nav-burger"
            style={{ display: "flex", background: "none", border: "none", color: CANTERA.cream, cursor: "pointer", padding: 4 }}
            aria-label="Abrir menú"
          >
            {menuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </nav>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: CANTERA.bg,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
          }}
        >
          <button
            onClick={() => setMenuOpen(false)}
            style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", color: CANTERA.cream, cursor: "pointer" }}
            aria-label="Cerrar menú"
          >
            <X size={28} />
          </button>
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{ fontFamily: serif, fontSize: 28, color: CANTERA.cream }}
            >
              {link.label}
            </a>
          ))}
          <Link to="/login" onClick={() => setMenuOpen(false)} style={{ fontFamily: serif, fontSize: 28, color: CANTERA.cream }}>
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            onClick={() => setMenuOpen(false)}
            style={{
              marginTop: 12,
              padding: "14px 28px",
              background: CANTERA.copper,
              color: CANTERA.bg,
              fontSize: 15,
              fontWeight: 500,
              borderRadius: 8,
            }}
          >
            Empezar gratis
          </Link>
        </div>
      )}

      {/* HERO */}
      <section
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          overflow: "hidden",
          height: "100vh",
        }}
      >
        <img
          src="/images/kitchen-hero.png"
          alt="Cocina cantera"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            objectFit: "cover",
            objectPosition: "center",
            width: "100%",
            height: "100%",
            animation: "heroZoom 20s linear forwards",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background:
              "linear-gradient(to bottom, rgba(13,23,18,0.5), rgba(13,23,18,0.15) 45%, rgba(13,23,18,0.65))",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 10,
            paddingTop: 112,
            paddingLeft: 16,
            paddingRight: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontFamily: serif,
              fontWeight: 500,
              fontSize: 44,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: CANTERA.cream,
              margin: 0,
            }}
          >
            Solidez de cantera,
            <br />
            alma de cocina.
          </h1>
          <p
            style={{
              maxWidth: 380,
              marginTop: 20,
              fontSize: 15,
              color: "#FFFFFFBF",
              lineHeight: 1.6,
              fontWeight: 600,
            }}
          >
            Gestiona tu cocina más fácil: ventas, comandas e inventario desde
            una sola pantalla, con el POS hecho para el ritmo real de un
            negocio de comida.
          </p>
          <Link
            to="/register"
            style={{
              marginTop: 28,
              padding: "14px 28px",
              background: CANTERA.copper,
              color: CANTERA.bg,
              fontSize: 15,
              fontWeight: 500,
              borderRadius: 8,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = CANTERA.copperHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = CANTERA.copper)}
          >
            Empezar prueba gratis
          </Link>
        </div>
      </section>

      {/* PROBLEMA */}
      <section style={{ padding: "96px 20px", maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: CANTERA.sage, fontWeight: 500 }}>
          EL PROBLEMA
        </div>
        <p style={{ marginTop: 16, fontFamily: serif, fontSize: 26, lineHeight: 1.4, color: CANTERA.cream }}>
          La mayoría de los sistemas POS se sienten prestados: interfaces
          genéricas, reportes que nadie termina de leer, soporte que tarda una
          eternidad en responder. Mientras tanto, la cocina — la que de
          verdad sostiene el negocio — sigue operando con herramientas que no
          están a su altura.
        </p>
      </section>

      {/* QUÉ HACEMOS */}
      <div
        style={{
          background:
            "linear-gradient(to bottom, rgba(31,74,54,0), rgba(31,74,54,0.85) 40%, rgba(31,74,54,0.85))",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(124,150,131,0.2)",
          borderBottom: "none",
          borderTop: "none",
          padding: "56px 20px 0 20px",
          position: "relative",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 40 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: CANTERA.sage, fontWeight: 500 }}>
              QUÉ HACEMOS
            </div>
            <h2
              style={{
                marginTop: 12,
                fontFamily: serif,
                fontWeight: 400,
                fontSize: 26,
                lineHeight: 1.25,
                letterSpacing: "-0.01em",
                color: CANTERA.cream,
              }}
            >
              Un sistema que opera
              <br />
              como tu cocina
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <p style={{ fontSize: 14, color: "rgba(243,238,227,0.7)", lineHeight: 1.6, margin: 0 }}>
              La mayoría de los sistemas POS se sienten prestados. {APP_CONFIG.appName} está
              hecho para el ritmo real de una cocina: comandas, inventario y
              pagos en una sola pantalla.
            </p>
          </div>
        </div>
        <div style={{ marginTop: 48, height: 1, background: "rgba(124,150,131,0.2)", width: "100%" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, paddingTop: 24, paddingBottom: 24 }}>
          {INFO_ROWS.map((row) => (
            <div
              key={row.num}
              className="cc-info-row"
              style={{
                background: "rgba(13,23,18,0.6)",
                transition: "background 0.2s",
                padding: "14px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(13,23,18,0.9)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(13,23,18,0.6)")}
            >
              <span>
                <span style={{ color: "rgba(193,122,69,0.8)" }}>{row.num}</span>
                <span style={{ margin: "0 8px", color: "rgba(124,150,131,0.4)" }}>/</span>
                <span style={{ fontWeight: 500, color: CANTERA.cream }}>{row.label}</span>
              </span>
              <span style={{ display: "inline-flex", animation: "ccArrowDrift 2.4s ease-in-out infinite" }}>
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke={CANTERA.sage}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="cc-arrow"
                >
                  <path d="M3 13c4-5 10-7 15-3" />
                  <path d="M13 7c2 0 4 1 5 3c-1 2-3 4-5 5" />
                </svg>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SOLUCIONES */}
      <section
        id="soluciones"
        ref={fadeSoluciones.ref}
        style={{ padding: "96px 20px", maxWidth: 1120, margin: "0 auto", ...fadeSoluciones.style }}
      >
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: CANTERA.sage, fontWeight: 500 }}>
          LA SOLUCIÓN
        </div>
        <h2 style={{ marginTop: 12, fontFamily: serif, fontSize: 36, letterSpacing: "-0.01em", color: CANTERA.cream }}>
          Tres razones para cambiar
        </h2>
        <div className="cc-grid-3" style={{ marginTop: 56, display: "grid", gridTemplateColumns: "1fr", gap: 32 }}>
          {SOLUTION_CARDS.map((card) => (
            <div key={card.title} style={{ borderTop: "1px solid rgba(124,150,131,0.2)", paddingTop: 24 }}>
              <h3 style={{ fontFamily: serif, fontSize: 20, color: CANTERA.cream, margin: 0 }}>{card.title}</h3>
              <p style={{ marginTop: 8, fontSize: 14, color: "rgba(243,238,227,0.7)", lineHeight: 1.6 }}>{card.body}</p>
            </div>
          ))}
        </div>
        <div className="cc-grid-2" style={{ marginTop: 64, display: "grid", gridTemplateColumns: "1fr", gap: 32 }}>
          <div style={{ position: "relative", overflow: "hidden" }}>
            <img
              src="/images/comandas.png"
              alt="Comandas en tablet"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
                maskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(160deg, rgba(31,74,54,0.35), rgba(13,23,18,0) 45%, rgba(13,23,18,0.85) 100%)",
              }}
            />
          </div>
          <div style={{ position: "relative", overflow: "hidden" }}>
            <img
              src="/images/cliente.png"
              alt="Menú digital en celular"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
                maskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(160deg, rgba(31,74,54,0.35), rgba(13,23,18,0) 45%, rgba(13,23,18,0.85) 100%)",
              }}
            />
          </div>
        </div>
      </section>

      {/* PRODUCTO */}
      <section
        id="producto"
        ref={fadeProducto.ref}
        style={{
          padding: "96px 20px",
          maxWidth: 1120,
          margin: "0 auto",
          background: "rgba(31,74,54,0.1)",
          ...fadeProducto.style,
        }}
      >
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: CANTERA.sage, fontWeight: 500 }}>
          EL PRODUCTO
        </div>
        <h2 style={{ marginTop: 12, fontFamily: serif, fontSize: 36, letterSpacing: "-0.01em", color: CANTERA.cream }}>
          Todo lo que tu cocina necesita
        </h2>
        <div
          className="cc-grid-features"
          style={{ marginTop: 48, display: "grid", gridTemplateColumns: "1fr", gap: 1, background: "rgba(124,150,131,0.15)" }}
        >
          {FEATURES.map((feat, i) => (
            <div
              key={feat.title}
              style={{
                background: CANTERA.bg,
                padding: 32,
                gridColumn: i === FEATURES.length - 1 && FEATURES.length % 2 !== 0 ? "1 / -1" : undefined,
              }}
            >
              <div style={{ fontWeight: 500, color: CANTERA.cream }}>{feat.title}</div>
              <p style={{ marginTop: 8, fontSize: 14, color: "rgba(243,238,227,0.65)", lineHeight: 1.6 }}>{feat.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section
        id="testimonios"
        ref={fadeTestimonios.ref}
        style={{ padding: "96px 20px", maxWidth: 1120, margin: "0 auto", ...fadeTestimonios.style }}
      >
        <div className="cc-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
          {TESTIMONIALS.map((t) => (
            <div key={t.name} style={{ background: "rgba(31,74,54,0.15)", border: "1px solid rgba(124,150,131,0.15)", padding: 32 }}>
              <p style={{ fontFamily: serif, fontSize: 18, color: CANTERA.cream, lineHeight: 1.4, margin: 0 }}>{t.quote}</p>
              <div style={{ marginTop: 16, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: CANTERA.sage }}>
                {t.name}, {t.role}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRECIOS */}
      <section
        id="precios"
        ref={fadePrecios.ref}
        style={{ padding: "96px 20px", maxWidth: 720, margin: "0 auto", textAlign: "center", ...fadePrecios.style }}
      >
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: CANTERA.sage, fontWeight: 500 }}>
          PRECIOS
        </div>
        <h2 style={{ marginTop: 12, fontFamily: serif, fontSize: 36, letterSpacing: "-0.01em", color: CANTERA.cream }}>
          Precios a la medida de tu operación
        </h2>
        <p
          style={{
            marginTop: 16,
            fontSize: 15,
            color: "rgba(243,238,227,0.7)",
            maxWidth: 520,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.6,
          }}
        >
          Cada cocina es distinta. Elige prueba gratis, comisión por venta o
          cuota fija mensual — sin permanencia forzosa.
        </p>
        <div className="cc-grid-3" style={{ marginTop: 48, display: "grid", gridTemplateColumns: "1fr", gap: 24, textAlign: "left" }}>
          {plans.map((plan) => (
            <div key={plan.name} style={{ border: "1px solid rgba(124,150,131,0.2)", padding: 32 }}>
              <div style={{ fontFamily: serif, fontSize: 22, color: CANTERA.cream }}>{plan.name}</div>
              <div style={{ marginTop: 4, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: CANTERA.sage }}>
                {plan.tier}
              </div>
              <p style={{ marginTop: 16, fontSize: 14, color: "rgba(243,238,227,0.7)", lineHeight: 1.6 }}>{plan.desc}</p>
              <div style={{ marginTop: 20, fontSize: 13, color: CANTERA.copper }}>{plan.price}</div>
            </div>
          ))}
        </div>
        <Link
          to="/register"
          style={{
            display: "inline-block",
            marginTop: 40,
            padding: "14px 28px",
            background: CANTERA.copper,
            color: CANTERA.bg,
            fontSize: 15,
            fontWeight: 500,
            borderRadius: 8,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = CANTERA.copperHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = CANTERA.copper)}
        >
          Empezar prueba gratis
        </Link>
      </section>

      {/* FOOTER */}
      <footer
        id="compania"
        style={{ borderTop: "1px solid rgba(124,150,131,0.15)", padding: "64px 20px", maxWidth: 1120, margin: "0 auto" }}
      >
        <div className="cc-footer-grid" style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CanteraMark />
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: CANTERA.cream,
                }}
              >
                {APP_CONFIG.appName}
              </span>
            </div>
            <p style={{ marginTop: 8, fontSize: 14, color: "rgba(243,238,227,0.6)" }}>
              Solidez de cantera, alma de cocina.
            </p>
          </div>
          <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{ fontSize: 14, color: "rgba(243,238,227,0.6)", transition: "color 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = CANTERA.cream)}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(243,238,227,0.6)")}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: "1px solid rgba(124,150,131,0.1)",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            fontSize: 12,
            color: "rgba(243,238,227,0.4)",
          }}
        >
          <span>
            © {new Date().getFullYear()} {APP_CONFIG.appName} — todos los derechos reservados.
          </span>
          <div style={{ display: "flex", gap: 16 }}>
            <a href="#" style={{ color: "rgba(243,238,227,0.4)" }}>
              Instagram
            </a>
            <a href="#" style={{ color: "rgba(243,238,227,0.4)" }}>
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
