import { useState } from "react";
import { ChevronRight, ChevronLeft, Check, Gift } from "lucide-react";

const SUPABASE_URL  = "https://lolvvhdixbfcrquisnpi.supabase.co";
const SUPABASE_ANON = "sb_publishable_Ud8gUkUl9A3hVrJQTcsI_g_uvwskZax";

const T = {
  bg: "#0b0b0e", surface: "#13131a", card: "#1a1a24", border: "#2a2a3a",
  accent: "#4db8ff", text: "#ece8e0", muted: "#706b63", mutedLight: "#9a9590",
  success: "#43d18a", danger: "#f07070", dangerBg: "#f0707018",
  info: "#4db8ff", infoBg: "#4db8ff18",
};

const ACCENT_PRESETS = [
  { label: "Azul",     hex: "#4db8ff" },
  { label: "Verde",    hex: "#43d18a" },
  { label: "Laranja",  hex: "#f59e0b" },
  { label: "Roxo",     hex: "#a78bfa" },
  { label: "Rosa",     hex: "#f472b6" },
  { label: "Vermelho", hex: "#f07070" },
  { label: "Branco",   hex: "#ece8e0" },
];

const hdr = (tok, extra = {}) => ({
  apikey: SUPABASE_ANON,
  Authorization: `Bearer ${tok || SUPABASE_ANON}`,
  "Content-Type": "application/json",
  ...extra,
});

const apiAuth = {
  signUp: (email, password) =>
    fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(r => r.json()),

  login: (email, password) =>
    fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(r => r.json()),
};

const canRegister = (email) =>
  fetch(`${SUPABASE_URL}/rest/v1/rpc/can_register_with_email`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ p_email: email }),
  }).then(r => r.json());

const inputSt = {
  width: "100%", background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: 10, padding: "0.75rem 1rem", color: T.text, fontSize: 14,
  outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif",
  WebkitAppearance: "none", appearance: "none",
};

const Btn = ({ children, onClick, disabled, variant = "primary", style }) => {
  const v = {
    primary: { background: T.accent, color: "#0a0808", border: "none" },
    ghost:   { background: "transparent", color: T.text, border: `1px solid ${T.border}` },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...v[variant], borderRadius: 10, padding: "0.7rem 1.5rem", fontSize: 14, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "'DM Sans', sans-serif", opacity: disabled ? 0.5 : 1, ...style }}>
      {children}
    </button>
  );
};

const FLabel = ({ c }) => <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>{c}</div>;
const FG = ({ label, children }) => <div style={{ marginBottom: "1.1rem" }}>{label && <FLabel c={label} />}{children}</div>;
const FInput = ({ label, ...p }) => <FG label={label}><input style={inputSt} {...p} /></FG>;

const ErrorBar = ({ msg }) => msg ? (
  <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, padding: "0.625rem 1rem", color: T.danger, fontSize: 13, marginBottom: "1rem" }}>{msg}</div>
) : null;

/* ─────────────────────────────────────────────────────────────────
   Props:
     plan          – "monthly" | "semiannual" | "annual" | "courtesy"
     onComplete    – (accessToken, refreshToken) => void
     isCourtesy    – if true, skip account-creation step; use courtesyToken
     courtesyToken – already-valid JWT from magic link / session
     courtesyEmail – email of the courtesy user
   ───────────────────────────────────────────────────────────────── */
export default function Onboarding({
  plan,
  onComplete,
  isCourtesy    = false,
  courtesyToken = "",
  courtesyEmail = "",
}) {
  // For courtesy: steps are ["Lava Rápido", "Pronto!"]  (idx 0–1)
  // For paid:     steps are ["Sua Conta", "Lava Rápido", "Pronto!"]  (idx 0–2)
  const stepLabels = isCourtesy
    ? ["Lava Rápido", "Pronto!"]
    : ["Sua Conta", "Lava Rápido", "Pronto!"];

  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  // token state: pre-filled for courtesy users
  const [token, setToken] = useState(courtesyToken || "");

  const [account, setAccount] = useState({ email: courtesyEmail || "", password: "", confirm: "" });
  const [shop,    setShop]    = useState({ name: "", phone: "", accent_color: "#4db8ff" });

  /* ── Step 0 (paid only): create account ── */
  const handleCreateAccount = async () => {
    setErr(""); setLoading(true);
    if (!account.email || !account.password) { setErr("E-mail e senha são obrigatórios."); setLoading(false); return; }
    if (account.password !== account.confirm) { setErr("As senhas não coincidem."); setLoading(false); return; }
    if (account.password.length < 6) { setErr("Senha deve ter ao menos 6 caracteres."); setLoading(false); return; }
    try {
      const ok = await canRegister(account.email);
      if (!ok) { setErr("Este e-mail não possui um pagamento confirmado. Verifique ou adquira um plano."); setLoading(false); return; }
      const data = await apiAuth.signUp(account.email, account.password);
      if (data.error || !data.id) {
        const loginData = await apiAuth.login(account.email, account.password);
        if (!loginData.access_token) { setErr(data.error_description || data.msg || "Erro ao criar conta."); setLoading(false); return; }
        setToken(loginData.access_token);
      } else {
        const loginData = await apiAuth.login(account.email, account.password);
        if (loginData.access_token) setToken(loginData.access_token);
      }
      setStep(1);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  /* ── Step 0 (courtesy) / Step 1 (paid): create carwash ── */
  const handleCreateShop = async () => {
    setErr(""); setLoading(true);
    if (!shop.name.trim()) { setErr("Nome do lava rápido é obrigatório."); setLoading(false); return; }
    const usedToken = courtesyToken || token;

    // Preview/demo sem token — avança direto para a tela de sucesso
    if (!usedToken) {
      setStep(isCourtesy ? 1 : 2);
      setLoading(false);
      return;
    }

    try {
      if (isCourtesy) {
        // RPC SECURITY DEFINER: cria carwash + vincula cortesia + promove perfil
        // Tudo dentro do RPC para contornar RLS do carwashes
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/claim_courtesy_access`, {
          method: "POST",
          headers: hdr(usedToken),
          body: JSON.stringify({
            p_email:        courtesyEmail,
            p_name:         shop.name.trim(),
            p_phone:        shop.phone || null,
            p_accent_color: shop.accent_color,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setErr(data.message || "Erro ao criar lava rápido."); setLoading(false); return; }
      } else {
        // Fluxo pago: INSERT direto (RLS liberado para autenticados) + claim subscription
        const res = await fetch(`${SUPABASE_URL}/rest/v1/carwashes`, {
          method: "POST",
          headers: { ...hdr(usedToken), Prefer: "return=representation" },
          body: JSON.stringify({ name: shop.name.trim(), phone: shop.phone, accent_color: shop.accent_color }),
        });
        const carwashes = await res.json();
        if (!res.ok) { setErr(carwashes.message || "Erro ao criar lava rápido."); setLoading(false); return; }
        const carwash = Array.isArray(carwashes) ? carwashes[0] : carwashes;

        await fetch(`${SUPABASE_URL}/rest/v1/rpc/claim_paid_subscription`, {
          method: "POST",
          headers: hdr(usedToken),
          body: JSON.stringify({ p_email: account.email, p_carwash_id: carwash.id, p_plan: plan }),
        });
      }

      // Avança para "Pronto!"
      setStep(isCourtesy ? 1 : 2);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const handleFinish = () => onComplete(courtesyToken || token, null);

  /* ── Render ── */
  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 34, letterSpacing: 3, color: T.accent }}>Oz.LavaRápido</div>
          {isCourtesy ? (
            <div style={{ color: T.muted, fontSize: 13, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Gift size={13} color={T.accent} /> Acesso cortesia ativado
            </div>
          ) : (
            <div style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>Configuração inicial da conta</div>
          )}
        </div>

        {/* Courtesy banner */}
        {isCourtesy && (
          <div style={{ background: T.infoBg, border: `1px solid ${T.info}33`, borderRadius: 12, padding: "0.875rem 1rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: 10 }}>
            <Gift size={16} color={T.accent} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>Bem-vindo ao Oz.LavaRápido!</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                Sua conta já foi criada. Agora é só configurar o seu lava rápido.
              </div>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: "2rem" }}>
          {stepLabels.map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: i < step ? T.success : i === step ? T.accent : T.surface,
                border: `2px solid ${i <= step ? (i < step ? T.success : T.accent) : T.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: i <= step ? "#000" : T.muted,
              }}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              {i < stepLabels.length - 1 && (
                <div style={{ width: 32, height: 2, background: i < step ? T.success : T.border }} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "2rem" }}>
          <ErrorBar msg={err} />

          {/* ── PAID: Step 0 — Create Account ── */}
          {!isCourtesy && step === 0 && (
            <>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 1.5, color: T.text, marginBottom: "1.5rem" }}>Crie sua conta</div>
              <FInput label="E-mail *" type="email" value={account.email} onChange={e => setAccount(a => ({ ...a, email: e.target.value }))} placeholder="seu@email.com" />
              <FInput label="Senha *"  type="password" value={account.password} onChange={e => setAccount(a => ({ ...a, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
              <FInput label="Confirmar Senha *" type="password" value={account.confirm} onChange={e => setAccount(a => ({ ...a, confirm: e.target.value }))} />
              <Btn onClick={handleCreateAccount} disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }}>
                {loading ? "Criando..." : "Continuar"}<ChevronRight size={16} />
              </Btn>
            </>
          )}

          {/* ── COURTESY: Step 0  /  PAID: Step 1 — Create Carwash ── */}
          {((isCourtesy && step === 0) || (!isCourtesy && step === 1)) && (
            <>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 1.5, color: T.text, marginBottom: "1.5rem" }}>Seu Lava Rápido</div>
              <FInput label="Nome do Lava Rápido *" value={shop.name}  onChange={e => setShop(s => ({ ...s, name: e.target.value }))} placeholder="Ex: Lava Rápido do João" />
              <FInput label="Telefone"               value={shop.phone} onChange={e => setShop(s => ({ ...s, phone: e.target.value }))} placeholder="(11) 99999-9999" />
              <FG label="Cor de Destaque">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                  {ACCENT_PRESETS.map(p => (
                    <button key={p.hex} onClick={() => setShop(s => ({ ...s, accent_color: p.hex }))}
                      style={{ width: 32, height: 32, borderRadius: "50%", background: p.hex, border: `3px solid ${shop.accent_color === p.hex ? "#fff" : "transparent"}`, cursor: "pointer" }}
                      title={p.label} />
                  ))}
                </div>
                <input type="color" value={shop.accent_color} onChange={e => setShop(s => ({ ...s, accent_color: e.target.value }))}
                  style={{ width: "100%", height: 38, borderRadius: 8, border: `1px solid ${T.border}`, cursor: "pointer", background: "none" }} />
              </FG>
              <div style={{ display: "flex", gap: 10, marginTop: "0.5rem" }}>
                {!isCourtesy && (
                  <Btn variant="ghost" onClick={() => setStep(0)} style={{ flex: 1, justifyContent: "center" }}><ChevronLeft size={16} />Voltar</Btn>
                )}
                <Btn onClick={handleCreateShop} disabled={loading} style={{ flex: isCourtesy ? "1 1 100%" : 2, justifyContent: "center" }}>
                  {loading ? "Criando..." : "Finalizar"}<ChevronRight size={16} />
                </Btn>
              </div>
            </>
          )}

          {/* ── Done ── */}
          {((isCourtesy && step === 1) || (!isCourtesy && step === 2)) && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.success + "20", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
                <Check size={32} color={T.success} />
              </div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 2, color: T.text, marginBottom: "0.75rem" }}>Tudo pronto!</div>
              <div style={{ color: T.muted, fontSize: 13, marginBottom: "1.5rem", lineHeight: 1.6 }}>
                {isCourtesy
                  ? "Seu lava rápido foi configurado com acesso cortesia.\nBem-vindo ao Oz.LavaRápido!"
                  : "Sua conta e lava rápido foram criados com sucesso.\nBem-vindo ao Oz.LavaRápido!"}
              </div>
              <Btn onClick={handleFinish} style={{ width: "100%", justifyContent: "center" }}>Acessar o Sistema</Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
