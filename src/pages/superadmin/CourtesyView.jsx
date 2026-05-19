import { useEffect, useState, useCallback } from "react";
import { Plus, Check, X, RefreshCw } from "lucide-react";
import { T_DARK } from "../../config/theme";
import { fDate } from "../../utils/formatters";

export default function CourtesyView({ supabase, T: propT }) {
  const T = propT || T_DARK;

  const inputSt = {
    width: "100%", background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 8, padding: "0.6rem 0.875rem", color: T.text, fontSize: 14,
    outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif",
  };

  const Badge = ({ children, color }) => (
    <span style={{ background: (color || T.accent) + "22", color: color || T.accent, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{children}</span>
  );

  const [courtesies, setCourtesies] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(false);
  const [err,        setErr]        = useState("");
  const [form, setForm] = useState({ email: "", days: "30", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("courtesy_access")
        .select("*, carwashes(name)")
        .order("granted_at", { ascending: false });
      setCourtesies(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const grant = async () => {
    setErr("");
    if (!form.email.trim() || !form.days) { setErr("E-mail e dias são obrigatórios."); return; }
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + +form.days);
      const { error } = await supabase.from("courtesy_access").insert({
        granted_to_email: form.email.trim(),
        expires_at: expiresAt.toISOString(),
        notes: form.notes,
        granted_by: "super_admin",
      });
      if (error) throw new Error(error.message);
      setModal(false);
      setForm({ email: "", days: "30", notes: "" });
      load();
    } catch (e) { setErr(e.message); }
  };

  const revoke = async (id) => {
    if (!confirm("Revogar cortesia?")) return;
    await supabase.from("courtesy_access").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(26px,6vw,38px)", letterSpacing: 2.5, margin: 0, color: T.text }}>Cortesias</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.5rem 1rem", color: T.text, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            <RefreshCw size={13} />Atualizar
          </button>
          <button onClick={() => setModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", borderRadius: 8, padding: "0.5rem 1rem", color: "#000", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
            <Plus size={13} />Nova Cortesia
          </button>
        </div>
      </div>

      {loading ? <div style={{ color: T.muted }}>Carregando...</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["E-mail", "Lava Rápido", "Expira em", "Status", ""].map(c => (
              <th key={c} style={{ textAlign: "left", padding: "0 0.75rem 10px", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>{c}</th>
            ))}</tr></thead>
            <tbody>
              {courtesies.map(c => {
                const revoked = !!c.revoked_at;
                const expired = !revoked && c.expires_at && new Date(c.expires_at) < new Date();
                const status  = revoked ? "Revogada" : expired ? "Expirada" : "Ativa";
                const sColor  = revoked || expired ? T.danger : T.success;
                return (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "0.75rem", fontSize: 13, color: T.text }}>{c.granted_to_email}</td>
                    <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{c.carwashes?.name || "—"}</td>
                    <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{c.expires_at ? fDate(c.expires_at.substring(0, 10)) : "—"}</td>
                    <td style={{ padding: "0.75rem" }}><Badge color={sColor}>{status}</Badge></td>
                    <td style={{ padding: "0.75rem" }}>
                      {!revoked && (
                        <button onClick={() => revoke(c.id)} style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 6, padding: "4px 10px", color: T.danger, cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif" }}>
                          <X size={11} />Revogar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!courtesies.length && <tr><td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: T.muted }}>Nenhuma cortesia encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 420 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 1.5, color: T.text, marginBottom: "1.5rem" }}>Nova Cortesia</div>
            {err && <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, padding: "0.625rem 1rem", color: T.danger, fontSize: 13, marginBottom: "1rem" }}>{err}</div>}
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>E-mail do Admin *</div>
              <input style={inputSt} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Dias de acesso *</div>
              <input style={inputSt} type="number" min="1" value={form.days} onChange={e => setForm(f => ({ ...f, days: e.target.value }))} />
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Observações</div>
              <textarea style={{ ...inputSt, resize: "vertical", minHeight: 60 }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setModal(false)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.5rem 1.25rem", color: T.text, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>Cancelar</button>
              <button onClick={grant} style={{ background: T.accent, border: "none", borderRadius: 8, padding: "0.5rem 1.25rem", color: "#000", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif" }}>
                <Check size={13} />Conceder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
