import { ArrowRight } from "lucide-react";
import T from "../../config/theme";

export default function EmptyState({ icon: Icon, title = "Nenhum dado encontrado", subtitle = "Os dados aparecerão automaticamente aqui.", actionLabel, onAction, compact = false }) {
  return (
    <div style={{ width: "100%", minHeight: compact ? 220 : 320, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: compact ? "2rem" : "3rem" }}>
      <div style={{ width: compact ? 68 : 82, height: compact ? 68 : 82, borderRadius: 24, background: "linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02))", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
        {Icon && <Icon size={compact ? 28 : 34} color={T.mutedLight} />}
      </div>
      <div style={{ color: T.text, fontWeight: 900, fontSize: compact ? 18 : 22, marginBottom: 10 }}>{title}</div>
      <div style={{ color: T.muted, fontSize: compact ? 13 : 14, lineHeight: 1.6, maxWidth: 460, marginBottom: actionLabel ? 24 : 0 }}>{subtitle}</div>
      {actionLabel && (
        <button onClick={onAction} style={{ background: T.accent, border: "none", color: "#0a0808", borderRadius: 14, height: 44, padding: "0 18px", display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          {actionLabel}<ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}
