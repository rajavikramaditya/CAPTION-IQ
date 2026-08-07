/**
 * useCaptionHistory — Undo/Redo stack for CaptionDocument edits.
 *
 * Usage:
 *   const { captionDoc, setCaptionDoc, push, undo, redo, canUndo, canRedo } =
 *     useCaptionHistory(initialDoc);
 *
 * Callers use `push(newDoc)` when making edits, `undo()` / `redo()` for history.
 * Max 50 states stored to keep memory bounded.
 */
import { useState, useCallback, useRef } from "react";

const MAX_HISTORY = 50;

export function useCaptionHistory(initialDoc) {
  // undoStack holds past states (newest at end)
  const undoStack = useRef([]);
  // redoStack holds future states (newest at end, cleared on new edit)
  const redoStack = useRef([]);

  const [captionDoc, setCaptionDocState] = useState(initialDoc);

  // Call this to set a completely new initial state (e.g. after loading from server)
  const resetHistory = useCallback((doc) => {
    undoStack.current = [];
    redoStack.current = [];
    setCaptionDocState(doc);
  }, []);

  // Push current state to undo stack before applying a change
  const push = useCallback((newDoc) => {
    // Save current to undo stack
    undoStack.current = [...undoStack.current, captionDoc].slice(-MAX_HISTORY);
    // Clear redo stack — new edit invalidates future
    redoStack.current = [];
    setCaptionDocState(newDoc);
    return newDoc;
  }, [captionDoc]);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return null;
    const prev = undoStack.current[undoStack.current.length - 1];
    undoStack.current = undoStack.current.slice(0, -1);
    // Save current to redo stack
    redoStack.current = [...redoStack.current, captionDoc].slice(-MAX_HISTORY);
    setCaptionDocState(prev);
    return prev;
  }, [captionDoc]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return null;
    const next = redoStack.current[redoStack.current.length - 1];
    redoStack.current = redoStack.current.slice(0, -1);
    undoStack.current = [...undoStack.current, captionDoc].slice(-MAX_HISTORY);
    setCaptionDocState(next);
    return next;
  }, [captionDoc]);

  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;

  return {
    captionDoc,
    setCaptionDoc: setCaptionDocState,
    resetHistory,
    push,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
