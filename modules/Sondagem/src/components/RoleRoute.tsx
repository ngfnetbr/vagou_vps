// @ts-nocheck
import { useAuth } from "@root/contexts/AuthContext";
import { Navigate, Outlet } from "react-router-dom";

type AppRole = "admin" | "equipe_pedagogica" | "coordenador" | "responsavel";

interface RoleRouteProps {
  allowedRoles: AppRole[];
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!role || !allowedRoles.includes(role as AppRole)) {
    return <Navigate to="/modulo/sondar" replace />;
  }

  return <Outlet />;
}

