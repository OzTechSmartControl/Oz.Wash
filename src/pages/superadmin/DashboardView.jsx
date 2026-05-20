import { useState, useEffect } from "react";
import {
  DollarSign, TrendingUp, Users, AlertCircle,
  RefreshCw, TrendingDown, UserPlus,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { T_DARK } from "../../config/theme";

const R$ = v => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(+v || 0);
const pct = v => `${(+(v || 0)).toFixed(1)}%`;

/* ── Inject keyframes once ─────────────────────────────────── */
const injectStyles = () => {
  if (document.getElementById("oz-sa-styles")) return;
  const s = document.createElement("style");
  s.id = "oz-sa-styles";
  s.textContent = `
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(18px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }
    @keyframes fadeView {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0);    }
    }
    @keyframes shimmer {
      0%   { background-position: -600px 0; }
      100% { background-position:  600px 0; }
    }
  `;
  document.head.appendChild(s);
};

export default function DashboardView({ metrics, loadingMet, onRefreshMetrics, T: propT }) {
  const T = propT || T_DARK;
  const m = metrics || {};
  const [hov, setHov] = useState(null);

  useEffect(() => { injectStyles(); }, []);

  const growthData  = Array.isArray(m.monthly_growth)     ? m.monthly_growth     : [];
  const planDist    = Array.isArray(m.plan_distribution)   ? m.plan_distribution  : [];
  const totalActive = +(m.active_carwashes || 0);
  const planMap     = {};
  planDist.forEach(p => { planMap[p.plan] = +(p.count || 0); });
  const churnRate   = m.total_carwashes > 0
    ? ((+(m.cancelled_carwashes || 0) / +(m.total_carwashes || 1)) * 100) : 0;

  /* ── KPI Card ──────────────────────────────────────────────── */
  const KpiCard = ({ label, value, sub, color, icon: Icon, glow, idx }) => {
    const h = hov === `kpi-${idx}`;
    const c = color || T.accent;
    return (
      <div
        onMouseEnter={() => setHov(`kpi-${idx}`)}
        onMouseLeave={() => setHov(null)}
        style={{
          background: T.card,
          border: `1px solid ${h ? c + "44" : glow ? c + "28" : T.border}`,
          borderRadius: 16, padding: "1.375rem 1.25rem 1.25rem",
          position: "relative", overflow: "hidden", minWidth: 0,
          boxShadow: h
            ? `0 10px 36px ${c}1e, 0 2px 10px rgba(0,0,0,0.35)`
            : glow ? `0 0 22px ${c}12` : "0 1px 4px rgba(0,0,0,0.18)",
          transform: h ? "translateY(-4px)" : "translateY(0)",
          transition: "all 0.22s cubic-bezier(.4,0,.2,1)",
          animation: `cardIn 0.45s cubic-bezier(.4,0,.2,1) ${idx * 0.06}s both`,
        }}>
        {/* Left accent bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0, width: 3,
          background: `linear-gradient(180deg, ${c} 0%, ${c}33 100%)`,
          borderRadius: "16px 0 0 16px",
          opacity: h ? 1 : 0.55,
          transition: "opacity 0.22s",
        }} />
        {/* Radial glow blob */}
        <div style={{
          position: "absolute", top: -28, right: -28, width: 110, height: 110,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${c}14 0%, transparent 70%)`,
          transform: h ? "scale(1.5)" : "scale(1)",
          transition: "transform 0.35s ease",
          pointerEvents: "none",
        }} />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, position: "relative" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 0.9, marginBottom: 10, fontWeight: 700 }}>{label}</div>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(22px,3.5vw,34px)",
              letterSpacing: 1, lineHeight: 1,
              color: h ? c : (color || T.text),
              wordBreak: "break-word",
              transition: "color 0.22s",
            }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 7, lineHeight: 1.4 }}>{sub}</div>}
          </div>
          {Icon && (
            <div style={{
              background: h ? c + "28" : c + "14",
              borderRadius: 11, padding: "0.625rem", flexShrink: 0,
              border: `1px solid ${c}${h ? "44" : "1e"}`,
              transition: "all 0.22s",
              transform: h ? "scale(1.1) rotate(-4deg)" : "scale(1) rotate(0deg)",
            }}>
              <Icon size={16} color={c} />
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── Chart Card ────────────────────────────────────────────── */
  const ChartCard = ({ title, sub, children, idx, action }) => {
    const h = hov === `chart-${idx}`;
    return (
      <div
        onMouseEnter={() => setHov(`chart-${idx}`)}
        onMouseLeave={() => setHov(null)}
        style={{
          background: T.card,
          border: `1px solid ${h ? T.accent + "22" : T.border}`,
          borderRadius: 16, padding: "1.5rem",
          boxShadow: h ? "0 6px 28px rgba(0,0,0,0.28)" : "0 1px 4px rgba(0,0,0,0.15)",
          transform: h ? "translateY(-2px)" : "translateY(0)",
          transition: "all 0.22s cubic-bezier(.4,0,.2,1)",
          animation: `cardIn 0.45s cubic-bezier(.4,0,.2,1) ${(idx + 6) * 0.06}s both`,
        }}>
        <div style={{ marginBottom: "1.25rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 17, letterSpacing: 1.5, color: T.text }}>{title}</div>
            {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{sub}</div>}
          </div>
          {action}
        </div>
        {children}
      </div>
    );
  };

  /* ── Tooltip ───────────────────────────────────────────────── */
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "0.75rem 1rem", fontSize: 12, boxShadow: "0 6px 24px rgba(0,0,0,0.35)" }}>
        <div style={{ color: T.muted, marginBottom: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, fontWeight: 700, fontSize: 14 }}>
            {p.name}: {typeof p.value === "number" && p.value > 100 ? R$(p.value) : p.value}
          </div>
        ))}
      </div>
    );
  };

  /* ── Plan Bar ──────────────────────────────────────────────── */
  const PlanBar = ({ label, count, total, color }) => {
    const pv = total > 0 ? (count / total) * 100 : 0;
    return (
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
          <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{label}</span>
          <span style={{ fontSize: 12, color: T.muted }}>{count} cliente{count !== 1 ? "s" : ""} · {pv.toFixed(0)}%</span>
        </div>
        <div style={{ height: 7, background: T.surface, borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pv}%`,
            background: `linear-gradient(90deg, ${color}, ${color}bb)`,
            borderRadius: 99,
            transition: "width 0.9s cubic-bezier(.4,0,.2,1)",
            boxShadow: pv > 0 ? `0 0 10px ${color}44` : "none",
          }} />
        </div>
      </div>
    );
  };

  /* ── Activity Item ─────────────────────────────────────────── */
  const ActivityItem = ({ text, badge, badgeColor, time, sub }) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "0.75rem 0", borderBottom: `1px solid ${T.border}` }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: (badgeColor || T.accent) + "18",
        border: `1px solid ${(badgeColor || T.accent)}33`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <UserPlus size={13} color={badgeColor || T.accent} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: T.text, marginBottom: 2 }}>{text}</div>
        {sub && <div style={{ fontSize: 11, color: T.muted }}>{sub}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        {badge && <span style={{ background: (badgeColor || T.accent) + "20", color: badgeColor || T.accent, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, letterSpacing: 0.5 }}>{badge}</span>}
        {time && <span style={{ fontSize: 10, color: T.muted }}>{time}</span>}
      </div>
    </div>
  );

  /* ── Shimmer Skeleton ──────────────────────────────────────── */
  const Skeleton = ({ h = 90, delay = 0 }) => (
    <div style={{
      backgroundImage: `linear-gradient(90deg, ${T.card} 0%, ${T.surface} 40%, ${T.card} 80%)`,
      backgroundSize: "600px 100%",
      animation: `shimmer 1.5s ease-in-out ${delay}s infinite`,
      borderRadius: 16, height: h,
      border: `1px solid ${T.border}`,
    }} />
  );

  /* ── Empty chart placeholder ───────────────────────────────── */
  const EmptyChart = ({ icon: Icon, label }) => (
    <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <Icon size={30} color={T.border} strokeWidth={1.5} />
      <span style={{ fontSize: 13, color: T.muted }}>{label}</span>
    </div>
  );

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(28px,5vw,44px)", letterSpacing: 2.5, margin: "0 0 4px", color: T.text }}>Dashboard</h1>
          <div style={{ color: T.muted, fontSize: 13 }}>Visão executiva da operação SaaS</div>
        </div>
        <button
          onClick={onRefreshMetrics}
          onMouseEnter={e => { e.currentTarget.style.background = T.accent + "18"; e.currentTarget.style.borderColor = T.accent + "44"; e.currentTarget.style.color = T.accent; }}
          onMouseLeave={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text; }}
          style={{ display: "flex", alignItems: "center", gap: 6, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "0.55rem 1.1rem", color: T.text, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", transition: "all 0.18s" }}>
          <RefreshCw size={13} />Atualizar
        </button>
      </div>

      {loadingMet ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            {[...Array(6)].map((_, i) => <Skeleton key={i} delay={i * 0.1} />)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem", marginBottom: "1.25rem" }}>
            <Skeleton h={280} delay={0.6} />
            <Skeleton h={280} delay={0.7} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
            <Skeleton h={240} delay={0.8} />
            <Skeleton h={240} delay={0.9} />
          </div>
        </>
      ) : (
        <>
          {/* KPI Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            <KpiCard label="MRR"             value={R$(m.mrr)}                  icon={DollarSign}  color={T.success} glow idx={0} />
            <KpiCard label="ARR"             value={R$(m.arr)}                  icon={TrendingUp}  color={T.success}      idx={1} />
            <KpiCard label="Clientes Ativos" value={m.active_carwashes ?? 0}    icon={Users}       color={T.accent}  glow idx={2} sub="Assinaturas ativas" />
            <KpiCard label="Churn"           value={pct(churnRate)}             icon={TrendingDown} color={T.danger}      idx={3} sub="Cancelados / total" />
            <KpiCard label="Inadimplência"   value={m.overdue_carwashes ?? 0}   icon={AlertCircle}  color={T.danger}      idx={4} sub="Vencidas ou em atraso" />
            <KpiCard label="Crescimento"     value={m.total_carwashes ?? 0}     icon={UserPlus}     color={T.info}        idx={5} sub="Novas contas no último mês" />
          </div>

          {/* Charts row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem", marginBottom: "1.25rem" }}>
            <ChartCard title="Crescimento de Receita" sub="Evolução da receita registrada por mês" idx={0}>
              {growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={growthData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: T.border, strokeWidth: 1 }} />
                    <Line type="monotone" dataKey="revenue" name="Receita" stroke={T.accent} strokeWidth={2.5}
                      dot={{ fill: T.accent, r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: T.accent + "44", fill: T.accent }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyChart icon={TrendingUp} label="Sem dados ainda" />}
            </ChartCard>

            <ChartCard title="Novos Clientes" sub="Lava rápidos cadastrados por mês" idx={1}>
              {growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={growthData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: T.accent + "0a" }} />
                    <Bar dataKey="new_carwashes" name="Cadastros" fill={T.accent} radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart icon={Users} label="Sem dados ainda" />}
            </ChartCard>
          </div>

          {/* Bottom row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
            <ChartCard title="Distribuição de Planos Ativos" sub="Clientes ativos por modalidade de acesso" idx={2}>
              <PlanBar label="Plano mensal"    count={planMap["monthly"]   || 0} total={totalActive} color={T.accent} />
              <PlanBar label="Plano semestral" count={planMap["semestral"] || 0} total={totalActive} color={T.info} />
              <PlanBar label="Plano anual"     count={planMap["annual"]    || 0} total={totalActive} color={T.success} />
              <PlanBar label="Acesso Cortesia" count={+(m.courtesy_carwashes || 0)} total={totalActive} color={T.warn} />
            </ChartCard>

            <ChartCard title="Atividade Recente" sub="Resumo dos eventos mais importantes" idx={3}>
              {(m.recent_activity && m.recent_activity.length > 0) ? (
                m.recent_activity.slice(0, 5).map((a, i) => (
                  <ActivityItem key={i} text={a.text || "Novo evento"} badge={a.badge || "EVENTO"}
                    badgeColor={a.type === "new" ? T.accent : a.type === "cancel" ? T.danger : T.success}
                    sub={a.sub} time={a.time} />
                ))
              ) : (
                <>
                  {totalActive > 0 && (
                    <ActivityItem text={`${totalActive} lava rápido${totalActive > 1 ? "s" : ""} com assinatura ativa`}
                      badge="ATIVO" badgeColor={T.success} time="agora" />
                  )}
                  {+(m.courtesy_carwashes || 0) > 0 && (
                    <ActivityItem text={`${m.courtesy_carwashes} acesso${m.courtesy_carwashes > 1 ? "s" : ""} cortesia concedido${m.courtesy_carwashes > 1 ? "s" : ""}`}
                      badge="CORTESIA" badgeColor={T.accent} time="recente" />
                  )}
                  {+(m.total_carwashes || 0) === 0 && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "2.5rem 0", color: T.muted, fontSize: 13 }}>
                      <AlertCircle size={26} color={T.border} strokeWidth={1.5} />
                      Nenhuma atividade recente
                    </div>
                  )}
                </>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
