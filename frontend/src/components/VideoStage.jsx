import { useEffect, useState, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { CaptionRenderer } from "@/components/CaptionRenderer";

/**
 * VideoStage — professional video preview.
 *
 * previewMode (prop from Studio):
 *   "portrait"  → constrains to 9:16 aspect ratio, fills available height
 *   "landscape" → fills full width, 16:9 aspect ratio
 *
 * Caption overlay tracks the actual rendered video rectangle, excluding black bars.
 * 60fps RAF timing loop for smooth word-level highlighting.
 */
export const VideoStage = ({ videoUrl, videoRef, words, style, previewMode = "landscape", onTimeUpdate, onChangeVideo }) => {
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [overlayRect, setOverlayRect] = useState(null);

  // ── Caption overlay: tracks actual rendered video pixels, not the outer box ──
  const computeOverlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Use naturalWidth/Height if available, else fall back to a ratio we know from mode
    const natW = video.videoWidth  || (previewMode === "portrait" ? 9  : 16);
    const natH = video.videoHeight || (previewMode === "portrait" ? 16 : 9);
    const clientW = video.clientWidth;
    const clientH = video.clientHeight;
    if (!clientW || !clientH) return;

    const natRatio    = natW / natH;
    const clientRatio = clientW / clientH;

    let imgW, imgH, imgLeft, imgTop;
    if (clientRatio > natRatio) {
      // Pillarboxed — bars on left/right
      imgH    = clientH;
      imgW    = clientH * natRatio;
      imgTop  = 0;
      imgLeft = (clientW - imgW) / 2;
    } else {
      // Letterboxed — bars on top/bottom
      imgW    = clientW;
      imgH    = clientW / natRatio;
      imgLeft = 0;
      imgTop  = (clientH - imgH) / 2;
    }

    setOverlayRect({ top: imgTop, left: imgLeft, width: imgW, height: imgH });
  }, [videoRef, previewMode]);

  // Watch video element size with ResizeObserver + metadata events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const ro = new ResizeObserver(computeOverlay);
    ro.observe(video);
    video.addEventListener("loadedmetadata", computeOverlay);
    video.addEventListener("canplay",         computeOverlay);

    return () => {
      ro.disconnect();
      video.removeEventListener("loadedmetadata", computeOverlay);
      video.removeEventListener("canplay",         computeOverlay);
    };
  }, [videoUrl, computeOverlay]);

  // Re-compute when previewMode changes (column width changes → video resizes)
  useEffect(() => {
    const t = setTimeout(computeOverlay, 80); // after CSS transition settles
    return () => clearTimeout(t);
  }, [previewMode, computeOverlay]);

  // 60fps RAF timing — replaces timeupdate (~4 Hz) for smooth word highlighting
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onTimeUpdate) return;

    let rafId = null;
    const tick      = () => { onTimeUpdate({ target: video }); rafId = requestAnimationFrame(tick); };
    const startTick = () => { if (!rafId) rafId = requestAnimationFrame(tick); };
    const stopTick  = () => { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } };
    const onSeeking = () => onTimeUpdate({ target: video });

    video.addEventListener("play",    startTick);
    video.addEventListener("pause",   stopTick);
    video.addEventListener("ended",   stopTick);
    video.addEventListener("seeking", onSeeking);

    return () => {
      stopTick();
      video.removeEventListener("play",    startTick);
      video.removeEventListener("pause",   stopTick);
      video.removeEventListener("ended",   stopTick);
      video.removeEventListener("seeking", onSeeking);
    };
  }, [videoRef, onTimeUpdate]);

  // ── Container sizing per preview mode ──
  // Portrait: narrow container, 9:16 aspect, fills available height with minimal black bars
  // Landscape: full-width container, 16:9 aspect
  const containerCls =
    previewMode === "portrait"
      ? "h-full aspect-[9/16] max-w-full mx-auto"
      : "w-full h-full";

  return (
    <div
      className="relative w-full h-full flex items-center justify-center bg-zinc-950 overflow-hidden"
      style={{ borderRadius: "inherit" }}
    >
      {/* Video + caption overlay */}
      <div
        className={`relative overflow-hidden bg-black shadow-xl flex-shrink-0 ${containerCls}`}
        style={{ borderRadius: previewMode === "portrait" ? "12px" : "8px" }}
      >
        <video
          ref={videoRef}
          src={videoUrl || undefined}
          controls
          data-testid="preview-video"
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />

        {/* Caption overlay — positioned exactly over the rendered video frame */}
        {overlayRect && (
          <div
            data-testid="caption-overlay-wrapper"
            style={{
              position: "absolute",
              top:    overlayRect.top,
              left:   overlayRect.left,
              width:  overlayRect.width,
              height: overlayRect.height,
              pointerEvents: "none",
            }}
          >
            {showSafeArea && (
              <div className="absolute inset-x-[8%] top-[12%] bottom-[18%] border-2 border-dashed border-red-400/60 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
                <span className="text-[10px] font-mono text-red-300 bg-black/60 px-1.5 py-0.5 rounded self-start">Safe Area</span>
                <span className="text-[10px] font-mono text-red-300 bg-black/60 px-1.5 py-0.5 rounded self-end">Social UI</span>
              </div>
            )}
            <CaptionRenderer words={words} style={style} />
          </div>
        )}

        {/* Empty state — only when no video URL */}
        {!videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-white/30">
              <div className="text-4xl mb-2 font-bold">▶</div>
              <p className="text-xs font-medium tracking-wide">Upload a clip to begin</p>
            </div>
          </div>
        )}
      </div>

      {/* Safe Area toggle — top-right HUD */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowSafeArea(v => !v)}
          data-testid="toggle-safe-area"
          className={`h-7 px-2.5 rounded-lg text-xs font-semibold backdrop-blur-sm flex items-center gap-1.5 transition-colors ${
            showSafeArea ? "bg-red-500/90 text-white" : "bg-black/55 hover:bg-black/75 text-white/85"
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
    </div>
  );
};
