import { useEffect, useState } from "react";
import {
  BarChart3, Bell, CreditCard, DollarSign,
  Gift, TrendingUp, Users, LogOut, Menu, X, Sun, Moon,
  Car, Droplets,
} from "lucide-react";
import { supabase } from "./supabase";
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

const T = {
  bg: "#0b0b0e", surface: "#13131a", card: "#1a1a24", border: "#2a2a3a",
  accent: "#4db8ff", accentGlow: "#4db8ff22",
  text: "#ece8e0", muted: "#706b63", mutedLight: "#9a9590",
  success: "#43d18a", successBg: "#43d18a18",
  danger: "#f07070", dangerBg: "#f0707018",
  info: "#60a5fa", infoBg: "#60a5fa18",
  sidebar: "#0e0e14",
};

const NAV_ITEMS = [
  { id: "dashboard",     label: "Dashboard",    sub: "Visão geral",   icon: BarChart3  },
  { id: "clients",       label: "Clientes Ativos", sub: "Ativos",    icon: Users      },
  { id: "finance",       label: "Financeiro",   sub: "Receita",       icon: DollarSign },
  { id: "subscriptions", label: "Assinaturas",  sub: "Cobrança",      icon: CreditCard },
  { id: "courtesy",      label: "Cortesias",    sub: "Acessos",       icon: Gift       },
  { id: "alerts",        label: "Alertas",      sub: "Eventos",       icon: Bell       },
  { id: "analytics",     label: "Analytics",    sub: "Inteligência",  icon: TrendingUp },
];

export default function SuperAdminView({ token, profile, onLogout, themeMode, onToggleTheme }) {
  const [activeView,  setActiveView]  = useState("dashboard");
  const [metrics,     setMetrics]     = useState(null);
  const [loadingMet,  setLoadingMet]  = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile,    setIsMobile]    = useState(window.innerWidth < 768);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
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

  const sidebarContent = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.sidebar, borderRight: `1px solid ${T.border}` }}>

      {/* ── Logo ── */}
      <div style={{ padding: "1.5rem 1.25rem 1.25rem", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1rem" }}>
          {/* Logo circular com ícones */}
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg, ${T.accent}22, ${T.accent}08)`, border: `2px solid ${T.accent}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative", boxShadow: `0 0 16px ${T.accent}22` }}>
            <Car size={20} color={T.accent} />
            <div style={{ position: "absolute", bottom: 6, right: 5 }}>
              <Droplets size={10} color={T.accent} />
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 2, color: T.accent, lineHeight: 1 }}>Oz.Wash</div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>LavaRápido</div>
          </div>
        </div>

        {/* Badge SUPER ADMIN */}
        <div style={{ background: `${T.success}18`, border: `1px solid ${T.success}44`, borderRadius: 8, padding: "0.5rem 0.875rem" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.success, letterSpacing: 0.8 }}>⚡ SUPER ADMIN</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Controle global da plataforma.</div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, padding: "0.875rem 0.625rem", overflowY: "auto" }}>
        {NAV_ITEMS.map(({ id, label, sub, icon: Icon }) => {
          const isActive = activeView === id;
          return (
            <button key={id}
              onClick={() => { setActiveView(id); if (isMobile) setSidebarOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "0.6rem 0.75rem", borderRadius: 10, border: "none", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", marginBottom: 3,
                background: isActive ? `${T.accent}18` : "transparent",
                transition: "background 0.15s",
              }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: isActive ? `${T.accent}28` : `${T.surface}`, border: `1px solid ${isActive ? T.accent + "44" : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                <Icon size={15} color={isActive ? T.accent : T.muted} />
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? T.accent : T.text, lineHeight: 1.2 }}>{label}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{sub}</div>
              </div>
              {isActive && <div style={{ width: 3, height: 18, borderRadius: 99, background: T.accent, flexShrink: 0 }} />}
            </button>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div style={{ padding: "1rem 1.25rem", borderTop: `1px solid ${T.border}` }}>
        {/* Theme toggle */}
        {onToggleTheme && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
            <span style={{ fontSize: 12, color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>Modo Escuro</span>
            <button onClick={onToggleTheme}
              style={{ position: "relative", width: 44, height: 24, borderRadius: 999, background: isDark ? T.accent : T.border, border: "none", cursor: "pointer", transition: "background 0.3s", padding: 0, display: "flex", alignItems: "center" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.3)", transform: isDark ? "translateX(22px)" : "translateX(3px)", transition: "transform 0.28s", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isDark ? <Moon size={10} color="#334155" /> : <Sun size={10} color="#f59e0b" />}
              </div>
            </button>
          </div>
        )}

        {/* Email */}
        <div style={{ fontSize: 11, color: T.muted, marginBottom: "0.625rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Logado como
        </div>
        <div style={{ fontSize: 12, color: T.mutedLight || T.muted, marginBottom: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
          {profile?.email}
        </div>

        <button onClick={onLogout}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif", padding: 0 }}>
          <LogOut size={13} />Sair
        </button>
      </div>
    </div>
  );

  const sharedProps = { token, supabase, metrics, loadingMet, onRefreshMetrics: loadMetrics };

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

      {/* ── Sidebar desktop ── */}
      {!isMobile && (
        <div style={{ width: 230, flexShrink: 0, height: "100vh", position: "sticky", top: 0 }}>
          {sidebarContent}
        </div>
      )}

      {/* ── Sidebar mobile overlay ── */}
      {isMobile && (
        <>
          {sidebarOpen && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 199, backdropFilter: "blur(2px)" }}
              onClick={() => setSidebarOpen(false)} />
          )}
          <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 250, zIndex: 200, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s cubic-bezier(.4,0,.2,1)" }}>
            {sidebarContent}
          </div>
        </>
      )}

      {/* ── Main content ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Mobile topbar */}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", padding: "0.875rem 1rem", borderBottom: `1px solid ${T.border}`, background: T.sidebar, flexShrink: 0 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", marginRight: 12 }}><Menu size={20} /></button>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 2, color: T.accent }}>Oz.Wash</div>
            <div style={{ marginLeft: 8, fontSize: 10, color: T.success, fontWeight: 700, background: `${T.success}18`, padding: "2px 8px", borderRadius: 20 }}>SUPER ADMIN</div>
          </div>
        )}

        <main style={{ flex: 1, padding: isMobile ? "1.25rem 1rem" : "2rem 2.5rem", maxWidth: 1280, width: "100%" }}>
          {renderView()}
        </main>
      </div>
    </div>
  );
}
