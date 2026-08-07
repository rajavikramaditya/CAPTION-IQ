import { useState } from "react";
import { toast } from "sonner";
import {
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, Type, Square,
  Sparkles, Smile, Settings2, Play, Palette, Save, CheckCircle2
} from "lucide-react";
import { TEMPLATES, getTemplate, effectiveSettings } from "@/lib/templates";

import { FontUploader } from "@/components/FontUploader";

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
          <button
            type="button"
            onClick={() => {
              const name = prompt("Enter a name for your custom preset:", "My Custom Style");
              if (!name) return;
              try {
                const existing = JSON.parse(localStorage.getItem("captioniq:custom_presets") || "[]");
                const newPreset = { id: `preset_${Date.now()}`, name, settings: { ...settings } };
                localStorage.setItem("captioniq:custom_presets", JSON.stringify([...existing, newPreset]));
                toast.success(`Preset "${name}" saved! ✨`);
              } catch (e) {
                toast.error("Failed to save preset");
              }
            }}
            data-testid="save-preset-btn"
            title="Save current style settings as reusable custom preset"
            className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-orange-50 border border-orange-200 text-[#FA5D29] hover:bg-orange-100 flex items-center gap-1.5 transition-colors"
          >
            <Save className="h-3.5 w-3.5" /> Save Preset
          </button>
          <FontUploader onFontUploaded={(font) => onSettingsChange({ customFont: font.family })} />
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

          {/* Custom Color Pickers row */}
          <div className="flex items-center gap-4 flex-wrap pt-1 border-t border-gray-200/60">
            {/* Active Word Color */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                <Palette className="h-3 w-3 text-[#FA5D29]" /> Active Color
              </span>
              <input
                type="color"
                value={settings?.activeColor || template.active.color}
                onChange={(e) => onSettingsChange({ activeColor: e.target.value })}
                data-testid="active-color-picker"
                className="h-6 w-7 rounded cursor-pointer border-0 bg-transparent p-0"
              />
            </div>

            {/* Background Box Color */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-gray-500">Box Color</span>
              <input
                type="color"
                value={settings?.boxColor || template.box.color || "#000000"}
                onChange={(e) => onSettingsChange({ boxColor: e.target.value })}
                data-testid="box-color-picker"
                className="h-6 w-7 rounded cursor-pointer border-0 bg-transparent p-0"
              />
            </div>

            {/* Stroke Width Slider */}
            <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
              <span className="text-[11px] font-semibold text-gray-500 shrink-0">Stroke</span>
              <input
                type="range"
                min={0}
                max={5}
                step={0.5}
                value={settings?.strokeWidth ?? template.stroke.width ?? 0}
                onChange={(e) => onSettingsChange({ strokeWidth: Number(e.target.value) })}
                data-testid="stroke-width-slider"
                className="flex-1 h-1.5 rounded-full accent-[#FA5D29] cursor-pointer"
              />
              <span className="text-[10px] font-bold text-gray-600 w-4 text-center">
                {settings?.strokeWidth ?? template.stroke.width ?? 0}
              </span>
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
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Seg active={eff.semanticHighlight} onClick={() => onSettingsChange({ semanticHighlight: !eff.semanticHighlight })} title="AI Highlight Entities" testId="toggle-semantic-highlight">
                <Sparkles className="h-3.5 w-3.5" /> Highlight
              </Seg>

              <Seg active={eff.showEmojis} onClick={() => onSettingsChange({ showEmojis: !eff.showEmojis })} title="AI Auto Emojis" testId="toggle-show-emojis">
                <Smile className="h-3.5 w-3.5" /> Emojis
              </Seg>
            </div>

            {/* Smart Category Filter Toggles & Custom Palette Pickers */}
            {eff.semanticHighlight && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-200/60" data-testid="category-toggles">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mr-1">Highlight:</span>
                {[
                  { type: "person",   label: "Persons 🟡",  defaultColor: "#facc15" },
                  { type: "action",   label: "Actions 🟢",  defaultColor: "#4ade80" },
                  { type: "location", label: "Places 🔵",   defaultColor: "#60a5fa" },
                  { type: "number",   label: "Numbers 🟣",  defaultColor: "#c084fc" },
                  { type: "time",     label: "Time 🌐",     defaultColor: "#22d3ee" },
                  { type: "emotion",  label: "Emotions 💖", defaultColor: "#f472b6" },
                ].map(({ type, label, defaultColor }) => {
                  const enabledList = settings?.enabledCategories ?? ["person", "action", "location", "number", "time", "emotion"];
                  const isChecked = enabledList.includes(type);
                  const customColor = settings?.categoryColors?.[type] || defaultColor;

                  return (
                    <div key={type} className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const next = isChecked
                            ? enabledList.filter((c) => c !== type)
                            : [...enabledList, type];
                          onSettingsChange({ enabledCategories: next });
                        }}
                        className={`text-[11px] font-semibold flex items-center gap-1 ${
                          isChecked ? "text-gray-900" : "text-gray-400 line-through"
                        }`}
                      >
                        <CheckCircle2 className={`h-3 w-3 ${isChecked ? "text-[#FA5D29]" : "text-gray-300"}`} />
                        {label}
                      </button>

                      {/* Category Color Picker */}
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => {
                          const categoryColors = { ...(settings?.categoryColors || {}), [type]: e.target.value };
                          onSettingsChange({ categoryColors });
                        }}
                        title={`Customize ${label} highlight color`}
                        className="h-4 w-4 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                    </div>
                  );
                })}
              </div>
            )}
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

