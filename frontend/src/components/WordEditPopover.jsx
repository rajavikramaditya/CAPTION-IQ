import { useState, useCallback } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Pencil, Scissors, Trash2, UserCircle2, MapPin, Zap, XCircle } from "lucide-react";

const ENTITY_OPTIONS = [
  { value: null,       label: "None",     color: "bg-gray-100 text-gray-600 border-gray-200" },
  { value: "person",   label: "Person",   color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "location", label: "Location", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "action",   label: "Action",   color: "bg-green-100 text-green-800 border-green-300" },
];

/**
 * WordEditPopover — renders an inline editing popover for a single caption word.
 *
 * Opens on double-click (triggered by parent SemanticWord).
 * Allows editing: text, start/end timestamps, entity tag, split segment, delete word.
 *
 * Props:
 *   open          — controlled open state
 *   onOpenChange  — setter for open state
 *   children      — the trigger element (the word span)
 *   wordId        — id of the word being edited
 *   segmentId     — id of the segment this word belongs to
 *   text          — current word text
 *   start         — current start time (seconds)
 *   end           — current end time (seconds)
 *   entityType    — current entity tag (person|location|action|null)
 *   isFirstInSegment — if true, Split is disabled (can't split at first word)
 *   onWordUpdate  — (wordId, patch) => void
 *   onWordDelete  — (wordId) => void
 *   onSegmentSplit — (segmentId, wordId) => void
 */
export function WordEditPopover({
  open,
  onOpenChange,
  children,
  wordId,
  segmentId,
  text,
  start,
  end,
  entityType,
  isFirstInSegment,
  onWordUpdate,
  onWordDelete,
  onSegmentSplit,
}) {
  const [localText, setLocalText] = useState(text);
  const [localStart, setLocalStart] = useState(String(start ?? ""));
  const [localEnd, setLocalEnd] = useState(String(end ?? ""));
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset local state when popover opens with fresh word data
  const handleOpenChange = useCallback((next) => {
    if (next) {
      setLocalText(text);
      setLocalStart(String(start ?? ""));
      setLocalEnd(String(end ?? ""));
      setConfirmDelete(false);
    }
    onOpenChange(next);
  }, [text, start, end, onOpenChange]);

  const commit = useCallback(() => {
    const newStart = parseFloat(localStart);
    const newEnd = parseFloat(localEnd);
    const patch = {};
    if (localText.trim() && localText.trim() !== text) patch.text = localText.trim();
    if (!isNaN(newStart) && newStart !== start) patch.start = newStart;
    if (!isNaN(newEnd) && newEnd !== end && newEnd > (isNaN(newStart) ? start : newStart)) {
      patch.end = newEnd;
    }
    if (Object.keys(patch).length > 0) {
      onWordUpdate(wordId, patch);
    }
    onOpenChange(false);
  }, [localText, localStart, localEnd, text, start, end, wordId, onWordUpdate, onOpenChange]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") { onOpenChange(false); }
  };

  const handleEntityChange = (val) => {
    onWordUpdate(wordId, { entity_type: val });
    // keep popover open so user sees the change
  };

  const handleSplit = () => {
    onSegmentSplit(segmentId, wordId);
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onWordDelete(wordId);
    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-72 p-0 shadow-xl border border-gray-200 rounded-2xl overflow-hidden"
        side="top"
        align="center"
        sideOffset={6}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
          <Pencil className="h-3.5 w-3.5 text-[#FA5D29]" />
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Edit Word</span>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Word text */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Word</label>
            <input
              autoFocus
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#FA5D29]/40 focus:border-[#FA5D29] bg-white text-gray-900"
              placeholder="Word text"
            />
          </div>

          {/* Timing */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Start (s)</label>
              <input
                type="number"
                value={localStart}
                onChange={(e) => setLocalStart(e.target.value)}
                onKeyDown={handleKeyDown}
                step="0.01"
                min="0"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#FA5D29]/40 focus:border-[#FA5D29] bg-white text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">End (s)</label>
              <input
                type="number"
                value={localEnd}
                onChange={(e) => setLocalEnd(e.target.value)}
                onKeyDown={handleKeyDown}
                step="0.01"
                min="0"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#FA5D29]/40 focus:border-[#FA5D29] bg-white text-gray-900"
              />
            </div>
          </div>

          {/* Entity tag */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Semantic Tag</label>
            <div className="flex gap-1.5 flex-wrap">
              {ENTITY_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => handleEntityChange(opt.value)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${opt.color} ${
                    entityType === opt.value ? "ring-2 ring-offset-1 ring-gray-400 scale-105" : "opacity-70 hover:opacity-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
          {/* Save */}
          <button
            type="button"
            onClick={commit}
            className="flex-1 text-xs font-semibold bg-[#FA5D29] hover:bg-[#E04C1E] text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Save
          </button>

          {/* Split */}
          {!isFirstInSegment && (
            <button
              type="button"
              onClick={handleSplit}
              title="Split line here"
              className="text-xs font-medium flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Scissors className="h-3 w-3" />
              Split
            </button>
          )}

          {/* Delete */}
          <button
            type="button"
            onClick={handleDelete}
            title={confirmDelete ? "Click again to confirm delete" : "Delete word"}
            className={`text-xs font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors ${
              confirmDelete
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600"
            }`}
          >
            {confirmDelete ? <XCircle className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
            {confirmDelete ? "Confirm" : "Delete"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
