import { useState, useEffect, useCallback } from "react";
import Onboarding from "./Onboarding";
import PlansView from "./PlansView";
import SuperAdminView from "./SuperAdminView";
import ResetPassword from "./ResetPassword";
import {
  LayoutDashboard, Car, Users, Wrench, DollarSign,
  Menu, X, Plus, Search, Edit2, Trash2, Check, TrendingUp,
  Phone, LogOut, Lock, Mail, CreditCard, Banknote, Smartphone,
  BadgePercent, AlertCircle, RefreshCw, FileText, Calendar, Bell, Gift,
  Settings, Upload, Palette, Shield, Clock, Package, Sun, Moon,
  Droplets, ChevronDown, ChevronUp, Truck,
} from "lucide-react";

(() => {
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap";
  document.head.appendChild(l);
})();

// ══════════════════════════════════════════════════════════════
//  ⚙️  CONFIGURAÇÃO SUPABASE
// ══════════════════════════════════════════════════════════════
const SUPABASE_URL  = "https://lolvvhdixbfcrquisnpi.supabase.co";
const SUPABASE_ANON = "sb_publishable_Ud8gUkUl9A3hVrJQTcsI_g_uvwskZax";
// ══════════════════════════════════════════════════════════════

const hdr = (tok, extra = {}) => ({
  apikey: SUPABASE_ANON,
  Authorization: `Bearer ${tok || SUPABASE_ANON}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
  ...extra,
});

const checkErr = async (res) => {
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || e.error_description || "Erro Supabase"); }
  return res;
};

const api = {
  login: (email, password) =>
    fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(r => r.json()),

  getUser: (tok) =>
    fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: hdr(tok) }).then(r => r.json()),

  getProfile: (uid, tok) =>
    fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}&select=*`, { headers: hdr(tok) })
      .then(r => r.json()).then(d => d[0]),

  list: (table, qs, tok) =>
    fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, { headers: hdr(tok) }).then(r => r.json()),

  insert: async (table, body, tok) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: hdr(tok), body: JSON.stringify(body) });
    await checkErr(r); return r.json();
  },

  update: async (table, id, body, tok) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: hdr(tok), body: JSON.stringify(body) });
    await checkErr(r); return r.json();
  },

  remove: (table, id, tok) =>
    fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: hdr(tok) }),
};

const checkCurrentUserAccess = async (tok, profile) => {
  const isSuperAdmin = profile?.is_super_admin === true || profile?.role === "super_admin";
  if (isSuperAdmin) return { has_access: true, reason: "super_admin" };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/current_user_access_status`, {
      method: "POST", headers: hdr(tok), body: JSON.stringify({}),
    });
    if (res.ok) { const data = await res.json(); if (data && typeof data === "object") return data; }
  } catch (e) { console.warn("Falha ao validar current_user_access_status:", e); }
  if (profile?.carwash_id) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/has_active_access`, {
        method: "POST", headers: hdr(tok), body: JSON.stringify({ p_carwash_id: profile.carwash_id }),
      });
      const hasAccess = await res.json();
      return { has_access: !!hasAccess, reason: hasAccess ? "legacy" : "no_active_access" };
    } catch (e) { console.warn("Falha ao validar has_active_access:", e); }
  }
  return { has_access: false, reason: "access_check_failed" };
};

const accessDeniedMessage = (reason) => {
  if (reason === "courtesy_revoked") return "Seu acesso cortesia foi revogado. Entre em contato com o suporte ou assine um plano.";
  if (reason === "no_carwash") return "Finalize o cadastro do seu lava rápido para continuar.";
  return "Sua assinatura ou acesso cortesia não está ativo. Renove ou solicite liberação para continuar.";
};

// ── TRANSFORMS ────────────────────────────────────────────────
const toOrder = o => ({
  id: o.id,
  clientId: o.client_id,
  vehicleId: o.vehicle_id,
  employeeId: o.employee_id,
  serviceId: o.service_id,
  price: +(o.price || 0),
  servicesPrice: +(o.services_price ?? o.price ?? 0),
  payment: o.payment || "",
  date: o.date || "",
  time: o.time || "",
  notes: o.notes || "",
  status: o.status || "pendente",
  extraServices: Array.isArray(o.extra_services) ? o.extra_services : [],
  productsSold: Array.isArray(o.products_sold) ? o.products_sold : [],
});
const fromOrder = o => ({
  client_id: +o.clientId || 0,
  vehicle_id: +o.vehicleId || null,
  employee_id: +o.employeeId || 0,
  service_id: +o.serviceId || 0,
  price: +o.price,
  services_price: +o.servicesPrice || +o.price,
  payment: o.payment,
  date: o.date,
  time: o.time,
  notes: o.notes,
  status: o.status || "pendente",
  extra_services: o.extraServices || [],
});
const toClient   = c => ({ id: c.id, name: c.name, phone: c.phone || "", whatsapp: c.whatsapp || "", birthdate: c.birthdate || "", notes: c.notes || "", points: +(c.points || 0) });
const toVehicle  = v => ({ id: v.id, clientId: v.client_id, plate: v.plate || "", brand: v.brand || "", model: v.model || "", color: v.color || "", year: v.year || "", notes: v.notes || "" });
const toEmployee = e => ({ id: e.id, name: e.name, phone: e.phone || "", commission: +(e.commission || 0), status: e.status || "active", userId: e.user_id });
const toService  = s => ({ id: s.id, name: s.name, price: +(s.price || 0), duration: +(s.duration || 0), active: s.active !== false });
const toExpense  = e => ({ id: e.id, desc: e.description, amount: +(e.amount || 0), date: e.date, category: e.category || "" });
const toProduct  = p => ({ id: p.id, name: p.name, description: p.description || "", price: +(p.price || 0), cost: +(p.cost || 0), stockCurrent: +(p.stock_current || 0), stockMinimum: +(p.stock_minimum || 0), unit: p.unit || "un", active: p.active !== false });
const toProductSale = s => ({ id: s.id, productId: s.product_id, employeeId: s.employee_id, quantity: +(s.quantity || 1), unitPrice: +(s.unit_price || 0), totalPrice: +(s.total_price || 0), payment: s.payment || "PIX", date: (s.sold_at || s.created_at || "").substring(0, 10) });

// ── THEME ─────────────────────────────────────────────────────
const T_DARK = {
  bg: "#0b0b0e", surface: "#13131a", card: "#1a1a24", border: "#2a2a3a",
  borderLight: "#222230", accent: "#4db8ff", accentGlow: "#4db8ff22",
  text: "#ece8e0", muted: "#706b63", mutedLight: "#9a9590",
  success: "#43d18a", successBg: "#43d18a18", danger: "#f07070", dangerBg: "#f0707018",
  info: "#60a5fa", infoBg: "#60a5fa18", sidebar: "#0e0e14",
};
const T_LIGHT = {
  bg: "#f0f0f5", surface: "#ffffff", card: "#ffffff", border: "#dde1ea",
  borderLight: "#e8eaf0", accent: "#4db8ff", accentGlow: "#4db8ff22",
  text: "#1a1a2e", muted: "#6b7280", mutedLight: "#9ca3af",
  success: "#16a34a", successBg: "#16a34a18", danger: "#dc2626", dangerBg: "#dc262618",
  info: "#2563eb", infoBg: "#2563eb18", sidebar: "#e8e8f0",
};

const _savedMode = typeof localStorage !== "undefined" ? (localStorage.getItem("oz_theme") || "dark") : "dark";
const T = { ...(_savedMode === "light" ? T_LIGHT : T_DARK) };

const normalizeHex = (value, fallback = "#4db8ff") => {
  if (!value || typeof value !== "string") return fallback;
  const hex = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : fallback;
};

const applyThemeMode = (mode) => {
  Object.assign(T, mode === "light" ? T_LIGHT : T_DARK);
  document.body.style.background = T.bg;
};

const applyTenantTheme = (shop, mode) => {
  const accent = normalizeHex(shop?.accent_color);
  applyThemeMode(mode || localStorage.getItem("oz_theme") || "dark");
  T.accent = accent;
  T.accentGlow = `${accent}22`;
  if (shop?.name) document.title = `${shop.name} | Oz.LavaRápido`;
};

const resetTenantTheme = () => {
  applyThemeMode(localStorage.getItem("oz_theme") || "dark");
  document.title = "Oz.LavaRápido";
};

// ── HELPERS ───────────────────────────────────────────────────
const R$      = v => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(+v || 0);
const fDate   = s => s ? new Date(s + "T12:00:00").toLocaleDateString("pt-BR") : "—";
const today   = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const nowTime = () => { const n = new Date(); return `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`; };
const month   = () => today().slice(0, 7);
const nextId  = arr => Math.max(0, ...arr.map(x => x.id)) + 1;

const PAYMENT_OPTS  = ["Dinheiro", "PIX", "Cartão Débito", "Cartão Crédito"];
const EXPENSE_CATS  = ["Aluguel", "Insumos", "Energia", "Internet", "Manutenção", "Marketing", "Outros"];
const ORDER_STATUS  = ["pendente", "em andamento", "concluído", "cancelado"];
const VEHICLE_TYPES = ["Carro", "Moto", "Caminhonete", "SUV", "Caminhão", "Ônibus", "Outro"];

// ── SHARED UI ─────────────────────────────────────────────────
const inputSt = {
  width: "100%", background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: 8, padding: "0.6rem 0.875rem", color: T.text, fontSize: 14,
  outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif",
  WebkitAppearance: "none", MozAppearance: "none", appearance: "none", colorScheme: "dark",
};

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0", backdropFilter: "blur(4px)" }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 540, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <h3 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: 21, letterSpacing: 1.5, color: T.text }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", display: "flex" }}><X size={18} /></button>
      </div>
      <div style={{ padding: "1.5rem", overflowY: "auto", WebkitOverflowScrolling: "touch", flex: 1, paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>{children}</div>
    </div>
  </div>
);

const FLabel  = ({ c }) => <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>{c}</div>;
const FG      = ({ label, children, half }) => <div style={{ marginBottom: "1rem", flex: half ? "1 1 140px" : undefined, minWidth: half ? 0 : undefined }}>{label && <FLabel c={label} />}{children}</div>;
const FInput  = ({ label, ...p }) => <FG label={label}><input style={inputSt} {...p} /></FG>;
const FSelect = ({ label, children, ...p }) => <FG label={label}><select style={{ ...inputSt }} {...p}>{children}</select></FG>;
const FArea   = ({ label, ...p }) => <FG label={label}><textarea style={{ ...inputSt, resize: "vertical", minHeight: 72, fontFamily: "'DM Sans', sans-serif", WebkitAppearance: "auto", appearance: "auto" }} {...p} /></FG>;
const Row     = ({ children, g = "1rem", style }) => <div style={{ display: "flex", gap: g, flexWrap: "wrap", ...style }}>{children}</div>;

const Btn = ({ children, variant = "primary", sm, style, ...p }) => {
  const v = {
    primary: { background: T.accent, color: "#0a0808", border: "none" },
    ghost:   { background: T.surface, color: T.text, border: `1px solid ${T.border}` },
    danger:  { background: T.dangerBg, color: T.danger, border: `1px solid ${T.danger}44` },
  };
  return <button style={{ ...v[variant], borderRadius: 8, padding: sm ? "0.4rem 0.875rem" : "0.6rem 1.25rem", fontSize: sm ? 12 : 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif", ...style }} {...p}>{children}</button>;
};

const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "1.25rem", cursor: onClick ? "pointer" : undefined, ...style }}>{children}</div>
);

const Badge = ({ children, color = T.accent }) => (
  <span style={{ background: color + "22", color, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>{children}</span>
);

const StatCard = ({ label, value, sub, color, icon: Icon }) => (
  <Card style={{ minWidth: 0 }}>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>{label}</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(20px, 5vw, 30px)", letterSpacing: 1, color: color || T.text, lineHeight: 1, wordBreak: "break-word" }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>{sub}</div>}
      </div>
      {Icon && <div style={{ background: (color || T.accent) + "18", borderRadius: 10, padding: 8, flexShrink: 0 }}><Icon size={17} color={color || T.accent} /></div>}
    </div>
  </Card>
);

const THead = ({ cols }) => (
  <thead><tr>{cols.map(c => <th key={c} style={{ textAlign: "left", padding: "0 0.75rem 10px", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>{c}</th>)}</tr></thead>
);

const PageHeader = ({ title, sub, right, onRefresh }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", gap: 12, flexWrap: "wrap" }}>
    <div style={{ minWidth: 0 }}>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(26px, 6vw, 38px)", letterSpacing: 2.5, margin: "0 0 4px", color: T.text }}>{title}</h1>
      {sub && <div style={{ color: T.muted, fontSize: 13 }}>{sub}</div>}
    </div>
    {(right || onRefresh) && (
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
        {onRefresh && <Btn variant="ghost" onClick={onRefresh}><RefreshCw size={14} />Atualizar</Btn>}
        {right}
      </div>
    )}
  </div>
);

const ErrorBar = ({ msg }) => msg ? (
  <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, padding: "0.625rem 1rem", color: T.danger, fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
    <AlertCircle size={15} />{msg}
  </div>
) : null;

function ThemeToggleSwitch({ isDark, onToggle }) {
  return (
    <button onClick={onToggle} title={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
      style={{ position: "relative", width: 68, height: 34, borderRadius: 999, background: isDark ? "#13131a" : "#dde1ea", border: `1.5px solid ${isDark ? "#2a2a3a" : "#c4c8d4"}`, cursor: "pointer", display: "flex", alignItems: "center", padding: 3, transition: "background 0.3s", flexShrink: 0 }}>
      <div style={{ position: "absolute", left: isDark ? "auto" : 9, right: isDark ? 9 : "auto", top: "50%", transform: "translateY(-50%)", opacity: 0.55, display: "flex" }}>
        {isDark ? <Moon size={12} color="#706b63" /> : <Sun size={12} color="#6b7280" />}
      </div>
      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.28)", transform: isDark ? "translateX(34px)" : "translateX(0)", transition: "transform 0.28s cubic-bezier(.4,0,.2,1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {isDark ? <Moon size={13} color="#334155" /> : <Sun size={13} color="#f59e0b" />}
      </div>
    </button>
  );
}

const statusColor = (s) => {
  if (s === "concluído")    return T.success;
  if (s === "em andamento") return T.accent;
  if (s === "cancelado")    return T.danger;
  return T.muted;
};

// ── SIDEBAR ───────────────────────────────────────────────────
function Sidebar({ active, onNav, profile, shop, onLogout, isMobile, open, onClose, themeMode, onToggleTheme }) {
  const isAdmin    = profile?.role === "admin";
  const isEmployee = profile?.role === "employee";

  const adminItems = [
    { id: "dashboard",      label: "Dashboard",         icon: LayoutDashboard },
    { id: "orders",         label: "Ordens de Serviço", icon: Droplets },
    { id: "clients",        label: "Clientes",          icon: Users },
    { id: "vehicles",       label: "Veículos",          icon: Car },
    { id: "employees",      label: "Funcionários",      icon: Shield },
    { id: "services",       label: "Serviços",          icon: Wrench },
    { id: "products",       label: "Produtos",          icon: Package },
    { id: "financial",      label: "Financeiro",        icon: DollarSign },
    { id: "reports",        label: "Relatórios",        icon: FileText },
    { id: "settings",       label: "Configurações",     icon: Settings },
    { id: "meuPlano",       label: "Meu Plano",         icon: CreditCard },
  ];

  const employeeItems = [
    { id: "dashboard", label: "Dashboard",         icon: LayoutDashboard },
    { id: "orders",    label: "Ordens de Serviço", icon: Droplets },
    { id: "clients",   label: "Clientes",          icon: Users },
  ];

  const items = isAdmin ? adminItems : employeeItems;

  const sidebarContent = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.sidebar, borderRight: `1px solid ${T.border}` }}>
      {/* Logo */}
      <div style={{ padding: "1.5rem 1.25rem 1rem", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: T.accent, lineHeight: 1 }}>Oz.LavaRápido</div>
        {shop?.name && <div style={{ fontSize: 12, color: T.muted, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shop.name}</div>}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "0.75rem 0.625rem" }}>
        {items.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button key={id} onClick={() => { onNav(id); if (isMobile) onClose(); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "0.6rem 0.75rem", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: isActive ? 600 : 400, background: isActive ? T.accent + "18" : "transparent", color: isActive ? T.accent : T.muted, marginBottom: 2, transition: "all 0.15s" }}>
              <Icon size={16} />{label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "0.875rem 1.25rem", borderTop: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <ThemeToggleSwitch isDark={themeMode === "dark"} onToggle={onToggleTheme} />
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile?.email || ""}</div>
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif", padding: 0 }}>
          <LogOut size={13} />Sair
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {open && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 199 }} onClick={onClose} />}
        <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 240, zIndex: 200, transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s cubic-bezier(.4,0,.2,1)" }}>
          {sidebarContent}
        </div>
      </>
    );
  }

  return <div style={{ width: 220, flexShrink: 0, height: "100vh", position: "sticky", top: 0 }}>{sidebarContent}</div>;
}

// ── DASHBOARD (Admin) ─────────────────────────────────────────
function Dashboard({ token, carwashId, isMobile }) {
  const [stats, setStats]   = useState({ todayOrders: 0, monthOrders: 0, monthRevenue: 0, avgTicket: 0, lowStock: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopFilter = `carwash_id=eq.${carwashId}`;
      const todayStr   = today();
      const monthStr   = month();

      const [ordersRaw, productsRaw] = await Promise.all([
        api.list("service_orders", `${shopFilter}&date=gte.${monthStr}-01&select=*`, token),
        api.list("products", `${shopFilter}&select=id,name,stock_current,stock_minimum`, token),
      ]);

      const orders      = Array.isArray(ordersRaw) ? ordersRaw : [];
      const products    = Array.isArray(productsRaw) ? productsRaw : [];
      const todayOrders = orders.filter(o => o.date === todayStr && o.status !== "cancelado");
      const doneOrders  = orders.filter(o => o.status === "concluído");
      const monthRev    = doneOrders.reduce((s, o) => s + (+(o.price || 0)), 0);
      const avgTicket   = doneOrders.length ? monthRev / doneOrders.length : 0;
      const lowStock    = products.filter(p => +(p.stock_current || 0) <= +(p.stock_minimum || 0)).length;

      setStats({ todayOrders: todayOrders.length, monthOrders: doneOrders.length, monthRevenue: monthRev, avgTicket, lowStock });
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token, carwashId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title="Dashboard" sub={`Hoje: ${fDate(today())}`} onRefresh={load} />
      {loading ? (
        <div style={{ color: T.muted, fontSize: 14 }}>Carregando...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          <StatCard label="Lavagens Hoje"    value={stats.todayOrders}           icon={Droplets}     color={T.accent} />
          <StatCard label="Lavagens Mês"     value={stats.monthOrders}           icon={Car}          color={T.info} />
          <StatCard label="Faturamento Mês"  value={R$(stats.monthRevenue)}      icon={DollarSign}   color={T.success} />
          <StatCard label="Ticket Médio"     value={R$(stats.avgTicket)}         icon={TrendingUp}   color={T.accent} />
        </div>
      )}
      {stats.lowStock > 0 && (
        <div style={{ background: T.warnBg, border: `1px solid ${T.warn}44`, borderRadius: 10, padding: "0.875rem 1rem", display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={15} color={T.warn} />
          <span style={{ color: T.warn, fontSize: 13, fontWeight: 600 }}>{stats.lowStock} produto(s) com estoque baixo ou zerado.</span>
        </div>
      )}
    </div>
  );
}

// ── DASHBOARD (Employee) ──────────────────────────────────────
function EmployeeDashboard({ token, carwashId, employeeId, isMobile }) {
  const [stats, setStats]     = useState({ todayCount: 0, monthCount: 0, monthRevenue: 0, commission: 0 });
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const monthStr = month();
      const [empRaw, ordersRaw] = await Promise.all([
        api.list("employees", `carwash_id=eq.${carwashId}&id=eq.${employeeId}&select=*`, token),
        api.list("service_orders", `carwash_id=eq.${carwashId}&employee_id=eq.${employeeId}&date=gte.${monthStr}-01&select=*`, token),
      ]);
      const emp     = Array.isArray(empRaw) ? empRaw[0] : null;
      const orders  = Array.isArray(ordersRaw) ? ordersRaw : [];
      const done    = orders.filter(o => o.status === "concluído");
      const todayO  = orders.filter(o => o.date === today() && o.status !== "cancelado");
      const rev     = done.reduce((s, o) => s + (+(o.services_price || o.price || 0)), 0);
      const comm    = rev * ((+(emp?.commission || 0)) / 100);
      setEmployee(emp);
      setStats({ todayCount: todayO.length, monthCount: done.length, monthRevenue: rev, commission: comm });
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token, carwashId, employeeId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title="Meu Dashboard" sub={employee?.name || ""} onRefresh={load} />
      {loading ? <div style={{ color: T.muted, fontSize: 14 }}>Carregando...</div> : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: "1rem" }}>
          <StatCard label="Lavagens Hoje"  value={stats.todayCount}         icon={Droplets}   color={T.accent} />
          <StatCard label="Lavagens Mês"   value={stats.monthCount}         icon={Car}        color={T.info} />
          <StatCard label="Faturado Mês"   value={R$(stats.monthRevenue)}   icon={DollarSign} color={T.success} />
          <StatCard label="Comissão Mês"   value={R$(stats.commission)}     icon={BadgePercent} color={T.accent} sub={`${employee?.commission || 0}% sobre serviços`} />
        </div>
      )}
    </div>
  );
}

// ── SERVICE ORDERS VIEW ───────────────────────────────────────
function ServiceOrdersView({ token, carwashId, employeeId, isAdmin, isMobile }) {
  const [orders,    setOrders]    = useState([]);
  const [clients,   setClients]   = useState([]);
  const [vehicles,  setVehicles]  = useState([]);
  const [employees, setEmployees] = useState([]);
  const [services,  setServices]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [err,       setErr]       = useState("");
  const [modal,     setModal]     = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [search,    setSearch]    = useState("");
  const [filterEmp, setFilterEmp] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateFrom,  setDateFrom]  = useState(month() + "-01");
  const [dateTo,    setDateTo]    = useState(today());

  const emptyForm = { clientId: "", vehicleId: "", employeeId: isAdmin ? "" : employeeId, serviceId: "", price: "", payment: "PIX", date: today(), time: nowTime(), notes: "", status: "pendente", extraServices: [] };
  const [form, setForm] = useState(emptyForm);

  const shopFilter = `carwash_id=eq.${carwashId}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const empFilter = isAdmin ? shopFilter : `${shopFilter}&employee_id=eq.${employeeId}`;
      const [ordRaw, cliRaw, vehRaw, empRaw, svcRaw] = await Promise.all([
        api.list("service_orders", `${empFilter}&date=gte.${dateFrom}&date=lte.${dateTo}&order=date.desc,time.desc&select=*`, token),
        api.list("clients",   `${shopFilter}&select=id,name`, token),
        api.list("vehicles",  `${shopFilter}&select=id,client_id,plate,brand,model,color`, token),
        api.list("employees", `${shopFilter}&select=id,name,commission`, token),
        api.list("services",  `${shopFilter}&active=eq.true&select=id,name,price`, token),
      ]);
      setOrders(   Array.isArray(ordRaw) ? ordRaw.map(toOrder) : []);
      setClients(  Array.isArray(cliRaw) ? cliRaw : []);
      setVehicles( Array.isArray(vehRaw) ? vehRaw : []);
      setEmployees(Array.isArray(empRaw) ? empRaw : []);
      setServices( Array.isArray(svcRaw) ? svcRaw : []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [token, carwashId, dateFrom, dateTo, isAdmin, employeeId]);

  useEffect(() => { load(); }, [load]);

  const clientVehicles = form.clientId ? vehicles.filter(v => String(v.client_id) === String(form.clientId)) : [];

  const openNew  = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = o  => { setEditing(o); setForm({ clientId: o.clientId, vehicleId: o.vehicleId || "", employeeId: o.employeeId, serviceId: o.serviceId, price: o.price, payment: o.payment, date: o.date, time: o.time, notes: o.notes, status: o.status, extraServices: o.extraServices }); setModal(true); };

  const save = async () => {
    setErr("");
    if (!form.clientId || !form.serviceId || !form.price || !form.date) { setErr("Preencha cliente, serviço, valor e data."); return; }
    try {
      const body = { ...fromOrder(form), carwash_id: carwashId };
      if (editing) await api.update("service_orders", editing.id, body, token);
      else          await api.insert("service_orders", body, token);
      setModal(false); load();
    } catch (e) { setErr(e.message); }
  };

  const remove = async (id) => {
    if (!confirm("Excluir esta ordem de serviço?")) return;
    await api.remove("service_orders", id, token); load();
  };

  const clientName  = id => clients.find(c => String(c.id) === String(id))?.name  || "—";
  const vehicleDesc = id => { const v = vehicles.find(v => String(v.id) === String(id)); return v ? `${v.plate} — ${v.brand} ${v.model}` : "—"; };
  const empName     = id => employees.find(e => String(e.id) === String(id))?.name || "—";
  const svcName     = id => services.find(s => String(s.id) === String(id))?.name  || "—";

  const filtered = orders.filter(o => {
    if (filterEmp !== "all" && String(o.employeeId) !== filterEmp) return false;
    if (filterStatus !== "all" && o.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      const cn = clientName(o.clientId).toLowerCase();
      const vn = vehicleDesc(o.vehicleId).toLowerCase();
      if (!cn.includes(q) && !vn.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <PageHeader title="Ordens de Serviço" sub={`${filtered.length} registros`} onRefresh={load}
        right={<Btn onClick={openNew}><Plus size={14} />Nova Ordem</Btn>} />
      <ErrorBar msg={err} />

      {/* Filters */}
      <Row style={{ marginBottom: "1rem" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <input style={inputSt} placeholder="Buscar cliente ou placa..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input type="date" style={{ ...inputSt, width: "auto" }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" style={{ ...inputSt, width: "auto" }} value={dateTo}   onChange={e => setDateTo(e.target.value)} />
        {isAdmin && (
          <select style={{ ...inputSt, width: "auto" }} value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
            <option value="all">Todos funcionários</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        )}
        <select style={{ ...inputSt, width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Todos status</option>
          {ORDER_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Row>

      {loading ? <div style={{ color: T.muted }}>Carregando...</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <THead cols={["Data/Hora", "Cliente", "Veículo", "Serviço", "Funcionário", "Valor", "Pagamento", "Status", ""]} />
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.text, whiteSpace: "nowrap" }}>{fDate(o.date)}{o.time && ` ${o.time}`}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.text }}>{clientName(o.clientId)}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{vehicleDesc(o.vehicleId)}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.text }}>{svcName(o.serviceId)}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{empName(o.employeeId)}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.success, fontWeight: 600 }}>{R$(o.price)}</td>
                  <td style={{ padding: "0.75rem", fontSize: 12, color: T.muted }}>{o.payment}</td>
                  <td style={{ padding: "0.75rem" }}><Badge color={statusColor(o.status)}>{o.status}</Badge></td>
                  <td style={{ padding: "0.75rem" }}>
                    <Row g="6px">
                      <Btn sm variant="ghost" onClick={() => openEdit(o)}><Edit2 size={12} /></Btn>
                      {isAdmin && <Btn sm variant="danger" onClick={() => remove(o.id)}><Trash2 size={12} /></Btn>}
                    </Row>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: T.muted, fontSize: 13 }}>Nenhuma ordem encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={editing ? "Editar Ordem" : "Nova Ordem de Serviço"} onClose={() => setModal(false)}>
          <ErrorBar msg={err} />
          <Row>
            <FSelect label="Cliente *" half value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value, vehicleId: "" }))}>
              <option value="">Selecione...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </FSelect>
            <FSelect label="Veículo" half value={form.vehicleId} onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}>
              <option value="">Selecione...</option>
              {clientVehicles.map(v => <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
            </FSelect>
          </Row>
          <Row>
            <FSelect label="Serviço *" half value={form.serviceId} onChange={e => {
              const svc = services.find(s => String(s.id) === e.target.value);
              setForm(f => ({ ...f, serviceId: e.target.value, price: svc ? svc.price : f.price }));
            }}>
              <option value="">Selecione...</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} — {R$(s.price)}</option>)}
            </FSelect>
            {isAdmin && (
              <FSelect label="Funcionário *" half value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}>
                <option value="">Selecione...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </FSelect>
            )}
          </Row>
          <Row>
            <FInput label="Valor (R$) *" half type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            <FSelect label="Pagamento" half value={form.payment} onChange={e => setForm(f => ({ ...f, payment: e.target.value }))}>
              {PAYMENT_OPTS.map(p => <option key={p} value={p}>{p}</option>)}
            </FSelect>
          </Row>
          <Row>
            <FInput label="Data *" half type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} readOnly={!isAdmin} />
            <FInput label="Hora" half type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} readOnly={!isAdmin} />
          </Row>
          <FSelect label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            {ORDER_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
          </FSelect>
          <FArea label="Observações" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <Row g="8px" style={{ justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={save}><Check size={14} />Salvar</Btn>
          </Row>
        </Modal>
      )}
    </div>
  );
}

// ── CLIENTS VIEW ──────────────────────────────────────────────
function ClientsView({ token, carwashId, isAdmin, isMobile }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState("");
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [search,  setSearch]  = useState("");
  const empty = { name: "", phone: "", whatsapp: "", birthdate: "", notes: "" };
  const [form, setForm] = useState(empty);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await api.list("clients", `carwash_id=eq.${carwashId}&order=name.asc&select=*`, token);
      setClients(Array.isArray(raw) ? raw.map(toClient) : []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [token, carwashId]);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = c  => { setEditing(c); setForm({ name: c.name, phone: c.phone, whatsapp: c.whatsapp, birthdate: c.birthdate, notes: c.notes }); setModal(true); };

  const save = async () => {
    setErr("");
    if (!form.name.trim()) { setErr("Nome obrigatório."); return; }
    try {
      const body = { name: form.name.trim(), phone: form.phone, whatsapp: form.whatsapp, birthdate: form.birthdate || null, notes: form.notes, carwash_id: carwashId };
      if (editing) await api.update("clients", editing.id, body, token);
      else          await api.insert("clients", body, token);
      setModal(false); load();
    } catch (e) { setErr(e.message); }
  };

  const remove = async (id) => {
    if (!confirm("Excluir cliente?")) return;
    await api.remove("clients", id, token); load();
  };

  const filtered = clients.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  return (
    <div>
      <PageHeader title="Clientes" sub={`${filtered.length} clientes`} onRefresh={load}
        right={isAdmin && <Btn onClick={openNew}><Plus size={14} />Novo Cliente</Btn>} />
      <ErrorBar msg={err} />
      <div style={{ marginBottom: "1rem" }}>
        <input style={inputSt} placeholder="Buscar por nome ou telefone..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <div style={{ color: T.muted }}>Carregando...</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <THead cols={["Nome", "Telefone", "WhatsApp", "Pontos", ""]} />
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.text, fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{c.phone || "—"}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{c.whatsapp || "—"}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.accent }}>{c.points}</td>
                  <td style={{ padding: "0.75rem" }}>
                    {isAdmin && (
                      <Row g="6px">
                        <Btn sm variant="ghost" onClick={() => openEdit(c)}><Edit2 size={12} /></Btn>
                        <Btn sm variant="danger" onClick={() => remove(c.id)}><Trash2 size={12} /></Btn>
                      </Row>
                    )}
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: T.muted }}>Nenhum cliente encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <Modal title={editing ? "Editar Cliente" : "Novo Cliente"} onClose={() => setModal(false)}>
          <ErrorBar msg={err} />
          <FInput label="Nome *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Row>
            <FInput label="Telefone" half value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <FInput label="WhatsApp" half value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
          </Row>
          <FInput label="Data de Nascimento" type="date" value={form.birthdate} onChange={e => setForm(f => ({ ...f, birthdate: e.target.value }))} />
          <FArea label="Observações" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <Row g="8px" style={{ justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={save}><Check size={14} />Salvar</Btn>
          </Row>
        </Modal>
      )}
    </div>
  );
}

// ── VEHICLES VIEW ─────────────────────────────────────────────
function VehiclesView({ token, carwashId, isMobile }) {
  const [vehicles, setVehicles] = useState([]);
  const [clients,  setClients]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [err,      setErr]      = useState("");
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [search,   setSearch]   = useState("");
  const empty = { clientId: "", plate: "", brand: "", model: "", color: "", year: "", notes: "" };
  const [form, setForm] = useState(empty);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopFilter = `carwash_id=eq.${carwashId}`;
      const [vRaw, cRaw] = await Promise.all([
        api.list("vehicles", `${shopFilter}&order=plate.asc&select=*`, token),
        api.list("clients",  `${shopFilter}&select=id,name`, token),
      ]);
      setVehicles(Array.isArray(vRaw) ? vRaw.map(toVehicle) : []);
      setClients( Array.isArray(cRaw) ? cRaw : []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [token, carwashId]);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = v  => { setEditing(v); setForm({ clientId: v.clientId, plate: v.plate, brand: v.brand, model: v.model, color: v.color, year: v.year, notes: v.notes }); setModal(true); };

  const save = async () => {
    setErr("");
    if (!form.plate.trim() || !form.clientId) { setErr("Placa e cliente são obrigatórios."); return; }
    try {
      const body = { client_id: +form.clientId, plate: form.plate.trim().toUpperCase(), brand: form.brand, model: form.model, color: form.color, year: form.year || null, notes: form.notes, carwash_id: carwashId };
      if (editing) await api.update("vehicles", editing.id, body, token);
      else          await api.insert("vehicles", body, token);
      setModal(false); load();
    } catch (e) { setErr(e.message); }
  };

  const remove = async (id) => {
    if (!confirm("Excluir veículo?")) return;
    await api.remove("vehicles", id, token); load();
  };

  const clientName = id => clients.find(c => String(c.id) === String(id))?.name || "—";
  const filtered = vehicles.filter(v => !search || v.plate.includes(search.toUpperCase()) || v.brand.toLowerCase().includes(search.toLowerCase()) || v.model.toLowerCase().includes(search.toLowerCase()) || clientName(v.clientId).toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Veículos" sub={`${filtered.length} veículos cadastrados`} onRefresh={load}
        right={<Btn onClick={openNew}><Plus size={14} />Novo Veículo</Btn>} />
      <ErrorBar msg={err} />
      <div style={{ marginBottom: "1rem" }}>
        <input style={inputSt} placeholder="Buscar por placa, marca, modelo ou cliente..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <div style={{ color: T.muted }}>Carregando...</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <THead cols={["Placa", "Veículo", "Cor", "Ano", "Cliente", ""]} />
            <tbody>
              {filtered.map(v => (
                <tr key={v.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.accent, fontWeight: 700, fontFamily: "monospace" }}>{v.plate}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.text }}>{v.brand} {v.model}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{v.color || "—"}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{v.year || "—"}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{clientName(v.clientId)}</td>
                  <td style={{ padding: "0.75rem" }}>
                    <Row g="6px">
                      <Btn sm variant="ghost" onClick={() => openEdit(v)}><Edit2 size={12} /></Btn>
                      <Btn sm variant="danger" onClick={() => remove(v.id)}><Trash2 size={12} /></Btn>
                    </Row>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: T.muted }}>Nenhum veículo encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <Modal title={editing ? "Editar Veículo" : "Novo Veículo"} onClose={() => setModal(false)}>
          <ErrorBar msg={err} />
          <FSelect label="Cliente *" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
            <option value="">Selecione o cliente...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FSelect>
          <Row>
            <FInput label="Placa *" half placeholder="ABC1D23" value={form.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value }))} />
            <FInput label="Cor" half value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
          </Row>
          <Row>
            <FInput label="Marca" half value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
            <FInput label="Modelo" half value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
          </Row>
          <FInput label="Ano" type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
          <FArea label="Observações" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <Row g="8px" style={{ justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={save}><Check size={14} />Salvar</Btn>
          </Row>
        </Modal>
      )}
    </div>
  );
}

// ── EMPLOYEES VIEW ────────────────────────────────────────────
function EmployeesView({ token, carwashId, isMobile }) {
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [err,       setErr]       = useState("");
  const [modal,     setModal]     = useState(false);
  const [editing,   setEditing]   = useState(null);
  const empty = { name: "", phone: "", commission: "35", status: "active" };
  const [form, setForm] = useState(empty);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await api.list("employees", `carwash_id=eq.${carwashId}&order=name.asc&select=*`, token);
      setEmployees(Array.isArray(raw) ? raw.map(toEmployee) : []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [token, carwashId]);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = e  => { setEditing(e); setForm({ name: e.name, phone: e.phone, commission: e.commission, status: e.status }); setModal(true); };

  const save = async () => {
    setErr("");
    if (!form.name.trim()) { setErr("Nome obrigatório."); return; }
    try {
      const body = { name: form.name.trim(), phone: form.phone, commission: +form.commission, status: form.status, carwash_id: carwashId };
      if (editing) await api.update("employees", editing.id, body, token);
      else          await api.insert("employees", body, token);
      setModal(false); load();
    } catch (e) { setErr(e.message); }
  };

  const remove = async (id) => {
    if (!confirm("Excluir funcionário?")) return;
    await api.remove("employees", id, token); load();
  };

  return (
    <div>
      <PageHeader title="Funcionários" sub={`${employees.length} cadastrados`} onRefresh={load}
        right={<Btn onClick={openNew}><Plus size={14} />Novo Funcionário</Btn>} />
      <ErrorBar msg={err} />
      {loading ? <div style={{ color: T.muted }}>Carregando...</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <THead cols={["Nome", "Telefone", "Comissão", "Status", ""]} />
            <tbody>
              {employees.map(e => (
                <tr key={e.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.text, fontWeight: 500 }}>{e.name}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{e.phone || "—"}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.accent, fontWeight: 600 }}>{e.commission}%</td>
                  <td style={{ padding: "0.75rem" }}><Badge color={e.status === "active" ? T.success : T.muted}>{e.status === "active" ? "Ativo" : "Inativo"}</Badge></td>
                  <td style={{ padding: "0.75rem" }}>
                    <Row g="6px">
                      <Btn sm variant="ghost" onClick={() => openEdit(e)}><Edit2 size={12} /></Btn>
                      <Btn sm variant="danger" onClick={() => remove(e.id)}><Trash2 size={12} /></Btn>
                    </Row>
                  </td>
                </tr>
              ))}
              {!employees.length && <tr><td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: T.muted }}>Nenhum funcionário cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <Modal title={editing ? "Editar Funcionário" : "Novo Funcionário"} onClose={() => setModal(false)}>
          <ErrorBar msg={err} />
          <FInput label="Nome *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <FInput label="Telefone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Row>
            <FInput label="Comissão (%)" half type="number" min="0" max="100" value={form.commission} onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} />
            <FSelect label="Status" half value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </FSelect>
          </Row>
          <Row g="8px" style={{ justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={save}><Check size={14} />Salvar</Btn>
          </Row>
        </Modal>
      )}
    </div>
  );
}

// ── SERVICES VIEW ─────────────────────────────────────────────
function ServicesView({ token, carwashId }) {
  const [services, setServices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [err,      setErr]      = useState("");
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const empty = { name: "", price: "", duration: "30", active: true };
  const [form, setForm] = useState(empty);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await api.list("services", `carwash_id=eq.${carwashId}&order=name.asc&select=*`, token);
      setServices(Array.isArray(raw) ? raw.map(toService) : []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [token, carwashId]);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = s  => { setEditing(s); setForm({ name: s.name, price: s.price, duration: s.duration, active: s.active }); setModal(true); };

  const save = async () => {
    setErr("");
    if (!form.name.trim() || !form.price) { setErr("Nome e preço são obrigatórios."); return; }
    try {
      const body = { name: form.name.trim(), price: +form.price, duration: +form.duration, active: form.active, carwash_id: carwashId };
      if (editing) await api.update("services", editing.id, body, token);
      else          await api.insert("services", body, token);
      setModal(false); load();
    } catch (e) { setErr(e.message); }
  };

  const remove = async (id) => {
    if (!confirm("Excluir serviço?")) return;
    await api.remove("services", id, token); load();
  };

  return (
    <div>
      <PageHeader title="Serviços" sub="Serviços automotivos oferecidos" onRefresh={load}
        right={<Btn onClick={openNew}><Plus size={14} />Novo Serviço</Btn>} />
      <ErrorBar msg={err} />
      {loading ? <div style={{ color: T.muted }}>Carregando...</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <THead cols={["Nome", "Preço", "Duração", "Status", ""]} />
            <tbody>
              {services.map(s => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.text, fontWeight: 500 }}>{s.name}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.success, fontWeight: 600 }}>{R$(s.price)}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{s.duration} min</td>
                  <td style={{ padding: "0.75rem" }}><Badge color={s.active ? T.success : T.muted}>{s.active ? "Ativo" : "Inativo"}</Badge></td>
                  <td style={{ padding: "0.75rem" }}>
                    <Row g="6px">
                      <Btn sm variant="ghost" onClick={() => openEdit(s)}><Edit2 size={12} /></Btn>
                      <Btn sm variant="danger" onClick={() => remove(s.id)}><Trash2 size={12} /></Btn>
                    </Row>
                  </td>
                </tr>
              ))}
              {!services.length && <tr><td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: T.muted }}>Nenhum serviço cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <Modal title={editing ? "Editar Serviço" : "Novo Serviço"} onClose={() => setModal(false)}>
          <ErrorBar msg={err} />
          <FInput label="Nome *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Row>
            <FInput label="Preço (R$) *" half type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            <FInput label="Duração (min)" half type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
          </Row>
          <FSelect label="Status" value={form.active ? "true" : "false"} onChange={e => setForm(f => ({ ...f, active: e.target.value === "true" }))}>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </FSelect>
          <Row g="8px" style={{ justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={save}><Check size={14} />Salvar</Btn>
          </Row>
        </Modal>
      )}
    </div>
  );
}

// ── PRODUCTS VIEW ─────────────────────────────────────────────
function ProductsView({ token, carwashId }) {
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [err,      setErr]      = useState("");
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const empty = { name: "", description: "", price: "", cost: "", stockCurrent: "0", stockMinimum: "0", unit: "un", active: true };
  const [form, setForm] = useState(empty);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await api.list("products", `carwash_id=eq.${carwashId}&order=name.asc&select=*`, token);
      setProducts(Array.isArray(raw) ? raw.map(toProduct) : []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [token, carwashId]);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = p  => { setEditing(p); setForm({ name: p.name, description: p.description, price: p.price, cost: p.cost, stockCurrent: p.stockCurrent, stockMinimum: p.stockMinimum, unit: p.unit, active: p.active }); setModal(true); };

  const save = async () => {
    setErr("");
    if (!form.name.trim()) { setErr("Nome obrigatório."); return; }
    try {
      const body = { name: form.name.trim(), description: form.description, price: +form.price, cost: +form.cost, stock_current: +form.stockCurrent, stock_minimum: +form.stockMinimum, unit: form.unit, active: form.active, carwash_id: carwashId };
      if (editing) await api.update("products", editing.id, body, token);
      else          await api.insert("products", body, token);
      setModal(false); load();
    } catch (e) { setErr(e.message); }
  };

  const remove = async (id) => {
    if (!confirm("Excluir produto?")) return;
    await api.remove("products", id, token); load();
  };

  return (
    <div>
      <PageHeader title="Produtos" sub="Estoque e produtos" onRefresh={load}
        right={<Btn onClick={openNew}><Plus size={14} />Novo Produto</Btn>} />
      <ErrorBar msg={err} />
      {loading ? <div style={{ color: T.muted }}>Carregando...</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <THead cols={["Nome", "Preço", "Custo", "Estoque", "Mínimo", "Unidade", ""]} />
            <tbody>
              {products.map(p => {
                const lowStock = p.stockCurrent <= p.stockMinimum;
                return (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "0.75rem", fontSize: 13, color: T.text, fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: "0.75rem", fontSize: 13, color: T.success }}>{R$(p.price)}</td>
                    <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{R$(p.cost)}</td>
                    <td style={{ padding: "0.75rem", fontSize: 13, color: lowStock ? T.danger : T.text, fontWeight: lowStock ? 700 : 400 }}>{p.stockCurrent}</td>
                    <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{p.stockMinimum}</td>
                    <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{p.unit}</td>
                    <td style={{ padding: "0.75rem" }}>
                      <Row g="6px">
                        <Btn sm variant="ghost" onClick={() => openEdit(p)}><Edit2 size={12} /></Btn>
                        <Btn sm variant="danger" onClick={() => remove(p.id)}><Trash2 size={12} /></Btn>
                      </Row>
                    </td>
                  </tr>
                );
              })}
              {!products.length && <tr><td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: T.muted }}>Nenhum produto cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <Modal title={editing ? "Editar Produto" : "Novo Produto"} onClose={() => setModal(false)}>
          <ErrorBar msg={err} />
          <FInput label="Nome *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <FArea label="Descrição" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Row>
            <FInput label="Preço (R$)" half type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            <FInput label="Custo (R$)" half type="number" step="0.01" value={form.cost}  onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
          </Row>
          <Row>
            <FInput label="Estoque Atual" half type="number" value={form.stockCurrent}  onChange={e => setForm(f => ({ ...f, stockCurrent: e.target.value }))} />
            <FInput label="Estoque Mínimo" half type="number" value={form.stockMinimum} onChange={e => setForm(f => ({ ...f, stockMinimum: e.target.value }))} />
          </Row>
          <FInput label="Unidade" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
          <Row g="8px" style={{ justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={save}><Check size={14} />Salvar</Btn>
          </Row>
        </Modal>
      )}
    </div>
  );
}

// ── FINANCIAL VIEW ────────────────────────────────────────────
function FinancialView({ token, carwashId, isMobile }) {
  const [orders,   setOrders]   = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [err,      setErr]      = useState("");
  const [tab,      setTab]      = useState("summary");
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [dateFrom, setDateFrom] = useState(month() + "-01");
  const [dateTo,   setDateTo]   = useState(today());
  const emptyExp = { desc: "", amount: "", date: today(), category: "Insumos" };
  const [formExp, setFormExp]   = useState(emptyExp);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopFilter = `carwash_id=eq.${carwashId}`;
      const [ordRaw, expRaw] = await Promise.all([
        api.list("service_orders", `${shopFilter}&date=gte.${dateFrom}&date=lte.${dateTo}&status=eq.concluído&select=*`, token),
        api.list("expenses",       `${shopFilter}&date=gte.${dateFrom}&date=lte.${dateTo}&order=date.desc&select=*`, token),
      ]);
      setOrders(  Array.isArray(ordRaw) ? ordRaw.map(toOrder)   : []);
      setExpenses(Array.isArray(expRaw) ? expRaw.map(toExpense)  : []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [token, carwashId, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const revenue  = orders.reduce((s, o) => s + o.price, 0);
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const profit   = revenue - totalExp;

  const saveExp = async () => {
    setErr("");
    if (!formExp.desc.trim() || !formExp.amount) { setErr("Descrição e valor são obrigatórios."); return; }
    try {
      const body = { description: formExp.desc.trim(), amount: +formExp.amount, date: formExp.date, category: formExp.category, carwash_id: carwashId };
      if (editing) await api.update("expenses", editing.id, body, token);
      else          await api.insert("expenses", body, token);
      setModal(false); load();
    } catch (e) { setErr(e.message); }
  };

  const removeExp = async (id) => {
    if (!confirm("Excluir despesa?")) return;
    await api.remove("expenses", id, token); load();
  };

  const tabs = [{ id: "summary", label: "Resumo" }, { id: "revenues", label: "Receitas" }, { id: "expenses", label: "Despesas" }];

  return (
    <div>
      <PageHeader title="Financeiro" onRefresh={load}
        right={<Btn onClick={() => { setEditing(null); setFormExp(emptyExp); setModal(true); }}><Plus size={14} />Nova Despesa</Btn>} />
      <ErrorBar msg={err} />

      <Row style={{ marginBottom: "1.25rem" }}>
        <input type="date" style={{ ...inputSt, width: "auto" }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" style={{ ...inputSt, width: "auto" }} value={dateTo}   onChange={e => setDateTo(e.target.value)} />
      </Row>

      {loading ? <div style={{ color: T.muted }}>Carregando...</div> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
            <StatCard label="Receita"   value={R$(revenue)}  icon={TrendingUp}  color={T.success} />
            <StatCard label="Despesas"  value={R$(totalExp)} icon={Banknote}    color={T.danger} />
            <StatCard label="Lucro"     value={R$(profit)}   icon={DollarSign}  color={profit >= 0 ? T.success : T.danger} />
          </div>

          <Row g="8px" style={{ marginBottom: "1rem" }}>
            {tabs.map(t => (
              <Btn key={t.id} variant={tab === t.id ? "primary" : "ghost"} sm onClick={() => setTab(t.id)}>{t.label}</Btn>
            ))}
          </Row>

          {tab === "revenues" && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <THead cols={["Data", "Cliente", "Serviço", "Valor", "Pagamento"]} />
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{fDate(o.date)}</td>
                      <td style={{ padding: "0.75rem", fontSize: 13, color: T.text }}>{o.clientId}</td>
                      <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{o.serviceId}</td>
                      <td style={{ padding: "0.75rem", fontSize: 13, color: T.success, fontWeight: 600 }}>{R$(o.price)}</td>
                      <td style={{ padding: "0.75rem", fontSize: 12, color: T.muted }}>{o.payment}</td>
                    </tr>
                  ))}
                  {!orders.length && <tr><td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: T.muted }}>Nenhuma receita no período.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === "expenses" && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <THead cols={["Data", "Descrição", "Categoria", "Valor", ""]} />
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{fDate(e.date)}</td>
                      <td style={{ padding: "0.75rem", fontSize: 13, color: T.text }}>{e.desc}</td>
                      <td style={{ padding: "0.75rem" }}><Badge color={T.muted}>{e.category}</Badge></td>
                      <td style={{ padding: "0.75rem", fontSize: 13, color: T.danger, fontWeight: 600 }}>{R$(e.amount)}</td>
                      <td style={{ padding: "0.75rem" }}>
                        <Row g="6px">
                          <Btn sm variant="ghost" onClick={() => { setEditing(e); setFormExp({ desc: e.desc, amount: e.amount, date: e.date, category: e.category }); setModal(true); }}><Edit2 size={12} /></Btn>
                          <Btn sm variant="danger" onClick={() => removeExp(e.id)}><Trash2 size={12} /></Btn>
                        </Row>
                      </td>
                    </tr>
                  ))}
                  {!expenses.length && <tr><td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: T.muted }}>Nenhuma despesa no período.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {modal && (
        <Modal title={editing ? "Editar Despesa" : "Nova Despesa"} onClose={() => setModal(false)}>
          <ErrorBar msg={err} />
          <FInput label="Descrição *" value={formExp.desc} onChange={e => setFormExp(f => ({ ...f, desc: e.target.value }))} />
          <Row>
            <FInput label="Valor (R$) *" half type="number" step="0.01" value={formExp.amount}   onChange={e => setFormExp(f => ({ ...f, amount: e.target.value }))} />
            <FInput label="Data *"       half type="date"               value={formExp.date}     onChange={e => setFormExp(f => ({ ...f, date: e.target.value }))} />
          </Row>
          <FSelect label="Categoria" value={formExp.category} onChange={e => setFormExp(f => ({ ...f, category: e.target.value }))}>
            {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </FSelect>
          <Row g="8px" style={{ justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={saveExp}><Check size={14} />Salvar</Btn>
          </Row>
        </Modal>
      )}
    </div>
  );
}

// ── REPORTS VIEW ──────────────────────────────────────────────
function ReportsView({ token, carwashId, isMobile }) {
  const [data,     setData]     = useState({ orders: [], employees: [], services: [] });
  const [loading,  setLoading]  = useState(true);
  const [dateFrom, setDateFrom] = useState(month() + "-01");
  const [dateTo,   setDateTo]   = useState(today());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopFilter = `carwash_id=eq.${carwashId}`;
      const [ordRaw, empRaw, svcRaw] = await Promise.all([
        api.list("service_orders", `${shopFilter}&date=gte.${dateFrom}&date=lte.${dateTo}&status=eq.concluído&select=*`, token),
        api.list("employees",      `${shopFilter}&select=id,name,commission`, token),
        api.list("services",       `${shopFilter}&select=id,name,price`, token),
      ]);
      setData({
        orders:    Array.isArray(ordRaw) ? ordRaw.map(toOrder)   : [],
        employees: Array.isArray(empRaw) ? empRaw : [],
        services:  Array.isArray(svcRaw) ? svcRaw : [],
      });
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token, carwashId, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const totalRevenue = data.orders.reduce((s, o) => s + o.price, 0);

  const empStats = data.employees.map(e => {
    const empOrders = data.orders.filter(o => String(o.employeeId) === String(e.id));
    const rev       = empOrders.reduce((s, o) => s + (o.servicesPrice || o.price), 0);
    return { ...e, count: empOrders.length, revenue: rev, commission: rev * (+(e.commission || 0) / 100) };
  }).sort((a, b) => b.count - a.count);

  const svcStats = data.services.map(s => {
    const svcOrders = data.orders.filter(o => String(o.serviceId) === String(s.id));
    return { ...s, count: svcOrders.length, revenue: svcOrders.reduce((sum, o) => sum + o.price, 0) };
  }).sort((a, b) => b.count - a.count);

  return (
    <div>
      <PageHeader title="Relatórios" onRefresh={load} />
      <Row style={{ marginBottom: "1.5rem" }}>
        <input type="date" style={{ ...inputSt, width: "auto" }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" style={{ ...inputSt, width: "auto" }} value={dateTo}   onChange={e => setDateTo(e.target.value)} />
      </Row>

      {loading ? <div style={{ color: T.muted }}>Carregando...</div> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
            <StatCard label="Total Lavagens" value={data.orders.length}    icon={Droplets}   color={T.accent} />
            <StatCard label="Faturamento"    value={R$(totalRevenue)}      icon={DollarSign} color={T.success} />
            <StatCard label="Ticket Médio"   value={R$(data.orders.length ? totalRevenue / data.orders.length : 0)} icon={TrendingUp} color={T.info} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1.25rem" }}>
            <Card>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1.5, color: T.text, marginBottom: "1rem" }}>Produtividade por Funcionário</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <THead cols={["Funcionário", "Lavagens", "Faturado", "Comissão"]} />
                <tbody>
                  {empStats.map(e => (
                    <tr key={e.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "0.5rem 0.75rem", fontSize: 13, color: T.text }}>{e.name}</td>
                      <td style={{ padding: "0.5rem 0.75rem", fontSize: 13, color: T.accent, fontWeight: 600 }}>{e.count}</td>
                      <td style={{ padding: "0.5rem 0.75rem", fontSize: 13, color: T.success }}>{R$(e.revenue)}</td>
                      <td style={{ padding: "0.5rem 0.75rem", fontSize: 13, color: T.info }}>{R$(e.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1.5, color: T.text, marginBottom: "1rem" }}>Serviços Mais Realizados</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <THead cols={["Serviço", "Qtd", "Receita"]} />
                <tbody>
                  {svcStats.map(s => (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "0.5rem 0.75rem", fontSize: 13, color: T.text }}>{s.name}</td>
                      <td style={{ padding: "0.5rem 0.75rem", fontSize: 13, color: T.accent, fontWeight: 600 }}>{s.count}</td>
                      <td style={{ padding: "0.5rem 0.75rem", fontSize: 13, color: T.success }}>{R$(s.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ── SETTINGS VIEW ─────────────────────────────────────────────
function SettingsView({ token, carwashId, shop, onShopUpdate, themeMode, onToggleTheme }) {
  const [form, setForm] = useState({ name: shop?.name || "", logo_url: shop?.logo_url || "", accent_color: shop?.accent_color || "#4db8ff" });
  const [err,  setErr]  = useState("");
  const [ok,   setOk]   = useState(false);

  const save = async () => {
    setErr(""); setOk(false);
    if (!form.name.trim()) { setErr("Nome obrigatório."); return; }
    try {
      const rows = await api.update("carwashes", carwashId, { name: form.name.trim(), logo_url: form.logo_url, accent_color: form.accent_color }, token);
      const updated = Array.isArray(rows) ? rows[0] : rows;
      onShopUpdate(updated);
      setOk(true);
    } catch (e) { setErr(e.message); }
  };

  return (
    <div>
      <PageHeader title="Configurações" />
      <Card style={{ maxWidth: 480 }}>
        <ErrorBar msg={err} />
        {ok && <div style={{ background: T.successBg, border: `1px solid ${T.success}44`, borderRadius: 8, padding: "0.625rem 1rem", color: T.success, fontSize: 13, marginBottom: "1rem" }}>Configurações salvas.</div>}
        <FInput label="Nome do Lava Rápido" value={form.name}        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <FInput label="URL do Logo"         value={form.logo_url}    onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} />
        <FG label="Cor de Destaque">
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} style={{ width: 44, height: 36, borderRadius: 6, border: `1px solid ${T.border}`, cursor: "pointer", background: "none" }} />
            <input style={{ ...inputSt, flex: 1 }} value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} placeholder="#4db8ff" />
          </div>
        </FG>
        <FG label="Modo de Exibição">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggleSwitch isDark={themeMode === "dark"} onToggle={onToggleTheme} />
            <span style={{ fontSize: 13, color: T.muted }}>{themeMode === "dark" ? "Modo Escuro" : "Modo Claro"}</span>
          </div>
        </FG>
        <Btn onClick={save} style={{ marginTop: "0.5rem" }}><Check size={14} />Salvar Configurações</Btn>
      </Card>
    </div>
  );
}

// ── MEU PLANO VIEW ────────────────────────────────────────────
function MeuPlanoView({ token, carwashId, accessInfo }) {
  const planLabel = { monthly: "Mensal", semiannual: "Semestral", annual: "Anual", courtesy: "Cortesia" };
  const reason    = accessInfo?.reason || "";
  const plan      = accessInfo?.plan   || "";
  const expiresAt = accessInfo?.expires_at;
  const isActive  = accessInfo?.has_access;

  return (
    <div>
      <PageHeader title="Meu Plano" />
      <Card style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Status da Assinatura</div>
          <Badge color={isActive ? T.success : T.danger}>{isActive ? "Ativo" : "Inativo"}</Badge>
        </div>
        {plan && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Plano Atual</div>
            <div style={{ fontSize: 16, color: T.text, fontWeight: 600 }}>{planLabel[plan] || plan}</div>
          </div>
        )}
        {expiresAt && (
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Vencimento</div>
            <div style={{ fontSize: 15, color: T.text }}>{fDate(expiresAt.substring(0, 10))}</div>
          </div>
        )}
        {!isActive && (
          <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, padding: "0.875rem 1rem", marginBottom: "1rem" }}>
            <div style={{ color: T.danger, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Assinatura inativa</div>
            <div style={{ color: T.muted, fontSize: 12 }}>Acesse a tela de planos para renovar.</div>
          </div>
        )}
        <div style={{ fontSize: 12, color: T.muted }}>Para renovar ou fazer upgrade, entre em contato com o suporte da OzTech SmartControl.</div>
      </Card>
    </div>
  );
}

// ── LOGIN SCREEN ──────────────────────────────────────────────
function LoginScreen({ onLogin, onShowPlans, themeMode, onToggleTheme }) {
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [err,       setErr]       = useState("");
  const [loading,   setLoading]   = useState(false);
  const [forgot,    setForgot]    = useState(false);
  const [sentReset, setSentReset] = useState(false);
  const [imgErr,    setImgErr]    = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    const data = await api.login(email, password);
    if (data.access_token) {
      onLogin(data.access_token, data.refresh_token);
    } else {
      setErr(data.error_description || data.message || "Credenciais inválidas.");
    }
    setLoading(false);
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON, "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setSentReset(true);
      else setErr("Não foi possível enviar o e-mail.");
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const isDark = themeMode !== "light";

  const inpSt = {
    width: "100%", background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 10, padding: "0.75rem 1rem 0.75rem 2.5rem", color: T.text,
    fontSize: 14, outline: "none", boxSizing: "border-box",
    fontFamily: "'DM Sans', sans-serif", WebkitAppearance: "none", appearance: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem 1rem" }}>

      {/* ── Logo ── */}
      <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
        {/* filter no wrapper externo → drop-shadow segue o clipPath circular */}
        <div style={{
          width: 160, height: 160,
          margin: "0 auto 1.25rem",
          filter: `drop-shadow(0 0 32px ${T.accent}60) drop-shadow(0 0 70px ${T.accent}25)`,
        }}>
          {!imgErr ? (
            <img
              src="/icons/logo.png"
              alt="Oz.Wash"
              style={{
                width: "100%", height: "100%",
                objectFit: "cover",
                display: "block",
                /* maskImage cria fade radial: opaco até 42%, some em 50%
                   → dissolve o anel branco/prateado sem corte brusco */
                maskImage: "radial-gradient(circle, black 42%, transparent 50%)",
                WebkitMaskImage: "radial-gradient(circle, black 42%, transparent 50%)",
              }}
              onError={() => setImgErr(true)}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: `radial-gradient(circle at 40% 40%, ${T.accent}18, transparent 70%)`, border: `2px solid ${T.accent}44`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <Car size={48} color={T.accent} />
              <Droplets size={20} color={T.accent} style={{ opacity: 0.7 }} />
            </div>
          )}
        </div>
        {/* Nome: Oz.Wash com capitalização correta */}
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 32, letterSpacing: 2, lineHeight: 1, color: T.accent }}>
          Oz.Wash
        </div>
      </div>

      {/* ── Card ── */}
      <div style={{ width: "100%", maxWidth: 400, background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: "2rem", boxShadow: `0 8px 40px rgba(0,0,0,0.4)` }}>
        {!forgot ? (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: T.text, fontFamily: "'DM Sans', sans-serif", lineHeight: 1 }}>Entrar</div>
              <div style={{ color: T.muted, fontSize: 13, marginTop: 6 }}>Acesse sua conta para continuar.</div>
            </div>

            <ErrorBar msg={err} />

            {/* E-mail */}
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600 }}>E-MAIL</div>
              <div style={{ position: "relative" }}>
                <Mail size={15} color={T.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input style={inpSt} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="seu@email.com" />
              </div>
            </div>

            {/* Senha */}
            <div style={{ marginBottom: "0.375rem" }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600 }}>SENHA</div>
              <div style={{ position: "relative" }}>
                <Lock size={15} color={T.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input style={{ ...inpSt, paddingRight: "5rem" }} type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.accent, cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                  {showPass ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            {/* Esqueci senha */}
            <div style={{ textAlign: "right", marginBottom: "1.25rem" }}>
              <button type="button" onClick={() => setForgot(true)}
                style={{ background: "none", border: "none", color: T.accent, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                Esqueceu sua senha?
              </button>
            </div>

            {/* Botão entrar */}
            <button type="submit" disabled={loading}
              style={{ width: "100%", background: `linear-gradient(135deg, ${T.accent}, ${T.accent}cc)`, color: "#000", border: "none", borderRadius: 10, padding: "0.8rem", fontSize: 15, fontWeight: 700, cursor: loading ? "wait" : "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: `0 4px 20px ${T.accent}33` }}>
              {loading ? "Entrando..." : "Entrar"}
            </button>

            {/* Divider + Assinar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "1.25rem 0" }}>
              <div style={{ flex: 1, height: 1, background: T.border }} />
              <span style={{ color: T.muted, fontSize: 12 }}>ou</span>
              <div style={{ flex: 1, height: 1, background: T.border }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ color: T.muted, fontSize: 13 }}>Não tem uma conta? </span>
              <button type="button" onClick={onShowPlans}
                style={{ background: "none", border: "none", color: T.accent, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, padding: 0 }}>
                Assinar Plano
              </button>
            </div>
          </form>

        ) : sentReset ? (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: T.successBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
              <Check size={24} color={T.success} />
            </div>
            <div style={{ color: T.success, fontWeight: 600, fontSize: 15, marginBottom: 6 }}>E-mail enviado!</div>
            <div style={{ color: T.muted, fontSize: 13, marginBottom: "1.5rem" }}>Verifique sua caixa de entrada.</div>
            <button onClick={() => { setForgot(false); setSentReset(false); }}
              style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "0.6rem 1.5rem", color: T.text, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
              Voltar ao login
            </button>
          </div>

        ) : (
          <form onSubmit={handleForgot}>
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>Recuperar senha</div>
              <div style={{ color: T.muted, fontSize: 13, marginTop: 6 }}>Enviaremos um link para seu e-mail.</div>
            </div>
            <ErrorBar msg={err} />
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600 }}>E-MAIL</div>
              <div style={{ position: "relative" }}>
                <Mail size={15} color={T.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input style={inpSt} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ width: "100%", background: `linear-gradient(135deg, ${T.accent}, ${T.accent}cc)`, color: "#000", border: "none", borderRadius: 10, padding: "0.8rem", fontSize: 15, fontWeight: 700, cursor: loading ? "wait" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </button>
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button type="button" onClick={() => setForgot(false)}
                style={{ background: "none", border: "none", color: T.muted, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                Voltar ao login
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
        <ThemeToggleSwitch isDark={isDark} onToggle={onToggleTheme} />
        <div style={{ color: T.muted, fontSize: 11, marginTop: "0.875rem" }}>Desenvolvido por OzTech SmartControl</div>
      </div>
    </div>
  );
}

// ── NO ACCESS SCREEN ──────────────────────────────────────────
function NoAccessScreen({ reason, onLogout, onGoToPlans }) {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <Card style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <AlertCircle size={40} color={T.danger} style={{ marginBottom: "1rem" }} />
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 2, color: T.text, marginBottom: "0.75rem" }}>Acesso Restrito</div>
        <div style={{ color: T.muted, fontSize: 13, marginBottom: "1.5rem", lineHeight: 1.6 }}>{accessDeniedMessage(reason)}</div>
        <Row g="8px" style={{ justifyContent: "center" }}>
          <Btn onClick={onGoToPlans}>Ver Planos</Btn>
          <Btn variant="ghost" onClick={onLogout}><LogOut size={14} />Sair</Btn>
        </Row>
      </Card>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────
export default function App() {
  const [token,      setToken]      = useState(() => localStorage.getItem("oz_cw_token") || "");
  const [profile,    setProfile]    = useState(null);
  const [shop,       setShop]       = useState(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [loading,    setLoading]    = useState(true);
  const [accessInfo, setAccessInfo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeMode,  setThemeMode]  = useState(() => localStorage.getItem("oz_theme") || "dark");
  const [postPaymentPlan, setPostPaymentPlan] = useState(null);
  const [showPlans, setShowPlans]   = useState(false);
  // Captura ?courtesy=true da URL antes de qualquer limpeza do hash effect
  const [isCourtesyOtp] = useState(() =>
    new URLSearchParams(window.location.search).get("courtesy") === "true"
  );

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const toggleTheme = () => {
    const next = themeMode === "dark" ? "light" : "dark";
    localStorage.setItem("oz_theme", next);
    applyThemeMode(next);
    if (shop) applyTenantTheme(shop, next);
    setThemeMode(next);
  };

  // Detect post-payment redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setPostPaymentPlan(params.get("plan") || "monthly");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Detect Supabase magic-link / email-confirmation (token arrives in URL hash)
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const params = new URLSearchParams(hash.replace(/^#/, ""));

    // OTP error (expired or invalid link)
    if (params.get("error_code") === "otp_expired" || params.get("error") === "access_denied") {
      window.history.replaceState({}, "", window.location.pathname);
      alert("O link de acesso expirou ou é inválido.\nSolicite um novo convite ao administrador.");
      return;
    }

    // Valid magic link
    if (hash.includes("access_token=")) {
      const at = params.get("access_token");
      const rt = params.get("refresh_token");
      const type = params.get("type"); // "signup" ou "magiclink" = usuário de cortesia OTP
      if (at) {
        // Marca cortesia via localStorage — lido no bootstrap antes de qualquer chamada
        if (type === "signup" || type === "magiclink") {
          localStorage.setItem("oz_courtesy_signup", "true");
        }
        window.history.replaceState({}, "", window.location.pathname);
        localStorage.setItem("oz_cw_token", at);
        if (rt) localStorage.setItem("oz_cw_refresh", rt);
        setToken(at);
      }
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("oz_cw_token");
    localStorage.removeItem("oz_cw_refresh");
    localStorage.removeItem("oz_courtesy_signup");
    setToken(""); setProfile(null); setShop(null); setAccessInfo(null);
    resetTenantTheme();
  }, []);

  const handleLogin = useCallback((accessToken, refreshToken) => {
    localStorage.setItem("oz_cw_token", accessToken);
    if (refreshToken) localStorage.setItem("oz_cw_refresh", refreshToken);
    setToken(accessToken);
  }, []);

  // Bootstrap session
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const user = await api.getUser(token);
        if (user.error || !user.id) { logout(); return; }

        const prof = await api.getProfile(user.id, token);
        if (!prof) {
          // Novo usuário OTP — sem profile ainda. Verifica cortesia pelo email do JWT.
          // Fallbacks: flag localStorage (type=signup no hash) ou ?courtesy=true na URL.
          const isCourtesyFlag = localStorage.getItem("oz_courtesy_signup") === "true";
          const acc = await checkCurrentUserAccess(token, null);
          if (acc?.reason === "courtesy_pending_onboarding" || isCourtesyFlag || isCourtesyOtp) {
            localStorage.removeItem("oz_courtesy_signup");
            setProfile({ id: user.id, email: user.email });
            setAccessInfo({ has_access: true, reason: "courtesy_pending_onboarding" });
            setLoading(false);
          } else {
            logout();
          }
          return;
        }

        setProfile({ ...prof, email: user.email });

        const isSuperAdmin = prof.is_super_admin === true || prof.role === "super_admin";

        if (!isSuperAdmin && prof.carwash_id) {
          const [shopRaw, acc] = await Promise.all([
            api.list("carwashes", `id=eq.${prof.carwash_id}&select=*`, token).then(r => r[0]),
            checkCurrentUserAccess(token, prof),
          ]);
          setShop(shopRaw || null);
          setAccessInfo(acc);
          if (shopRaw) applyTenantTheme(shopRaw, themeMode);
        } else if (isSuperAdmin) {
          setAccessInfo({ has_access: true, reason: "super_admin" });
        } else {
          // No carwash yet — could be courtesy pending onboarding
          const isCourtesyFlag = localStorage.getItem("oz_courtesy_signup") === "true";
          const acc = await checkCurrentUserAccess(token, prof);
          if ((isCourtesyFlag || isCourtesyOtp) && acc?.reason !== "courtesy_pending_onboarding") {
            localStorage.removeItem("oz_courtesy_signup");
            setAccessInfo({ has_access: true, reason: "courtesy_pending_onboarding" });
          } else {
            setAccessInfo(acc);
          }
        }
      } catch (e) { console.error(e); logout(); }
      setLoading(false);
    })();
  }, [token]);

  // Preview mode — acesso direto para ver a tela sem autenticação
  // URL: /ozwash.vercel.app/?preview=onboarding
  if (new URLSearchParams(window.location.search).get("preview") === "onboarding") {
    return (
      <Onboarding
        isCourtesy={true}
        courtesyToken=""
        courtesyEmail="preview@demo.com"
        onComplete={() => alert("Preview: onboarding concluído!")}
      />
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: T.muted, fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>Carregando...</div>
      </div>
    );
  }

  // No token → show login (unless post-payment)
  if (!token) {
    if (postPaymentPlan) {
      return <Onboarding plan={postPaymentPlan} onComplete={handleLogin} />;
    }
    if (showPlans) {
      return <PlansView onBack={() => setShowPlans(false)} />;
    }
    return (
      <LoginScreen
        onLogin={handleLogin}
        onShowPlans={() => setShowPlans(true)}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // Password reset flow
  if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
    return <ResetPassword token={token} onDone={logout} />;
  }

  // Super Admin
  if (profile?.is_super_admin === true || profile?.role === "super_admin") {
    return <SuperAdminView token={token} profile={profile} onLogout={logout} themeMode={themeMode} onToggleTheme={toggleTheme} />;
  }

  // Courtesy user: has access but no carwash yet → guided carwash onboarding
  if (!profile?.carwash_id && accessInfo?.reason === "courtesy_pending_onboarding") {
    return (
      <Onboarding
        isCourtesy={true}
        courtesyToken={token}
        courtesyEmail={profile.email}
        onComplete={() => window.location.reload()}
      />
    );
  }

  // No access
  if (!accessInfo?.has_access) {
    return <NoAccessScreen reason={accessInfo?.reason} onLogout={logout} onGoToPlans={() => { logout(); setShowPlans(true); }} />;
  }

  const carwashId  = profile?.carwash_id;
  const isAdmin    = profile?.role === "admin";
  const isEmployee = profile?.role === "employee";
  const employeeId = profile?.employee_id;

  const renderView = () => {
    const common = { token, carwashId, isMobile };
    switch (activeView) {
      case "dashboard":  return isAdmin ? <Dashboard {...common} /> : <EmployeeDashboard {...common} employeeId={employeeId} />;
      case "orders":     return <ServiceOrdersView {...common} employeeId={employeeId} isAdmin={isAdmin} />;
      case "clients":    return <ClientsView {...common} isAdmin={isAdmin} />;
      case "vehicles":   return isAdmin ? <VehiclesView {...common} /> : null;
      case "employees":  return isAdmin ? <EmployeesView {...common} /> : null;
      case "services":   return isAdmin ? <ServicesView {...common} /> : null;
      case "products":   return isAdmin ? <ProductsView {...common} /> : null;
      case "financial":  return isAdmin ? <FinancialView {...common} /> : null;
      case "reports":    return isAdmin ? <ReportsView {...common} /> : null;
      case "settings":   return isAdmin ? <SettingsView {...common} shop={shop} onShopUpdate={s => { setShop(s); applyTenantTheme(s, themeMode); }} themeMode={themeMode} onToggleTheme={toggleTheme} /> : null;
      case "meuPlano":   return isAdmin ? <MeuPlanoView {...common} accessInfo={accessInfo} /> : null;
      default:           return <Dashboard {...common} />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>
      <Sidebar
        active={activeView}
        onNav={setActiveView}
        profile={profile}
        shop={shop}
        onLogout={logout}
        isMobile={isMobile}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
      />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Mobile topbar */}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", padding: "0.875rem 1rem", borderBottom: `1px solid ${T.border}`, background: T.sidebar, position: "sticky", top: 0, zIndex: 100 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", display: "flex", marginRight: "auto" }}>
              <Menu size={20} />
            </button>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 2, color: T.accent }}>Oz.LavaRápido</div>
          </div>
        )}

        <main style={{ flex: 1, padding: isMobile ? "1.25rem 1rem" : "2rem 2rem", maxWidth: 1200, width: "100%" }}>
          {renderView()}
        </main>
      </div>
    </div>
  );
}
