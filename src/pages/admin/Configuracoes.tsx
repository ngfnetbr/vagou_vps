import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGate, useCanAccess, PERMISSIONS } from "@/components/admin/PermissionGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PasswordInput } from "@/components/ui/password-input";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useConfiguracoesSistema, useUpdateConfiguracoes } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";
import { useTurmasBase } from "@/hooks/api/turmas-base-hooks";
import { useAllCriancas } from "@/hooks/api/criancas-hooks";
import { TurmaBaseDialog } from "@/components/admin/TurmaBaseDialog";
import { BrasaoUpload } from "@/components/admin/BrasaoUpload";
import { exportarCriancasExcel, gerarModeloImportacaoCriancasExcel, gerarModeloTurmasExcel, parseExcel } from "@/utils/excel-utils";
import { useImportarCriancas, useImportarTurmas, type ImportResult } from "@/hooks/api/import-hooks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Save, Settings2, Bell, MessageSquare, Mail, Smartphone, Download, Upload, FileText, Plus, Edit, Users, AlertCircle, Database, Trash2, CheckCircle2, Lock, Globe, MapPin, Hash, Copy, ExternalLink, QrCode, Clock, Workflow, FormInput, Star, Palette, Map, Video, Building2, CalendarDays, CreditCard, Info, Sun, Moon, Laptop, Ruler, Table2, LayoutList } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AppIconUpload } from "@/components/admin/AppIconUpload";
import { EmailPreview } from "@/components/admin/EmailPreview";
import { ModuleAccessSettings } from "@/components/admin/ModuleAccessSettings";
import { DocumentosTiposConfig } from "@/components/admin/DocumentosTiposConfig";
import TiposPrioridadeManager from "@/components/admin/TiposPrioridadeManager";
import { ZonasAtendimentoManager } from "@/components/admin/ZonasAtendimentoManager";
import { CmeiZonasManager } from "@/components/admin/CmeiZonasManager";
import { ZoneamentoPendenciasManager } from "@/components/admin/ZoneamentoPendenciasManager";
import { TemplatesManager } from "@/components/admin/TemplatesManager";
import { MotivosPadraoManager } from "@/components/admin/MotivosPadraoManager";
import { CamposInscricaoEditor } from "@/components/admin/CamposInscricaoEditor";
import { RequerimentoSereTemplateConfigCard } from "@/components/admin/RequerimentoSereTemplateConfig";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCursosAdmin, useCriarAula, useAulas, useAtualizarAula, useExcluirAula, useModulos, useCriarModulo, useAtualizarModulo, useExcluirModulo } from "@/hooks/api/cursos-hooks";
import { useInstalarPrioridadesFederais } from "@/hooks/api/prioridades-hooks";
import { useCamposInscricao } from "@/hooks/api/campos-inscricao-hooks";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";

const configuracoesSchema = z.object({
  nome_municipio: z.string().min(1, "Nome do município é obrigatório").max(100),
  nome_secretaria: z.string().min(1, "Nome da secretaria é obrigatório").max(200),
  email_contato: z.string().email("Email inválido").max(255).optional().or(z.literal("")),
  telefone_contato: z.string().max(20).optional().or(z.literal("")),
  data_inicio_inscricao: z.string().optional().nullable(),
  data_fim_inscricao: z.string().optional().nullable(),
  prazo_resposta_dias: z.number().min(1, "Prazo deve ser no mínimo 1 dia").max(90, "Prazo deve ser no máximo 90 dias"),
  notificacao_email: z.boolean(),
  notificacao_sms: z.boolean(),
  notificacao_whatsapp: z.boolean(),
  brasao_url: z.string().url("URL inválida").optional().or(z.literal("")),
  webhook_url_notificacao: z.string().url("URL inválida").optional().or(z.literal("")),
  webhook_url_notificacao_email: z.string().url("URL inválida").optional().or(z.literal("")),
  webhook_url_notificacao_sms: z.string().url("URL inválida").optional().or(z.literal("")),
  autenticacao_publica: z.boolean(),
  limite_inscricoes_responsavel: z.number().min(1, "Mínimo 1").max(20, "Máximo 20"),
  validar_cep: z.boolean(),
  ceps_permitidos: z.string().optional().or(z.literal("")),
});

type ConfiguracoesForm = z.infer<typeof configuracoesSchema>;

// Mantém compatibilidade, curso único (Vagou EaD)
const CursoCrudPanel = () => null;

const TAB_LOCK_PIN = "1234";
const LOCKED_TABS = new Set([
  "email",
  "mensagens",
  "workflow",
  "formulario",
  "documentos",
  "importar",
  "turmas",
  "acesso",
]);

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const Configuracoes = () => {
  const { data: config, isLoading } = useConfiguracoesSistema();
  const { singular, plural } = getUnidadeLabels(config as any);
  const updateMutation = useUpdateConfiguracoes();
  const instalarPrioridadesFederais = useInstalarPrioridadesFederais();
  const { data: turmasBase, isLoading: turmasLoading } = useTurmasBase();
  const { data: criancas } = useAllCriancas({});
  const { userRoles } = useAuth();
  
  // Permission checks
  const canEditByPermission = useCanAccess(PERMISSIONS.CONFIGURACOES_EDITAR);
  const canEdit =
    canEditByPermission ||
    userRoles.includes("admin") ||
    userRoles.includes("superadmin") ||
    userRoles.includes("gestor");
  
  const [selectedTurmaBase, setSelectedTurmaBase] = useState<any>(null);
  const [turmaDialogOpen, setTurmaDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const turmaFileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [permitirImportacaoIncompleta, setPermitirImportacaoIncompleta] = useState(false);
  
  // Hooks de importação
  const importarCriancas = useImportarCriancas();
  const importarTurmas = useImportarTurmas();
  const { data: camposInscricaoAtivos } = useCamposInscricao();

  // Estados para ferramentas de desenvolvimento
  const [gerandoDados, setGerandoDados] = useState(false);
  const [limpandoDados, setLimpandoDados] = useState(false);
  const [confirmarGerarDialog, setConfirmarGerarDialog] = useState(false);
  const [confirmarLimparDialog, setConfirmarLimparDialog] = useState(false);
  const [excluindoCriancas, setExcluindoCriancas] = useState(false);
  const [confirmarExcluirCriancasDialog, setConfirmarExcluirCriancasDialog] = useState(false);
  const [recalculandoFila, setRecalculandoFila] = useState(false);
  const [selectedDeleteOption, setSelectedDeleteOption] = useState<'' | 'cmeis' | 'turmas' | 'criancas' | 'historico' | 'logs'>('');
  const [confirmarExcluirEspecificoDialog, setConfirmarExcluirEspecificoDialog] = useState(false);
  const [excluindoEspecifico, setExcluindoEspecifico] = useState(false);

  const [pendingConfigUpdates, setPendingConfigUpdates] = useState<Record<string, any>>({});

  const effectiveConfigValue = <T,>(key: string, fallback: T): T => {
    if (Object.prototype.hasOwnProperty.call(pendingConfigUpdates, key)) {
      return pendingConfigUpdates[key] as T;
    }
    return (((config as any)?.[key] ?? fallback) as T);
  };

  // Estados locais para campos de apps (evita salvar a cada caractere)
  const [appFields, setAppFields] = useState({
    app_nome: "",
    app_id: "",
    app_android_url: "",
    app_playstore_url: "",
    app_ios_url: "",
    app_appstore_url: "",
  });

  // Estados locais para campos de endereço
  const [enderecoFields, setEnderecoFields] = useState({
    endereco_secretaria: "",
    endereco_latitude: "",
    endereco_longitude: "",
  });

  // Estados locais para campos de interface (evita salvar a cada caractere)
  const [interfaceFields, setInterfaceFields] = useState({
    tema_cor_primaria: "#1351B4",
    tema_cor_secundaria: "#1351B4",
    tema_sidebar_gradiente_ativo: false,
    tema_sidebar_gradiente_inicio: "#1351B4",
    tema_sidebar_gradiente_fim: "#1351B4",
    sistema_nome: "VAGOU",
    unidade_singular: singular,
    unidade_plural: plural,
  });

  // Estados locais para campos numéricos de prazos
  const [prazoFields, setPrazoFields] = useState({
    prazo_assinatura_dias: 7,
    dias_antecedencia_lembrete: 3,
    idade_minima_meses: 6,
    idade_maxima_anos: 3,
  });

  // Estado local para mensagem de idade fora da faixa
  const [mensagemIdadeFora, setMensagemIdadeFora] = useState("");

  // Estados locais para campos de operação (evita salvar a cada caractere)
  const [operacaoFields, setOperacaoFields] = useState({
    mensagem_manutencao: "",
    motivo_bloqueio_inscricoes: "",
  });

  // Estados locais para campos de SMTP
  const [smtpFields, setSmtpFields] = useState({
    smtp_host: "",
    smtp_port: 587,
    smtp_user: "",
    smtp_password: "",
    smtp_secure: false,
    smtp_sender_name: "",
    smtp_sender_email: "",
  });

  const [permissionError, setPermissionError] = useState(false);
  const didHydrateLocal = useRef(false);
  const didHydrateForm = useRef(false);

  const applyConfigToLocalState = useCallback((cfg: any) => {
    setPendingConfigUpdates({});
    setPermissionError(false);
    setAppFields({
      app_nome: cfg?.app_nome || "VAGOU",
      app_id: cfg?.app_id || "app.lovable.vagou",
      app_android_url: cfg?.app_android_url || "",
      app_playstore_url: cfg?.app_playstore_url || "",
      app_ios_url: cfg?.app_ios_url || "",
      app_appstore_url: cfg?.app_appstore_url || "",
    });
    setEnderecoFields({
      endereco_secretaria: cfg?.endereco_secretaria || "",
      endereco_latitude: cfg?.endereco_latitude?.toString() || "",
      endereco_longitude: cfg?.endereco_longitude?.toString() || "",
    });
    setInterfaceFields({
      tema_cor_primaria: cfg?.tema_cor_primaria || "#1351B4",
      tema_cor_secundaria: cfg?.tema_cor_secundaria || "#1351B4",
      tema_sidebar_gradiente_ativo: cfg?.tema_sidebar_gradiente_ativo ?? false,
      tema_sidebar_gradiente_inicio: cfg?.tema_sidebar_gradiente_inicio || cfg?.tema_cor_primaria || "#1351B4",
      tema_sidebar_gradiente_fim: cfg?.tema_sidebar_gradiente_fim || cfg?.tema_cor_secundaria || "#1351B4",
      sistema_nome: cfg?.sistema_nome || "VAGOU",
      unidade_singular: cfg?.unidade_singular || singular,
      unidade_plural: cfg?.unidade_plural || plural,
    });
    setPrazoFields({
      prazo_assinatura_dias: cfg?.prazo_assinatura_dias ?? 7,
      dias_antecedencia_lembrete: cfg?.dias_antecedencia_lembrete ?? 3,
      idade_minima_meses: cfg?.idade_minima_meses ?? 6,
      idade_maxima_anos: cfg?.idade_maxima_anos ?? 3,
    });
    setMensagemIdadeFora(
      cfg?.mensagem_idade_fora_faixa ||
        "A criança informada está fora da faixa etária permitida para inscrição. Por favor, procure a Secretaria de Educação para mais informações."
    );
    setOperacaoFields({
      mensagem_manutencao: cfg?.mensagem_manutencao || "",
      motivo_bloqueio_inscricoes: cfg?.motivo_bloqueio_inscricoes || "",
    });
    setSmtpFields({
      smtp_host: cfg?.smtp_host || "",
      smtp_port: cfg?.smtp_port || 587,
      smtp_user: cfg?.smtp_user || "",
      smtp_password: cfg?.smtp_password || "",
      smtp_secure: cfg?.smtp_secure || false,
      smtp_sender_name: cfg?.smtp_sender_name || "",
      smtp_sender_email: cfg?.smtp_sender_email || "",
    });
  }, [plural, singular]);

  const { data: cursosAdmin = [], isFetched: cursosAdminFetched, refetch: refetchCursosAdmin } = useCursosAdmin();
  const cursoVagou = cursosAdmin.find((c: any) => c.titulo === "Vagou EaD" || c.titulo === "Curso Vagou") || cursosAdmin[0] || null;
  const cursoVagouId = cursoVagou?.id || null;
  const { data: aulasSelecionado = [] } = useAulas(cursoVagouId);
  const { data: modulos = [] } = useModulos(cursoVagouId);
  const criarAulaVagou = useCriarAula();
  const atualizarAula = useAtualizarAula();
  const excluirAula = useExcluirAula();
  const criarModulo = useCriarModulo();
  const atualizarModulo = useAtualizarModulo();
  const excluirModulo = useExcluirModulo();
  const [editOpen, setEditOpen] = useState(false);
  const [editAula, setEditAula] = useState<any | null>(null);
  const editVideoRef = useRef<HTMLInputElement>(null);
  const editThumbRef = useRef<HTMLInputElement>(null);
  const [novoModuloTitulo, setNovoModuloTitulo] = useState("");
  const [dragAulaId, setDragAulaId] = useState<string | null>(null);
  const [tituloAulaVagou, setTituloAulaVagou] = useState("");
  const [descAulaVagou, setDescAulaVagou] = useState("");
  const [ordemAulaVagou, setOrdemAulaVagou] = useState("0");
  const [novoAulaModuloId, setNovoAulaModuloId] = useState<string | null>(null);
  const [novoAulaRequisitoId, setNovoAulaRequisitoId] = useState<string | null>(null);
  const [novoAulaPercentualMinimo, setNovoAulaPercentualMinimo] = useState<number>(0);
  const [previewAulaVagou, setPreviewAulaVagou] = useState("false");
  const fileRefVagou = useRef<HTMLInputElement>(null);
  const thumbRefVagou = useRef<HTMLInputElement>(null);
  const uploadingAulaVagou = useRef(false);
  const [metUsuariosTotal, setMetUsuariosTotal] = useState(0);
  const [metUsuariosConcluiram, setMetUsuariosConcluiram] = useState(0);
  const [metTaxaConclusao, setMetTaxaConclusao] = useState(0);
  const [metTempoMedio, setMetTempoMedio] = useState(0);
  

  useEffect(() => {
    (async () => {
      if (!cursoVagouId) return;
      const { data: aulasCurso } = await (supabase as any)
        .from("aulas")
        .select("id, modulo_id, duracao_segundos")
        .eq("curso_id", cursoVagouId);
      const ids = (aulasCurso || []).map((a: any) => a.id);
      if (ids.length === 0) {
        setMetUsuariosTotal(0);
        setMetUsuariosConcluiram(0);
        setMetTaxaConclusao(0);
        setMetTempoMedio(0);
        return;
      }
      const { data: progresso } = await (supabase as any)
        .from("aulas_progresso")
        .select("user_id,aula_id,concluido,progresso_segundos,updated_at")
        .in("aula_id", ids);
      const usuarios = Array.from(new Set((progresso || []).map((p: any) => p.user_id))) as string[];
      const usuariosTotal = usuarios.length;
      let usuariosConcluiram = 0;
      const progressoByUser: Record<string, any[]> = {};
      for (const p of progresso || []) {
        if (!progressoByUser[p.user_id]) progressoByUser[p.user_id] = [];
        progressoByUser[p.user_id].push(p);
      }
      for (const u of usuarios) {
        const arr = progressoByUser[u] || [];
        const concluidas = new Set(arr.filter((x) => x.concluido).map((x) => x.aula_id));
        if (concluidas.size === ids.length) usuariosConcluiram += 1;
      }
      let somaTempo = 0;
      let contTempo = 0;
      for (const p of progresso || []) {
        somaTempo += p.progresso_segundos || 0;
        contTempo += 1;
      }
      const tempoMedio = contTempo > 0 ? Math.round(somaTempo / contTempo) : 0;
      setMetUsuariosTotal(usuariosTotal);
      setMetUsuariosConcluiram(usuariosConcluiram);
      setMetTaxaConclusao(usuariosTotal > 0 ? Math.round((usuariosConcluiram / usuariosTotal) * 100) : 0);
      setMetTempoMedio(tempoMedio);
    })();
  }, [cursoVagouId]);

  // Sincroniza estado local quando config carrega
  useEffect(() => {
    if (!config) return;
    if (didHydrateLocal.current) return;
    applyConfigToLocalState(config as any);
    didHydrateLocal.current = true;
  }, [config, plural, singular]);

  const isSuperAdmin = userRoles.includes('superadmin');
  const canEditSystemColors = canEdit && isSuperAdmin;
  const [activeTab, setActiveTab] = useState<string>("geral");
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [unlockedTabs, setUnlockedTabs] = useState<Record<string, true>>({});

  const isTabLocked = (tab: string) => {
    if (isSuperAdmin) return false;
    return LOCKED_TABS.has(tab) && !unlockedTabs[tab];
  };

  const handleTabChange = (nextTab: string) => {
    if (isTabLocked(nextTab)) {
      setPendingTab(nextTab);
      setPinValue("");
      setPinDialogOpen(true);
      return;
    }
    setActiveTab(nextTab);
  };

  const handleConfirmPin = () => {
    if (!pendingTab) {
      setPinDialogOpen(false);
      return;
    }

    if (pinValue !== TAB_LOCK_PIN) {
      toast.error("Senha inválida.");
      setPinValue("");
      return;
    }

    setUnlockedTabs((prev) => ({ ...prev, [pendingTab]: true as const }));

    setActiveTab(pendingTab);
    setPendingTab(null);
    setPinDialogOpen(false);
    setPinValue("");
    toast.success("Acesso liberado.");
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
    reset,
  } = useForm<ConfiguracoesForm>({
    resolver: zodResolver(configuracoesSchema),
    defaultValues: {
      nome_municipio: "",
      nome_secretaria: "",
      email_contato: "",
      telefone_contato: "",
      prazo_resposta_dias: 15,
      notificacao_email: true,
      notificacao_sms: false,
      notificacao_whatsapp: false,
      brasao_url: "",
      webhook_url_notificacao: "",
      webhook_url_notificacao_email: "",
      webhook_url_notificacao_sms: "",
      autenticacao_publica: false,
      limite_inscricoes_responsavel: 5,
      validar_cep: false,
      ceps_permitidos: "",
    },
  });

  const dataInicio = watch("data_inicio_inscricao");
  const dataFim = watch("data_fim_inscricao");

  useEffect(() => {
    if (!config) return;
    if (didHydrateForm.current) return;
    reset({
      nome_municipio: config.nome_municipio || "",
      nome_secretaria: config.nome_secretaria || "",
      email_contato: config.email_contato || "",
      telefone_contato: config.telefone_contato || "",
      data_inicio_inscricao: config.data_inicio_inscricao || undefined,
      data_fim_inscricao: config.data_fim_inscricao || undefined,
      prazo_resposta_dias: config.prazo_resposta_dias || 15,
      notificacao_email: config.notificacao_email ?? true,
      notificacao_sms: config.notificacao_sms ?? false,
      notificacao_whatsapp: config.notificacao_whatsapp ?? false,
      brasao_url: config.brasao_url || "",
      webhook_url_notificacao: config.webhook_url_notificacao || "",
      webhook_url_notificacao_email: (config as any).webhook_url_notificacao_email || "",
      webhook_url_notificacao_sms: (config as any).webhook_url_notificacao_sms || "",
      autenticacao_publica: config.autenticacao_publica ?? false,
      limite_inscricoes_responsavel: (config as any).limite_inscricoes_responsavel ?? 5,
      validar_cep: (config as any).validar_cep ?? false,
      ceps_permitidos: ((config as any).ceps_permitidos || []).join(", "),
    });
    didHydrateForm.current = true;
  }, [config, reset]);

  useEffect(() => {
    // garante que sempre exista Curso Vagou
    (async () => {
      if (!cursosAdminFetched) return;
      if (!cursoVagou) {
        try {
          const { error } = await (supabase as any).from("cursos").insert({ titulo: "Vagou EaD", publicado: true });
          if (error) throw error;
          await refetchCursosAdmin();
        } catch (e) {
          const msg = typeof e === "object" && e && "message" in e ? String((e as any).message) : "desconhecido";
          toast.error(`Não foi possível criar o curso base do Vagou EaD: ${msg}`);
        }
      }
    })();
  }, [cursosAdminFetched, cursoVagou, refetchCursosAdmin]);

  const handleUploadAulaVagou = async () => {
    if (!cursoVagouId) {
      toast.error("Curso não encontrado");
      return;
    }
    if (!tituloAulaVagou.trim()) {
      toast.error("Informe um título para a aula");
      return;
    }
    if (!fileRefVagou.current || !fileRefVagou.current.files || fileRefVagou.current.files.length === 0) {
      toast.error("Selecione um arquivo de vídeo");
      return;
    }
    const file = fileRefVagou.current.files[0];
    const ext = file.name.split(".").pop() || "mp4";
    const aulaId = crypto.randomUUID();
    const path = `${cursoVagouId}/${aulaId}.${ext}`;
    try {
      uploadingAulaVagou.current = true;
      const { error: upErr } = await supabase.storage.from("course-videos").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;
      let thumbnailUrl: string | null = null;
      const thumbFile = thumbRefVagou.current?.files?.[0];
      if (thumbFile) {
        const ext2 = thumbFile.name.split(".").pop() || "jpg";
        const thumbPath = `course-thumbs/${cursoVagouId}/${aulaId}.${ext2}`;
        const upThumb = await supabase.storage.from("assets").upload(thumbPath, thumbFile, { upsert: true });
        if (!upThumb.error) {
          const pub = supabase.storage.from("assets").getPublicUrl(thumbPath);
          thumbnailUrl = pub.data.publicUrl;
        }
      }
      await criarAulaVagou.mutateAsync({
        id: aulaId,
        curso_id: cursoVagouId,
        modulo_id: novoAulaModuloId ?? null,
        requisito_aula_id: novoAulaRequisitoId ?? null,
        percentual_minimo: novoAulaRequisitoId ? Math.max(0, Math.min(100, novoAulaPercentualMinimo)) : 0,
        titulo: tituloAulaVagou.trim(),
        descricao: descAulaVagou.trim() || null,
        thumbnail_url: thumbnailUrl,
        video_path: path,
        ordem: parseInt(ordemAulaVagou || "0", 10),
        preview: previewAulaVagou === "true",
      } as any);
      if (fileRefVagou.current) fileRefVagou.current.value = "";
      if (thumbRefVagou.current) thumbRefVagou.current.value = "";
      setTituloAulaVagou("");
      setDescAulaVagou("");
      setOrdemAulaVagou("0");
      setPreviewAulaVagou("false");
      setNovoAulaModuloId(null);
      setNovoAulaRequisitoId(null);
      setNovoAulaPercentualMinimo(0);
    } catch (e: any) {
      toast.error("Falha no upload/criação da aula");
    } finally {
      uploadingAulaVagou.current = false;
    }
  };

  const onSubmit = (data: ConfiguracoesForm) => {
    // Converte a string de CEPs para array
    const cepsArray = data.ceps_permitidos
      ? data.ceps_permitidos.split(",").map(cep => cep.trim().replace(/\D/g, "")).filter(Boolean)
      : [];

    const lat = enderecoFields.endereco_latitude ? parseFloat(enderecoFields.endereco_latitude) : null;
    if (lat != null && (Number.isNaN(lat) || lat < -90 || lat > 90)) {
      toast.error("Latitude inválida. Use um valor entre -90 e 90.");
      return;
    }

    const lon = enderecoFields.endereco_longitude ? parseFloat(enderecoFields.endereco_longitude) : null;
    if (lon != null && (Number.isNaN(lon) || lon < -180 || lon > 180)) {
      toast.error("Longitude inválida. Use um valor entre -180 e 180.");
      return;
    }

    updateMutation.mutate(
      {
        ...pendingConfigUpdates,
        ...data,
        email_contato: data.email_contato || null,
        telefone_contato: data.telefone_contato || null,
        brasao_url: data.brasao_url || null,
        webhook_url_notificacao: data.webhook_url_notificacao || null,
        webhook_url_notificacao_email: (data as any).webhook_url_notificacao_email || null,
        webhook_url_notificacao_sms: (data as any).webhook_url_notificacao_sms || null,
        ceps_permitidos: cepsArray,
        ...appFields,
        ...operacaoFields,
        ...interfaceFields,
        ...smtpFields,
        mensagem_idade_fora_faixa: mensagemIdadeFora || null,
        prazo_assinatura_dias: clampNumber(prazoFields.prazo_assinatura_dias, 1, 30),
        dias_antecedencia_lembrete: clampNumber(prazoFields.dias_antecedencia_lembrete, 1, 15),
        idade_minima_meses: clampNumber(prazoFields.idade_minima_meses, 0, 24),
        idade_maxima_anos: clampNumber(prazoFields.idade_maxima_anos, 1, 6),
        endereco_secretaria: enderecoFields.endereco_secretaria || null,
        endereco_latitude: lat,
        endereco_longitude: lon,
      } as any,
      {
        onSuccess: () => {
          setPendingConfigUpdates({});
          reset({
            ...data,
            ceps_permitidos: data.ceps_permitidos || "",
          });
        },
        onError: (error) => {
          const msg = (error as any)?.message || "";
          if (msg.includes("permissão") || msg.includes("permission") || msg.includes("policy")) {
            setPermissionError(true);
          }
        },
      }
    );
  };

  const hasPendingChanges = useMemo(() => {
    if (!config) return false;
    if (Object.keys(pendingConfigUpdates).length > 0) return true;

    const cfg: any = config as any;

    const appDirty =
      appFields.app_nome !== (cfg?.app_nome || "VAGOU") ||
      appFields.app_id !== (cfg?.app_id || "app.lovable.vagou") ||
      appFields.app_android_url !== (cfg?.app_android_url || "") ||
      appFields.app_playstore_url !== (cfg?.app_playstore_url || "") ||
      appFields.app_ios_url !== (cfg?.app_ios_url || "") ||
      appFields.app_appstore_url !== (cfg?.app_appstore_url || "");
    if (appDirty) return true;

    const operacaoDirty =
      operacaoFields.mensagem_manutencao !== (cfg?.mensagem_manutencao || "") ||
      operacaoFields.motivo_bloqueio_inscricoes !== (cfg?.motivo_bloqueio_inscricoes || "");
    if (operacaoDirty) return true;

    const interfaceDirty =
      interfaceFields.tema_cor_primaria !== (cfg?.tema_cor_primaria || "#1351B4") ||
      interfaceFields.tema_cor_secundaria !== (cfg?.tema_cor_secundaria || "#1351B4") ||
      interfaceFields.tema_sidebar_gradiente_ativo !== (cfg?.tema_sidebar_gradiente_ativo ?? false) ||
      interfaceFields.tema_sidebar_gradiente_inicio !== (cfg?.tema_sidebar_gradiente_inicio || cfg?.tema_cor_primaria || "#1351B4") ||
      interfaceFields.tema_sidebar_gradiente_fim !== (cfg?.tema_sidebar_gradiente_fim || cfg?.tema_cor_secundaria || "#1351B4") ||
      interfaceFields.sistema_nome !== (cfg?.sistema_nome || "VAGOU") ||
      interfaceFields.unidade_singular !== (cfg?.unidade_singular || singular) ||
      interfaceFields.unidade_plural !== (cfg?.unidade_plural || plural);
    if (interfaceDirty) return true;

    const prazoDirty =
      prazoFields.prazo_assinatura_dias !== (cfg?.prazo_assinatura_dias ?? 7) ||
      prazoFields.dias_antecedencia_lembrete !== (cfg?.dias_antecedencia_lembrete ?? 3) ||
      prazoFields.idade_minima_meses !== (cfg?.idade_minima_meses ?? 6) ||
      prazoFields.idade_maxima_anos !== (cfg?.idade_maxima_anos ?? 3);
    if (prazoDirty) return true;

    const smtpDirty =
      smtpFields.smtp_host !== (cfg?.smtp_host || "") ||
      smtpFields.smtp_port !== (cfg?.smtp_port || 587) ||
      smtpFields.smtp_user !== (cfg?.smtp_user || "") ||
      smtpFields.smtp_password !== (cfg?.smtp_password || "") ||
      smtpFields.smtp_secure !== (cfg?.smtp_secure || false) ||
      smtpFields.smtp_sender_name !== (cfg?.smtp_sender_name || "") ||
      smtpFields.smtp_sender_email !== (cfg?.smtp_sender_email || "");
    if (smtpDirty) return true;

    const msgDirty =
      mensagemIdadeFora !==
      (cfg?.mensagem_idade_fora_faixa ||
        "A criança informada está fora da faixa etária permitida para inscrição. Por favor, procure a Secretaria de Educação para mais informações.");
    if (msgDirty) return true;

    const lat = enderecoFields.endereco_latitude ? parseFloat(enderecoFields.endereco_latitude) : null;
    const lon = enderecoFields.endereco_longitude ? parseFloat(enderecoFields.endereco_longitude) : null;
    const enderecoDirty =
      enderecoFields.endereco_secretaria !== (cfg?.endereco_secretaria || "") ||
      lat !== (cfg?.endereco_latitude ?? null) ||
      lon !== (cfg?.endereco_longitude ?? null);
    if (enderecoDirty) return true;

    return false;
  }, [
    appFields,
    config,
    enderecoFields,
    interfaceFields,
    mensagemIdadeFora,
    operacaoFields,
    pendingConfigUpdates,
    prazoFields,
    plural,
    singular,
    smtpFields,
  ]);

  const handleResetAll = () => {
    if (!config) {
      reset();
      return;
    }
    reset();
    applyConfigToLocalState(config as any);
  };

  const handleExportarBackup = async () => {
    try {
      if (!criancas || criancas.length === 0) {
        toast.error("Não há dados para exportar");
        return;
      }
      await exportarCriancasExcel(criancas, singular);
      toast.success("Backup exportado com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar backup");
      console.error(error);
    }
  };

  const handleImportarCriancasExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseExcel(file);
      
      if (rows.length < 2) {
        toast.error("Arquivo vazio ou inválido");
        return;
      }

      const [headers, ...dataRows] = rows;

      toast.info(`Processando ${dataRows.length} registros...`);
      
      const result = await importarCriancas.mutateAsync({
        headers,
        rows: dataRows,
        permitirDadosIncompletos: isSuperAdmin && permitirImportacaoIncompleta,
      });
      setImportResult(result);
      
    } catch (error) {
      toast.error("Erro ao processar arquivo");
      console.error(error);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImportarTurmasExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseExcel(file);
      
      if (rows.length < 2) {
        toast.error("Arquivo vazio ou inválido");
        return;
      }

      const [headers, ...dataRows] = rows;
      toast.info(`Processando ${dataRows.length} turmas...`);
      
      const result = await importarTurmas.mutateAsync({ headers, rows: dataRows });
      setImportResult(result);
      
    } catch (error) {
      toast.error("Erro ao processar arquivo");
      console.error(error);
    } finally {
      if (turmaFileInputRef.current) {
        turmaFileInputRef.current.value = "";
      }
    }
  };

  const handleEditTurmaBase = (turma: any) => {
    setSelectedTurmaBase(turma);
    setTurmaDialogOpen(true);
  };

  const handleNovaTurmaBase = () => {
    setSelectedTurmaBase(null);
    setTurmaDialogOpen(true);
  };

  const handleGerarDadosFicticios = async () => {
    setGerandoDados(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada');
        return;
      }

      let accessToken = session.access_token;
      try {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshed?.session?.access_token) {
          accessToken = refreshed.session.access_token;
        }
      } catch (e) {
        void e;
      }

      const { data, error } = await supabase.functions.invoke('gerar-dados-ficticios', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        const ctx = (error as any)?.context ?? null;
        const status = ctx?.response?.status;
        let rawBody: string | null = null;

        if (ctx?.response?.clone && typeof ctx.response.clone === "function") {
          try {
            rawBody = await ctx.response.clone().text();
          } catch (e) {
            void e;
          }
        }

        if (!rawBody && typeof ctx?.body === "string") {
          rawBody = ctx.body;
        }

        const parseMsg = (value: string | null) => {
          const trimmed = String(value || "").trim();
          if (!trimmed) return null;
          try {
            const parsed = JSON.parse(trimmed);
            return (
              parsed?.erro ||
              parsed?.error ||
              parsed?.message ||
              (typeof parsed === "string" ? parsed : null)
            );
          } catch (_) {
            return trimmed;
          }
        };

        const msg = parseMsg(rawBody);
        if (msg) {
          throw new Error(status ? `(${status}) ${msg}` : String(msg));
        }

        throw error;
      }

      if (data?.sucesso) {
        toast.success(
          `Dados fictícios criados com sucesso!\n` +
          `${plural}: ${data.dados.cmeis}\n` +
          `Turmas: ${data.dados.turmas}\n` +
          `Crianças: ${data.dados.criancas}\n` +
          `(${data.dados.matriculadas} matriculadas, ${data.dados.fila} na fila)`,
          { duration: 5000 }
        );
      } else {
        const codigo = (data as any)?.codigo ? ` [${String((data as any).codigo)}]` : "";
        const detalhes = (data as any)?.detalhes ? `\n${String((data as any).detalhes)}` : "";
        throw new Error(`${String((data as any)?.erro || 'Erro ao gerar dados')}${codigo}${detalhes}`);
      }
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error('Erro ao gerar dados fictícios: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setGerandoDados(false);
      setConfirmarGerarDialog(false);
    }
  };

  const handleLimparDados = async () => {
    setLimpandoDados(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada');
        return;
      }

      const { data, error } = await supabase.functions.invoke('limpar-dados', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.sucesso) {
        toast.success(
          `Dados limpos com sucesso!\n` +
          `${data.totalRegistrosDeletados} registros deletados.`,
          { duration: 5000 }
        );
      } else {
        toast.warning(
          `Limpeza concluída com avisos:\n${data?.mensagem || 'Verifique os logs'}`,
          { duration: 5000 }
        );
      }
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error('Erro ao limpar dados: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLimpandoDados(false);
      setConfirmarLimparDialog(false);
    }
  };

  const handleExcluirTodasCriancas = async () => {
    setExcluindoCriancas(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada');
        return;
      }
      let total = 0;
      const delHistorico = await supabase
        .from('historico')
        .delete({ count: 'exact' })
        .not('crianca_id', 'is', null)
        .select();
      if (delHistorico.error) throw delHistorico.error;
      total += delHistorico.count || 0;
      const delNotif = await supabase
        .from('notificacoes_log')
        .delete({ count: 'exact' })
        .not('crianca_id', 'is', null)
        .select();
      if (delNotif.error) throw delNotif.error;
      total += delNotif.count || 0;
      const delDocs = await supabase
        .from('documentos_crianca')
        .delete({ count: 'exact' })
        .not('crianca_id', 'is', null)
        .select();
      if (delDocs.error) throw delDocs.error;
      total += delDocs.count || 0;
      const delValores = await supabase
        .from('valores_campos_custom')
        .delete({ count: 'exact' })
        .not('crianca_id', 'is', null)
        .select();
      if (delValores.error) throw delValores.error;
      total += delValores.count || 0;
      const delPrioridades = await supabase
        .from('crianca_prioridades')
        .delete({ count: 'exact' })
        .not('crianca_id', 'is', null)
        .select();
      if (delPrioridades.error) throw delPrioridades.error;
      total += delPrioridades.count || 0;
      const delPlanej = await supabase
        .from('planejamento_transicao')
        .delete({ count: 'exact' })
        .not('crianca_id', 'is', null)
        .select();
      if (delPlanej.error) throw delPlanej.error;
      total += delPlanej.count || 0;
      const delChat = await supabase
        .from('chat_mensagens')
        .delete({ count: 'exact' })
        .not('crianca_id', 'is', null)
        .select();
      if (delChat.error) throw delChat.error;
      total += delChat.count || 0;
      const delCriancas = await supabase
        .from('criancas')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select();
      if (delCriancas.error) throw delCriancas.error;
      total += delCriancas.count || 0;
      toast.success(`Todas as crianças foram excluídas. Registros de crianças: ${delCriancas.count || 0}.`, { duration: 5000 });
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error('Erro ao excluir crianças: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setExcluindoCriancas(false);
      setConfirmarExcluirCriancasDialog(false);
    }
  };

  const handleExcluirTurmas = async () => {
    setExcluindoEspecifico(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada');
        return;
      }
      await supabase
        .from('criancas')
        .update({ turma_atual_id: null })
        .not('turma_atual_id', 'is', null);
      const { count, error } = await supabase
        .from('turmas')
        .delete({ count: 'exact' })
        .select();
      if (error) throw error;
      toast.success(`Turmas excluídas. Total: ${count || 0}.`, { duration: 5000 });
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error('Erro ao excluir turmas: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setExcluindoEspecifico(false);
      setConfirmarExcluirEspecificoDialog(false);
      setSelectedDeleteOption('');
    }
  };

  const handleExcluirCMEIs = async () => {
    setExcluindoEspecifico(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada');
        return;
      }
      await supabase
        .from('criancas')
        .update({ turma_atual_id: null, cmei_atual_id: null })
        .or('turma_atual_id.not.is.null,cmei_atual_id.not.is.null');
      await supabase
        .from('turmas')
        .delete()
        .select('id');
      const { count, error } = await supabase
        .from('cmeis')
        .delete({ count: 'exact' })
        .select();
      if (error) throw error;
      // Remover eventuais vínculos de diretores
      await supabase.from('diretor_cmei_vinculo').delete().select('id');
      toast.success(`${plural} e turmas vinculadas excluídos. ${plural}: ${count || 0}.`, { duration: 5000 });
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error(`Erro ao excluir ${plural}: ` + (error.message || 'Erro desconhecido'));
    } finally {
      setExcluindoEspecifico(false);
      setConfirmarExcluirEspecificoDialog(false);
      setSelectedDeleteOption('');
    }
  };

  const handleExcluirHistorico = async () => {
    setExcluindoEspecifico(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada');
        return;
      }
      const { count, error } = await supabase
        .from('historico')
        .delete({ count: 'exact' })
        .select();
      if (error) throw error;
      toast.success(`Histórico excluído. Registros: ${count || 0}.`, { duration: 5000 });
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error('Erro ao excluir histórico: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setExcluindoEspecifico(false);
      setConfirmarExcluirEspecificoDialog(false);
      setSelectedDeleteOption('');
    }
  };

  const handleExcluirLogs = async () => {
    setExcluindoEspecifico(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada');
        return;
      }
      const { count, error } = await supabase
        .from('notificacoes_log')
        .delete({ count: 'exact' })
        .select();
      if (error) throw error;
      toast.success(`Logs de notificações excluídos. Registros: ${count || 0}.`, { duration: 5000 });
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error('Erro ao excluir logs: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setExcluindoEspecifico(false);
      setConfirmarExcluirEspecificoDialog(false);
      setSelectedDeleteOption('');
    }
  };

  const getDeleteOptionLabel = (opt: typeof selectedDeleteOption) => {
    switch (opt) {
      case 'cmeis': return plural;
      case 'turmas': return 'Turmas';
      case 'criancas': return 'Crianças';
      case 'historico': return 'Histórico';
      case 'logs': return 'Logs de Notificações';
      default: return '';
    }
  };

  const handleConfirmExcluirEspecifico = async () => {
    if (!selectedDeleteOption) return;
    switch (selectedDeleteOption) {
      case 'cmeis':
        await handleExcluirCMEIs();
        break;
      case 'turmas':
        await handleExcluirTurmas();
        break;
      case 'criancas':
        // Reutiliza a lógica específica de crianças
        await handleExcluirTodasCriancas();
        setConfirmarExcluirEspecificoDialog(false);
        setSelectedDeleteOption('');
        break;
      case 'historico':
        await handleExcluirHistorico();
        break;
      case 'logs':
        await handleExcluirLogs();
        break;
    }
  };
  const getIdadeLabel = (meses: number) => {
    const anos = Math.floor(meses / 12);
    const mesesRestantes = meses % 12;
    
    if (anos === 0) return `${meses} meses`;
    if (mesesRestantes === 0) return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
    return `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${mesesRestantes} ${mesesRestantes === 1 ? 'mês' : 'meses'}`;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
              <div className="h-4 w-72 max-w-full rounded-md bg-muted animate-pulse" />
            </div>
          </div>
          <div className="h-14 w-full max-w-4xl rounded-xl bg-muted animate-pulse" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-48 rounded-lg border bg-card" />
            <div className="h-48 rounded-lg border bg-card" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6 pb-24">
        <div className="rounded-xl border border-border/80 bg-gradient-to-b from-muted/60 to-transparent p-6">
          <PageHeader
            leading={
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Settings2 className="h-7 w-7" />
              </div>
            }
            title="Configurações"
            description="Parâmetros gerais do sistema, inscrições, notificações e opções avançadas"
          />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <Dialog
              open={pinDialogOpen}
              onOpenChange={(open) => {
                setPinDialogOpen(open);
                if (!open) {
                  setPendingTab(null);
                  setPinValue("");
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Acesso restrito</DialogTitle>
                </DialogHeader>

                <div className="space-y-2">
                  <Label htmlFor="config-tabs-pin">Senha (4 dígitos)</Label>
                  <Input
                    id="config-tabs-pin"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    type="password"
                    value={pinValue}
                    maxLength={4}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setPinValue(digitsOnly);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleConfirmPin();
                      }
                    }}
                    placeholder="••••"
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPinDialogOpen(false);
                      setPendingTab(null);
                      setPinValue("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="button" onClick={handleConfirmPin} disabled={pinValue.length !== 4}>
                    Desbloquear
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
              <TabsList className="w-max md:w-full flex flex-nowrap md:flex-wrap h-auto gap-1 rounded-lg bg-muted/80 p-1.5 md:gap-1.5 md:rounded-xl md:p-2">
                <TabsTrigger value="geral" className="flex-shrink-0 gap-1.5 text-xs md:text-sm px-3 md:px-3.5 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Info className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  Geral
                </TabsTrigger>
                {isSuperAdmin && (
                  <TabsTrigger value="email" className="flex-shrink-0 gap-1.5 text-xs md:text-sm px-3 md:px-3.5 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Mail className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Email
                    {isTabLocked("email") && <Lock className="ml-0.5 h-3.5 w-3.5 opacity-70" />}
                  </TabsTrigger>
                )}
                <TabsTrigger value="mensagens" className="flex-shrink-0 gap-1.5 text-xs md:text-sm px-3 md:px-3.5 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Mensagens</span>
                  <span className="sm:hidden">Msg</span>
                  {isTabLocked("mensagens") && <Lock className="ml-0.5 h-3.5 w-3.5 opacity-70" />}
                </TabsTrigger>
                <TabsTrigger value="operacao" className="flex-shrink-0 gap-1.5 text-xs md:text-sm px-3 md:px-3.5 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Operação</span>
                  <span className="sm:hidden">Op</span>
                </TabsTrigger>
                <TabsTrigger value="workflow" className="flex-shrink-0 gap-1.5 text-xs md:text-sm px-3 md:px-3.5 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Workflow className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Workflow</span>
                  <span className="sm:hidden">WF</span>
                  {isTabLocked("workflow") && <Lock className="ml-0.5 h-3.5 w-3.5 opacity-70" />}
                </TabsTrigger>
                <TabsTrigger value="formulario" className="flex-shrink-0 gap-1.5 text-xs md:text-sm px-3 md:px-3.5 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <FormInput className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Formulário</span>
                  <span className="sm:hidden">Form</span>
                  {isTabLocked("formulario") && <Lock className="ml-0.5 h-3.5 w-3.5 opacity-70" />}
                </TabsTrigger>
                <TabsTrigger value="prioridades" className="flex-shrink-0 gap-1.5 text-xs md:text-sm px-3 md:px-3.5 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Star className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Prioridades</span>
                  <span className="sm:hidden">Prio</span>
                </TabsTrigger>
                <TabsTrigger value="zonas" className="flex-shrink-0 gap-1.5 text-xs md:text-sm px-3 md:px-3.5 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  Zonas
                </TabsTrigger>
                <TabsTrigger value="documentos" className="flex-shrink-0 gap-1.5 text-xs md:text-sm px-3 md:px-3.5 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <FileText className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Documentos</span>
                  <span className="sm:hidden">Docs</span>
                  {isTabLocked("documentos") && <Lock className="ml-0.5 h-3.5 w-3.5 opacity-70" />}
                </TabsTrigger>
                <TabsTrigger value="importar" className="flex-shrink-0 gap-1.5 text-xs md:text-sm px-3 md:px-3.5 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Upload className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  Importar
                  {isTabLocked("importar") && <Lock className="ml-0.5 h-3.5 w-3.5 opacity-70" />}
                </TabsTrigger>
                <TabsTrigger value="turmas" className="flex-shrink-0 gap-1.5 text-xs md:text-sm px-3 md:px-3.5 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Table2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Turmas Base</span>
                  <span className="sm:hidden">Turmas</span>
                  {isTabLocked("turmas") && <Lock className="ml-0.5 h-3.5 w-3.5 opacity-70" />}
                </TabsTrigger>
                <TabsTrigger value="acesso" className="flex-shrink-0 gap-1.5 text-xs md:text-sm px-3 md:px-3.5 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  Acesso
                  {isTabLocked("acesso") && <Lock className="ml-0.5 h-3.5 w-3.5 opacity-70" />}
                </TabsTrigger>
                <TabsTrigger value="interface" className="flex-shrink-0 gap-1.5 text-xs md:text-sm px-3 md:px-3.5 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Palette className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Interface</span>
                  <span className="sm:hidden">UI</span>
                </TabsTrigger>
                {isSuperAdmin && (
                  <TabsTrigger value="aplicativos" className="flex-shrink-0 gap-1.5 text-xs md:text-sm px-3 md:px-3.5 py-2 rounded-md text-blue-600 dark:text-blue-400 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground">
                    <Smartphone className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Apps
                  </TabsTrigger>
                )}
                {isSuperAdmin && (
                  <TabsTrigger value="ead" className="flex-shrink-0 gap-1.5 text-xs md:text-sm px-3 md:px-3.5 py-2 rounded-md text-blue-600 dark:text-blue-400 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground">
                    <Video className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Vagou EaD</span>
                    <span className="sm:hidden">EaD</span>
                  </TabsTrigger>
                )}
                {isSuperAdmin && (
                  <TabsTrigger value="dev" className="flex-shrink-0 gap-1.5 text-xs md:text-sm px-3 md:px-3.5 py-2 rounded-md text-orange-600 dark:text-orange-400 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground">
                    <Database className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Dev
                  </TabsTrigger>
                )}
              </TabsList>
            </div>


            {/* Aba Email - Configurações SMTP */}
            {isSuperAdmin && (
              <TabsContent value="email" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Configurações de E-mail (SMTP)
                    </CardTitle>
                    <CardDescription>
                      Configure o servidor de e-mail para envio de notificações e recuperação de senha
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="smtp-host">Servidor SMTP (Host)</Label>
                          <Input
                            id="smtp-host"
                            value={smtpFields.smtp_host}
                            onChange={(e) => setSmtpFields(prev => ({ ...prev, smtp_host: e.target.value }))}
                            placeholder="smtp.exemplo.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="smtp-port">Porta</Label>
                          <Input
                            id="smtp-port"
                            type="number"
                            value={smtpFields.smtp_port}
                            onChange={(e) => setSmtpFields(prev => ({ ...prev, smtp_port: Number(e.target.value) }))}
                            placeholder="587"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="smtp-user">Usuário SMTP</Label>
                          <Input
                            id="smtp-user"
                            value={smtpFields.smtp_user}
                            onChange={(e) => setSmtpFields(prev => ({ ...prev, smtp_user: e.target.value }))}
                            placeholder="seu-email@exemplo.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="smtp-password">Senha SMTP</Label>
                          <PasswordInput
                            id="smtp-password"
                            value={smtpFields.smtp_password}
                            onChange={(e) => setSmtpFields(prev => ({ ...prev, smtp_password: e.target.value }))}
                            placeholder="••••••••"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-2">
                        <Switch
                          id="smtp-secure"
                          checked={smtpFields.smtp_secure}
                          onCheckedChange={(checked) => setSmtpFields(prev => ({ ...prev, smtp_secure: checked }))}
                        />
                        <Label htmlFor="smtp-secure">Usar conexão segura (SSL/TLS)</Label>
                      </div>

                      <Separator className="my-2" />
                      
                      <h3 className="text-lg font-medium">Informações do Remetente</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="sender-name">Nome do Remetente</Label>
                          <Input
                            id="sender-name"
                            value={smtpFields.smtp_sender_name}
                            onChange={(e) => setSmtpFields(prev => ({ ...prev, smtp_sender_name: e.target.value }))}
                            placeholder="Secretaria de Educação"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sender-email">E-mail do Remetente</Label>
                          <Input
                            id="sender-email"
                            value={smtpFields.smtp_sender_email}
                            onChange={(e) => setSmtpFields(prev => ({ ...prev, smtp_sender_email: e.target.value }))}
                            placeholder="noreply@educacao.pr.gov.br"
                          />
                        </div>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-amber-800 mt-2">
                        <p className="font-medium mb-1">Nota Importante:</p>
                        <p>
                          Estas configurações substituem o serviço de e-mail padrão do sistema. 
                          Certifique-se de que as credenciais estão corretas para garantir o envio de notificações e e-mails de recuperação de senha.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <EmailPreview />
              </TabsContent>
            )}

            {isSuperAdmin && (
              <TabsContent value="ead" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Métricas do Vagou EaD
                    </CardTitle>
                    <CardDescription>
                      Acompanhe o engajamento e exporte os dados do curso
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="rounded-lg border p-4">
                        <div className="text-xs text-muted-foreground">Usuários ativos</div>
                        <div className="text-2xl font-semibold">{metUsuariosTotal}</div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-xs text-muted-foreground">Concluíram o curso</div>
                        <div className="text-2xl font-semibold">{metUsuariosConcluiram}</div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-xs text-muted-foreground">Taxa de conclusão</div>
                        <div className="text-2xl font-semibold">{metTaxaConclusao}%</div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-xs text-muted-foreground">Tempo médio assistido</div>
                        <div className="text-2xl font-semibold">{Math.round(metTempoMedio / 60)} min</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Aba Mensagens - Templates personalizáveis */}
            <TabsContent value="mensagens" className="space-y-6 mt-6">
              <TemplatesManager />
            </TabsContent>

            {/* Aba Operação - Modo de operação */}
            <TabsContent value="operacao" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Modo de Operação
                  </CardTitle>
                  <CardDescription>
                    Configure o modo de funcionamento do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Modo Manutenção</Label>
                        <p className="text-sm text-muted-foreground">
                          Quando ativado, exibe uma mensagem de manutenção para os usuários públicos
                        </p>
                      </div>
                      <Switch
                        checked={effectiveConfigValue("modo_manutencao", false)}
                        onCheckedChange={(v) => setPendingConfigUpdates((prev) => ({ ...prev, modo_manutencao: v }))}
                      />
                    </div>
                    {effectiveConfigValue("modo_manutencao", false) && (
                      <div className="space-y-2">
                        <Label htmlFor="mensagem_manutencao">Mensagem de Manutenção</Label>
                        <Textarea
                          id="mensagem_manutencao"
                          placeholder="Digite a mensagem que será exibida durante a manutenção..."
                          value={operacaoFields.mensagem_manutencao}
                          onChange={(e) => setOperacaoFields(prev => ({ ...prev, mensagem_manutencao: e.target.value }))}
                          className="min-h-[80px]"
                        />
                        <p className="text-xs text-muted-foreground">
                          Esta mensagem será exibida na página de manutenção para visitantes públicos.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Bloquear Novas Inscrições</Label>
                        <p className="text-sm text-muted-foreground">
                          Impede novas inscrições temporariamente
                        </p>
                      </div>
                      <Switch
                        checked={effectiveConfigValue("bloquear_novas_inscricoes", false)}
                        onCheckedChange={(v) => setPendingConfigUpdates((prev) => ({ ...prev, bloquear_novas_inscricoes: v }))}
                      />
                    </div>
                    {effectiveConfigValue("bloquear_novas_inscricoes", false) && (
                      <div className="space-y-2">
                        <Label htmlFor="motivo_bloqueio">Motivo do Bloqueio</Label>
                        <Textarea
                          id="motivo_bloqueio"
                          placeholder="Explique o motivo do bloqueio para os usuários..."
                          value={operacaoFields.motivo_bloqueio_inscricoes}
                          onChange={(e) => setOperacaoFields(prev => ({ ...prev, motivo_bloqueio_inscricoes: e.target.value }))}
                          className="min-h-[80px]"
                        />
                        <p className="text-xs text-muted-foreground">
                          Esta mensagem será exibida quando alguém tentar acessar o formulário de inscrição.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Workflow - Regras de convocação e transferência */}
            <TabsContent value="workflow" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Workflow className="h-5 w-5" />
                    Regras de Workflow
                  </CardTitle>
                  <CardDescription>
                    Configure regras de convocação, transferência e remanejamento
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Preferências de {singular}</p>
                        <p className="text-xs text-muted-foreground">
                          Defina quantas opções de {singular} o responsável pode escolher no formulário público.
                        </p>
                      </div>
                      <Select
                        value={String(effectiveConfigValue("preferencias_cmei_qtd", 2))}
                        disabled={!canEdit || updateMutation.isPending}
                        onValueChange={(value) =>
                          setPendingConfigUpdates((prev) => ({ ...prev, preferencias_cmei_qtd: Number(value) }))
                        }
                      >
                        <SelectTrigger className="w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 opções</SelectItem>
                          <SelectItem value="3">3 opções</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label>Usar Dias Úteis</Label>
                        <p className="text-sm text-muted-foreground">
                          Calcular prazos em dias úteis (excluindo feriados)
                        </p>
                      </div>
                      <Switch
                        checked={effectiveConfigValue("usar_dias_uteis", false)}
                        onCheckedChange={(v) => setPendingConfigUpdates((prev) => ({ ...prev, usar_dias_uteis: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label>Permitir Transferências</Label>
                        <p className="text-sm text-muted-foreground">
                          Permitir transferência entre {plural}
                        </p>
                      </div>
                      <Switch
                        checked={effectiveConfigValue("permitir_transferencia", true)}
                        onCheckedChange={(v) => setPendingConfigUpdates((prev) => ({ ...prev, permitir_transferencia: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label>Permitir Remanejamentos</Label>
                        <p className="text-sm text-muted-foreground">
                          Permitir solicitação de remanejamento
                        </p>
                      </div>
                      <Switch
                        checked={effectiveConfigValue("permitir_remanejamento", true)}
                        onCheckedChange={(v) => setPendingConfigUpdates((prev) => ({ ...prev, permitir_remanejamento: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label>Permitir Cadastro Retroativo (somente Admin)</Label>
                        <p className="text-sm text-muted-foreground">
                          Habilita o campo de data retroativa no cadastro da criança. Exige justificativa e registra auditoria.
                        </p>
                      </div>
                      <Switch
                        checked={effectiveConfigValue("permitir_cadastro_retroativo_admin", false)}
                        onCheckedChange={(v) =>
                          setPendingConfigUpdates((prev) => ({ ...prev, permitir_cadastro_retroativo_admin: v }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <MotivosPadraoManager />
            </TabsContent>

            {/* Aba Formulário - Campos configuráveis */}
            <TabsContent value="formulario" className="space-y-6 mt-6">
              <CamposInscricaoEditor />
            </TabsContent>

            {/* Aba Interface - Personalização da aparência */}
            <TabsContent value="interface" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Personalização da Interface
                  </CardTitle>
                  <CardDescription>
                    Configure cores, fontes e aparência do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!canEditSystemColors && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Somente SUPERADMIN pode alterar as cores do sistema.
                      </AlertDescription>
                    </Alert>
                  )}
                  {/* Preview em tempo real */}
                  <div className="p-4 rounded-lg border-2 border-dashed">
                    <h4 className="text-sm font-medium mb-3">Preview em Tempo Real</h4>
                    <div 
                      className="p-4 rounded-lg text-white"
                      style={{ backgroundColor: interfaceFields.tema_cor_primaria || '#1351B4' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold">
                          {interfaceFields.sistema_nome || 'VAGOU'} - {watch("nome_municipio") || config?.nome_municipio || 'Seu Município'}
                        </span>
                        <div className="flex gap-2">
                          <div className="w-3 h-3 rounded-full bg-white/30" />
                          <div className="w-3 h-3 rounded-full bg-white/30" />
                        </div>
                      </div>
                      <div 
                        className="px-2 py-1 rounded text-xs inline-block"
                        style={{ backgroundColor: interfaceFields.tema_cor_secundaria || '#1351B4' }}
                      >
                        Botão de exemplo
                      </div>
                    </div>
                  </div>

                  {/* Paletas Predefinidas */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Paletas Predefinidas</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { name: 'Gov.br (Padrão)', primary: '#1351B4', secondary: '#1351B4' },
                        { name: 'Verde Institucional', primary: '#1B5E20', secondary: '#0D3311' },
                        { name: 'Roxo Moderno', primary: '#6D28D9', secondary: '#4C1D95' },
                        { name: 'Laranja Vibrante', primary: '#EA580C', secondary: '#9A3412' },
                        { name: 'Azul Oceano', primary: '#0284C7', secondary: '#075985' },
                        { name: 'Rosa Elegante', primary: '#DB2777', secondary: '#9D174D' },
                        { name: 'Cinza Corporativo', primary: '#475569', secondary: '#1E293B' },
                        { name: 'Teal Fresco', primary: '#0D9488', secondary: '#115E59' },
                      ].map((palette) => (
                        <button
                          key={palette.name}
                          type="button"
                          className={cn(
                            "p-3 rounded-lg border-2 hover:border-primary transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed",
                            interfaceFields.tema_cor_primaria === palette.primary && "border-primary ring-2 ring-primary/20"
                          )}
                          disabled={!canEditSystemColors}
                          onClick={() => {
                            if (!canEditSystemColors) return;
                            setInterfaceFields((prev) => ({
                              ...prev,
                              tema_cor_primaria: palette.primary,
                              tema_cor_secundaria: palette.secondary,
                            }));
                          }}
                        >
                          <div className="flex gap-1 mb-2">
                            <div 
                              className="w-6 h-6 rounded" 
                              style={{ backgroundColor: palette.primary }}
                            />
                            <div 
                              className="w-6 h-6 rounded" 
                              style={{ backgroundColor: palette.secondary }}
                            />
                          </div>
                          <span className="text-xs font-medium">{palette.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Tema e Cores Customizadas */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Cores Customizadas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tema Padrão</Label>
                        <Select
                          value={effectiveConfigValue("tema_padrao", "system")}
                          onValueChange={(v) => setPendingConfigUpdates((prev) => ({ ...prev, tema_padrao: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">
                              <div className="flex items-center">
                                <Sun className="mr-2 h-4 w-4" />
                                Claro
                              </div>
                            </SelectItem>
                            <SelectItem value="dark">
                              <div className="flex items-center">
                                <Moon className="mr-2 h-4 w-4" />
                                Escuro
                              </div>
                            </SelectItem>
                            <SelectItem value="system">
                              <div className="flex items-center">
                                <Laptop className="mr-2 h-4 w-4" />
                                Sistema
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Tema padrão para novos usuários
                        </p>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <Label>Permitir Troca de Tema</Label>
                          <p className="text-xs text-muted-foreground">
                            Permite usuários alterarem o tema
                          </p>
                        </div>
                        <Switch
                          checked={effectiveConfigValue("permitir_troca_tema", true)}
                          onCheckedChange={(v) => setPendingConfigUpdates((prev) => ({ ...prev, permitir_troca_tema: v }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Cor Primária</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            className="w-14 h-10 p-1 cursor-pointer"
                            value={interfaceFields.tema_cor_primaria}
                            disabled={!canEditSystemColors}
                            onChange={(e) => {
                              if (!canEditSystemColors) return;
                              setInterfaceFields(prev => ({ ...prev, tema_cor_primaria: e.target.value }));
                            }}
                          />
                          <Input
                            value={interfaceFields.tema_cor_primaria}
                            disabled={!canEditSystemColors}
                            onChange={(e) => setInterfaceFields(prev => ({ ...prev, tema_cor_primaria: e.target.value }))}
                            placeholder="#1351B4"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Usada em botões, links e elementos principais
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Cor Secundária</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            className="w-14 h-10 p-1 cursor-pointer"
                            value={interfaceFields.tema_cor_secundaria}
                            disabled={!canEditSystemColors}
                            onChange={(e) => {
                              if (!canEditSystemColors) return;
                              setInterfaceFields(prev => ({ ...prev, tema_cor_secundaria: e.target.value }));
                            }}
                          />
                          <Input
                            value={interfaceFields.tema_cor_secundaria}
                            disabled={!canEditSystemColors}
                            onChange={(e) => setInterfaceFields(prev => ({ ...prev, tema_cor_secundaria: e.target.value }))}
                            placeholder="#1351B4"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Usada no header e elementos escuros
                        </p>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg md:col-span-2">
                        <div>
                          <Label>Gradiente no Menu Lateral</Label>
                          <p className="text-xs text-muted-foreground">
                            Se ativado, aplica um gradiente de fundo no menu lateral (desktop e mobile)
                          </p>
                        </div>
                        <Switch
                          checked={interfaceFields.tema_sidebar_gradiente_ativo}
                          disabled={!canEditSystemColors}
                          onCheckedChange={(v) => {
                            if (!canEditSystemColors) return;
                            setInterfaceFields(prev => ({ ...prev, tema_sidebar_gradiente_ativo: v }));
                          }}
                        />
                      </div>

                      {interfaceFields.tema_sidebar_gradiente_ativo && (
                        <>
                          <div className="space-y-2">
                            <Label>Gradiente (Início)</Label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                className="w-14 h-10 p-1 cursor-pointer"
                                value={interfaceFields.tema_sidebar_gradiente_inicio}
                                disabled={!canEditSystemColors}
                                onChange={(e) => {
                                  if (!canEditSystemColors) return;
                                  setInterfaceFields(prev => ({ ...prev, tema_sidebar_gradiente_inicio: e.target.value }));
                                }}
                              />
                              <Input
                                value={interfaceFields.tema_sidebar_gradiente_inicio}
                                disabled={!canEditSystemColors}
                                onChange={(e) => setInterfaceFields(prev => ({ ...prev, tema_sidebar_gradiente_inicio: e.target.value }))}
                                placeholder="#1351B4"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Gradiente (Fim)</Label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                className="w-14 h-10 p-1 cursor-pointer"
                                value={interfaceFields.tema_sidebar_gradiente_fim}
                                disabled={!canEditSystemColors}
                                onChange={(e) => {
                                  if (!canEditSystemColors) return;
                                  setInterfaceFields(prev => ({ ...prev, tema_sidebar_gradiente_fim: e.target.value }));
                                }}
                              />
                              <Input
                                value={interfaceFields.tema_sidebar_gradiente_fim}
                                disabled={!canEditSystemColors}
                                onChange={(e) => setInterfaceFields(prev => ({ ...prev, tema_sidebar_gradiente_fim: e.target.value }))}
                                placeholder="#1351B4"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Visualização de Dados */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Visualização de Dados</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Densidade da Tabela</Label>
                        <Select
                          value={effectiveConfigValue("densidade_tabela", "normal")}
                          onValueChange={(v) => setPendingConfigUpdates((prev) => ({ ...prev, densidade_tabela: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="compact">
                              <div className="flex items-center">
                                <Ruler className="mr-2 h-4 w-4" />
                                Compacta
                              </div>
                            </SelectItem>
                            <SelectItem value="normal">
                              <div className="flex items-center">
                                <Table2 className="mr-2 h-4 w-4" />
                                Normal
                              </div>
                            </SelectItem>
                            <SelectItem value="comfortable">
                              <div className="flex items-center">
                                <LayoutList className="mr-2 h-4 w-4" />
                                Confortável
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Itens por Página</Label>
                        <Select
                          value={String(effectiveConfigValue("itens_por_pagina", 25))}
                          onValueChange={(v) => setPendingConfigUpdates((prev) => ({ ...prev, itens_por_pagina: parseInt(v) }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10 itens</SelectItem>
                            <SelectItem value="25">25 itens</SelectItem>
                            <SelectItem value="50">50 itens</SelectItem>
                            <SelectItem value="100">100 itens</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Modo de Visualização da Fila</Label>
                        <Select
                          value={effectiveConfigValue("modo_visualizacao_fila", "tabela")}
                          onValueChange={(v) => setPendingConfigUpdates((prev) => ({ ...prev, modo_visualizacao_fila: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tabela">
                              <div className="flex items-center">
                                <Table2 className="mr-2 h-4 w-4" />
                                Tabela
                              </div>
                            </SelectItem>
                            <SelectItem value="cards">
                              <div className="flex items-center">
                                <CreditCard className="mr-2 h-4 w-4" />
                                Cards
                              </div>
                            </SelectItem>
                            <SelectItem value="lista">
                              <div className="flex items-center">
                                <LayoutList className="mr-2 h-4 w-4" />
                                Lista
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <Label>Mostrar Foto da Criança</Label>
                          <p className="text-xs text-muted-foreground">
                            Exibe foto nas listagens
                          </p>
                        </div>
                        <Switch
                          checked={effectiveConfigValue("mostrar_foto_crianca", false)}
                          onCheckedChange={(v) => setPendingConfigUpdates((prev) => ({ ...prev, mostrar_foto_crianca: v }))}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Sistema */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Identidade do Sistema</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nome do Sistema</Label>
                        <Input
                          value={interfaceFields.sistema_nome}
                          onChange={(e) => setInterfaceFields(prev => ({ ...prev, sistema_nome: e.target.value }))}
                          placeholder="VAGOU"
                        />
                        <p className="text-xs text-muted-foreground">
                          Nome exibido no cabeçalho e título
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Fonte do Sistema</Label>
                        <Select
                          value={effectiveConfigValue("tema_fonte", "Inter")}
                          onValueChange={(v) => setPendingConfigUpdates((prev) => ({ ...prev, tema_fonte: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Inter">Inter (Padrão)</SelectItem>
                            <SelectItem value="Roboto">Roboto</SelectItem>
                            <SelectItem value="Open Sans">Open Sans</SelectItem>
                            <SelectItem value="Lato">Lato</SelectItem>
                            <SelectItem value="Poppins">Poppins</SelectItem>
                            <SelectItem value="Rawline">Rawline (Gov.br)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nomenclatura (singular)</Label>
                        <Input
                          value={interfaceFields.unidade_singular}
                          onChange={(e) => setInterfaceFields(prev => ({ ...prev, unidade_singular: e.target.value }))}
                          placeholder="Unidade"
                        />
                        <p className="text-xs text-muted-foreground">
                          Ex.: CMEI, CEI, Creche, Instituição
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Nomenclatura (plural)</Label>
                        <Input
                          value={interfaceFields.unidade_plural}
                          onChange={(e) => setInterfaceFields(prev => ({ ...prev, unidade_plural: e.target.value }))}
                          placeholder="Unidades"
                        />
                        <p className="text-xs text-muted-foreground">
                          Ex.: CMEIs, CEIs, Creches, Instituições
                        </p>
                      </div>
                    </div>

                    {/* Upload de Ícone do Sistema */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ícone do Sistema</Label>
                        <div className="flex items-center gap-4">
                          {effectiveConfigValue<string | null>("sistema_icone_url", null) && (
                            <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted border">
                              <img 
                                src={effectiveConfigValue<string>("sistema_icone_url", "")} 
                                alt="Ícone" 
                                className="h-full w-full object-contain p-1"
                              />
                            </div>
                          )}
                          <AppIconUpload
                            label="Fazer upload"
                            hint="PNG ou SVG, 512x512 recomendado"
                            currentUrl={effectiveConfigValue<string | null>("sistema_icone_url", null)}
                            onUploadSuccess={(url) => setPendingConfigUpdates((prev) => ({ ...prev, sistema_icone_url: url }))}
                            bucket="assets"
                            folder="sistema"
                          />
                        </div>
                      </div>

                      {/* Upload de Favicon */}
                      <div className="space-y-2">
                        <Label>Favicon</Label>
                        <div className="flex items-center gap-4">
                          {effectiveConfigValue<string | null>("favicon_url", null) && (
                            <div className="h-8 w-8 rounded overflow-hidden bg-muted border">
                              <img 
                                src={effectiveConfigValue<string>("favicon_url", "")} 
                                alt="Favicon" 
                                className="h-full w-full object-contain"
                              />
                            </div>
                          )}
                          <AppIconUpload
                            label="Fazer upload"
                            hint="ICO ou PNG, 32x32 ou 64x64"
                            currentUrl={effectiveConfigValue<string | null>("favicon_url", null)}
                            onUploadSuccess={(url) => setPendingConfigUpdates((prev) => ({ ...prev, favicon_url: url }))}
                            bucket="assets"
                            folder="favicon"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {isSuperAdmin && (
              <TabsContent value="ead" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5" />
                      Gerenciar aulas (Vagou EaD)
                    </CardTitle>
                    <CardDescription>
                      Upload, organização de módulos e edição de conteúdos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-1 space-y-3">
                        <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
                          <div className="text-xs text-muted-foreground">Curso</div>
                          <div className="text-sm font-semibold">{cursoVagou?.titulo || "Vagou EaD"}</div>
                          {cursoVagou?.descricao && (
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {cursoVagou.descricao}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Título da Aula</Label>
                          <Input value={tituloAulaVagou} onChange={(e) => setTituloAulaVagou(e.target.value)} placeholder="Ex: Aula 1 - Introdução" />
                        </div>
                        <div className="space-y-2">
                          <Label>Descrição</Label>
                          <Input value={descAulaVagou} onChange={(e) => setDescAulaVagou(e.target.value)} placeholder="Opcional" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Ordem</Label>
                            <Input type="number" value={ordemAulaVagou} onChange={(e) => setOrdemAulaVagou(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Preview</Label>
                            <Select value={previewAulaVagou} onValueChange={setPreviewAulaVagou}>
                              <SelectTrigger>
                                <SelectValue placeholder="Não" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="false">Não</SelectItem>
                                <SelectItem value="true">Sim</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Módulo da nova aula</Label>
                          <Select
                            value={novoAulaModuloId || "sem-modulo"}
                            onValueChange={(v) => setNovoAulaModuloId(v === "sem-modulo" ? null : v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sem módulo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sem-modulo">Sem módulo</SelectItem>
                              {modulos.map((m: any) => (
                                <SelectItem key={m.id} value={m.id}>{m.titulo}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Pré‑requisito (aula)</Label>
                          <Select
                            value={novoAulaRequisitoId || "sem-requisito"}
                            onValueChange={(v) => setNovoAulaRequisitoId(v === "sem-requisito" ? null : v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sem pré‑requisito" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sem-requisito">Sem pré‑requisito</SelectItem>
                              {aulasSelecionado.map((a: any) => (
                                <SelectItem key={a.id} value={a.id}>{a.titulo}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Percentual mínimo (%)</Label>
                          <Input
                            type="number"
                            value={String(novoAulaPercentualMinimo)}
                            onChange={(e) => setNovoAulaPercentualMinimo(Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10))))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Vídeo (MP4/WEBM)</Label>
                          <Input ref={fileRefVagou} type="file" accept="video/mp4,video/webm,video/ogg" />
                        </div>
                      <div className="space-y-2">
                        <Label>Miniatura (PNG/JPG)</Label>
                        <Input ref={thumbRefVagou} type="file" accept="image/png,image/jpeg,image/jpg" />
                      </div>
                        <Button onClick={handleUploadAulaVagou} disabled={uploadingAulaVagou.current || criarAulaVagou.isPending}>
                          {uploadingAulaVagou.current || criarAulaVagou.isPending ? (
                            <Spinner className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Enviar Vídeo e Criar Aula
                        </Button>
                      </div>
                      <div className="lg:col-span-2 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Aulas</h3>
                          <Badge variant="outline">{aulasSelecionado?.length || 0} itens</Badge>
                        </div>
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input value={novoModuloTitulo} onChange={(e) => setNovoModuloTitulo(e.target.value)} placeholder="Novo módulo (ex: Módulo 1 - Introdução)" />
                            <Button onClick={async () => {
                              if (!cursoVagouId) {
                                toast.error("Curso Vagou EaD não encontrado. Recarregue a página.");
                                return;
                              }
                              const t = novoModuloTitulo.trim();
                              if (!t) { toast.error("Informe um título"); return; }
                              try {
                                await criarModulo.mutateAsync({ id: crypto.randomUUID(), curso_id: cursoVagouId, titulo: t });
                                setNovoModuloTitulo("");
                              } catch {
                                return;
                              }
                            }}>Criar módulo</Button>
                          </div>
                          <Accordion type="multiple" className="w-full">
                            {/* Sem módulo */}
                            <AccordionItem value="sem-modulo">
                              <AccordionTrigger>
                                <div className="flex items-center gap-2">
                                  <span>Sem módulo</span>
                                  <Badge variant="outline">
                                    {(aulasSelecionado || []).filter((x: any) => !x.modulo_id).length}
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-2">
                                  {aulasSelecionado.filter((x: any) => !x.modulo_id).length === 0 ? (
                                    <div className="text-sm text-muted-foreground">Sem aulas</div>
                                  ) : (
                                    aulasSelecionado
                                      .filter((x: any) => !x.modulo_id)
                                      .sort((a: any, b: any) => (a.ordem ?? 0) - (b.ordem ?? 0))
                                      .map((a: any, idx: number) => (
                                        <div
                                          key={a.id}
                                          className="rounded-md border bg-card overflow-hidden shadow-sm hover:bg-muted/40 transition"
                                          draggable
                                          onDragStart={() => setDragAulaId(a.id)}
                                          onDragOver={(e) => e.preventDefault()}
                                          onDrop={async () => {
                                            if (!cursoVagouId || !dragAulaId) return;
                                            if (dragAulaId === a.id) return;
                                            // reorder dentro do mesmo grupo (sem módulo)
                                            const list = aulasSelecionado.filter((x: any) => !x.modulo_id).sort((x: any, y: any) => (x.ordem ?? 0) - (y.ordem ?? 0));
                                            const fromIdx = list.findIndex((x: any) => x.id === dragAulaId);
                                            const toIdx = list.findIndex((x: any) => x.id === a.id);
                                            if (fromIdx === -1 || toIdx === -1) return;
                                            const reordered = [...list];
                                            const [moved] = reordered.splice(fromIdx, 1);
                                            reordered.splice(toIdx, 0, moved);
                                            for (let i = 0; i < reordered.length; i++) {
                                              const item = reordered[i];
                                              await atualizarAula.mutateAsync({ id: item.id, data: { curso_id: cursoVagouId, ordem: i, modulo_id: null } as any });
                                            }
                                            setDragAulaId(null);
                                          }}
                                        >
                                          <div className="flex items-center gap-3 p-3">
                                            <div className="h-14 w-24 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                                              {a.thumbnail_url ? (
                                                <img src={a.thumbnail_url} alt={a.titulo} className="h-full w-full object-cover" />
                                              ) : (
                                                <div className="text-xs text-muted-foreground">Sem thumb</div>
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm font-medium truncate">{idx + 1}. {a.titulo}</div>
                                              {a.descricao && <div className="text-xs text-muted-foreground truncate">{a.descricao}</div>}
                                              <div className="text-[11px] text-muted-foreground mt-1">Ordem: {a.ordem ?? idx}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline">{a.duracao_segundos ? `${Math.floor(a.duracao_segundos/60)}m` : "—"}</Badge>
                                              <Button size="sm" variant="outline" onClick={() => { setEditAula(a); setEditOpen(true); }}>Editar</Button>
                                              <Button size="sm" variant="destructive" onClick={async () => {
                                                if (!confirm("Excluir aula?")) return;
                                                await excluirAula.mutateAsync({ id: a.id, curso_id: cursoVagouId!, video_path: a.video_path, thumbnail_url: a.thumbnail_url });
                                              }}>Excluir</Button>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                            {/* Módulos */}
                            {modulos.map((m: any) => (
                              <AccordionItem key={m.id} value={m.id}>
                                <AccordionTrigger>
                                  <div className="flex items-center gap-2">
                                    <span>{m.titulo}</span>
                                    <Badge variant="outline">
                                      {(aulasSelecionado || []).filter((x: any) => x.modulo_id === m.id).length}
                                    </Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={async () => {
                                    // Drop de aula no módulo (jogar ao final)
                                    if (!cursoVagouId || !dragAulaId) return;
                                    const list = aulasSelecionado.filter((x: any) => x.modulo_id === m.id).sort((x: any, y: any) => (x.ordem ?? 0) - (y.ordem ?? 0));
                                    const nextOrder = list.length;
                                    await atualizarAula.mutateAsync({ id: dragAulaId, data: { curso_id: cursoVagouId, modulo_id: m.id, ordem: nextOrder } as any });
                                    setDragAulaId(null);
                                  }}
                                >
                                  <div className="flex justify-end gap-2 mb-2">
                                    <Button size="sm" variant="outline" onClick={async () => {
                                      const novo = prompt("Título do módulo", m.titulo) || m.titulo;
                                      if (!novo.trim()) return;
                                      await atualizarModulo.mutateAsync({ id: m.id, curso_id: cursoVagouId!, data: { titulo: novo } });
                                    }}>Renomear</Button>
                                    <Button size="sm" variant="destructive" onClick={async () => {
                                      if (!confirm("Excluir módulo? As aulas permanecerão em 'Sem módulo'.")) return;
                                      await excluirModulo.mutateAsync({ id: m.id, curso_id: cursoVagouId! });
                                    }}>Excluir</Button>
                                  </div>
                                  <div className="space-y-2">
                                    {aulasSelecionado.filter((x: any) => x.modulo_id === m.id).length === 0 ? (
                                      <div className="text-sm text-muted-foreground">Sem aulas</div>
                                    ) : (
                                      aulasSelecionado
                                        .filter((x: any) => x.modulo_id === m.id)
                                        .sort((a: any, b: any) => (a.ordem ?? 0) - (b.ordem ?? 0))
                                        .map((a: any, idx: number) => (
                                          <div
                                            key={a.id}
                                            className="rounded-md border bg-card overflow-hidden shadow-sm hover:bg-muted/40 transition"
                                            draggable
                                            onDragStart={() => setDragAulaId(a.id)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={async () => {
                                              // reorder dentro do módulo
                                              if (!cursoVagouId || !dragAulaId) return;
                                              if (dragAulaId === a.id) return;
                                              const list = aulasSelecionado.filter((x: any) => x.modulo_id === m.id).sort((x: any, y: any) => (x.ordem ?? 0) - (y.ordem ?? 0));
                                              const fromIdx = list.findIndex((x: any) => x.id === dragAulaId);
                                              const toIdx = list.findIndex((x: any) => x.id === a.id);
                                              if (fromIdx === -1 || toIdx === -1) return;
                                              const reordered = [...list];
                                              const [moved] = reordered.splice(fromIdx, 1);
                                              reordered.splice(toIdx, 0, moved);
                                              for (let i = 0; i < reordered.length; i++) {
                                                const item = reordered[i];
                                                await atualizarAula.mutateAsync({ id: item.id, data: { curso_id: cursoVagouId, ordem: i, modulo_id: m.id } as any });
                                              }
                                              setDragAulaId(null);
                                            }}
                                          >
                                            <div className="flex items-center gap-3 p-3">
                                              <div className="h-14 w-24 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                                                {a.thumbnail_url ? (
                                                  <img src={a.thumbnail_url} alt={a.titulo} className="h-full w-full object-cover" />
                                                ) : (
                                                  <div className="text-xs text-muted-foreground">Sem thumb</div>
                                                )}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate">{idx + 1}. {a.titulo}</div>
                                                {a.descricao && <div className="text-xs text-muted-foreground truncate">{a.descricao}</div>}
                                                <div className="text-[11px] text-muted-foreground mt-1">Ordem: {a.ordem ?? idx}</div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Badge variant="outline">{a.duracao_segundos ? `${Math.floor(a.duracao_segundos/60)}m` : "—"}</Badge>
                                                <Button size="sm" variant="outline" onClick={() => { setEditAula(a); setEditOpen(true); }}>Editar</Button>
                                                <Button size="sm" variant="destructive" onClick={async () => {
                                                  if (!confirm("Excluir aula?")) return;
                                                  await excluirAula.mutateAsync({ id: a.id, curso_id: cursoVagouId!, video_path: a.video_path, thumbnail_url: a.thumbnail_url });
                                                }}>Excluir</Button>
                                              </div>
                                            </div>
                                          </div>
                                        ))
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Editar aula</DialogTitle>
                    </DialogHeader>
                    {editAula && (
                      <div className="grid gap-3">
                        <div className="space-y-2">
                          <Label>Título</Label>
                          <Input
                            value={editAula.titulo}
                            onChange={(e) => setEditAula((prev: any) => ({ ...prev, titulo: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Descrição</Label>
                          <Input
                            value={editAula.descricao || ""}
                            onChange={(e) => setEditAula((prev: any) => ({ ...prev, descricao: e.target.value }))}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Ordem</Label>
                            <Input
                              type="number"
                              value={editAula.ordem ?? 0}
                              onChange={(e) => setEditAula((prev: any) => ({ ...prev, ordem: parseInt(e.target.value || "0", 10) }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Preview</Label>
                            <Select
                              value={String(editAula.preview ? "true" : "false")}
                              onValueChange={(v) => setEditAula((prev: any) => ({ ...prev, preview: v === "true" }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="false">Não</SelectItem>
                                <SelectItem value="true">Sim</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Módulo</Label>
                          <Select
                            value={editAula.modulo_id || "sem-modulo"}
                            onValueChange={(v) => setEditAula((prev: any) => ({ ...prev, modulo_id: v === "sem-modulo" ? null : v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sem módulo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sem-modulo">Sem módulo</SelectItem>
                              {modulos.map((m: any) => (
                                <SelectItem key={m.id} value={m.id}>{m.titulo}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Vídeo (opcional)</Label>
                            <Input ref={editVideoRef} type="file" accept="video/mp4,video/webm,video/ogg" />
                          </div>
                          <div className="space-y-2">
                            <Label>Miniatura (opcional)</Label>
                            <Input ref={editThumbRef} type="file" accept="image/png,image/jpeg,image/jpg" />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Pré‑requisito (aula)</Label>
                            <Select
                              value={editAula.requisito_aula_id || "sem-requisito"}
                              onValueChange={(v) => setEditAula((prev: any) => ({ ...prev, requisito_aula_id: v === "sem-requisito" ? null : v }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sem pré‑requisito" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sem-requisito">Sem pré‑requisito</SelectItem>
                                {aulasSelecionado.map((a: any) => (
                                  <SelectItem key={a.id} value={a.id}>{a.titulo}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Percentual mínimo (%)</Label>
                            <Input
                              type="number"
                              value={String(editAula.percentual_minimo ?? 0)}
                              onChange={(e) => setEditAula((prev: any) => ({ ...prev, percentual_minimo: Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10))) }))}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    <DialogFooter className="gap-2">
                      <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                      <Button
                        onClick={async () => {
                          if (!editAula || !cursoVagouId) return;
                          let video_path = editAula.video_path as string | undefined;
                          const vFile = editVideoRef.current?.files?.[0];
                          if (vFile) {
                            const ext = vFile.name.split(".").pop() || "mp4";
                            const vPath = `${cursoVagouId}/${editAula.id}.${ext}`;
                            const up = await supabase.storage.from("course-videos").upload(vPath, vFile, { upsert: true });
                            if (!up.error) video_path = vPath;
                          }
                          let thumbnail_url = editAula.thumbnail_url as string | undefined;
                          const tFile = editThumbRef.current?.files?.[0];
                          if (tFile) {
                            const ext = tFile.name.split(".").pop() || "jpg";
                            const tPath = `course-thumbs/${cursoVagouId}/${editAula.id}.${ext}`;
                            const upT = await supabase.storage.from("assets").upload(tPath, tFile, { upsert: true });
                            if (!upT.error) {
                              const pub = supabase.storage.from("assets").getPublicUrl(tPath);
                              thumbnail_url = pub.data.publicUrl;
                            }
                          }
                          await atualizarAula.mutateAsync({
                            id: editAula.id,
                            data: {
                              curso_id: cursoVagouId,
                              titulo: editAula.titulo,
                              descricao: editAula.descricao || null,
                              ordem: editAula.ordem ?? 0,
                              preview: !!editAula.preview,
                              modulo_id: editAula.modulo_id ?? null,
                              requisito_aula_id: editAula.requisito_aula_id ?? null,
                              percentual_minimo: editAula.requisito_aula_id ? Math.max(0, Math.min(100, editAula.percentual_minimo ?? 0)) : 0,
                              thumbnail_url,
                              video_path,
                            } as any,
                          });
                          setEditOpen(false);
                          setEditAula(null);
                          if (editVideoRef.current) editVideoRef.current.value = "";
                          if (editThumbRef.current) editThumbRef.current.value = "";
                        }}
                      >
                        Salvar alterações
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>
            )}

            <TabsContent value="geral" className="space-y-6 mt-6">
          {/* Dados da Secretaria */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary/80" />
                Dados da Secretaria
              </CardTitle>
              <CardDescription>
                Informações que aparecerão no sistema público
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_municipio">Nome do Município *</Label>
                  <Input
                    id="nome_municipio"
                    {...register("nome_municipio")}
                    placeholder="Ex: São Paulo"
                  />
                  {errors.nome_municipio && (
                    <p className="text-sm text-destructive">
                      {errors.nome_municipio.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome_secretaria">Nome da Secretaria *</Label>
                  <Input
                    id="nome_secretaria"
                    {...register("nome_secretaria")}
                    placeholder="Ex: Secretaria de Educação"
                  />
                  {errors.nome_secretaria && (
                    <p className="text-sm text-destructive">
                      {errors.nome_secretaria.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_contato">Email de Contato</Label>
                  <Input
                    id="email_contato"
                    type="email"
                    {...register("email_contato")}
                    placeholder="contato@educacao.gov.br"
                  />
                  {errors.email_contato && (
                    <p className="text-sm text-destructive">
                      {errors.email_contato.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone_contato">Telefone de Contato</Label>
                  <Input
                    id="telefone_contato"
                    {...register("telefone_contato")}
                    placeholder="(11) 9999-9999"
                  />
                  {errors.telefone_contato && (
                    <p className="text-sm text-destructive">
                      {errors.telefone_contato.message}
                    </p>
                  )}
                </div>

                {/* Endereço da Secretaria */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="endereco_secretaria">Endereço da Secretaria</Label>
                  <Input
                    id="endereco_secretaria"
                    value={enderecoFields.endereco_secretaria}
                    onChange={(e) => setEnderecoFields(prev => ({ ...prev, endereco_secretaria: e.target.value }))}
                    placeholder="Ex: Rua Principal, 123 - Centro"
                  />
                  <p className="text-xs text-muted-foreground">
                    Endereço completo para exibição no rodapé e página de contato
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco_latitude">Latitude</Label>
                  <Input
                    id="endereco_latitude"
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    value={enderecoFields.endereco_latitude}
                    onChange={(e) => setEnderecoFields(prev => ({ ...prev, endereco_latitude: e.target.value }))}
                    onBlur={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : null;
                      if (val != null && (Number.isNaN(val) || val < -90 || val > 90)) {
                        toast.error("Latitude inválida. Use um valor entre -90 e 90.");
                        return;
                      }
                    }}
                    placeholder="Ex: -23.550520"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco_longitude">Longitude</Label>
                  <Input
                    id="endereco_longitude"
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    value={enderecoFields.endereco_longitude}
                    onChange={(e) => setEnderecoFields(prev => ({ ...prev, endereco_longitude: e.target.value }))}
                    onBlur={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : null;
                      if (val != null && (Number.isNaN(val) || val < -180 || val > 180)) {
                        toast.error("Longitude inválida. Use um valor entre -180 e 180.");
                        return;
                      }
                    }}
                    placeholder="Ex: -46.633309"
                  />
                  <p className="text-xs text-muted-foreground md:col-span-2">
                    Opcional: Coordenadas para exibir o mapa. Você pode encontrar as coordenadas no Google Maps.
                  </p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <BrasaoUpload 
                    currentUrl={watch("brasao_url")}
                    onUploadSuccess={(url) => setValue("brasao_url", url, { shouldDirty: true })}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Ou insira uma URL externa:
                  </p>
                  <Input
                    id="brasao_url"
                    {...register("brasao_url")}
                    placeholder="https://exemplo.com/brasao.png"
                  />
                  {errors.brasao_url && (
                    <p className="text-sm text-destructive">
                      {errors.brasao_url.message}
                    </p>
                  )}
                  
                  {/* Preview do Brasão */}
                  {watch("brasao_url") && (
                    <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                      <p className="text-sm font-medium mb-3">Preview do Brasão:</p>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">No cabeçalho:</p>
                        <div className="h-12 w-12 rounded-lg overflow-hidden bg-white border flex items-center justify-center">
                          <img 
                            src={watch("brasao_url")} 
                            alt="Preview Brasão" 
                            className="h-full w-full object-contain p-1"
                            onError={(e) => {
                              e.currentTarget.src = '';
                              e.currentTarget.alt = 'Erro ao carregar imagem';
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary/80" />
                Mensagens (Chat)
              </CardTitle>
              <CardDescription>
                Controle se o item “Mensagens” aparece no menu e se o chat fica disponível
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label>Habilitar Mensagens no Menu</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando desabilitado, o menu “Mensagens” some e o chat fica indisponível para todos.
                  </p>
                </div>
                <Switch
                  checked={effectiveConfigValue("habilitar_mensagens", true)}
                  disabled={!canEdit}
                  onCheckedChange={(checked) =>
                    setPendingConfigUpdates((prev) => ({ ...prev, habilitar_mensagens: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary/80" />
              Notificações (WhatsApp)
            </CardTitle>
            <CardDescription>Envio via webhook</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label>Habilitar envio via WhatsApp</Label>
                <p className="text-sm text-muted-foreground">
                  Ativa o envio de notificações via webhook configurado
                </p>
              </div>
              <Switch
                checked={watch("notificacao_whatsapp")}
                disabled={!canEdit}
                onCheckedChange={(checked) => setValue("notificacao_whatsapp", checked, { shouldDirty: true })}
              />
            </div>
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="webhook_url_notificacao">URL do Webhook</Label>
                <Input
                  id="webhook_url_notificacao"
                  placeholder="https://seu-webhook.make.com/..."
                  {...register("webhook_url_notificacao")}
                />
                {errors.webhook_url_notificacao && (
                  <p className="text-sm text-destructive">
                    {errors.webhook_url_notificacao.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Apenas Superadmin pode visualizar e editar este campo
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary/80" />
              Notificações (SMS)
            </CardTitle>
            <CardDescription>Envio via webhook</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label>Habilitar envio via SMS</Label>
                <p className="text-sm text-muted-foreground">
                  Ativa o envio de notificações via webhook configurado
                </p>
              </div>
              <Switch
                checked={watch("notificacao_sms")}
                disabled={!canEdit}
                onCheckedChange={(checked) => setValue("notificacao_sms", checked, { shouldDirty: true })}
              />
            </div>
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="webhook_url_notificacao_sms">URL do Webhook</Label>
                <Input
                  id="webhook_url_notificacao_sms"
                  placeholder="https://seu-webhook.make.com/..."
                  {...register("webhook_url_notificacao_sms" as any)}
                />
                {errors.webhook_url_notificacao_sms && (
                  <p className="text-sm text-destructive">
                    {errors.webhook_url_notificacao_sms.message as any}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Apenas Superadmin pode visualizar e editar este campo
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary/80" />
              Notificações (E-mail)
            </CardTitle>
            <CardDescription>Envio via webhook</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label>Habilitar envio via E-mail</Label>
                <p className="text-sm text-muted-foreground">
                  Ativa o envio de notificações via webhook configurado
                </p>
              </div>
              <Switch
                checked={watch("notificacao_email")}
                disabled={!canEdit}
                onCheckedChange={(checked) => setValue("notificacao_email", checked, { shouldDirty: true })}
              />
            </div>
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="webhook_url_notificacao_email">URL do Webhook</Label>
                <Input
                  id="webhook_url_notificacao_email"
                  placeholder="https://seu-webhook.make.com/..."
                  {...register("webhook_url_notificacao_email" as any)}
                />
                {errors.webhook_url_notificacao_email && (
                  <p className="text-sm text-destructive">
                    {errors.webhook_url_notificacao_email.message as any}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Apenas Superadmin pode visualizar e editar este campo
                </p>
              </div>
            )}
          </CardContent>
        </Card>

          {/* Período de Inscrições */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary/80" />
                Período de Inscrições
              </CardTitle>
              <CardDescription>
                Defina quando as inscrições estarão abertas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dataInicio && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataInicio
                          ? format(new Date(dataInicio), "dd/MM/yyyy", { locale: ptBR })
                          : "Selecione uma data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataInicio ? new Date(dataInicio) : undefined}
                        onSelect={(date) => {
                          setValue("data_inicio_inscricao", date?.toISOString() || "", {
                            shouldDirty: true,
                          });
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Data de Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dataFim && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataFim
                          ? format(new Date(dataFim), "dd/MM/yyyy", { locale: ptBR })
                          : "Selecione uma data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataFim ? new Date(dataFim) : undefined}
                        onSelect={(date) => {
                          setValue("data_fim_inscricao", date?.toISOString() || "", {
                            shouldDirty: true,
                          });
                        }}
                        disabled={(date) =>
                          dataInicio ? date < new Date(dataInicio) : false
                        }
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prazo_resposta_dias">Prazo de Resposta (dias) *</Label>
                  <Input
                    id="prazo_resposta_dias"
                    type="number"
                    min="1"
                    max="90"
                    {...register("prazo_resposta_dias", { valueAsNumber: true })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Prazo para resposta às convocações
                  </p>
                  {errors.prazo_resposta_dias && (
                    <p className="text-sm text-destructive">
                      {errors.prazo_resposta_dias.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Prazo de Assinatura (dias)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={prazoFields.prazo_assinatura_dias}
                    onChange={(e) => setPrazoFields(prev => ({ ...prev, prazo_assinatura_dias: parseInt(e.target.value) || 7 }))}
                  />
                  <p className="text-sm text-muted-foreground">
                    Prazo para comparecer e assinar a matrícula
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Dias de Antecedência para Lembrete</Label>
                  <Input
                    type="number"
                    min="1"
                    max="15"
                    value={prazoFields.dias_antecedencia_lembrete}
                    onChange={(e) => setPrazoFields(prev => ({ ...prev, dias_antecedencia_lembrete: parseInt(e.target.value) || 3 }))}
                  />
                  <p className="text-sm text-muted-foreground">
                    Quantos dias antes do prazo enviar lembrete automático
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label>Mover Automaticamente para Fila quando Prazo Vencer</Label>
                  <p className="text-sm text-muted-foreground">
                    Se ativado, crianças com prazo vencido serão movidas automaticamente para o fim da fila
                  </p>
                </div>
                <Switch
                  checked={effectiveConfigValue("mover_automatico_prazo_vencido", false)}
                  onCheckedChange={(checked) =>
                    setPendingConfigUpdates((prev) => ({ ...prev, mover_automatico_prazo_vencido: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Regras de Corte Etário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Regras de Corte Etário
              </CardTitle>
              <CardDescription>
                Configure a data de corte para determinação de turmas e faixas etárias permitidas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  A data de corte é usada para calcular a turma sugerida da criança. Por exemplo: 31/03 significa que a idade da criança na data de corte determina sua turma (Infantil 0, 1, 2 ou 3).
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mês de Corte</Label>
                  <Select
                    value={String(effectiveConfigValue("data_corte_mes", 3))}
                    onValueChange={(value) =>
                      setPendingConfigUpdates((prev) => ({ ...prev, data_corte_mes: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Janeiro</SelectItem>
                      <SelectItem value="2">Fevereiro</SelectItem>
                      <SelectItem value="3">Março</SelectItem>
                      <SelectItem value="4">Abril</SelectItem>
                      <SelectItem value="5">Maio</SelectItem>
                      <SelectItem value="6">Junho</SelectItem>
                      <SelectItem value="7">Julho</SelectItem>
                      <SelectItem value="8">Agosto</SelectItem>
                      <SelectItem value="9">Setembro</SelectItem>
                      <SelectItem value="10">Outubro</SelectItem>
                      <SelectItem value="11">Novembro</SelectItem>
                      <SelectItem value="12">Dezembro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Dia de Corte</Label>
                  <Select
                    value={String(effectiveConfigValue("data_corte_dia", 31))}
                    onValueChange={(value) =>
                      setPendingConfigUpdates((prev) => ({ ...prev, data_corte_dia: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dia" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => (
                        <SelectItem key={dia} value={dia.toString()}>
                          {dia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Padrão: 31/03 (31 de março)
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Idade Mínima para Convocação (meses)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="24"
                    value={prazoFields.idade_minima_meses}
                    onChange={(e) => setPrazoFields(prev => ({ ...prev, idade_minima_meses: parseInt(e.target.value) || 6 }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Crianças abaixo dessa idade não poderão ser convocadas. Padrão: 6 meses
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Idade Máxima (anos)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="6"
                    value={prazoFields.idade_maxima_anos}
                    onChange={(e) => setPrazoFields(prev => ({ ...prev, idade_maxima_anos: parseInt(e.target.value) || 3 }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Turma máxima = Infantil {prazoFields.idade_maxima_anos}. Crianças acima são "Concluintes".
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Regra Atual</h4>
                <p className="text-sm text-muted-foreground">
                  Data de corte: <strong>{effectiveConfigValue("data_corte_dia", 31)}/{effectiveConfigValue("data_corte_mes", 3)}</strong> de cada ano
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Faixa etária: <strong>{prazoFields.idade_minima_meses} meses</strong> até <strong>Infantil {prazoFields.idade_maxima_anos}</strong>
                </p>
              </div>

              <Separator />

              {/* Configurações de Prioridade da Fila */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Prioridades na Fila de Espera</h3>
                <p className="text-sm text-muted-foreground">
                  Configure quais tipos de prioridade devem ser aplicados na ordenação da fila.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>Prioridade para Programas Sociais</Label>
                      <p className="text-sm text-muted-foreground">
                        Crianças beneficiárias de programas sociais têm prioridade sobre as demais
                      </p>
                    </div>
                    <Switch
                      checked={effectiveConfigValue("prioridade_social_habilitada", true)}
                      onCheckedChange={(checked) =>
                        setPendingConfigUpdates((prev) => ({ ...prev, prioridade_social_habilitada: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>Prioridade para Remanejamentos</Label>
                      <p className="text-sm text-muted-foreground">
                        Solicitações de remanejamento têm prioridade máxima na fila
                      </p>
                    </div>
                    <Switch
                      checked={effectiveConfigValue("prioridade_remanejamento_habilitada", true)}
                      onCheckedChange={(checked) =>
                        setPendingConfigUpdates((prev) => ({ ...prev, prioridade_remanejamento_habilitada: checked }))
                      }
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Ordem de Prioridade Atual</h4>
                  <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                    {effectiveConfigValue("prioridade_remanejamento_habilitada", true as boolean) !== false && (
                      <li>Remanejamentos (prioridade máxima)</li>
                    )}
                    {effectiveConfigValue("prioridade_social_habilitada", true as boolean) !== false && (
                      <li>Beneficiários de programas sociais</li>
                    )}
                    <li>Demais crianças (ordenadas por data de inscrição)</li>
                  </ol>
                  <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                    <strong className="text-orange-700">Fim de Fila:</strong>
                    <span className="text-orange-600 ml-1">
                      Crianças com "Fim de Fila" perdem a prioridade social e passam a ser ordenadas pela data da penalidade. 
                      Novos cadastros vêm depois delas.
                    </span>
                  </div>
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                    <strong className="text-blue-700">Reativação:</strong>
                    <span className="text-blue-600 ml-1">
                      Crianças reativadas após desistência usam a data de retorno (não a data original de inscrição).
                    </span>
                  </div>
                </div>

                {/* Botão para recalcular a fila manualmente */}
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-card">
                  <div className="flex-1 space-y-0.5">
                    <Label>Recalcular Fila de Espera</Label>
                    <p className="text-sm text-muted-foreground">
                      Aplica as configurações de prioridade e recalcula a posição de todas as crianças na fila.
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    disabled={recalculandoFila}
                    onClick={async () => {
                      setRecalculandoFila(true);
                      try {
                        const { error } = await supabase.rpc('recalcular_posicoes_fila');
                        if (error) throw error;
                        toast.success("Fila recalculada com sucesso!");
                      } catch (err) {
                        console.error("Erro ao recalcular fila:", err);
                        toast.error("Erro ao recalcular a fila");
                      } finally {
                        setRecalculandoFila(false);
                      }
                    }}
                  >
                    {recalculandoFila ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4 animate-spin" />
                        Recalculando...
                      </>
                    ) : (
                      <>
                        <Users className="mr-2 h-4 w-4" />
                        Recalcular Agora
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Mensagem para crianças fora da faixa etária */}
              <div className="space-y-2">
                <Label>Mensagem para Crianças Fora da Faixa Etária</Label>
                <Textarea
                  value={mensagemIdadeFora}
                  onChange={(e) => setMensagemIdadeFora(e.target.value)}
                  placeholder="Mensagem exibida quando a criança está fora da faixa etária"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Esta mensagem será exibida quando o responsável tentar inscrever uma criança que já ultrapassou a idade máxima permitida.
                </p>
              </div>
            </CardContent>
          </Card>
            </TabsContent>

            <TabsContent value="importar" className="space-y-6 mt-6">
              {/* Resultado da importação */}
              {importResult && (
                <Card className={importResult.erros > 0 ? "border-amber-500" : "border-green-500"}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {importResult.erros === 0 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                      )}
                      Resultado da Importação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">{importResult.total}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{importResult.sucesso}</p>
                        <p className="text-xs text-muted-foreground">Sucesso</p>
                      </div>
                      <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{importResult.erros}</p>
                        <p className="text-xs text-muted-foreground">Erros</p>
                      </div>
                    </div>
                    {importResult.detalhes.length > 0 && (
                      <div className="max-h-40 overflow-y-auto bg-muted p-3 rounded-lg text-xs space-y-1">
                        {importResult.detalhes.map((d, i) => (
                          <p key={i} className="text-destructive">{d}</p>
                        ))}
                      </div>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setImportResult(null)}>
                      Fechar
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Importar Crianças */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <CardTitle>Importar Crianças</CardTitle>
                  </div>
                  <CardDescription>
                    Carregue um arquivo Excel (.xlsx) para inserir novos registros de crianças.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm font-medium mb-2">Colunas do Excel (por cabeçalho; ordem não importa):</p>
                    <code className="text-xs block overflow-x-auto whitespace-nowrap">
                      {[
                        "nome",
                        "data_nascimento",
                        "sexo",
                        "data_inscricao",
                        "data_retorno_fila",
                        "programas_sociais",
                        "aceita_qualquer_cmei",
                        "responsavel_nome",
                        "responsavel_cpf",
                        "responsavel_telefone",
                        "responsavel_celular",
                        "responsavel_email",
                        "cpf_crianca",
                        "certidao_nascimento",
                        "cep",
                        "logradouro",
                        "numero",
                        "complemento",
                        "bairro",
                        "cidade",
                        "estado",
                        "observacoes",
                        "status",
                        "cmei1_preferencia",
                        "cmei2_preferencia",
                        "cmei3_preferencia",
                        "cmei_atual_nome",
                        "turma_atual_nome",
                        ...(camposInscricaoAtivos || []).map((c) => c.nome_campo),
                      ]
                        .filter((v, idx, arr) => arr.indexOf(v) === idx)
                        .join(", ")}
                    </code>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() => gerarModeloImportacaoCriancasExcel(camposInscricaoAtivos || [])}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Modelo Excel
                    </Button>
                    <Button variant="outline" onClick={handleExportarBackup}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Backup Excel
                    </Button>
                  </div>

                  <Separator />

                  {isSuperAdmin && (
                    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                      <div>
                        <div className="text-sm font-medium">Permitir dados incompletos</div>
                        <div className="text-xs text-muted-foreground">
                          Importa mesmo sem alguns campos obrigatórios; marca o registro como dados incompletos.
                        </div>
                      </div>
                      <Switch
                        checked={permitirImportacaoIncompleta}
                        onCheckedChange={(v) => setPermitirImportacaoIncompleta(!!v)}
                      />
                    </div>
                  )}

                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Label htmlFor="excel-criancas">Arquivo Excel de Crianças (.xlsx)</Label>
                      <Input
                        id="excel-criancas"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleImportarCriancasExcel}
                        ref={fileInputRef}
                        disabled={importarCriancas.isPending}
                        className="mt-1"
                      />
                    </div>
                    <Button disabled={importarCriancas.isPending}>
                      {importarCriancas.isPending ? (
                        <>
                          <Spinner className="h-4 w-4 mr-2 animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Importar
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Importar Turmas */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <CardTitle>Importar Turmas</CardTitle>
                  </div>
                  <CardDescription>
                    Carregue um arquivo Excel (.xlsx) para criar novas turmas em {plural}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm font-medium mb-2">Colunas do Excel (por cabeçalho; ordem não importa):</p>
                    <code className="text-xs block">
                      nome, turma_base, cmei_nome, capacidade, turno, idade_minima_meses, idade_maxima_meses, professores, auxiliares
                    </code>
                  </div>

                  <Button variant="outline" onClick={gerarModeloTurmasExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Modelo Turmas Excel
                  </Button>

                  <Separator />

                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Label htmlFor="excel-turmas">Arquivo Excel de Turmas (.xlsx)</Label>
                      <Input
                        id="excel-turmas"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleImportarTurmasExcel}
                        ref={turmaFileInputRef}
                        disabled={importarTurmas.isPending}
                        className="mt-1"
                      />
                    </div>
                    <Button disabled={importarTurmas.isPending}>
                      {importarTurmas.isPending ? (
                        <>
                          <Spinner className="h-4 w-4 mr-2 animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Importar
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="turmas" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Modelos de Turmas</CardTitle>
                      <CardDescription>
                        Configuração dos modelos de turmas com faixas etárias
                      </CardDescription>
                    </div>
                    <Button onClick={handleNovaTurmaBase}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Turma Base
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {turmasLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Spinner className="h-6 w-6 animate-spin" />
                    </div>
                  ) : turmasBase && turmasBase.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {turmasBase.map((turma) => (
                        <Card key={turma.id} className="relative">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <CardTitle className="text-base">{turma.nome}</CardTitle>
                              </div>
                              {!turma.ativo && (
                                <Badge variant="secondary">Inativa</Badge>
                              )}
                            </div>
                            <CardDescription className="text-xs">
                              {turma.descricao}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="text-sm">
                              <span className="font-medium">Faixa Etária (Meses):</span>
                              <Badge variant="outline" className="ml-2">
                                {turma.idade_minima_meses} - {turma.idade_maxima_meses} meses
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => handleEditTurmaBase(turma)}
                            >
                              <Edit className="h-3 w-3 mr-2" />
                              Editar
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhuma turma base cadastrada</p>
                      <Button variant="outline" className="mt-4" onClick={handleNovaTurmaBase}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Primeira Turma
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="acesso" className="space-y-6 mt-6">
              <ModuleAccessSettings />

              {/* Segurança - Autenticação */}
              <Card>
                <CardHeader>
                  <CardTitle>Autenticação na Inscrição</CardTitle>
                  <CardDescription>
                    Controle de acesso ao formulário de inscrição pública
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="autenticacao_publica" className="text-base font-medium">
                        Exigir Login na Inscrição
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Quando habilitado, o responsável precisa fazer login antes de realizar uma nova inscrição.
                        Quando desabilitado, o formulário de inscrição fica totalmente público.
                      </p>
                    </div>
                    <Switch
                      id="autenticacao_publica"
                      checked={watch("autenticacao_publica")}
                      onCheckedChange={(checked) =>
                        setValue("autenticacao_publica", checked, { shouldDirty: true })
                      }
                    />
                  </div>

                  <Alert className={watch("autenticacao_publica") ? "border-primary bg-primary/5" : "border-amber-500 bg-amber-500/5"}>
                    {watch("autenticacao_publica") ? (
                      <Lock className="h-4 w-4 text-primary" />
                    ) : (
                      <Globe className="h-4 w-4 text-amber-500" />
                    )}
                    <AlertDescription className={watch("autenticacao_publica") ? "text-primary" : "text-amber-600 dark:text-amber-400"}>
                      {watch("autenticacao_publica") 
                        ? "Atualmente, o sistema exige login do responsável para realizar inscrições."
                        : "Atualmente, qualquer pessoa pode realizar inscrições sem necessidade de login."}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Limite de Inscrições */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    Limite de Inscrições
                  </CardTitle>
                  <CardDescription>
                    Controle quantas crianças cada responsável pode inscrever
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="limite_inscricoes_responsavel">
                      Máximo de inscrições por responsável
                    </Label>
                    <Input
                      id="limite_inscricoes_responsavel"
                      type="number"
                      min={1}
                      max={20}
                      {...register("limite_inscricoes_responsavel", { valueAsNumber: true })}
                      className="max-w-[150px]"
                    />
                    <p className="text-sm text-muted-foreground">
                      Define o número máximo de crianças que um responsável pode inscrever no sistema.
                    </p>
                    {errors.limite_inscricoes_responsavel && (
                      <p className="text-sm text-destructive">{errors.limite_inscricoes_responsavel.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Validação de CEP */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Validação de CEP
                  </CardTitle>
                  <CardDescription>
                    Restrinja inscrições por região geográfica
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="validar_cep" className="text-base font-medium">
                        Validar CEP na Inscrição
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Quando habilitado, apenas CEPs da lista permitida poderão realizar inscrições.
                      </p>
                    </div>
                    <Switch
                      id="validar_cep"
                      checked={watch("validar_cep")}
                      onCheckedChange={(checked) =>
                        setValue("validar_cep", checked, { shouldDirty: true })
                      }
                    />
                  </div>

                  {watch("validar_cep") && (
                    <div className="space-y-2">
                      <Label htmlFor="ceps_permitidos">
                        CEPs Permitidos
                      </Label>
                      <Textarea
                        id="ceps_permitidos"
                        placeholder="Ex: 12345-000, 12345-100, 12346"
                        {...register("ceps_permitidos")}
                        className="min-h-[100px]"
                      />
                      <p className="text-sm text-muted-foreground">
                        Informe os CEPs ou prefixos de CEP permitidos, separados por vírgula.
                        Use prefixos para aceitar faixas (ex: "12345" aceita todos de 12345-000 a 12345-999).
                      </p>
                    </div>
                  )}

                  <Alert className={watch("validar_cep") ? "border-primary bg-primary/5" : "border-muted"}>
                    {watch("validar_cep") ? (
                      <MapPin className="h-4 w-4 text-primary" />
                    ) : (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    )}
                    <AlertDescription className={watch("validar_cep") ? "text-primary" : "text-muted-foreground"}>
                      {watch("validar_cep") 
                        ? "A validação de CEP está ativa. Apenas endereços dos CEPs permitidos serão aceitos."
                        : "A validação de CEP está desativada. Qualquer CEP será aceito nas inscrições."}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* CAPTCHA */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Proteção CAPTCHA
                  </CardTitle>
                  <CardDescription>
                    Adicione verificação anti-spam no formulário de inscrição pública
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="captcha_toggle" className="text-base font-medium">
                        Habilitar hCaptcha
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Quando habilitado, usuários precisam passar pela verificação CAPTCHA antes de enviar inscrições.
                      </p>
                    </div>
                    <Switch
                      id="captcha_toggle"
                      checked={effectiveConfigValue("captcha_habilitado", false)}
                      onCheckedChange={(checked) =>
                        setPendingConfigUpdates((prev) => ({ ...prev, captcha_habilitado: checked }))
                      }
                    />
                  </div>

                  {effectiveConfigValue("captcha_habilitado", false) && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="captcha_site_key">Site Key (Pública)</Label>
                          <Input
                            id="captcha_site_key"
                            placeholder="Sua chave pública do hCaptcha"
                            value={effectiveConfigValue("captcha_site_key", "")}
                            onChange={(e) =>
                              setPendingConfigUpdates((prev) => ({ ...prev, captcha_site_key: e.target.value || null }))
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Obtenha em <a href="https://dashboard.hcaptcha.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">dashboard.hcaptcha.com</a>
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="captcha_secret_key">Secret Key (Privada)</Label>
                          <Input
                            id="captcha_secret_key"
                            type="password"
                            placeholder="Sua chave secreta do hCaptcha"
                            value={effectiveConfigValue("captcha_secret_key", "")}
                            onChange={(e) =>
                              setPendingConfigUpdates((prev) => ({
                                ...prev,
                                captcha_secret_key: e.target.value || null,
                              }))
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Esta chave é usada no servidor para validar os tokens.
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  <Alert className={effectiveConfigValue("captcha_habilitado", false) ? "border-green-500 bg-green-500/5" : "border-muted"}>
                    {effectiveConfigValue("captcha_habilitado", false) ? (
                      <Lock className="h-4 w-4 text-green-600" />
                    ) : (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    )}
                    <AlertDescription className={effectiveConfigValue("captcha_habilitado", false) ? "text-green-600" : "text-muted-foreground"}>
                      {effectiveConfigValue("captcha_habilitado", false) 
                        ? "CAPTCHA está ativo. As inscrições terão proteção anti-spam."
                        : "CAPTCHA está desativado. Inscrições podem ser feitas sem verificação adicional."}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Consulta automática por CPF (CPFHub)
                  </CardTitle>
                  <CardDescription>
                    Ao digitar o CPF no formulário, o sistema tenta buscar nome e data de nascimento automaticamente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="cpfhub_toggle" className="text-base font-medium">
                        Habilitar CPFHub
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Quando habilitado, a consulta é feita via Edge Function usando sua API Key (não é exposta no front).
                      </p>
                    </div>
                    <Switch
                      id="cpfhub_toggle"
                      checked={effectiveConfigValue("cpfhub_habilitado", false)}
                      disabled={!canEdit || updateMutation.isPending}
                      onCheckedChange={(checked) =>
                        setPendingConfigUpdates((prev) => ({ ...prev, cpfhub_habilitado: checked }))
                      }
                    />
                  </div>

                  {effectiveConfigValue("cpfhub_habilitado", false) && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label htmlFor="cpfhub_api_key">API Key (Privada)</Label>
                        <Input
                          id="cpfhub_api_key"
                          type="password"
                          placeholder="Sua API Key do CPFHub"
                          disabled={!canEdit || updateMutation.isPending}
                          value={effectiveConfigValue("cpfhub_api_key", "")}
                          onChange={(e) =>
                            setPendingConfigUpdates((prev) => ({ ...prev, cpfhub_api_key: e.target.value || null }))
                          }
                        />
                        <p className="text-xs text-muted-foreground">Chave usada somente no servidor para chamar https://api.cpfhub.io.</p>
                      </div>
                    </>
                  )}

                  <Alert
                    className={
                      effectiveConfigValue("cpfhub_habilitado", false)
                        ? effectiveConfigValue<string | null>("cpfhub_api_key", null)
                          ? "border-green-500 bg-green-500/5"
                          : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
                        : "border-muted"
                    }
                  >
                    {effectiveConfigValue("cpfhub_habilitado", false) ? (
                      effectiveConfigValue<string | null>("cpfhub_api_key", null) ? (
                        <Lock className="h-4 w-4 text-green-600" />
                      ) : (
                        <Info className="h-4 w-4 text-yellow-600" />
                      )
                    ) : (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    )}
                    <AlertDescription
                      className={
                        effectiveConfigValue("cpfhub_habilitado", false)
                          ? effectiveConfigValue<string | null>("cpfhub_api_key", null)
                            ? "text-green-600"
                            : "text-yellow-800 dark:text-yellow-200"
                          : "text-muted-foreground"
                      }
                    >
                      {effectiveConfigValue("cpfhub_habilitado", false)
                        ? effectiveConfigValue<string | null>("cpfhub_api_key", null)
                          ? "CPFHub está ativo. O formulário tentará preencher dados automaticamente pelo CPF."
                          : "CPFHub está habilitado, mas falta configurar a API Key."
                        : "CPFHub está desativado. O preenchimento segue totalmente manual (como hoje)."}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Consulta automática por CPF (APICPF - plano B)
                  </CardTitle>
                  <CardDescription>
                    Se o CPFHub estiver indisponível, o sistema pode tentar este provedor como alternativa.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="apicpf_toggle" className="text-base font-medium">
                        Habilitar APICPF
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Quando habilitado, a consulta é feita via Edge Function usando sua API Key (não é exposta no front).
                      </p>
                    </div>
                    <Switch
                      id="apicpf_toggle"
                      checked={effectiveConfigValue("apicpf_habilitado", false)}
                      disabled={!canEdit || updateMutation.isPending}
                      onCheckedChange={(checked) =>
                        setPendingConfigUpdates((prev) => ({ ...prev, apicpf_habilitado: checked }))
                      }
                    />
                  </div>

                  {effectiveConfigValue("apicpf_habilitado", false) && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label htmlFor="apicpf_api_key">API Key (Privada)</Label>
                        <Input
                          id="apicpf_api_key"
                          type="password"
                          placeholder="Sua API Key do APICPF"
                          disabled={!canEdit || updateMutation.isPending}
                          value={effectiveConfigValue("apicpf_api_key", "")}
                          onChange={(e) =>
                            setPendingConfigUpdates((prev) => ({ ...prev, apicpf_api_key: e.target.value || null }))
                          }
                        />
                        <p className="text-xs text-muted-foreground">Chave usada somente no servidor para chamar https://apicpf.com.</p>
                      </div>
                    </>
                  )}

                  <Alert
                    className={
                      effectiveConfigValue("apicpf_habilitado", false)
                        ? effectiveConfigValue<string | null>("apicpf_api_key", null)
                          ? "border-green-500 bg-green-500/5"
                          : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
                        : "border-muted"
                    }
                  >
                    {(config as any)?.apicpf_habilitado ? (
                      (config as any)?.apicpf_api_key ? (
                        <Lock className="h-4 w-4 text-green-600" />
                      ) : (
                        <Info className="h-4 w-4 text-yellow-600" />
                      )
                    ) : (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    )}
                    <AlertDescription
                      className={
                        (config as any)?.apicpf_habilitado
                          ? (config as any)?.apicpf_api_key
                            ? "text-green-600"
                            : "text-yellow-800 dark:text-yellow-200"
                          : "text-muted-foreground"
                      }
                    >
                      {(config as any)?.apicpf_habilitado
                        ? (config as any)?.apicpf_api_key
                          ? "APICPF está configurado como plano B para consulta automática por CPF."
                          : "APICPF está habilitado, mas falta configurar a API Key."
                        : "APICPF está desativado."}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prioridades" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Critérios de Prioridade (Lei Federal)
                  </CardTitle>
                  <CardDescription>
                    Configure os critérios usados para ordenar a fila e os documentos de comprovação.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="border-primary/30 bg-primary/5">
                    <AlertDescription>
                      Os critérios podem ser selecionados em conjunto no formulário (múltipla seleção). Quando um critério exige documento, o
                      responsável envia o comprovante e a prioridade só entra no cálculo após aprovação.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pontuação base na fila</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={String(effectiveConfigValue("pontuacao_base_fila", 10))}
                        disabled={!canEdit || updateMutation.isPending}
                        onChange={(e) =>
                          setPendingConfigUpdates((prev) => ({
                            ...prev,
                            pontuacao_base_fila: Number(e.target.value || 0),
                          }))
                        }
                        onBlur={(e) => {
                          const v = clampNumber(Number(e.target.value || 0), 0, 100);
                          setPendingConfigUpdates((prev) => ({ ...prev, pontuacao_base_fila: v }));
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Pontos mínimos só por estar em "Fila de Espera". Prioridades e zona somam acima deste valor.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Peso por dia de espera</Label>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        value={String(effectiveConfigValue("peso_data_cadastro", 0))}
                        disabled={!canEdit || updateMutation.isPending}
                        onChange={(e) =>
                          setPendingConfigUpdates((prev) => ({
                            ...prev,
                            peso_data_cadastro: Number(e.target.value || 0),
                          }))
                        }
                        onBlur={(e) => {
                          const v = clampNumber(Number(e.target.value || 0), 0, 50);
                          setPendingConfigUpdates((prev) => ({ ...prev, peso_data_cadastro: v }));
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Pontos somados por dia desde a inscrição. Use 0 para desativar.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Peso programas sociais</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={String(effectiveConfigValue("peso_programas_sociais", 10))}
                        disabled={
                          !canEdit ||
                          updateMutation.isPending ||
                          effectiveConfigValue("prioridade_social_habilitada", true as boolean) === false
                        }
                        onChange={(e) =>
                          setPendingConfigUpdates((prev) => ({
                            ...prev,
                            peso_programas_sociais: Number(e.target.value || 0),
                          }))
                        }
                        onBlur={(e) => {
                          const v = clampNumber(Number(e.target.value || 0), 0, 100);
                          setPendingConfigUpdates((prev) => ({ ...prev, peso_programas_sociais: v }));
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Pontos extras quando a criança está em programas sociais (se habilitado).
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Peso remanejamento</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={String(effectiveConfigValue("peso_remanejamento", 10))}
                        disabled={
                          !canEdit ||
                          updateMutation.isPending ||
                          effectiveConfigValue("prioridade_remanejamento_habilitada", true as boolean) === false
                        }
                        onChange={(e) =>
                          setPendingConfigUpdates((prev) => ({
                            ...prev,
                            peso_remanejamento: Number(e.target.value || 0),
                          }))
                        }
                        onBlur={(e) => {
                          const v = clampNumber(Number(e.target.value || 0), 0, 100);
                          setPendingConfigUpdates((prev) => ({ ...prev, peso_remanejamento: v }));
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Pontos extras quando a prioridade é Remanejamento (se habilitado).
                      </p>
                    </div>
                  </div>

                  <Alert className="border-slate-200 bg-slate-50">
                    <AlertDescription className="text-slate-800">
                      Critérios de desempate (fixo): 1º data de cadastro, 2º idade.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Comprovação obrigatória na inscrição</p>
                      <p className="text-xs text-muted-foreground">
                        Quando desativado, a comprovação pode ser enviada na convocação, e o critério fica pendente até aprovação (conta no cálculo da fila).
                      </p>
                    </div>
                    <Switch
                      checked={effectiveConfigValue("prioridades_comprovacao_na_inscricao", true)}
                      disabled={!canEdit || updateMutation.isPending}
                      onCheckedChange={(checked) =>
                        setPendingConfigUpdates((prev) => ({ ...prev, prioridades_comprovacao_na_inscricao: checked }))
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                      Instala/atualiza os critérios federais padrão (idempotente).
                    </div>
                    <Button
                      onClick={() => instalarPrioridadesFederais.mutate()}
                      disabled={instalarPrioridadesFederais.isPending}
                      className="w-full sm:w-auto"
                    >
                      {instalarPrioridadesFederais.isPending ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4 animate-spin" />
                          Aplicando...
                        </>
                      ) : (
                        "Aplicar critérios federais"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <TiposPrioridadeManager />
            </TabsContent>

            <TabsContent value="zonas" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Prioridade por Zona
                  </CardTitle>
                  <CardDescription>
                    Bônus de pontuação quando a opção de {singular} escolhida pertence à zona do endereço informada pelo responsável.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Habilitar prioridade por zona</p>
                      <p className="text-xs text-muted-foreground">
                        Quando habilitado, o sistema identifica a zona automaticamente pelo CEP/bairro. O bônus é aplicado no cálculo da fila por {singular}.
                      </p>
                    </div>
                    <Switch
                      checked={effectiveConfigValue("prioridade_zona_habilitada", false)}
                      disabled={!canEdit || updateMutation.isPending}
                      onCheckedChange={(checked) =>
                        setPendingConfigUpdates((prev) => ({ ...prev, prioridade_zona_habilitada: checked }))
                      }
                    />
                  </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Bônus dentro da zona</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={String(effectiveConfigValue("prioridade_zona_bonus_dentro", 5))}
                        disabled={
                          !canEdit ||
                          updateMutation.isPending ||
                          !effectiveConfigValue("prioridade_zona_habilitada", false)
                        }
                        onChange={(e) =>
                          setPendingConfigUpdates((prev) => ({
                            ...prev,
                            prioridade_zona_bonus_dentro: Number(e.target.value || 0),
                          }))
                        }
                        onBlur={(e) => {
                          const v = clampNumber(Number(e.target.value || 0), 0, 100);
                          setPendingConfigUpdates((prev) => ({ ...prev, prioridade_zona_bonus_dentro: v }));
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Pontos adicionados quando a opção de {singular} selecionada pertence à zona informada.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Bônus fora da zona</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={String(effectiveConfigValue("prioridade_zona_bonus_fora", 0))}
                        disabled={
                          !canEdit ||
                          updateMutation.isPending ||
                          !effectiveConfigValue("prioridade_zona_habilitada", false)
                        }
                        onChange={(e) =>
                          setPendingConfigUpdates((prev) => ({
                            ...prev,
                            prioridade_zona_bonus_fora: Number(e.target.value || 0),
                          }))
                        }
                        onBlur={(e) => {
                          const v = clampNumber(Number(e.target.value || 0), 0, 100);
                          setPendingConfigUpdates((prev) => ({ ...prev, prioridade_zona_bonus_fora: v }));
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Pontos adicionados quando a opção de {singular} selecionada não pertence à zona informada (use 0 para não bonificar).
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <ZonasAtendimentoManager />
              <CmeiZonasManager />
              <ZoneamentoPendenciasManager />
            </TabsContent>

            {/* Aba Documentos */}
            <TabsContent value="documentos" className="space-y-6 mt-6">
              <DocumentosTiposConfig />
              <RequerimentoSereTemplateConfigCard />
            </TabsContent>

            {/* Aba Aplicativos Móveis - apenas Superadmin */}
            {isSuperAdmin && (
              <TabsContent value="aplicativos" className="space-y-6 mt-6">
                {/* Informações do App */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      Configurações do Aplicativo
                    </CardTitle>
                    <CardDescription>
                      Configure as informações do aplicativo móvel (Android/iOS)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="app_nome">Nome do Aplicativo</Label>
                        <Input
                          id="app_nome"
                          value={appFields.app_nome}
                          onChange={(e) => setAppFields(prev => ({ ...prev, app_nome: e.target.value }))}
                          placeholder="VAGOU"
                        />
                        <p className="text-xs text-muted-foreground">
                          Nome exibido na loja de apps e na tela inicial do dispositivo
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="app_id">ID do Aplicativo (Bundle ID)</Label>
                        <Input
                          id="app_id"
                          value={appFields.app_id}
                          onChange={(e) => setAppFields(prev => ({ ...prev, app_id: e.target.value }))}
                          placeholder="app.prefeitura.vagou"
                        />
                        <p className="text-xs text-muted-foreground">
                          Identificador único nas lojas (ex: com.prefeitura.vagou)
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <AppIconUpload
                        label="Ícone do Aplicativo"
                        hint="PNG 512x512 recomendado"
                        currentUrl={effectiveConfigValue<string | null>("app_icone_url", null)}
                        onUploadSuccess={(url) => setPendingConfigUpdates((prev) => ({ ...prev, app_icone_url: url }))}
                        bucket="assets"
                        folder="app-icons"
                      />

                      <AppIconUpload
                        label="Splash Screen"
                        hint="PNG 1920x1920 recomendado"
                        currentUrl={effectiveConfigValue<string | null>("app_splash_url", null)}
                        onUploadSuccess={(url) => setPendingConfigUpdates((prev) => ({ ...prev, app_splash_url: url }))}
                        bucket="assets"
                        folder="app-splash"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Links de Download */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Links de Download
                    </CardTitle>
                    <CardDescription>
                      URLs para download direto e links das lojas de aplicativos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Android APK */}
                      <div className="space-y-4 p-4 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded bg-green-500/10 flex items-center justify-center">
                            <Smartphone className="h-4 w-4 text-green-600" />
                          </div>
                          <h3 className="font-medium">Android</h3>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>URL do APK (Download Direto)</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="https://storage.exemplo.com/app.apk"
                              value={appFields.app_android_url}
                              onChange={(e) => setAppFields(prev => ({ ...prev, app_android_url: e.target.value }))}
                            />
                            {appFields.app_android_url && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => navigator.clipboard.writeText(appFields.app_android_url)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Link da Google Play Store</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="https://play.google.com/store/apps/details?id=..."
                              value={appFields.app_playstore_url}
                              onChange={(e) => setAppFields(prev => ({ ...prev, app_playstore_url: e.target.value }))}
                            />
                            {appFields.app_playstore_url && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                asChild
                              >
                                <a href={appFields.app_playstore_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>

                        {(appFields.app_android_url || appFields.app_playstore_url) && (
                          <div className="flex justify-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-center space-y-2">
                              <QRCodeSVG
                                value={appFields.app_playstore_url || appFields.app_android_url}
                                size={120}
                                level="M"
                              />
                              <p className="text-xs text-muted-foreground">
                                <QrCode className="inline h-3 w-3 mr-1" />
                                QR Code Android
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* iOS */}
                      <div className="space-y-4 p-4 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded bg-blue-500/10 flex items-center justify-center">
                            <Smartphone className="h-4 w-4 text-blue-600" />
                          </div>
                          <h3 className="font-medium">iOS (iPhone/iPad)</h3>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>URL do TestFlight / IPA</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="https://testflight.apple.com/..."
                              value={appFields.app_ios_url}
                              onChange={(e) => setAppFields(prev => ({ ...prev, app_ios_url: e.target.value }))}
                            />
                            {appFields.app_ios_url && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => navigator.clipboard.writeText(appFields.app_ios_url)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Link da App Store</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="https://apps.apple.com/app/..."
                              value={appFields.app_appstore_url}
                              onChange={(e) => setAppFields(prev => ({ ...prev, app_appstore_url: e.target.value }))}
                            />
                            {appFields.app_appstore_url && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                asChild
                              >
                                <a href={appFields.app_appstore_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>

                        {(appFields.app_ios_url || appFields.app_appstore_url) && (
                          <div className="flex justify-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-center space-y-2">
                              <QRCodeSVG
                                value={appFields.app_appstore_url || appFields.app_ios_url}
                                size={120}
                                level="M"
                              />
                              <p className="text-xs text-muted-foreground">
                                <QrCode className="inline h-3 w-3 mr-1" />
                                QR Code iOS
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Instruções de Build */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Instruções de Build
                    </CardTitle>
                    <CardDescription>
                      Passo a passo para gerar o APK (Android) e IPA (iOS)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        O aplicativo funciona como um "wrapper" que carrega o sistema web. 
                        Atualizações no sistema refletem automaticamente no app, sem necessidade de gerar novo APK/IPA.
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Android */}
                      <div className="space-y-3">
                        <h3 className="font-medium flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                            Android
                          </Badge>
                          Gerar APK
                        </h3>
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm font-mono">
                          <p className="text-muted-foreground"># 1. Clone o projeto do GitHub</p>
                          <code className="block bg-background px-2 py-1 rounded text-xs">git clone [url-do-repo]</code>
                          
                          <p className="text-muted-foreground mt-3"># 2. Instale as dependências</p>
                          <code className="block bg-background px-2 py-1 rounded text-xs">npm install</code>
                          
                          <p className="text-muted-foreground mt-3"># 3. Adicione o Android</p>
                          <code className="block bg-background px-2 py-1 rounded text-xs">npx cap add android</code>
                          
                          <p className="text-muted-foreground mt-3"># 4. Sincronize</p>
                          <code className="block bg-background px-2 py-1 rounded text-xs">npx cap sync</code>
                          
                          <p className="text-muted-foreground mt-3"># 5. Abra no Android Studio</p>
                          <code className="block bg-background px-2 py-1 rounded text-xs">npx cap open android</code>
                          
                          <p className="text-muted-foreground mt-3"># 6. No Android Studio:</p>
                          <p className="text-xs">Build → Build Bundle(s) / APK(s) → Build APK(s)</p>
                        </div>
                      </div>

                      {/* iOS */}
                      <div className="space-y-3">
                        <h3 className="font-medium flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                            iOS
                          </Badge>
                          Gerar IPA (requer Mac)
                        </h3>
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm font-mono">
                          <p className="text-muted-foreground"># 1. Clone o projeto do GitHub</p>
                          <code className="block bg-background px-2 py-1 rounded text-xs">git clone [url-do-repo]</code>
                          
                          <p className="text-muted-foreground mt-3"># 2. Instale as dependências</p>
                          <code className="block bg-background px-2 py-1 rounded text-xs">npm install</code>
                          
                          <p className="text-muted-foreground mt-3"># 3. Adicione o iOS</p>
                          <code className="block bg-background px-2 py-1 rounded text-xs">npx cap add ios</code>
                          
                          <p className="text-muted-foreground mt-3"># 4. Sincronize</p>
                          <code className="block bg-background px-2 py-1 rounded text-xs">npx cap sync</code>
                          
                          <p className="text-muted-foreground mt-3"># 5. Abra no Xcode</p>
                          <code className="block bg-background px-2 py-1 rounded text-xs">npx cap open ios</code>
                          
                          <p className="text-muted-foreground mt-3"># 6. No Xcode:</p>
                          <p className="text-xs">Product → Archive → Distribute App</p>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="text-center text-sm text-muted-foreground">
                      <p>
                        Após gerar o APK/IPA, faça upload em um servidor e cole a URL acima para disponibilizar o QR Code de download.
                      </p>
                      <p className="mt-2">
                        Para publicar nas lojas oficiais, siga os processos do{" "}
                        <a href="https://play.google.com/console" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Google Play Console
                        </a>
                        {" "}e{" "}
                        <a href="https://appstoreconnect.apple.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          App Store Connect
                        </a>.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {isSuperAdmin && (
              <TabsContent value="dev" className="space-y-6 mt-6">
                <Card className="border-orange-500/50">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-orange-500" />
                      <CardTitle className="text-orange-600 dark:text-orange-400">
                        Ferramentas de Desenvolvimento
                      </CardTitle>
                    </div>
                    <CardDescription>
                      Use estas ferramentas para popular ou limpar o banco de dados de teste.
                      <strong className="text-destructive"> ATENÇÃO: Apenas para ambientes de desenvolvimento!</strong>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Gerar Dados Fictícios */}
                    <div className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Database className="h-5 w-5 text-blue-500" />
                          <h3 className="font-medium">Gerar Dados Fictícios</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Cria {plural}, turmas e crianças fictícias para testes. Inclui crianças matriculadas e na fila de espera.
                        </p>
                          <ul className="text-xs text-muted-foreground list-disc list-inside mt-2">
                          <li>4 {plural} com capacidades variadas</li>
                          <li>Turmas (Infantil 0 a 3) com letras (Ex: Infantil 0 A)</li>
                          <li>Crianças matriculadas em todos os(as) {plural}</li>
                          <li>50 crianças na fila de espera</li>
                        </ul>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setConfirmarGerarDialog(true)}
                        disabled={gerandoDados}
                        className="ml-4"
                      >
                        {gerandoDados ? (
                          <>
                            <Spinner className="mr-2 h-4 w-4 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <Database className="mr-2 h-4 w-4" />
                            Gerar Dados
                          </>
                        )}
                      </Button>
                    </div>

                    <Separator />

                    <div className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Trash2 className="h-5 w-5 text-destructive" />
                          <h3 className="font-medium">Excluir Dados Específicos</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Selecione um conjunto de dados para excluir individualmente.
                        </p>
                        <div className="mt-3 max-w-sm">
                          <Select value={selectedDeleteOption} onValueChange={(v: any) => setSelectedDeleteOption(v)}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Escolha o que excluir" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cmeis">{plural} (e suas turmas)</SelectItem>
                              <SelectItem value="turmas">Turmas</SelectItem>
                              <SelectItem value="criancas">Crianças</SelectItem>
                              <SelectItem value="historico">Histórico</SelectItem>
                              <SelectItem value="logs">Logs de Notificações</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-destructive font-medium mt-2">
                          Esta ação é irreversível.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setConfirmarExcluirEspecificoDialog(true)}
                        disabled={!selectedDeleteOption || excluindoEspecifico}
                        className="ml-4"
                      >
                        {excluindoEspecifico ? (
                          <>
                            <Spinner className="mr-2 h-4 w-4 animate-spin" />
                            Excluindo...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir Selecionado
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Trash2 className="h-5 w-5 text-destructive" />
                          <h3 className="font-medium">Excluir Todas as Crianças</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Remove apenas os registros de crianças e dados relacionados.
                        </p>
                        <p className="text-xs text-destructive font-medium mt-2">
                          Esta ação é irreversível.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setConfirmarExcluirCriancasDialog(true)}
                        disabled={excluindoCriancas}
                        className="ml-4"
                      >
                        {excluindoCriancas ? (
                          <>
                            <Spinner className="mr-2 h-4 w-4 animate-spin" />
                            Excluindo...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir Crianças
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Limpar Todos os Dados */}
                    <div className="flex items-start justify-between p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Trash2 className="h-5 w-5 text-destructive" />
                          <h3 className="font-medium text-destructive">Limpar Todos os Dados</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Remove TODOS os registros de {plural}, turmas, crianças, histórico e logs do banco de dados.
                        </p>
                        <p className="text-xs text-destructive font-medium mt-2">
                          ⚠️ Esta ação não pode ser desfeita! Configurações e usuários admin são preservados.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setConfirmarLimparDialog(true)}
                        disabled={limpandoDados}
                        className="ml-4"
                      >
                        {limpandoDados ? (
                          <>
                            <Spinner className="mr-2 h-4 w-4 animate-spin" />
                            Limpando...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Limpar Dados
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>

          {/* Actions - inline at end of form */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetAll}
              disabled={(!isDirty && !hasPendingChanges) || updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={(!isDirty && !hasPendingChanges) || updateMutation.isPending || !canEdit}>
              {updateMutation.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>

          {/* Sticky save bar - visible when there are unsaved changes */}
          {(isDirty || hasPendingChanges) && (
            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4">
                <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500/60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                  </span>
                  Você tem alterações não salvas
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetAll}
                    disabled={updateMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={updateMutation.isPending || !canEdit}
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </form>

        <TurmaBaseDialog
          open={turmaDialogOpen}
          onOpenChange={setTurmaDialogOpen}
          turma={selectedTurmaBase}
        />

        {/* Dialogs de Confirmação */}
        <AlertDialog open={confirmarGerarDialog} onOpenChange={setConfirmarGerarDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Gerar Dados Fictícios?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá criar dados de teste no banco de dados:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>4 CMEIs fictícios</li>
                  <li>Turmas Infantil 0 a 3 (Ex: Infantil 0 A)</li>
                  <li>Crianças matriculadas e na fila</li>
                </ul>
                <p className="mt-3 font-medium">
                  Os dados gerados são fictícios e podem ser removidos posteriormente.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={gerandoDados}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleGerarDadosFicticios} disabled={gerandoDados}>
                {gerandoDados ? 'Gerando...' : 'Confirmar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmarLimparDialog} onOpenChange={setConfirmarLimparDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">
                ⚠️ Limpar Todos os Dados?
              </AlertDialogTitle>
              <AlertDialogDescription>
                <p className="font-bold text-destructive mb-2">
                  ATENÇÃO: Esta ação é IRREVERSÍVEL!
                </p>
                <p>
                  Todos os seguintes dados serão PERMANENTEMENTE deletados:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Todos os CMEIs e suas turmas</li>
                  <li>Todas as crianças cadastradas</li>
                  <li>Todo o histórico de ações</li>
                  <li>Todos os logs de notificações</li>
                  <li>Registros de auditoria</li>
                </ul>
                <p className="mt-3 font-medium">
                  Apenas configurações do sistema e usuários admin serão preservados.
                </p>
                <p className="mt-2 text-destructive font-bold">
                  Deseja realmente continuar?
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={limpandoDados}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleLimparDados} 
                disabled={limpandoDados}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {limpandoDados ? 'Limpando...' : 'SIM, LIMPAR TUDO'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmarExcluirEspecificoDialog} onOpenChange={setConfirmarExcluirEspecificoDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">
                ⚠️ Excluir {getDeleteOptionLabel(selectedDeleteOption)}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {selectedDeleteOption === 'cmeis' && (
                  <p>Esta ação removerá todos os(as) {plural}, suas turmas associadas e limpará vínculos em crianças.</p>
                )}
                {selectedDeleteOption === 'turmas' && (
                  <p>Esta ação removerá todas as turmas e limpará referências de turma nas crianças.</p>
                )}
                {selectedDeleteOption === 'criancas' && (
                  <p>Esta ação removerá todas as crianças e dados associados.</p>
                )}
                {selectedDeleteOption === 'historico' && (
                  <p>Esta ação removerá todos os registros da tabela de histórico.</p>
                )}
                {selectedDeleteOption === 'logs' && (
                  <p>Esta ação removerá todos os registros de logs de notificações.</p>
                )}
                <p className="mt-3 text-destructive font-medium">Esta ação é irreversível. Deseja continuar?</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={excluindoEspecifico}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmExcluirEspecifico}
                disabled={excluindoEspecifico || !selectedDeleteOption}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {excluindoEspecifico ? 'Excluindo...' : 'Confirmar Exclusão'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmarExcluirCriancasDialog} onOpenChange={setConfirmarExcluirCriancasDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">
                ⚠️ Excluir todas as crianças?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá remover definitivamente todos os registros de crianças e dados associados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={excluindoCriancas}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleExcluirTodasCriancas}
                disabled={excluindoCriancas}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {excluindoCriancas ? 'Excluindo...' : 'SIM, EXCLUIR TUDO'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default Configuracoes;
