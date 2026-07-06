import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Layers } from "lucide-react";
import { ModuleKey, Usuario, useSetUserModules } from "@/hooks/api/usuarios-hooks";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";

interface UserModulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: Usuario | null;
}

const moduleOptions: Array<{ value: ModuleKey; label: string }> = [
  { value: "vagou", label: "VAGOU" },
  { value: "sam", label: "SAM" },
  { value: "sondagem", label: "Sondagem" },
];

export function UserModulesDialog({ open, onOpenChange, usuario }: UserModulesDialogProps) {
  const setModules = useSetUserModules();
  const { data: config } = useConfiguracoesSistema();
  const samHabilitado = config?.habilitar_sam ?? true;
  const sondagemHabilitada = config?.habilitar_sondagem ?? true;
  const [selected, setSelected] = useState<ModuleKey[]>([]);

  const isResponsavelOnly = Boolean(
    usuario?.roles.includes("responsavel") &&
      !usuario?.roles.includes("admin") &&
      !usuario?.roles.includes("superadmin") &&
      !usuario?.roles.includes("gestor") &&
      !usuario?.roles.includes("diretor_cmei") &&
      !usuario?.roles.includes("school_coord")
  );

  useEffect(() => {
    if (!usuario || !open) return;
    if (isResponsavelOnly) {
      setSelected(["vagou"]);
      return;
    }
    if (usuario.modules && usuario.modules.length > 0) {
      setSelected(usuario.modules);
      return;
    }
    if (usuario.roles.includes("school_coord")) {
      setSelected(["sam"]);
      return;
    }
    if (usuario.roles.includes("diretor_cmei")) {
      setSelected(["vagou"]);
      return;
    }
    setSelected(["vagou"]);
  }, [usuario, open, isResponsavelOnly]);

  if (!usuario) return null;

  const lockedVagouOnly = usuario.roles.includes("diretor_cmei");
  const lockedSamOnly = usuario.roles.includes("school_coord");

  const toggle = (module: ModuleKey, checked: boolean) => {
    if (isResponsavelOnly) return;
    const next = new Set(selected);
    if (checked) next.add(module);
    else next.delete(module);
    if (lockedVagouOnly) {
      next.clear();
      next.add("vagou");
    }
    if (lockedSamOnly) {
      next.clear();
      next.add("sam");
    }
    if (isResponsavelOnly) next.clear();
    setSelected(Array.from(next));
  };

  const handleSave = async () => {
    if (isResponsavelOnly) {
      await setModules.mutateAsync({ userId: usuario.id, modules: ["vagou"] });
      onOpenChange(false);
      return;
    }
    const finalModules = lockedVagouOnly ? ["vagou"] : lockedSamOnly ? ["sam"] : selected;
    await setModules.mutateAsync({ userId: usuario.id, modules: finalModules as any });
    onOpenChange(false);
  };

  const isLoading = setModules.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Acesso aos Módulos
          </DialogTitle>
          <DialogDescription>
            Defina quais módulos {usuario.nome_completo || usuario.email} pode acessar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="text-muted-foreground">Usuário</p>
            <p className="font-medium">{usuario.nome_completo || "Nome não informado"}</p>
            <p className="text-muted-foreground">{usuario.email}</p>
          </div>

          <div className="space-y-3">
            {moduleOptions.map((opt) => {
              const checked = selected.includes(opt.value);
              const disabled =
                (lockedVagouOnly && opt.value !== "vagou") ||
                (lockedSamOnly && opt.value !== "sam") ||
                (isResponsavelOnly && opt.value !== "vagou") ||
                (opt.value === "sam" && !samHabilitado) ||
                (opt.value === "sondagem" && !sondagemHabilitada);
              return (
                <div key={opt.value} className="flex items-center space-x-3">
                  <Checkbox
                    id={`module-${opt.value}`}
                    checked={checked}
                    onCheckedChange={(v) => toggle(opt.value, v === true)}
                    disabled={disabled}
                  />
                  <Label htmlFor={`module-${opt.value}`} className="cursor-pointer">
                    {opt.label}
                  </Label>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            {selected.map((m) => {
              const label = moduleOptions.find((o) => o.value === m)?.label || m;
              return (
                <Badge key={m} variant="outline">
                  {label}
                </Badge>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading || selected.length === 0}>
            {isLoading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
