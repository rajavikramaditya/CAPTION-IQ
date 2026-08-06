// Caption Template Engine — data-driven style specs.
// Each template is an original design inspired by popular caption styles.
// Switching templates only changes rendering; the transcript is untouched.

export const SIZE_SCALES = { small: 0.82, medium: 1, large: 1.24 };
export const POSITIONS = ["top", "center", "bottom"];

const DEFAULT = {
  font: "Inter",
  weight: 600,
  uppercase: false,
  sizeRatio: 0.045,        // base font size as a fraction of the video width
  letterSpacing: 0,        // em
  wordSpacing: 0.18,       // em (gap between words)
  lineHeight: 1.25,
  color: "#ffffff",
  stroke: { width: 0, color: "#000000" },   // width is px at a 48px reference size, scaled
  shadow: "0 2px 8px rgba(0,0,0,0.55)",
  box: { enabled: false, color: "rgba(0,0,0,0.6)", radius: 0.35 },  // radius in em
  position: "bottom",
  safeMargin: 8,           // % inset from edges
  wordPad: { x: 0.14, y: 0.06 },            // em, applied to every word (stable layout)
  active: { scale: 1.08, color: "#FA5D29", bg: null, bgRadius: 0.2, weight: 700 },
};

const t = (id, name, o = {}) => ({
  id, name, ...DEFAULT, ...o,
  stroke: { ...DEFAULT.stroke, ...(o.stroke || {}) },
  box: { ...DEFAULT.box, ...(o.box || {}) },
  active: { ...DEFAULT.active, ...(o.active || {}) },
  wordPad: { ...DEFAULT.wordPad, ...(o.wordPad || {}) },
});

export const TEMPLATES = [
  t("minimal", "Minimal", {
    font: "Inter", weight: 600, sizeRatio: 0.042,
    shadow: "0 2px 6px rgba(0,0,0,0.65)",
    active: { scale: 1.0, color: "#FA5D29", weight: 700 },
  }),
  t("modern", "Modern", {
    font: "Poppins", weight: 700, sizeRatio: 0.046,
    box: { enabled: true, color: "rgba(17,24,39,0.72)", radius: 0.4 },
    active: { scale: 1.06, color: "#ffffff", bg: "#FA5D29", bgRadius: 0.28 },
  }),
  t("podcast", "Podcast", {
    font: "Montserrat", weight: 600, sizeRatio: 0.044,
    box: { enabled: true, color: "rgba(0,0,0,0.5)", radius: 0.7 },
    active: { scale: 1.05, color: "#5EEAD4" },
  }),
  t("news", "News", {
    font: "Oswald", weight: 600, uppercase: true, sizeRatio: 0.04, letterSpacing: 0.02,
    color: "#ffffff", shadow: "none",
    box: { enabled: true, color: "#DC2626", radius: 0.08 },
    active: { scale: 1.0, color: "#FDE047" },
  }),
  t("finance", "Finance", {
    font: "Archivo", weight: 700, sizeRatio: 0.042,
    box: { enabled: true, color: "rgba(2,6,23,0.84)", radius: 0.25 },
    active: { scale: 1.04, color: "#16C784" },
  }),
  t("cinematic", "Cinematic", {
    font: "Outfit", weight: 400, uppercase: true, letterSpacing: 0.18,
    sizeRatio: 0.036, wordSpacing: 0.24, shadow: "0 2px 16px rgba(0,0,0,0.85)",
    active: { scale: 1.0, color: "#E5C07B", weight: 500 },
  }),
  t("shorts", "Shorts", {
    font: "Anton", weight: 400, uppercase: true, sizeRatio: 0.072,
    stroke: { width: 6, color: "#000000" }, shadow: "0 4px 10px rgba(0,0,0,0.5)",
    position: "center",
    active: { scale: 1.16, color: "#FFEA00", weight: 400 },
  }),
  t("gaming", "Gaming", {
    font: "Russo One", weight: 400, uppercase: true, sizeRatio: 0.056,
    stroke: { width: 4, color: "#0B1020" }, shadow: "0 0 18px rgba(124,58,237,0.65)",
    position: "center",
    active: { scale: 1.1, color: "#ffffff", bg: "#7C3AED", bgRadius: 0.18 },
  }),
  t("education", "Education", {
    font: "Nunito", weight: 800, sizeRatio: 0.046, color: "#111827", shadow: "none",
    box: { enabled: true, color: "#ffffff", radius: 0.5 },
    active: { scale: 1.03, color: "#111827", bg: "#FDE68A", bgRadius: 0.2 },
  }),
  t("bold-impact", "Bold Impact", {
    font: "Montserrat", weight: 800, uppercase: true, sizeRatio: 0.05, letterSpacing: 0.004,
    stroke: { width: 5, color: "#000000" }, shadow: "0 3px 8px rgba(0,0,0,0.5)",
    position: "center",
    active: { scale: 1.05, color: "#111827", bg: "#FACC15", bgRadius: 0.12, weight: 800 },
  }),
  t("hype", "Hype", {
    font: "Luckiest Guy", weight: 400, uppercase: true, sizeRatio: 0.066, wordSpacing: 0.2,
    stroke: { width: 6, color: "#000000" }, shadow: "0 5px 12px rgba(0,0,0,0.55)",
    position: "center",
    active: { scale: 1.2, color: "#FFDD00", weight: 400 },
  }),

  // --- Creator-Inspired Templates (Competitor Parity) ---

  t("mrbeast", "Mr Beast", {
    font: "Anton", weight: 400, uppercase: true, sizeRatio: 0.075, letterSpacing: 0.01,
    color: "#ffffff",
    stroke: { width: 8, color: "#000000" }, shadow: "0 4px 0px rgba(0,0,0,0.9)",
    box: { enabled: true, color: "rgba(0,0,0,0.85)", radius: 0.1 },
    position: "bottom",
    active: { scale: 1.15, color: "#FFE600", bg: null, weight: 400 },
  }),

  t("hormozi", "Hormozi", {
    font: "Montserrat", weight: 900, uppercase: true, sizeRatio: 0.055,
    color: "#ffffff", letterSpacing: -0.01,
    stroke: { width: 0, color: "#000000" }, shadow: "none",
    box: { enabled: true, color: "#000000", radius: 0.0 },
    position: "bottom",
    active: { scale: 1.0, color: "#000000", bg: "#ffffff", bgRadius: 0, weight: 900 },
  }),

  t("ali-abdaal", "Ali Abdaal", {
    font: "Georgia", weight: 400, uppercase: false, sizeRatio: 0.038, letterSpacing: 0.01,
    color: "#f8f8f8",
    stroke: { width: 0, color: "#000000" }, shadow: "0 1px 12px rgba(0,0,0,0.75)",
    box: { enabled: false, color: "rgba(0,0,0,0.4)", radius: 0.5 },
    position: "bottom",
    active: { scale: 1.0, color: "#93C5FD", weight: 700 },
  }),

  t("motivation", "Motivation", {
    font: "Bebas Neue", weight: 400, uppercase: true, sizeRatio: 0.065, letterSpacing: 0.04,
    color: "#FFFFFF",
    stroke: { width: 3, color: "#FF6B00" }, shadow: "0 0 24px rgba(255,107,0,0.55)",
    box: { enabled: false, color: "transparent", radius: 0 },
    position: "center",
    active: { scale: 1.1, color: "#FF6B00", weight: 400 },
  }),

  t("luxury", "Luxury", {
    font: "Cormorant Garamond", weight: 300, uppercase: true, sizeRatio: 0.034,
    letterSpacing: 0.3, wordSpacing: 0.4, lineHeight: 1.6,
    color: "#D4AF37",
    stroke: { width: 0, color: "#000000" }, shadow: "0 1px 8px rgba(0,0,0,0.6)",
    box: { enabled: false, color: "transparent", radius: 0 },
    position: "bottom",
    active: { scale: 1.0, color: "#FFFFFF", weight: 400 },
  }),
];

export const DEFAULT_TEMPLATE_ID = "modern";

export const DEFAULT_SETTINGS = {
  position: null,     // null => use template default
  size: "medium",
  uppercase: null,    // null => use template default
  boxOverride: null,  // null => use template default
  animation: "pop",   // pop | bounce | slide | glow | none
  semanticHighlight: true,
  showEmojis: true,
};

export function getTemplate(id) {
  return TEMPLATES.find((x) => x.id === id) || TEMPLATES[0];
}

// Merge a template spec with the user's per-project overrides.
export function resolveStyle(template, settings) {
  const s = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  return {
    ...template,
    fontScale: SIZE_SCALES[s.size] ?? 1,
    uppercase: s.uppercase == null ? template.uppercase : s.uppercase,
    position: s.position || template.position,
    box: s.boxOverride == null ? template.box : { ...template.box, enabled: s.boxOverride },
    animation: s.animation,
    semanticHighlight: s.semanticHighlight,
    showEmojis: s.showEmojis,
  };
}

// Effective values used to highlight the active control state in the UI.
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
  };
}

