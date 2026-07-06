// @ts-nocheck
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search, CheckCircle2, MessageSquare, Save, RotateCcw, Trash2, Pencil, ClipboardList, Clock, CheckCheck, ArrowRight, FileDown, Bell } from "lucide-react";
import { Button } from "@ui/button";
import { Input } from "@ui/input";
import { Checkbox } from "@ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@ui/popover";
import { Textarea } from "@ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@ui/dialog";
import { Badge } from "@ui/badge";
import { toast } from "sonner";
import { useAuth } from "@root/contexts/AuthContext";
import { supabase } from "@sondagem/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@sondagem/integrations/supabase/db";
import { useCMEIs, useTurmas, useNiveis, useAlunos, useModelos, usePeriodos } from "@sondagem/hooks/useSupabaseData";
import { useSondagensExistentes } from "@sondagem/hooks/useSondagensExistentes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { registrarAuditoria } from "@sondagem/hooks/useAuditLog";
import { getEscritaColor, getProducaoColor } from "@sondagem/lib/nivelColors";
import { useCanAccess } from "@root/components/admin/PermissionGate";
import { PageHeader } from "@root/components/common/page-header";
import { useCoordinatorSchoolId } from "@sondagem/lib/coordinatorScope";

// ===== DRAFT HELPERS =====
const DRAFT_KEY_PREFIX = "sondagem-draft-";

type SolicitacaoRow = Tables<"solicitacoes_sondagem">;
type SolicitacaoUpdate = TablesUpdate<"solicitacoes_sondagem">;
type SondagemInsert = TablesInsert<"sondagens">;
type SondagemUpdate = TablesUpdate<"sondagens">;
type RespostaRow = Tables<"respostas_sondagem">;

interface DraftData {
  selecoes: Record<string, string>;
  observacoes: Record<string, string>;
  cmeiId: string;
  turmaId: string;
  periodoId: string;
  modeloId: string;
  tipo: string;
  savedAt: string;
}

function getDraftKey(cmeiId: string, turmaId: string, periodoId: string): string {
  return `${DRAFT_KEY_PREFIX}${cmeiId}_${turmaId || "all"}_${periodoId}`;
}

function saveDraft(draft: DraftData) {
  try {
    const key = getDraftKey(draft.cmeiId, draft.turmaId, draft.periodoId);
    localStorage.setItem(key, JSON.stringify(draft));
  } catch (e) {
    void e;
  }
}

function loadDraft(cmeiId: string, turmaId: string, periodoId: string): DraftData | null {
  try {
    const key = getDraftKey(cmeiId, turmaId, periodoId);
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    void e;
  }
  return null;
}

function clearDraft(cmeiId: string, turmaId: string, periodoId: string) {
  try {
    const key = getDraftKey(cmeiId, turmaId, periodoId);
    localStorage.removeItem(key);
  } catch (e) {
    void e;
  }
}

function listAllDrafts(): DraftData[] {
  const drafts: DraftData[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DRAFT_KEY_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) drafts.push(JSON.parse(raw));
      }
    }
  } catch (e) {
    void e;
  }
  return drafts.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

type StructuredObservacoes = {
  geral?: string;
  escrita?: {
    numeros_tracados?: string;
    numeros_qtd?: string;
    corpo_humano?: string;
  };
  producao_texto?: {
    segmentacao?: string;
    pontuacao?: string;
    ortografia?: string;
  };
};

function decodeObservacoes(raw?: string | null): StructuredObservacoes | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    if (!("geral" in obj) && !("escrita" in obj) && !("producao_texto" in obj)) return null;
    return obj as StructuredObservacoes;
  } catch {
    return null;
  }
}

function encodeObservacoes(input: StructuredObservacoes): string {
  const hasStructured =
    !!input.escrita?.numeros_tracados ||
    !!input.escrita?.numeros_qtd ||
    !!input.escrita?.corpo_humano ||
    !!input.producao_texto?.segmentacao ||
    !!input.producao_texto?.pontuacao ||
    !!input.producao_texto?.ortografia;
  const geral = (input.geral || "").trim();
  if (!hasStructured) return geral;
  return JSON.stringify({
    geral: geral || undefined,
    escrita: input.escrita,
    producao_texto: input.producao_texto,
  });
}

export default function AplicarSondagem() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tipo, setTipo] = useState<"todos" | "escrita" | "producao_texto">("todos");
  const [cmeiId, setCmeiId] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [periodoId, setPeriodoId] = useState("");
  const [modeloId, setModeloId] = useState("");
  const [buscou, setBuscou] = useState(false);
  const [saving, setSaving] = useState(false);
  const [solicitacaoId, setSolicitacaoId] = useState<string | null>(null);
  const [solicitacaoInfo, setSolicitacaoInfo] = useState<SolicitacaoRow | null>(null);
  const solicitacaoLoaded = useRef(false);

  const normalizeTipo = (t?: string | null): "todos" | "escrita" | "producao_texto" => {
    if (!t) return "todos";
    const v = t.toLowerCase();
    if (v.includes("produc")) return "producao_texto";
    if (v.includes("escrit")) return "escrita";
    return "todos";
  };

  // Coordinator panel filters
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "escrita" | "producao_texto">("todos");
  const [filtroLocal, setFiltroLocal] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("");
  const [showAllPendentes, setShowAllPendentes] = useState(false);
  const [showAllConcluidas, setShowAllConcluidas] = useState(false);
  const LIMIT_VISIBLE = 5;

  const [selecoes, setSelecoes] = useState<Record<string, string>>({});
  const [observacoes, setObservacoes] = useState<Record<string, string>>({});
  const [editingStudents, setEditingStudents] = useState<Set<string>>(new Set());
  const [savedStudents, setSavedStudents] = useState<Set<string>>(new Set());
  // Draft state
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<DraftData | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canView = useCanAccess(["modulos.sondagem.acessar", "sondagem.aplicar.visualizar"]);
  const canLaunch = useCanAccess(["modulos.sondagem.acessar", "sondagem.aplicar.lancar"]);
  const canSolicitar = useCanAccess(["modulos.sondagem.acessar", "sondagem.solicitacoes.criar"]);
  const coordinatorSchoolId = useCoordinatorSchoolId();
  const effectiveCmeiQueryId = cmeiId || coordinatorSchoolId || undefined;

  const { data: cmeis = [], isLoading: loadingCmeis } = useCMEIs(coordinatorSchoolId);
  const { data: turmasAll = [] } = useTurmas(effectiveCmeiQueryId);
  const { data: niveis = [], isLoading: loadingNiveis } = useNiveis();
  const { data: alunosData = [], isLoading: loadingAlunos } = useAlunos(
    effectiveCmeiQueryId,
    turmaId || undefined,
    buscou
  );
  const { data: modelos = [] } = useModelos();
  const { data: periodos = [] } = usePeriodos();
  const periodosAbertos = useMemo(() => periodos.filter((p) => p.isOpen), [periodos]);
  const periodosDisponiveisBusca = useMemo(() => {
    if (!solicitacaoInfo?.mes) return periodosAbertos;
    const periodoSolicitado = periodos.find((p) => p.id === solicitacaoInfo.mes);
    if (!periodoSolicitado) return periodosAbertos;
    return [periodoSolicitado, ...periodosAbertos.filter((p) => p.id !== periodoSolicitado.id)];
  }, [periodos, periodosAbertos, solicitacaoInfo?.mes]);
  const getPeriodoNome = useCallback((codigo: string) => periodos.find((p) => p.id === codigo)?.nome || codigo, [periodos]);
  const getPeriodoLabel = useCallback((codigo: string) => {
    const nome = getPeriodoNome(codigo);
    return nome === codigo ? codigo : `${codigo} — ${nome}`;
  }, [getPeriodoNome]);

  // Solicitações - load for all users to show alerts
  const isCoord = role === "coordenador";
  useEffect(() => {
    if (!isCoord || !coordinatorSchoolId) return;
    if (cmeiId !== coordinatorSchoolId) setCmeiId(coordinatorSchoolId);
    if (filtroLocal !== coordinatorSchoolId) setFiltroLocal(coordinatorSchoolId);
  }, [cmeiId, coordinatorSchoolId, filtroLocal, isCoord]);

  const { data: solicitacoesList = [], isLoading: loadingSolicitacoes } = useQuery({
    queryKey: ["solicitacoes-coord", coordinatorSchoolId],
    queryFn: async () => {
      let query = supabase
        .from("solicitacoes_sondagem")
        .select("*")
        .order("created_at", { ascending: false });
      if (isCoord && coordinatorSchoolId) {
        query = query.eq("cmei_id", coordinatorSchoolId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SolicitacaoRow[];
    },
  });

  // Filtered solicitações for coordinator panel
  const solicitacoesFiltradas = useMemo(() => {
    return solicitacoesList.filter((s) => {
      if (filtroTipo !== "todos" && s.tipo !== filtroTipo) return false;
      if ((coordinatorSchoolId || filtroLocal) && s.cmei_id !== (coordinatorSchoolId || filtroLocal)) return false;
      if (filtroTurma && s.turma_id !== filtroTurma) return false;
      if (filtroPeriodo && s.mes !== filtroPeriodo) return false;
      return true;
    });
  }, [solicitacoesList, filtroTipo, filtroLocal, filtroTurma, filtroPeriodo, coordinatorSchoolId]);

  const solicitacoesPendentes = solicitacoesFiltradas.filter((s) => s.status === "pendente" || s.status === "em_andamento");
  const solicitacoesConcluidas = solicitacoesFiltradas.filter((s) => s.status === "concluida");

  // Unique CMEI options from solicitações
  const solicitacoesCmeis = useMemo(() => {
    const map = new Map<string, string>();
    solicitacoesList.forEach((s) => {
      if (s.cmei_id && s.cmei_nome) map.set(s.cmei_id, s.cmei_nome);
    });
    return Array.from(map, ([id, nome]) => ({ id, nome }));
  }, [solicitacoesList]);

  // Unique turma options from solicitações (filtered by selected local)
  const solicitacoesTurmas = useMemo(() => {
    const map = new Map<string, string>();
    solicitacoesList.forEach((s) => {
      if (s.turma_id && s.turma_nome && (!filtroLocal || s.cmei_id === filtroLocal))
        map.set(s.turma_id, s.turma_nome);
    });
    return Array.from(map, ([id, nome]) => ({ id, nome }));
  }, [solicitacoesList, filtroLocal]);

  // Unique meses from solicitações
  const solicitacoesMeses = useMemo(() => {
    const set = new Set<string>();
    solicitacoesList.forEach((s) => { if (s.mes) set.add(s.mes); });
    return Array.from(set).sort();
  }, [solicitacoesList]);

  const handleDownloadArquivo = async (arquivoUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const canMutateSolicitacao = useCallback((sol: SolicitacaoRow) => {
    if (!canSolicitar) return false;
    if (sol.status === "concluida") return false;
    return role === "admin" || role === "equipe_pedagogica" || sol.solicitante_id === user?.id;
  }, [canSolicitar, role, user?.id]);

  const handleEditarSolicitacao = useCallback((sol: SolicitacaoRow, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(`/modulo/sondar/solicitar?edit=${sol.id}`);
  }, [navigate]);

  const handleExcluirSolicitacao = useCallback(async (sol: SolicitacaoRow, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const confirmed = window.confirm(`Excluir a solicitação de ${sol.cmei_nome || ""}${sol.turma_nome ? ` - ${sol.turma_nome}` : ""}?`);
    if (!confirmed) return;

    const { error } = await supabase
      .from("solicitacoes_sondagem")
      .delete()
      .eq("id", sol.id);

    if (error) {
      toast.error("Erro ao excluir solicitação: " + error.message);
      return;
    }

    await registrarAuditoria({
      acao: "excluir",
      tabela: "solicitacoes_sondagem",
      registro_id: sol.id,
      detalhes: `Solicitação de sondagem excluída: ${sol.cmei_nome || ""} - ${getPeriodoLabel(sol.mes)}`,
    });

    if (solicitacaoId === sol.id) {
      setSolicitacaoId(null);
      setSolicitacaoInfo(null);
      setBuscou(false);
    }

    queryClient.invalidateQueries({ queryKey: ["solicitacoes-coord"] });
    queryClient.invalidateQueries({ queryKey: ["solicitacoes-sondagem"] });
    queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    toast.success("Solicitação excluída com sucesso!");
  }, [getPeriodoLabel, queryClient, solicitacaoId]);

  const handleAbrirSolicitacao = (sol: SolicitacaoRow) => {
    setSolicitacaoInfo(sol);
    setSolicitacaoId(sol.id);
    if (sol.cmei_id) setCmeiId(sol.cmei_id);
    if (sol.turma_id) setTurmaId(sol.turma_id);
    if (sol.mes) setPeriodoId(sol.mes);
    setTipo(normalizeTipo(sol.tipo));
    if (sol.status === "pendente") {
      const patch: SolicitacaoUpdate = { status: "em_andamento", updated_at: new Date().toISOString() };
      supabase
        .from("solicitacoes_sondagem")
        .update(patch)
        .eq("id", sol.id)
        .then(() => queryClient.invalidateQueries({ queryKey: ["solicitacoes-coord"] }));
    }
    setTimeout(() => setBuscou(true), 300);
    toast.info(
      `Solicitação carregada: ${sol.cmei_nome || ""} - ${sol.turma_nome || "Todas as turmas"} - Período: ${getPeriodoLabel(sol.mes)}`,
      { duration: 5000 }
    );
  };

  // ===== LOAD SOLICITAÇÃO FROM URL =====
  useEffect(() => {
    const solId = searchParams.get("solicitacao_id");
    if (!solId || solicitacaoLoaded.current) return;

    setSolicitacaoId(solId);
    solicitacaoLoaded.current = true;

    // Fetch solicitação details
    (async () => {
      const { data, error } = await supabase
        .from("solicitacoes_sondagem")
        .select("*")
        .eq("id", solId)
        .single();
      if (error || !data) {
        toast.error("Solicitação não encontrada.");
        return;
      }
      const sol = data as SolicitacaoRow;
      setSolicitacaoInfo(sol);

      // Pre-fill filters
      if (sol.cmei_id) setCmeiId(sol.cmei_id);
      if (sol.turma_id) setTurmaId(sol.turma_id);
      if (sol.mes) setPeriodoId(sol.mes);
      setTipo(normalizeTipo(sol.tipo));

      // Update status to em_andamento
      if (sol.status === "pendente") {
        const patch: SolicitacaoUpdate = { status: "em_andamento", updated_at: new Date().toISOString() };
        await supabase
          .from("solicitacoes_sondagem")
          .update(patch)
          .eq("id", solId);
        queryClient.invalidateQueries({ queryKey: ["solicitacoes-coord"] });
      }

      // Clean URL params
      setSearchParams({}, { replace: true });

      // Auto-trigger search after a short delay to let filters settle
      setTimeout(() => {
        setBuscou(true);
      }, 500);

      toast.info(
        `Solicitação carregada: ${sol.cmei_nome || ""} - ${sol.turma_nome || "Todas as turmas"} - Período: ${getPeriodoLabel(sol.mes)}` +
        (sol.palavras ? `\nPalavras: ${sol.palavras}` : "") +
        (sol.frases ? `\nFrases: ${sol.frases}` : ""),
        { duration: 8000 }
      );
    })();
  }, [searchParams, queryClient, setSearchParams, getPeriodoLabel]);

  const criancaIds = useMemo(() => alunosData.map(a => a.id), [alunosData]);

  const { data: sondagensExistentes = [], isLoading: loadingSondagens } = useSondagensExistentes(
    criancaIds,
    periodoId,
    buscou && criancaIds.length > 0
  );

  // Fetch previous period sondagens (latest before current period) for each student
  const { data: sondagensAnteriores = [] } = useQuery({
    queryKey: ["sondagens-anteriores", criancaIds.sort().join(","), periodoId],
    queryFn: async () => {
      if (criancaIds.length === 0 || !periodoId) return [];
      const { data, error } = await supabase
        .from("sondagens")
        .select(`
          id, crianca_id, periodo, created_at,
          respostas_sondagem(nivel_id, niveis_aprendizagem(codigo, descricao, tipo))
        `)
        .in("crianca_id", criancaIds)
        .neq("periodo", periodoId)
        .eq("status", "finalizado")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        crianca_id: string;
        periodo: string;
        created_at: string | null;
        respostas_sondagem: Array<{
          nivel_id: string;
          niveis_aprendizagem: { codigo: string; descricao: string; tipo: string } | null;
        }> | null;
      }>;
    },
    enabled: buscou && criancaIds.length > 0 && !!periodoId,
  });

  // Map: crianca_id -> { escrita: { codigo, descricao }, producao: { codigo, descricao } }
  const nivelAnteriorPorAluno = useMemo(() => {
    const map = new Map<string, { escrita?: { codigo: string; descricao: string }; producao?: { codigo: string; descricao: string }; periodo: string }>();
    sondagensAnteriores.forEach((s) => {
      if (map.has(s.crianca_id)) return; // keep most recent
      const respostas = s.respostas_sondagem || [];
      const escrita = respostas.find((r) => r.niveis_aprendizagem?.tipo === "escrita");
      const prod = respostas.find((r) => r.niveis_aprendizagem?.tipo === "producao_texto");
      map.set(s.crianca_id, {
        escrita: escrita?.niveis_aprendizagem ? { codigo: escrita.niveis_aprendizagem.codigo, descricao: escrita.niveis_aprendizagem.descricao } : undefined,
        producao: prod?.niveis_aprendizagem ? { codigo: prod.niveis_aprendizagem.codigo, descricao: prod.niveis_aprendizagem.descricao } : undefined,
        periodo: s.periodo,
      });
    });
    return map;
  }, [sondagensAnteriores]);

  const sondagemPorAluno = useMemo(() => {
    const map = new Map<string, typeof sondagensExistentes[0]>();
    sondagensExistentes.forEach(s => {
      const existing = map.get(s.crianca_id);
      if (!existing || (s.updated_at || s.created_at || "") > (existing.updated_at || existing.created_at || "")) {
        map.set(s.crianca_id, s);
      }
    });
    return map;
  }, [sondagensExistentes]);

  // Pre-populate from existing sondagens
  useEffect(() => {
    if (sondagensExistentes.length === 0) return;
    const newSelecoes: Record<string, string> = {};
    const newObservacoes: Record<string, string> = {};
    sondagemPorAluno.forEach((sondagem, criancaId) => {
      sondagem.respostas.forEach(r => {
        if (r.tipo) newSelecoes[`${criancaId}__${r.tipo}`] = r.nivel_id;
      });
      if (sondagem.observacoes) {
        const decoded = decodeObservacoes(sondagem.observacoes);
        if (decoded) {
          if (decoded.geral) newObservacoes[criancaId] = decoded.geral;
          if (decoded.escrita?.numeros_tracados) newObservacoes[`${criancaId}__numeros_tracados`] = decoded.escrita.numeros_tracados;
          if (decoded.escrita?.numeros_qtd) newObservacoes[`${criancaId}__numeros_qtd`] = decoded.escrita.numeros_qtd;
          if (decoded.escrita?.corpo_humano) newObservacoes[`${criancaId}__corpo_humano`] = decoded.escrita.corpo_humano;
          if (decoded.producao_texto?.segmentacao) newObservacoes[`${criancaId}__segmentacao`] = decoded.producao_texto.segmentacao;
          if (decoded.producao_texto?.pontuacao) newObservacoes[`${criancaId}__pontuacao`] = decoded.producao_texto.pontuacao;
          if (decoded.producao_texto?.ortografia) newObservacoes[`${criancaId}__ortografia`] = decoded.producao_texto.ortografia;
        } else {
          newObservacoes[criancaId] = sondagem.observacoes;
        }
      }
    });
    setSelecoes(prev => ({ ...newSelecoes, ...prev }));
    setObservacoes(prev => ({ ...newObservacoes, ...prev }));
  }, [sondagensExistentes, sondagemPorAluno]);

  const niveisEscrita = useMemo(() => {
    const order = ["PIC", "N1", "N2", "INT1", "SIL", "INT2", "ALF"];
    const idx = (c: string) => {
      const i = order.indexOf((c || "").toUpperCase());
      return i === -1 ? 999 : i;
    };
    return [...niveis.filter(n => n.tipo === "escrita")].sort((a, b) => idx(a.codigo) - idx(b.codigo));
  }, [niveis]);
  const niveisProducaoTexto = useMemo(() => {
    const order = ["TMD", "TPD", "TDP", "TAL"];
    const idx = (c: string) => {
      const i = order.indexOf((c || "").toUpperCase());
      return i === -1 ? 999 : i;
    };
    return [...niveis.filter(n => n.tipo === "producao_texto")].sort((a, b) => idx(a.codigo) - idx(b.codigo));
  }, [niveis]);

  const niveisFiltrados = useMemo(() => {
    if (tipo === "escrita") return niveisEscrita;
    if (tipo === "producao_texto") return niveisProducaoTexto;
    return [...niveisEscrita, ...niveisProducaoTexto];
  }, [tipo, niveisEscrita, niveisProducaoTexto]);

  const turmasFiltradas = useMemo(
    () => (cmeiId ? turmasAll.filter(t => t.cmeiId === cmeiId) : turmasAll),
    [cmeiId, turmasAll]
  );

  useMemo(() => {
    if (modelos.length === 1 && !modeloId) setModeloId(modelos[0].id);
  }, [modelos, modeloId]);

  // ===== AUTO-SAVE DRAFT =====
  const doSaveDraft = useCallback(() => {
    if (!cmeiId || !periodoId || !buscou) return;
    // Only save if there are actual selections
    const hasSelections = Object.keys(selecoes).length > 0;
    const hasObs = Object.values(observacoes).some(v => v.trim());
    if (!hasSelections && !hasObs) return;

    const now = new Date().toISOString();
    saveDraft({
      selecoes,
      observacoes,
      cmeiId,
      turmaId,
      periodoId,
      modeloId,
      tipo,
      savedAt: now,
    });
    setDraftSavedAt(now);
  }, [selecoes, observacoes, cmeiId, turmaId, periodoId, modeloId, tipo, buscou]);

  // Debounced auto-save on selection/observation changes
  useEffect(() => {
    if (!buscou) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      doSaveDraft();
    }, 1500);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [selecoes, observacoes, doSaveDraft, buscou]);

  // ===== CHECK FOR EXISTING DRAFT ON BUSCAR =====
  const handleBuscar = () => {
    if (!cmeiId) { toast.error("Selecione um local."); return; }
    if (!periodoId) { toast.error("Selecione um período."); return; }

    const existingDraft = loadDraft(cmeiId, turmaId, periodoId);
    if (existingDraft && Object.keys(existingDraft.selecoes).length > 0) {
      setPendingDraft(existingDraft);
      setShowResumeDialog(true);
    } else {
      startFresh();
    }
  };

  const startFresh = () => {
    setBuscou(true);
    setSelecoes({});
    setObservacoes({});
    setDraftSavedAt(null);
    clearDraft(cmeiId, turmaId, periodoId);
    setShowResumeDialog(false);
    setPendingDraft(null);
  };

  const resumeDraft = () => {
    if (!pendingDraft) return;
    // Restore filters from draft
    if (pendingDraft.tipo) setTipo(normalizeTipo(pendingDraft.tipo));
    if (pendingDraft.modeloId) setModeloId(pendingDraft.modeloId);
    setBuscou(true);
    // We need to wait for data to load, then apply draft selections
    // Use a small timeout to allow the state to settle
    setTimeout(() => {
      setSelecoes(pendingDraft.selecoes);
      setObservacoes(pendingDraft.observacoes);
      setDraftSavedAt(pendingDraft.savedAt);
    }, 500);
    setShowResumeDialog(false);
    setPendingDraft(null);
    toast.info("Rascunho restaurado! Continue de onde parou.");
  };

  const handleDiscardDraft = () => {
    clearDraft(cmeiId, turmaId, periodoId);
    startFresh();
    toast.info("Rascunho descartado.");
  };

  const toggleSelecao = (alunoId: string, nivelId: string) => {
    setSelecoes(prev => {
      const nivel = niveis.find(n => n.id === nivelId);
      if (!nivel) return prev;
      const key = `${alunoId}__${nivel.tipo}`;
      const next = { ...prev };
      if (next[key] === nivelId) {
        delete next[key];
      } else {
        next[key] = nivelId;
      }
      return next;
    });
  };

  const getSelecao = (alunoId: string, tipoNivel: string) => {
    return selecoes[`${alunoId}__${tipoNivel}`] || "";
  };

  // Count how many students have selections
  const studentsWithSelections = useMemo(() => {
    const ids = new Set<string>();
    Object.keys(selecoes).forEach(key => {
      const [alunoId] = key.split("__");
      ids.add(alunoId);
    });
    return ids.size;
  }, [selecoes]);

  const handleConfirmar = async () => {
    if (!user) { toast.error("Usuário não autenticado."); return; }
    const effectiveModeloId = modeloId || modelos[0]?.id;
    if (!effectiveModeloId) { toast.error("Nenhum modelo de sondagem disponível."); return; }
    const periodo = periodos.find((p) => p.id === periodoId);
    if (!periodoId || !periodo) { toast.error("Selecione um período."); return; }
    if (!periodo.isOpen) {
      toast.error("Este período está fechado. Selecione um período aberto ou peça para reabrir.");
      return;
    }

    const studentSelections = new Map<string, string[]>();
    Object.entries(selecoes).forEach(([key, nivelId]) => {
      const [alunoId] = key.split("__");
      if (!studentSelections.has(alunoId)) studentSelections.set(alunoId, []);
      studentSelections.get(alunoId)!.push(nivelId);
    });

    if (studentSelections.size === 0) {
      toast.error("Selecione pelo menos um nível para algum aluno.");
      return;
    }

    // Validate required observation fields for "escrita" type
    if (tipo === "escrita" || tipo === "todos") {
      const missingObs: string[] = [];
      for (const [alunoId] of studentSelections) {
        const aluno = alunosData.find(a => a.id === alunoId);
        const nome = aluno?.nome || "Aluno";
        const numTracados = observacoes[`${alunoId}__numeros_tracados`];
        const corpoHumano = observacoes[`${alunoId}__corpo_humano`];
        if (!numTracados) {
          missingObs.push(`${nome}: Números Traçados`);
        }
        if (!corpoHumano?.trim()) {
          missingObs.push(`${nome}: Corpo Humano`);
        }
      }
      if (missingObs.length > 0) {
        toast.error(`Preencha as observações obrigatórias: ${missingObs.slice(0, 3).join(", ")}${missingObs.length > 3 ? "..." : ""}`);
        return;
      }
    }

    setSaving(true);
    try {
      for (const [alunoId, nivelIds] of studentSelections) {
        const existente = sondagemPorAluno.get(alunoId);
        const obsEncoded = encodeObservacoes({
          geral: observacoes[alunoId] || "",
          escrita: {
            numeros_tracados: observacoes[`${alunoId}__numeros_tracados`],
            numeros_qtd: observacoes[`${alunoId}__numeros_qtd`],
            corpo_humano: observacoes[`${alunoId}__corpo_humano`],
          },
          producao_texto: {
            segmentacao: observacoes[`${alunoId}__segmentacao`],
            pontuacao: observacoes[`${alunoId}__pontuacao`],
            ortografia: observacoes[`${alunoId}__ortografia`],
          },
        });

        if (existente) {
          const { error: updateErr } = await supabase
            .from("sondagens")
            .update({
              aplicador_id: user.id,
              modelo_id: effectiveModeloId,
              periodo: periodoId,
              observacoes: obsEncoded || null,
              updated_at: new Date().toISOString(),
              status: "finalizado",
            })
            .eq("id", existente.id);
          if (updateErr) throw updateErr;

          const { error: delErr } = await supabase
            .from("respostas_sondagem")
            .delete()
            .eq("sondagem_id", existente.id);

          if (delErr) {
            const { data: existingRows, error: existingErr } = await supabase
              .from("respostas_sondagem")
              .select("nivel_id")
              .eq("sondagem_id", existente.id);
            if (existingErr) throw existingErr;

            const existingSet = new Set<string>(
              ((existingRows || []) as Array<Pick<RespostaRow, "nivel_id">>)
                .map((r) => r.nivel_id)
                .filter((id): id is string => !!id),
            );
            const nextSet = new Set<string>(nivelIds);
            const toDelete = Array.from(existingSet).filter((id) => !nextSet.has(id));
            const toInsert = Array.from(nextSet)
              .filter((id) => !existingSet.has(id))
              .map((nivel_id) => ({ sondagem_id: existente.id, nivel_id }));

            if (toDelete.length > 0) {
              const { error: delSomeErr } = await supabase
                .from("respostas_sondagem")
                .delete()
                .eq("sondagem_id", existente.id)
                .in("nivel_id", toDelete);
              if (delSomeErr) throw delSomeErr;
            }
            if (toInsert.length > 0) {
              const { error: insSomeErr } = await supabase
                .from("respostas_sondagem")
                .insert(toInsert);
              if (insSomeErr) throw insSomeErr;
            }
          } else {
            const respostas = nivelIds.map(nivelId => ({
              sondagem_id: existente.id,
              nivel_id: nivelId,
            }));

            const { error: respError } = await supabase
              .from("respostas_sondagem")
              .insert(respostas);
            if (respError) throw respError;
          }
        } else {
          const { data: sondagem, error } = await supabase
            .from("sondagens")
            .insert({
              crianca_id: alunoId,
              aplicador_id: user.id,
              modelo_id: effectiveModeloId,
              periodo: periodoId,
              observacoes: obsEncoded || null,
              status: "finalizado",
            })
            .select("id")
            .single();
          if (error) throw error;

          const respostas = nivelIds.map(nivelId => ({
            sondagem_id: sondagem.id,
            nivel_id: nivelId,
          }));

          const { error: respError } = await supabase
            .from("respostas_sondagem")
            .insert(respostas);
          if (respError) throw respError;
        }
      }

      const alunoNames = [...studentSelections.keys()].map(id => alunosData.find(a => a.id === id)?.nome || id);
      const dadosSondagem: Record<string, { niveis: string[]; observacao: string | undefined }> = {};
      for (const [alunoId, nivelIds] of studentSelections.entries()) {
        const aluno = alunosData.find(a => a.id === alunoId);
        const niveisInfo = nivelIds.map(nId => {
          const nivel = niveis.find(n => n.id === nId);
          return nivel ? `${nivel.codigo} (${nivel.tipo})` : nId;
        });
        dadosSondagem[aluno?.nome || alunoId] = {
          niveis: niveisInfo,
          observacao: observacoes[alunoId],
        };
      }
      await registrarAuditoria({
        acao: "registrar_sondagem",
        tabela: "sondagens",
        dados_depois: dadosSondagem,
        detalhes: `Sondagem registrada para ${studentSelections.size} aluno(s): ${alunoNames.slice(0, 3).join(", ")}${alunoNames.length > 3 ? "..." : ""}`,
      });
      toast.success(`Sondagem registrada para ${studentSelections.size} aluno(s)!`);

      // Lock saved students immediately and clear editing state
      setSavedStudents(prev => {
        const next = new Set(prev);
        studentSelections.forEach((_, id) => next.add(id));
        return next;
      });
      setEditingStudents(prev => {
        const next = new Set(prev);
        studentSelections.forEach((_, id) => next.delete(id));
        return next;
      });

      // Clear draft after successful save
      clearDraft(cmeiId, turmaId, periodoId);
      setDraftSavedAt(null);

      // Update solicitação status to concluída if originated from one
      if (solicitacaoId) {
        const patch: SolicitacaoUpdate = { status: "concluida", updated_at: new Date().toISOString() };
        await supabase
          .from("solicitacoes_sondagem")
          .update(patch)
          .eq("id", solicitacaoId);
        queryClient.invalidateQueries({ queryKey: ["solicitacoes-coord"] });
        setSolicitacaoId(null);
        setSolicitacaoInfo(null);
      }

      queryClient.invalidateQueries({ queryKey: ["sondagens-existentes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      const meta = typeof err === "object" && err ? (err as { code?: string; status?: number }) : undefined;
      const msg = message.toLowerCase();
      if (
        meta?.code === "42501" ||
        meta?.status === 401 ||
        meta?.status === 403 ||
        msg.includes("row-level security") ||
        msg.includes("policy") ||
        msg.includes("is_periodo_aberto") ||
        msg.includes("período") ||
        msg.includes("periodo")
      ) {
        toast.error("Não foi possível salvar: o período está fechado.");
      } else {
        toast.error("Erro ao salvar: " + (message || "Tente novamente."));
      }
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const isLoading = loadingAlunos || loadingNiveis || loadingSondagens;

  return (
    <>
      {!canView ? (
        <div className="rounded-2xl border p-6 bg-muted/30 text-sm text-muted-foreground">
          Você não tem permissão para acessar a aplicação de sondagem.
        </div>
      ) : null}
      {canView && (
      <div className="space-y-6">
      {/* Header */}
      <PageHeader
        leading={
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <ClipboardList className="h-7 w-7" />
          </div>
        }
        title="Lançamento de Sondagem"
        description="Registre os índices de aprendizagem dos alunos por turma e período."
        actions={
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {(canSolicitar || role === "coordenador" || role === "admin" || role === "equipe_pedagogica") && (
            <Button variant="outline" className="gap-2" onClick={() => navigate("/modulo/sondar/solicitar")}>
              <FileDown className="h-4 w-4" />
              Solicitar Sondagem
            </Button>
          )}
          {buscou && draftSavedAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Save className="h-3 w-3" />
              <span>Rascunho salvo às {new Date(draftSavedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          )}
          {buscou && (
            <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={() => {
              clearDraft(cmeiId, turmaId, periodoId);
              setSelecoes({});
              setObservacoes({});
              setSavedStudents(new Set());
              setEditingStudents(new Set());
              setBuscou(false);
              setDraftSavedAt(null);
              setSolicitacaoId(null);
              setSolicitacaoInfo(null);
            }}>
              <RotateCcw className="h-4 w-4" />
              Cancelar
            </Button>
          )}
          {buscou && alunosData.length > 0 && canLaunch && (
            <Button className="gap-2" onClick={handleConfirmar} disabled={saving}>
              {saving ? <Spinner className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {saving ? "Salvando..." : `Confirmar${studentsWithSelections > 0 ? ` (${studentsWithSelections})` : ""}`}
            </Button>
          )}
          {buscou && alunosData.length > 0 && !canLaunch && (
            <span className="text-xs text-muted-foreground">
              Sem permissão para lançar
            </span>
          )}
        </div>
        }
      />


      {/* Aviso de novas solicitações pendentes */}
      {solicitacoesPendentes.length > 0 && !solicitacaoInfo && (
        <div className="rounded-2xl bg-card border border-primary/15 shadow-sm p-5 animate-fade-up">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 text-primary shrink-0">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-foreground">
                  {solicitacoesPendentes.length === 1
                    ? "1 solicitação de sondagem pendente"
                    : `${solicitacoesPendentes.length} solicitações de sondagem pendentes`}
                </p>
                <p className="text-sm text-muted-foreground">
                  Abra uma solicitação para iniciar o lançamento.
                </p>
              </div>
            </div>
            <Badge className="shrink-0 bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 uppercase tracking-wider text-[10px] font-bold">
              {solicitacoesPendentes.length} pendente{solicitacoesPendentes.length > 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="mt-3 space-y-1.5">
            {(showAllPendentes ? solicitacoesPendentes : solicitacoesPendentes.slice(0, LIMIT_VISIBLE)).map((sol) => (
              <div key={sol.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors px-3 py-2">
                <span className="text-sm text-muted-foreground truncate">
                  {sol.cmei_nome} — {sol.turma_nome || "Todas as turmas"} ({getPeriodoNome(sol.mes)})
                </span>
                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                  {canMutateSolicitacao(sol) && (
                    <>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => handleEditarSolicitacao(sol, e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => handleExcluirSolicitacao(sol, e)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 shrink-0"
                    onClick={() => handleAbrirSolicitacao(sol)}
                  >
                    Abrir
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {solicitacoesPendentes.length > LIMIT_VISIBLE && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => setShowAllPendentes(!showAllPendentes)}
              >
                {showAllPendentes ? "Ver menos" : `Ver mais (${solicitacoesPendentes.length - LIMIT_VISIBLE} restantes)`}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Filtros para coordenadores */}
      {isCoord && !buscou && solicitacoesList.length > 0 && (
        <div className="rounded-2xl bg-card p-5 shadow-sm border">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo</label>
              <Select value={filtroTipo} onValueChange={(v: "todos" | "escrita" | "producao_texto") => setFiltroTipo(v)}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="escrita">Escrita</SelectItem>
                  <SelectItem value="producao_texto">Produção de Texto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Local</label>
              <Select
                value={(coordinatorSchoolId || filtroLocal) || "todos"}
                onValueChange={(v) => { setFiltroLocal(v === "todos" ? "" : v); setFiltroTurma(""); }}
                disabled={!!coordinatorSchoolId}
              >
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  {!coordinatorSchoolId && <SelectItem value="todos">Todos</SelectItem>}
                  {solicitacoesCmeis.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Turma</label>
              <Select value={filtroTurma || "todos"} onValueChange={(v) => setFiltroTurma(v === "todos" ? "" : v)} disabled={!filtroLocal}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {solicitacoesTurmas.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Período</label>
              <Select value={filtroPeriodo || "todos"} onValueChange={(v) => setFiltroPeriodo(v === "todos" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {solicitacoesMeses.map(m => <SelectItem key={m} value={m}>{getPeriodoLabel(m)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Solicitações para coordenadores */}
      {isCoord && !buscou && (
        <div className="space-y-4">
          {loadingSolicitacoes ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Pendentes / Em andamento */}
              {solicitacoesPendentes.length > 0 && (
                <div className="rounded-2xl bg-card p-5 shadow-sm border space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-foreground">Sondagens Pendentes</h3>
                    <Badge variant="secondary" className="text-[10px]">{solicitacoesPendentes.length}</Badge>
                  </div>
                   <div className="space-y-2">
                    {(showAllPendentes ? solicitacoesPendentes : solicitacoesPendentes.slice(0, LIMIT_VISIBLE)).map((sol) => (
                      <div
                        key={sol.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 cursor-pointer transition-colors"
                        onClick={() => handleAbrirSolicitacao(sol)}
                      >
                        <div className="flex items-center gap-3">
                          <ClipboardList className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {sol.cmei_nome} — {sol.turma_nome || "Todas as turmas"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {sol.tipo === "escrita" ? "Escrita" : "Produção de Texto"} • Período: {getPeriodoNome(sol.mes)} •{" "}
                              {new Date(sol.created_at || "").toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {sol.arquivo_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1.5 text-xs text-primary hover:text-primary"
                              onClick={(e) => handleDownloadArquivo(sol.arquivo_url, e)}
                            >
                              <FileDown className="h-3.5 w-3.5" />
                              Arquivo
                            </Button>
                          )}
                          <Badge
                            variant={sol.status === "em_andamento" ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {sol.status === "em_andamento" ? "Em Andamento" : "Pendente"}
                          </Badge>
                          {canMutateSolicitacao(sol) && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleEditarSolicitacao(sol, e)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => handleExcluirSolicitacao(sol, e)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                  {solicitacoesPendentes.length > LIMIT_VISIBLE && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground"
                      onClick={() => setShowAllPendentes(!showAllPendentes)}
                    >
                      {showAllPendentes ? "Ver menos" : `Ver mais (${solicitacoesPendentes.length - LIMIT_VISIBLE} restantes)`}
                    </Button>
                  )}
                </div>
              )}

              {/* Concluídas */}
              {solicitacoesConcluidas.length > 0 && (
                <div className="rounded-2xl bg-card p-5 shadow-sm border space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCheck className="h-4 w-4 text-emerald-500" />
                    <h3 className="text-sm font-semibold text-foreground">Sondagens Concluídas</h3>
                    <Badge variant="outline" className="text-[10px]">{solicitacoesConcluidas.length}</Badge>
                  </div>
                   <div className="space-y-2">
                    {(showAllConcluidas ? solicitacoesConcluidas : solicitacoesConcluidas.slice(0, LIMIT_VISIBLE)).map((sol) => (
                      <div
                        key={sol.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => handleAbrirSolicitacao(sol)}
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {sol.cmei_nome} — {sol.turma_nome || "Todas as turmas"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {sol.tipo === "escrita" ? "Escrita" : "Produção de Texto"} • Período: {getPeriodoNome(sol.mes)} •{" "}
                              {new Date(sol.created_at || "").toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {sol.arquivo_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1.5 text-xs text-primary hover:text-primary"
                              onClick={(e) => handleDownloadArquivo(sol.arquivo_url, e)}
                            >
                              <FileDown className="h-3.5 w-3.5" />
                              Arquivo
                            </Button>
                          )}
                          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600">
                            Concluída
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  {solicitacoesConcluidas.length > LIMIT_VISIBLE && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground"
                      onClick={() => setShowAllConcluidas(!showAllConcluidas)}
                    >
                      {showAllConcluidas ? "Ver menos" : `Ver mais (${solicitacoesConcluidas.length - LIMIT_VISIBLE} restantes)`}
                    </Button>
                  )}
                </div>
              )}

              {solicitacoesFiltradas.length === 0 && solicitacoesList.length > 0 && (
                <div className="rounded-2xl bg-card p-8 shadow-sm border text-center">
                  <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma solicitação encontrada com os filtros selecionados.</p>
                </div>
              )}

              {solicitacoesList.length === 0 && (
                <div className="rounded-2xl bg-card p-8 shadow-sm border text-center">
                  <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma solicitação de sondagem encontrada.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Filtros */}
      {!(isCoord && !buscou && solicitacoesList.length > 0) && <div className="rounded-2xl bg-card p-4 sm:p-6 lg:p-8 shadow-sm border overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 lg:gap-5 items-end">
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Tipo {solicitacaoInfo?.tipo ? "— definido pela solicitação" : ""}
            </label>
            {solicitacaoInfo?.tipo ? (
              <div className="min-w-0 h-10 px-3 inline-flex items-center rounded-md border bg-muted/40 text-sm">
                {tipo === "escrita" ? "Escrita" : tipo === "producao_texto" ? "Produção de Texto" : "Todos"}
              </div>
            ) : (
              <Select value={tipo} onValueChange={(v: "todos" | "escrita" | "producao_texto") => { setTipo(v); setSelecoes({}); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="escrita">Escrita</SelectItem>
                  <SelectItem value="producao_texto">Produção de Texto</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Local</label>
            <Select
              value={cmeiId}
              onValueChange={(v) => { setCmeiId(v); setTurmaId(""); setBuscou(false); }}
              disabled={!!coordinatorSchoolId}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder={loadingCmeis ? "Carregando..." : "Selecione"} /></SelectTrigger>
              <SelectContent>
                {cmeis.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Turma</label>
            <Select value={turmaId} onValueChange={(v) => { setTurmaId(v); setBuscou(false); }} disabled={!cmeiId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {turmasFiltradas.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Período</label>
            <Select value={periodoId} onValueChange={setPeriodoId} disabled={periodosDisponiveisBusca.length === 0}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={periodosDisponiveisBusca.length === 0 ? "Nenhum período disponível" : "Selecione"} />
              </SelectTrigger>
              <SelectContent>
                {periodosDisponiveisBusca.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="gap-2 w-full md:w-auto xl:min-w-[132px] md:justify-center shadow-md shadow-primary/20" onClick={handleBuscar} disabled={!cmeiId}>
            <Search className="h-4 w-4" />
            Buscar
          </Button>
        </div>
      </div>}

      {/* Empty state quando nenhuma busca foi feita */}
      {!(isCoord && !buscou && solicitacoesList.length > 0) && !buscou && !solicitacaoInfo && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground animate-fade-up">
          <div className="w-16 h-16 border-2 border-dashed border-border rounded-full flex items-center justify-center mb-4">
            <Search className="h-7 w-7 opacity-30" />
          </div>
          <p className="text-sm">Selecione os filtros acima e clique em Buscar para visualizar as turmas.</p>
        </div>
      )}

      {/* Solicitação info banner */}
      {solicitacaoInfo && (
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">Solicitação</Badge>
            <span className="text-sm font-medium text-foreground">
              {solicitacaoInfo.cmei_nome} — {solicitacaoInfo.turma_nome || "Todas as turmas"} — Período: {getPeriodoNome(solicitacaoInfo.mes)}
            </span>
          </div>
          {solicitacaoInfo.palavras && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Palavras sugeridas:</span> {solicitacaoInfo.palavras}
            </div>
          )}
          {solicitacaoInfo.frases && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Frases sugeridas:</span> {solicitacaoInfo.frases}
            </div>
          )}
          {solicitacaoInfo.arquivo_url && (
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={(e) => handleDownloadArquivo(solicitacaoInfo.arquivo_url, e)}
              >
                <FileDown className="h-3.5 w-3.5" />
                Baixar arquivo anexo
              </Button>
            </div>
          )}
        </div>
      )}

      {buscou && alunosData.length > 0 && !isLoading && (
        <div className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3 border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Progresso:</span>
              <span className="text-sm font-bold text-foreground">{studentsWithSelections}</span>
              <span className="text-xs text-muted-foreground">de {alunosData.length} alunos</span>
            </div>
            <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${alunosData.length > 0 ? (studentsWithSelections / alunosData.length) * 100 : 0}%` }}
              />
            </div>
          </div>
          {draftSavedAt && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => {
                clearDraft(cmeiId, turmaId, periodoId);
                setSelecoes({});
                setObservacoes({});
                setDraftSavedAt(null);
                toast.info("Rascunho limpo.");
              }}
            >
              <Trash2 className="h-3 w-3" />
              Limpar rascunho
            </Button>
          )}
        </div>
      )}

      {/* Grid de lançamento */}
      {buscou && canLaunch && (
        <div className="rounded-2xl bg-card p-6 shadow-sm border overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
            </div>
          ) : alunosData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum aluno encontrado para os filtros selecionados.
            </p>
          ) : (
            <TooltipProvider>
              <Table>
                <TableHeader>
                  {tipo === "todos" && (
                    <TableRow>
                      <TableHead className="min-w-[180px]" />
                      <TableHead colSpan={niveisEscrita.length} className="text-center border-l bg-primary/5 text-primary font-semibold text-xs">
                        Escrita
                      </TableHead>
                      <TableHead colSpan={niveisProducaoTexto.length} className="text-center border-l bg-accent/50 text-accent-foreground font-semibold text-xs">
                        Produção de Texto
                      </TableHead>
                      <TableHead className="min-w-[60px]" />
                    </TableRow>
                  )}
                  <TableRow>
                    <TableHead className="min-w-[180px]">Aluno</TableHead>
                    {niveisFiltrados.map(n => (
                      <TableHead key={n.id} className="text-center min-w-[80px]">
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className="font-semibold text-xs"
                            style={{ color: n.tipo === "escrita" ? getEscritaColor(n.codigo) : getProducaoColor(n.codigo) }}
                          >
                            {n.codigo}
                          </span>
                          <span className="text-[10px] font-normal text-muted-foreground leading-tight">{n.descricao}</span>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center min-w-[60px]">Obs.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alunosData.map(aluno => {
                    const sondagemExistente = sondagemPorAluno.get(aluno.id);
                    const hasSelection = Object.keys(selecoes).some(k => k.startsWith(aluno.id + "__"));
                    return (
                      <TableRow key={aluno.id} className={sondagemExistente ? "bg-muted/30" : hasSelection ? "bg-primary/5" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span>{aluno.nome}</span>
                            {(sondagemExistente || savedStudents.has(aluno.id)) && !editingStudents.has(aluno.id) && (
                              <>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  Avaliado
                                </Badge>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => setEditingStudents(prev => {
                                        const next = new Set(prev);
                                        next.add(aluno.id);
                                        return next;
                                      })}
                                    >
                                      <Pencil className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar avaliação</TooltipContent>
                                </Tooltip>
                              </>
                            )}
                            {(sondagemExistente || savedStudents.has(aluno.id)) && editingStudents.has(aluno.id) && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-600">
                                Editando
                              </Badge>
                            )}
                            {!sondagemExistente && !savedStudents.has(aluno.id) && hasSelection && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                                Rascunho
                              </Badge>
                            )}
                          </div>
                          {/* Nível anterior */}
                          {(() => {
                            const anterior = nivelAnteriorPorAluno.get(aluno.id);
                            if (!anterior) return null;
                            return (
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                                <span className="font-medium">Anterior ({anterior.periodo}):</span>
                                {anterior.escrita && (
                                  <span className="px-1 py-0 rounded border text-[10px]" style={{ borderColor: getEscritaColor(anterior.escrita.codigo), color: getEscritaColor(anterior.escrita.codigo) }}>
                                    {anterior.escrita.codigo}
                                  </span>
                                )}
                                {anterior.producao && (
                                  <span className="px-1 py-0 rounded border text-[10px]" style={{ borderColor: getProducaoColor(anterior.producao.codigo), color: getProducaoColor(anterior.producao.codigo) }}>
                                    {anterior.producao.codigo}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                          </div>
                        </TableCell>
                        {niveisFiltrados.map(nivel => {
                          const isLocked = (!!sondagemExistente || savedStudents.has(aluno.id)) && !editingStudents.has(aluno.id);
                          return (
                            <TableCell key={nivel.id} className="text-center">
                              <Checkbox
                                checked={getSelecao(aluno.id, nivel.tipo) === nivel.id}
                                onCheckedChange={() => toggleSelecao(aluno.id, nivel.id)}
                                className="mx-auto"
                                disabled={isLocked}
                              />
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          {(() => {
                            const hasProducao = tipo === "producao_texto" || (tipo === "todos" && !!selecoes[`${aluno.id}__producao_texto`]);
                            const hasEscrita = tipo === "escrita" || (tipo === "todos" && !!selecoes[`${aluno.id}__escrita`]);
                            const isOnlyProducao = tipo === "producao_texto" || (hasProducao && !hasEscrita);
                            return (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant={
                                (observacoes[aluno.id] || observacoes[`${aluno.id}__numeros_tracados`] || observacoes[`${aluno.id}__corpo_humano`] || observacoes[`${aluno.id}__segmentacao`] || observacoes[`${aluno.id}__pontuacao`] || observacoes[`${aluno.id}__ortografia`])
                                  ? "default" : "ghost"
                              } size="icon" className="h-8 w-8">
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" side="left">
                              <div className="space-y-3">
                                <p className="text-sm font-medium">Observações — {aluno.nome}</p>
                                
                                {/* Campos de ESCRITA */}
                                {!isOnlyProducao && (
                                  <>
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Números Traçados?</label>
                                        <Select
                                          value={observacoes[`${aluno.id}__numeros_tracados`] || ""}
                                          onValueChange={(v) => setObservacoes(prev => ({ ...prev, [`${aluno.id}__numeros_tracados`]: v }))}
                                        >
                                          <SelectTrigger className="h-7 text-xs w-20">
                                            <SelectValue placeholder="--" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="sim">Sim</SelectItem>
                                            <SelectItem value="nao">Não</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      {observacoes[`${aluno.id}__numeros_tracados`] === "sim" && (
                                        <div className="flex items-center gap-2">
                                          <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Quantidade:</label>
                                          <Input
                                            type="number"
                                            className="h-7 text-xs w-20"
                                            value={observacoes[`${aluno.id}__numeros_qtd`] || ""}
                                            onChange={(e) => setObservacoes(prev => ({ ...prev, [`${aluno.id}__numeros_qtd`]: e.target.value }))}
                                            placeholder="0"
                                          />
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Corpo Humano</label>
                                      <Textarea
                                        placeholder="Descreva a percepção sobre corpo humano..."
                                        value={observacoes[`${aluno.id}__corpo_humano`] || ""}
                                        onChange={(e) => setObservacoes(prev => ({ ...prev, [`${aluno.id}__corpo_humano`]: e.target.value }))}
                                        rows={2}
                                        className="text-xs"
                                      />
                                    </div>
                                  </>
                                )}

                                {/* Campos de PRODUÇÃO DE TEXTO */}
                                {(isOnlyProducao || tipo === "todos") && hasProducao && (
                                  <>
                                    {tipo === "todos" && <div className="border-t pt-2 mt-2"><p className="text-xs font-semibold text-muted-foreground">Produção de Texto</p></div>}
                                    <div>
                                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Segmentação</label>
                                      <Textarea
                                        placeholder="Observações sobre segmentação..."
                                        value={observacoes[`${aluno.id}__segmentacao`] || ""}
                                        onChange={(e) => setObservacoes(prev => ({ ...prev, [`${aluno.id}__segmentacao`]: e.target.value }))}
                                        rows={2}
                                        className="text-xs"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Pontuação</label>
                                      <Textarea
                                        placeholder="Observações sobre pontuação..."
                                        value={observacoes[`${aluno.id}__pontuacao`] || ""}
                                        onChange={(e) => setObservacoes(prev => ({ ...prev, [`${aluno.id}__pontuacao`]: e.target.value }))}
                                        rows={2}
                                        className="text-xs"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Ortografia</label>
                                      <Textarea
                                        placeholder="Observações sobre ortografia..."
                                        value={observacoes[`${aluno.id}__ortografia`] || ""}
                                        onChange={(e) => setObservacoes(prev => ({ ...prev, [`${aluno.id}__ortografia`]: e.target.value }))}
                                        rows={2}
                                        className="text-xs"
                                      />
                                    </div>
                                  </>
                                )}

                                <div>
                                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Observações gerais</label>
                                  <Textarea
                                    placeholder="Digite observações sobre o aluno..."
                                    value={observacoes[aluno.id] || ""}
                                    onChange={(e) => setObservacoes(prev => ({ ...prev, [aluno.id]: e.target.value }))}
                                    rows={2}
                                    className="text-xs"
                                  />
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TooltipProvider>
          )}
        </div>
      )}

      {/* Resume Draft Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Rascunho encontrado
            </DialogTitle>
            <DialogDescription>
              Existe um lançamento em andamento para estes filtros.
              {pendingDraft?.savedAt && (
                <span className="block mt-1 text-xs">
                  Salvo em {new Date(pendingDraft.savedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {" · "}{Object.keys(pendingDraft.selecoes).length > 0 && `${new Set(Object.keys(pendingDraft.selecoes).map(k => k.split("__")[0])).size} aluno(s) com seleção`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleDiscardDraft} className="gap-1.5">
              <Trash2 className="h-4 w-4" />
              Descartar e começar novo
            </Button>
            <Button onClick={resumeDraft} className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              Continuar de onde parou
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
      )}
    </>
  );
}
