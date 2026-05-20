import { useEffect, useState } from "react";
import {
  BarChart3, Bell, CreditCard, DollarSign,
  Gift, TrendingUp, Users, LogOut, Menu, X, Sun, Moon,
  ChevronLeft,
} from "lucide-react";
import { createAuthedClient } from "./supabase";
import { T_DARK, T_LIGHT } from "./config/theme";
import DashboardView     from "./pages/superadmin/DashboardView";
import ClientsView       from "./pages/superadmin/ClientsView";
import FinanceView       from "./pages/superadmin/FinanceView";
import SubscriptionsView from "./pages/superadmin/SubscriptionsView";
import CourtesyView      from "./pages/superadmin/CourtesyView";
import AlertsView        from "./pages/superadmin/AlertsView";
import AnalyticsView     from "./pages/superadmin/AnalyticsView";

(() => {
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap";
  document.head.appendChild(l);
})();

const NAV_ITEMS = [
  { id: "dashboard",     label: "Dashboard",       sub: "Visão geral",   icon: BarChart3  },
  { id: "clients",       label: "Clientes Ativos",  sub: "Ativos",        icon: Users      },
  { id: "finance",       label: "Financeiro",       sub: "Receita",       icon: DollarSign },
  { id: "subscriptions", label: "Assinaturas",      sub: "Cobrança",      icon: CreditCard },
  { id: "courtesy",      label: "Cortesias",        sub: "Acessos",       icon: Gift       },
  { id: "alerts",        label: "Alertas",          sub: "Eventos",       icon: Bell       },
  { id: "analytics",     label: "Analytics",        sub: "Inteligência",  icon: TrendingUp },
];

const SIDEBAR_W = 248;

export default function SuperAdminView({ token, profile, onLogout, themeMode, onToggleTheme }) {
  const T = themeMode === "light" ? T_LIGHT : T_DARK;

  // Cliente Supabase autenticado com o JWT do super admin
  // Isso garante que auth.uid() funcione nas RLS e RPCs
  const supabase = createAuthedClient(token);

  const [activeView,       setActiveView]       = useState("dashboard");
  const [metrics,          setMetrics]          = useState(null);
  const [loadingMet,       setLoadingMet]       = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [collapsed,        setCollapsed]        = useState(false);   // desktop collapse
  const [isMobile,         setIsMobile]         = useState(window.innerWidth < 768);
  const [hoveredNav,       setHoveredNav]       = useState(null);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  // Inject CSS keyframes (shared with DashboardView via oz-sa-styles id)
  useEffect(() => {
    if (document.getElementById("oz-sa-styles")) return;
    const s = document.createElement("style");
    s.id = "oz-sa-styles";
    s.textContent = `
      @keyframes cardIn {
        from { opacity: 0; transform: translateY(18px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0)    scale(1);    }
      }
      @keyframes fadeView {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0);    }
      }
      @keyframes shimmer {
        0%   { background-position: -600px 0; }
        100% { background-position:  600px 0; }
      }
    `;
    document.head.appendChild(s);
  }, []);

  const loadMetrics = async () => {
    setLoadingMet(true);
    try {
      const { data, error } = await supabase.rpc("get_saas_metrics");
      if (!error && data) setMetrics(data);
    } catch (e) { console.error(e); }
    setLoadingMet(false);
  };

  useEffect(() => { loadMetrics(); }, []);

  const isDark = themeMode !== "light";
  const navigate = (id) => {
    setActiveView(id);
    if (isMobile) setMobileSidebarOpen(false);
  };

  // ── Sidebar content ─────────────────────────────────────────
  const sidebarContent = (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: T.sidebar, borderRight: `1px solid ${T.border}`,
      width: SIDEBAR_W, overflow: "hidden",
    }}>

      {/* ── Header: logo + collapse btn ── */}
      <div style={{ padding: "1.25rem 1rem 1rem", borderBottom: `1px solid ${T.border}`, position: "relative" }}>

        {/* Collapse button (desktop only) */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(true)}
            title="Ocultar menu"
            style={{
              position: "absolute", top: 12, right: 10,
              width: 28, height: 28, borderRadius: 8,
              background: T.surface, border: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: T.muted, flexShrink: 0,
              transition: "all 0.15s",
            }}>
            <ChevronLeft size={14} />
          </button>
        )}

        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={() => setMobileSidebarOpen(false)}
            style={{
              position: "absolute", top: 12, right: 10,
              width: 28, height: 28, borderRadius: 8,
              background: T.surface, border: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: T.muted,
            }}>
            <X size={14} />
          </button>
        )}

        {/* Logo centralizada grande */}
        <div style={{ textAlign: "center", paddingTop: "0.25rem" }}>
          <div style={{
            width: 184, height: 184, margin: "0 auto 0.875rem",
            filter: `drop-shadow(0 0 28px ${T.accent}60) drop-shadow(0 0 56px ${T.accent}25)`,
          }}>
            <img
              src="/icons/logo.png"
              alt="Oz.Wash"
              style={{
                width: "100%", height: "100%", objectFit: "cover", display: "block",
                maskImage: "radial-gradient(circle, black 42%, transparent 50%)",
                WebkitMaskImage: "radial-gradient(circle, black 42%, transparent 50%)",
              }}
            />
          </div>
          <div style={{
            fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
            fontSize: 24, letterSpacing: 1.5, color: T.accent, lineHeight: 1,
          }}>Oz.Wash</div>
        </div>

        {/* SUPER ADMIN badge */}
        <div style={{
          marginTop: "1rem",
          background: `${T.success}18`, border: `1px solid ${T.success}44`,
          borderRadius: 8, padding: "0.45rem 0.75rem", textAlign: "center",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.success, letterSpacing: 0.8 }}>⚡ SUPER ADMIN</div>
          <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>Controle global da plataforma</div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, padding: "0.75rem 0.5rem", overflowY: "auto" }}>
        {NAV_ITEMS.map(({ id, label, sub, icon: Icon }) => {
          const isActive = activeView === id;
          const isHov    = hoveredNav === id && !isActive;
          return (
            <button key={id}
              onClick={() => navigate(id)}
              onMouseEnter={() => setHoveredNav(id)}
              onMouseLeave={() => setHoveredNav(null)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "0.55rem 0.625rem", borderRadius: 10, border: "none",
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: 2,
                background: isActive ? `${T.accent}18` : isHov ? `${T.accent}0b` : "transparent",
                transform: isHov ? "translateX(3px)" : "translateX(0)",
                transition: "background 0.18s, transform 0.18s cubic-bezier(.4,0,.2,1)",
              }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: isActive ? `${T.accent}28` : isHov ? `${T.accent}14` : T.surface,
                border: `1px solid ${isActive ? T.accent + "55" : isHov ? T.accent + "33" : T.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.18s",
                boxShadow: isActive ? `0 0 12px ${T.accent}22` : "none",
              }}>
                <Icon size={15} color={isActive ? T.accent : isHov ? T.accent + "bb" : T.muted} />
              </div>
              <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? T.accent : isHov ? T.text : T.text, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", transition: "color 0.18s" }}>{label}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{sub}</div>
              </div>
              {isActive && <div style={{ width: 3, height: 18, borderRadius: 99, background: T.accent, flexShrink: 0, boxShadow: `0 0 8px ${T.accent}88` }} />}
            </button>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div style={{ padding: "0.875rem 1rem", borderTop: `1px solid ${T.border}` }}>

        {/* Email */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.75rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: T.muted, marginBottom: 1 }}>Logado como</div>
            <div style={{ fontSize: 11, color: T.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {profile?.email}
            </div>
          </div>
        </div>

        {/* Modo Escuro */}
        {onToggleTheme && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: 12, color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>Modo Escuro</span>
            <button onClick={onToggleTheme}
              style={{ position: "relative", width: 44, height: 24, borderRadius: 999, background: isDark ? T.accent : T.border, border: "none", cursor: "pointer", transition: "background 0.3s", padding: 0, display: "flex", alignItems: "center" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.3)", transform: isDark ? "translateX(22px)" : "translateX(3px)", transition: "transform 0.28s", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isDark ? <Moon size={10} color="#334155" /> : <Sun size={10} color="#f59e0b" />}
              </div>
            </button>
          </div>
        )}

        {/* Sair */}
        <button onClick={onLogout}
          style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", background: `${T.danger}10`, border: `1px solid ${T.danger}22`, borderRadius: 8, padding: "0.45rem 0.75rem", color: T.muted, cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>
          <LogOut size={13} />Sair
        </button>
      </div>
    </div>
  );

  const sharedProps = { token, supabase, metrics, loadingMet, onRefreshMetrics: loadMetrics, T };

  const renderView = () => {
    switch (activeView) {
      case "dashboard":     return <DashboardView     {...sharedProps} />;
      case "clients":       return <ClientsView       {...sharedProps} />;
      case "subscriptions": return <SubscriptionsView {...sharedProps} />;
      case "finance":       return <FinanceView       {...sharedProps} />;
      case "courtesy":      return <CourtesyView      {...sharedProps} />;
      case "alerts":        return <AlertsView        {...sharedProps} />;
      case "analytics":     return <AnalyticsView     {...sharedProps} />;
      default:              return <DashboardView     {...sharedProps} />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Desktop Sidebar ── */}
      {!isMobile && (
        <div style={{
          width: collapsed ? 0 : SIDEBAR_W,
          flexShrink: 0,
          height: "100vh",
          position: "sticky",
          top: 0,
          overflow: "hidden",
          transition: "width 0.28s cubic-bezier(.4,0,.2,1)",
        }}>
          {sidebarContent}
        </div>
      )}

      {/* ── Mobile overlay ── */}
      {isMobile && (
        <>
          {mobileSidebarOpen && (
            <div
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 199, backdropFilter: "blur(2px)" }}
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}
          <div style={{
            position: "fixed", left: 0, top: 0, bottom: 0,
            width: SIDEBAR_W, zIndex: 200,
            transform: mobileSidebarOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.25s cubic-bezier(.4,0,.2,1)",
          }}>
            {sidebarContent}
          </div>
        </>
      )}

      {/* ── Main content ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

        {/* Topbar — somente mobile */}
        {isMobile && (
          <div style={{
            display: "flex", alignItems: "center",
            padding: "0.75rem 1.25rem",
            borderBottom: `1px solid ${T.border}`,
            background: T.sidebar, flexShrink: 0,
            gap: 12,
          }}>
            <button
              onClick={() => setMobileSidebarOpen(true)}
              style={{
                width: 36, height: 36, borderRadius: 9,
                background: T.surface, border: `1px solid ${T.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: T.text, flexShrink: 0,
              }}>
              <Menu size={17} />
            </button>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 16, color: T.accent }}>
              Oz.Wash
            </div>
            <div style={{ marginLeft: 4, fontSize: 10, color: T.success, fontWeight: 700, background: `${T.success}18`, padding: "2px 8px", borderRadius: 20 }}>
              SUPER ADMIN
            </div>
          </div>
        )}

        {/* Desktop: botão flutuante para expandir sidebar quando colapsado */}
        {!isMobile && collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            title="Expandir menu"
            style={{
              position: "fixed", left: 12, top: 12, zIndex: 100,
              width: 36, height: 36, borderRadius: 9,
              background: T.sidebar, border: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: T.text,
              boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            }}>
            <Menu size={17} />
          </button>
        )}

        <main style={{ flex: 1, padding: isMobile ? "1.25rem 1rem" : "2rem 2.5rem", width: "100%", minWidth: 0 }}>
          <div key={activeView} style={{ animation: "fadeView 0.28s cubic-bezier(.4,0,.2,1) both" }}>
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
}
