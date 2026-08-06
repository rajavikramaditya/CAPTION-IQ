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

// Professional word-by-word caption renderer. Layout-stable (uniform padding so the
// active word never shifts siblings), animated with targeted CSS transitions.
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

  const wordStyle = (active) => ({
    display: "inline-block",
    marginRight: `${style.wordSpacing}em`,
    padding: `${fontSize * style.wordPad.y}px ${fontSize * style.wordPad.x}px`,
    borderRadius: `${fontSize * (style.active.bgRadius || 0.2)}px`,
    transform: active ? `scale(${style.active.scale})` : "scale(1)",
    color: active ? style.active.color : style.color,
    backgroundColor: active && style.active.bg ? style.active.bg : "transparent",
    fontWeight: active && style.active.weight ? style.active.weight : style.weight,
    transition: "transform 130ms ease, color 130ms ease, background-color 130ms ease",
    willChange: "transform",
  });

  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none" data-testid="caption-renderer">
      <div style={wrap}>
        <div style={boxStyle}>
          <p style={textStyle}>
            {words.map((w, i) => (
              <span key={i} style={wordStyle(w.active)} data-active={w.active ? "true" : "false"}>
                {style.uppercase ? (w.text || "").toUpperCase() : w.text}
              </span>
            ))}
          </p>
        </div>
      </div>
    </div>
  );
});
