import { useEffect, useState, useCallback } from "react";
import { RefreshCw, DollarSign, TrendingUp, CreditCard } from "lucide-react";
import T from "../../config/theme";
import { fDate, money } from "../../utils/formatters";

const StatCard = ({ label, value, color, icon: Icon }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "1.25rem" }}>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
      <div>
        <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>{label}</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 1, color: color || T.text }}>{value}</div>
      </div>
      {Icon && <div style={{ background: (color || T.accent) + "18", borderRadius: 10, padding: 8 }}><Icon size={17} color={color || T.accent} /></div>}
    </div>
  </div>
);

const planLabel = { monthly: "Mensal", semiannual: "Semestral", annual: "Anual" };
const planPrice = { monthly: 79.9, semiannual: 399.9, annual: 699.9 };

export default function FinanceView({ supabase }) {
  const [checkouts, setCheckouts] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("payment_checkouts")
        .select("*")
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(300);
      setCheckouts(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const totalRevenue = checkouts.reduce((s, c) => s + (planPrice[c.plan] || 0), 0);
  const thisMonth    = new Date().toISOString().substring(0, 7);
  const mrrCheckouts = checkouts.filter(c => (c.created_at || "").substring(0, 7) === thisMonth);
  const mrr          = mrrCheckouts.reduce((s, c) => s + (planPrice[c.plan] || 0), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(26px,6vw,38px)", letterSpacing: 2.5, margin: 0, color: T.text }}>Financeiro SaaS</h1>
        <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.5rem 1rem", color: T.text, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
          <RefreshCw size={13} />Atualizar
        </button>
      </div>

      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
          <StatCard label="Receita Total"  value={money(totalRevenue)} icon={DollarSign} color={T.success} />
          <StatCard label="Receita do Mês" value={money(mrr)}          icon={TrendingUp} color={T.accent} />
          <StatCard label="Pagamentos"     value={checkouts.length}    icon={CreditCard} color={T.info} />
        </div>
      )}

      {loading ? <div style={{ color: T.muted }}>Carregando...</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["E-mail", "Plano", "Valor", "Data", "Redimido em"].map(c => (
              <th key={c} style={{ textAlign: "left", padding: "0 0.75rem 10px", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>{c}</th>
            ))}</tr></thead>
            <tbody>
              {checkouts.map(c => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.text }}>{c.email || "—"}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.accent }}>{planLabel[c.plan] || c.plan || "—"}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.success, fontWeight: 600 }}>{money(planPrice[c.plan] || 0)}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{c.created_at ? fDate(c.created_at.substring(0, 10)) : "—"}</td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{c.redeemed_at ? fDate(c.redeemed_at.substring(0, 10)) : "—"}</td>
                </tr>
              ))}
              {!checkouts.length && <tr><td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: T.muted }}>Nenhum pagamento encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
