import { useEffect, useState, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { CaptionRenderer } from "@/components/CaptionRenderer";

/**
 * VideoStage — professional video preview with adaptive portrait/landscape layout.
 *
 * Features:
 * - Automatically detects video orientation (portrait 9:16 vs landscape 16:9)
 * - Portrait: tall narrow preview centered, fills available height
 * - Landscape: full-width preview
 * - Caption overlay tracks the actual rendered video rectangle (no black bars)
 * - 60fps RAF-based playback timing for smooth word highlighting
 * - Safe area guide toggle for Reels/Shorts creators
 */
export const VideoStage = ({ videoUrl, videoRef, words, style, onTimeUpdate, onChangeVideo }) => {
  const stageRef = useRef(null);
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [videoDims, setVideoDims] = useState(null);       // { w, h } natural video dimensions
  const [overlayRect, setOverlayRect] = useState(null);   // { top, left, width, height } in px

  // Compute caption overlay rect to match actual rendered video pixels (excluding black bars)
  const computeOverlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const natW = video.videoWidth;
    const natH = video.videoHeight;
    const clientW = video.clientWidth;
    const clientH = video.clientHeight;

    const natRatio = natW / natH;
    const clientRatio = clientW / clientH;

    let imgW, imgH, imgLeft, imgTop;
    if (clientRatio > natRatio) {
      // Pillarboxed — black bars left/right
      imgH = clientH;
      imgW = clientH * natRatio;
      imgTop = 0;
      imgLeft = (clientW - imgW) / 2;
    } else {
      // Letterboxed — black bars top/bottom
      imgW = clientW;
      imgH = clientW / natRatio;
      imgLeft = 0;
      imgTop = (clientH - imgH) / 2;
    }

    setOverlayRect({ top: imgTop, left: imgLeft, width: imgW, height: imgH });
  }, [videoRef]);

  // Track video metadata + resize changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onMeta = () => {
      setVideoDims({ w: video.videoWidth, h: video.videoHeight });
      computeOverlay();
    };

    const ro = new ResizeObserver(computeOverlay);
    ro.observe(video);

    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("canplay", computeOverlay);

    return () => {
      ro.disconnect();
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("canplay", computeOverlay);
    };
  }, [videoUrl, computeOverlay]);

  // 60fps RAF timing loop — replaces timeupdate (~4Hz) for smooth word highlighting
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onTimeUpdate) return;

    let rafId = null;

    const tick = () => {
      onTimeUpdate({ target: video });
      rafId = requestAnimationFrame(tick);
    };

    const startTick = () => {
      if (!rafId) rafId = requestAnimationFrame(tick);
    };
    const stopTick = () => {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    };

    video.addEventListener("play", startTick);
    video.addEventListener("pause", stopTick);
    video.addEventListener("ended", stopTick);
    // Instantly update on manual seek
    const onSeeking = () => onTimeUpdate({ target: video });
    video.addEventListener("seeking", onSeeking);

    return () => {
      stopTick();
      video.removeEventListener("play", startTick);
      video.removeEventListener("pause", stopTick);
      video.removeEventListener("ended", stopTick);
      video.removeEventListener("seeking", onSeeking);
    };
  }, [videoRef, onTimeUpdate]);

  const isPortrait = videoDims ? videoDims.h > videoDims.w : false;

  // Portrait: constrain width so the video fits the available height naturally
  // Landscape: full width, height from aspect ratio
  const videoContainerStyle = isPortrait
    ? {
        height: "100%",
        aspectRatio: `${videoDims.w} / ${videoDims.h}`,
        maxWidth: "100%",
        maxHeight: "100%",
      }
    : {
        width: "100%",
        height: "100%",
        maxHeight: "100%",
      };

  return (
    <div
      ref={stageRef}
      className="relative w-full h-full flex items-center justify-center bg-zinc-950 overflow-hidden"
      style={{ borderRadius: "inherit" }}
    >
      {/* Centered video container with aspect-ratio-aware sizing */}
      <div
        className="relative flex-shrink-0 overflow-hidden bg-black shadow-2xl"
        style={{
          ...videoContainerStyle,
          borderRadius: isPortrait ? "12px" : "8px",
        }}
      >
        <video
          ref={videoRef}
          src={videoUrl || undefined}
          controls
          data-testid="preview-video"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />

        {/* Caption overlay — tracks actual video image bounds, not the black bars */}
        {overlayRect && (
          <div
            data-testid="caption-overlay-wrapper"
            style={{
              position: "absolute",
              top: overlayRect.top,
              left: overlayRect.left,
              width: overlayRect.width,
              height: overlayRect.height,
              pointerEvents: "none",
            }}
          >
            {/* Safe Area guide for Reels / Shorts */}
            {showSafeArea && (
              <div className="absolute inset-x-[8%] top-[12%] bottom-[18%] border-2 border-dashed border-red-400/60 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
                <span className="text-[10px] font-mono text-red-300 bg-black/60 px-1.5 py-0.5 rounded self-start">
                  Safe Area
                </span>
                <span className="text-[10px] font-mono text-red-300 bg-black/60 px-1.5 py-0.5 rounded self-end">
                  Social UI Margin
                </span>
              </div>
            )}

            <CaptionRenderer words={words} style={style} />
          </div>
        )}

        {/* No-video placeholder */}
        {!videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-white/30">
              <div className="text-3xl mb-2">▶</div>
              <p className="text-xs font-medium tracking-wide">Upload a clip to begin</p>
            </div>
          </div>
        )}
      </div>

      {/* HUD controls — top-right overlay */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowSafeArea((v) => !v)}
          data-testid="toggle-safe-area"
          title="Toggle Reels / Shorts safe area guides"
          className={`h-7 px-2.5 rounded-lg text-xs font-semibold backdrop-blur-sm flex items-center gap-1.5 transition-colors ${
            showSafeArea
              ? "bg-red-500/90 text-white shadow-sm"
              : "bg-black/55 hover:bg-black/75 text-white/85"
          }`}
        >
          {showSafeArea ? "Hide Safe Area" : "Safe Area"}
        </button>
        {onChangeVideo && (
          <button
            type="button"
            onClick={onChangeVideo}
            data-testid="change-video-btn"
            className="h-7 px-2.5 rounded-lg text-xs font-semibold bg-black/55 hover:bg-black/75 text-white/85 backdrop-blur-sm flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Change Clip
          </button>
        )}
      </div>

      {/* Orientation badge */}
      {videoDims && (
        <div className="absolute bottom-3 left-3 z-20">
          <span className="text-[10px] font-mono bg-black/55 text-white/70 px-2 py-0.5 rounded-md backdrop-blur-sm">
            {isPortrait ? `Portrait ${videoDims.w}×${videoDims.h}` : `Landscape ${videoDims.w}×${videoDims.h}`}
          </span>
        </div>
      )}
    </div>
  );
};
