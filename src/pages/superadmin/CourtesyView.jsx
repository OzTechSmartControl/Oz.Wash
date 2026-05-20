import { useEffect, useState, useCallback } from "react";
import { Plus, Check, X, RefreshCw, Infinity, Clock } from "lucide-react";
import { T_DARK } from "../../config/theme";
import { fDate } from "../../utils/formatters";

export default function CourtesyView({ supabase, T: propT }) {
  const T = propT || T_DARK;

  const inputSt = {
    width: "100%", background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 8, padding: "0.65rem 0.875rem", color: T.text, fontSize: 14,
    outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif",
  };

  const Label = ({ children }) => (
    <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600 }}>
      {children}
    </div>
  );

  const Badge = ({ children, color }) => (
    <span style={{ background: (color || T.accent) + "22", color: color || T.accent, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{children}</span>
  );

  const [courtesies, setCourtesies] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(false);
  const [err,        setErr]        = useState("");
  const [form, setForm] = useState({
    email:      "",
    accessType: "indefinido",   // "indefinido" | "prazo"
    expiresAt:  "",             // date string YYYY-MM-DD (só para prazo)
    notes:      "",
  });

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

  const openModal = () => {
    setForm({ email: "", accessType: "indefinido", expiresAt: "", notes: "" });
    setErr("");
    setModal(true);
  };

  const grant = async () => {
    setErr("");
    if (!form.email.trim()) { setErr("E-mail é obrigatório."); return; }
    if (form.accessType === "prazo" && !form.expiresAt) { setErr("Selecione a data de expiração."); return; }
    try {
      const expiresAt = form.accessType === "prazo"
        ? new Date(form.expiresAt + "T23:59:59").toISOString()
        : null;   // null = indeterminado

      const { error } = await supabase.from("courtesy_access").insert({
        granted_to_email: form.email.trim(),
        expires_at:       expiresAt,
        notes:            form.notes,
        granted_by:       "super_admin",
      });
      if (error) throw new Error(error.message);
      setModal(false);
      load();
    } catch (e) { setErr(e.message); }
  };

  const revoke = async (id) => {
    if (!confirm("Revogar cortesia?")) return;
    await supabase.from("courtesy_access").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  // ── Toggle button style ──────────────────────────────────────
  const toggleBtn = (active) => ({
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "0.55rem 0.75rem", borderRadius: 8, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: active ? 600 : 400,
    border: `1px solid ${active ? T.accent : T.border}`,
    background: active ? `${T.accent}18` : T.surface,
    color: active ? T.accent : T.muted,
    transition: "all 0.15s",
  });

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(26px,6vw,38px)", letterSpacing: 2.5, margin: 0, color: T.text }}>Cortesias</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.5rem 1rem", color: T.text, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            <RefreshCw size={13} />Atualizar
          </button>
          <button onClick={openModal} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", borderRadius: 8, padding: "0.5rem 1rem", color: "#000", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
            <Plus size={13} />Nova Cortesia
          </button>
        </div>
      </div>

      {/* ── Tabela ── */}
      {loading ? <div style={{ color: T.muted }}>Carregando...</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["E-mail", "Lava Rápido", "Tipo", "Expira em", "Status", ""].map(c => (
              <th key={c} style={{ textAlign: "left", padding: "0 0.75rem 10px", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>{c}</th>
            ))}</tr></thead>
            <tbody>
              {courtesies.map(c => {
                const revoked  = !!c.revoked_at;
                const expired  = !revoked && c.expires_at && new Date(c.expires_at) < new Date();
                const status   = revoked ? "Revogada" : expired ? "Expirada" : "Ativa";
                const sColor   = revoked || expired ? T.danger : T.success;
                const isIndefinido = !c.expires_at;
                return (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "0.75rem", fontSize: 13, color: T.text }}>{c.granted_to_email}</td>
                    <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>{c.carwashes?.name || "—"}</td>
                    <td style={{ padding: "0.75rem" }}>
                      <Badge color={isIndefinido ? T.info : T.accent}>
                        {isIndefinido ? "∞ Indeterminado" : "⏱ Prazo"}
                      </Badge>
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: 13, color: T.muted }}>
                      {isIndefinido ? "—" : c.expires_at ? fDate(c.expires_at.substring(0, 10)) : "—"}
                    </td>
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
              {!courtesies.length && <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: T.muted }}>Nenhuma cortesia encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Nova Cortesia ── */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(3px)" }}
          onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>

          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: "1.75rem", width: "100%", maxWidth: 460, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>

            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: T.text }}>Nova Cortesia</div>
              <button onClick={() => setModal(false)}
                style={{ width: 30, height: 30, borderRadius: 8, background: T.surface, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.muted }}>
                <X size={14} />
              </button>
            </div>

            {err && (
              <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, padding: "0.625rem 1rem", color: T.danger, fontSize: 13, marginBottom: "1.25rem" }}>
                {err}
              </div>
            )}

            {/* E-mail */}
            <div style={{ marginBottom: "1.25rem" }}>
              <Label>E-mail do Usuário</Label>
              <input
                style={inputSt}
                type="email"
                placeholder="usuario@email.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            {/* Tipo de acesso */}
            <div style={{ marginBottom: "1.25rem" }}>
              <Label>Tipo de Acesso</Label>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  style={toggleBtn(form.accessType === "indefinido")}
                  onClick={() => setForm(f => ({ ...f, accessType: "indefinido", expiresAt: "" }))}>
                  <Infinity size={14} />Indeterminado
                </button>
                <button
                  type="button"
                  style={toggleBtn(form.accessType === "prazo")}
                  onClick={() => setForm(f => ({ ...f, accessType: "prazo" }))}>
                  <Clock size={14} />Prazo determinado
                </button>
              </div>
            </div>

            {/* Data de expiração (só quando prazo determinado) */}
            {form.accessType === "prazo" && (
              <div style={{ marginBottom: "1.25rem" }}>
                <Label>Data de Expiração</Label>
                <input
                  style={{ ...inputSt, colorScheme: "dark" }}
                  type="date"
                  value={form.expiresAt}
                  min={new Date().toISOString().substring(0, 10)}
                  onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                />
              </div>
            )}

            {/* Observação */}
            <div style={{ marginBottom: "1.75rem" }}>
              <Label>Observação</Label>
              <textarea
                style={{ ...inputSt, resize: "vertical", minHeight: 72 }}
                placeholder="Ex: Cliente parceiro, teste interno, demonstração comercial..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {/* Botões */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setModal(false)}
                style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "0.7rem", color: T.text, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif', fontWeight: 500" }}>
                Cancelar
              </button>
              <button onClick={grant}
                style={{ flex: 1, background: `linear-gradient(135deg, ${T.accent}, ${T.accent}cc)`, border: "none", borderRadius: 10, padding: "0.7rem", color: "#000", cursor: "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "'DM Sans', sans-serif", boxShadow: `0 4px 16px ${T.accent}33` }}>
                <Check size={15} />Liberar cortesia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
