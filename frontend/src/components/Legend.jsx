import { LEGEND_ITEMS } from "@/lib/semantics";

export const Legend = () => {
  return (
    <div
      data-testid="semantic-legend"
      className="flex flex-wrap gap-3 text-xs font-medium pb-4 border-b border-gray-100"
    >
      <span className="text-gray-400 font-semibold uppercase tracking-wide self-center">
        Semantic key
      </span>
      {LEGEND_ITEMS.map((item) => (
        <span
          key={item.type}
          data-testid={`legend-${item.type}`}
          className="inline-flex items-center gap-1.5 text-gray-600"
        >
          <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
};
