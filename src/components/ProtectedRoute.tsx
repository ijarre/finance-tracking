import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingState } from "@/components/ui/loading-state";

export default function ProtectedRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingState text="Loading..." />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
