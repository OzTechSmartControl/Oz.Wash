import { useEffect, useState, useCallback } from "react";
import { Plus, Check, X, RefreshCw, Infinity, Clock, Gift, Search, Mail, Ban } from "lucide-react";
import { T_DARK } from "../../config/theme";
import { fDate } from "../../utils/formatters";

const fDatetime = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("pt-BR") + ", " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

export default function CourtesyView({ supabase, T: propT }) {
  const T = propT || T_DARK;

  // ── Styles ───────────────────────────────────────────────────
  const inputSt = {
    width: "100%", background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 8, padding: "0.65rem 0.875rem", color: T.text, fontSize: 14,
    outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif",
  };

  const Label = ({ children }) => (
    <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600 }}>{children}</div>
  );

  const KpiCard = ({ label, value, color, icon: Icon, sub }) => (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "1.1rem 1.25rem", flex: 1, minWidth: 120 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
        <div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, fontWeight: 600 }}>{label}</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 34, letterSpacing: 1, color: color || T.text, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{sub}</div>}
        </div>
        {Icon && (
          <div style={{ background: (color || T.accent) + "18", borderRadius: 10, padding: 9, border: `1px solid ${(color || T.accent)}22` }}>
            <Icon size={16} color={color || T.accent} />
          </div>
        )}
      </div>
    </div>
  );

  // ── State ────────────────────────────────────────────────────
  const [courtesies,  setCourtesies]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(false);
  const [revokeModal, setRevokeModal] = useState(false);
  const [revokeEmail, setRevokeEmail] = useState("");
  const [err,         setErr]         = useState("");
  const [filter,      setFilter]      = useState("all"); // all | active | expired | revoked
  const [search,      setSearch]      = useState("");
  const [form, setForm] = useState({ email: "", accessType: "indefinido", expiresAt: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("courtesy_access")
        .select("*, carwashes(name, id)")
        .order("created_at", { ascending: false });
      setCourtesies(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  // ── Computed ─────────────────────────────────────────────────
  const now = new Date();
  const statusOf = (c) => {
    if (c.status === "revoked" || c.revoked_at) return "revoked";
    if (c.expires_at && new Date(c.expires_at) < now) return "expired";
    return "active";
  };

  const kpis = {
    total:    courtesies.length,
    active:   courtesies.filter(c => statusOf(c) === "active").length,
    expired:  courtesies.filter(c => statusOf(c) === "expired").length,
    revoked:  courtesies.filter(c => statusOf(c) === "revoked").length,
    converted:courtesies.filter(c => c.carwash_id).length,
  };

  const filtered = courtesies.filter(c => {
    const s = statusOf(c);
    if (filter === "active"  && s !== "active")  return false;
    if (filter === "expired" && s !== "expired") return false;
    if (filter === "revoked" && s !== "revoked") return false;
    if (search) {
      const q = search.toLowerCase();
      return (c.email || "").toLowerCase().includes(q)
          || (c.notes || "").toLowerCase().includes(q)
          || (c.carwashes?.name || "").toLowerCase().includes(q);
    }
    return true;
  });

  // ── Actions ──────────────────────────────────────────────────
  const openModal = () => {
    setForm({ email: "", accessType: "indefinido", expiresAt: "", notes: "" });
    setErr(""); setModal(true);
  };

  const grant = async () => {
    setErr("");
    if (!form.email.trim()) { setErr("E-mail é obrigatório."); return; }
    if (form.accessType === "prazo" && !form.expiresAt) { setErr("Selecione a data de expiração."); return; }
    try {
      const expiresAt = form.accessType === "prazo"
        ? new Date(form.expiresAt + "T23:59:59").toISOString()
        : null;
      const { error } = await supabase.from("courtesy_access").insert({
        email: form.email.trim(),
        access_type: form.accessType,
        expires_at: expiresAt,
        notes: form.notes,
        granted_by: "super_admin",
      });
      if (error) throw new Error(error.message);
      setModal(false); load();
    } catch (e) { setErr(e.message); }
  };

  const revoke = async (id) => {
    if (!confirm("Revogar esta cortesia?")) return;
    await supabase
      .from("courtesy_access")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", id);
    load();
  };

  const revokeByEmail = async () => {
    if (!revokeEmail.trim()) return;
    await supabase
      .from("courtesy_access")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("email", revokeEmail.trim())
      .neq("status", "revoked");
    setRevokeModal(false); setRevokeEmail(""); load();
  };

  // ── Toggle btn ───────────────────────────────────────────────
  const toggleBtn = (active) => ({
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "0.55rem 0.75rem", borderRadius: 8, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: active ? 600 : 400,
    border: `1px solid ${active ? T.accent : T.border}`,
    background: active ? `${T.accent}18` : T.surface,
    color: active ? T.accent : T.muted, transition: "all 0.15s",
  });

  const filterTab = (id, label) => {
    const active = filter === id;
    return (
      <button key={id} onClick={() => setFilter(id)} style={{
        padding: "0.45rem 1rem", borderRadius: 8, border: `1px solid ${active ? T.accent : T.border}`,
        background: active ? `${T.accent}18` : T.surface, color: active ? T.accent : T.muted,
        cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400,
        fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
      }}>{label}</button>
    );
  };

  const statusBadge = (s) => {
    const map = {
      active:  { label: "Ativa",    color: T.success },
      expired: { label: "Expirada", color: T.danger  },
      revoked: { label: "Revogada", color: T.muted   },
    };
    const { label, color } = map[s] || {};
    return <span style={{ background: color + "22", color, borderRadius: 5, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>{label}</span>;
  };

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Gift size={22} color={T.accent} />
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(26px,5vw,36px)", letterSpacing: 2.5, margin: 0, color: T.text }}>Cortesias</h1>
          </div>
          <div style={{ color: T.muted, fontSize: 13, marginTop: 3 }}>Acessos cortesia liberados manualmente</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={load}
            style={{ display: "flex", alignItems: "center", gap: 6, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.5rem 1rem", color: T.text, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            <RefreshCw size={13} />Atualizar
          </button>
          <button onClick={() => setRevokeModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, padding: "0.5rem 1rem", color: T.danger, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
            <Ban size={13} />Revogar Acesso
          </button>
          <button onClick={openModal}
            style={{ display: "flex", alignItems: "center", gap: 6, background: `linear-gradient(135deg, ${T.accent}, ${T.accent}cc)`, border: "none", borderRadius: 8, padding: "0.5rem 1rem", color: "#000", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", boxShadow: `0 4px 14px ${T.accent}33` }}>
            <Plus size={13} />Novo acesso cortesia
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "flex", gap: "0.875rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <KpiCard label="Total Concedidas" value={kpis.total}     color={T.accent}   icon={Gift}  />
        <KpiCard label="Ativas"           value={kpis.active}    color={T.success}  icon={Check} />
        <KpiCard label="Expiradas"        value={kpis.expired}   color="#f59e0b"    icon={Clock} />
        <KpiCard label="Revogadas"        value={kpis.revoked}   color={T.danger}   icon={Ban}   />
        <KpiCard label="Convertidas"      value={kpis.converted} color={T.info}     icon={Gift}  sub="Fase 2" />
      </div>

      {/* ── Busca + Filtros ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} color={T.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            style={{ ...inputSt, paddingLeft: "2.25rem" }}
            placeholder="Buscar por e-mail, motivo ou observação..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {filterTab("all",     "Todos")}
          {filterTab("active",  "Ativas")}
          {filterTab("expired", "Expiradas")}
          {filterTab("revoked", "Revogadas")}
        </div>
      </div>

      {/* ── Tabela ── */}
      {loading ? (
        <div style={{ color: T.muted, padding: "2rem 0" }}>Carregando...</div>
      ) : (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Cliente", "Duração", "Status", "Criado em", "Expiração", "Usado por", "Ações"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const s = statusOf(c);
                  const isIndefinido = !c.expires_at;
                  return (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      {/* Cliente */}
                      <td style={{ padding: "0.875rem 1rem", fontSize: 13, color: T.text, fontWeight: 500 }}>
                        {c.email}
                      </td>

                      {/* Duração */}
                      <td style={{ padding: "0.875rem 1rem", fontSize: 13, color: T.muted, whiteSpace: "nowrap" }}>
                        {isIndefinido
                          ? <span style={{ color: T.info }}>∞ Indeterminado</span>
                          : <span style={{ color: T.accent }}>⏱ Prazo</span>}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "0.875rem 1rem" }}>
                        {statusBadge(s)}
                      </td>

                      {/* Criado em */}
                      <td style={{ padding: "0.875rem 1rem", fontSize: 12, color: T.muted, whiteSpace: "nowrap" }}>
                        {c.created_at ? fDate(c.created_at.substring(0, 10)) : "—"}
                      </td>

                      {/* Expiração */}
                      <td style={{ padding: "0.875rem 1rem", fontSize: 12, whiteSpace: "nowrap" }}>
                        {isIndefinido
                          ? <span style={{ color: T.success }}>Sem expiração</span>
                          : <span style={{ color: "#f59e0b" }}>{fDate(c.expires_at.substring(0, 10))}</span>}
                      </td>

                      {/* Usado por */}
                      <td style={{ padding: "0.875rem 1rem", minWidth: 160 }}>
                        {c.carwashes ? (
                          <div>
                            <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{c.carwashes.name}</div>
                            <div style={{ fontSize: 11, color: T.muted }}>{c.email}</div>
                            {c.created_at && <div style={{ fontSize: 10, color: T.muted }}>{fDatetime(c.created_at)}</div>}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: T.muted }}>—</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td style={{ padding: "0.875rem 1rem" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <a href={`mailto:${c.email}`}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${T.accent}18`, border: `1px solid ${T.accent}44`, borderRadius: 7, padding: "5px 10px", color: T.accent, cursor: "pointer", fontSize: 11, fontWeight: 600, textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>
                            <Mail size={11} />Enviar e-mail
                          </a>
                          {s !== "revoked" && (
                            <button onClick={() => revoke(c.id)}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 7, padding: "5px 10px", color: T.danger, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                              <Ban size={11} />Revogar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: T.muted, fontSize: 13 }}>
                      Nenhuma cortesia encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal Nova Cortesia ── */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(3px)" }}
          onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: "1.75rem", width: "100%", maxWidth: 460, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: T.text }}>Nova Cortesia</div>
              <button onClick={() => setModal(false)} style={{ width: 30, height: 30, borderRadius: 8, background: T.surface, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.muted }}>
                <X size={14} />
              </button>
            </div>

            {err && <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, padding: "0.625rem 1rem", color: T.danger, fontSize: 13, marginBottom: "1.25rem" }}>{err}</div>}

            <div style={{ marginBottom: "1.25rem" }}>
              <Label>E-mail do Usuário</Label>
              <input style={inputSt} type="email" placeholder="usuario@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <Label>Tipo de Acesso</Label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={toggleBtn(form.accessType === "indefinido")} onClick={() => setForm(f => ({ ...f, accessType: "indefinido", expiresAt: "" }))}>
                  <Infinity size={14} />Indeterminado
                </button>
                <button type="button" style={toggleBtn(form.accessType === "prazo")} onClick={() => setForm(f => ({ ...f, accessType: "prazo" }))}>
                  <Clock size={14} />Prazo determinado
                </button>
              </div>
            </div>

            {form.accessType === "prazo" && (
              <div style={{ marginBottom: "1.25rem" }}>
                <Label>Data de Expiração</Label>
                <input style={{ ...inputSt, colorScheme: "dark" }} type="date" value={form.expiresAt} min={new Date().toISOString().substring(0, 10)} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
              </div>
            )}

            <div style={{ marginBottom: "1.75rem" }}>
              <Label>Observação</Label>
              <textarea style={{ ...inputSt, resize: "vertical", minHeight: 72 }} placeholder="Ex: Cliente parceiro, teste interno, demonstração comercial..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "0.7rem", color: T.text, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
                Cancelar
              </button>
              <button onClick={grant} style={{ flex: 1, background: `linear-gradient(135deg, ${T.accent}, ${T.accent}cc)`, border: "none", borderRadius: 10, padding: "0.7rem", color: "#000", cursor: "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "'DM Sans', sans-serif", boxShadow: `0 4px 16px ${T.accent}33` }}>
                <Check size={15} />Liberar cortesia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Revogar por E-mail ── */}
      {revokeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(3px)" }}
          onClick={e => { if (e.target === e.currentTarget) setRevokeModal(false); }}>
          <div style={{ background: T.card, border: `1px solid ${T.danger}33`, borderRadius: 18, padding: "1.75rem", width: "100%", maxWidth: 420, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: T.danger }}>Revogar Acesso</div>
              <button onClick={() => setRevokeModal(false)} style={{ width: 30, height: 30, borderRadius: 8, background: T.surface, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.muted }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <Label>E-mail do usuário</Label>
              <input style={inputSt} type="email" placeholder="usuario@email.com" value={revokeEmail} onChange={e => setRevokeEmail(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setRevokeModal(false)} style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "0.7rem", color: T.text, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
                Cancelar
              </button>
              <button onClick={revokeByEmail} style={{ flex: 1, background: T.dangerBg, border: `1px solid ${T.danger}55`, borderRadius: 10, padding: "0.7rem", color: T.danger, cursor: "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "'DM Sans', sans-serif" }}>
                <Ban size={15} />Revogar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
