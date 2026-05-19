import { useEffect, useState, useCallback } from "react";
import { Search, RefreshCw } from "lucide-react";
import { T_DARK } from "../../config/theme";
import { fDate } from "../../utils/formatters";

const planLabel = { monthly: "Mensal", semiannual: "Semestral", annual: "Anual", courtesy: "Cortesia" };

export default function ClientsView({ supabase, T: propT }) {
  const T = propT || T_DARK;

  const inputSt = {
    width: "100%", background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 8, padding: "0.6rem 0.875rem", color: T.text, fontSize: 14,
    outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif",
  };

  const Badge = ({ children, color = T.accent }) => (
    <span style={{ background: color + "22", color, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{children}</span>
  );

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("carwashes")
        .select("id, name, plan, plan_expires_at, created_at, profiles(count)")
        .order("created_at", { ascending: false });
      setClients(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const now      = new Date();
  const filtered = clients.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()));

  const statusOf = (c) => {
    if (!c.plan_expires_at) return "sem_plano";
    const exp = new Date(c.plan_expires_at);
    if (exp < now) return "expirado";
    return "ativo";
  };

  const statusColor = (s) => ({ ativo: T.success, expirado: T.danger, sem_plano: T.muted }[s] || T.muted);
  const statusText  = (s) => ({ ativo: "Ativo", expirado: "Expirado", sem_plano: "Sem plano" }[s] || s);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(26px,6vw,38px)", letterSpacing: 2.5, margin: 0, color: T.text }}>Clientes Ativos</h1>
        <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.5rem 1rem", color: T.text, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
          <RefreshCw size={13} />Atualizar
        </button>
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <input style={inputSt} placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <div style={{ color: T.muted }}>Carregando...</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Nome", "Plano", "Vencimento", "Status", "Cadastro"].map(c => (
              <th key={c} style={{ textAlign: "left", padding: "0 0.75rem 10px", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>{c}</th>
            ))}</tr></thead>
            <tbody>
              {filtered.map(c => {
                const s = statusOf(c);
                return (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "0.75rem", fontSize: 13, color: T.text, fontWeight: 500 }}>{c.name || "—"}</td>
                    <td style={{ padding: "0.75rem" }}><Badge color={T.accent}>{planLabel[c.plan] || c.plan || "—"}</Badge></td>
                    <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{c.plan_expires_at ? fDate(c.plan_expires_at.substring(0, 10)) : "—"}</td>
                    <td style={{ padding: "0.75rem" }}><Badge color={statusColor(s)}>{statusText(s)}</Badge></td>
                    <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{c.created_at ? fDate(c.created_at.substring(0, 10)) : "—"}</td>
                  </tr>
                );
              })}
              {!filtered.length && <tr><td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: T.muted }}>Nenhum cliente encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
