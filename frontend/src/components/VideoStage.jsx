import { RefreshCw } from "lucide-react";
import { CaptionRenderer } from "@/components/CaptionRenderer";

export const VideoStage = ({ videoUrl, videoRef, words, style, onTimeUpdate, onChangeVideo }) => {
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

      {/* Professional caption rendering engine */}
      <CaptionRenderer words={words} style={style} />

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
