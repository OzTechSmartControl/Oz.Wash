import T from "../../config/theme";

export default function ActivityFeed({ items = [], emptyText = "Nenhuma atividade recente." }) {
  if (!items.length) return <div style={{ color: T.muted, fontSize: 13, padding: "1rem 0" }}>{emptyText}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color || T.accent, flexShrink: 0, marginTop: 5 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.4 }}>{item.text || item.message || "—"}</div>
            {item.time && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{item.time}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
