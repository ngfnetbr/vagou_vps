import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useSearchParams } from "react-router-dom";
import { Button } from "@ui/button";
import { Input } from "@ui/input";
import { Textarea } from "@ui/textarea";
import { toast } from "sonner";
import { Send, Plus, Upload, FileDown, X, FileText, Eye, Pencil, Trash2 } from "lucide-react";
import VisualizarSondagemDialog from "@sondagem/components/VisualizarSondagemDialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@ui/alert-dialog";
import { Badge } from "@ui/badge";
import { supabase } from "@sondagem/integrations/supabase/client";
import { useCMEIs, usePeriodos, useTurmas } from "@sondagem/hooks/useSupabaseData";
import { useAuth } from "@root/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { registrarAuditoria } from "@sondagem/hooks/useAuditLog";
import { useCanAccess } from "@root/components/admin/PermissionGate";
import type { Tables, TablesInsert, TablesUpdate } from "@sondagem/integrations/supabase/db";

const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx";
const MAX_FILE_SIZE_MB = 10;

type SolicitacaoRow = Tables<"solicitacoes_sondagem">;
type SolicitacaoInsert = TablesInsert<"solicitacoes_sondagem">;
type SolicitacaoUpdate = TablesUpdate<"solicitacoes_sondagem">;
type NotificacaoInsert = TablesInsert<"notificacoes">;

type ViewSolicitacao = {
  id: string;
  cmei_id: string;
  cmei_nome: string | null;
  turma_id: string | null;
  turma_nome: string | null;
  mes: string;
  tipo: string;
};

export default function SolicitarSondagem() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canView = useCanAccess(["modulos.sondagem.acessar", "sondagem.solicitacoes.visualizar"]);
  const canCreate = useCanAccess(["modulos.sondagem.acessar", "sondagem.solicitacoes.criar"]);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cmeiId, setCmeiId] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [periodoId, setPeriodoId] = useState("");
  const [tipo, setTipo] = useState<"escrita" | "producao_texto">("escrita");
  const [palavras, setPalavras] = useState("");
  const [frases, setFrases] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewSolicitacao, setViewSolicitacao] = useState<ViewSolicitacao | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: cmeis = [], isLoading: loadingCmeis } = useCMEIs();
  const { data: turmasAll = [] } = useTurmas(cmeiId || undefined);
  const turmasFiltradas = cmeiId ? turmasAll.filter(t => t.cmeiId === cmeiId) : turmasAll;
  const { data: periodos = [], isLoading: loadingPeriodos } = usePeriodos();

  const getPeriodoNome = (codigo: string) => periodos.find((p) => p.codigo === codigo)?.nome || codigo;

  const { data: solicitacoes = [], isLoading: loadingSolicitacoes } = useQuery({
    queryKey: ["solicitacoes-sondagem"],
    queryFn: async () => {
      const query = supabase
        .from("solicitacoes_sondagem")
        .select("*")
        .order("created_at", { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SolicitacaoRow[];
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Máximo: ${MAX_FILE_SIZE_MB}MB`);
      return;
    }
    setArquivo(file);
  };

  const uploadFile = async (solicitacaoId: string): Promise<string | null> => {
    if (!arquivo) return null;
    const ext = arquivo.name.split(".").pop();
    const filePath = `${solicitacaoId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("solicitacoes-arquivos")
      .upload(filePath, arquivo, { upsert: false });
    if (error) throw new Error("Erro ao enviar arquivo: " + error.message);
    return filePath;
  };

  const handleSubmit = async () => {
    if (!user) { toast.error("Usuário não autenticado."); return; }
    if (!cmeiId) { toast.error("Selecione o local."); return; }
    if (!periodoId) { toast.error("Selecione o período."); return; }
    if (!palavras.trim() && tipo === "escrita") { toast.error("Informe as palavras do período."); return; }

    const cmei = cmeis.find(c => c.id === cmeiId);
    const turma = turmasFiltradas.find(t => t.id === turmaId);
    const periodoNome = getPeriodoNome(periodoId);

    setSaving(true);
    try {
      if (editingId) {
        // ===== UPDATE =====
        let arquivoUrl: string | undefined;
        if (arquivo) {
          arquivoUrl = (await uploadFile(editingId)) || undefined;
        }
        const payload: SolicitacaoUpdate = {
          cmei_id: cmeiId,
          cmei_nome: cmei?.nome || "",
          turma_id: turmaId || null,
          turma_nome: turma?.nome ?? null,
          mes: periodoId,
          palavras: palavras.trim(),
          frases: frases.trim(),
          tipo,
          ...(arquivoUrl ? { arquivo_url: arquivoUrl } : {}),
        };
        const { error } = await supabase
          .from("solicitacoes_sondagem")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;

        await registrarAuditoria({
          acao: "atualizar",
          tabela: "solicitacoes_sondagem",
          registro_id: editingId,
          dados_depois: {
            tipo, cmei: cmei?.nome || cmeiId, turma: turma?.nome || "Todas",
            periodo: periodoNome, palavras: palavras.trim(), frases: frases.trim(),
          },
          detalhes: `Solicitação de sondagem atualizada para ${cmei?.nome} - ${periodoNome}`,
        });

        toast.success("Solicitação atualizada com sucesso!");
      } else {
        // ===== CREATE =====
        const payload: SolicitacaoInsert = {
          solicitante_id: user.id,
          cmei_id: cmeiId,
          cmei_nome: cmei?.nome || "",
          turma_id: turmaId || null,
          turma_nome: turma?.nome ?? null,
          mes: periodoId,
          palavras: palavras.trim(),
          frases: frases.trim(),
          tipo,
          status: "pendente",
        };
        const { data: sol, error } = await supabase
          .from("solicitacoes_sondagem")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;

        const solId = sol?.id;

        // Upload file if selected
        if (arquivo && solId) {
          const filePath = await uploadFile(solId);
          if (filePath) {
            await supabase
              .from("solicitacoes_sondagem")
              .update({ arquivo_url: filePath } satisfies SolicitacaoUpdate)
              .eq("id", solId);
          }
        }

        // Create notification for coordinators of this school
        const notificacao: NotificacaoInsert = {
          cmei_id: cmeiId,
          tipo: "solicitacao_sondagem",
          titulo: `Nova Solicitação de Sondagem - ${tipo === "escrita" ? "Escrita" : "Produção de Texto"}`,
          mensagem: `Solicitação para ${cmei?.nome || ""} - ${turma?.nome || "Todas as turmas"} - Período: ${periodoNome}`,
          referencia_id: solId,
        };
        await supabase.from("notificacoes").insert(notificacao);

        await registrarAuditoria({
          acao: "criar",
          tabela: "solicitacoes_sondagem",
          registro_id: solId,
          dados_depois: {
            tipo,
            cmei: cmei?.nome || cmeiId,
            turma: turma?.nome || "Todas",
            periodo: periodoNome,
            palavras: palavras.trim(),
            frases: frases.trim(),
            arquivo: arquivo?.name,
          },
          detalhes: `Solicitação de sondagem criada para ${cmei?.nome} - ${periodoNome}`,
        });

        toast.success("Solicitação enviada com sucesso!");
      }

      queryClient.invalidateQueries({ queryKey: ["solicitacoes-sondagem"] });
      queryClient.invalidateQueries({ queryKey: ["solicitacoes-coord"] });
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });

      // Reset form
      resetForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Tente novamente.";
      toast.error("Erro ao salvar solicitação: " + message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setCmeiId("");
    setTurmaId("");
    setTipo("escrita");
    setPalavras("");
    setFrases("");
    setPeriodoId("");
    setArquivo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEdit = (s: SolicitacaoRow) => {
    setEditingId(s.id);
    setCmeiId(s.cmei_id || "");
    setTurmaId(s.turma_id || "");
    setTipo(s.tipo === "producao_texto" ? "producao_texto" : "escrita");
    setPalavras(s.palavras || "");
    setFrases(s.frases || "");
    setPeriodoId(s.mes || "");
    setArquivo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const editingParam = searchParams.get("edit");
    if (!editingParam || loadingSolicitacoes) return;

    const solicitacao = solicitacoes.find((item) => item.id === editingParam);
    if (!solicitacao) return;

    handleEdit(solicitacao);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("edit");
    setSearchParams(nextParams, { replace: true });
  }, [loadingSolicitacoes, searchParams, setSearchParams, solicitacoes]);

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("solicitacoes_sondagem")
        .delete()
        .eq("id", deletingId);
      if (error) throw error;

      await registrarAuditoria({
        acao: "excluir",
        tabela: "solicitacoes_sondagem",
        registro_id: deletingId,
        detalhes: "Solicitação de sondagem excluída",
      });

      toast.success("Solicitação excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["solicitacoes-sondagem"] });
      queryClient.invalidateQueries({ queryKey: ["solicitacoes-coord"] });
      if (editingId === deletingId) resetForm();
      setDeletingId(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Tente novamente.";
      toast.error("Erro ao excluir solicitação: " + message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (arquivoUrl: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("solicitacoes-arquivos")
        .createSignedUrl(arquivoUrl, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch {
      toast.error("Erro ao baixar arquivo.");
    }
  };

  const canMutateSolicitacao = (status: string) => status !== "concluida";

  const statusBadge = (status: string) => {
    if (status === "pendente") return <Badge variant="secondary" className="text-xs">Pendente</Badge>;
    if (status === "em_andamento") return <Badge variant="default" className="text-xs">Em Andamento</Badge>;
    return <Badge variant="outline" className="text-xs">Concluída</Badge>;
  };

  return (
    <>
      {!canView ? (
        <div className="rounded-2xl border p-6 bg-muted/30 text-sm text-muted-foreground">
          Você não tem permissão para visualizar solicitações de sondagem.
        </div>
      ) : (
      <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Solicitar Sondagem</h2>
        <p className="text-sm text-muted-foreground">
          Crie solicitações de sondagem para as escolas com palavras e frases do período
        </p>
      </div>

      {/* Formulário */}
      <div className="rounded-2xl bg-card p-6 shadow-sm border space-y-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {editingId ? <Pencil className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
            <h3 className="text-sm font-semibold text-foreground">
              {editingId ? "Editar Solicitação" : "Nova Solicitação"}
            </h3>
          </div>
          {editingId && (
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={resetForm}>
              <X className="h-3.5 w-3.5" />
              Cancelar edição
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo</label>
            <Select value={tipo} onValueChange={(v: "escrita" | "producao_texto") => setTipo(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="escrita">Escrita</SelectItem>
                <SelectItem value="producao_texto">Produção de Texto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Local</label>
            <Select value={cmeiId} onValueChange={(v) => { setCmeiId(v); setTurmaId(""); }}>
              <SelectTrigger><SelectValue placeholder={loadingCmeis ? "Carregando..." : "Selecione"} /></SelectTrigger>
              <SelectContent>
                {cmeis.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Turma</label>
            <Select value={turmaId} onValueChange={setTurmaId} disabled={!cmeiId}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                {turmasFiltradas.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Período</label>
            <Select value={periodoId} onValueChange={setPeriodoId}>
              <SelectTrigger><SelectValue placeholder={loadingPeriodos ? "Carregando..." : "Selecione"} /></SelectTrigger>
              <SelectContent>
                {periodos.map((p) => (
                  <SelectItem key={p.codigo} value={p.codigo}>
                    {p.codigo} — {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Palavras do período
            </label>
            <Textarea
              value={palavras}
              onChange={(e) => setPalavras(e.target.value)}
              placeholder="Digite as palavras separadas por vírgula ou uma por linha..."
              rows={4}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Frases do período
            </label>
            <Textarea
              value={frases}
              onChange={(e) => setFrases(e.target.value)}
              placeholder="Digite as frases do período..."
              rows={4}
            />
          </div>
        </div>

        {/* Upload de arquivo */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Arquivo (PDF ou Word) — opcional
          </label>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Selecionar arquivo
            </Button>
            {arquivo && (
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-xs">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="max-w-[200px] truncate">{arquivo.name}</span>
                <button
                  type="button"
                  onClick={() => { setArquivo(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Formatos aceitos: PDF, DOC, DOCX. Máximo: {MAX_FILE_SIZE_MB}MB</p>
        </div>

        <div className="flex justify-end gap-2">
          {editingId && (
            <Button variant="outline" onClick={resetForm} disabled={saving} className="gap-2">
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={saving || !canCreate} className="gap-2">
            {saving ? <Spinner className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {saving ? "Salvando..." : editingId ? "Salvar Alterações" : "Enviar Solicitação"}
          </Button>
        </div>
      </div>

      {/* Lista de solicitações */}
      <div className="rounded-2xl bg-card p-6 shadow-sm border space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Minhas Solicitações</h3>
        {loadingSolicitacoes ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : solicitacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma solicitação encontrada.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Local</TableHead>
                  <TableHead className="text-xs">Turma</TableHead>
                  <TableHead className="text-xs">Período</TableHead>
                  <TableHead className="text-xs">Arquivo</TableHead>
                   <TableHead className="text-xs">Status</TableHead>
                   <TableHead className="text-xs">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitacoes.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">
                      {new Date(s.created_at || "").toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.tipo === "escrita" ? "Escrita" : "Produção de Texto"}
                    </TableCell>
                    <TableCell className="text-xs">{s.cmei_nome}</TableCell>
                    <TableCell className="text-xs">{s.turma_nome || "Todas"}</TableCell>
                    <TableCell className="text-xs">{getPeriodoNome(s.mes)}</TableCell>
                    <TableCell>
                      {s.arquivo_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 text-xs text-primary hover:text-primary"
                          onClick={() => handleDownload(s.arquivo_url)}
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          Baixar
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(s.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {s.status === "concluida" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-xs text-primary hover:text-primary"
                            onClick={() =>
                              setViewSolicitacao({
                                id: s.id,
                                cmei_id: s.cmei_id,
                                cmei_nome: s.cmei_nome,
                                turma_id: s.turma_id,
                                turma_nome: s.turma_nome,
                                mes: s.mes,
                                tipo: s.tipo,
                              })
                            }
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Visualizar
                          </Button>
                        )}
                        {canMutateSolicitacao(s.status) && canCreate && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              title="Editar"
                              onClick={() => handleEdit(s)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              title="Excluir"
                              onClick={() => setDeletingId(s.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <VisualizarSondagemDialog
        open={!!viewSolicitacao}
        onOpenChange={(open) => { if (!open) setViewSolicitacao(null); }}
        solicitacao={viewSolicitacao}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir solicitação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A solicitação de sondagem será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
      )}
    </>
  );
}
