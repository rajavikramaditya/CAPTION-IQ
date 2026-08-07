/**
 * useKeyboardShortcuts — Global keyboard shortcut handler for Studio.
 *
 * Shortcuts:
 *   Space          — Play / Pause video
 *   ←  / →         — Seek backward / forward 3 seconds
 *   Ctrl+Z         — Undo last edit
 *   Ctrl+Shift+Z   — Redo
 *   Ctrl+Y         — Redo (Windows alias)
 *   Ctrl+F         — Open Search & Replace panel
 *   Ctrl+Enter     — Trigger transcription
 *   Escape         — Close Search panel / popovers
 *
 * @param {object} handlers — { videoRef, onUndo, onRedo, onToggleSearch, onTranscribe, onEscape }
 */
import { useEffect } from "react";

export function useKeyboardShortcuts({
  videoRef,
  onUndo,
  onRedo,
  onToggleSearch,
  onTranscribe,
  onEscape,
  enabled = true,
}) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e) => {
      const target = e.target;
      // Don't intercept when user is typing inside an input, textarea, or contentEditable
      const isEditing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      const ctrl = e.ctrlKey || e.metaKey;

      // ── Ctrl+Z — Undo ──────────────────────────────────────────────────
      if (ctrl && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        onUndo?.();
        return;
      }

      // ── Ctrl+Shift+Z or Ctrl+Y — Redo ──────────────────────────────────
      if ((ctrl && e.shiftKey && e.key === "Z") || (ctrl && e.key === "y")) {
        e.preventDefault();
        onRedo?.();
        return;
      }

      // ── Ctrl+F — Toggle Search & Replace ───────────────────────────────
      if (ctrl && e.key === "f") {
        e.preventDefault();
        onToggleSearch?.();
        return;
      }

      // ── Ctrl+Enter — Generate Captions ─────────────────────────────────
      if (ctrl && e.key === "Enter") {
        e.preventDefault();
        onTranscribe?.();
        return;
      }

      // ── Escape — Close panels ───────────────────────────────────────────
      if (e.key === "Escape") {
        onEscape?.();
        return;
      }

      // Don't intercept Space/Arrow when typing in a field
      if (isEditing) return;

      const video = videoRef?.current;

      // ── Space — Play / Pause ────────────────────────────────────────────
      if (e.key === " ") {
        e.preventDefault();
        if (!video) return;
        if (video.paused) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
        return;
      }

      // ── ← — Seek back 3s ────────────────────────────────────────────────
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (!video) return;
        video.currentTime = Math.max(0, video.currentTime - 3);
        return;
      }

      // ── → — Seek forward 3s ─────────────────────────────────────────────
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (!video) return;
        video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 3);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, videoRef, onUndo, onRedo, onToggleSearch, onTranscribe, onEscape]);
}
