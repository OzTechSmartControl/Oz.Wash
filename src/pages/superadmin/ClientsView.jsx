import { useEffect, useState, useCallback } from "react";
import { Search, RefreshCw, Users, CreditCard, Gift, ChevronLeft, ChevronRight } from "lucide-react";
import { T_DARK } from "../../config/theme";
import { fDate, money } from "../../utils/formatters";

const planLabel = {
  monthly:    "Mensal",
  semiannual: "Semestral",
  annual:     "Anual",
  indefinido: "Indeterminado",
  prazo:      "Prazo",
};
const planPrice = { monthly: 79.9, semiannual: 399.9, annual: 699.9 };
const PAGE_SIZE = 20;

export default function ClientsView({ supabase, T: propT }) {
  const T = propT || T_DARK;

  const [subs,       setSubs]       = useState([]);
  const [courtesies, setCourtesies] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterType,   setFilterType]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subsRes, cortRes] = await Promise.all([
        supabase
          .from("carwashes")
          .select("id, name, plan, plan_expires_at, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("courtesy_access")
          .select("id, email, access_type, expires_at, created_at, status, carwashes(name)")
          .order("created_at", { ascending: false }),
      ]);
      setSubs(subsRes.data || []);
      setCourtesies(cortRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const now = new Date();

  const statusOfSub = (c) => {
    if (!c.plan || c.plan === "none" || c.plan === "courtesy") return null;
    if (!c.plan_expires_at) return "expired";
    return new Date(c.plan_expires_at) > now ? "active" : "expired";
  };

  const statusOfCourt = (c) => {
    if (c.status === "revoked") return "revoked";
    if (c.expires_at && new Date(c.expires_at) < now) return "expired";
    return "active";
  };

  const allRows = [
    ...subs
      .filter(c => c.plan && c.plan !== "none" && c.plan !== "courtesy")
      .map(c => ({
        id:      "sub_" + c.id,
        email:   c.name,
        carwash: c.name,
        tipo:    "subscription",
        plan:    c.plan,
        status:  statusOfSub(c),
        since:   c.created_at,
        expires: c.plan_expires_at,
        value:   planPrice[c.plan] || 0,
      })),
    ...courtesies.map(c => ({
      id:      "court_" + c.id,
      email:   c.email,
      carwash: c.carwashes?.name || null,
      tipo:    "courtesy",
      plan:    c.access_type || "indefinido",
      status:  statusOfCourt(c),
      since:   c.created_at,
      expires: c.expires_at,
      value:   null,
    })),
  ].sort((a, b) => new Date(b.since) - new Date(a.since));

  /* KPIs */
  const activeSubs  = allRows.filter(r => r.tipo === "subscription" && r.status === "active").length;
  const activeCourt = allRows.filter(r => r.tipo === "courtesy"     && r.status === "active").length;
  const totalAtivos = activeSubs + activeCourt;

  /* Filters */
  const filtered = allRows.filter(r => {
    const q = search.toLowerCase();
    const matchSearch  = !q
      || r.email?.toLowerCase().includes(q)
      || r.carwash?.toLowerCase().includes(q)
      || planLabel[r.plan]?.toLowerCase().includes(q);
    const matchType   = filterType   === "all" || r.tipo   === filterType;
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const statusColor = (s) => ({ active: T.success, expired: T.danger, revoked: T.warn }[s] || T.muted);
  const statusText  = (s) => ({ active: "Ativo",   expired: "Expirado", revoked: "Revogado" }[s] || "—");

  /* Sub-components */
  const KpiCard = ({ label, value, icon: Icon, color }) => (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
      padding: "1.25rem 1.5rem", display: "flex",
      alignItems: "center", justifyContent: "space-between", gap: 12,
    }}>
      <div>
        <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, fontWeight: 700 }}>{label}</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 34, letterSpacing: 1, color: color || T.success, lineHeight: 1 }}>{value}</div>
      </div>
      <div style={{ background: (color || T.success) + "18", borderRadius: 12, padding: 12, flexShrink: 0 }}>
        <Icon size={20} color={color || T.success} />
      </div>
    </div>
  );

  const selSt = {
    background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
    padding: "0.55rem 0.875rem", color: T.text, fontSize: 13, outline: "none",
    fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
  };

  const btnPage = (disabled) => ({
    width: 30, height: 30, borderRadius: 7,
    background: T.surface, border: `1px solid ${T.border}`,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: disabled ? T.muted : T.text, opacity: disabled ? 0.5 : 1,
  });

  return (
    <div>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: T.success + "18", borderRadius: 12, padding: 10 }}>
            <Users size={22} color={T.success} />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(24px,5vw,36px)", letterSpacing: 2.5, margin: 0, color: T.text, lineHeight: 1 }}>
              Clientes Ativos
            </h1>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>
              Todos os clientes com acesso ativo à plataforma
            </div>
          </div>
        </div>
        <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.5rem 1rem", color: T.text, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
          <RefreshCw size={13} />Atualizar
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
        <KpiCard label="Total Ativos"  value={totalAtivos} icon={Users}      color={T.success} />
        <KpiCard label="Assinantes"    value={activeSubs}  icon={CreditCard} color={T.accent}  />
        <KpiCard label="Cortesias"     value={activeCourt} icon={Gift}        color={T.info}    />
      </div>

      {/* ── Search + Filters ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
          <Search size={14} color={T.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.6rem 0.875rem 0.6rem 2.25rem", color: T.text, fontSize: 13, outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" }}
            placeholder="Buscar por e-mail, lava-rápido ou plano..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} style={selSt}>
          <option value="all">Todos os tipos</option>
          <option value="subscription">Assinatura</option>
          <option value="courtesy">Cortesia</option>
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={selSt}>
          <option value="all">Todos status</option>
          <option value="active">Ativo</option>
          <option value="expired">Expirado</option>
          <option value="revoked">Revogado</option>
        </select>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ color: T.muted, padding: "2rem", textAlign: "center" }}>Carregando...</div>
      ) : (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Cliente", "Tipo", "Plano", "Status", "Desde", "Vencimento", "Valor"].map(c => (
                    <th key={c} style={{ textAlign: "left", padding: "0.875rem 1rem", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, whiteSpace: "nowrap" }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(r => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${T.border}` }}>

                    {/* Cliente */}
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{r.email || "—"}</div>
                      {r.carwash && r.tipo === "courtesy" && (
                        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>🚗 {r.carwash}</div>
                      )}
                    </td>

                    {/* Tipo */}
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <span style={{
                        background: r.tipo === "subscription" ? T.accent + "22" : T.info + "22",
                        color:      r.tipo === "subscription" ? T.accent         : T.info,
                        borderRadius: 5, padding: "3px 9px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                      }}>
                        {r.tipo === "subscription" ? "ASSINATURA" : "CORTESIA"}
                      </span>
                    </td>

                    {/* Plano */}
                    <td style={{ padding: "0.875rem 1rem", fontSize: 13, color: T.text }}>
                      {planLabel[r.plan] || r.plan || "—"}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <span style={{ background: statusColor(r.status) + "22", color: statusColor(r.status), borderRadius: 5, padding: "3px 9px", fontSize: 11, fontWeight: 700 }}>
                        {statusText(r.status)}
                      </span>
                    </td>

                    {/* Desde */}
                    <td style={{ padding: "0.875rem 1rem", fontSize: 13, color: T.muted, whiteSpace: "nowrap" }}>
                      {r.since ? fDate(r.since.substring(0, 10)) : "—"}
                    </td>

                    {/* Vencimento */}
                    <td style={{ padding: "0.875rem 1rem", fontSize: 13, whiteSpace: "nowrap", color: r.expires ? T.muted : T.success }}>
                      {r.expires ? fDate(r.expires.substring(0, 10)) : "Indeterminado"}
                    </td>

                    {/* Valor */}
                    <td style={{ padding: "0.875rem 1rem", fontSize: 13, whiteSpace: "nowrap", color: r.value ? T.success : T.muted, fontWeight: r.value ? 600 : 400 }}>
                      {r.value ? money(r.value) : "—"}
                    </td>
                  </tr>
                ))}
                {!paginated.length && (
                  <tr>
                    <td colSpan={7} style={{ padding: "2.5rem", textAlign: "center", color: T.muted }}>
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem 1rem", borderTop: `1px solid ${T.border}`, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 13, color: T.muted }}>{filtered.length} registro(s)</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={btnPage(page === 1)}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 13, color: T.muted }}>Página {page} de {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={btnPage(page === totalPages)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
