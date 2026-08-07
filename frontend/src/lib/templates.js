// Caption Template Engine — professional styling specs for every creative style.
// Switching templates only changes rendering; the transcript is untouched.
// maxWordsPerLine controls when the renderer switches from 1-line to 2-line display.

export const SIZE_SCALES = { small: 0.8, medium: 1, large: 1.28 };
export const POSITIONS = ["top", "center", "bottom"];

const DEFAULT = {
  font: "Inter",
  weight: 600,
  uppercase: false,
  sizeRatio: 0.045,          // base font size as fraction of video width
  letterSpacing: 0,          // em
  wordSpacing: 0.18,         // em gap between words
  lineHeight: 1.25,
  color: "#ffffff",
  stroke: { width: 0, color: "#000000" },
  shadow: "0 2px 8px rgba(0,0,0,0.55)",
  box: { enabled: false, color: "rgba(0,0,0,0.6)", radius: 0.35 },
  position: "bottom",
  safeMargin: 8,             // % inset from edges
  wordPad: { x: 0.14, y: 0.06 },
  active: { scale: 1.08, color: "#FA5D29", bg: null, bgRadius: 0.2, weight: 700 },
  maxWordsPerLine: 5,        // words shown per line before wrapping to a 2nd line
};

const t = (id, name, o = {}) => ({
  id, name, ...DEFAULT, ...o,
  stroke: { ...DEFAULT.stroke, ...(o.stroke || {}) },
  box: { ...DEFAULT.box, ...(o.box || {}) },
  active: { ...DEFAULT.active, ...(o.active || {}) },
  wordPad: { ...DEFAULT.wordPad, ...(o.wordPad || {}) },
  maxWordsPerLine: o.maxWordsPerLine ?? DEFAULT.maxWordsPerLine,
});

export const TEMPLATES = [
  // ─── Minimal — Clean, no box, subtle orange active word ───────────────────
  t("minimal", "Minimal", {
    font: "Inter", weight: 600, sizeRatio: 0.043,
    shadow: "0 1px 6px rgba(0,0,0,0.7)",
    active: { scale: 1.05, color: "#FA5D29", weight: 700 },
    maxWordsPerLine: 6,
  }),

  // ─── Modern — Bold box, active word gets orange pill ──────────────────────
  t("modern", "Modern", {
    font: "Poppins", weight: 700, sizeRatio: 0.046,
    box: { enabled: true, color: "rgba(17,24,39,0.75)", radius: 0.4 },
    active: { scale: 1.06, color: "#ffffff", bg: "#FA5D29", bgRadius: 0.28, weight: 700 },
    maxWordsPerLine: 5,
  }),

  // ─── Podcast — Rounded box, teal active, calm ─────────────────────────────
  t("podcast", "Podcast", {
    font: "Montserrat", weight: 600, sizeRatio: 0.044,
    box: { enabled: true, color: "rgba(0,0,0,0.52)", radius: 0.65 },
    shadow: "0 2px 10px rgba(0,0,0,0.5)",
    active: { scale: 1.05, color: "#2DD4BF", weight: 700 },
    maxWordsPerLine: 5,
  }),

  // ─── News — Red box, all caps, flat, Oswald ───────────────────────────────
  t("news", "News", {
    font: "Oswald", weight: 600, uppercase: true, sizeRatio: 0.04, letterSpacing: 0.02,
    color: "#ffffff", shadow: "none",
    box: { enabled: true, color: "#DC2626", radius: 0.06 },
    active: { scale: 1.0, color: "#FDE047", weight: 600 },
    maxWordsPerLine: 4,
  }),

  // ─── Finance — Dark premium box, green active, Archivo ───────────────────
  t("finance", "Finance", {
    font: "Archivo", weight: 700, sizeRatio: 0.042,
    box: { enabled: true, color: "rgba(2,6,23,0.86)", radius: 0.22 },
    shadow: "0 2px 12px rgba(0,0,0,0.6)",
    active: { scale: 1.04, color: "#16C784", bg: null, weight: 800 },
    maxWordsPerLine: 5,
  }),

  // ─── Cinematic — Ultra-wide spacing, serif feel, Outfit ──────────────────
  t("cinematic", "Cinematic", {
    font: "Outfit", weight: 400, uppercase: true, letterSpacing: 0.2,
    sizeRatio: 0.034, wordSpacing: 0.26, lineHeight: 1.35,
    shadow: "0 2px 18px rgba(0,0,0,0.88)",
    active: { scale: 1.0, color: "#E5C07B", weight: 500 },
    maxWordsPerLine: 4,
  }),

  // ─── Shorts — Giant stroke, center position, Anton ───────────────────────
  t("shorts", "Shorts", {
    font: "Anton", weight: 400, uppercase: true, sizeRatio: 0.074,
    stroke: { width: 6, color: "#000000" },
    shadow: "0 4px 12px rgba(0,0,0,0.5)",
    position: "center",
    active: { scale: 1.14, color: "#FFEA00", weight: 400 },
    maxWordsPerLine: 4,
  }),

  // ─── Gaming — Russo One, purple glow, center ──────────────────────────────
  t("gaming", "Gaming", {
    font: "Russo One", weight: 400, uppercase: true, sizeRatio: 0.054,
    stroke: { width: 3.5, color: "#0B0F20" },
    shadow: "0 0 20px rgba(124,58,237,0.7), 0 2px 4px rgba(0,0,0,0.8)",
    position: "center",
    active: { scale: 1.1, color: "#ffffff", bg: "#7C3AED", bgRadius: 0.16, weight: 400 },
    maxWordsPerLine: 4,
  }),

  // ─── Education — White box, yellow highlight, Nunito ─────────────────────
  t("education", "Education", {
    font: "Nunito", weight: 800, sizeRatio: 0.046, color: "#111827", shadow: "none",
    box: { enabled: true, color: "#ffffff", radius: 0.5 },
    active: { scale: 1.03, color: "#111827", bg: "#FDE68A", bgRadius: 0.22, weight: 900 },
    maxWordsPerLine: 5,
  }),

  // ─── Bold Impact — Black stroke, yellow pill, Montserrat ─────────────────
  t("bold-impact", "Bold Impact", {
    font: "Montserrat", weight: 800, uppercase: true, sizeRatio: 0.05, letterSpacing: 0.004,
    stroke: { width: 5, color: "#000000" },
    shadow: "0 3px 8px rgba(0,0,0,0.5)",
    position: "center",
    active: { scale: 1.05, color: "#111827", bg: "#FACC15", bgRadius: 0.1, weight: 800 },
    maxWordsPerLine: 4,
  }),

  // ─── Hype — Luckiest Guy, huge, center, kinetic yellow ───────────────────
  t("hype", "Hype", {
    font: "Luckiest Guy", weight: 400, uppercase: true, sizeRatio: 0.066, wordSpacing: 0.22,
    stroke: { width: 6, color: "#000000" },
    shadow: "0 5px 14px rgba(0,0,0,0.55)",
    position: "center",
    active: { scale: 1.18, color: "#FFDD00", weight: 400 },
    maxWordsPerLine: 3,
  }),

  // ─── Mr Beast — White stroke, black box, bold yellow ─────────────────────
  t("mrbeast", "Mr Beast", {
    font: "Anton", weight: 400, uppercase: true, sizeRatio: 0.076, letterSpacing: 0.01,
    color: "#ffffff",
    stroke: { width: 8, color: "#000000" },
    shadow: "0 4px 0 rgba(0,0,0,0.9)",
    box: { enabled: true, color: "rgba(0,0,0,0.88)", radius: 0.08 },
    position: "bottom",
    active: { scale: 1.14, color: "#FFE600", bg: null, weight: 400 },
    maxWordsPerLine: 4,
  }),

  // ─── Hormozi — Black box, inverted active, no shadow ─────────────────────
  t("hormozi", "Hormozi", {
    font: "Montserrat", weight: 900, uppercase: true, sizeRatio: 0.055,
    color: "#ffffff", letterSpacing: -0.01,
    stroke: { width: 0, color: "#000000" },
    shadow: "none",
    box: { enabled: true, color: "#000000", radius: 0.0 },
    position: "bottom",
    active: { scale: 1.0, color: "#000000", bg: "#ffffff", bgRadius: 0, weight: 900 },
    maxWordsPerLine: 4,
  }),

  // ─── Ali Abdaal — Soft serif, minimal shadow, light blue active ──────────
  t("ali-abdaal", "Ali Abdaal", {
    font: "Georgia", weight: 400, uppercase: false, sizeRatio: 0.038, letterSpacing: 0.01,
    color: "#f8f8f8",
    stroke: { width: 0, color: "#000000" },
    shadow: "0 1px 14px rgba(0,0,0,0.8)",
    box: { enabled: false, color: "rgba(0,0,0,0.4)", radius: 0.5 },
    position: "bottom",
    active: { scale: 1.0, color: "#93C5FD", weight: 700 },
    maxWordsPerLine: 6,
  }),

  // ─── Motivation — Bebas Neue, orange glow, center, big ───────────────────
  t("motivation", "Motivation", {
    font: "Bebas Neue", weight: 400, uppercase: true, sizeRatio: 0.065, letterSpacing: 0.04,
    color: "#FFFFFF",
    stroke: { width: 3, color: "#FF6B00" },
    shadow: "0 0 26px rgba(255,107,0,0.6), 0 2px 6px rgba(0,0,0,0.7)",
    box: { enabled: false, color: "transparent", radius: 0 },
    position: "center",
    active: { scale: 1.1, color: "#FF6B00", weight: 400 },
    maxWordsPerLine: 4,
  }),

  // ─── Luxury — Cormorant Garamond, gold, wide spacing ─────────────────────
  t("luxury", "Luxury", {
    font: "Cormorant Garamond", weight: 300, uppercase: true, sizeRatio: 0.034,
    letterSpacing: 0.3, wordSpacing: 0.4, lineHeight: 1.65,
    color: "#D4AF37",
    stroke: { width: 0, color: "#000000" },
    shadow: "0 1px 10px rgba(0,0,0,0.65)",
    box: { enabled: false, color: "transparent", radius: 0 },
    position: "bottom",
    active: { scale: 1.0, color: "#ffffff", weight: 400 },
    maxWordsPerLine: 5,
  }),
];

export const DEFAULT_TEMPLATE_ID = "modern";

export const DEFAULT_SETTINGS = {
  position: null,           // null → use template default
  size: "medium",
  uppercase: null,          // null → use template default
  boxOverride: null,        // null → use template default
  animation: "pop",         // pop | bounce | slide | glow | none
  semanticHighlight: true,
  showEmojis: true,
  maxWords: 7,              // words per display chunk (controls 1 vs 2-line chunks)
};

export function getTemplate(id) {
  return TEMPLATES.find((x) => x.id === id) || TEMPLATES[0];
}

// Merge a template spec with per-project user overrides.
export function resolveStyle(template, settings) {
  const s = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  const font = s.customFont || template.font;
  const activeColor = s.activeColor || template.active.color;
  const boxColor = s.boxColor || template.box.color;
  const strokeWidth = s.strokeWidth ?? template.stroke.width;

  return {
    ...template,
    font,
    fontScale: SIZE_SCALES[s.size] ?? 1,
    uppercase: s.uppercase == null ? template.uppercase : s.uppercase,
    position: s.position || template.position,
    box: s.boxOverride == null
      ? { ...template.box, color: boxColor }
      : { ...template.box, enabled: s.boxOverride, color: boxColor },
    active: { ...template.active, color: activeColor },
    stroke: { ...template.stroke, width: strokeWidth },
    animation: s.animation,
    semanticHighlight: s.semanticHighlight,
    showEmojis: s.showEmojis,
    enabledCategories: s.enabledCategories,
    categoryColors: s.categoryColors,
    maxWordsPerLine: template.maxWordsPerLine,
  };
}

// Effective values for UI highlighting in TemplateBar.
export function effectiveSettings(template, settings) {
  const s = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  return {
    position: s.position || template.position,
    size: s.size || "medium",
    uppercase: s.uppercase == null ? template.uppercase : s.uppercase,
    box: s.boxOverride == null ? template.box.enabled : s.boxOverride,
    animation: s.animation,
    semanticHighlight: s.semanticHighlight,
    showEmojis: s.showEmojis,
    maxWords: s.maxWords ?? 7,
  };
}
