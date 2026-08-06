import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, WandSparkles, FileText } from "lucide-react";
import { Legend } from "@/components/Legend";
import { SemanticWord } from "@/components/SemanticWord";

export const CaptionEditor = ({
  lines,
  loading,
  hasVideo,
  onTranscribe,
  activeLineIndex,
  activeWord,
  onSeek,
}) => {
  const activeRef = useRef(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeLineIndex]);

  const hasCaptions = lines && lines.length > 0;

  return (
    <div
      data-testid="caption-editor"
      className="lg:col-span-5 flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-[#FA5D29]" />
        <h2
          className="text-lg font-semibold tracking-tight text-gray-900"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Transcript
        </h2>
      </div>

      <Legend />

      <div
        data-testid="caption-list"
        className="flex-1 overflow-y-auto space-y-4 pr-2 mt-4 text-lg leading-relaxed text-gray-700 custom-scrollbar"
      >
        {!hasCaptions && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-10">
            <FileText className="h-10 w-10 mb-3 text-gray-300" />
            <p className="text-base font-medium text-gray-500">No captions yet</p>
            <p className="text-sm mt-1 max-w-xs">
              Upload a clip and hit generate — names, places and actions will
              light up automatically.
            </p>
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
          lines.map((line, li) => (
            <motion.p
              key={li}
              ref={li === activeLineIndex ? activeRef : null}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: li * 0.04 }}
              data-testid={`caption-line-${li}`}
              onClick={() => onSeek?.(line.start)}
              className={`cursor-pointer rounded-lg px-2 py-1.5 -mx-2 transition-colors ${
                li === activeLineIndex ? "bg-orange-50" : "hover:bg-gray-50"
              }`}
            >
              {line.words.map((w, wi) => (
                <span key={wi} className="mr-1.5">
                  <SemanticWord
                    text={w.text}
                    entityType={w.entity_type}
                    active={w === activeWord}
                  />
                </span>
              ))}
            </motion.p>
          ))}
      </div>

      {hasVideo && (
        <button
          type="button"
          data-testid="transcribe-btn"
          disabled={loading}
          onClick={onTranscribe}
          className="w-full bg-[#FA5D29] text-white py-4 rounded-xl font-medium shadow-sm hover:bg-[#E04C1E] transition-all disabled:opacity-70 mt-4 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating magic…
            </>
          ) : (
            <>
              <WandSparkles className="h-5 w-5" />
              {hasCaptions ? "Re-generate captions" : "Generate captions"}
            </>
          )}
        </button>
      )}
    </div>
  );
};
