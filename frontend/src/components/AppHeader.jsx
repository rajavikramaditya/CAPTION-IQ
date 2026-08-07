import { useState } from "react";
import { Sparkles, LogOut, HelpCircle, Clock, Keyboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const AppHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const doLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const SHORTCUTS = [
    { key: "Space", desc: "Play / Pause video playback" },
    { key: "← / →", desc: "Seek video backward / forward by 3 seconds" },
    { key: "Ctrl + Z", desc: "Undo last caption edit" },
    { key: "Ctrl + Shift + Z", desc: "Redo last caption edit" },
    { key: "Ctrl + F", desc: "Open Search & Replace panel" },
    { key: "Ctrl + Enter", desc: "Generate captions for clip" },
    { key: "Esc", desc: "Close open panels and popovers" },
  ];

  return (
    <>
      <header
        data-testid="app-header"
        className="h-20 bg-white/70 backdrop-blur-xl border-b border-gray-200 flex items-center justify-between px-6 lg:px-8 z-50 sticky top-0"
      >
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-3"
          data-testid="header-logo"
        >
          <div className="h-10 w-10 rounded-xl bg-[#FA5D29] flex items-center justify-center shadow-sm">
            <Sparkles className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            Caption<span className="text-[#FA5D29]">IQ</span>
          </h1>
        </button>

        {user && (
          <div className="flex items-center gap-3">
            {/* Quota Minutes Tally Badge */}
            <div
              data-testid="quota-tally"
              title="Monthly Transcription Minutes Usage"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-semibold text-[#FA5D29]"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>12.5 / 60 mins</span>
            </div>

            {/* Shortcuts Help Button */}
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              data-testid="shortcuts-help-btn"
              title="Keyboard Shortcuts Cheat Sheet"
              className="h-9 w-9 rounded-xl border border-gray-200 hover:border-gray-300 flex items-center justify-center text-gray-600 hover:text-[#FA5D29] hover:bg-orange-50 transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
            </button>

            <div className="hidden sm:flex items-center gap-2">
              {user.picture ? (
                <img src={user.picture} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                  {(user.name || user.email || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-gray-700" data-testid="header-user-name">
                {user.name || user.email}
              </span>
            </div>

            <button
              type="button"
              onClick={doLogout}
              data-testid="logout-btn"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg px-3 py-2 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </header>

      {/* Keyboard Shortcuts Cheat Sheet Dialog */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl shadow-xl border border-gray-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Keyboard className="h-5 w-5 text-[#FA5D29]" />
              Keyboard Shortcuts Cheat Sheet
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Speed up your editing workflow with these studio hotkeys.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2">
            {SHORTCUTS.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-xs font-semibold text-gray-700">{s.desc}</span>
                <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white border border-gray-200 rounded shadow-xs text-[#FA5D29]">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
