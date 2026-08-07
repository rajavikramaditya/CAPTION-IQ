import { useState } from "react";
import { Sparkles, LogOut, HelpCircle, Clock, Keyboard, Gift, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

export const AppHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleCopyRef = () => {
    const code = `https://captioniq.ai/invite?ref=${user?.user_id || "creator"}`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Referral link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <header
        data-testid="app-header"
        className="h-12 bg-white/80 backdrop-blur-xl border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 z-50 sticky top-0"
      >
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2"
          data-testid="header-logo"
        >
          <div className="h-7 w-7 rounded-lg bg-[#FA5D29] flex items-center justify-center shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            Caption<span className="text-[#FA5D29]">IQ</span>
          </h1>
        </button>

        {user && (
          <div className="flex items-center gap-2">
            {/* Quota Minutes Tally Badge */}
            <div
              data-testid="quota-tally"
              title="Monthly Transcription Minutes Usage"
              className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-[11px] font-semibold text-[#FA5D29]"
            >
              <Clock className="h-3 w-3" />
              <span>12.5 / 60 mins</span>
            </div>

            {/* Referral Gift Button */}
            <button
              type="button"
              onClick={() => setReferralOpen(true)}
              data-testid="referral-btn"
              title="Invite creator & get +5 mins free"
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
            >
              <Gift className="h-3 w-3 text-emerald-600" />
              <span>+5 Mins Free</span>
            </button>

            {/* Shortcuts Help Button */}
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              data-testid="shortcuts-help-btn"
              title="Keyboard Shortcuts"
              className="h-7 w-7 rounded-lg border border-gray-200 hover:border-gray-300 flex items-center justify-center text-gray-500 hover:text-[#FA5D29] hover:bg-orange-50 transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>

            <div className="hidden sm:flex items-center gap-1.5">
              {user.picture ? (
                <img src={user.picture} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                  {(user.name || user.email || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-medium text-gray-700" data-testid="header-user-name">
                {user.name || user.email}
              </span>
            </div>

            <button
              type="button"
              onClick={doLogout}
              data-testid="logout-btn"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg px-2.5 py-1 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
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

      {/* Referral Program Dialog */}
      <Dialog open={referralOpen} onOpenChange={setReferralOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl shadow-xl border border-gray-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Gift className="h-5 w-5 text-emerald-600" />
              Invite Creators, Get Free Minutes! 🎁
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Share your personal invite link. When a creator signs up, you both get +5 bonus transcription minutes instantly!
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2">
              <input
                type="text"
                readOnly
                value={`https://captioniq.ai/invite?ref=${user?.user_id || "creator"}`}
                className="flex-1 text-xs bg-transparent border-0 font-mono text-gray-700 focus:outline-none"
              />
              <button
                onClick={handleCopyRef}
                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 text-center">
              No limit on invites! Earn up to 300 free minutes per month.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
