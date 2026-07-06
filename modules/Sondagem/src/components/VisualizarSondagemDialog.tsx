// @ts-nocheck
import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@ui/dialog";
import { Button } from "@ui/button";
import { Textarea } from "@ui/textarea";
import { Badge } from "@ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ui/table";
import { Eye, Send, MessageSquarePlus } from "lucide-react";
import { supabase } from "@sondagem/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@root/contexts/AuthContext";
import { toast } from "sonner";
import { getEscritaColor, getProducaoColor } from "@sondagem/lib/nivelColors";
import { fetchPrincipalCriancas, type PrincipalCrianca } from "@sondagem/lib/principalData";
import type { TablesInsert } from "@sondagem/integrations/supabase/db";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacao: {
    id: string;
    cmei_id: string;
    cmei_nome: string | null;
    turma_id: string | null;
    turma_nome: string | null;
    mes: string;
    tipo: string;
  } | null;
}

interface AlunoResultado {
  criancaId: string;
  criancaNome: string;
  nivelEscrita: string | null;
  nivelProducao: string | null;
  sondagemId: string | null;
  observacoes: string | null;
}

interface SondagemResultadoRow {
  id: string;
  crianca_id: string;
  observacoes: string | null;
  periodo: string;
  status: string;
  created_at: string | null;
  respostas_sondagem: Array<{
    nivel_id: string;
    niveis_aprendizagem: {
      id: string;
      codigo: string;
      tipo: string;
    } | null;
  }> | null;
}

export default function VisualizarSondagemDialog({ open, onOpenChange, solicitacao }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [observacaoTexto, setObservacaoTexto] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<Record<string, boolean>>({});

  // Fetch students and their sondagem results for this solicitação
  const { data: resultados = [], isLoading } = useQuery({
    queryKey: ["visualizar-sondagem", solicitacao?.id],
    queryFn: async () => {
      if (!solicitacao) return [];

      const criancas = (await fetchPrincipalCriancas({
        cmeiId: solicitacao.cmei_id || undefined,
        turmaId: solicitacao.turma_id || undefined,
      }))
        .filter((item: PrincipalCrianca) => !solicitacao.cmei_id || item.cmei_id === solicitacao.cmei_id)
        .filter((item: PrincipalCrianca) => !solicitacao.turma_id || item.turma_id === solicitacao.turma_id)
        .sort((a: PrincipalCrianca, b: PrincipalCrianca) => (a.nome || "").localeCompare(b.nome || ""));
      if (criancas.length === 0) return [];

      const criancaIds = criancas.map((c) => c.id).filter(Boolean) as string[];

      // Get finalized sondagens for these students
      const { data: sondagens, error: errSondagens } = await supabase
        .from("sondagens")
        .select(`
          id, crianca_id, observacoes, periodo, status, created_at,
          respostas_sondagem(nivel_id, niveis_aprendizagem(id, codigo, tipo))
        `)
        .in("crianca_id", criancaIds)
        .eq("status", "finalizado")
        .order("created_at", { ascending: false });

      if (errSondagens) throw errSondagens;

      // Build a map: crianca_id -> latest sondagem
      const sondagemMap = new Map<string, SondagemResultadoRow>();
      ((sondagens || []) as SondagemResultadoRow[]).forEach((s) => {
        if (!sondagemMap.has(s.crianca_id)) {
          sondagemMap.set(s.crianca_id, s);
        }
      });

      return criancas.map(c => {
        const sondagem = sondagemMap.get(c.id!);
        let nivelEscrita: string | null = null;
        let nivelProducao: string | null = null;

        if (sondagem) {
          (sondagem.respostas_sondagem || []).forEach((r) => {
            const tipo = r.niveis_aprendizagem?.tipo;
            const codigo = r.niveis_aprendizagem?.codigo;
            if (tipo === "escrita") nivelEscrita = codigo;
            if (tipo === "producao_texto") nivelProducao = codigo;
          });
        }

        return {
          criancaId: c.id!,
          criancaNome: c.nome || "",
          nivelEscrita,
          nivelProducao,
          sondagemId: sondagem?.id || null,
          observacoes: sondagem?.observacoes || null,
        } as AlunoResultado;
      });
    },
    enabled: open && !!solicitacao,
  });

  const handleSalvarObservacao = async (criancaId: string) => {
    const texto = observacaoTexto[criancaId]?.trim();
    if (!texto) { toast.error("Digite uma observação."); return; }

    setSalvando(prev => ({ ...prev, [criancaId]: true }));
    try {
      const payload: TablesInsert<"anotacoes_aluno"> = {
        crianca_id: criancaId,
        user_id: user?.id || "",
        user_nome: user?.email || "Equipe Pedagógica",
        texto,
      };

      const { error } = await supabase
        .from("anotacoes_aluno")
        .insert(payload);
      if (error) throw error;

      toast.success("Observação salva na ficha do aluno!");
      setObservacaoTexto(prev => ({ ...prev, [criancaId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["anotacoes-aluno", criancaId] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Tente novamente.";
      toast.error("Erro ao salvar: " + message);
    } finally {
      setSalvando(prev => ({ ...prev, [criancaId]: false }));
    }
  };

  const tipoLabel = solicitacao?.tipo === "escrita" ? "Escrita" : "Produção de Texto";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Resultados da Sondagem
          </DialogTitle>
          <DialogDescription>
            {solicitacao?.cmei_nome} — {solicitacao?.turma_nome || "Todas as turmas"} — {solicitacao?.mes} — {tipoLabel}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : resultados.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum aluno encontrado para esta solicitação.
          </p>
        ) : (
          <div className="space-y-0">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Aluno</TableHead>
                    <TableHead className="text-xs text-center">Escrita</TableHead>
                    <TableHead className="text-xs text-center">Produção</TableHead>
                    <TableHead className="text-xs">Obs. do Aplicador</TableHead>
                    <TableHead className="text-xs">Devolutiva / Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultados.map((r) => (
                    <TableRow key={r.criancaId}>
                      <TableCell className="text-xs font-medium">{r.criancaNome}</TableCell>
                      <TableCell className="text-center">
                        {r.nivelEscrita ? (
                          <Badge
                            className="text-[10px]"
                            style={{ backgroundColor: getEscritaColor(r.nivelEscrita), color: "#fff" }}
                          >
                            {r.nivelEscrita}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.nivelProducao ? (
                          <Badge
                            className="text-[10px]"
                            style={{ backgroundColor: getProducaoColor(r.nivelProducao), color: "#fff" }}
                          >
                            {r.nivelProducao}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px]">
                        {r.observacoes ? (
                          <span className="line-clamp-2">{r.observacoes}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="min-w-[220px]">
                        <div className="flex items-start gap-2">
                          <Textarea
                            placeholder="Adicionar devolutiva..."
                            className="text-xs min-h-[60px] flex-1"
                            value={observacaoTexto[r.criancaId] || ""}
                            onChange={(e) =>
                              setObservacaoTexto(prev => ({ ...prev, [r.criancaId]: e.target.value }))
                            }
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-1 gap-1 text-primary hover:text-primary"
                            disabled={salvando[r.criancaId] || !observacaoTexto[r.criancaId]?.trim()}
                            onClick={() => handleSalvarObservacao(r.criancaId)}
                          >
                            {salvando[r.criancaId] ? (
                              <Spinner className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
              <MessageSquarePlus className="h-3.5 w-3.5" />
              As observações adicionadas aqui ficam registradas na ficha individual de cada aluno.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

