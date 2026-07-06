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
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MotivoSelect } from "./MotivoSelect";

interface TransferirMunicipioDialogProps {
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

export function TransferirMunicipioDialog({
  open,
  onOpenChange,
  crianca,
  onConfirm,
  loading = false,
}: TransferirMunicipioDialogProps) {
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
          <DialogTitle>Transferência para Outro Município</DialogTitle>
          <DialogDescription>
            Registrar saída da criança por mudança de cidade
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Esta ação é para quando a criança está se
              mudando para outra cidade. A matrícula será encerrada e a criança
              será marcada como "Transferido".
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
            tipo="transferencia"
            value={justificativa}
            onChange={setJustificativa}
            label="Justificativa"
            placeholder="Ex: Mudança de cidade para São Paulo - SP"
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
            variant="destructive"
          >
            {loading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Transferência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
