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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { School, Link2, Unlink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Usuario,
  useVincularDiretorCmei,
  useDesvincularDiretorCmei,
} from "@/hooks/api/usuarios-hooks";
import { useAllCMEIs } from "@/hooks/api/admin-hooks";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

interface DiretorCmeiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: Usuario | null;
}

export function DiretorCmeiDialog({ open, onOpenChange, usuario }: DiretorCmeiDialogProps) {
  const { data: cmeis, isLoading: loadingCmeis } = useAllCMEIs();
  const { data: config } = useConfiguracoesSistema();
  const { singular, plural } = getUnidadeLabels(config as any);
  const vincular = useVincularDiretorCmei();
  const desvincular = useDesvincularDiretorCmei();
  const currentCmeiId = usuario?.cmeis_vinculados?.[0]?.id || "";
  const [selectedCmeiId, setSelectedCmeiId] = useState<string>(currentCmeiId);

  useEffect(() => {
    setSelectedCmeiId(currentCmeiId);
  }, [currentCmeiId, open]);

  if (!usuario) return null;

  const vinculadosIds = usuario.cmeis_vinculados?.map((c) => c.id) || [];
  const isDiretor = usuario.roles.includes("diretor_cmei");
  const isPortalEscola = usuario.roles.includes("school_coord");
  const unidadePortalLabel = "instituição";
  const pluralPortalLabel = "instituições";
  const dialogTitle = isPortalEscola && !isDiretor
    ? "Vincular Instituição (Portal da Escola)"
    : isDiretor && !isPortalEscola
      ? `Vincular ${singular} (Diretor)`
      : `Vincular ${singular}`;
  const dialogDescription = isPortalEscola && !isDiretor
    ? `Defina qual ${unidadePortalLabel} o usuário ${usuario.nome_completo || usuario.email} poderá acessar no Portal da Escola (SAM)`
    : isDiretor && !isPortalEscola
      ? `Defina qual ${singular.toLowerCase()} o usuário ${usuario.nome_completo || usuario.email} poderá acessar como Diretor`
      : `Defina qual ${singular.toLowerCase()} o usuário ${usuario.nome_completo || usuario.email} poderá acessar`;
  const unidadeLabel = isPortalEscola && !isDiretor ? unidadePortalLabel : singular.toLowerCase();
  const unidadesLabel = isPortalEscola && !isDiretor ? pluralPortalLabel : plural;
  const unidadesFiltradas = (cmeis || []).filter((c: any) => {
    if (!c.ativo) return false;
    if (isPortalEscola && !isDiretor) return c.tipo_unidade === "escola";
    if (isDiretor && !isPortalEscola) return c.tipo_unidade !== "escola";
    return true;
  });

  const handleSave = async () => {
    for (const cmeiId of vinculadosIds) {
      if (!selectedCmeiId || cmeiId !== selectedCmeiId) {
        await desvincular.mutateAsync({ userId: usuario.id, cmeiId });
      }
    }

    if (selectedCmeiId && !vinculadosIds.includes(selectedCmeiId)) {
      await vincular.mutateAsync({ userId: usuario.id, cmeiId: selectedCmeiId });
    }

    onOpenChange(false);
  };

  const isLoading = vincular.isPending || desvincular.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>

        {!isDiretor && !isPortalEscola && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Atenção:</strong> Este usuário ainda não possui o perfil de Diretor nem de Portal da Escola.
              Atribua um desses papéis primeiro para que o vínculo tenha efeito.
            </p>
          </div>
        )}

        <div className="py-4">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Vinculos atuais em {unidadesLabel}:</p>
            <div className="flex flex-wrap gap-2">
              {usuario.cmeis_vinculados?.map((cmei) => (
                <Badge key={cmei.id} variant="secondary" className="flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  {cmei.nome}
                </Badge>
              ))}
              {(!usuario.cmeis_vinculados || usuario.cmeis_vinculados.length === 0) && (
                <span className="text-sm text-muted-foreground">Nenhuma vinculação</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Selecione a {unidadeLabel} vinculada a esse usuário:</p>
            {loadingCmeis ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[250px] rounded-md border p-3">
                <RadioGroup value={selectedCmeiId} onValueChange={setSelectedCmeiId} className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem id="cmei-none" value="" />
                    <Label htmlFor="cmei-none" className="flex-1 cursor-pointer">
                      <span className="font-medium">Nenhuma {unidadeLabel}</span>
                    </Label>
                  </div>
                  {unidadesFiltradas.map((cmei) => (
                    <div key={cmei.id} className="flex items-center space-x-3">
                      <RadioGroupItem id={`cmei-${cmei.id}`} value={cmei.id} />
                      <Label htmlFor={`cmei-${cmei.id}`} className="flex-1 cursor-pointer">
                        <span className="font-medium">{cmei.nome}</span>
                        {cmei.bairro && (
                          <span className="text-sm text-muted-foreground ml-2">
                            ({cmei.bairro})
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </ScrollArea>
            )}
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading || selectedCmeiId === currentCmeiId}>
            {isLoading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Vínculos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
