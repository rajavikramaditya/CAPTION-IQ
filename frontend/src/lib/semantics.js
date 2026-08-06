// Semantic entity color mapping (design_guidelines.json colors.semantics)
export const SEMANTIC_STYLES = {
  person: "bg-yellow-100 text-yellow-800 border-yellow-200",
  location: "bg-blue-100 text-blue-800 border-blue-200",
  action: "bg-green-100 text-green-800 border-green-200",
};

// Softer / glow variant used on top of the dark video overlay
export const SEMANTIC_OVERLAY = {
  person: "text-yellow-300",
  location: "text-blue-300",
  action: "text-green-300",
};

export const LEGEND_ITEMS = [
  { type: "person", label: "Person", dot: "bg-yellow-400" },
  { type: "location", label: "Location", dot: "bg-blue-400" },
  { type: "action", label: "Action / Verb", dot: "bg-green-400" },
];
