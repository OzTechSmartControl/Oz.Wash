import { useEffect, useState, useCallback } from "react";
import { RefreshCw, CreditCard, AlertTriangle, XCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { T_DARK } from "../../config/theme";
import { fDate, money } from "../../utils/formatters";

const planLabel = { monthly: "Plano Mensal", semiannual: "Plano Semestral", annual: "Plano Anual" };
const planPrice = { monthly: 79.9, semiannual: 399.9, annual: 699.9 };
const PAGE_SIZE  = 20;

export default function SubscriptionsView({ supabase, T: propT }) {
  const T = propT || T_DARK;

  const [subs,    setSubs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("subscriptions")
        .select("*, carwashes(name)")
        .order("created_at", { ascending: false })
        .limit(500);
      setSubs(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  /* ── KPIs ── */
  const ativas       = subs.filter(s => s.status === "active").length;
  const inadimplentes = subs.filter(s => s.status === "pending" || s.status === "overdue").length;
  const canceladas   = subs.filter(s => s.status === "cancelled").length;

  const statusColor = (s) => ({
    active:    T.success,
    pending:   T.warn,
    overdue:   T.warn,
    cancelled: T.danger,
  }[s] || T.muted);

  const statusText = (s) => ({
    active:    "Ativo",
    pending:   "Inadimplente",
    overdue:   "Inadimplente",
    cancelled: "Cancelado",
  }[s] || s || "—");

  /* ── Filter + pagination ── */
  const filtered   = subs.filter(s => {
    const q = search.toLowerCase();
    return !q
      || s.carwashes?.name?.toLowerCase().includes(q)
      || s.email?.toLowerCase().includes(q)
      || (planLabel[s.plan] || "").toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── Sub-components ── */
  const KpiCard = ({ label, value, icon: Icon, color, sub }) => {
    const c = color || T.accent;
    return (
      <div
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 10px 36px ${c}1e, 0 2px 10px rgba(0,0,0,0.35)`; e.currentTarget.style.borderColor = c + "44"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.18)"; e.currentTarget.style.borderColor = T.border; }}
        style={{
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
          padding: "1.25rem", display: "flex",
          alignItems: "flex-start", justifyContent: "space-between", gap: 8,
          position: "relative", overflow: "hidden",
          transform: "translateY(0)", boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
          transition: "transform 0.22s cubic-bezier(.4,0,.2,1), box-shadow 0.22s, border-color 0.22s",
        }}>
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, ${c} 0%, ${c}44 100%)`, borderRadius: "14px 0 0 14px" }} />
        <div style={{ position: "absolute", top: -24, right: -24, width: 90, height: 90, borderRadius: "50%", background: `radial-gradient(circle, ${c}10 0%, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700, marginBottom: 8 }}>{label}</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 34, letterSpacing: 1, color: c, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{ background: c + "18", borderRadius: 10, padding: 10, flexShrink: 0, position: "relative", border: `1px solid ${c}22` }}>
          <Icon size={18} color={c} />
        </div>
      </div>
    );
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
          <div style={{ background: T.accent + "18", borderRadius: 12, padding: 10 }}>
            <CreditCard size={22} color={T.accent} />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(24px,5vw,36px)", letterSpacing: 2.5, margin: 0, color: T.text, lineHeight: 1 }}>
              Assinaturas
            </h1>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>
              Centro de assinaturas, recorrência e cobrança
            </div>
          </div>
        </div>
        <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.5rem 1rem", color: T.text, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
          <RefreshCw size={13} />Atualizar
        </button>
      </div>

      {/* ── KPI Cards ── */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: "1rem", marginBottom: "1.5rem", animation: "cardIn 0.45s cubic-bezier(.4,0,.2,1) 0s both" }}>
          <KpiCard label="Ativas"        value={ativas}        icon={CreditCard}    color={T.success} />
          <KpiCard label="Inadimplentes" value={inadimplentes} icon={AlertTriangle} color={T.warn}    />
          <KpiCard label="Canceladas"    value={canceladas}    icon={XCircle}       color={T.danger}  />
          <KpiCard label="Gateway"       value="MP"            icon={CreditCard}    color={T.accent}  sub="Mercado Pago" />
        </div>
      )}

      {/* ── Table Card ── */}
      {loading ? (
        <div style={{ color: T.muted, padding: "2rem", textAlign: "center" }}>Carregando...</div>
      ) : (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", animation: "cardIn 0.45s cubic-bezier(.4,0,.2,1) 0.09s both" }}>

          {/* Search bar inside card header */}
          <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} color={T.muted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.5rem 0.875rem 0.5rem 2rem", color: T.text, fontSize: 13, outline: "none", fontFamily: "'DM Sans', sans-serif", width: 220 }}
                placeholder="Buscar..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Plano", "Pagador", "Status", "Valor", "Contratado em", "Expira em"].map(c => (
                    <th key={c} style={{ textAlign: "left", padding: "0.875rem 1rem", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, whiteSpace: "nowrap" }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(s => (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${T.border}` }}>

                    {/* Plano */}
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{planLabel[s.plan] || s.plan || "—"}</div>
                      {s.mp_external_reference && (
                        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Gateway: Mercado Pago</div>
                      )}
                    </td>

                    {/* Pagador */}
                    <td style={{ padding: "0.875rem 1rem", fontSize: 13, color: T.text }}>
                      {s.email || s.carwashes?.name || "—"}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <span style={{ background: statusColor(s.status) + "22", color: statusColor(s.status), borderRadius: 5, padding: "3px 9px", fontSize: 11, fontWeight: 700 }}>
                        {statusText(s.status)}
                      </span>
                    </td>

                    {/* Valor */}
                    <td style={{ padding: "0.875rem 1rem", fontSize: 13, color: T.success, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {money(planPrice[s.plan] || 0)}
                    </td>

                    {/* Contratado em */}
                    <td style={{ padding: "0.875rem 1rem", fontSize: 13, color: T.muted, whiteSpace: "nowrap" }}>
                      {s.created_at ? fDate(s.created_at.substring(0, 10)) : "—"}
                    </td>

                    {/* Expira em */}
                    <td style={{ padding: "0.875rem 1rem", fontSize: 13, color: T.muted, whiteSpace: "nowrap" }}>
                      {s.expires_at ? fDate(s.expires_at.substring(0, 10)) : "—"}
                    </td>
                  </tr>
                ))}
                {!paginated.length && (
                  <tr>
                    <td colSpan={6} style={{ padding: "2.5rem", textAlign: "center", color: T.muted }}>
                      Nenhuma assinatura encontrada.
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
