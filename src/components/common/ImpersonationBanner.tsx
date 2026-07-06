import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  getImpersonationOrigin,
  restoreSuperAdminSession,
  type ImpersonationOrigin,
} from "@/hooks/api/superadmin-painel-hooks";
import { toast } from "sonner";

export function ImpersonationBanner() {
  const [origin, setOrigin] = useState<ImpersonationOrigin | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    setOrigin(getImpersonationOrigin());
    const onStorage = () => setOrigin(getImpersonationOrigin());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [user?.id]);

  if (!origin) return null;

  const handleReturn = async () => {
    setLoading(true);
    try {
      await restoreSuperAdminSession();
      setOrigin(null);
      toast.success("Você voltou para o Super Admin.");
      navigate("/superadmin/usuarios");
    } catch {
      toast.error("Não foi possível restaurar a sessão. Faça login novamente.");
      navigate("/auth/login");
    } finally {
      setLoading(false);
    }
  };

  const label = origin.target_name || origin.target_email || "usuário";

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 bg-primary px-4 py-2 text-sm text-primary-foreground shadow-md">
      <Eye className="h-4 w-4 shrink-0" />
      <span className="truncate">
        Visualizando como <strong>{label}</strong> (modo Super Admin)
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 shrink-0 gap-1"
        onClick={handleReturn}
        disabled={loading}
      >
        <LogOut className="h-3.5 w-3.5" />
        Voltar ao Super Admin
      </Button>
    </div>
  );
}
