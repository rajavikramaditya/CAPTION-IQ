import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50" data-testid="auth-loading">
        <Loader2 className="h-6 w-6 animate-spin text-[#FA5D29]" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
};
