import { RefreshCw } from "lucide-react";
import { SEMANTIC_OVERLAY } from "@/lib/semantics";
import { cn } from "@/lib/utils";

export const VideoStage = ({ videoUrl, videoRef, overlayWords, onTimeUpdate, onChangeVideo }) => {
  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        onTimeUpdate={onTimeUpdate}
        data-testid="preview-video"
        className="w-full h-full object-contain bg-black"
      />

      {/* Live caption overlay */}
      {overlayWords && overlayWords.length > 0 && (
        <div
          data-testid="video-caption-overlay"
          className="absolute inset-x-0 bottom-16 flex justify-center px-6 pointer-events-none"
        >
          <div className="bg-black/45 backdrop-blur-md rounded-xl px-5 py-3 max-w-[90%]">
            <p className="text-center text-xl md:text-2xl font-semibold leading-snug text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {overlayWords.map((w, i) => (
                <span
                  key={i}
                  className={cn(
                    "transition-colors duration-150 mr-1.5",
                    w.entity_type && SEMANTIC_OVERLAY[w.entity_type],
                    w.active && "text-[#FFB27A] underline underline-offset-4"
                  )}
                >
                  {w.text}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        data-testid="change-video-btn"
        onClick={onChangeVideo}
        className="absolute top-4 right-4 z-10 inline-flex items-center gap-2 bg-white/90 hover:bg-white text-gray-800 text-xs font-medium px-3 py-2 rounded-lg shadow-sm transition-colors opacity-0 group-hover:opacity-100"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Change
      </button>
    </div>
  );
};
