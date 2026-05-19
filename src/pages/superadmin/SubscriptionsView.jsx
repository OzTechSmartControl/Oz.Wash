import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { T_DARK } from "../../config/theme";
import { fDate, money } from "../../utils/formatters";

const planLabel = { monthly: "Mensal", semiannual: "Semestral", annual: "Anual" };

export default function SubscriptionsView({ supabase, T: propT }) {
  const T = propT || T_DARK;

  const Badge = ({ children, color = T.accent }) => (
    <span style={{ background: color + "22", color, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{children}</span>
  );

  const statusColor = (s) => ({ active: T.success, cancelled: T.danger, pending: T.muted }[s] || T.muted);

  const [subs,    setSubs]    = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("subscriptions")
        .select("*, carwashes(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      setSubs(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(26px,6vw,38px)", letterSpacing: 2.5, margin: 0, color: T.text }}>Assinaturas</h1>
        <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.5rem 1rem", color: T.text, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
          <RefreshCw size={13} />Atualizar
        </button>
      </div>
      {loading ? <div style={{ color: T.muted }}>Carregando...</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Lava Rápido", "Plano", "Status", "Vencimento", "Ref. MP"].map(c => (
              <th key={c} style={{ textAlign: "left", padding: "0 0.75rem 10px", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>{c}</th>
            ))}</tr></thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.text }}>{s.carwashes?.name || "—"}</td>
                  <td style={{ padding: "0.75rem" }}><Badge color={T.accent}>{planLabel[s.plan] || s.plan || "—"}</Badge></td>
                  <td style={{ padding: "0.75rem" }}><Badge color={statusColor(s.status)}>{s.status}</Badge></td>
                  <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{s.expires_at ? fDate(s.expires_at.substring(0, 10)) : "—"}</td>
                  <td style={{ padding: "0.75rem", fontSize: 11, color: T.muted, fontFamily: "monospace" }}>{s.mp_external_reference || "—"}</td>
                </tr>
              ))}
              {!subs.length && <tr><td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: T.muted }}>Nenhuma assinatura encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
