import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, WandSparkles, FileText, Merge, CheckCircle2, AlertCircle, Clock3, Mic, MicOff, Globe } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Legend } from "@/components/Legend";
import { SemanticWord } from "@/components/SemanticWord";

/** Small indicator showing save status */
function SaveIndicator({ status }) {
  if (!status || status === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="h-3 w-3" /> Saved
      </span>
    );
  }
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <Clock3 className="h-3 w-3 animate-pulse" /> Saving…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-500">
      <AlertCircle className="h-3 w-3" /> Save failed
    </span>
  );
}

const LANGUAGES = [
  { value: "hinglish",  label: "Hinglish (Roman)" },
  { value: "hindi",     label: "हिंदी (Hindi)" },
  { value: "english",   label: "English" },
  { value: "urdu",      label: "اردو (Urdu)" },
  { value: "tamil",     label: "தமிழ் (Tamil)" },
  { value: "punjabi",   label: "ਪੰਜਾਬੀ (Punjabi)" },
  { value: "bengali",   label: "বাংলা (Bengali)" },
  { value: "marathi",   label: "मराठी (Marathi)" },
  { value: "telugu",    label: "తెలుగు (Telugu)" },
  { value: "kannada",   label: "ಕನ್ನಡ (Kannada)" },
  { value: "malayalam", label: "മലയാളം (Malayalam)" },
  { value: "gujarati",  label: "ગુજરાતી (Gujarati)" },
  { value: "arabic",    label: "العربية (Arabic)" },
  { value: "nepali",    label: "नेपाली (Nepali)" },
];

export const CaptionEditor = ({
  lines,
  captionDoc,
  loading,
  hasVideo,
  onTranscribe,
  activeLineIndex,
  activeWord,
  onSeek,
  saveStatus,
  onWordUpdate,
  onWordDelete,
  onSegmentSplit,
  onSegmentMerge,
  denoise,
  onDenoiseChange,
  language = "hinglish",
  onLanguageChange,
  onTranslate,
  onRemoveFillers,
  onSwitchScript,
  onSpellcheck,
}) => {
  const activeRef = useRef(null);
  const hasCaptions = lines && lines.length > 0;
  const isEditable = Boolean(captionDoc && onWordUpdate);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeLineIndex]);

  return (
    <div
      data-testid="caption-editor"
      className="flex flex-col h-full"
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[#FA5D29]" />
          <h2
            className="text-base font-semibold tracking-tight text-gray-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Transcript
          </h2>
          {hasCaptions && (
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
              {lines.reduce((n, l) => n + l.words.length, 0)} words
            </span>
          )}
        </div>

        {/* Header toolbar */}
        {hasCaptions && isEditable && (
          <div className="flex items-center gap-2">
            {/* Filler Removal Button */}
            {onRemoveFillers && (
              <button
                type="button"
                onClick={onRemoveFillers}
                data-testid="remove-fillers-btn"
                title="Remove filler words (um, uh, like, matlab, basically)"
                className="text-xs font-semibold px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors flex items-center gap-1"
              >
                <span>Remove Fillers</span>
              </button>
            )}

            {/* Spellcheck & Fix Button */}
            {onSpellcheck && (
              <button
                type="button"
                onClick={onSpellcheck}
                data-testid="spellcheck-btn"
                title="Auto-correct typos and elongated words (e.g. goooood → good)"
                className="text-xs font-semibold px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-colors flex items-center gap-1"
              >
                <span>Spellcheck & Fix</span>
              </button>
            )}

            {/* Script Switcher */}
            {onSwitchScript && (
              <button
                type="button"
                onClick={onSwitchScript}
                data-testid="switch-script-btn"
                title="Toggle script: Roman Hindi ↔ Devanagari Hindi"
                className="text-xs font-semibold px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
              >
                Script (अ/A)
              </button>
            )}

            <SaveIndicator status={saveStatus} />
          </div>
        )}
      </div>

      <Legend />

      {isEditable && hasCaptions && (
        <p className="text-xs text-gray-400 mt-2 mb-0">
          Double-click any word to edit text, timing, or tag.
        </p>
      )}

      <div
        data-testid="caption-list"
        className="flex-1 overflow-y-auto space-y-3 pr-2 mt-3 text-base leading-relaxed text-gray-700 custom-scrollbar"
      >
        {!hasCaptions && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-10 gap-3">
            <FileText className="h-10 w-10 text-gray-300" />
            <div>
              <p className="text-base font-medium text-gray-700">No captions generated yet</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Upload a clip and hit generate — names, places and actions will light up automatically.
              </p>
            </div>

            {/* Custom Vocabulary / Brand Terms Input */}
            {hasVideo && onTranscribe && (
              <div className="w-full max-w-xs mt-2 text-left bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-[#FA5D29]" />
                  Custom Vocabulary / Brand Terms
                </label>
                <input
                  type="text"
                  placeholder="e.g. CaptionIQ, Vikas, Deepmind, Hinglish"
                  data-testid="custom-vocabulary-input"
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val) localStorage.setItem("captioniq:custom_vocab", val);
                  }}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <p className="text-[10px] text-gray-400">
                  Add niche names or slang to boost Whisper recognition accuracy.
                </p>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-5 bg-gray-100 rounded-md" style={{ width: `${90 - i * 12}%` }} />
            ))}
            <p className="text-sm text-gray-400 pt-2">Transcribing & tagging Hinglish…</p>
          </div>
        )}

        {hasCaptions &&
          !loading &&
          lines.map((line, li) => {
            const isLast = li === lines.length - 1;
            return (
              <motion.div
                key={line.id || li}
                ref={li === activeLineIndex ? activeRef : null}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: li * 0.04 }}
                className={`group relative rounded-lg px-2 py-1.5 -mx-2 transition-colors ${
                  li === activeLineIndex ? "bg-orange-50" : "hover:bg-gray-50"
                }`}
              >
                {/* Line text — click to seek */}
                <p
                  data-testid={`caption-line-${li}`}
                  onClick={() => onSeek?.(line.start)}
                  className="cursor-pointer"
                >
                  {line.words.map((w, wi) => (
                    <span key={w.id || wi} className="mr-1.5">
                      <SemanticWord
                        text={w.text}
                        entityType={w.entity_type}
                        confidence={w.confidence}
                        speakerId={w.speaker_id}
                        active={w === activeWord}
                        /* edit props */
                        wordId={isEditable ? w.id : undefined}
                        segmentId={isEditable ? line.id : undefined}
                        start={w.start}
                        end={w.end}
                        isFirstInSegment={wi === 0}
                        onWordUpdate={onWordUpdate}
                        onWordDelete={onWordDelete}
                        onSegmentSplit={onSegmentSplit}
                        onSeek={onSeek}
                      />
                    </span>
                  ))}
                </p>

                {/* Merge with next line button — shown on hover, not on last line */}
                {isEditable && !isLast && onSegmentMerge && (
                  <button
                    type="button"
                    title="Merge with next line"
                    data-testid={`merge-segment-${line.id || li}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSegmentMerge(line.id);
                    }}
                    className="absolute -bottom-2.5 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity
                               inline-flex items-center gap-1 text-xs font-medium text-gray-500
                               bg-white border border-gray-200 hover:border-gray-300 hover:text-gray-700
                               rounded-full px-2 py-0.5 shadow-sm"
                  >
                    <Merge className="h-3 w-3" />
                    Merge ↓
                  </button>
                )}
              </motion.div>
            );
          })}
      </div>

      {hasVideo && (
        <div className="mt-4 space-y-2">
          {/* Language Selector & Translate */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Globe className="h-4 w-4 text-gray-400 shrink-0" />
              <label className="text-sm font-medium text-gray-700 shrink-0">Language</label>
              <select
                value={language}
                onChange={(e) => onLanguageChange?.(e.target.value)}
                data-testid="language-selector"
                className="w-full text-sm text-gray-700 bg-transparent focus:outline-none cursor-pointer truncate"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
            {hasCaptions && onTranslate && (
              <button
                type="button"
                onClick={() => onTranslate(language)}
                data-testid="translate-btn"
                title="Translate captions to selected language"
                className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg bg-orange-100 text-[#FA5D29] hover:bg-orange-200 transition-colors flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" /> Translate
              </button>
            )}
          </div>

          {/* Audio Enhancement Toggle */}
          <div
            className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 cursor-pointer"
            onClick={() => onDenoiseChange?.(!denoise)}
          >
            <div className="flex items-center gap-2">
              {denoise
                ? <Mic className="h-4 w-4 text-[#FA5D29]" />
                : <MicOff className="h-4 w-4 text-gray-400" />}
              <div>
                <p className="text-sm font-medium text-gray-700">Clean Audio</p>
                <p className="text-xs text-gray-400">
                  {denoise ? "AI noise reduction enabled" : "Raw audio — faster"}
                </p>
              </div>
            </div>
            <Switch
              checked={!!denoise}
              onCheckedChange={onDenoiseChange}
              onClick={(e) => e.stopPropagation()}
              data-testid="denoise-toggle"
              className="data-[state=checked]:bg-[#FA5D29]"
            />
          </div>

          {/* Generate/Re-generate Button */}
          <button
            type="button"
            data-testid="transcribe-btn"
            disabled={loading}
            onClick={onTranscribe}
            className="w-full bg-[#FA5D29] text-white py-4 rounded-xl font-medium shadow-sm hover:bg-[#E04C1E] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {denoise ? "Cleaning audio…" : "Generating magic…"}
              </>
            ) : (
              <>
                <WandSparkles className="h-5 w-5" />
                {hasCaptions ? "Re-generate captions" : "Generate captions"}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
