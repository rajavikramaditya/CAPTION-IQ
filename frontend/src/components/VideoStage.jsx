import { useEffect, useState, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { CaptionRenderer } from "@/components/CaptionRenderer";

export const VideoStage = ({ videoUrl, videoRef, words, style, onTimeUpdate, onChangeVideo }) => {
  const containerRef = useRef(null);
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [videoRect, setVideoRect] = useState({
    left: "0px",
    top: "0px",
    width: "100%",
    height: "100%",
  });

  const updateVideoRect = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      return;
    }

    const clientW = video.clientWidth;
    const clientH = video.clientHeight;
    const videoW = video.videoWidth;
    const videoH = video.videoHeight;

    const videoRatio = videoW / videoH;
    const clientRatio = clientW / clientH;

    let actualW = clientW;
    let actualH = clientH;
    let left = 0;
    let top = 0;

    if (clientRatio > videoRatio) {
      // Pillarboxed (black borders on left/right)
      actualW = clientH * videoRatio;
      left = (clientW - actualW) / 2;
    } else {
      // Letterboxed (black borders on top/bottom)
      actualH = clientW / videoRatio;
      top = (clientH - actualH) / 2;
    }

    setVideoRect({
      left: `${left}px`,
      top: `${top}px`,
      width: `${actualW}px`,
      height: `${actualH}px`,
    });
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Use ResizeObserver on video element to catch layout resizing dynamically
    const observer = new ResizeObserver(() => {
      updateVideoRect();
    });
    observer.observe(video);

    // Recalculate when metadata is ready or state updates
    video.addEventListener("loadedmetadata", updateVideoRect);
    video.addEventListener("play", updateVideoRect);
    video.addEventListener("canplay", updateVideoRect);

    return () => {
      observer.disconnect();
      video.removeEventListener("loadedmetadata", updateVideoRect);
      video.removeEventListener("play", updateVideoRect);
      video.removeEventListener("canplay", updateVideoRect);
    };
  }, [videoUrl]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center bg-zinc-950">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        onTimeUpdate={onTimeUpdate}
        data-testid="preview-video"
        className="w-full h-full object-contain"
      />

      {/* 
        Professional caption rendering overlay wrapper.
        Calculates and tracks the actual bounds of the video image itself (excluding black bars).
        Ensures the font size and margins are uniform, centered, and locked to the video.
      */}
      <div
        data-testid="caption-overlay-wrapper"
        style={{
          position: "absolute",
          left: videoRect.left,
          top: videoRect.top,
          width: videoRect.width,
          height: videoRect.height,
          pointerEvents: "none",
        }}
      >
        {/* Safe Area Guides Grid Overlay */}
        {showSafeArea && (
          <div className="absolute inset-x-[8%] top-[12%] bottom-[18%] border-2 border-dashed border-red-500/50 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
            <span className="text-[10px] font-mono text-red-400 bg-black/60 px-1.5 py-0.5 rounded self-start">
              Reels / Shorts Safe Area
            </span>
            <span className="text-[10px] font-mono text-red-400 bg-black/60 px-1.5 py-0.5 rounded self-end">
              Social UI Margin
            </span>
          </div>
        )}

        <CaptionRenderer words={words} style={style} />
      </div>

      {/* Control overlay buttons: Change video & Safe Area Guides toggle */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowSafeArea((v) => !v)}
          data-testid="toggle-safe-area"
          title="Toggle Instagram / Shorts Safe Area Guides"
          className={`h-7 px-2.5 rounded-lg text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 transition-colors ${
            showSafeArea
              ? "bg-red-500/90 text-white shadow-sm"
              : "bg-black/60 hover:bg-black/80 text-white/90"
          }`}
        >
          {showSafeArea ? "Hide Safe Area" : "Safe Area"}
        </button>
        {onChangeVideo && (
          <button
            type="button"
            onClick={onChangeVideo}
            data-testid="change-video-btn"
            className="h-7 px-2.5 rounded-lg text-xs font-semibold bg-black/60 hover:bg-black/80 text-white/90 backdrop-blur-md flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Change Clip
          </button>
        )}
      </div>
    </div>
  );
};
