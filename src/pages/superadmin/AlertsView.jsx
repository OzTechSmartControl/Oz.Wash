import { useEffect, useState, useCallback } from "react";
import { RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import T from "../../config/theme";
import { fDatetime } from "../../utils/formatters";

const Badge = ({ children, color }) => (
  <span style={{ background: (color || T.muted) + "22", color: color || T.muted, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{children}</span>
);

export default function AlertsView({ supabase }) {
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("platform_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setAlerts(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const levelColor = (l) => ({ error: T.danger, warning: T.warn || "#f59e0b", info: T.info || "#60a5fa", success: T.success }[l] || T.muted);

  // Fallback: if platform_alerts doesn't exist yet, show helpful message
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(26px,6vw,38px)", letterSpacing: 2.5, margin: 0, color: T.text }}>Alertas</h1>
        <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.5rem 1rem", color: T.text, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
          <RefreshCw size={13} />Atualizar
        </button>
      </div>

      {loading ? <div style={{ color: T.muted }}>Carregando...</div> : alerts.length === 0 ? (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "2rem", textAlign: "center" }}>
          <CheckCircle size={32} color={T.success} style={{ marginBottom: "0.75rem" }} />
          <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>Sem alertas ativos</div>
          <div style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>A plataforma está operando normalmente.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {alerts.map(a => (
            <div key={a.id} style={{ background: T.card, border: `1px solid ${levelColor(a.level)}33`, borderRadius: 10, padding: "1rem 1.25rem", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <AlertCircle size={16} color={levelColor(a.level)} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{a.title || a.message || "Alerta"}</span>
                  <Badge color={levelColor(a.level)}>{a.level || "info"}</Badge>
                </div>
                {a.description && <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{a.description}</div>}
                <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{fDatetime(a.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
