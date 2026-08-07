import { useState } from "react";
import { toast } from "sonner";
import {
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  Type, Square, Sparkles, Smile, Settings2, Play, Palette, Save, CheckCircle2, ChevronDown,
} from "lucide-react";
import { TEMPLATES, getTemplate, effectiveSettings } from "@/lib/templates";
import { FontUploader } from "@/components/FontUploader";

const Seg = ({ active, onClick, title, children, testId }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    data-testid={testId}
    className={`h-7 px-2 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
      active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`}
  >
    {children}
  </button>
);

// Live-styled mini chip for template picker
function ChipPreview({ tpl, active }) {
  const bg = tpl.box.enabled ? tpl.box.color : "transparent";
  const stroke = tpl.stroke.width
    ? `${Math.min(tpl.stroke.width / 3, 1.5)}px ${tpl.stroke.color}`
    : "0";
  return (
    <div
      className={`h-10 rounded-lg flex items-center justify-center overflow-hidden transition-colors ${
        active ? "bg-gray-800" : "bg-gray-900"
      }`}
    >
      <span
        style={{
          fontFamily: `'${tpl.font}', sans-serif`,
          fontWeight: tpl.weight,
          fontSize: "16px",
          color: tpl.active.color,
          backgroundColor: bg,
          padding: tpl.box.enabled ? "1px 7px" : 0,
          borderRadius: "5px",
          textTransform: tpl.uppercase ? "uppercase" : "none",
          WebkitTextStroke: stroke,
          paintOrder: "stroke fill",
          letterSpacing: `${tpl.letterSpacing}em`,
          textShadow: tpl.shadow && tpl.shadow !== "none" ? tpl.shadow : "none",
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
    <div data-testid="template-bar" className="bg-white rounded-xl border border-gray-200 shadow-sm shrink-0">
      {/* ── Row 1: Controls toolbar ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 flex-wrap">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mr-1">Style</span>

        {/* Position */}
        <div className="flex items-center gap-0.5" data-testid="position-controls">
          <Seg active={eff.position === "top"} onClick={() => onSettingsChange({ position: "top" })} title="Top" testId="position-top">
            <AlignVerticalJustifyStart className="h-3 w-3" />
          </Seg>
          <Seg active={eff.position === "center"} onClick={() => onSettingsChange({ position: "center" })} title="Center" testId="position-center">
            <AlignVerticalJustifyCenter className="h-3 w-3" />
          </Seg>
          <Seg active={eff.position === "bottom"} onClick={() => onSettingsChange({ position: "bottom" })} title="Bottom" testId="position-bottom">
            <AlignVerticalJustifyEnd className="h-3 w-3" />
          </Seg>
        </div>

        <div className="w-px h-4 bg-gray-200" />

        {/* Size */}
        <div className="flex items-center gap-0.5" data-testid="size-controls">
          {[["small","S"],["medium","M"],["large","L"]].map(([s, label]) => (
            <Seg key={s} active={eff.size === s} onClick={() => onSettingsChange({ size: s })} title={s} testId={`size-${s}`}>
              {label}
            </Seg>
          ))}
        </div>

        <div className="w-px h-4 bg-gray-200" />

        {/* Uppercase */}
        <Seg active={eff.uppercase} onClick={() => onSettingsChange({ uppercase: !eff.uppercase })} title="Uppercase" testId="toggle-uppercase">
          <Type className="h-3 w-3" /> AA
        </Seg>

        {/* Box */}
        <Seg active={eff.box} onClick={() => onSettingsChange({ boxOverride: !eff.box })} title="Background box" testId="toggle-box">
          <Square className="h-3 w-3" /> Box
        </Seg>

        <div className="w-px h-4 bg-gray-200" />

        {/* Effects toggle */}
        <Seg active={showEffects} onClick={() => setShowEffects(!showEffects)} title="Caption effects & colors" testId="toggle-effects">
          <Settings2 className="h-3 w-3 text-[#FA5D29]" />
          Effects
          <ChevronDown className={`h-3 w-3 transition-transform ${showEffects ? "rotate-180" : ""}`} />
        </Seg>

        {/* Custom Font */}
        <FontUploader onFontUploaded={(font) => onSettingsChange({ customFont: font.family })} />

        {/* Save Preset */}
        <button
          type="button"
          onClick={() => {
            const name = prompt("Preset name:", "My Style");
            if (!name) return;
            try {
              const existing = JSON.parse(localStorage.getItem("captioniq:custom_presets") || "[]");
              localStorage.setItem("captioniq:custom_presets", JSON.stringify([...existing, { id: `preset_${Date.now()}`, name, settings: { ...settings } }]));
              toast.success(`Preset "${name}" saved!`);
            } catch { toast.error("Failed to save preset"); }
          }}
          data-testid="save-preset-btn"
          className="ml-auto h-7 px-2.5 rounded-md text-xs font-semibold bg-orange-50 border border-orange-200 text-[#FA5D29] hover:bg-orange-100 flex items-center gap-1 transition-colors"
        >
          <Save className="h-3 w-3" /> Save
        </button>
      </div>

      {/* ── Effects panel (collapsible) ── */}
      {showEffects && (
        <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-100 space-y-2.5">
          {/* Animation row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1 w-16 shrink-0">
              <Play className="h-3 w-3" /> Anim
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {["pop", "bounce", "slide", "glow", "none"].map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => onSettingsChange({ animation: a })}
                  data-testid={`anim-${a}`}
                  className={`text-xs px-2 py-0.5 rounded capitalize font-medium border transition-colors ${
                    eff.animation === a ? "bg-gray-900 border-gray-900 text-white" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Colors & Stroke row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Palette className="h-3 w-3 text-[#FA5D29]" />
              <span className="text-[11px] font-semibold text-gray-500">Active</span>
              <input type="color" value={settings?.activeColor || template.active.color}
                onChange={(e) => onSettingsChange({ activeColor: e.target.value })}
                data-testid="active-color-picker"
                className="h-5 w-6 rounded cursor-pointer border-0 bg-transparent p-0" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-gray-500">Box</span>
              <input type="color" value={settings?.boxColor || template.box.color || "#000000"}
                onChange={(e) => onSettingsChange({ boxColor: e.target.value })}
                data-testid="box-color-picker"
                className="h-5 w-6 rounded cursor-pointer border-0 bg-transparent p-0" />
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
              <span className="text-[11px] font-semibold text-gray-500 shrink-0">Stroke</span>
              <input type="range" min={0} max={5} step={0.5}
                value={settings?.strokeWidth ?? template.stroke.width ?? 0}
                onChange={(e) => onSettingsChange({ strokeWidth: Number(e.target.value) })}
                data-testid="stroke-width-slider"
                className="flex-1 h-1 rounded-full accent-[#FA5D29] cursor-pointer" />
              <span className="text-[10px] font-bold text-gray-600 w-4 text-center">
                {settings?.strokeWidth ?? template.stroke.width ?? 0}
              </span>
            </div>
          </div>

          {/* Words/chunk slider */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-500 shrink-0 w-16">Words/chunk</span>
            <input type="range" min={2} max={10} step={1}
              value={eff.maxWords}
              onChange={(e) => onSettingsChange({ maxWords: Number(e.target.value) })}
              data-testid="words-per-line-slider"
              className="flex-1 h-1 rounded-full accent-[#FA5D29] cursor-pointer" />
            <span className="text-xs font-bold text-gray-700 w-4 text-center">{eff.maxWords}</span>
          </div>

          {/* Semantic & Emoji toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            <Seg active={eff.semanticHighlight} onClick={() => onSettingsChange({ semanticHighlight: !eff.semanticHighlight })} title="Semantic entity highlights" testId="toggle-semantic-highlight">
              <Sparkles className="h-3 w-3" /> Highlight
            </Seg>
            <Seg active={eff.showEmojis} onClick={() => onSettingsChange({ showEmojis: !eff.showEmojis })} title="AI auto emojis" testId="toggle-show-emojis">
              <Smile className="h-3 w-3" /> Emojis
            </Seg>
          </div>

          {/* Category filter */}
          {eff.semanticHighlight && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-200/60" data-testid="category-toggles">
              {[
                { type: "person",   label: "Person",   color: "#facc15" },
                { type: "action",   label: "Action",   color: "#4ade80" },
                { type: "location", label: "Place",    color: "#60a5fa" },
                { type: "number",   label: "Number",   color: "#c084fc" },
                { type: "time",     label: "Time",     color: "#22d3ee" },
                { type: "emotion",  label: "Emotion",  color: "#f472b6" },
              ].map(({ type, label, color }) => {
                const list = settings?.enabledCategories ?? ["person","action","location","number","time","emotion"];
                const on = list.includes(type);
                const customColor = settings?.categoryColors?.[type] || color;
                return (
                  <div key={type} className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-md px-1.5 py-0.5">
                    <button type="button"
                      onClick={() => {
                        const next = on ? list.filter(c => c !== type) : [...list, type];
                        onSettingsChange({ enabledCategories: next });
                      }}
                      className={`text-[11px] font-semibold flex items-center gap-1 ${on ? "text-gray-900" : "text-gray-400 line-through"}`}
                    >
                      <CheckCircle2 className={`h-3 w-3 ${on ? "text-[#FA5D29]" : "text-gray-300"}`} />
                      {label}
                    </button>
                    <input type="color" value={customColor}
                      onChange={(e) => onSettingsChange({ categoryColors: { ...(settings?.categoryColors || {}), [type]: e.target.value } })}
                      className="h-4 w-4 rounded cursor-pointer border-0 bg-transparent p-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Template chips row ── */}
      <div className="flex gap-2 overflow-x-auto px-3 py-2 custom-scrollbar" data-testid="template-chips">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onSelect(tpl.id)}
            data-testid={`template-chip-${tpl.id}`}
            className={`flex-shrink-0 w-[72px] rounded-lg p-1 border transition-all ${
              value === tpl.id
                ? "border-[#FA5D29] ring-1 ring-orange-300 shadow-sm"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <ChipPreview tpl={tpl} active={value === tpl.id} />
            <span className="block text-[10px] font-semibold text-gray-700 mt-1 truncate text-center leading-tight">
              {tpl.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
