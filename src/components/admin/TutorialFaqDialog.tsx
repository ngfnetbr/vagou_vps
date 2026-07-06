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
import {
  TutorialFaq,
  TutorialFaqInput,
  useCreateTutorialFaq,
  useUpdateTutorialFaq,
} from "@/hooks/api/tutoriais-hooks";

interface TutorialFaqDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faq?: TutorialFaq | null;
}

export function TutorialFaqDialog({
  open,
  onOpenChange,
  faq,
}: TutorialFaqDialogProps) {
  const [form, setForm] = useState({
    categoria: "",
    pergunta: "",
    resposta: "",
    ordem: 0,
    ativo: true,
  });

  const createFaq = useCreateTutorialFaq();
  const updateFaq = useUpdateTutorialFaq();

  useEffect(() => {
    if (faq) {
      setForm({
        categoria: faq.categoria,
        pergunta: faq.pergunta,
        resposta: faq.resposta,
        ordem: faq.ordem,
        ativo: faq.ativo,
      });
    } else {
      setForm({
        categoria: "",
        pergunta: "",
        resposta: "",
        ordem: 0,
        ativo: true,
      });
    }
  }, [faq, open]);

  const handleSubmit = () => {
    if (!form.categoria.trim() || !form.pergunta.trim() || !form.resposta.trim()) {
      return;
    }

    const data: TutorialFaqInput = {
      categoria: form.categoria,
      pergunta: form.pergunta,
      resposta: form.resposta,
      ordem: form.ordem,
      ativo: form.ativo,
    };

    if (faq) {
      updateFaq.mutate({ id: faq.id, ...data }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createFaq.mutate(data, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isPending = createFaq.isPending || updateFaq.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {faq ? "Editar FAQ" : "Nova Pergunta Frequente"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Input
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                placeholder="Ex: Inscrições"
              />
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={form.ordem}
                onChange={(e) => setForm({ ...form, ordem: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pergunta *</Label>
            <Textarea
              value={form.pergunta}
              onChange={(e) => setForm({ ...form, pergunta: e.target.value })}
              placeholder="Ex: Como faço para inscrever uma criança?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Resposta *</Label>
            <Textarea
              value={form.resposta}
              onChange={(e) => setForm({ ...form, resposta: e.target.value })}
              placeholder="Digite a resposta completa..."
              rows={4}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Ativo</Label>
            <Switch
              checked={form.ativo}
              onCheckedChange={(checked) => setForm({ ...form, ativo: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Salvando..." : faq ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

