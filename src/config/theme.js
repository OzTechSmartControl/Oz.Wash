export const T_DARK = {
  bg: "#0b0b0e", surface: "#13131a", card: "#1a1a24", border: "#2a2a3a",
  accent: "#4db8ff", accentGlow: "#4db8ff22",
  text: "#ece8e0", muted: "#706b63", mutedLight: "#9a9590",
  success: "#43d18a", successBg: "#43d18a18",
  danger: "#f07070", dangerBg: "#f0707018",
  warn: "#f0a500", warnBg: "#f0a50018",
  info: "#60a5fa", infoBg: "#60a5fa18",
  sidebar: "#0e0e14",
};

export const T_LIGHT = {
  bg: "#f0f4f8", surface: "#ffffff", card: "#ffffff", border: "#dde1ea",
  accent: "#0ea5e9", accentGlow: "#0ea5e922",
  text: "#0f172a", muted: "#64748b", mutedLight: "#94a3b8",
  success: "#16a34a", successBg: "#16a34a18",
  danger: "#dc2626", dangerBg: "#dc262618",
  warn: "#d97706", warnBg: "#d9770618",
  info: "#2563eb", infoBg: "#2563eb18",
  sidebar: "#e2e8f0",
};

export const getTheme = (mode) => mode === "light" ? T_LIGHT : T_DARK;

export default T_DARK;
