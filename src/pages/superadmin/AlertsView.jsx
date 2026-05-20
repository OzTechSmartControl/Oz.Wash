import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Bell, CheckCircle, UserPlus, CreditCard, Gift, AlertTriangle, Info } from "lucide-react";
import { T_DARK } from "../../config/theme";

/* ── Relative time helper ── */
const relTime = (dateStr) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hrs   = Math.floor(mins / 60);
  const days  = Math.floor(hrs  / 24);
  if (days  > 0) return `${days}d atrás`;
  if (hrs   > 0) return `${hrs}h atrás`;
  if (mins  > 0) return `${mins}min atrás`;
  return "agora";
};

/* ── Alert config by type/level ── */
const alertConfig = (level, type) => {
  const map = {
    new_client:    { color: "#43d18a", icon: UserPlus,      badge: "NOVO CLIENTE"  },
    new_sub:       { color: "#43d18a", icon: CreditCard,    badge: "ASSINATURA"    },
    new_courtesy:  { color: "#4db8ff", icon: Gift,          badge: "CORTESIA"      },
    error:         { color: "#f07070", icon: AlertTriangle,  badge: "ERRO"         },
    warning:       { color: "#f0a500", icon: AlertTriangle,  badge: "AVISO"        },
    info:          { color: "#60a5fa", icon: Info,           badge: "INFO"         },
    success:       { color: "#43d18a", icon: CheckCircle,    badge: "SUCESSO"      },
  };
  return map[type] || map[level] || { color: "#706b63", icon: Bell, badge: level || "INFO" };
};

export default function AlertsView({ supabase, T: propT }) {
  const T = propT || T_DARK;

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

  return (
    <div>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: T.accent + "18", borderRadius: 12, padding: 10 }}>
            <Bell size={22} color={T.accent} />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(24px,5vw,36px)", letterSpacing: 2.5, margin: 0, color: T.text, lineHeight: 1 }}>
              Alertas
            </h1>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>
              Eventos e notificações da plataforma
            </div>
          </div>
        </div>
        <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.5rem 1rem", color: T.text, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
          <RefreshCw size={13} />Atualizar
        </button>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ color: T.muted, padding: "2rem", textAlign: "center" }}>Carregando...</div>

      ) : alerts.length === 0 ? (
        /* Empty state */
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "3rem 2rem", textAlign: "center", animation: "cardIn 0.45s cubic-bezier(.4,0,.2,1) 0s both" }}>
          <CheckCircle size={36} color={T.success} style={{ marginBottom: "0.875rem" }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 4 }}>Sem alertas ativos</div>
          <div style={{ fontSize: 13, color: T.muted }}>A plataforma está operando normalmente.</div>
        </div>

      ) : (
        /* Alert list */
        <div style={{ display: "flex", flexDirection: "column", gap: 0, animation: "cardIn 0.45s cubic-bezier(.4,0,.2,1) 0s both" }}>
          {alerts.map((a, idx) => {
            const cfg         = alertConfig(a.level, a.type);
            const IconComp    = cfg.icon;
            const isLast      = idx === alerts.length - 1;
            const storeName   = a.carwash_name || a.metadata?.carwash_name || a.metadata?.store_name || null;

            return (
              <div
                key={a.id}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  padding: "1rem 0",
                  borderBottom: isLast ? "none" : `1px solid ${T.border}`,
                }}
              >
                {/* Icon bubble */}
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: cfg.color + "22",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginTop: 1,
                }}>
                  <IconComp size={18} color={cfg.color} />
                </div>

                {/* Body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, color: T.text, fontWeight: 500 }}>
                      {a.title || a.message || "Alerta"}
                    </span>
                    <span style={{
                      background: cfg.color + "22", color: cfg.color,
                      borderRadius: 5, padding: "2px 8px",
                      fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                      whiteSpace: "nowrap",
                    }}>
                      {cfg.badge}
                    </span>
                  </div>

                  {storeName && (
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                      🚗 {storeName}
                    </div>
                  )}

                  {a.description && !storeName && (
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 3, lineHeight: 1.5 }}>
                      {a.description}
                    </div>
                  )}
                </div>

                {/* Relative time */}
                <div style={{ fontSize: 12, color: T.muted, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4, flexShrink: 0, paddingTop: 3 }}>
                  🕐 {relTime(a.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
