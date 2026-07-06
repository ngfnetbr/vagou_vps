import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTurmas } from "@/hooks/api/supabase-hooks";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface RealocacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crianca: {
    id: string;
    nome: string;
    data_nascimento: string;
    cmei_atual_id?: string;
    cmei_atual?: { id: string; nome: string };
    turma_atual_id?: string;
    turma_atual?: { id: string; nome: string; turno?: string };
  } | null;
  onConfirm: (turmaNova: string, motivo: string) => void;
  loading?: boolean;
}

export function RealocacaoDialog({
  open,
  onOpenChange,
  crianca,
  onConfirm,
  loading = false,
}: RealocacaoDialogProps) {
  const [turmaNova, setTurmaNova] = useState<string>("");
  const [motivo, setMotivo] = useState("");

  const { data: turmas } = useTurmas(crianca?.cmei_atual_id);

  useEffect(() => {
    if (!open) {
      setTurmaNova("");
      setMotivo("");
    }
  }, [open]);

  const handleConfirm = () => {
    if (!turmaNova || !motivo.trim()) return;
    onConfirm(turmaNova, motivo);
  };

  const handleClose = () => {
    setTurmaNova("");
    setMotivo("");
    onOpenChange(false);
  };

  if (!crianca) return null;

  const calcularIdadeMeses = (dataNascimento: string) => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    const meses =
      (hoje.getFullYear() - nascimento.getFullYear()) * 12 +
      (hoje.getMonth() - nascimento.getMonth());
    return meses;
  };

  const idadeMeses = calcularIdadeMeses(crianca.data_nascimento);
  const idadeAnos = Math.floor(idadeMeses / 12);
  const mesesRestantes = idadeMeses % 12;

  // Filtrar turmas disponíveis (excluir turma atual e verificar idade)
  const turmasDisponiveis = turmas?.filter((turma) => {
    if (turma.id === crianca.turma_atual_id) return false;
    if (!turma.ativo) return false;
    
    // Verificar compatibilidade de idade se existir
    if (turma.idade_minima !== null && turma.idade_minima !== undefined) {
      if (idadeMeses < turma.idade_minima) return false;
    }
    if (turma.idade_maxima !== null && turma.idade_maxima !== undefined) {
      if (idadeMeses > turma.idade_maxima) return false;
    }
    
    return true;
  });

  const turmaSelecionada = turmasDisponiveis?.find((t) => t.id === turmaNova);

  const motivosComuns = [
    "Adequação de idade",
    "Mudança de turno solicitada pelo responsável",
    "Melhor aproveitamento pedagógico",
    "Compatibilidade com rotina familiar",
    "Redistribuição de vagas",
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Realocar Criança para Nova Turma</DialogTitle>
          <DialogDescription>
            Mova a criança para outra turma dentro do mesmo CMEI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações da Criança */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium">Criança: {crianca.nome}</p>
                <p className="text-sm text-muted-foreground">
                  Idade: {idadeAnos} {idadeAnos !== 1 ? "anos" : "ano"}
                  {mesesRestantes > 0 && ` e ${mesesRestantes} ${mesesRestantes !== 1 ? "meses" : "mês"}`}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="text-sm">
                <span className="font-medium">CMEI:</span> {crianca.cmei_atual?.nome}
              </p>
              <p className="text-sm">
                <span className="font-medium">Turma Atual:</span>{" "}
                {crianca.turma_atual?.nome || "Sem turma"}
                {crianca.turma_atual?.turno && ` - ${crianca.turma_atual.turno}`}
              </p>
            </div>
          </div>

          {/* Seleção de Turma */}
          <div className="space-y-2">
            <Label htmlFor="turma-nova">
              Nova Turma <span className="text-destructive">*</span>
            </Label>
            <Select value={turmaNova} onValueChange={setTurmaNova}>
              <SelectTrigger id="turma-nova">
                <SelectValue placeholder="Selecione a nova turma" />
              </SelectTrigger>
              <SelectContent>
                {turmasDisponiveis && turmasDisponiveis.length > 0 ? (
                  turmasDisponiveis.map((turma) => (
                    <SelectItem key={turma.id} value={turma.id}>
                      {turma.nome}
                      {turma.turno && ` - ${turma.turno}`}
                      {" ("}
                      {turma.capacidade ? `${turma.capacidade} vagas` : "Capacidade não definida"}
                      {")"}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    Nenhuma turma disponível
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {turmaSelecionada && (
              <p className="text-xs text-muted-foreground">
                {turmaSelecionada.idade_minima !== null && turmaSelecionada.idade_maxima !== null
                  ? `Faixa etária: ${Math.floor(turmaSelecionada.idade_minima / 12)} a ${Math.floor(turmaSelecionada.idade_maxima / 12)} anos`
                  : "Faixa etária não especificada"}
              </p>
            )}
          </div>

          {/* Motivo da Realocação */}
          <div className="space-y-2">
            <Label htmlFor="motivo">
              Motivo da Realocação <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {motivosComuns.map((motivoComum) => (
                <Button
                  key={motivoComum}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMotivo(motivoComum)}
                  className="text-xs"
                >
                  {motivoComum}
                </Button>
              ))}
            </div>
            <Textarea
              id="motivo"
              placeholder="Descreva o motivo da realocação..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Mínimo 10 caracteres. Clique nos botões acima para usar motivos comuns.
            </p>
          </div>

          {/* Alerta de Confirmação */}
          {turmaNova && motivo.length >= 10 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                A criança será realocada de{" "}
                <span className="font-medium">{crianca.turma_atual?.nome || "sem turma"}</span>
                {" "}para{" "}
                <span className="font-medium">{turmaSelecionada?.nome}</span>.
                Esta ação será registrada no histórico.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!turmaNova || motivo.trim().length < 10 || loading}
          >
            {loading ? "Realocando..." : "Confirmar Realocação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

