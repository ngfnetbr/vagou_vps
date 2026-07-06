import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCMEIs } from "@/hooks/api/supabase-hooks";

interface TransferenciaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crianca: {
    id: string;
    nome: string;
    cmei_atual?: { id: string; nome: string };
    cmei_remanejamento_id?: string;
    justificativa_remanejamento?: string;
  } | null;
  onConfirm: () => void;
  loading?: boolean;
}

export function TransferenciaDialog({
  open,
  onOpenChange,
  crianca,
  onConfirm,
  loading = false,
}: TransferenciaDialogProps) {
  const { data: cmeis } = useCMEIs();

  if (!crianca) return null;

  const cmeiDestino = cmeis?.find((c) => c.id === crianca.cmei_remanejamento_id);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Transferência</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Você está prestes a efetivar a transferência desta criança:</p>
              
              <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                <p>
                  <span className="font-medium">Criança:</span> {crianca.nome}
                </p>
                <p>
                  <span className="font-medium">De:</span>{" "}
                  {crianca.cmei_atual?.nome || "Nenhum"}
                </p>
                <p>
                  <span className="font-medium">Para:</span>{" "}
                  {cmeiDestino?.nome || "Unidade não encontrada"}
                </p>
                <p className="mt-3 pt-3 border-t">
                  <span className="font-medium">Justificativa:</span>
                  <br />
                  <span className="text-muted-foreground">
                    {crianca.justificativa_remanejamento}
                  </span>
                </p>
              </div>

              <p className="text-destructive font-medium">
                Esta ação não pode ser desfeita. A criança será matriculada no novo CMEI.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading}>
            {loading ? "Transferindo..." : "Confirmar Transferência"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

