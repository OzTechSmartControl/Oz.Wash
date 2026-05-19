import { useState } from "react";
import { Check, Lock } from "lucide-react";

const SUPABASE_URL  = "https://lolvvhdixbfcrquisnpi.supabase.co";
const SUPABASE_ANON = "sb_publishable_Ud8gUkUl9A3hVrJQTcsI_g_uvwskZax";

const T = {
  bg: "#0b0b0e", surface: "#13131a", card: "#1a1a24", border: "#2a2a3a",
  accent: "#4db8ff", text: "#ece8e0", muted: "#706b63",
  success: "#43d18a", successBg: "#43d18a18", danger: "#f07070", dangerBg: "#f0707018",
};

const inputSt = {
  width: "100%", background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: 8, padding: "0.6rem 0.875rem", color: T.text, fontSize: 14,
  outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif",
};

export default function ResetPassword({ token, onDone }) {
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [err,      setErr]      = useState("");
  const [ok,       setOk]       = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setErr("");
    if (password.length < 6)        { setErr("Senha deve ter ao menos 6 caracteres."); return; }
    if (password !== confirm)        { setErr("As senhas não coincidem."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: "PUT",
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) { setOk(true); setTimeout(onDone, 2500); }
      else { const d = await res.json(); setErr(d.message || "Erro ao redefinir senha."); }
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 3, color: T.accent }}>Oz.LavaRápido</div>
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "2rem" }}>
          {ok ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.successBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <Check size={28} color={T.success} />
              </div>
              <div style={{ color: T.success, fontWeight: 600, fontSize: 15 }}>Senha redefinida!</div>
              <div style={{ color: T.muted, fontSize: 13, marginTop: 6 }}>Redirecionando para o login...</div>
            </div>
          ) : (
            <form onSubmit={handle}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
                <Lock size={18} color={T.accent} />
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 1.5, color: T.text }}>Nova Senha</div>
              </div>
              {err && <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, padding: "0.625rem 1rem", color: T.danger, fontSize: 13, marginBottom: "1rem" }}>{err}</div>}
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Nova Senha</div>
                <input style={inputSt} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Confirmar Senha</div>
                <input style={inputSt} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repita a senha" required />
              </div>
              <button type="submit" disabled={loading}
                style={{ width: "100%", background: T.accent, color: "#000", border: "none", borderRadius: 8, padding: "0.7rem", fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                {loading ? "Salvando..." : "Salvar Nova Senha"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
