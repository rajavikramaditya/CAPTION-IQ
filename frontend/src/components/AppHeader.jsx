import { Sparkles, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export const AppHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const doLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
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
        <div className="flex items-center gap-4">
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
  );
};
