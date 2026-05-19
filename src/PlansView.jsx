import { useState } from "react";
import { Check, ChevronRight, ArrowLeft, Gift, AlertCircle } from "lucide-react";

const SUPABASE_URL  = "https://lolvvhdixbfcrquisnpi.supabase.co";
const SUPABASE_ANON = "sb_publishable_Ud8gUkUl9A3hVrJQTcsI_g_uvwskZax";

// TODO: Configurar URLs do Mercado Pago para o Oz.LavaRápido
const MP_LINKS = {
  monthly:    "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=MENSAL_ID",
  semestral:  "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=SEMESTRAL_ID",
  annual:     "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=ANUAL_ID",
};

const T = {
  bg: "#0b0b0e", surface: "#13131a", card: "#1a1a24", border: "#2a2a3a",
  accent: "#4db8ff", accentGlow: "#4db8ff22", text: "#ece8e0", muted: "#706b63",
  success: "#43d18a", successBg: "#43d18a18", danger: "#f07070", dangerBg: "#f0707018",
};

const PLANS = [
  {
    id: "monthly",
    label: "Plano Mensal",
    price: 79.9,
    priceLabel: "R$ 79,90",
    period: "/mês",
    sub: "Renovação automática a cada 30 dias",
    highlight: false,
  },
  {
    id: "semestral",
    label: "Plano Semestral",
    price: 399.9,
    priceLabel: "R$ 399,90",
    period: "/6 meses",
    sub: "Equivale a apenas R$ 66/mês",
    economy: "Economize R$ 79,50",
    highlight: false,
  },
  {
    id: "annual",
    label: "Plano Anual",
    price: 699.9,
    priceLabel: "R$ 699,90",
    period: "/ano",
    sub: "Equivale a apenas R$ 58/mês",
    economy: "Economize R$ 258,90",
    highlight: true,
  },
];

const FEATURES = [
  "Ordens de serviço ilimitadas",
  "Cadastro de clientes e veículos",
  "Gestão de funcionários e comissões",
  "Controle de estoque e produtos",
  "Financeiro completo (receitas + despesas)",
  "Relatórios de produtividade",
  "Dashboard em tempo real",
  "Acesso mobile (PWA)",
  "Suporte da OzTech SmartControl",
];

const inputSt = {
  width: "100%", background: "#0d0e14", border: `1px solid ${T.border}`,
  borderRadius: 10, padding: "0.75rem 1rem", color: T.text, fontSize: 14,
  outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif",
};

export default function PlansView({ onBack }) {
  const [selected, setSelected]   = useState("annual");
  const [step,     setStep]       = useState("plans"); // plans | checkout
  const [email,    setEmail]      = useState("");
  const [checking, setChecking]   = useState(false);
  const [err,      setErr]        = useState("");

  const plan = PLANS.find(p => p.id === selected);

  const handleCheckout = async () => {
    setErr(""); setChecking(true);
    if (!email.trim()) { setErr("Informe seu e-mail antes de continuar."); setChecking(false); return; }
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/can_register_with_email`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON, "Content-Type": "application/json" },
        body: JSON.stringify({ p_email: email.trim() }),
      });
      const alreadyPaid = await res.json();
      if (alreadyPaid) {
        window.location.href = `/?payment=success&plan=${selected}`;
        return;
      }
    } catch (_) {}
    window.location.href = MP_LINKS[selected];
    setChecking(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, padding: "2rem 1rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 900, marginBottom: "2.5rem" }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif", marginBottom: "1.5rem" }}>
            <ArrowLeft size={14} />Voltar
          </button>
        )}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 38, letterSpacing: 3, color: T.accent }}>Oz.LavaRápido</div>
          <div style={{ color: T.muted, fontSize: 14, marginTop: 6 }}>Escolha o plano ideal para o seu lava rápido</div>
        </div>
      </div>

      {step === "plans" && (
        <div style={{ width: "100%", maxWidth: 900 }}>
          {/* Plans grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginBottom: "2.5rem" }}>
            {PLANS.map(p => (
              <div key={p.id} onClick={() => setSelected(p.id)}
                style={{ background: T.card, border: `2px solid ${selected === p.id ? T.accent : p.highlight ? T.accent + "44" : T.border}`, borderRadius: 16, padding: "1.75rem", cursor: "pointer", position: "relative", transition: "border-color 0.2s" }}>
                {p.highlight && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: T.accent, color: "#000", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "3px 12px", letterSpacing: 0.8 }}>MAIS POPULAR</div>
                )}
                {p.economy && (
                  <div style={{ background: T.success + "22", color: T.success, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, display: "inline-block", marginBottom: 10 }}>{p.economy}</div>
                )}
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 1.5, color: T.text, marginBottom: 8 }}>{p.label}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, letterSpacing: 1, color: selected === p.id ? T.accent : T.text }}>{p.priceLabel}</span>
                  <span style={{ color: T.muted, fontSize: 13 }}>{p.period}</span>
                </div>
                <div style={{ color: T.muted, fontSize: 12 }}>{p.sub}</div>
                {selected === p.id && (
                  <div style={{ position: "absolute", top: 16, right: 16, width: 22, height: 22, borderRadius: "50%", background: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={13} color="#000" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Features */}
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "1.75rem", marginBottom: "2rem" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 1.5, color: T.text, marginBottom: "1rem" }}>Todos os planos incluem</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.6rem" }}>
              {FEATURES.map(f => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.text }}>
                  <Check size={14} color={T.success} style={{ flexShrink: 0 }} />{f}
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <button onClick={() => setStep("checkout")}
              style={{ background: T.accent, color: "#000", border: "none", borderRadius: 12, padding: "0.875rem 2.5rem", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "'DM Sans', sans-serif" }}>
              Assinar {plan?.label}<ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === "checkout" && (
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "2rem" }}>
            <button onClick={() => setStep("plans")} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif", marginBottom: "1.5rem", padding: 0 }}>
              <ArrowLeft size={14} />Voltar aos planos
            </button>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 1.5, color: T.text, marginBottom: "0.5rem" }}>{plan?.label}</div>
            <div style={{ color: T.accent, fontSize: 28, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1, marginBottom: "1.5rem" }}>{plan?.priceLabel}<span style={{ color: T.muted, fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>{plan?.period}</span></div>
            {err && <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, padding: "0.625rem 1rem", color: T.danger, fontSize: 13, marginBottom: "1rem", display: "flex", gap: 8, alignItems: "center" }}><AlertCircle size={14} />{err}</div>}
            <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Seu e-mail</div>
            <input style={inputSt} type="email" placeholder="email@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} />
            <div style={{ color: T.muted, fontSize: 11, marginTop: 6, marginBottom: "1.25rem" }}>Use o mesmo e-mail que usará para acessar o sistema.</div>
            <button onClick={handleCheckout} disabled={checking}
              style={{ width: "100%", background: T.accent, color: "#000", border: "none", borderRadius: 10, padding: "0.875rem", fontSize: 14, fontWeight: 700, cursor: checking ? "wait" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              {checking ? "Verificando..." : "Ir para o pagamento"}
            </button>
            <div style={{ textAlign: "center", marginTop: "1rem", color: T.muted, fontSize: 11 }}>Pagamento processado com segurança pelo Mercado Pago</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: "2.5rem", color: T.muted, fontSize: 11, textAlign: "center" }}>
        OzTech SmartControl © {new Date().getFullYear()} — Suporte: contato@oztech.com.br
      </div>
    </div>
  );
}
