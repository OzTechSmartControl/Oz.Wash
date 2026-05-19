import T from "../config/theme";
import EmptyState from "./EmptyState";
import { Database } from "lucide-react";

export default function DataTable({ columns = [], rows = [], emptyTitle = "Nenhum registro encontrado", emptySubtitle = "Ajuste os filtros ou aguarde novos dados." }) {
  if (!rows.length) return <EmptyState icon={Database} title={emptyTitle} subtitle={emptySubtitle} />;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={{ textAlign: col.align || "left", padding: "0.85rem 1rem", fontSize: 10, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.id || ri} style={{ borderBottom: ri < rows.length - 1 ? `1px solid ${T.border}` : "none" }}>
                {columns.map(col => (
                  <td key={col.key} style={{ padding: "0.9rem 1rem", color: col.muted ? T.mutedLight : T.text, fontSize: 13, textAlign: col.align || "left", whiteSpace: col.nowrap ? "nowrap" : "normal" }}>
                    {col.render ? col.render(row) : row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
