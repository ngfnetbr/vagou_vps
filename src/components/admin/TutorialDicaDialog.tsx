import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  TutorialDica,
  TutorialDicaInput,
  useCreateTutorialDica,
  useUpdateTutorialDica,
} from "@/hooks/api/tutoriais-hooks";

interface TutorialDicaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dica?: TutorialDica | null;
}

export function TutorialDicaDialog({
  open,
  onOpenChange,
  dica,
}: TutorialDicaDialogProps) {
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    icone: "info",
    ordem: 0,
    ativo: true,
  });

  const createDica = useCreateTutorialDica();
  const updateDica = useUpdateTutorialDica();

  useEffect(() => {
    if (dica) {
      setForm({
        titulo: dica.titulo,
        descricao: dica.descricao,
        icone: dica.icone || "info",
        ordem: dica.ordem,
        ativo: dica.ativo,
      });
    } else {
      setForm({
        titulo: "",
        descricao: "",
        icone: "info",
        ordem: 0,
        ativo: true,
      });
    }
  }, [dica, open]);

  const handleSubmit = () => {
    if (!form.titulo.trim() || !form.descricao.trim()) {
      return;
    }

    const data: TutorialDicaInput = {
      titulo: form.titulo,
      descricao: form.descricao,
      icone: form.icone || undefined,
      ordem: form.ordem,
      ativo: form.ativo,
    };

    if (dica) {
      updateDica.mutate({ id: dica.id, ...data }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createDica.mutate(data, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isPending = createDica.isPending || updateDica.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {dica ? "Editar Dica" : "Nova Dica Rápida"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ex: Atalhos de Teclado"
              />
            </div>
            <div className="space-y-2">
              <Label>Ícone (código)</Label>
              <Input
                value={form.icone}
                onChange={(e) => setForm({ ...form, icone: e.target.value })}
                placeholder="Ex: keyboard"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: Use Ctrl+K para abrir a busca rápida"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={form.ordem}
                onChange={(e) => setForm({ ...form, ordem: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center justify-between pt-6">
              <Label>Ativo</Label>
              <Switch
                checked={form.ativo}
                onCheckedChange={(checked) => setForm({ ...form, ativo: checked })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Salvando..." : dica ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

