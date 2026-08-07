/**
 * TimelineBar — Interactive caption segment timeline scrubber.
 *
 * Displays caption segments as visual blocks along the video duration timeline.
 * Highlights current playing segment and renders a red playhead indicator.
 * Clicking anywhere seeks the video.
 *
 * Props:
 *   segments    — list of CaptionSegment objects { id, start, end, text, word_ids }
 *   currentTime — current video playback time in seconds
 *   duration    — total video duration in seconds
 *   onSeek      — callback(timeInSeconds)
 */
import { useRef } from "react";

function fmtTime(s) {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function TimelineBar({ segments = [], currentTime = 0, duration = 0, onSeek, onSegmentTimingChange }) {
  const trackRef = useRef(null);

  const dur = Math.max(duration || 0, segments.reduce((max, s) => Math.max(max, s.end || 0), 0), 1);
  const playheadPct = Math.min(100, Math.max(0, (currentTime / dur) * 100));

  const handleTrackClick = (e) => {
    if (!trackRef.current || !onSeek) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(pct * dur);
  };

  return (
    <div
      data-testid="timeline-bar"
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 select-none flex flex-col gap-2 shrink-0"
    >
      {/* Header bar: Time readouts & label */}
      <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
        <span className="flex items-center gap-1.5 text-gray-700 font-semibold">
          <span className="h-2 w-2 rounded-full bg-[#FA5D29] animate-pulse" />
          Timeline
        </span>
        <div className="flex items-center gap-1 font-mono text-gray-600">
          <span className="text-[#FA5D29] font-bold">{fmtTime(currentTime)}</span>
          <span>/</span>
          <span>{fmtTime(dur)}</span>
        </div>
      </div>

      {/* Main Track */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        data-testid="timeline-track"
        className="relative h-10 bg-gray-900 rounded-lg cursor-pointer overflow-hidden border border-gray-800 group shadow-inner"
      >
        {/* Background Audio Waveform Peaks Canvas */}
        <div className="absolute inset-0 flex items-center justify-between px-1 opacity-30 pointer-events-none">
          {[...Array(60)].map((_, i) => {
            const timeAtBar = (i / 60) * dur;
            const inSpeech = segments.some((s) => timeAtBar >= s.start && timeAtBar <= s.end);
            const h = inSpeech ? Math.max(20, (Math.sin(i * 0.8) * 0.5 + 0.5) * 80) : 10;
            return (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className={`w-0.5 rounded-full transition-all ${inSpeech ? "bg-orange-400" : "bg-gray-600"}`}
              />
            );
          })}
        </div>
        {/* Time Grid ticks (every 25%) */}
        {[25, 50, 75].map((pct) => (
          <div
            key={pct}
            style={{ left: `${pct}%` }}
            className="absolute top-0 bottom-0 border-l border-gray-200/60 pointer-events-none"
          />
        ))}

        {/* Caption Segments as Blocks */}
        {segments.map((seg, i) => {
          const leftPct = Math.min(100, Math.max(0, (seg.start / dur) * 100));
          const widthPct = Math.min(100 - leftPct, Math.max(0.5, ((seg.end - seg.start) / dur) * 100));
          const isActive = currentTime >= seg.start && currentTime <= seg.end;

          return (
            <div
              key={seg.id || i}
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              onClick={(e) => {
                e.stopPropagation();
                onSeek?.(seg.start);
              }}
              title={`${seg.text} (${fmtTime(seg.start)} - ${fmtTime(seg.end)})`}
              data-testid={`timeline-segment-${i}`}
              className={`absolute top-1 bottom-1 rounded-md px-1.5 text-[10px] font-semibold truncate flex items-center justify-between transition-all group/seg ${
                isActive
                  ? "bg-[#FA5D29] text-white shadow-sm ring-2 ring-orange-300 z-10 scale-[1.02]"
                  : "bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-200/80"
              }`}
            >
              {/* Left Drag Handle */}
              <div
                className="w-1.5 h-full bg-white/40 hover:bg-white rounded-l cursor-ew-resize opacity-0 group-hover/seg:opacity-100 transition-opacity"
                title="Drag to adjust start time"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const startX = e.clientX;
                  const initStart = seg.start;
                  const onMouseMove = (moveEvent) => {
                    if (!trackRef.current) return;
                    const rect = trackRef.current.getBoundingClientRect();
                    const deltaX = moveEvent.clientX - startX;
                    const deltaTime = (deltaX / rect.width) * dur;
                    const newStart = Math.max(0, Math.min(seg.end - 0.1, initStart + deltaTime));
                    onSegmentTimingChange?.(seg.id, newStart, seg.end);
                  };
                  const onMouseUp = () => {
                    window.removeEventListener("mousemove", onMouseMove);
                    window.removeEventListener("mouseup", onMouseUp);
                  };
                  window.addEventListener("mousemove", onMouseMove);
                  window.addEventListener("mouseup", onMouseUp);
                }}
              />

              <span className="truncate flex-1 px-1">{seg.text}</span>

              {/* Right Drag Handle */}
              <div
                className="w-1.5 h-full bg-white/40 hover:bg-white rounded-r cursor-ew-resize opacity-0 group-hover/seg:opacity-100 transition-opacity"
                title="Drag to adjust end time"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const startX = e.clientX;
                  const initEnd = seg.end;
                  const onMouseMove = (moveEvent) => {
                    if (!trackRef.current) return;
                    const rect = trackRef.current.getBoundingClientRect();
                    const deltaX = moveEvent.clientX - startX;
                    const deltaTime = (deltaX / rect.width) * dur;
                    const newEnd = Math.max(seg.start + 0.1, Math.min(dur, initEnd + deltaTime));
                    onSegmentTimingChange?.(seg.id, seg.start, newEnd);
                  };
                  const onMouseUp = () => {
                    window.removeEventListener("mousemove", onMouseMove);
                    window.removeEventListener("mouseup", onMouseUp);
                  };
                  window.addEventListener("mousemove", onMouseMove);
                  window.addEventListener("mouseup", onMouseUp);
                }}
              />
            </div>
          );
        })}

        {/* Red Playhead line */}
        <div
          style={{ left: `${playheadPct}%` }}
          className="absolute top-0 bottom-0 w-0.5 bg-red-600 z-20 pointer-events-none transition-all duration-75"
        >
          {/* Top playhead handle triangle */}
          <div className="absolute -top-1 -left-[5px] w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-red-600" />
        </div>
      </div>
    </div>
  );
}
