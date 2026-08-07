import { useState } from "react";
import { SEMANTIC_STYLES } from "@/lib/semantics";
import { cn } from "@/lib/utils";
import { WordEditPopover } from "@/components/WordEditPopover";

/**
 * SemanticWord — a single transcript word.
 *
 * - Semantic entities get a coloured badge.
 * - Currently-playing word gets a dark "active" pill.
 * - Double-clicking opens WordEditPopover for inline editing (when edit props supplied).
 *
 * Edit props (optional — if not provided, word is read-only):
 *   wordId, segmentId, start, end, isFirstInSegment
 *   onWordUpdate, onWordDelete, onSegmentSplit
 */
export const SemanticWord = ({
  text,
  entityType,
  confidence,
  speakerId,
  active,
  // edit props
  wordId,
  segmentId,
  start,
  end,
  isFirstInSegment,
  onWordUpdate,
  onWordDelete,
  onSegmentSplit,
  // seek prop
  onSeek,
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const isEntity = Boolean(entityType);
  const isEditable = Boolean(wordId && onWordUpdate);
  const isLowConfidence = confidence !== null && confidence !== undefined && confidence < 0.65;

  const handleClick = (e) => {
    e.stopPropagation(); // Don't let parent line's onClick fire
    e.preventDefault();  // Prevent Radix PopoverTrigger from opening on single-click
    if (onSeek && start != null) onSeek(start);
  };

  const wordSpan = (
    <span
      data-testid="caption-word"
      data-entity={entityType || "none"}
      data-active={active ? "true" : "false"}
      title={isLowConfidence ? `Low AI confidence (${Math.round(confidence * 100)}%) — double click to edit` : start != null ? `${text} (${start.toFixed(2)}s)` : undefined}
      onClick={handleClick}
      onDoubleClick={isEditable ? () => setPopoverOpen(true) : undefined}
      className={cn(
        "inline-block rounded-md transition-all duration-150 relative",
        isEntity && "px-1.5 py-0.5 border font-semibold",
        isEntity && SEMANTIC_STYLES[entityType],
        isLowConfidence && !active && "underline decoration-wavy decoration-red-400 underline-offset-4",
        speakerId === "speaker_b" && !isEntity && "border-l-2 border-indigo-400 pl-1",
        active && "bg-gray-900 text-white border-gray-900 shadow-sm scale-[1.04]",
        isEditable && "cursor-pointer hover:ring-2 hover:ring-[#FA5D29]/40 hover:ring-offset-1"
      )}
    >
      {text}
      {isLowConfidence && !active && (
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
      )}
    </span>
  );

  if (!isEditable) return wordSpan;

  return (
    <WordEditPopover
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      wordId={wordId}
      segmentId={segmentId}
      text={text}
      start={start}
      end={end}
      entityType={entityType}
      isFirstInSegment={isFirstInSegment}
      onWordUpdate={onWordUpdate}
      onWordDelete={onWordDelete}
      onSegmentSplit={onSegmentSplit}
    >
      {wordSpan}
    </WordEditPopover>
  );
};
