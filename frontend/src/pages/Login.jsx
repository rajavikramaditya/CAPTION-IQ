import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { AuthShell, GoogleButton } from "@/components/AuthShell";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your caption studio.">
      <form onSubmit={submit} className="space-y-4" data-testid="login-form">
        <div>
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            data-testid="login-email"
            className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#FA5D29] focus:ring-2 focus:ring-orange-100 transition"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Password</label>
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            data-testid="login-password"
            className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#FA5D29] focus:ring-2 focus:ring-orange-100 transition"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit" disabled={loading} data-testid="login-submit"
          className="w-full bg-[#FA5D29] hover:bg-[#E04C1E] text-white py-3 rounded-xl font-medium shadow-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Log in"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <GoogleButton label="Continue with Google" />

      <p className="text-sm text-gray-500 mt-6 text-center">
        New here?{" "}
        <Link to="/signup" className="text-[#FA5D29] font-medium hover:underline" data-testid="go-signup">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
