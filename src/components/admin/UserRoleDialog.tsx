import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ShieldCheck, ShieldAlert, UserCog } from "lucide-react";
import {
  Usuario,
  AppRole,
  roleLabels,
  roleColors,
  useAddUserRole,
  useRemoveUserRole,
} from "@/hooks/api/usuarios-hooks";
import { useAuth } from "@/contexts/AuthContext";

interface UserRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: Usuario | null;
}

const allRoles: AppRole[] = ["responsavel", "gestor", "diretor_cmei", "admin"];

export function UserRoleDialog({ open, onOpenChange, usuario }: UserRoleDialogProps) {
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole("superadmin");
  const addRole = useAddUserRole();
  const removeRole = useRemoveUserRole();
  const [pendingChanges, setPendingChanges] = useState<{ role: AppRole; action: "add" | "remove" }[]>([]);

  if (!usuario) return null;

  const currentRoles = usuario.roles || [];

  const handleToggleRole = (role: AppRole, checked: boolean) => {
    if (checked && !currentRoles.includes(role)) {
      setPendingChanges((prev) => [...prev.filter((c) => c.role !== role), { role, action: "add" }]);
    } else if (!checked && currentRoles.includes(role)) {
      setPendingChanges((prev) => [...prev.filter((c) => c.role !== role), { role, action: "remove" }]);
    } else {
      setPendingChanges((prev) => prev.filter((c) => c.role !== role));
    }
  };

  const isRoleChecked = (role: AppRole) => {
    const pending = pendingChanges.find((c) => c.role === role);
    if (pending) {
      return pending.action === "add";
    }
    return currentRoles.includes(role);
  };

  const handleSave = async () => {
    for (const change of pendingChanges) {
      if (change.action === "add") {
        await addRole.mutateAsync({ userId: usuario.id, role: change.role });
      } else {
        await removeRole.mutateAsync({ userId: usuario.id, role: change.role });
      }
    }
    setPendingChanges([]);
    onOpenChange(false);
  };

  const isLoading = addRole.isPending || removeRole.isPending;

  // Não permitir editar superadmin se não for superadmin
  const canEditRole = (role: AppRole) => {
    if (role === "superadmin" && !isSuperAdmin) return false;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Gerenciar Papéis
          </DialogTitle>
          <DialogDescription>
            Edite os papéis de {usuario.nome_completo || usuario.email}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Papéis atuais:</p>
            <div className="flex flex-wrap gap-2">
              {currentRoles.map((role) => (
                <Badge key={role} className={roleColors[role]}>
                  {roleLabels[role]}
                </Badge>
              ))}
              {currentRoles.length === 0 && (
                <span className="text-sm text-muted-foreground">Nenhum papel atribuído</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Selecione os papéis:</p>
            {allRoles.map((role) => (
              <div key={role} className="flex items-center space-x-3">
                <Checkbox
                  id={`role-${role}`}
                  checked={isRoleChecked(role)}
                  onCheckedChange={(checked) => handleToggleRole(role, !!checked)}
                  disabled={!canEditRole(role)}
                />
                <Label
                  htmlFor={`role-${role}`}
                  className={`flex items-center gap-2 cursor-pointer ${
                    !canEditRole(role) ? "opacity-50" : ""
                  }`}
                >
                  {role === "admin" || role === "superadmin" ? (
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  )}
                  <span>{roleLabels[role]}</span>
                </Label>
              </div>
            ))}
          </div>

          {pendingChanges.length > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Alterações pendentes:</p>
              <ul className="text-sm space-y-1">
                {pendingChanges.map((change) => (
                  <li key={change.role} className="flex items-center gap-2">
                    <span className={change.action === "add" ? "text-green-600" : "text-red-600"}>
                      {change.action === "add" ? "+" : "-"}
                    </span>
                    {roleLabels[change.role]}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading || pendingChanges.length === 0}>
            {isLoading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
