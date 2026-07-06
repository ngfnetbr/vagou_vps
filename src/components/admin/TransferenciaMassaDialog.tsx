import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, Users, AlertTriangle } from "lucide-react";
import { useCMEIs, useTurmas } from "@/hooks/api/supabase-hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface TransferenciaMassaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turmaOrigemId?: string;
  cmeiOrigemId?: string;
  preSelectedCriancaIds?: string[];
}

export default function TransferenciaMassaDialog({
  open,
  onOpenChange,
  turmaOrigemId,
  cmeiOrigemId,
  preSelectedCriancaIds,
}: TransferenciaMassaDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: cmeis } = useCMEIs();
  
  const [selectedCmeiDestino, setSelectedCmeiDestino] = useState<string>("");
  const [selectedTurmaDestino, setSelectedTurmaDestino] = useState<string>("");
  const [selectedCriancas, setSelectedCriancas] = useState<string[]>([]);
  const [motivo, setMotivo] = useState("");

  // Get turmas for destination CMEI
  const { data: turmasDestino } = useTurmas(selectedCmeiDestino || undefined);

  // Get children from source turma/cmei or use pre-selected
  const { data: criancasOrigem } = useQuery({
    queryKey: ["criancas-transferencia", turmaOrigemId, cmeiOrigemId, preSelectedCriancaIds],
    queryFn: async () => {
      let query = supabase
        .from("criancas")
        .select("id, nome, status, data_nascimento");

      if (preSelectedCriancaIds && preSelectedCriancaIds.length > 0) {
        query = query.in("id", preSelectedCriancaIds);
      } else {
        query = query.in("status", ["Matriculado", "Matriculada"]);
        if (turmaOrigemId) {
          query = query.eq("turma_atual_id", turmaOrigemId);
        } else if (cmeiOrigemId) {
          query = query.eq("cmei_atual_id", cmeiOrigemId);
        }
      }

      const { data, error } = await query.order("nome");
      if (error) throw error;
      return data;
    },
    enabled: open && (!!turmaOrigemId || !!cmeiOrigemId || (preSelectedCriancaIds && preSelectedCriancaIds.length > 0)),
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedCmeiDestino("");
      setSelectedTurmaDestino("");
      setSelectedCriancas([]);
      setMotivo("");
    } else if (preSelectedCriancaIds && preSelectedCriancaIds.length > 0) {
      // Pre-select children if provided
      setSelectedCriancas(preSelectedCriancaIds);
    }
  }, [open, preSelectedCriancaIds]);

  // Get turma destino capacity info
  const turmaDestinoInfo = turmasDestino?.find(t => t.id === selectedTurmaDestino);
  
  const { data: ocupacaoDestino } = useQuery({
    queryKey: ["turma-ocupacao", selectedTurmaDestino],
    queryFn: async () => {
      if (!selectedTurmaDestino) return 0;
      const { count, error } = await supabase
        .from("criancas")
        .select("*", { count: "exact", head: true })
        .eq("turma_atual_id", selectedTurmaDestino)
        .in("status", ["Matriculado", "Matriculada"]);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!selectedTurmaDestino,
  });

  const vagasDisponiveis = turmaDestinoInfo 
    ? (turmaDestinoInfo.capacidade || 0) - (ocupacaoDestino || 0) 
    : 0;

  const excedeCapacidade = selectedCriancas.length > vagasDisponiveis;

  // Mass transfer mutation
  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTurmaDestino || selectedCriancas.length === 0) {
        throw new Error("Selecione a turma de destino e pelo menos uma criança");
      }

      // Get destination turma info
      const { data: turmaDestino, error: turmaError } = await supabase
        .from("turmas")
        .select("*, cmeis(nome)")
        .eq("id", selectedTurmaDestino)
        .single();

      if (turmaError) throw turmaError;

      // Update all selected children
      const { error: updateError } = await supabase
        .from("criancas")
        .update({
          cmei_atual_id: turmaDestino.cmei_id,
          turma_atual_id: selectedTurmaDestino,
          updated_by: user?.id,
        })
        .in("id", selectedCriancas);

      if (updateError) throw updateError;

      // Create history entries for each child
      const historyEntries = selectedCriancas.map(criancaId => ({
        crianca_id: criancaId,
        acao: "Transferência em Massa",
        status_anterior: "Matriculado" as const,
        status_novo: "Matriculado" as const,
        cmei_novo: turmaDestino.cmei_id,
        turma_novo: selectedTurmaDestino,
        justificativa: motivo || "Transferência em massa realizada pelo administrador",
        descricao: `Transferido para ${turmaDestino.nome} - ${(turmaDestino as any).cmeis?.nome || 'unidade'}`,
        usuario_id: user?.id,
      }));

      const { error: histError } = await supabase
        .from("historico")
        .insert(historyEntries);

      if (histError) throw histError;

      return selectedCriancas.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["criancas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-criancas"] });
      queryClient.invalidateQueries({ queryKey: ["turmas-students-count"] });
      queryClient.invalidateQueries({ queryKey: ["criancas-transferencia"] });
      queryClient.invalidateQueries({ queryKey: ["criancas-vinculadas-turma"] });
      queryClient.invalidateQueries({ queryKey: ["criancas-vinculadas-cmei"] });
      toast.success(`${count} criança(s) transferida(s) com sucesso!`);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Erro na transferência: " + error.message);
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCriancas(criancasOrigem?.map(c => c.id) || []);
    } else {
      setSelectedCriancas([]);
    }
  };

  const handleSelectCrianca = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCriancas(prev => [...prev, id]);
    } else {
      setSelectedCriancas(prev => prev.filter(cid => cid !== id));
    }
  };

  const allSelected = criancasOrigem && criancasOrigem.length > 0 && 
    selectedCriancas.length === criancasOrigem.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Transferência em Massa
          </DialogTitle>
          <DialogDescription>
            Selecione as crianças e a turma de destino para realizar a transferência.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Destination Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CMEI de Destino</Label>
              <Select value={selectedCmeiDestino} onValueChange={setSelectedCmeiDestino}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {cmeis?.map((cmei) => (
                    <SelectItem key={cmei.id} value={cmei.id}>
                      {cmei.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Turma de Destino</Label>
              <Select 
                value={selectedTurmaDestino} 
                onValueChange={setSelectedTurmaDestino}
                disabled={!selectedCmeiDestino}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {turmasDestino?.map((turma) => (
                    <SelectItem key={turma.id} value={turma.id}>
                      {turma.nome} ({turma.turma_base})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Capacity Info */}
          {selectedTurmaDestino && turmaDestinoInfo && (
            <div className="flex items-center gap-4 p-3 bg-muted rounded-md">
              <div className="text-sm">
                <span className="text-muted-foreground">Capacidade:</span>{" "}
                <span className="font-medium">{turmaDestinoInfo.capacidade}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <span className="text-muted-foreground">Ocupação atual:</span>{" "}
                <span className="font-medium">{ocupacaoDestino}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <span className="text-muted-foreground">Vagas disponíveis:</span>{" "}
                <Badge variant={vagasDisponiveis > 0 ? "default" : "destructive"}>
                  {vagasDisponiveis}
                </Badge>
              </div>
            </div>
          )}

          {excedeCapacidade && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                O número de crianças selecionadas ({selectedCriancas.length}) excede as vagas 
                disponíveis ({vagasDisponiveis}). A transferência pode gerar superlotação.
              </AlertDescription>
            </Alert>
          )}

          {/* Children List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Crianças ({criancasOrigem?.length || 0})</Label>
              {criancasOrigem && criancasOrigem.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="text-sm cursor-pointer">
                    Selecionar todas
                  </Label>
                </div>
              )}
            </div>
            <ScrollArea className="h-48 border rounded-md p-2">
              {!criancasOrigem || criancasOrigem.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma criança matriculada encontrada
                </p>
              ) : (
                <div className="space-y-2">
                  {criancasOrigem.map((crianca) => (
                    <div
                      key={crianca.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted"
                    >
                      <Checkbox
                        id={crianca.id}
                        checked={selectedCriancas.includes(crianca.id)}
                        onCheckedChange={(checked) => 
                          handleSelectCrianca(crianca.id, checked as boolean)
                        }
                      />
                      <Label htmlFor={crianca.id} className="flex-1 cursor-pointer">
                        <span className="font-medium">{crianca.nome}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({new Date(crianca.data_nascimento).toLocaleDateString()})
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <p className="text-sm text-muted-foreground">
              {selectedCriancas.length} criança(s) selecionada(s)
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo da transferência..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => transferMutation.mutate()}
            disabled={
              !selectedTurmaDestino || 
              selectedCriancas.length === 0 || 
              transferMutation.isPending
            }
          >
            {transferMutation.isPending ? "Transferindo..." : "Transferir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

