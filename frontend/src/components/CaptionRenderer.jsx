import { useEffect, useRef, useState, memo } from "react";

function useContainerWidth(ref) {
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => setW(entries[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

// AI Emoji Dictionary Mapping
const EMOJI_MAP = {
  money: "💰", paise: "💰", cash: "💰", dollar: "💰", earning: "💰", profit: "💰",
  video: "📹", camera: "📷", shoot: "📷", shooted: "📷",
  car: "🚗", gaadi: "🚗", bike: "🏍️", cycle: "🚲",
  time: "⏰", aaj: "⏰", kal: "⏰", clock: "⏰", watch: "⏰",
  love: "❤️", dil: "❤️", pyaar: "❤️",
  fire: "🔥", hot: "🔥", aag: "🔥", burn: "🔥",
  idea: "💡", soch: "💡", dimaag: "💡", smart: "💡",
  target: "🎯", goal: "🎯", success: "🎯", jeet: "🎯",
  run: "🏃", bhaag: "🏃", walk: "🚶",
  music: "🎵", song: "🎵", gaana: "🎵",
  phone: "📱", mobile: "📱", call: "📱",
  lock: "🔒", key: "🔑",
  star: "⭐", diamond: "💎", gold: "🥇",
  entity_person: "👑",
  entity_location: "📍",
  entity_action: "⚡",
};

function getWordEmoji(text, entityType) {
  if (!text) return null;
  const clean = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (EMOJI_MAP[clean]) return EMOJI_MAP[clean];
  if (entityType) {
    return EMOJI_MAP[`entity_${entityType}`] || null;
  }
  return null;
}

// Professional word-by-word caption renderer. Layout-stable, animated,
// with auto emojis and linguistic highlighting features.
export const CaptionRenderer = memo(function CaptionRenderer({ words, style }) {
  const ref = useRef(null);
  const width = useContainerWidth(ref);

  if (!words || words.length === 0) {
    return <div ref={ref} className="absolute inset-0 pointer-events-none" />;
  }

  const fontSize = Math.max(12, width * style.sizeRatio * style.fontScale);
  const strokePx = style.stroke.width ? (style.stroke.width * fontSize) / 48 : 0;
  const margin = `${style.safeMargin}%`;

  const wrap = {
    position: "absolute", left: margin, right: margin,
    display: "flex", justifyContent: "center",
  };
  if (style.position === "top") wrap.top = margin;
  else if (style.position === "center") { wrap.top = "50%"; wrap.transform = "translateY(-50%)"; }
  else wrap.bottom = margin;

  const boxStyle = style.box.enabled
    ? {
        backgroundColor: style.box.color,
        padding: `${fontSize * 0.22}px ${fontSize * 0.5}px`,
        borderRadius: `${fontSize * style.box.radius}px`,
        display: "inline-block",
      }
    : {};

  const textStyle = {
    margin: 0,
    fontFamily: `'${style.font}', sans-serif`,
    fontWeight: style.weight,
    fontSize: `${fontSize}px`,
    lineHeight: style.lineHeight,
    letterSpacing: `${style.letterSpacing}em`,
    color: style.color,
    textAlign: "center",
    textShadow: style.shadow && style.shadow !== "none" ? style.shadow : "none",
    WebkitTextStroke: strokePx ? `${strokePx}px ${style.stroke.color}` : "0",
    paintOrder: "stroke fill",
  };

  const isCategoryEnabled = (type) => {
    if (!type) return false;
    if (!style.semanticHighlight) return false;
    // Default: all categories enabled if enabledCategories set is undefined
    if (!style.enabledCategories) return true;
    return style.enabledCategories.includes(type);
  };

  const getWordColor = (w, active) => {
    if (active) {
      if (isCategoryEnabled(w.entity_type)) {
        if (w.entity_type === "person")   return "#FACC15"; // Bright Yellow
        if (w.entity_type === "location") return "#60A5FA"; // Bright Blue
        if (w.entity_type === "action")   return "#4ADE80"; // Bright Green
        if (w.entity_type === "number")   return "#C084FC"; // Bright Purple
        if (w.entity_type === "time")     return "#22D3EE"; // Bright Cyan
        if (w.entity_type === "emotion")  return "#F472B6"; // Bright Pink
      }
      if (w.speaker_id === "speaker_b") return "#C084FC";
      return style.active.color;
    }
    if (w.speaker_id === "speaker_b") return "#E9D5FF";
    return style.color;
  };

  const wordStyle = (w, active) => {
    const isUnderlined = !active && isCategoryEnabled(w.entity_type);
    const borderBottomColor =
      w.entity_type === "person"   ? "rgba(250,204,21,0.7)" :
      w.entity_type === "location" ? "rgba(96,165,250,0.7)" :
      w.entity_type === "action"   ? "rgba(74,222,128,0.7)" :
      w.entity_type === "number"   ? "rgba(192,132,252,0.7)" :
      w.entity_type === "emotion"  ? "rgba(244,114,182,0.7)" : "transparent";

    return {
      display: "inline-block",
      position: "relative",
      marginRight: `${style.wordSpacing}em`,
      padding: `${fontSize * style.wordPad.y}px ${fontSize * style.wordPad.x}px`,
      borderRadius: `${fontSize * (style.active.bgRadius || 0.2)}px`,
      color: getWordColor(w, active),
      backgroundColor: active && style.active.bg ? style.active.bg : "transparent",
      fontWeight: active && style.active.weight ? style.active.weight : style.weight,
      borderBottom: isUnderlined ? `2px dotted ${borderBottomColor}` : "none",
      willChange: "transform",
      animation: active && style.animation && style.animation !== "none"
        ? `caption-${style.animation} 180ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`
        : "none",
      transform: active && (!style.animation || style.animation === "none")
        ? `scale(${style.active.scale})`
        : "scale(1)",
      transition: (!active || !style.animation || style.animation === "none")
        ? "transform 130ms ease, color 130ms ease, background-color 130ms ease"
        : "color 130ms ease, background-color 130ms ease",
    };
  };

  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none" data-testid="caption-renderer">
      {/* Dynamically injected CSS animations to prevent global CSS pollution */}
      <style>{`
        @keyframes caption-pop {
          0% { transform: scale(0.9); }
          100% { transform: scale(${style.active.scale || 1.08}); }
        }
        @keyframes caption-bounce {
          0%, 100% { transform: translateY(0) scale(${style.active.scale || 1.08}); }
          50% { transform: translateY(-6px) scale(${style.active.scale * 1.04 || 1.12}); }
        }
        @keyframes caption-slide {
          0% { transform: translateY(8px); opacity: 0.65; }
          100% { transform: translateY(0) scale(${style.active.scale || 1.08}); opacity: 1; }
        }
        @keyframes caption-glow {
          0%, 100% { transform: scale(${style.active.scale || 1.08}); text-shadow: 0 0 4px rgba(255,255,255,0.4); }
          50% { transform: scale(${style.active.scale || 1.08}); text-shadow: 0 0 14px ${style.active.color}; }
        }
        @keyframes emoji-pop {
          0% { transform: translate(-50%, 6px) scale(0); opacity: 0; }
          100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
        }
      `}</style>

      <div style={wrap}>
        <div style={boxStyle}>
          <p style={textStyle}>
            {words.map((w, i) => {
              const emoji = style.showEmojis ? getWordEmoji(w.text, w.entity_type) : null;
              return (
                <span key={i} style={wordStyle(w, w.active)} data-active={w.active ? "true" : "false"}>
                  {/* Floating emoji above the active word */}
                  {w.active && emoji && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: "95%",
                        left: "50%",
                        fontSize: "0.85em",
                        transform: "translate(-50%, 0)",
                        animation: "emoji-pop 200ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
                        pointerEvents: "none",
                        zIndex: 20,
                      }}
                    >
                      {emoji}
                    </span>
                  )}
                  {style.uppercase ? (w.text || "").toUpperCase() : w.text}
                </span>
              );
            })}
          </p>

          {/* Dual / Bilingual Secondary Subtitle Line */}
          {style.bilingualText && (
            <p
              style={{
                margin: `${fontSize * 0.15}px 0 0 0`,
                fontFamily: `'${style.font}', sans-serif`,
                fontSize: `${fontSize * 0.72}px`,
                color: "rgba(255, 255, 255, 0.8)",
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              {style.bilingualText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});
