import { useEffect, useState, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { CaptionRenderer } from "@/components/CaptionRenderer";

export const VideoStage = ({ videoUrl, videoRef, words, style, onTimeUpdate, onChangeVideo }) => {
  const containerRef = useRef(null);
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
        className="absolute pointer-events-none"
        style={{
          left: videoRect.left,
          top: videoRect.top,
          width: videoRect.width,
          height: videoRect.height,
        }}
      >
        <CaptionRenderer words={words} style={style} />
      </div>

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
