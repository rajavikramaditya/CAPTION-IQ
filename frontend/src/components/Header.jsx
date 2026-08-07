import { Sparkles } from "lucide-react";

export const Header = () => {
  return (
    <header
      data-testid="app-header"
      className="h-20 bg-white/70 backdrop-blur-xl border-b border-gray-200 flex items-center justify-between px-6 lg:px-8 z-50 sticky top-0"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#FA5D29] flex items-center justify-center shadow-sm">
          <Sparkles className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <div className="leading-none">
          <h1
            className="text-2xl font-extrabold tracking-tight text-gray-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Caption<span className="text-[#FA5D29]">IQ</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            AI caption studio for Indian creators
          </p>
        </div>
      </div>
      <span className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-3 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Hinglish ready
      </span>
    </header>
  );
};
