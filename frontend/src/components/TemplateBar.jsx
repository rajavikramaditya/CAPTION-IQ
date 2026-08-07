import { useState } from "react";
import {
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, Type, Square,
  Sparkles, Smile, Settings2, Play
} from "lucide-react";
import { TEMPLATES, getTemplate, effectiveSettings } from "@/lib/templates";

const Seg = ({ active, onClick, title, children, testId }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    data-testid={testId}
    className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
      active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`}
  >
    {children}
  </button>
);

// Mini live-styled preview of a template for the picker chip.
function ChipPreview({ tpl }) {
  const bg = tpl.box.enabled ? tpl.box.color : "transparent";
  return (
    <div className="h-12 rounded-md bg-gray-900 flex items-center justify-center overflow-hidden">
      <span
        style={{
          fontFamily: `'${tpl.font}', sans-serif`,
          fontWeight: tpl.weight,
          fontSize: "18px",
          color: tpl.active.color,
          backgroundColor: bg,
          padding: tpl.box.enabled ? "2px 8px" : 0,
          borderRadius: "6px",
          textTransform: tpl.uppercase ? "uppercase" : "none",
          WebkitTextStroke: tpl.stroke.width ? `${Math.min(tpl.stroke.width / 3, 1.5)}px ${tpl.stroke.color}` : "0",
          paintOrder: "stroke fill",
          letterSpacing: `${tpl.letterSpacing}em`,
        }}
      >
        Aa
      </span>
    </div>
  );
}

export const TemplateBar = ({ value, onSelect, settings, onSettingsChange }) => {
  const template = getTemplate(value);
  const eff = effectiveSettings(template, settings);
  const [showEffects, setShowEffects] = useState(false);

  return (
    <div
      data-testid="template-bar"
      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 shrink-0 space-y-3"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Caption Style</span>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1" data-testid="position-controls">
            <Seg active={eff.position === "top"} onClick={() => onSettingsChange({ position: "top" })} title="Top" testId="position-top">
              <AlignVerticalJustifyStart className="h-3.5 w-3.5" />
            </Seg>
            <Seg active={eff.position === "center"} onClick={() => onSettingsChange({ position: "center" })} title="Center" testId="position-center">
              <AlignVerticalJustifyCenter className="h-3.5 w-3.5" />
            </Seg>
            <Seg active={eff.position === "bottom"} onClick={() => onSettingsChange({ position: "bottom" })} title="Bottom" testId="position-bottom">
              <AlignVerticalJustifyEnd className="h-3.5 w-3.5" />
            </Seg>
          </div>

          <div className="flex items-center gap-1" data-testid="size-controls">
            {["small", "medium", "large"].map((s) => (
              <Seg key={s} active={eff.size === s} onClick={() => onSettingsChange({ size: s })} title={s} testId={`size-${s}`}>
                {s === "small" ? "S" : s === "medium" ? "M" : "L"}
              </Seg>
            ))}
          </div>

          <Seg active={eff.uppercase} onClick={() => onSettingsChange({ uppercase: !eff.uppercase })} title="Uppercase" testId="toggle-uppercase">
            <Type className="h-3.5 w-3.5" /> AA
          </Seg>

          <Seg active={eff.box} onClick={() => onSettingsChange({ boxOverride: !eff.box })} title="Background box" testId="toggle-box">
            <Square className="h-3.5 w-3.5" /> Box
          </Seg>

          <Seg active={showEffects} onClick={() => setShowEffects(!showEffects)} title="Caption Magic Effects" testId="toggle-effects">
            <Settings2 className="h-3.5 w-3.5 text-[#FA5D29]" /> Effects
          </Seg>
        </div>
      </div>

      {/* Advanced caption magic visual settings */}
      {showEffects && (
        <div className="flex flex-col gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
          {/* Animation row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 mr-2 flex items-center gap-1">
              <Play className="h-3.5 w-3.5" /> Animation
            </span>
            <div className="flex items-center gap-1">
              {["pop", "bounce", "slide", "glow", "none"].map((anim) => (
                <button
                  key={anim}
                  type="button"
                  onClick={() => onSettingsChange({ animation: anim })}
                  data-testid={`anim-${anim}`}
                  className={`text-xs px-2 py-1 rounded-md capitalize font-medium border transition-colors ${
                    eff.animation === anim
                      ? "bg-gray-900 border-gray-900 text-white"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {anim}
                </button>
              ))}
            </div>
          </div>

          {/* Words Per Line slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 shrink-0 flex items-center gap-1">
              <Type className="h-3.5 w-3.5" /> Words/Line
            </span>
            <input
              type="range"
              min={1}
              max={6}
              step={1}
              value={settings?.maxWords ?? 4}
              onChange={(e) => onSettingsChange({ maxWords: Number(e.target.value) })}
              data-testid="words-per-line-slider"
              className="flex-1 h-1.5 rounded-full accent-[#FA5D29] cursor-pointer"
            />
            <span className="text-xs font-bold text-gray-700 w-5 text-center">
              {settings?.maxWords ?? 4}
            </span>
          </div>

          {/* Semantic & Emojis toggles */}
          <div className="flex items-center gap-2">
            <Seg active={eff.semanticHighlight} onClick={() => onSettingsChange({ semanticHighlight: !eff.semanticHighlight })} title="AI Highlight Entities" testId="toggle-semantic-highlight">
              <Sparkles className="h-3.5 w-3.5" /> Highlight
            </Seg>

            <Seg active={eff.showEmojis} onClick={() => onSettingsChange({ showEmojis: !eff.showEmojis })} title="AI Auto Emojis" testId="toggle-show-emojis">
              <Smile className="h-3.5 w-3.5" /> Emojis
            </Seg>
          </div>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar" data-testid="template-chips">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onSelect(tpl.id)}
            data-testid={`template-chip-${tpl.id}`}
            className={`flex-shrink-0 w-28 rounded-xl p-1.5 border transition-all ${
              value === tpl.id ? "border-[#FA5D29] ring-2 ring-orange-200" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <ChipPreview tpl={tpl} />
            <span className="block text-xs font-medium text-gray-700 mt-1.5 truncate">{tpl.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

