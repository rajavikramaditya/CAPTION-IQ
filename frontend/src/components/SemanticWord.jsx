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
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const isEntity = Boolean(entityType);
  const isEditable = Boolean(wordId && onWordUpdate);

  const wordSpan = (
    <span
      data-testid="caption-word"
      data-entity={entityType || "none"}
      data-active={active ? "true" : "false"}
      onDoubleClick={isEditable ? () => setPopoverOpen(true) : undefined}
      className={cn(
        "inline-block rounded-md transition-all duration-150",
        isEntity && "px-1.5 py-0.5 border font-semibold",
        isEntity && SEMANTIC_STYLES[entityType],
        active && "bg-gray-900 text-white border-gray-900 shadow-sm scale-[1.04]",
        isEditable && "cursor-pointer hover:ring-2 hover:ring-[#FA5D29]/40 hover:ring-offset-1"
      )}
    >
      {text}
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
