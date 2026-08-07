// 6-Category Semantic entity color mapping
export const SEMANTIC_STYLES = {
  person:   "bg-yellow-100 text-yellow-800 border-yellow-200",
  location: "bg-blue-100 text-blue-800 border-blue-200",
  action:   "bg-green-100 text-green-800 border-green-200",
  number:   "bg-purple-100 text-purple-800 border-purple-200",
  time:     "bg-cyan-100 text-cyan-800 border-cyan-200",
  emotion:  "bg-pink-100 text-pink-800 border-pink-200",
};

// Softer / glow variant used on top of the dark video overlay
export const SEMANTIC_OVERLAY = {
  person:   "text-yellow-300",
  location: "text-blue-300",
  action:   "text-green-300",
  number:   "text-purple-300",
  time:     "text-cyan-300",
  emotion:  "text-pink-300",
};

export const LEGEND_ITEMS = [
  { type: "person",   label: "Person",           dot: "bg-yellow-400" },
  { type: "location", label: "Location",         dot: "bg-blue-400" },
  { type: "action",   label: "Action / Verb",    dot: "bg-green-400" },
  { type: "number",   label: "Number / Money",   dot: "bg-purple-400" },
  { type: "time",     label: "Time / Date",      dot: "bg-cyan-400" },
  { type: "emotion",  label: "Emotion / Hook",   dot: "bg-pink-400" },
];
