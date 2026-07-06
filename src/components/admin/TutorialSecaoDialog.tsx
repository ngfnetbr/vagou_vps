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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  TutorialSecao,
  TutorialSecaoInput,
  useCreateTutorialSecao,
  useUpdateTutorialSecao,
} from "@/hooks/api/tutoriais-hooks";

interface TutorialSecaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secao?: TutorialSecao | null;
}

export function TutorialSecaoDialog({
  open,
  onOpenChange,
  secao,
}: TutorialSecaoDialogProps) {
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    icone: "help-circle",
    ordem: 0,
    ativo: true,
    conteudo: [{ subtitle: "", text: "" }],
  });

  const createSecao = useCreateTutorialSecao();
  const updateSecao = useUpdateTutorialSecao();

  useEffect(() => {
    if (secao) {
      setForm({
        titulo: secao.titulo,
        descricao: secao.descricao || "",
        icone: secao.icone || "help-circle",
        ordem: secao.ordem,
        ativo: secao.ativo,
        conteudo: secao.conteudo || [{ subtitle: "", text: "" }],
      });
    } else {
      setForm({
        titulo: "",
        descricao: "",
        icone: "help-circle",
        ordem: 0,
        ativo: true,
        conteudo: [{ subtitle: "", text: "" }],
      });
    }
  }, [secao, open]);

  const handleSubmit = () => {
    if (!form.titulo.trim()) {
      return;
    }

    const conteudoValido = form.conteudo.filter(
      (c) => c.subtitle.trim() || c.text.trim()
    );

    const data: TutorialSecaoInput = {
      titulo: form.titulo,
      descricao: form.descricao || undefined,
      icone: form.icone || undefined,
      ordem: form.ordem,
      ativo: form.ativo,
      conteudo: conteudoValido.length > 0 ? conteudoValido : [{ subtitle: "", text: "" }],
    };

    if (secao) {
      updateSecao.mutate({ id: secao.id, ...data }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createSecao.mutate(data, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const addConteudo = () => {
    setForm({
      ...form,
      conteudo: [...form.conteudo, { subtitle: "", text: "" }],
    });
  };

  const removeConteudo = (index: number) => {
    if (form.conteudo.length <= 1) return;
    setForm({
      ...form,
      conteudo: form.conteudo.filter((_, i) => i !== index),
    });
  };

  const updateConteudo = (index: number, field: "subtitle" | "text", value: string) => {
    const newConteudo = [...form.conteudo];
    newConteudo[index][field] = value;
    setForm({ ...form, conteudo: newConteudo });
  };

  const isPending = createSecao.isPending || updateSecao.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {secao ? "Editar Seção" : "Nova Seção do Guia"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ex: Fila de Espera"
              />
            </div>
            <div className="space-y-2">
              <Label>Ícone (código)</Label>
              <Input
                value={form.icone}
                onChange={(e) => setForm({ ...form, icone: e.target.value })}
                placeholder="Ex: list-ordered"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: Gerencie a fila de crianças aguardando vaga"
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Conteúdo</Label>
              <Button type="button" variant="outline" size="sm" onClick={addConteudo}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Item
              </Button>
            </div>

            {form.conteudo.map((item, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={item.subtitle}
                    onChange={(e) => updateConteudo(index, "subtitle", e.target.value)}
                    placeholder="Subtítulo"
                    className="flex-1"
                  />
                  {form.conteudo.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeConteudo(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Textarea
                  value={item.text}
                  onChange={(e) => updateConteudo(index, "text", e.target.value)}
                  placeholder="Texto explicativo..."
                  rows={3}
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Salvando..." : secao ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

