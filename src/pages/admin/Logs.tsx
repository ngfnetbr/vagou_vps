import { useState, useMemo, useRef } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useDebounce } from "@/hooks/use-debounce";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Activity, AlertCircle, Info, CheckCircle2, RefreshCw, Download, XCircle, Repeat, UserMinus, ChevronLeft, ChevronRight, User, Building2, FileText, Bell, ArrowRightLeft, FileCheck } from "lucide-react";
import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";
import { useLogsUsers } from "@/hooks/api/criancas-hooks";
import { useCMEIs, useConfiguracoes } from "@/hooks/api/supabase-hooks";
import { format, isAfter, isBefore, startOfDay, endOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import html2pdf from "html2pdf.js";
import { NotificacoesMonitor } from "@/components/admin/NotificacoesMonitor";
import { getUnidadeLabels } from "@/utils/unidade-utils";
import { useAuditoria } from "@/hooks/api/auditoria-hooks";

const ITEMS_PER_PAGE = 20;

const Logs = () => {
  const [tab, setTab] = useState<"logs" | "notificacoes">("logs");
  const [searchTerm, setSearchTerm] = useState("");
  const { debouncedValue: debouncedSearchTerm, isDebouncing: isSearching } = useDebounce(searchTerm, 300);
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [usuarioFilter, setUsuarioFilter] = useState<string>("all");
  const [cmeiFilter, setCmeiFilter] = useState<string>("all");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(() => Date.now());
  const logsScrollAreaRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const { data: auditoria, isLoading, isRefetching } = useAuditoria(5000);
  const { data: usuarios } = useLogsUsers();
  const { data: cmeis } = useCMEIs();
  const { data: config } = useConfiguracoes();
  const { singular, plural } = getUnidadeLabels(config as any);

  // Mapeamento de nomes técnicos para nomes amigáveis
  const formatAcaoLabel = (acao: string): string => {
    const mapeamento: Record<string, string> = {
      // Notificações
      'notificacao_convocacao': 'Notificação de Convocação',
      'notificacao_documentos_aprovados': 'Notificação de Documentos Aprovados',
      'notificacao_documentos_pendentes': 'Notificação de Documentos Pendentes',
      'notificacao_matricula_confirmada': 'Notificação de Matrícula Confirmada',
      'notificacao_prazo_vencendo': 'Notificação de Prazo Vencendo',
      'notificacao_lembrete': 'Notificação de Lembrete',
      'notificacao_posicao_fila': 'Notificação de Posição na Fila',
      'notificacao_remanejamento': 'Notificação de Remanejamento',
      'notificacao_recusa': 'Notificação de Recusa',
      'notificacao_desistencia': 'Notificação de Desistência',
      'notificacao_transferencia': 'Notificação de Transferência',
      // Ações do sistema
      'posicao_fila': 'Atualização de Posição na Fila',
      'convocacao_enviada': 'Convocação Enviada',
      'matricula_confirmada': 'Matrícula Confirmada',
      'documentos_aprovados': 'Documentos Aprovados',
      'documentos_recusados': 'Documentos Recusados',
    };
    return mapeamento[acao] || acao;
  };

  const getLogIcon = (acao: string) => {
    if (acao.includes("Convocação") || acao.includes("Convocado") || acao.includes("convocacao")) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    if (acao.includes("Matrícula") || acao.includes("Confirmada") || acao.includes("matricula")) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (acao.includes("Inscrição") || acao.includes("inscricao")) return <Info className="h-4 w-4 text-blue-500" />;
    if (acao.includes("Recusada") || acao.includes("Desistente") || acao.includes("recusa") || acao.includes("desistencia")) return <XCircle className="h-4 w-4 text-red-500" />;
    if (acao.includes("Remanejamento") || acao.includes("Realocação") || acao.includes("remanejamento")) return <Repeat className="h-4 w-4 text-purple-500" />;
    if (acao.includes("Fim de Fila") || acao.includes("posicao_fila")) return <UserMinus className="h-4 w-4 text-orange-500" />;
    if (acao.includes("notificacao") || acao.includes("Notificação")) return <Bell className="h-4 w-4 text-blue-400" />;
    if (acao.includes("Transferência") || acao.includes("transferencia")) return <ArrowRightLeft className="h-4 w-4 text-indigo-500" />;
    if (acao.includes("documento") || acao.includes("Documento")) return <FileCheck className="h-4 w-4 text-emerald-500" />;
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  const getLogBadge = (acao: string): "default" | "secondary" | "destructive" | "outline" => {
    if (acao.includes("Convocação") || acao.includes("Convocado")) return "default";
    if (acao.includes("Matrícula") || acao.includes("Confirmada")) return "default";
    if (acao.includes("Inscrição")) return "secondary";
    if (acao.includes("Recusada") || acao.includes("Desistente")) return "destructive";
    return "outline";
  };

  // Helper to get CMEI name
  const getCmeiName = (cmeiId: string | null) => {
    if (!cmeiId || !cmeis) return null;
    return cmeis.find(c => c.id === cmeiId)?.nome || null;
  };

  const usuariosMap = useMemo(() => {
    const map: Record<string, { nome_completo: string | null; email: string | null }> = {};
    (usuarios || []).forEach((u) => {
      map[u.id] = { nome_completo: u.nome_completo ?? null, email: u.email ?? null };
    });
    return map;
  }, [usuarios]);

  const logs = useMemo(() => {
    const ignoredKeys = new Set([
      "created_at",
      "updated_at",
    ]);

    const isPlainObject = (v: unknown): v is Record<string, unknown> =>
      typeof v === "object" && v !== null && !Array.isArray(v);

    const isUuid = (value: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

    const shortId = (value: string) => value.slice(0, 8);

    const getString = (obj: unknown, key: string): string | undefined => {
      if (!isPlainObject(obj)) return undefined;
      const v = obj[key];
      if (typeof v === "string") return v;
      if (typeof v === "number") return String(v);
      if (typeof v === "boolean") return v ? "true" : "false";
      return undefined;
    };

    const labelCampo = (tabela: string, campo: string) => {
      const common: Record<string, string> = {
        status: "Status",
        cmei_atual_id: singular,
        turma_atual_id: "Turma",
        responsavel_nome: "Responsável",
        responsavel_cpf: "CPF do Responsável",
        responsavel_email: "E-mail do Responsável",
        responsavel_telefone: "Telefone do Responsável",
        responsavel_celular: "Celular do Responsável",
        cpf_crianca: "CPF da Criança",
        data_nascimento: "Data de Nascimento",
        protocolo: "Protocolo",
        convocacao_deadline: "Prazo de Convocação",
      };
      const byTable: Record<string, Record<string, string>> = {
        configuracoes_sistema: {
          webhook_url_notificacao: "Webhook de Notificação",
          notificacao_email: "Notificação (E-mail)",
          notificacao_sms: "Notificação (SMS)",
          notificacao_whatsapp: "Notificação (WhatsApp)",
          bloquear_novas_inscricoes: "Bloquear Novas Inscrições",
          autenticacao_publica: "Autenticação Pública",
        },
      };
      return (byTable[tabela]?.[campo] || common[campo] || campo);
    };

    const formatValue = (campo: string, value?: string) => {
      if (!value) return value;
      if ((campo === "cmei_atual_id" || campo.endsWith("_cmei_id") || campo.endsWith("_cmei")) && isUuid(value)) {
        return getCmeiName(value) || shortId(value);
      }
      if (campo.endsWith("_id") && isUuid(value)) return shortId(value);
      return value;
    };

    const diffKeys = (oldObj: unknown, newObj: unknown) => {
      if (!isPlainObject(oldObj) || !isPlainObject(newObj)) return [] as string[];
      const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
      const changed: string[] = [];
      keys.forEach((k) => {
        if (ignoredKeys.has(k)) return;
        const a = (oldObj as any)[k];
        const b = (newObj as any)[k];
        if (JSON.stringify(a) !== JSON.stringify(b)) changed.push(k);
      });
      return changed;
    };

    const labelTabela = (tabela: string) => {
      const map: Record<string, string> = {
        criancas: "Criança",
        cmeis: singular,
        turmas: "Turma",
        turmas_base: "Turma Base",
        configuracoes_sistema: "Configurações do Sistema",
        documentos_crianca: "Documentos da Criança",
        documentos_tipos: "Tipos de Documento",
        crianca_prioridades: "Prioridades da Criança",
        tipos_prioridade: "Tipos de Prioridade",
        user_roles: "Papéis de Usuário",
        role_permissoes: "Permissões do Papel",
        permissoes: "Permissões",
        templates_mensagens: "Templates de Mensagem",
        notificacoes_log: "Notificações",
        campos_inscricao: "Campos da Inscrição",
        valores_campos_custom: "Campos Personalizados",
        diretor_cmei_vinculo: `Vínculo Diretor-${singular}`,
        chat_mensagens: "Mensagens (Chat)",
        chat_respostas_rapidas: "Respostas Rápidas (Chat)",
        chat_marcadores: "Marcadores (Chat)",
        chat_conversas_config: "Configuração de Conversas (Chat)",
        chat_conversa_marcadores: "Marcadores da Conversa (Chat)",
        rate_limit_entries: "Controle de Rate Limit",
        user_preferences: "Preferências do Usuário",
        planejamento_transicao: "Planejamento de Transição",
        zonas_atendimento: "Zonas de Atendimento",
        cmei_zonas: `${singular} x Zonas`,
        feriados_municipais: "Feriados Municipais",
      };
      return map[tabela] || tabela;
    };

    const acaoPorOperacao = (operacao: string) => {
      switch (operacao.toUpperCase()) {
        case "INSERT": return "Cadastro";
        case "UPDATE": return "Atualização";
        case "DELETE": return "Exclusão";
        default: return operacao;
      }
    };

    const statusAcao = (novo: string) => {
      const map: Record<string, string> = {
        "Fila de Espera": "Fila de Espera",
        "Convocado": "Convocação",
        "Matriculado": "Matrícula",
        "Matriculada": "Matrícula",
        "Recusada": "Recusa",
        "Desistente": "Desistência",
        "Remanejamento Solicitado": "Remanejamento",
        "Concluinte": "Conclusão",
      };
      return map[novo] || "Atualização de Status";
    };

    const formatChangedFields = (tabela: string, oldObj: unknown, newObj: unknown, keys: string[]) => {
      if (!keys.length) return "Alteração registrada";
      const preview = keys.slice(0, 6).map((k) => {
        const before = formatValue(k, getString(oldObj, k));
        const after = formatValue(k, getString(newObj, k));
        const kLabel = labelCampo(tabela, k);
        if (before === undefined && after === undefined) return k;
        if (before === undefined) return `${kLabel}: ${after}`;
        if (after === undefined) return `${kLabel}: ${before}`;
        return `${kLabel}: ${before} → ${after}`;
      });
      const suffix = keys.length > 6 ? ` (+${keys.length - 6})` : "";
      return `Campos: ${preview.join(", ")}${suffix}`;
    };

    return (auditoria || []).map((a: any) => {
      const tabela = String(a.tabela);
      const operacao = String(a.operacao);
      const dadosAntigos = a.dados_antigos ?? null;
      const dadosNovos = a.dados_novos ?? null;

      const usuario_id = (a.usuario_id as string | null) ?? null;
      const usuario = usuario_id ? (usuariosMap[usuario_id] || null) : null;

      let acao = `${acaoPorOperacao(operacao)} de ${labelTabela(tabela)}`;
      let descricao: string | null = null;

      let crianca: { nome?: string; responsavel_nome?: string } | null = null;
      let status_anterior: string | null = null;
      let status_novo: string | null = null;
      let cmei_anterior: string | null = null;
      let cmei_novo: string | null = null;

      if (tabela === "criancas") {
        const nome = getString(dadosNovos ?? dadosAntigos, "nome");
        const responsavel_nome = getString(dadosNovos ?? dadosAntigos, "responsavel_nome");
        if (nome || responsavel_nome) crianca = { nome, responsavel_nome };

        status_anterior = getString(dadosAntigos, "status") || null;
        status_novo = getString(dadosNovos, "status") || null;
        cmei_anterior = getString(dadosAntigos, "cmei_atual_id") || null;
        cmei_novo = getString(dadosNovos, "cmei_atual_id") || null;

        if (operacao.toUpperCase() === "UPDATE" && status_anterior && status_novo && status_anterior !== status_novo) {
          acao = statusAcao(status_novo);
          descricao = `Status: ${status_anterior} → ${status_novo}`;
        } else if (operacao.toUpperCase() === "UPDATE" && cmei_anterior && cmei_novo && cmei_anterior !== cmei_novo) {
          acao = "Transferência";
          descricao = `${singular}: ${(getCmeiName(cmei_anterior) || shortId(cmei_anterior))} → ${(getCmeiName(cmei_novo) || shortId(cmei_novo))}`;
        } else if (operacao.toUpperCase() === "INSERT") {
          acao = "Inscrição";
          descricao = nome ? `Cadastro de criança: ${nome}` : "Cadastro de criança";
        } else if (operacao.toUpperCase() === "DELETE") {
          acao = "Exclusão";
          descricao = nome ? `Criança excluída: ${nome}` : "Criança excluída";
        } else {
          const keys = diffKeys(dadosAntigos, dadosNovos);
          if (operacao.toUpperCase() === "UPDATE" && keys.length === 1 && keys[0] === "posicao_fila") {
            return null;
          }
          descricao = formatChangedFields(tabela, dadosAntigos, dadosNovos, keys);
        }
      } else {
        const keys = diffKeys(dadosAntigos, dadosNovos);
        descricao = operacao.toUpperCase() === "UPDATE"
          ? formatChangedFields(tabela, dadosAntigos, dadosNovos, keys)
          : null;
      }

      if (tabela === "cmeis") {
        cmei_novo = (a.registro_id as string | null) ?? cmei_novo;
      }

      return {
        id: a.id as string,
        created_at: a.created_at as string | null,
        usuario_id,
        usuario,
        acao,
        descricao,
        justificativa: null as string | null,
        status_anterior,
        status_novo,
        cmei_anterior,
        cmei_novo,
        crianca,
        tabela,
        operacao,
        registro_id: (a.registro_id as string | null) ?? null,
      };
    }).filter(Boolean);
  }, [auditoria, cmeis, plural, singular, usuariosMap]);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    
    return logs.filter((log) => {
      const matchesSearch = 
        log.acao.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        log.descricao?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        log.crianca?.nome?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        log.tabela?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        log.operacao?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        log.registro_id?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (log.usuario as any)?.nome_completo?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

      const matchesTipo = 
        tipoFilter === "all" ||
        (tipoFilter === "convocacao" && (log.acao.includes("Convocação") || log.acao.includes("Convocado"))) ||
        (tipoFilter === "matricula" && (log.acao.includes("Matrícula") || log.acao.includes("Confirmada"))) ||
        (tipoFilter === "inscricao" && log.acao.includes("Inscrição")) ||
        (tipoFilter === "recusa" && (log.acao.includes("Recusada") || log.acao.includes("Desistente"))) ||
        (tipoFilter === "remanejamento" && (log.acao.includes("Remanejamento") || log.acao.includes("Realocação")));

      const matchesUsuario = usuarioFilter === "all" || log.usuario_id === usuarioFilter;

      const matchesCmei = cmeiFilter === "all" || 
        log.cmei_novo === cmeiFilter || 
        log.cmei_anterior === cmeiFilter;

      let matchesData = true;
      if (log.created_at) {
        const logDate = new Date(log.created_at);
        if (dataInicio) {
          matchesData = matchesData && !isBefore(logDate, startOfDay(parseISO(dataInicio)));
        }
        if (dataFim) {
          matchesData = matchesData && !isAfter(logDate, endOfDay(parseISO(dataFim)));
        }
      }

      return matchesSearch && matchesTipo && matchesData && matchesUsuario && matchesCmei;
    });
  }, [logs, debouncedSearchTerm, tipoFilter, usuarioFilter, cmeiFilter, dataInicio, dataFim]);

  // Paginação
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  // Reset página quando filtros mudam
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["auditoria"] });
    setLastUpdatedAt(Date.now());
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setTipoFilter("all");
    setUsuarioFilter("all");
    setCmeiFilter("all");
    setDataInicio("");
    setDataFim("");
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (!filteredLogs.length) return;
    
    const csvContent = [
      ["Data/Hora", "Ação", "Criança", "Usuário", "Status Anterior", "Status Novo", "Descrição", "Justificativa"].join(";"),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at!), "dd/MM/yyyy HH:mm"),
        log.acao,
        log.crianca?.nome || "",
        (log.usuario as any)?.nome_completo || (log.usuario as any)?.email || "",
        log.status_anterior || "",
        log.status_novo || "",
        log.descricao || "",
        log.justificativa || ""
      ].join(";"))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `logs_sistema_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    if (!filteredLogs.length) return;
    
    // Cabeçalho institucional (mesmo padrão do comprovante)
    const brasaoHtml = config?.brasao_url 
      ? `<div style="text-align: center;"><img src="${config.brasao_url}" alt="Brasão" style="height: 60px; width: auto; margin-bottom: 10px; display: inline-block;" crossorigin="anonymous" /></div>`
      : '';

    const cabecalho = `
      <div style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #1351B4;">
        ${brasaoHtml}
        <h1 style="color: #1351B4; margin: 0 0 5px 0; font-size: 16px; font-weight: bold;">
          ${config?.nome_municipio || 'Município'}
        </h1>
        <h2 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; font-weight: 600;">
          ${config?.nome_secretaria || 'Secretaria de Educação'}
        </h2>
        <p style="color: #666; margin: 0; font-size: 10px;">
          ${config?.email_contato ? `E-mail: ${config.email_contato}` : ''}
          ${config?.email_contato && config?.telefone_contato ? ' | ' : ''}
          ${config?.telefone_contato ? `Tel: ${config.telefone_contato}` : ''}
        </p>
      </div>
    `;

    // Rodapé padrão
    const rodape = `
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 10px;">
        <p style="margin: 0;">Documento gerado em: ${new Date().toLocaleString('pt-BR')}</p>
        <p style="margin: 5px 0 0 0;">Sistema VAGOU - Gestão de Vagas em ${plural}</p>
      </div>
    `;

    // Resumo de filtros aplicados
    const filtrosAplicados = [];
    if (tipoFilter !== "all") filtrosAplicados.push(`Tipo: ${tipoFilter}`);
    if (usuarioFilter !== "all") {
      const usuario = usuarios?.find(u => u.id === usuarioFilter);
      filtrosAplicados.push(`Usuário: ${usuario?.nome_completo || usuario?.email || usuarioFilter}`);
    }
    if (cmeiFilter !== "all") {
      const cmei = cmeis?.find(c => c.id === cmeiFilter);
      filtrosAplicados.push(`${singular}: ${cmei?.nome || cmeiFilter}`);
    }
    if (dataInicio) filtrosAplicados.push(`De: ${format(parseISO(dataInicio), "dd/MM/yyyy")}`);
    if (dataFim) filtrosAplicados.push(`Até: ${format(parseISO(dataFim), "dd/MM/yyyy")}`);

    const logsParaExportar = filteredLogs.slice(0, 200);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 15px; color: #1a1a1a;">
        ${cabecalho}

        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="color: #1351B4; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            Relatório de Logs do Sistema
          </h3>
          <p style="color: #64748b; margin: 0; font-size: 11px;">
            ${filteredLogs.length} registro(s) encontrado(s)
          </p>
        </div>

        ${filtrosAplicados.length > 0 ? `
          <div style="background: #f8fafc; padding: 10px 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #1351B4;">
            <p style="margin: 0; font-size: 10px; color: #64748b;">
              <strong>Filtros aplicados:</strong> ${filtrosAplicados.join(' • ')}
            </p>
          </div>
        ` : ''}

        <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 100px; background: #f8fafc; padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #e2e8f0;">
            <div style="font-size: 20px; font-weight: bold; color: #1351B4;">${stats.total}</div>
            <div style="font-size: 9px; color: #64748b;">Total de Logs</div>
          </div>
          <div style="flex: 1; min-width: 100px; background: #fefce8; padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #fef08a;">
            <div style="font-size: 20px; font-weight: bold; color: #ca8a04;">${stats.convocacoes}</div>
            <div style="font-size: 9px; color: #64748b;">Convocações</div>
          </div>
          <div style="flex: 1; min-width: 100px; background: #f0fdf4; padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #bbf7d0;">
            <div style="font-size: 20px; font-weight: bold; color: #22c55e;">${stats.matriculas}</div>
            <div style="font-size: 9px; color: #64748b;">Matrículas</div>
          </div>
          <div style="flex: 1; min-width: 100px; background: #eff6ff; padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #bfdbfe;">
            <div style="font-size: 20px; font-weight: bold; color: #3b82f6;">${stats.inscricoes}</div>
            <div style="font-size: 9px; color: #64748b;">Inscrições</div>
          </div>
        </div>

        <h4 style="color: #1351B4; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px; font-size: 11px;">
          Detalhamento dos Logs ${logsParaExportar.length < filteredLogs.length ? `(primeiros ${logsParaExportar.length} de ${filteredLogs.length})` : ''}
        </h4>

        <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
          <thead>
            <tr style="background: #1351B4; color: white;">
              <th style="padding: 8px 6px; text-align: left; border: 1px solid #0d3d8a;">Data/Hora</th>
              <th style="padding: 8px 6px; text-align: left; border: 1px solid #0d3d8a;">Ação</th>
              <th style="padding: 8px 6px; text-align: left; border: 1px solid #0d3d8a;">Criança</th>
              <th style="padding: 8px 6px; text-align: left; border: 1px solid #0d3d8a;">Usuário</th>
              <th style="padding: 8px 6px; text-align: center; border: 1px solid #0d3d8a;">Status</th>
              <th style="padding: 8px 6px; text-align: left; border: 1px solid #0d3d8a;">Descrição</th>
            </tr>
          </thead>
          <tbody>
            ${logsParaExportar.map((log, i) => `
              <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                <td style="padding: 6px; border: 1px solid #e2e8f0; white-space: nowrap;">${format(new Date(log.created_at!), "dd/MM/yy HH:mm")}</td>
                <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: 500;">${formatAcaoLabel(log.acao)}</td>
                <td style="padding: 6px; border: 1px solid #e2e8f0;">${log.crianca?.nome || "-"}</td>
                <td style="padding: 6px; border: 1px solid #e2e8f0; font-size: 7px;">${(log.usuario as any)?.nome_completo || (log.usuario as any)?.email || "-"}</td>
                <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center; font-size: 7px;">
                  ${log.status_anterior && log.status_novo 
                    ? `<span style="color: #64748b;">${log.status_anterior}</span> → <span style="color: #1351B4; font-weight: 600;">${log.status_novo}</span>` 
                    : log.status_novo || "-"}
                </td>
                <td style="padding: 6px; border: 1px solid #e2e8f0; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${log.descricao || "-"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        ${rodape}
      </div>
    `;

    const container = document.createElement("div");
    container.innerHTML = htmlContent;
    container.style.width = "297mm";
    container.style.padding = "10mm";

    html2pdf()
      .set({
        margin: 5,
        filename: `logs_sistema_${format(new Date(), "yyyy-MM-dd_HHmm")}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      })
      .from(container)
      .save();
  };

  const stats = {
    total: logs?.length || 0,
    convocacoes: logs?.filter((l) => l.acao.includes("Convocação") || l.acao.includes("Convocado")).length || 0,
    matriculas: logs?.filter((l) => l.acao.includes("Matrícula") || l.acao.includes("Confirmada")).length || 0,
    inscricoes: logs?.filter((l) => l.acao.includes("Inscrição")).length || 0,
  };

  const handleTabChange = (value: string) => {
    setTab(value as typeof tab);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const viewport = logsScrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null;
    viewport?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold">Logs do Sistema</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Acompanhe todas as atividades e eventos do sistema
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground whitespace-nowrap self-center">
              Atualizado às {format(new Date(lastUpdatedAt), "HH:mm", { locale: ptBR })}
            </span>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefetching}>
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""} md:mr-2`} />
              <span className="hidden md:inline">Atualizar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!filteredLogs.length}>
              <Download className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">CSV</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!filteredLogs.length}>
              <FileText className="h-4 w-4 md:mr-2" />
              PDF
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="logs" className="gap-2">
              <Activity className="h-4 w-4" />
              Logs do Sistema
            </TabsTrigger>
            <TabsTrigger value="notificacoes" className="gap-2">
              <WhatsAppIcon className="h-4 w-4 fill-current" />
              Notificações WhatsApp
            </TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-4 mt-4">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total de Logs", value: stats.total, icon: <Activity className="h-4 w-4 text-muted-foreground" />, accent: "border-l-muted-foreground/40" },
                { label: "Convocações", value: stats.convocacoes, icon: <AlertCircle className="h-4 w-4 text-yellow-500" />, accent: "border-l-yellow-500" },
                { label: "Matrículas", value: stats.matriculas, icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, accent: "border-l-green-500" },
                { label: "Inscrições", value: stats.inscricoes, icon: <Info className="h-4 w-4 text-blue-500" />, accent: "border-l-blue-500" },
              ].map((s) => (
                <Card key={s.label} className={`border-l-4 ${s.accent}`}>
                  <CardContent className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                      {isLoading ? <Skeleton className="h-6 w-12 mt-0.5" /> : <div className="text-xl font-bold leading-tight">{s.value}</div>}
                    </div>
                    {s.icon}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filters and Logs */}
            <Card>
              <CardContent className="space-y-3 pt-4">

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div className="relative sm:col-span-2 lg:col-span-1">
                    {isSearching ? (
                      <Spinner className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
                    ) : (
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    )}
                    <Input
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); handleFilterChange(); }}
                      className="pl-10"
                    />
                  </div>

                  <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v); handleFilterChange(); }}>
                    <SelectTrigger>
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Tipos</SelectItem>
                      <SelectItem value="convocacao">Convocações</SelectItem>
                      <SelectItem value="matricula">Matrículas</SelectItem>
                      <SelectItem value="inscricao">Inscrições</SelectItem>
                      <SelectItem value="recusa">Recusas/Desistências</SelectItem>
                      <SelectItem value="remanejamento">Remanejamentos</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={usuarioFilter} onValueChange={(v) => { setUsuarioFilter(v); handleFilterChange(); }}>
                    <SelectTrigger>
                      <User className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Usuários</SelectItem>
                      {usuarios?.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.nome_completo || u.email || "Sem nome"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={cmeiFilter} onValueChange={(v) => { setCmeiFilter(v); handleFilterChange(); }}>
                    <SelectTrigger>
                      <Building2 className="mr-2 h-4 w-4" />
                      <SelectValue placeholder={singular} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{plural} (todas)</SelectItem>
                      {cmeis?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => { setDataInicio(e.target.value); handleFilterChange(); }}
                    title="Data Início"
                  />

                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => { setDataFim(e.target.value); handleFilterChange(); }}
                    title="Data Fim"
                  />
                </div>

                {(searchTerm || tipoFilter !== "all" || usuarioFilter !== "all" || cmeiFilter !== "all" || dataInicio || dataFim) && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {filteredLogs.length} resultado(s) encontrado(s)
                    </span>
                    <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                      Limpar filtros
                    </Button>
                  </div>
                )}

                {/* Logs List */}
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : (
                  <ScrollArea ref={logsScrollAreaRef} className="h-[560px] pr-3">
                    <div className="space-y-1.5">
                      {paginatedLogs.map((log) => (
                        <div
                          key={log.id}
                          className="border rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 shrink-0">{getLogIcon(log.acao)}</div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-medium text-sm truncate">{formatAcaoLabel(log.acao)}</h4>
                                <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                                  {format(new Date(log.created_at!), "dd/MM/yy HH:mm", { locale: ptBR })}
                                </span>
                              </div>

                              {log.crianca && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {log.crianca.nome}
                                  {log.crianca.responsavel_nome && <span> · Resp: {log.crianca.responsavel_nome}</span>}
                                </p>
                              )}

                              {log.descricao && (
                                <p className="text-xs text-foreground/80 truncate">{log.descricao}</p>
                              )}

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground">
                                {(log.usuario as any)?.nome_completo && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {(log.usuario as any).nome_completo}
                                  </span>
                                )}
                                {log.status_anterior && log.status_novo && (
                                  <span className="flex items-center gap-1">
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">{log.status_anterior}</Badge>
                                    →
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">{log.status_novo}</Badge>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {paginatedLogs.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Activity className="mx-auto h-12 w-12 mb-4 opacity-50" />
                          <p>Nenhum log encontrado com os filtros aplicados.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t pt-4">
                    <p className="text-sm text-muted-foreground">
                      Exibindo {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} de {filteredLogs.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                      </Button>
                      <span className="text-sm px-2">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Próximo
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notificacoes" className="mt-6">
            <NotificacoesMonitor />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Logs;


