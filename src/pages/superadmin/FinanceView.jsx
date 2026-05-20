import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw, DollarSign, TrendingUp, CreditCard,
  Activity, AlertTriangle, XCircle, Search,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { T_DARK } from "../../config/theme";
import { fDate, money } from "../../utils/formatters";

const planLabel = {
  monthly:    "Plano Mensal",
  semiannual: "Plano Semestral",
  annual:     "Plano Anual",
};
const planPrice = { monthly: 79.9, semiannual: 399.9, annual: 699.9 };
const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const PAGE_SIZE  = 20;

export default function FinanceView({ supabase, T: propT }) {
  const T = propT || T_DARK;

  const [checkouts,  setCheckouts]  = useState([]);
  const [activeSubs, setActiveSubs] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [payRes, subRes] = await Promise.all([
        supabase
          .from("payment_checkouts")
          .select("*")
          .eq("status", "paid")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("carwashes")
          .select("id, plan, plan_expires_at")
          .not("plan", "in", "(none,courtesy)"),
      ]);
      setCheckouts(payRes.data || []);
      const now = new Date();
      const active = (subRes.data || []).filter(
        c => c.plan_expires_at && new Date(c.plan_expires_at) > now
      );
      setActiveSubs(active.length);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  /* ── Calculations ── */
  const now       = new Date();
  const thisMonth = now.toISOString().substring(0, 7);

  const mrrCheckouts = checkouts.filter(c => (c.created_at || "").substring(0, 7) === thisMonth);
  const mrr          = mrrCheckouts.reduce((s, c) => s + (planPrice[c.plan] || 0), 0);
  const arr          = mrr * 12;
  const totalRev     = checkouts.reduce((s, c) => s + (planPrice[c.plan] || 0), 0);
  const ticketMedio  = checkouts.length > 0 ? totalRev / checkouts.length : 0;

  /* Monthly bar chart – last 6 months */
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d   = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const total = checkouts
      .filter(c => (c.created_at || "").substring(0, 7) === key)
      .reduce((s, c) => s + (planPrice[c.plan] || 0), 0);
    return { month: MONTHS_PT[d.getMonth()], total };
  });

  /* Revenue by plan */
  const byPlan = {
    monthly:    checkouts.filter(c => c.plan === "monthly").reduce(s => s + planPrice.monthly, 0),
    semiannual: checkouts.filter(c => c.plan === "semiannual").reduce(s => s + planPrice.semiannual, 0),
    annual:     checkouts.filter(c => c.plan === "annual").reduce(s => s + planPrice.annual, 0),
  };
  const maxPlan = Math.max(...Object.values(byPlan), 1);

  /* Payments table */
  const filtered = checkouts.filter(c => {
    const q = search.toLowerCase();
    return !q
      || c.email?.toLowerCase().includes(q)
      || (planLabel[c.plan] || "").toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── Sub-components ── */
  const KpiCard = ({ label, sub, value, icon: Icon, color }) => {
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
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, letterSpacing: 1, color: c, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{ background: c + "18", borderRadius: 10, padding: 9, flexShrink: 0, position: "relative", border: `1px solid ${c}22` }}>
          <Icon size={17} color={c} />
        </div>
      </div>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.6rem 0.875rem" }}>
        <div style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{money(payload[0].value)}</div>
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

  const planBars = [
    { key: "monthly",    label: "Plano mensal"    },
    { key: "semiannual", label: "Plano semestral" },
    { key: "annual",     label: "Plano anual"     },
  ];

  return (
    <div>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: T.success + "18", borderRadius: 12, padding: 10 }}>
            <DollarSign size={22} color={T.success} />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(24px,5vw,36px)", letterSpacing: 2.5, margin: 0, color: T.text, lineHeight: 1 }}>
              Financeiro
            </h1>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>
              Métricas financeiras da plataforma SaaS
            </div>
          </div>
        </div>
        <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.5rem 1rem", color: T.text, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
          <RefreshCw size={13} />Atualizar
        </button>
      </div>

      {/* ── 6 KPI Cards ── */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: "1rem", marginBottom: "1.5rem", animation: "cardIn 0.45s cubic-bezier(.4,0,.2,1) 0s both" }}>
          <KpiCard label="Receita Mensal"     value={money(mrr)}         icon={DollarSign}    color={T.success} />
          <KpiCard label="Receita Prevista"   value={money(arr)}         icon={TrendingUp}    color={T.accent}  sub="ARR projetado" />
          <KpiCard label="Ticket Médio"       value={money(ticketMedio)} icon={Activity}      color={T.accent}  />
          <KpiCard label="Assinaturas Ativas" value={activeSubs}         icon={CreditCard}    color={T.success} />
          <KpiCard label="Inadimplência"      value={0}                  icon={AlertTriangle} color={T.warn}    />
          <KpiCard label="Cancelamentos"      value={0}                  icon={XCircle}       color={T.danger}  />
        </div>
      )}

      {/* ── Charts Row ── */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem", marginBottom: "1.5rem", animation: "cardIn 0.45s cubic-bezier(.4,0,.2,1) 0.09s both" }}>

          {/* Receita Mensal – bar chart */}
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.25rem" }}>
              <TrendingUp size={15} color={T.accent} />
              <div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 1, color: T.text }}>RECEITA MENSAL</div>
                <div style={{ fontSize: 11, color: T.muted }}>Receita registrada por mês</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: T.accent + "11" }} />
                <Bar dataKey="total" radius={[5, 5, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i === chartData.length - 1 ? T.accent : T.accent + "55"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Receita por Plano – progress bars */}
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.25rem" }}>
              <DollarSign size={15} color={T.accent} />
              <div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 1, color: T.text }}>RECEITA POR PLANO</div>
                <div style={{ fontSize: 11, color: T.muted }}>MRR distribuído por categoria</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {planBars.map(({ key, label }) => (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: T.text }}>{label}</span>
                    <span style={{ fontSize: 13, color: T.muted }}>{money(byPlan[key])}</span>
                  </div>
                  <div style={{ height: 6, background: T.border, borderRadius: 99 }}>
                    <div style={{
                      height: "100%", background: T.accent, borderRadius: 99,
                      width: `${Math.round((byPlan[key] / maxPlan) * 100)}%`,
                      transition: "width 0.4s",
                    }} />
                  </div>
                </div>
              ))}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: T.text }}>Acesso Cortesia</span>
                  <span style={{ fontSize: 13, color: T.muted }}>{money(0)}</span>
                </div>
                <div style={{ height: 6, background: T.border, borderRadius: 99 }}>
                  <div style={{ height: "100%", background: T.accent, borderRadius: 99, width: "0%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pagamentos Recentes ── */}
      {!loading && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", animation: "cardIn 0.45s cubic-bezier(.4,0,.2,1) 0.16s both" }}>

          {/* Section header */}
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CreditCard size={15} color={T.accent} />
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1, color: T.text }}>PAGAMENTOS RECENTES</span>
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Registros capturados pelo gateway/webhook</div>
            </div>
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
                  {["Plano", "Valor", "Status", "Contratado em", "Expira em"].map(c => (
                    <th key={c} style={{ textAlign: "left", padding: "0.875rem 1rem", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, whiteSpace: "nowrap" }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(c => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{planLabel[c.plan] || c.plan || "—"}</div>
                      {c.email && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{c.email}</div>}
                    </td>
                    <td style={{ padding: "0.875rem 1rem", fontSize: 13, color: T.success, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {money(planPrice[c.plan] || 0)}
                    </td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <span style={{ background: T.success + "22", color: T.success, borderRadius: 5, padding: "3px 9px", fontSize: 11, fontWeight: 700 }}>
                        Ativo
                      </span>
                    </td>
                    <td style={{ padding: "0.875rem 1rem", fontSize: 13, color: T.muted, whiteSpace: "nowrap" }}>
                      {c.created_at  ? fDate(c.created_at.substring(0, 10))  : "—"}
                    </td>
                    <td style={{ padding: "0.875rem 1rem", fontSize: 13, color: T.muted, whiteSpace: "nowrap" }}>
                      {c.redeemed_at ? fDate(c.redeemed_at.substring(0, 10)) : "—"}
                    </td>
                  </tr>
                ))}
                {!paginated.length && (
                  <tr>
                    <td colSpan={5} style={{ padding: "2.5rem", textAlign: "center", color: T.muted }}>
                      Nenhum pagamento encontrado.
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
