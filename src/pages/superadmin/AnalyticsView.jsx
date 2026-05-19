import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { T_DARK } from "../../config/theme";
import { money } from "../../utils/formatters";

export default function AnalyticsView({ supabase, metrics, T: propT }) {
  const T = propT || T_DARK;

  const StatCard = ({ label, value, color }) => (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "1.25rem" }}>
      <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 1, color: color || T.text }}>{value}</div>
    </div>
  );

  const [growth,  setGrowth]  = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("carwashes")
        .select("created_at")
        .order("created_at", { ascending: false });

      if (data) {
        const grouped = {};
        data.forEach(c => {
          const m = (c.created_at || "").substring(0, 7);
          if (m) grouped[m] = (grouped[m] || 0) + 1;
        });
        const sorted = Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([month, count]) => ({ month, count }));
        setGrowth(sorted);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const m = metrics || {};
  const planDistribution = [
    { label: "Mensal",    count: m.monthly_count    || 0, color: T.accent  },
    { label: "Semestral", count: m.semiannual_count || 0, color: T.info    },
    { label: "Anual",     count: m.annual_count     || 0, color: T.success },
    { label: "Cortesia",  count: m.courtesy_count   || 0, color: T.muted   },
  ];

  const maxGrowth = Math.max(...growth.map(g => g.count), 1);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(26px,6vw,38px)", letterSpacing: 2.5, margin: 0, color: T.text }}>Analytics</h1>
        <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.5rem 1rem", color: T.text, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
          <RefreshCw size={13} />Atualizar
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
        <StatCard label="Total Clientes"  value={m.total_carwashes   || 0} color={T.accent}  />
        <StatCard label="Ativos"          value={m.active_carwashes  || 0} color={T.success} />
        <StatCard label="Inadimplentes"   value={m.overdue_carwashes || 0} color={T.danger}  />
        <StatCard label="MRR Estimado"    value={money(m.mrr || 0)}        color={T.success} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
        {/* Crescimento mensal */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "1.5rem" }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1.5, color: T.text, marginBottom: "1.25rem" }}>Novos Clientes / Mês</div>
          {loading ? <div style={{ color: T.muted, fontSize: 13 }}>Carregando...</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {growth.map(g => (
                <div key={g.month}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.muted, marginBottom: 4 }}>
                    <span>{g.month}</span>
                    <span style={{ color: T.text, fontWeight: 600 }}>{g.count}</span>
                  </div>
                  <div style={{ height: 6, background: T.surface, borderRadius: 4 }}>
                    <div style={{ height: "100%", width: `${(g.count / maxGrowth) * 100}%`, background: T.accent, borderRadius: 4, transition: "width 0.4s" }} />
                  </div>
                </div>
              ))}
              {!growth.length && <div style={{ color: T.muted, fontSize: 13 }}>Sem dados disponíveis.</div>}
            </div>
          )}
        </div>

        {/* Distribuição de planos */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "1.5rem" }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1.5, color: T.text, marginBottom: "1.25rem" }}>Distribuição de Planos</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {planDistribution.map(p => {
              const total = planDistribution.reduce((s, x) => s + x.count, 0) || 1;
              const pct   = Math.round((p.count / total) * 100);
              return (
                <div key={p.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: T.muted }}>{p.label}</span>
                    <span style={{ color: T.text, fontWeight: 600 }}>{p.count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, background: T.surface, borderRadius: 4 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: p.color, borderRadius: 4, transition: "width 0.4s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
