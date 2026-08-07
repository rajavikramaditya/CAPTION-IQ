/**
 * SearchReplacePanel — Floating find & replace for the transcript editor.
 *
 * Props:
 *   words       — current CaptionDocument.words array
 *   onClose     — close the panel
 *   onReplaceAll(find, replace) — batch replace callback
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronUp, ChevronDown, Replace, Search } from "lucide-react";

export function SearchReplacePanel({ words = [], onClose, onReplaceAll, onReplaceOne }) {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);
  const findRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    findRef.current?.focus();
  }, []);

  // Compute matching word IDs
  const matches = useCallback(() => {
    if (!find.trim()) return [];
    return words.filter((w) => {
      const a = caseSensitive ? w.text : w.text.toLowerCase();
      const b = caseSensitive ? find : find.toLowerCase();
      return a === b.trim() || a.startsWith(b.trim());
    });
  }, [words, find, caseSensitive]);

  const matched = matches();
  const matchCount = matched.length;
  const currentMatch = matched[matchIndex % Math.max(matchCount, 1)];

  useEffect(() => {
    setMatchIndex(0);
  }, [find, caseSensitive]);

  const goPrev = () => setMatchIndex((i) => (i - 1 + matchCount) % Math.max(matchCount, 1));
  const goNext = () => setMatchIndex((i) => (i + 1) % Math.max(matchCount, 1));

  const handleReplaceOne = () => {
    if (!currentMatch || !find.trim()) return;
    onReplaceOne?.(currentMatch.id, replace);
    // Stay on same relative index if possible
    setMatchIndex((i) => Math.max(0, Math.min(i, matchCount - 2)));
  };

  const handleReplaceAll = () => {
    if (!find.trim() || matchCount === 0) return;
    onReplaceAll?.(find, replace, caseSensitive);
    setFind("");
    setReplace("");
  };

  return (
    <div
      data-testid="search-replace-panel"
      className="absolute top-0 right-0 z-30 w-80 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden"
      style={{ maxWidth: "calc(100% - 16px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-[#FA5D29]" />
          <span className="text-sm font-semibold text-gray-800">Find & Replace</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          data-testid="search-panel-close"
          className="h-7 w-7 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Find row */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Find</label>
          <div className="relative">
            <input
              ref={findRef}
              type="text"
              value={find}
              onChange={(e) => setFind(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goNext();
                if (e.key === "Escape") onClose?.();
              }}
              data-testid="search-find-input"
              placeholder="Search word..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-20 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[#FA5D29] transition-colors"
            />
            {/* Match count badge */}
            {find.trim() && (
              <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                {matchCount === 0 ? "0" : `${(matchIndex % matchCount) + 1}/${matchCount}`}
              </span>
            )}
            {/* Prev/Next nav */}
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
              <button
                type="button"
                onClick={goPrev}
                disabled={matchCount === 0}
                className="h-6 w-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                title="Previous match"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={matchCount === 0}
                className="h-6 w-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                title="Next match"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Replace row */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Replace with</label>
          <input
            type="text"
            value={replace}
            onChange={(e) => setReplace(e.target.value)}
            data-testid="search-replace-input"
            placeholder="Replacement text..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[#FA5D29] transition-colors"
          />
        </div>

        {/* Case sensitive toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCaseSensitive((v) => !v)}
            data-testid="search-case-toggle"
            className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
              caseSensitive
                ? "bg-gray-900 border-gray-900 text-white"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            Aa Case
          </button>
          {matchCount > 0 && (
            <span className="text-xs text-green-600 font-medium">
              {matchCount} match{matchCount !== 1 ? "es" : ""}
            </span>
          )}
          {find.trim() && matchCount === 0 && (
            <span className="text-xs text-red-400 font-medium">No matches</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleReplaceOne}
            disabled={!find.trim() || matchCount === 0}
            data-testid="replace-one-btn"
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <Replace className="h-3.5 w-3.5" />
            Replace
          </button>
          <button
            type="button"
            onClick={handleReplaceAll}
            disabled={!find.trim() || matchCount === 0}
            data-testid="replace-all-btn"
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg bg-[#FA5D29] hover:bg-[#E04C1E] text-white disabled:opacity-40 transition-colors shadow-sm"
          >
            Replace All ({matchCount})
          </button>
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          <kbd className="font-mono bg-gray-200 px-1 rounded text-gray-500">Enter</kbd> next ·{" "}
          <kbd className="font-mono bg-gray-200 px-1 rounded text-gray-500">Esc</kbd> close
        </p>
      </div>
    </div>
  );
}
