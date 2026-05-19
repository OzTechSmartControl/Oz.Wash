import { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Users,
  AlertCircle,
  Gift,
  CreditCard,
  RefreshCw,
  TrendingDown,
  UserPlus,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const T = {
  bg: '#0b0b0e',
  surface: '#13131a',
  card: '#1a1a24',
  border: '#2a2a3a',
  accent: '#4db8ff',
  accentGlow: '#4db8ff22',
  text: '#ece8e0',
  muted: '#706b63',
  mutedLight: '#9a9590',
  success: '#43d18a',
  successBg: '#43d18a18',
  danger: '#f07070',
  dangerBg: '#f0707018',
  info: '#60a5fa',
  infoBg: '#60a5fa18',
};

const R$ = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    +v || 0
  );
const pct = (v) => `${(+(v || 0)).toFixed(1)}%`;

// ── KPI Card ─────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon: Icon, glow }) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${glow ? (color || T.accent) + '33' : T.border}`,
        borderRadius: 14,
        padding: '1.25rem',
        minWidth: 0,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: glow ? `0 0 20px ${color || T.accent}14` : 'none',
      }}
    >
      {glow && (
        <div
          style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: (color || T.accent) + '0e',
            pointerEvents: 'none',
          }}
        />
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              color: T.muted,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(22px,4vw,32px)',
              letterSpacing: 1,
              color: color || T.text,
              lineHeight: 1,
              wordBreak: 'break-word',
            }}
          >
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
              {sub}
            </div>
          )}
        </div>
        {Icon && (
          <div
            style={{
              background: (color || T.accent) + '18',
              borderRadius: 10,
              padding: 9,
              flexShrink: 0,
              border: `1px solid ${color || T.accent}22`,
            }}
          >
            <Icon size={16} color={color || T.accent} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Chart Card ───────────────────────────────────────────────
function ChartCard({ title, sub, children }) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: '1.5rem',
      }}
    >
      <div style={{ marginBottom: '1.25rem' }}>
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 18,
            letterSpacing: 1.5,
            color: T.text,
          }}
        >
          {title}
        </div>
        {sub && (
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: '0.625rem 0.875rem',
        fontSize: 12,
      }}
    >
      <div style={{ color: T.muted, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}:{' '}
          {typeof p.value === 'number' && p.value > 100 ? R$(p.value) : p.value}
        </div>
      ))}
    </div>
  );
};

// ── Plan Distribution Bar ────────────────────────────────────
function PlanBar({ label, count, total, color }) {
  const pctVal = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 13, color: T.text }}>{label}</span>
        <span style={{ fontSize: 12, color: T.muted }}>
          {count} cliente{count !== 1 ? 's' : ''} · {pctVal.toFixed(0)}%
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: T.surface,
          borderRadius: 99,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pctVal}%`,
            background: color,
            borderRadius: 99,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  );
}

// ── Activity Item ─────────────────────────────────────────────
function ActivityItem({ text, badge, badgeColor, time, sub }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '0.75rem 0',
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: (badgeColor || T.accent) + '18',
          border: `1px solid ${badgeColor || T.accent}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <UserPlus size={13} color={badgeColor || T.accent} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: T.text, marginBottom: 2 }}>
          {text}
        </div>
        {sub && <div style={{ fontSize: 11, color: T.muted }}>{sub}</div>}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
          flexShrink: 0,
        }}
      >
        {badge && (
          <span
            style={{
              background: (badgeColor || T.accent) + '22',
              color: badgeColor || T.accent,
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 20,
              letterSpacing: 0.5,
            }}
          >
            {badge}
          </span>
        )}
        {time && <span style={{ fontSize: 10, color: T.muted }}>{time}</span>}
      </div>
    </div>
  );
}

export default function DashboardView({
  metrics,
  loadingMet,
  onRefreshMetrics,
}) {
  const m = metrics || {};

  // Prepara dados dos gráficos
  const growthData = Array.isArray(m.monthly_growth) ? m.monthly_growth : [];
  const planDist = Array.isArray(m.plan_distribution)
    ? m.plan_distribution
    : [];

  const totalActive = +(m.active_carwashes || 0);
  const planMap = {};
  planDist.forEach((p) => {
    planMap[p.plan] = +(p.count || 0);
  });

  // Churn rate
  const churnRate =
    m.total_carwashes > 0
      ? (+(m.cancelled_carwashes || 0) / +(m.total_carwashes || 1)) * 100
      : 0;

  return (
    <div>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(28px,5vw,42px)',
              letterSpacing: 2.5,
              margin: '0 0 4px',
              color: T.text,
            }}
          >
            Dashboard
          </h1>
          <div style={{ color: T.muted, fontSize: 13 }}>
            Visão executiva, limpa e estratégica da operação SaaS
          </div>
        </div>
        <button
          onClick={onRefreshMetrics}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: '0.5rem 1rem',
            color: T.text,
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <RefreshCw size={13} />
          Atualizar
        </button>
      </div>

      {loadingMet ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
          }}
        >
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: '1.25rem',
                height: 90,
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      ) : (
        <>
          {/* ── KPI Grid ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            <KpiCard
              label="MRR"
              value={R$(m.mrr)}
              icon={DollarSign}
              color={T.success}
              glow
            />
            <KpiCard
              label="ARR"
              value={R$(m.arr)}
              icon={TrendingUp}
              color={T.success}
            />
            <KpiCard
              label="Clientes Ativos"
              value={m.active_carwashes ?? 0}
              icon={Users}
              color={T.accent}
              glow
              sub="Assinaturas ativas"
            />
            <KpiCard
              label="Churn"
              value={pct(churnRate)}
              icon={TrendingDown}
              color={T.danger}
              sub="Cancelados / total"
            />
            <KpiCard
              label="Inadimplência"
              value={m.overdue_carwashes ?? 0}
              icon={AlertCircle}
              color={T.danger}
              sub="Vencidas ou em atraso"
            />
            <KpiCard
              label="Crescimento"
              value={m.total_carwashes ?? 0}
              icon={UserPlus}
              color={T.info}
              sub="Novas contas no último mês"
            />
          </div>

          {/* ── Charts row ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.25rem',
            }}
          >
            {/* Crescimento de Receita */}
            <ChartCard
              title="Crescimento de Receita"
              sub="Evolução da receita registrada por mês"
            >
              {growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={growthData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={T.border}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: T.muted }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: T.muted }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Receita"
                      stroke={T.accent}
                      strokeWidth={2.5}
                      dot={{ fill: T.accent, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div
                  style={{
                    height: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: T.muted,
                    fontSize: 13,
                  }}
                >
                  Sem dados ainda
                </div>
              )}
            </ChartCard>

            {/* Novos Clientes */}
            <ChartCard
              title="Novos Clientes"
              sub="Lava rápidos cadastrados por mês"
            >
              {growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={growthData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={T.border}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: T.muted }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: T.muted }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="new_carwashes"
                      name="Cadastros"
                      fill={T.accent}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div
                  style={{
                    height: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: T.muted,
                    fontSize: 13,
                  }}
                >
                  Sem dados ainda
                </div>
              )}
            </ChartCard>
          </div>

          {/* ── Bottom row ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {/* Distribuição de Planos */}
            <ChartCard
              title="Distribuição de Planos Ativos"
              sub="Clientes ativos por modalidade de acesso"
            >
              <PlanBar
                label="Plano mensal"
                count={planMap['monthly'] || 0}
                total={totalActive}
                color={T.accent}
              />
              <PlanBar
                label="Plano semestral"
                count={planMap['semestral'] || 0}
                total={totalActive}
                color={T.info}
              />
              <PlanBar
                label="Plano anual"
                count={planMap['annual'] || 0}
                total={totalActive}
                color={T.success}
              />
              <PlanBar
                label="Acesso Cortesia"
                count={+(m.courtesy_carwashes || 0)}
                total={totalActive}
                color={T.danger}
              />
            </ChartCard>

            {/* Atividade Recente */}
            <ChartCard
              title="Atividade Recente"
              sub="Resumo dos eventos mais importantes"
            >
              {m.recent_activity && m.recent_activity.length > 0 ? (
                m.recent_activity
                  .slice(0, 5)
                  .map((a, i) => (
                    <ActivityItem
                      key={i}
                      text={a.text || 'Novo evento'}
                      badge={a.badge || 'EVENTO'}
                      badgeColor={
                        a.type === 'new'
                          ? T.accent
                          : a.type === 'cancel'
                          ? T.danger
                          : T.success
                      }
                      sub={a.sub}
                      time={a.time}
                    />
                  ))
              ) : (
                <>
                  {totalActive > 0 ? (
                    <ActivityItem
                      text={`${totalActive} lava rápido${
                        totalActive > 1 ? 's' : ''
                      } com assinatura ativa`}
                      badge="ATIVO"
                      badgeColor={T.success}
                      time="agora"
                    />
                  ) : null}
                  {+(m.courtesy_carwashes || 0) > 0 ? (
                    <ActivityItem
                      text={`${m.courtesy_carwashes} acesso${
                        m.courtesy_carwashes > 1 ? 's' : ''
                      } cortesia concedido${
                        m.courtesy_carwashes > 1 ? 's' : ''
                      }`}
                      badge="CORTESIA"
                      badgeColor={T.accent}
                      time="recente"
                    />
                  ) : null}
                  {+(m.total_carwashes || 0) === 0 && (
                    <div
                      style={{
                        color: T.muted,
                        fontSize: 13,
                        textAlign: 'center',
                        padding: '2rem 0',
                      }}
                    >
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
