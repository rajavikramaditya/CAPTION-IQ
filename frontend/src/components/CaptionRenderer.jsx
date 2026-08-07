import { useRef, useEffect, useState, memo } from "react";

function useContainerSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

// Entity → semantic highlight color mapping
const ENTITY_COLORS = {
  person:   "#FACC15",
  location: "#60A5FA",
  action:   "#4ADE80",
  number:   "#C084FC",
  time:     "#22D3EE",
  emotion:  "#F472B6",
};

const ENTITY_UNDERLINE = {
  person:   "rgba(250,204,21,0.65)",
  location: "rgba(96,165,250,0.65)",
  action:   "rgba(74,222,128,0.65)",
  number:   "rgba(192,132,252,0.65)",
  time:     "rgba(34,211,238,0.65)",
  emotion:  "rgba(244,114,182,0.65)",
};

const EMOJI_MAP = {
  money:"💰",paise:"💰",cash:"💰",dollar:"💰",earning:"💰",profit:"💰",
  video:"📹",camera:"📷",shoot:"📷",
  car:"🚗",gaadi:"🚗",bike:"🏍️",
  time:"⏰",aaj:"⏰",kal:"⏰",
  love:"❤️",dil:"❤️",pyaar:"❤️",
  fire:"🔥",hot:"🔥",aag:"🔥",
  idea:"💡",soch:"💡",dimaag:"💡",
  target:"🎯",goal:"🎯",success:"🎯",
  run:"🏃",bhaag:"🏃",
  music:"🎵",song:"🎵",gaana:"🎵",
  phone:"📱",mobile:"📱",
  star:"⭐",diamond:"💎",
  entity_person:"👑",entity_location:"📍",entity_action:"⚡",
};

function getEmoji(text, entityType) {
  const c = text?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
  return EMOJI_MAP[c] || (entityType ? EMOJI_MAP[`entity_${entityType}`] : null) || null;
}

// Connector words that make good line-break points (English + Hindi/Hinglish)
const BREAK_WORDS = new Set([
  "and","but","or","so","that","which","while","when","since","because","though","although","after","before","unless","until","if","then","whereas","yet","nor",
  "ya","aur","par","lekin","kyunki","jo","se","toh","phir","jab","jaise","isliye","ke","ka","ki","ko",
]);

/**
 * Split a flat word array into 1-2 display lines using natural language boundaries.
 * - Single line when words.length ≤ maxPerLine
 * - Prefer splitting after connector words ("and", "but", "ya", "aur", etc.)
 * - Falls back to midpoint split when no connector is found
 */
function splitLines(words, maxPerLine = 5) {
  if (!words?.length) return [];
  if (words.length <= maxPerLine) return [words];

  const half = Math.ceil(words.length / 2);
  // Look for a connector within ±2 words of the midpoint
  const lo = Math.max(1, half - 2);
  const hi = Math.min(words.length - 1, half + 2);

  // Find best break: connector word that's closest to midpoint
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = lo; i <= hi; i++) {
    const txt = (words[i - 1]?.text || "").toLowerCase().replace(/[^a-z]/g, "");
    if (BREAK_WORDS.has(txt)) {
      const dist = Math.abs(i - half);
      if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    }
  }

  const splitAt = bestIdx >= 1 ? bestIdx : half;
  return [words.slice(0, splitAt), words.slice(splitAt)];
}

/**
 * Professional word-by-word caption renderer.
 * Features:
 *  - Up to 2 balanced lines for longer chunks
 *  - Per-line background box (for templates like Modern/News)
 *  - Smooth word-level scale + color transitions
 *  - Semantic entity highlighting (dotted underline when inactive, bright color when active)
 *  - Floating emoji on active word
 *  - CSS keyframe animations (pop / bounce / slide / glow)
 */
export const CaptionRenderer = memo(function CaptionRenderer({ words, style }) {
  const ref = useRef(null);
  const { w: width, h: height } = useContainerSize(ref);

  // Fallback until ResizeObserver fires
  if (!words || words.length === 0) {
    return <div ref={ref} className="absolute inset-0 pointer-events-none" />;
  }

  if (!width) {
    return <div ref={ref} className="absolute inset-0 pointer-events-none" />;
  }

  const fontSize = Math.max(12, width * style.sizeRatio * (style.fontScale || 1));
  const strokePx = style.stroke?.width ? (style.stroke.width * fontSize) / 48 : 0;
  const marginPct = style.safeMargin || 8;
  const marginPx = (width * marginPct) / 100;

  // Position wrapper
  const wrapStyle = {
    position: "absolute",
    left: `${marginPct}%`,
    right: `${marginPct}%`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: `${fontSize * 0.18}px`,
  };
  if (style.position === "top") wrapStyle.top = `${marginPct}%`;
  else if (style.position === "center") { wrapStyle.top = "50%"; wrapStyle.transform = "translateY(-50%)"; }
  else wrapStyle.bottom = `${marginPct}%`;

  // Base text styles (shared per line)
  const baseText = {
    margin: 0,
    fontFamily: `'${style.font}', sans-serif`,
    fontWeight: style.weight,
    fontSize: `${fontSize}px`,
    lineHeight: style.lineHeight || 1.25,
    letterSpacing: `${style.letterSpacing || 0}em`,
    color: style.color,
    textAlign: "center",
    textShadow: style.shadow && style.shadow !== "none" ? style.shadow : "none",
    WebkitTextStroke: strokePx ? `${strokePx}px ${style.stroke.color}` : "0",
    paintOrder: "stroke fill",
    whiteSpace: "nowrap",
  };

  const lineBox = style.box?.enabled
    ? {
        backgroundColor: style.box.color,
        padding: `${fontSize * 0.22}px ${fontSize * 0.5}px`,
        borderRadius: `${fontSize * (style.box.radius || 0.35)}px`,
        display: "inline-block",
      }
    : { display: "inline-block" };

  const isCatEnabled = (type) => {
    if (!type || !style.semanticHighlight) return false;
    if (!style.enabledCategories) return true;
    return style.enabledCategories.includes(type);
  };

  const getColor = (w, active) => {
    if (active) {
      // Template active color always takes priority — maintains visual identity
      if (w.speaker_id === "speaker_b") return "#C084FC";
      return style.active?.color || "#FA5D29";
    }
    // Inactive words: entity type drives semantic coloring
    if (isCatEnabled(w.entity_type) && ENTITY_COLORS[w.entity_type]) return ENTITY_COLORS[w.entity_type];
    if (w.speaker_id === "speaker_b") return "#E9D5FF";
    return style.color;
  };

  const wordSpan = (w, i, lineIdx) => {
    const active = w.active;
    const isUnderlined = !active && isCatEnabled(w.entity_type);
    const emoji = style.showEmojis ? getEmoji(w.text, w.entity_type) : null;
    const activeBg = active && style.active?.bg ? style.active.bg : "transparent";
    const activeBgRadius = `${fontSize * (style.active?.bgRadius || 0.2)}px`;

    const s = {
      display: "inline-block",
      position: "relative",
      marginRight: `${style.wordSpacing || 0.18}em`,
      padding: `${fontSize * (style.wordPad?.y || 0.06)}px ${fontSize * (style.wordPad?.x || 0.14)}px`,
      borderRadius: activeBgRadius,
      color: getColor(w, active),
      backgroundColor: activeBg,
      fontWeight: active && style.active?.weight ? style.active.weight : style.weight,
      borderBottom: isUnderlined
        ? `2px dotted ${ENTITY_UNDERLINE[w.entity_type] || "transparent"}`
        : "none",
      willChange: "transform, color",
      animation: active && style.animation && style.animation !== "none"
        ? `cq-${style.animation} 180ms cubic-bezier(0.175,0.885,0.32,1.275) forwards`
        : "none",
      transform: active && (!style.animation || style.animation === "none")
        ? `scale(${style.active?.scale || 1.08})`
        : "scale(1)",
      transition: (!active || !style.animation || style.animation === "none")
        ? "transform 120ms ease, color 120ms ease, background-color 120ms ease"
        : "color 120ms ease, background-color 120ms ease",
    };

    return (
      <span key={`${lineIdx}-${i}`} style={s} data-active={active ? "true" : "false"}>
        {active && emoji && (
          <span style={{
            position: "absolute", bottom: "95%", left: "50%",
            fontSize: "0.85em", transform: "translate(-50%,0)",
            animation: "cq-emoji-pop 200ms cubic-bezier(0.175,0.885,0.32,1.275) forwards",
            pointerEvents: "none", zIndex: 20,
          }}>
            {emoji}
          </span>
        )}
        {style.uppercase ? (w.text || "").toUpperCase() : w.text}
      </span>
    );
  };

  // Max words per line — default 5 (single line); more triggers 2-line
  const maxPerLine = Math.max(2, style.maxWordsPerLine || 5);
  const displayLines = splitLines(words, maxPerLine);

  // Derive a stable chunk key from the word IDs — changes when chunk changes to trigger entrance animation
  const chunkKey = words.map((w) => w.word_id || w.text).join("_");

  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none" data-testid="caption-renderer">
      <style>{`
        @keyframes cq-chunk-enter {
          0% { opacity: 0; transform: translateY(8px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cq-pop {
          0% { transform: scale(0.88); opacity: 0.7; }
          100% { transform: scale(${style.active?.scale || 1.08}); opacity: 1; }
        }
        @keyframes cq-bounce {
          0%,100% { transform: translateY(0) scale(${style.active?.scale || 1.08}); }
          50% { transform: translateY(-5px) scale(${(style.active?.scale || 1.08) * 1.03}); }
        }
        @keyframes cq-slide {
          0% { transform: translateY(10px) scale(0.95); opacity: 0.6; }
          100% { transform: translateY(0) scale(${style.active?.scale || 1.08}); opacity: 1; }
        }
        @keyframes cq-glow {
          0%,100% { transform: scale(${style.active?.scale || 1.08}); text-shadow: 0 0 4px rgba(255,255,255,0.35); }
          50% { transform: scale(${style.active?.scale || 1.08}); text-shadow: 0 0 18px ${style.active?.color || "#FA5D29"}; }
        }
        @keyframes cq-emoji-pop {
          0% { transform: translate(-50%,8px) scale(0); opacity: 0; }
          100% { transform: translate(-50%,0) scale(1); opacity: 1; }
        }
      `}</style>

      {/* key changes when the chunk changes → React remounts div → CSS entrance plays */}
      <div key={chunkKey} style={{ ...wrapStyle, animation: "cq-chunk-enter 180ms cubic-bezier(0.16,1,0.3,1) forwards" }}>
        {displayLines.map((lineWords, lineIdx) => (
          <div key={lineIdx} style={lineBox}>
            <p style={baseText}>
              {lineWords.map((w, i) => wordSpan(w, i, lineIdx))}
            </p>
            {/* Bilingual secondary line (only on last display line) */}
            {lineIdx === displayLines.length - 1 && style.bilingualText && (
              <p style={{
                margin: `${fontSize * 0.12}px 0 0 0`,
                fontFamily: `'${style.font}', sans-serif`,
                fontSize: `${fontSize * 0.7}px`,
                color: "rgba(255,255,255,0.75)",
                textAlign: "center",
                fontWeight: 500,
                letterSpacing: "0.01em",
              }}>
                {style.bilingualText}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
