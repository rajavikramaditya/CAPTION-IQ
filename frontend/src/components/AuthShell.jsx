import { Sparkles } from "lucide-react";

export const AuthShell = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen w-full flex bg-gray-50">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 relative overflow-hidden flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#FA5D29] flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
            Caption<span className="text-[#FA5D29]">IQ</span>
          </span>
        </div>
        <div className="max-w-md">
          <h2 className="text-4xl font-bold tracking-tight text-white leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            The AI caption studio built for Indian creators.
          </h2>
          <p className="mt-4 text-gray-400 text-base leading-relaxed">
            Auto-transcribe Hinglish, and let captions understand your story — names, places
            and actions light up automatically.
          </p>
          <div className="flex gap-3 mt-8">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-gray-300 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-yellow-400" /> Person
            </span>
            <span className="inline-flex items-center gap-2 text-xs font-medium text-gray-300 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-400" /> Location
            </span>
            <span className="inline-flex items-center gap-2 text-xs font-medium text-gray-300 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-green-400" /> Action
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-600">© 2026 CaptionIQ</div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-9 w-9 rounded-xl bg-[#FA5D29] flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Caption<span className="text-[#FA5D29]">IQ</span>
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            {title}
          </h1>
          <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
};

export const GoogleButton = ({ label }) => {
  const handleGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  return (
    <button
      type="button"
      onClick={handleGoogle}
      data-testid="google-auth-btn"
      className="w-full flex items-center justify-center gap-3 border border-gray-200 hover:bg-gray-50 rounded-xl py-3 font-medium text-gray-700 transition-colors"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
        <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 6.98 9.14 4.75 12 4.75z" />
      </svg>
      {label}
    </button>
  );
};
