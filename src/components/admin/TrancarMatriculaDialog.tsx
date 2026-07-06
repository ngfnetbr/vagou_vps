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
import { PauseCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MotivoSelect } from "./MotivoSelect";

interface TrancarMatriculaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crianca: {
    id: string;
    nome: string;
    cmei_atual?: { nome: string } | null;
    turma_atual?: { nome: string } | null;
  } | null;
  onConfirm: (justificativa: string) => void;
  loading?: boolean;
}

export function TrancarMatriculaDialog({
  open,
  onOpenChange,
  crianca,
  onConfirm,
  loading = false,
}: TrancarMatriculaDialogProps) {
  const [justificativa, setJustificativa] = useState("");

  if (!crianca) return null;

  const handleConfirm = () => {
    onConfirm(justificativa);
    setJustificativa("");
  };

  const handleClose = () => {
    setJustificativa("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trancar Matrícula</DialogTitle>
          <DialogDescription>
            Pausar temporariamente a matrícula da criança
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <PauseCircle className="h-4 w-4" />
            <AlertDescription>
              A matrícula será trancada e a vaga liberada temporariamente. Os
              dados da unidade e turma serão mantidos para eventual retorno.
            </AlertDescription>
          </Alert>

          <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
            <p>
              <span className="font-medium">Criança:</span> {crianca.nome}
            </p>
            <p>
              <span className="font-medium">Unidade Atual:</span>{" "}
              {crianca.cmei_atual?.nome || "Nenhum"}
            </p>
            <p>
              <span className="font-medium">Turma Atual:</span>{" "}
              {crianca.turma_atual?.nome || "Nenhuma"}
            </p>
          </div>

          <MotivoSelect
            tipo="fim_fila"
            value={justificativa}
            onChange={setJustificativa}
            label="Motivo do Trancamento"
            placeholder="Ex: Viagem temporária, tratamento de saúde..."
            required
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!justificativa.trim() || loading}
          >
            {loading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
            Trancar Matrícula
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
