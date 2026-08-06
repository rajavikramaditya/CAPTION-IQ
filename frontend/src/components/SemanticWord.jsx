import { SEMANTIC_STYLES } from "@/lib/semantics";
import { cn } from "@/lib/utils";

// A single transcript word. Semantic entities get a colored badge,
// the currently playing word gets a dark "active" pill.
export const SemanticWord = ({ text, entityType, active }) => {
  const isEntity = Boolean(entityType);

  return (
    <span
      data-testid="caption-word"
      data-entity={entityType || "none"}
      data-active={active ? "true" : "false"}
      className={cn(
        "inline-block rounded-md transition-all duration-150",
        isEntity && "px-1.5 py-0.5 border font-semibold",
        isEntity && SEMANTIC_STYLES[entityType],
        active &&
          "bg-gray-900 text-white border-gray-900 shadow-sm scale-[1.04]"
      )}
    >
      {text}
    </span>
  );
};
