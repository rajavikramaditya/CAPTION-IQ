import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { AuthShell, GoogleButton } from "@/components/AuthShell";

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, password, name);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create your studio" subtitle="Start captioning in seconds — no card needed.">
      <form onSubmit={submit} className="space-y-4" data-testid="signup-form">
        <div>
          <label className="text-sm font-medium text-gray-700">Name</label>
          <input
            type="text" required value={name} onChange={(e) => setName(e.target.value)}
            data-testid="signup-name"
            className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#FA5D29] focus:ring-2 focus:ring-orange-100 transition"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            data-testid="signup-email"
            className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#FA5D29] focus:ring-2 focus:ring-orange-100 transition"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Password</label>
          <input
            type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            data-testid="signup-password"
            className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#FA5D29] focus:ring-2 focus:ring-orange-100 transition"
            placeholder="At least 6 characters"
          />
        </div>
        <button
          type="submit" disabled={loading} data-testid="signup-submit"
          className="w-full bg-[#FA5D29] hover:bg-[#E04C1E] text-white py-3 rounded-xl font-medium shadow-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create account"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <GoogleButton label="Sign up with Google" />

      <p className="text-sm text-gray-500 mt-6 text-center">
        Already have an account?{" "}
        <Link to="/login" className="text-[#FA5D29] font-medium hover:underline" data-testid="go-login">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
