import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Spinner } from "@/components/common/Spinner";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Info, CheckCircle, Download, ArrowRight, ArrowLeft, Lock, MapPin, Search, User, Users, Home, Building, Phone, Mail, Baby, Calendar, CreditCard, Check, ClipboardCheck, Edit, FileText, Upload, AlertCircle, Copy, ChevronDown, Star } from "lucide-react";
import { useForm, type SubmitErrorHandler, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createInscricaoSchema, type InscricaoFormData, validarCEPPermitido } from "@/utils/validations/inscricao";
import { validarIdadeMaximaInscricao, validarIdadeMinimaInscricao } from "@/utils/validations/idade-inscricao";
import { useQuery } from "@tanstack/react-query";
import { useCreateInscricao, useConfiguracoes, useOcupacaoTurmasPublic, type InscricaoData } from "@/hooks/api/supabase-hooks";
import { maskCPF, maskPhone, maskCEP } from "@/utils/masks";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/utils/utils";
import { CONFIG_PADRAO, determinarTurmaBaseComCorte } from "@/utils/turma-utils";
import { differenceInMonths } from "date-fns";
import { DocumentosUpload, type DocumentoUpload } from "@/components/inscricao/DocumentosUpload";
import { useCMEIsComZonas, useZonasAtendimentoAtivas, useZoneamentoConfig, encontrarZonasEndereco, ordenarCMEIsPorZona, type CMEIComZonas } from "@/hooks/api/zonas-hooks";
import { Badge } from "@/components/ui/badge";
import { DynamicFormField, CAMPOS_ESPECIAIS, deveRenderizarDinamicamente } from "@/components/inscricao/DynamicFormField";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCamposInscricao, useSaveValoresCamposCustom, type CampoInscricao } from "@/hooks/api/campos-inscricao-hooks";
import { HCaptchaField, type HCaptchaFieldRef } from "@/components/captcha/HCaptchaField";
import { CMEIsMapSelector } from "@/components/inscricao/CMEIsMapSelector";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PRIORIDADES_FEDERAIS_PADRAO } from "@/constants/prioridades-federais";
import { useTiposPrioridadeAtivos, uploadDocumentoComprovantePrioridade } from "@/hooks/api/prioridades-hooks";
import { useDocumentosTiposAtivos } from "@/hooks/api/documentos-hooks";
import { useDebounce } from "@/hooks/use-debounce";
import { getUnidadeLabels } from "@/utils/unidade-utils";
// Componente Stepper
const stepsBase = [
  { id: 1, title: "Criança", icon: Baby },
  { id: 2, title: "Responsável", icon: Users },
  { id: 3, title: "Endereço", icon: Home },
  { id: 4, title: "Prioridade", icon: Star },
  { id: 5, title: "Unidade", icon: Building },
  { id: 6, title: "Revisão", icon: ClipboardCheck },
];

const OPCOES_COR_RACA = [
  { value: "amarela", label: "Amarela" },
  { value: "branca", label: "Branca" },
  { value: "indigena", label: "Indígena" },
  { value: "parda", label: "Parda" },
  { value: "preta", label: "Preta" },
  { value: "nao_declarada", label: "Não declarada" },
] as const;

const OPCOES_ETNIA_INDIGENA = [
  { value: "guarani", label: "Guarani" },
  { value: "kaingang", label: "Kaingang" },
  { value: "xeta", label: "Xetá" },
  { value: "xokleng", label: "Xokleng" },
  { value: "outra", label: "Outra" },
] as const;

const OPCOES_NACIONALIDADE = [
  { value: "brasileira", label: "Brasileira" },
  { value: "brasileira_naturalizado", label: "Brasileira – nascido no exterior ou naturalizado" },
  { value: "estrangeira", label: "Estrangeira" },
] as const;

const OPCOES_FORMA_OCUPACAO = [
  { value: "optou_nao_informar", label: "Optou em não informar" },
  { value: "propria", label: "Própria" },
  { value: "alugada", label: "Alugada" },
  { value: "cedida", label: "Cedida" },
  { value: "pensionato", label: "Pensionato" },
  { value: "casa_lar_abrigo", label: "Casa lar ou abrigo" },
  { value: "outro", label: "Outro" },
] as const;

const OPCOES_PARENTESCO = [
  { value: "pai", label: "Pai" },
  { value: "mae", label: "Mãe" },
  { value: "avo", label: "Avô" },
  { value: "avoa", label: "Avó" },
  { value: "tio", label: "Tio" },
  { value: "tia", label: "Tia" },
  { value: "padrasto", label: "Padrasto" },
  { value: "madrasta", label: "Madrasta" },
  { value: "irmao", label: "Irmão" },
  { value: "irma", label: "Irmã" },
  { value: "tutor_legal", label: "Tutor legal" },
  { value: "guardiao", label: "Guardião" },
  { value: "outro", label: "Outro" },
] as const;

interface StepperProps {
  steps: { id: number; title: string; icon: any }[];
  completedSteps: number[];
  activeStep: number;
  onStepClick: (step: number) => void;
}

const FormStepper = ({ steps, completedSteps, activeStep, onStepClick }: StepperProps) => {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between relative">
        {/* Linha de conexão */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-700 ease-out"
          style={{ width: `${((activeStep - 1) / (steps.length - 1)) * 100}%` }}
        />
        
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isActive = activeStep === step.id;
          const isPast = step.id < activeStep;
          const showCompleted = isPast && isCompleted;
          const Icon = step.icon;
          
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick(step.id)}
              className="flex flex-col items-center relative z-10 group"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ease-out",
                  showCompleted
                    ? "bg-primary border-primary text-primary-foreground scale-100"
                    : isActive
                    ? "bg-background border-primary text-primary scale-110 shadow-lg shadow-primary/20"
                    : isPast
                    ? "bg-background border-muted-foreground/40 text-muted-foreground"
                    : "bg-background border-muted-foreground/30 text-muted-foreground group-hover:border-primary/50 group-hover:scale-105"
                )}
              >
                {showCompleted ? (
                  <Check className="w-5 h-5 animate-scale-in" />
                ) : (
                  <Icon className={cn("w-4 h-4 transition-transform duration-300", isActive && "scale-110")} />
                )}
              </div>
              <span
                className={cn(
                  "text-xs mt-2 font-medium transition-all duration-300",
                  showCompleted || isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"
                )}
              >
                {step.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Wrapper para animação das etapas
const StepContent = ({ children, isActive }: { children: React.ReactNode; isActive: boolean }) => {
  if (!isActive) return null;
  
  return (
    <div className="animate-fade-in">
      {children}
    </div>
  );
};

const getTodayISODate = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Inscricao = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const maxDataNascimento = getTodayISODate();
  const { data: cmeisComZonas, isLoading: loadingCMEIs } = useCMEIsComZonas();
  const { data: zonasAtivas } = useZonasAtendimentoAtivas();
  const zoneamentoConfig = useZoneamentoConfig();
  const { data: config, isLoading: configLoading } = useConfiguracoes();
  const { data: ocupacaoTurmas, isLoading: isLoadingOcupacao } = useOcupacaoTurmasPublic();
  const { data: tiposPrioridadeAtivos } = useTiposPrioridadeAtivos();
  const { data: documentosTiposAtivos } = useDocumentosTiposAtivos();
  const configExtras = (config ?? {}) as unknown as Partial<{
    idade_maxima_anos: number;
    idade_minima_meses: number;
    data_corte_mes: number;
    data_corte_dia: number;
    mensagem_idade_fora_faixa: string;
    bloquear_novas_inscricoes: boolean;
    motivo_bloqueio_inscricoes: string;
    captcha_habilitado: boolean;
    captcha_site_key: string;
    limite_inscricoes_responsavel: number;
    preferencias_cmei_qtd: number;
    cpfhub_habilitado: boolean;
    apicpf_habilitado: boolean;
    notificacao_whatsapp_webhook_habilitado: boolean;
    notificacao_sms_webhook_habilitado: boolean;
    notificacao_email_webhook_habilitado: boolean;
  }>;
  const consultaCpfHabilitada = configExtras.cpfhub_habilitado === true || configExtras.apicpf_habilitado === true;
  const { singular, plural } = getUnidadeLabels(config as any);
  const steps = useMemo(
    () => stepsBase.map((s) => (s.id === 5 ? { ...s, title: singular } : s)),
    [singular]
  );
  const comprovacaoNaInscricao = (config as any)?.prioridades_comprovacao_na_inscricao ?? true;
  const prioridadeZonaBonusDentro = (config as any)?.prioridade_zona_bonus_dentro ?? 0;
  const prioridadeZonaBonusFora = (config as any)?.prioridade_zona_bonus_fora ?? 0;
  const createInscricao = useCreateInscricao();
  const saveValoresCustom = useSaveValoresCamposCustom();

  const isLocalDev =
    import.meta.env.DEV &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "0.0.0.0" ||
      window.location.hostname.endsWith(".local") ||
      window.location.hostname.startsWith("192.168.") ||
      window.location.hostname.startsWith("10.") ||
      window.location.hostname.startsWith("172.16.") ||
      window.location.hostname.startsWith("172.17.") ||
      window.location.hostname.startsWith("172.18.") ||
      window.location.hostname.startsWith("172.19.") ||
      window.location.hostname.startsWith("172.2") ||
      window.location.hostname.startsWith("172.30.") ||
      window.location.hostname.startsWith("172.31."));
  
  // Buscar campos dinâmicos por seção
  const { data: camposCrianca, isLoading: loadingCamposCrianca } = useCamposInscricao("crianca");
  const { data: camposResponsavel, isLoading: loadingCamposResponsavel } = useCamposInscricao("responsavel");
  const { data: camposEndereco, isLoading: loadingCamposEndereco } = useCamposInscricao("endereco");
  const { data: camposPreferencias, isLoading: loadingCamposPreferencias } = useCamposInscricao("preferencias");
  const { data: camposObservacoes } = useCamposInscricao("observacoes");

  const cpfCriancaObrigatorio =
    camposCrianca?.find((c) => c.nome_campo === "cpf_crianca")?.obrigatorio ?? false;
  
  // Filtrar campos dinâmicos (excluindo campos especiais que têm lógica própria)
  const camposDinamicosCrianca = useMemo(() => 
    camposCrianca?.filter(c => deveRenderizarDinamicamente(c.nome_campo) && !c.campo_sistema) || [],
    [camposCrianca]
  );
  const camposDinamicosResponsavel = useMemo(() => 
    camposResponsavel?.filter(c => deveRenderizarDinamicamente(c.nome_campo) && !c.campo_sistema) || [],
    [camposResponsavel]
  );
  const camposDinamicosEndereco = useMemo(() => 
    camposEndereco?.filter(c => deveRenderizarDinamicamente(c.nome_campo) && !c.campo_sistema) || [],
    [camposEndereco]
  );
  const camposDinamicosPreferencias = useMemo(() => 
    camposPreferencias?.filter(c => deveRenderizarDinamicamente(c.nome_campo) && !c.campo_sistema) || [],
    [camposPreferencias]
  );
  const camposDinamicosObservacoes = useMemo(() => 
    camposObservacoes?.filter(c => !c.campo_sistema) || [],
    [camposObservacoes]
  );

  const camposParaValidacao = useMemo(
    () => [
      ...(camposCrianca || []),
      ...(camposResponsavel || []),
      ...(camposEndereco || []),
      ...(camposPreferencias || []),
      ...(camposObservacoes || []),
    ],
    [camposCrianca, camposResponsavel, camposEndereco, camposPreferencias, camposObservacoes]
  );

  const todosOsCamposCustom = useMemo(
    () =>
      [
        ...(camposDinamicosCrianca || []),
        ...(camposDinamicosResponsavel || []),
        ...(camposDinamicosEndereco || []),
        ...(camposDinamicosPreferencias || []),
        ...(camposDinamicosObservacoes || []),
      ].filter((c) => !c.campo_sistema),
    [
      camposDinamicosCrianca,
      camposDinamicosResponsavel,
      camposDinamicosEndereco,
      camposDinamicosPreferencias,
      camposDinamicosObservacoes,
    ]
  );

  const schemaRef = useRef(createInscricaoSchema([]));
  useEffect(() => {
    schemaRef.current = createInscricaoSchema(camposParaValidacao);
  }, [camposParaValidacao]);

  const resolver = useCallback(
    async (...args: Parameters<ReturnType<typeof zodResolver>>) => {
      return zodResolver(schemaRef.current)(...args);
    },
    []
  );
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [criancaId, setCriancaId] = useState<string | null>(null);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [buscandoCpf, setBuscandoCpf] = useState(false);
  const [buscandoCpfCrianca, setBuscandoCpfCrianca] = useState(false);
  const [buscandoCpfFiliacao1, setBuscandoCpfFiliacao1] = useState(false);
  const [buscandoCpfFiliacao2, setBuscandoCpfFiliacao2] = useState(false);
  const [cpfPreenchido, setCpfPreenchido] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [showErrorsByStep, setShowErrorsByStep] = useState<Record<number, boolean>>({});
  const [temPrioridadeResposta, setTemPrioridadeResposta] = useState<"sim" | "nao" | null>(null);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [pendingDocumentos, setPendingDocumentos] = useState<DocumentoUpload[]>([]);
  const [docsOpen, setDocsOpen] = useState(false);
  const [comprovantesPrioridade, setComprovantesPrioridade] = useState<Record<string, File | null>>({});
  const captchaRef = useRef<HCaptchaFieldRef>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
    getValues,
    setFocus,
    setError,
    clearErrors,
    getFieldState,
  } = useForm<InscricaoFormData & Record<string, unknown>>({
    resolver,
    defaultValues: {
      aceita_qualquer_cmei: false,
      programas_sociais: false,
      zona_atendimento_id: "",
      cmei3_preferencia: "",
      canal_notificacao_preferido: "" as "email" | "sms" | "whatsapp",
    },
  });

  // Watch form fields para calcular progresso
  const watchedFields = watch();

  useEffect(() => {
    const corAuto = String((watchedFields as any).cor_raca_autodeclarada || "");
    const corCert = String((watchedFields as any).cor_raca_certidao || "");
    const isIndigena = corAuto === "indigena" || corCert === "indigena";

    if (isIndigena) return;

    const etnia = (watchedFields as any).etnia_indigena;
    const etniaOutra = (watchedFields as any).etnia_indigena_outra;

    if (etnia !== undefined && String(etnia).trim().length > 0) {
      setValue("etnia_indigena" as any, undefined, { shouldDirty: true, shouldValidate: false });
    }
    if (etniaOutra !== undefined && String(etniaOutra).trim().length > 0) {
      setValue("etnia_indigena_outra" as any, "", { shouldDirty: true, shouldValidate: false });
    }
    clearErrors(["etnia_indigena" as any, "etnia_indigena_outra" as any]);
  }, [
    clearErrors,
    setValue,
    (watchedFields as any).cor_raca_autodeclarada,
    (watchedFields as any).cor_raca_certidao,
    (watchedFields as any).etnia_indigena,
    (watchedFields as any).etnia_indigena_outra,
  ]);

  useEffect(() => {
    const nacionalidade = String((watchedFields as any).nacionalidade || "");
    if (nacionalidade === "estrangeira") return;

    const possuiDocumentos = (watchedFields as any).estrangeiro_possui_documentos;
    if (possuiDocumentos !== undefined && String(possuiDocumentos).trim().length > 0) {
      setValue("estrangeiro_possui_documentos" as any, undefined, { shouldDirty: true, shouldValidate: false });
    }
    clearErrors(["estrangeiro_possui_documentos" as any]);
  }, [clearErrors, setValue, (watchedFields as any).nacionalidade, (watchedFields as any).estrangeiro_possui_documentos]);

  useEffect(() => {
    const quilombo = String((watchedFields as any).quilombo_remanescente || "");
    if (quilombo === "sim") return;

    const nome = (watchedFields as any).quilombo_nome;
    if (nome !== undefined && String(nome).trim().length > 0) {
      setValue("quilombo_nome" as any, "", { shouldDirty: true, shouldValidate: false });
    }
    clearErrors(["quilombo_nome" as any]);
  }, [clearErrors, setValue, (watchedFields as any).quilombo_remanescente, (watchedFields as any).quilombo_nome]);

  const campoVisivel = (campo: CampoInscricao) => {
    if (!campo.depende_de || !campo.depende_valor) return true;
    const depValue = (watchedFields as any)[campo.depende_de] as unknown;
    if (depValue === null || depValue === undefined) return false;
    const esperado = String(campo.depende_valor).trim().toLowerCase();
    const atual = typeof depValue === "boolean" ? String(depValue) : String(depValue).trim().toLowerCase();
    return atual === esperado;
  };

  const canaisNotificacaoDisponiveis = useMemo(() => {
    const cfg = config as any;
    const opcoes: Array<{ value: "whatsapp" | "sms" | "email"; label: string }> = [];
    if (cfg?.notificacao_whatsapp_webhook_habilitado) opcoes.push({ value: "whatsapp", label: "WhatsApp" });
    if (cfg?.notificacao_sms_webhook_habilitado) opcoes.push({ value: "sms", label: "SMS" });
    if (cfg?.notificacao_email_webhook_habilitado) opcoes.push({ value: "email", label: "E-mail" });
    return opcoes;
  }, [config]);

  useEffect(() => {
    if (canaisNotificacaoDisponiveis.length === 0) return;
    const atual = String(getValues("canal_notificacao_preferido" as any) || "");
    const valido = canaisNotificacaoDisponiveis.some((o) => o.value === atual);
    if (!valido) {
      setValue("canal_notificacao_preferido" as any, canaisNotificacaoDisponiveis[0].value, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [canaisNotificacaoDisponiveis, getValues, setValue]);

  useEffect(() => {
    if (activeStep === 4) return;
    if (!showErrorsByStep[activeStep]) return;

    const isBlankValue = (value: unknown) => {
      if (value === null || value === undefined) return true;
      if (typeof value === "string") return value.trim().length === 0;
      return false;
    };

    const camposPorEtapa: Record<number, { campos?: CampoInscricao[]; loading?: boolean }> = {
      1: { campos: camposCrianca, loading: loadingCamposCrianca },
      2: { campos: camposResponsavel, loading: loadingCamposResponsavel },
      3: { campos: camposEndereco, loading: loadingCamposEndereco },
      5: { campos: camposPreferencias, loading: loadingCamposPreferencias },
    };

    const { campos, loading } = camposPorEtapa[activeStep] || {};
    if (loading) return;

    (campos || [])
      .filter((c) => c.obrigatorio)
      .forEach((c) => {
        const name = c.nome_campo as any;
        const value = getValues(name);
        const missing = c.tipo === "checkbox" ? value !== true : isBlankValue(value);
        const state = getFieldState(name);

        if (state.error?.type === "required") {
          if (!missing) clearErrors(name);
        }
      });
  }, [
    activeStep,
    watchedFields,
    showErrorsByStep,
    camposCrianca,
    camposResponsavel,
    camposEndereco,
    camposPreferencias,
    loadingCamposCrianca,
    loadingCamposResponsavel,
    loadingCamposEndereco,
    loadingCamposPreferencias,
    getValues,
    clearErrors,
    getFieldState,
  ]);

  const prioridadeIdsRaw = (watchedFields as any).prioridades_ids as unknown;
  const prioridadeIds = Array.isArray(prioridadeIdsRaw) ? (prioridadeIdsRaw as string[]) : [];
  const temPrioridade =
    temPrioridadeResposta === null ? undefined : temPrioridadeResposta === "sim";

  const itensPrioridadeFederais = useMemo(() => {
    const tipos = tiposPrioridadeAtivos || [];
    return PRIORIDADES_FEDERAIS_PADRAO.map((seed) => ({
      seed,
      tipo: tipos.find((t) => t.codigo === seed.codigo),
    }));
  }, [tiposPrioridadeAtivos]);

  const itensPrioridadeFederaisPorGrupo = useMemo(() => {
    const grupos = {
      economica: [] as typeof itensPrioridadeFederais,
      vulnerabilidade: [] as typeof itensPrioridadeFederais,
      familiar_territorial: [] as typeof itensPrioridadeFederais,
    };

    itensPrioridadeFederais.forEach((i) => {
      grupos[i.seed.grupo].push(i);
    });

    const ordenar = (a: (typeof itensPrioridadeFederais)[number], b: (typeof itensPrioridadeFederais)[number]) =>
      (a.seed.ordem || 0) - (b.seed.ordem || 0);

    return [
      { key: "economica" as const, titulo: "Situação Econômica", itens: grupos.economica.sort(ordenar) },
      {
        key: "vulnerabilidade" as const,
        titulo: "Situações de Vulnerabilidade",
        itens: grupos.vulnerabilidade.sort(ordenar),
      },
      {
        key: "familiar_territorial" as const,
        titulo: "Organização Familiar e Territorial",
        itens: grupos.familiar_territorial.sort(ordenar),
      },
    ].filter((g) => g.itens.length > 0);
  }, [itensPrioridadeFederais]);

  const prioridadesFederaisSelecionadas = useMemo(() => {
    return itensPrioridadeFederais.filter((i) => i.tipo?.id && prioridadeIds.includes(i.tipo.id));
  }, [itensPrioridadeFederais, prioridadeIds]);

  const docNomePorId = useMemo(() => {
    const map = new Map<string, string>();
    (documentosTiposAtivos || []).forEach((d) => map.set(d.id, d.nome));
    return map;
  }, [documentosTiposAtivos]);

  const documentoTipoIdsObrigatoriosPorPrioridade = useMemo(() => {
    const ids = new Set<string>();
    prioridadesFederaisSelecionadas.forEach((i) => {
      const exige = !!i.tipo?.exige_documento;
      const docId = i.tipo?.documento_tipo_id;
      if (exige && docId) ids.add(docId);
    });
    return [...ids];
  }, [prioridadesFederaisSelecionadas]);

  const documentoTipoIdsObrigatoriosMunicipio = useMemo(() => {
    return (documentosTiposAtivos || []).filter((d) => d.obrigatorio).map((d) => d.id);
  }, [documentosTiposAtivos]);

  const documentoTipoIdsObrigatoriosMatricula = useMemo(() => {
    const ids = new Set<string>(documentoTipoIdsObrigatoriosMunicipio);
    documentoTipoIdsObrigatoriosPorPrioridade.forEach((id) => ids.add(id));
    return [...ids];
  }, [documentoTipoIdsObrigatoriosMunicipio, documentoTipoIdsObrigatoriosPorPrioridade]);

  const documentosObrigatoriosMatriculaTexto = useMemo(() => {
    const nomes = documentoTipoIdsObrigatoriosMatricula
      .map((id) => docNomePorId.get(id))
      .filter(Boolean) as string[];
    if (nomes.length === 0) return null;
    return nomes.join(", ");
  }, [documentoTipoIdsObrigatoriosMatricula, docNomePorId]);
  
  // Validação em tempo real da idade
  const validacaoIdadeRealTime = useMemo(() => {
    if (!watchedFields.data_nascimento) return null;
    
    const configIdade = {
      idade_maxima_anos: configExtras.idade_maxima_anos,
      idade_minima_meses: configExtras.idade_minima_meses,
      data_corte_mes: configExtras.data_corte_mes,
      data_corte_dia: configExtras.data_corte_dia,
    };
    
    const validacaoMaxima = validarIdadeMaximaInscricao(watchedFields.data_nascimento, configIdade);
    const validacaoMinima = validarIdadeMinimaInscricao(watchedFields.data_nascimento, configIdade);
    
    return {
      bloqueadoMaximo: !validacaoMaxima.valido,
      mensagemMaximo: configExtras.mensagem_idade_fora_faixa || 
        "A criança informada está fora da faixa etária permitida para inscrição. Por favor, procure a Secretaria de Educação para mais informações.",
      abaixoMinimo: validacaoMinima.abaixoMinimo,
      mesesFaltando: validacaoMinima.mesesFaltando,
      idadeMeses: validacaoMinima.idadeMeses,
      idadeMinimaMeses: validacaoMinima.idadeMinimaMeses,
    };
  }, [watchedFields.data_nascimento, configExtras]);

  const turmaCompativel = useMemo(() => {
    if (!watchedFields.data_nascimento) return null;

    const configCorte = {
      data_corte_mes: configExtras.data_corte_mes ?? CONFIG_PADRAO.data_corte_mes,
      data_corte_dia: configExtras.data_corte_dia ?? CONFIG_PADRAO.data_corte_dia,
      idade_minima_meses: configExtras.idade_minima_meses ?? CONFIG_PADRAO.idade_minima_meses,
      idade_maxima_anos: configExtras.idade_maxima_anos ?? CONFIG_PADRAO.idade_maxima_anos,
    };

    return determinarTurmaBaseComCorte(watchedFields.data_nascimento, configCorte);
  }, [watchedFields.data_nascimento, configExtras]);

  const turmaBaseFiltro = useMemo(() => {
    if (!turmaCompativel) return null;
    return /^Infantil\s+\d+$/.test(turmaCompativel) ? turmaCompativel : null;
  }, [turmaCompativel]);

  const idadeMesesNaCorte = useMemo(() => {
    if (!watchedFields.data_nascimento) return null;

    const nasc = new Date(`${watchedFields.data_nascimento}T00:00:00`);
    if (Number.isNaN(nasc.getTime())) return null;

    const mesCorte = configExtras.data_corte_mes ?? CONFIG_PADRAO.data_corte_mes;
    const diaCorte = configExtras.data_corte_dia ?? CONFIG_PADRAO.data_corte_dia;
    const anoAlvo = new Date().getFullYear();
    const dataCorte = new Date(anoAlvo, mesCorte - 1, diaCorte);

    const meses = differenceInMonths(dataCorte, nasc);
    return Math.max(0, meses);
  }, [watchedFields.data_nascimento, configExtras]);

  const { data: turmasAtivasMin } = useQuery({
    queryKey: ["turmas-ativas-cmei-faixa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turmas")
        .select("cmei_id, idade_minima, idade_maxima")
        .eq("ativo", true);

      if (error) throw error;
      return (data || []) as { cmei_id: string | null; idade_minima: number | null; idade_maxima: number | null }[];
    },
    staleTime: 300000,
  });

  const cmeiIdsCompativeis = useMemo(() => {
    if (!watchedFields.data_nascimento) return null;
    if (idadeMesesNaCorte === null) return null;
    if (!turmasAtivasMin) return new Set<string>();

    const ids = new Set<string>();
    for (const t of turmasAtivasMin) {
      if (!t.cmei_id) continue;
      const min = t.idade_minima ?? 0;
      const max = t.idade_maxima ?? Number.POSITIVE_INFINITY;
      if (idadeMesesNaCorte >= min && idadeMesesNaCorte <= max) ids.add(t.cmei_id);
    }
    return ids;
  }, [watchedFields.data_nascimento, idadeMesesNaCorte, turmasAtivasMin]);
  
  // Calcula etapas completas baseado nos campos preenchidos
  const completedSteps = useMemo(() => {
    const completed: number[] = [];

    const record = watchedFields as unknown as Record<string, unknown>;

    const isFilled = (fieldValue: unknown) => {
      if (fieldValue === null || fieldValue === undefined) return false;
      if (typeof fieldValue === "string") return fieldValue.trim().length > 0;
      if (typeof fieldValue === "boolean") return fieldValue === true;
      if (typeof fieldValue === "number") return Number.isFinite(fieldValue);
      return true;
    };

    const requiredFieldsFilled = (campos: CampoInscricao[] | undefined) => {
      return (campos || [])
        .filter((c) => c.obrigatorio)
        .every((c) => isFilled(record[c.nome_campo]));
    };
    
    // Step 1: Criança - nome, data_nascimento, sexo
    const step1Complete = !!(
      watchedFields.nome &&
      watchedFields.data_nascimento &&
      watchedFields.sexo &&
      requiredFieldsFilled(camposCrianca)
    );
    if (step1Complete) completed.push(1);
    
    // Step 2: Responsável - nome, cpf, telefone
    const step2Complete = !!(
      watchedFields.responsavel_nome &&
      watchedFields.responsavel_cpf &&
      watchedFields.responsavel_telefone &&
      requiredFieldsFilled(camposResponsavel)
    );
    if (step2Complete) completed.push(2);
    
    // Step 3: Endereço - CEP obrigatório
    const step3Complete = !!(
      watchedFields.cep &&
      requiredFieldsFilled(camposEndereco)
    );
    if (step3Complete) completed.push(3);
    
    // Step 4: Prioridades - precisa responder se tem critério; se sim, selecionar pelo menos 1; se a comprovação for na inscrição, anexar comprovantes exigidos
    const step4Complete =
      temPrioridade === false ||
      (temPrioridade === true &&
        prioridadesFederaisSelecionadas.length > 0 &&
        (!comprovacaoNaInscricao ||
          prioridadesFederaisSelecionadas
            .filter((i) => i.seed.exige_documento)
            .every((i) => {
              const tipoId = i.tipo?.id;
              return !!tipoId && !!comprovantesPrioridade[tipoId];
            })));
    if (step4Complete) completed.push(4);

    // Step 5: unidade - pelo menos 1ª opção ou aceita qualquer
    const step5Complete = !!(
      (watchedFields.cmei1_preferencia || watchedFields.aceita_qualquer_cmei) &&
      watchedFields["periodo"] &&
      requiredFieldsFilled(camposPreferencias)
    );
    if (step5Complete) completed.push(5);
    
    return completed;
  }, [
    watchedFields,
    comprovacaoNaInscricao,
    prioridadesFederaisSelecionadas,
    comprovantesPrioridade,
    temPrioridade,
    camposCrianca,
    camposResponsavel,
    camposEndereco,
    camposPreferencias,
  ]);

  // Detectar zona do endereço e ordenar unidades
  const { zonasDetectadas, cmeisOrdenados } = useMemo(() => {
    const bairro = watchedFields.bairro;
    const cep = watchedFields.cep;
    
    if (!zonasAtivas || !cmeisComZonas) {
      return { zonasDetectadas: [], cmeisOrdenados: cmeisComZonas || [] };
    }

    // Se zoneamento não está habilitado, retorna lista normal
    if (!zoneamentoConfig.habilitado) {
      return { zonasDetectadas: [], cmeisOrdenados: cmeisComZonas };
    }

    const zonas = encontrarZonasEndereco(bairro || null, cep || null, zonasAtivas);
    const ordenados = ordenarCMEIsPorZona(cmeisComZonas, zonas);
    
    return { zonasDetectadas: zonas, cmeisOrdenados: ordenados };
  }, [
    watchedFields.bairro,
    watchedFields.cep,
    zonasAtivas,
    cmeisComZonas,
    zoneamentoConfig.habilitado,
  ]);

  useEffect(() => {
    if (!zoneamentoConfig.habilitado) {
      setValue("zona_atendimento_id" as any, "");
      return;
    }

    if (zonasDetectadas.length === 1) {
      setValue("zona_atendimento_id" as any, zonasDetectadas[0].id);
      return;
    }

    setValue("zona_atendimento_id" as any, "");
  }, [zoneamentoConfig.habilitado, zonasDetectadas, setValue]);

  const enderecoReportKey = useMemo(() => {
    const cep = String(watchedFields.cep || "").trim();
    const bairro = String(watchedFields.bairro || "").trim();
    const cidade = String(watchedFields.cidade || "").trim();
    const estado = String(watchedFields.estado || "").trim();
    return [cep, bairro, cidade, estado].join("|");
  }, [watchedFields.cep, watchedFields.bairro, watchedFields.cidade, watchedFields.estado]);

  const { debouncedValue: enderecoReportKeyDebounced } = useDebounce(enderecoReportKey, 900);
  const lastEnderecoReportRef = useRef<string>("");

  useEffect(() => {
    if (!zoneamentoConfig.habilitado) return;
    if (!zonasAtivas || !cmeisComZonas) return;
    if (zonasDetectadas.length > 0) return;

    const [cep, bairro, cidade, estado] = enderecoReportKeyDebounced.split("|");
    const bairroLimpo = (bairro || "").trim().replace(/\s+/g, " ");
    const cidadeLimpo = (cidade || "").trim().replace(/\s+/g, " ");
    const estadoLimpo = (estado || "").trim().slice(0, 2);
    const cepLimpo = (cep || "").replace(/\D/g, "");

    if (bairroLimpo.length < 3) return;
    if (cepLimpo.length > 0 && cepLimpo.length < 8) return;

    const reportKey = `${bairroLimpo.toLowerCase()}|${cidadeLimpo.toLowerCase()}|${estadoLimpo.toLowerCase()}`;
    if (lastEnderecoReportRef.current === reportKey) return;
    lastEnderecoReportRef.current = reportKey;

    supabase.rpc("report_bairro_nao_mapeado", {
      p_bairro: bairroLimpo,
      p_cep: cepLimpo.length > 0 ? cepLimpo : null,
      p_cidade: cidadeLimpo.length > 0 ? cidadeLimpo : null,
      p_estado: estadoLimpo.length > 0 ? estadoLimpo : null,
      p_origem: "public",
      p_crianca_id: null,
    } as any);
  }, [
    zoneamentoConfig.habilitado,
    zonasAtivas,
    cmeisComZonas,
    zonasDetectadas.length,
    enderecoReportKeyDebounced,
  ]);

  const cmeisOrdenadosFiltrados = useMemo(() => {
    if (!cmeisOrdenados) return [];
    if (!cmeiIdsCompativeis) return cmeisOrdenados;
    return cmeisOrdenados.filter((c) => cmeiIdsCompativeis.has(c.id));
  }, [cmeisOrdenados, cmeiIdsCompativeis]);

  useEffect(() => {
    if (!cmeiIdsCompativeis) return;

    if (watchedFields.cmei1_preferencia && !cmeiIdsCompativeis.has(watchedFields.cmei1_preferencia)) {
      setValue("cmei1_preferencia", "");
      setValue("cmei2_preferencia", "");
      setValue("cmei3_preferencia" as any, "");
      return;
    }

    if (watchedFields.cmei2_preferencia && !cmeiIdsCompativeis.has(watchedFields.cmei2_preferencia)) {
      setValue("cmei2_preferencia", "");
    }

    const cmei3 = (watchedFields as any).cmei3_preferencia as string | undefined;
    if (cmei3 && !cmeiIdsCompativeis.has(cmei3)) {
      setValue("cmei3_preferencia" as any, "");
    }
  }, [
    cmeiIdsCompativeis,
    watchedFields.cmei1_preferencia,
    watchedFields.cmei2_preferencia,
    (watchedFields as any).cmei3_preferencia,
    setValue,
  ]);

  useEffect(() => {
    if ((configExtras.preferencias_cmei_qtd ?? 2) !== 2) return;
    if (!(watchedFields as any).cmei3_preferencia) return;
    setValue("cmei3_preferencia" as any, "");
  }, [configExtras.preferencias_cmei_qtd, (watchedFields as any).cmei3_preferencia, setValue]);

  // Set de IDs das zonas detectadas para verificação rápida
  const zonasDetectadasIds = useMemo(() => 
    new Set(zonasDetectadas.map(z => z.id)), 
    [zonasDetectadas]
  );

  // Função auxiliar para verificar se a unidade está na zona do usuário
  const cmeiEstaNaZona = (cmei: CMEIComZonas) => {
    return cmei.zonas?.some(z => zonasDetectadasIds.has(z.zona_id)) || false;
  };

  // Obter ocupação para uma turma específica de uma unidade
  const getOcupacaoCmeiTurmas = (cmeiId: string) => {
    if (!ocupacaoTurmas || !turmaCompativel) return null;
    
    // Se a criança ainda não atingiu a idade mínima ou está fora da faixa, não mostra ocupação de turma
    if (!/^Infantil\s+\d+$/.test(turmaCompativel)) return null;

    // Filtrar turmas da unidade que atendem a turma compatível da criança
    const turmasCmei = ocupacaoTurmas.filter(t => 
      t.cmei_id === cmeiId && 
      t.turma_base === turmaCompativel
    );

    if (turmasCmei.length === 0) return null;

    return turmasCmei.map(t => ({
      id: t.id,
      nome: t.nome,
      vagas: Math.max(0, (t.capacidade || 0) - (t.ocupados || 0)),
      capacidade: t.capacidade || 0,
      ocupados: t.ocupados || 0,
      percentual: t.percentual || 0,
      temVagas: (t.ocupados || 0) < (t.capacidade || 0),
      turmaBase: t.turma_base,
      turno: t.turno
    }));
  };

  // Validação por etapa antes de avançar
  const lastFieldsToValidateRef = useRef<string[]>([]);
  const validateCurrentStep = async () => {
    const fieldsToValidate: string[] = [];
    lastFieldsToValidateRef.current = [];

    const isBlankValue = (value: unknown) => {
      if (value === null || value === undefined) return true;
      if (typeof value === "string") return value.trim().length === 0;
      return false;
    };

    const campoAtendeCondicao = (campo: CampoInscricao) => {
      if (!campo.depende_de || !campo.depende_valor) return true;
      const depValue = getValues(campo.depende_de as any) as unknown;
      if (depValue === null || depValue === undefined) return false;
      const esperado = String(campo.depende_valor).trim().toLowerCase();
      const atual = typeof depValue === "boolean" ? String(depValue) : String(depValue).trim().toLowerCase();
      return atual === esperado;
    };

    const enforceRequired = (campos: CampoInscricao[] | undefined) => {
      let ok = true;
      (campos || [])
        .filter((c) => c.obrigatorio && campoAtendeCondicao(c))
        .forEach((c) => {
          const value = getValues(c.nome_campo as any);
          const missing = c.tipo === "checkbox" ? value !== true : isBlankValue(value);
          if (!missing) {
            clearErrors(c.nome_campo as any);
            return;
          }
          ok = false;
          setError(c.nome_campo as any, {
            type: "required",
            message: c.validacao?.mensagem_erro || `${c.label} é obrigatório`,
          });
        });
      return ok;
    };

    const addObrigatorios = (campos: CampoInscricao[] | undefined) => {
      (campos || [])
        .filter((c) => c.obrigatorio && campoAtendeCondicao(c))
        .forEach((c) => fieldsToValidate.push(c.nome_campo));
    };
    
    switch (activeStep) {
      case 1: {
        if (loadingCamposCrianca) {
          toast.error("Carregando campos do formulário...");
          return false;
        }
        fieldsToValidate.push(
          "nome",
          "data_nascimento",
          "sexo",
          "cor_raca_autodeclarada",
          "cor_raca_certidao",
          "nacionalidade",
          "quilombo_remanescente",
        );
        const corAuto = getValues("cor_raca_autodeclarada" as any);
        const corCert = getValues("cor_raca_certidao" as any);
        if (corAuto === "indigena" || corCert === "indigena") {
          fieldsToValidate.push("etnia_indigena");
          if (getValues("etnia_indigena" as any) === "outra") {
            fieldsToValidate.push("etnia_indigena_outra");
          }
        }
        if (getValues("quilombo_remanescente" as any) === "sim") {
          fieldsToValidate.push("quilombo_nome");
        }
        if (getValues("nacionalidade" as any) === "estrangeira") {
          fieldsToValidate.push("estrangeiro_possui_documentos");
        }
        const requiredCriancaOk = enforceRequired(camposCrianca);
        addObrigatorios(camposCrianca);
        lastFieldsToValidateRef.current = fieldsToValidate;
        if (fieldsToValidate.length === 0) return requiredCriancaOk;
        return (await trigger(fieldsToValidate)) && requiredCriancaOk;
      }
      case 2: {
        if (loadingCamposResponsavel) {
          toast.error("Carregando campos do formulário...");
          return false;
        }
        fieldsToValidate.push(
          "responsavel_nome",
          "responsavel_cpf",
          "responsavel_telefone",
          "responsavel_parentesco",
          "filiacao1_nao_declarada",
          "filiacao2_nao_declarada",
        );
        if (getValues("responsavel_parentesco" as any) === "outro") {
          fieldsToValidate.push("responsavel_parentesco_outro");
        }
        if (getValues("filiacao1_nao_declarada" as any) !== true) {
          fieldsToValidate.push("filiacao1_nome", "filiacao1_cpf", "filiacao1_celular");
        }
        if (getValues("filiacao2_nao_declarada" as any) !== true) {
          fieldsToValidate.push("filiacao2_nome", "filiacao2_cpf", "filiacao2_celular");
        }
        if (canaisNotificacaoDisponiveis.length > 0) {
          fieldsToValidate.push("canal_notificacao_preferido");
          if (getValues("canal_notificacao_preferido" as any) === "email") {
            fieldsToValidate.push("responsavel_email");
          }
        }
        const requiredResponsavelOk = enforceRequired(camposResponsavel);
        addObrigatorios(camposResponsavel);
        lastFieldsToValidateRef.current = fieldsToValidate;
        if (fieldsToValidate.length === 0) return requiredResponsavelOk;
        return (await trigger(fieldsToValidate)) && requiredResponsavelOk;
      }
      case 3: {
        if (loadingCamposEndereco) {
          toast.error("Carregando campos do formulário...");
          return false;
        }
        fieldsToValidate.push("cep", "unidade_consumidora", "forma_ocupacao_moradia");
        if (getValues("forma_ocupacao_moradia" as any) === "outro") {
          fieldsToValidate.push("forma_ocupacao_moradia_outro");
        }
        const requiredEnderecoOk = enforceRequired(camposEndereco);
        addObrigatorios(camposEndereco);
        lastFieldsToValidateRef.current = fieldsToValidate;
        if (fieldsToValidate.length === 0) return requiredEnderecoOk;
        return (await trigger(fieldsToValidate)) && requiredEnderecoOk;
      }
      case 4: {
        lastFieldsToValidateRef.current = [];
        if (temPrioridade === undefined) {
          toast.error("Informe se a criança ou responsável se enquadram em algum critério de prioridade.");
          return false;
        }

        if (temPrioridade === false) return true;

        if (prioridadesFederaisSelecionadas.length === 0) {
          toast.error("Selecione pelo menos um critério de prioridade.");
          return false;
        }

        if (!comprovacaoNaInscricao) return true;

        const faltando = prioridadesFederaisSelecionadas
          .filter((i) => i.seed.exige_documento)
          .filter((i) => {
            const tipoId = i.tipo?.id;
            return !tipoId || !comprovantesPrioridade[tipoId];
          });

        if (faltando.length > 0) {
          toast.error(`Envie o comprovante para: ${faltando.map((i) => i.seed.nome).join(", ")}`, { duration: 6000 });
          return false;
        }

        return true;
      }
      case 5: {
        if (loadingCamposPreferencias) {
          toast.error("Carregando campos do formulário...");
          return false;
        }
        fieldsToValidate.push("periodo");
        const requiredPreferenciasOk = enforceRequired(camposPreferencias);
        addObrigatorios(camposPreferencias);
        lastFieldsToValidateRef.current = fieldsToValidate;
        if (fieldsToValidate.length === 0) return requiredPreferenciasOk;
        return (await trigger(fieldsToValidate)) && requiredPreferenciasOk;
      }
    }
    
    if (fieldsToValidate.length === 0) return true;
    lastFieldsToValidateRef.current = fieldsToValidate;
    return await trigger(fieldsToValidate);
  };

  const handleNextStep = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && activeStep < steps.length) {
      setActiveStep(activeStep + 1);
    } else if (!isValid) {
      setShowErrorsByStep((prev) => ({ ...prev, [activeStep]: true }));
      const fields = lastFieldsToValidateRef.current;
      const firstInvalid = fields.find((name) => getFieldState(name as any).invalid);
      const message = firstInvalid ? getFieldState(firstInvalid as any).error?.message : undefined;
      toast.error(message || "Preencha os campos obrigatórios antes de continuar");
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleStepClick = (step: number) => {
    // Permite voltar para qualquer etapa anterior
    if (step < activeStep) {
      setActiveStep(step);
    }
    // Para avançar, precisa ter completado as etapas anteriores
    else if (step > activeStep && completedSteps.includes(activeStep)) {
      validateCurrentStep().then((ok) => {
        if (ok) setActiveStep(step);
        else {
          setShowErrorsByStep((prev) => ({ ...prev, [activeStep]: true }));
          toast.error("Preencha os campos obrigatórios antes de continuar");
        }
      });
    }
  };

  // Gate de autenticação pública
  const requiresAuth = config?.autenticacao_publica === true;
  const isAuthenticated = !!user;

  // Validação de período de inscrição e bloqueio
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const dataInicio = config?.data_inicio_inscricao ? new Date(config.data_inicio_inscricao) : null;
  const dataFim = config?.data_fim_inscricao ? new Date(config.data_fim_inscricao) : null;
  
  // Verificar se está bloqueado administrativamente
  const bloqueioAdministrativo = configExtras.bloquear_novas_inscricoes === true;
  const motivoBloqueio = configExtras.motivo_bloqueio_inscricoes;
  
  const inscricoesAbertas = (() => {
    // Se bloqueio administrativo está ativo, inscrições estão fechadas
    if (bloqueioAdministrativo) return false;
    if (!dataInicio && !dataFim) return true; // Se não há período configurado, está sempre aberto
    if (dataInicio && hoje < dataInicio) return false; // Antes do início
    if (dataFim && hoje > dataFim) return false; // Depois do fim
    return true;
  })();

  useEffect(() => {
    if (!configLoading && !authLoading && requiresAuth && !isAuthenticated) {
      toast.info("É necessário fazer login para realizar uma inscrição");
      navigate("/auth/login?contexto=responsavel", { state: { from: "/modulo/vagou/publico/inscricao" } });
    }
  }, [configLoading, authLoading, requiresAuth, isAuthenticated, navigate]);

  const periodoAtual = watchedFields["periodo"];

  useEffect(() => {
    if (!periodoAtual) {
      setValue("periodo", "Integral");
    }
  }, [setValue, periodoAtual]);

  // Busca automática de endereço via ViaCEP
  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;
    
    setBuscandoCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }
      
      // Preenche os campos automaticamente
      setValue("logradouro", data.logradouro || "");
      setValue("bairro", data.bairro || "");
      setValue("cidade", data.localidade || "");
      setValue("estado", data.uf || "");
      
      toast.success("Endereço preenchido automaticamente!");
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast.error("Erro ao buscar CEP. Preencha manualmente.");
    } finally {
      setBuscandoCep(false);
    }
  };

  const buscarCriancaPorCpf = async (cpfValue: string) => {
    if (!consultaCpfHabilitada) return;
    const cpfLimpo = cpfValue.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) return;

    setBuscandoCpfCrianca(true);
    try {
      const { data, error } = await supabase.functions.invoke("consultar-cpf", {
        body: { cpf: cpfLimpo, tipo: "crianca" },
      });

      if (error) throw error;

      const nome = typeof data?.nome === "string" ? data.nome : "";
      const dataNascimento = typeof data?.data_nascimento === "string" ? data.data_nascimento : "";
      const hasData = Boolean(nome || dataNascimento);

      if (nome) setValue("nome", nome, { shouldValidate: true, shouldDirty: true });
      if (dataNascimento) setValue("data_nascimento", dataNascimento, { shouldValidate: true, shouldDirty: true });

      if (hasData) {
        toast.success("Dados da criança preenchidos automaticamente!");
      }
    } catch {
      toast.info("Consulta automática por CPF indisponível. Preencha manualmente.");
    } finally {
      setBuscandoCpfCrianca(false);
    }
  };

  const buscarFiliacaoPorCpf = async (cpfValue: string, filiacao: 1 | 2) => {
    if (!consultaCpfHabilitada) return;
    const cpfLimpo = cpfValue.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) return;

    const setLoading = filiacao === 1 ? setBuscandoCpfFiliacao1 : setBuscandoCpfFiliacao2;
    const nomeField = (filiacao === 1 ? "filiacao1_nome" : "filiacao2_nome") as any;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("consultar-cpf", {
        body: { cpf: cpfLimpo, tipo: "responsavel" },
      });

      if (error) throw error;

      const nome = typeof data?.nome === "string" ? data.nome : "";
      const nomeAtual = String(getValues(nomeField) || "").trim();
      if (nome && !nomeAtual) {
        setValue(nomeField, nome, { shouldValidate: true, shouldDirty: true });
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  // Busca automática de dados do responsável pelo CPF
  const buscarResponsavelPorCpf = async (cpfValue: string) => {
    const cpfLimpo = cpfValue.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) return;
    
    setBuscandoCpf(true);
    try {
      const { data: responsavelExistente, error } = await supabase.rpc("buscar_responsavel_por_cpf", {
        p_cpf: cpfLimpo,
      });

      if (error) throw error;

      const responsavel = (responsavelExistente &&
        typeof responsavelExistente === "object" &&
        !Array.isArray(responsavelExistente)
        ? (responsavelExistente as {
            responsavel_nome?: string | null;
            responsavel_telefone?: string | null;
            responsavel_celular?: string | null;
            responsavel_email?: string | null;
            cep?: string | null;
            logradouro?: string | null;
            numero?: string | null;
            complemento?: string | null;
            bairro?: string | null;
            cidade?: string | null;
            estado?: string | null;
          })
        : null);
      
      if (responsavel) {
        setValue("responsavel_nome", responsavel.responsavel_nome || "");
        setValue("responsavel_telefone", responsavel.responsavel_telefone ? maskPhone(responsavel.responsavel_telefone) : "");
        setValue("responsavel_celular", responsavel.responsavel_celular ? maskPhone(responsavel.responsavel_celular) : "");
        setValue("responsavel_email", responsavel.responsavel_email || "");
        
        // Preencher endereço se existir
        if (responsavel.cep) {
          setValue("cep", maskCEP(responsavel.cep));
          setValue("logradouro", responsavel.logradouro || "");
          setValue("numero", responsavel.numero || "");
          setValue("complemento", responsavel.complemento || "");
          setValue("bairro", responsavel.bairro || "");
          setValue("cidade", responsavel.cidade || "");
          setValue("estado", responsavel.estado || "");
        }
        
        setCpfPreenchido(true);
        toast.success("Dados do responsável carregados automaticamente!");
      } else {
        setCpfPreenchido(false);
        if (!consultaCpfHabilitada) return;
        try {
          const { data } = await supabase.functions.invoke("consultar-cpf", {
            body: { cpf: cpfLimpo, tipo: "responsavel" },
          });

          const nome = typeof data?.nome === "string" ? data.nome : "";
          const nomeAtual = String(getValues("responsavel_nome") || "").trim();
          if (nome && !nomeAtual) {
            setValue("responsavel_nome", nome, { shouldValidate: true, shouldDirty: true });
            toast.success("Nome do responsável preenchido automaticamente!");
          }
        } catch {
          setCpfPreenchido(false);
        }
      }
    } catch (error) {
      const maybeMessage =
        typeof error === "object" && error && "message" in error ? String((error as { message?: unknown }).message) : "";

      try {
        const { data: fallback } = await supabase
          .from("criancas")
          .select("responsavel_nome, responsavel_telefone, responsavel_celular, responsavel_email, cep, logradouro, numero, complemento, bairro, cidade, estado")
          .eq("responsavel_cpf", cpfLimpo)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fallback) {
          setValue("responsavel_nome", fallback.responsavel_nome || "");
          setValue("responsavel_telefone", fallback.responsavel_telefone ? maskPhone(fallback.responsavel_telefone) : "");
          setValue("responsavel_celular", fallback.responsavel_celular ? maskPhone(fallback.responsavel_celular) : "");
          setValue("responsavel_email", fallback.responsavel_email || "");

          if (fallback.cep) {
            setValue("cep", maskCEP(fallback.cep));
            setValue("logradouro", fallback.logradouro || "");
            setValue("numero", fallback.numero || "");
            setValue("complemento", fallback.complemento || "");
            setValue("bairro", fallback.bairro || "");
            setValue("cidade", fallback.cidade || "");
            setValue("estado", fallback.estado || "");
          }

          setCpfPreenchido(true);
          toast.success("Dados do responsável carregados automaticamente!");
          return;
        }
      } catch (fallbackError) {
        console.error("Erro ao buscar responsável (fallback):", fallbackError);
      }

      console.error("Erro ao buscar responsável:", error);
      setCpfPreenchido(false);

      if (/schema cache|could not find the function|does not exist/i.test(maybeMessage)) {
        toast.error("Busca por CPF indisponível no momento. A função do banco ainda não foi publicada/atualizada.");
      } else {
        toast.error("Não foi possível buscar os dados do responsável pelo CPF");
      }
    } finally {
      setBuscandoCpf(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!criancaId) return;
    
    setDownloadingReceipt(true);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-comprovante', {
        body: { crianca_id: criancaId, tipo: 'inscricao' }
      });

      if (error) throw error;

      // Criar blob do HTML e fazer download
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Abrir em nova aba para impressão/salvamento
      const newWindow = window.open(url, '_blank');
      if (newWindow) {
        newWindow.onload = () => {
          newWindow.print();
        };
      }
      
      toast.success("Comprovante gerado com sucesso!");
    } catch (error: unknown) {
      console.error("Erro ao gerar comprovante:", error);
      toast.error("Erro ao gerar comprovante");
    } finally {
      setDownloadingReceipt(false);
    }
  };
  
  const getFirstError = (
    formErrors: FieldErrors<InscricaoFormData & Record<string, unknown>>,
    prefix = ""
  ): { name: string; message?: string } | null => {
    const entries = Object.entries(formErrors as Record<string, any>);
    for (const [key, value] of entries) {
      if (!value) continue;
      const name = prefix ? `${prefix}.${key}` : key;
      if (typeof value.message === "string") return { name, message: value.message };
      if (typeof value === "object" && ("type" in value || "ref" in value)) return { name };
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const nested = getFirstError(value[i] as any, `${name}.${i}`);
          if (nested) return nested;
        }
      } else if (typeof value === "object") {
        const nested = getFirstError(value as any, name);
        if (nested) return nested;
      }
    }
    return null;
  };

  const resolveStepForField = (fieldName: string): number => {
    const base = fieldName.split(".")[0] || fieldName;

    if (
      base === "periodo" ||
      base === "cmei1_preferencia" ||
      base === "cmei2_preferencia" ||
      base === "cmei3_preferencia" ||
      base === "aceita_qualquer_cmei" ||
      base === "zona_atendimento_id"
    ) {
      return 5;
    }

    if (base === "prioridades_ids" || base === "temPrioridadeResposta") return 4;

    const campo = camposParaValidacao.find((c) => c.nome_campo === base);
    if (!campo) return 1;

    if (campo.secao === "crianca") return 1;
    if (campo.secao === "responsavel") return 2;
    if (campo.secao === "endereco") return 3;
    if (campo.secao === "preferencias") return 5;
    return 6;
  };

  const onInvalid: SubmitErrorHandler<InscricaoFormData & Record<string, unknown>> = (formErrors) => {
    const first = getFirstError(formErrors);
    const message = first?.message || "Revise os campos obrigatórios antes de confirmar a inscrição.";
    toast.error(message);

    if (first?.name) {
      const step = resolveStepForField(first.name);
      setShowErrorsByStep((prev) => ({ ...prev, [step]: true }));
      setActiveStep(step);
      setTimeout(() => setFocus(first.name as any), 0);
    }
  };

  const onSubmit = async (data: InscricaoFormData) => {
    if (!aceitouTermos) {
      toast.error("Você deve ler e aceitar os Termos de Uso e Política de Privacidade para continuar.");
      return;
    }
    
    try {
      // Validar CAPTCHA se habilitado
      const captchaIsEnabled = configExtras.captcha_habilitado === true;
      const captchaSiteKey = (configExtras.captcha_site_key as string | null | undefined) ?? null;
      const captchaEnabled = captchaIsEnabled && !!captchaSiteKey;
      const shouldValidateCaptcha = captchaEnabled && !isLocalDev;
      if (shouldValidateCaptcha) {
        if (!captchaRef.current) {
          toast.error("Verificação de segurança indisponível. Recarregue a página e tente novamente.");
          return;
        }
        const captchaToken = await captchaRef.current.execute();
        if (captchaToken) {
          // Validar token no servidor
          const { data: captchaResult, error: captchaError } = await supabase.functions.invoke('validar-captcha', {
            body: { token: captchaToken }
          });
          
          if (captchaError || !captchaResult?.valido) {
            toast.error("Verificação de segurança falhou. Tente novamente.");
            captchaRef.current.reset();
            return;
          }
        } else {
          toast.error("Verificação de segurança não concluída. Tente novamente.");
          return;
        }
      }

      // Validar idade máxima (criança fora da faixa etária)
      if (data.data_nascimento) {
        const validacaoIdade = validarIdadeMaximaInscricao(data.data_nascimento, {
          idade_maxima_anos: configExtras.idade_maxima_anos,
          data_corte_mes: configExtras.data_corte_mes,
          data_corte_dia: configExtras.data_corte_dia,
        });
        
        if (!validacaoIdade.valido) {
          const mensagem = configExtras.mensagem_idade_fora_faixa || 
            "A criança informada está fora da faixa etária permitida para inscrição. Por favor, procure a Secretaria de Educação para mais informações.";
          toast.error(mensagem, { duration: 8000 });
          return;
        }
      }

      // CEP é obrigatório
      if (!data.cep) {
        toast.error("O CEP é obrigatório para realizar a inscrição.");
        return;
      }

      // Validar CEP permitido se a configuração estiver ativa
      if (config?.validar_cep) {
        if (!validarCEPPermitido(data.cep, config.ceps_permitidos)) {
          toast.error(
            "CEP não permitido. As inscrições são restritas a determinadas regiões.",
            { duration: 5000 }
          );
          return;
        }
      }

      const prioridadesIdsSubmit = (data as any).prioridades_ids as string[] | undefined;
      const idsSubmit = Array.isArray(prioridadesIdsSubmit) ? prioridadesIdsSubmit : [];
      const tiposSelecionados = itensPrioridadeFederais
        .map((i) => i.tipo)
        .filter(Boolean)
        .filter((t) => idsSubmit.includes(t.id));
      const faltandoComprovante = tiposSelecionados
        .filter((t) => t.exige_documento)
        .filter((t) => !comprovantesPrioridade[t.id]);

      if (comprovacaoNaInscricao && faltandoComprovante.length > 0) {
        toast.error(
          `Envie o documento de comprovação para: ${faltandoComprovante.map((t) => t.nome).join(", ")}`,
          { duration: 6000 },
        );
        return;
      }

      const programasSociaisDerivado = tiposSelecionados.some((t) => t.codigo === "social");

      // Usar RPC SECURITY DEFINER para verificar duplicidade (funciona para anon)
      const { data: verificacaoData, error: verificacaoError } = await supabase.rpc('verificar_duplicidade_inscricao', {
        p_nome: data.nome,
        p_data_nascimento: data.data_nascimento,
        p_responsavel_cpf: data.responsavel_cpf,
      });

      if (verificacaoError) {
        console.error("Erro ao verificar duplicidade:", verificacaoError);
        toast.error("Erro ao validar inscrição. Tente novamente.");
        return;
      }

      // Cast para tipo adequado
      const verificacao = verificacaoData as { duplicada: boolean; motivo?: string; nome?: string; status?: string; total_inscricoes_cpf?: number } | null;

      // Verificar se encontrou duplicidade
      if (verificacao?.duplicada) {
        const motivo = verificacao.motivo;
        if (motivo === 'nome_data') {
          toast.error(
            `Criança já cadastrada! ${verificacao.nome} já possui inscrição com status: ${verificacao.status}`,
            { duration: 5000 }
          );
        } else {
          toast.error(
            `Criança já inscrita! ${verificacao.nome} já possui inscrição com status: ${verificacao.status}`,
            { duration: 5000 }
          );
        }
        return;
      }

      // Verificar limite de inscrições por responsável
      if (config?.limite_inscricoes_responsavel && config.limite_inscricoes_responsavel > 0) {
        const totalInscricoes = verificacao?.total_inscricoes_cpf || 0;
        if (totalInscricoes >= config.limite_inscricoes_responsavel) {
          toast.error(
            `Limite de inscrições atingido! Você pode realizar no máximo ${config.limite_inscricoes_responsavel} inscrição(ões) por CPF.`,
            { duration: 5000 }
          );
          return;
        }
      }

      // O Zod já validou que os campos obrigatórios existem
      const filiacao1NaoDeclarada = data.filiacao1_nao_declarada === true;
      const filiacao2NaoDeclarada = data.filiacao2_nao_declarada === true;
      const payload: InscricaoData = {
        nome: data.nome,
        data_nascimento: data.data_nascimento,
        cpf_crianca: data.cpf_crianca || undefined,
        sexo: data.sexo,
        certidao_nascimento: data.certidao_nascimento || undefined,
        cor_raca_autodeclarada: data.cor_raca_autodeclarada,
        cor_raca_certidao: data.cor_raca_certidao,
        etnia_indigena: data.etnia_indigena || undefined,
        etnia_indigena_outra: data.etnia_indigena_outra || undefined,
        quilombo_remanescente: data.quilombo_remanescente === "sim",
        quilombo_nome: data.quilombo_nome || undefined,
        nacionalidade: data.nacionalidade,
        estrangeiro_possui_documentos:
          data.nacionalidade === "estrangeira"
            ? data.estrangeiro_possui_documentos === "sim"
            : undefined,
        nis: data.nis || undefined,
        responsavel_nome: data.responsavel_nome,
        responsavel_cpf: data.responsavel_cpf,
        responsavel_rg: data.responsavel_rg || undefined,
        responsavel_parentesco: data.responsavel_parentesco,
        responsavel_parentesco_outro:
          data.responsavel_parentesco === "outro" ? data.responsavel_parentesco_outro || undefined : undefined,
        responsavel_email: data.responsavel_email || undefined,
        responsavel_telefone: data.responsavel_telefone,
        responsavel_celular: data.responsavel_celular || undefined,
        responsavel_telefone_comercial: data.responsavel_telefone_comercial || undefined,
        responsavel_user_id: (data as any).responsavel_user_id || undefined,
        canal_notificacao_preferido: (data as any).canal_notificacao_preferido || undefined,
        filiacao1_nao_declarada: filiacao1NaoDeclarada,
        filiacao1_nome: filiacao1NaoDeclarada ? "Não declarada" : data.filiacao1_nome || undefined,
        filiacao1_rg: filiacao1NaoDeclarada ? undefined : data.filiacao1_rg || undefined,
        filiacao1_cpf: filiacao1NaoDeclarada ? undefined : data.filiacao1_cpf || undefined,
        filiacao1_email: filiacao1NaoDeclarada ? undefined : data.filiacao1_email || undefined,
        filiacao1_celular: filiacao1NaoDeclarada ? undefined : data.filiacao1_celular || undefined,
        filiacao1_telefone_comercial: filiacao1NaoDeclarada ? undefined : data.filiacao1_telefone_comercial || undefined,
        filiacao2_nao_declarada: filiacao2NaoDeclarada,
        filiacao2_nome: filiacao2NaoDeclarada ? "Não declarada" : data.filiacao2_nome || undefined,
        filiacao2_rg: filiacao2NaoDeclarada ? undefined : data.filiacao2_rg || undefined,
        filiacao2_cpf: filiacao2NaoDeclarada ? undefined : data.filiacao2_cpf || undefined,
        filiacao2_email: filiacao2NaoDeclarada ? undefined : data.filiacao2_email || undefined,
        filiacao2_celular: filiacao2NaoDeclarada ? undefined : data.filiacao2_celular || undefined,
        filiacao2_telefone_comercial: filiacao2NaoDeclarada ? undefined : data.filiacao2_telefone_comercial || undefined,
        cep: data.cep || undefined,
        logradouro: data.logradouro || undefined,
        numero: data.numero || undefined,
        complemento: data.complemento || undefined,
        bairro: data.bairro || undefined,
        cidade: data.cidade || undefined,
        estado: data.estado || undefined,
        zona_atendimento_id: (data as any).zona_atendimento_id || null,
        unidade_consumidora: data.unidade_consumidora,
        forma_ocupacao_moradia: data.forma_ocupacao_moradia,
        forma_ocupacao_moradia_outro: data.forma_ocupacao_moradia_outro || undefined,
        cmei1_preferencia: (data as any).cmei1_preferencia || undefined,
        cmei2_preferencia: (data as any).cmei2_preferencia || undefined,
        cmei3_preferencia: (data as any).cmei3_preferencia || undefined,
        aceita_qualquer_cmei: data.aceita_qualquer_cmei,
        programas_sociais: programasSociaisDerivado,
        observacoes: data.observacoes || undefined,
      };

      const crianca = await createInscricao.mutateAsync(payload);
      setCriancaId(crianca.id);
      setProtocolo(crianca.protocolo ?? null);
      
      // Salvar valores de campos customizados (não-sistema)
      if (todosOsCamposCustom.length > 0) {
        const valoresCustom: Record<string, string> = {};
        todosOsCamposCustom.forEach(campo => {
          if (!campoVisivel(campo)) return;
          const dataRecord = data as unknown as Record<string, unknown>;
          const valor = dataRecord[campo.nome_campo];
          if (valor !== undefined && valor !== null && valor !== "") {
            valoresCustom[campo.id] = String(valor);
          }
        });
        
        if (Object.keys(valoresCustom).length > 0) {
          try {
            await saveValoresCustom.mutateAsync({
              criancaId: crianca.id,
              valores: valoresCustom,
              insertOnly: true,
              silent: true,
            });
          } catch (e) {
            toast.warning("Inscrição feita, mas não foi possível salvar alguns campos adicionais.");
            void e;
          }
        }
      }

      if (tiposSelecionados.length > 0) {
        try {
          const inserts = [];
          for (const tipo of tiposSelecionados) {
            let url: string | undefined;
            const arquivo = comprovantesPrioridade[tipo.id];
            if (arquivo) {
              url = await uploadDocumentoComprovantePrioridade({
                criancaId: crianca.id,
                prioridadeId: tipo.id,
                arquivo,
              });
            }
            inserts.push({
              crianca_id: crianca.id,
              prioridade_id: tipo.id,
              documento_comprovante_url: url || null,
              status: tipo.exige_documento ? "pendente" : "aprovado",
            });
          }

          const { error: prioError } = await supabase.from("crianca_prioridades").insert(inserts as any);
          if (prioError) throw prioError;
          await supabase.rpc("recalcular_posicoes_fila");
        } catch (e) {
          toast.warning("Inscrição feita, mas não foi possível registrar as prioridades agora.");
          void e;
        }
      }
      
      // Upload de documentos pendentes (opcional)
      if (pendingDocumentos.length > 0) {
        const uploadPromises = pendingDocumentos
          .filter(doc => doc.arquivo)
          .map(async (doc) => {
            try {
              const fileExt = doc.arquivo!.name.split(".").pop();
              const fileName = `${crianca.id}/${doc.tipoId}.${fileExt}`;

              const { error: uploadError } = await supabase.storage
                .from("documentos")
                .upload(fileName, doc.arquivo!, { upsert: true });

              if (uploadError) throw uploadError;

              await supabase
                .from("documentos_crianca")
                .upsert({
                  crianca_id: crianca.id,
                  tipo_documento_id: doc.tipoId,
                  arquivo_url: fileName,
                  arquivo_nome: doc.arquivo!.name,
                  status: "pendente",
                }, { onConflict: "crianca_id,tipo_documento_id" });

              return { success: true, tipoNome: doc.tipoNome };
            } catch (err) {
              console.error(`Erro ao enviar documento ${doc.tipoNome}:`, err);
              return { success: false, tipoNome: doc.tipoNome };
            }
          });

        const results = await Promise.all(uploadPromises);
        const successCount = results.filter(r => r.success).length;
        
        if (successCount > 0) {
          toast.success(`${successCount} documento(s) enviado(s) com sucesso!`);
        }
        
        const failedDocs = results.filter(r => !r.success);
        if (failedDocs.length > 0) {
          toast.warning(`${failedDocs.length} documento(s) não foram enviados. Você pode enviar depois pelo painel.`);
        }
      }
      
      setShowSuccess(true);
    } catch (error) {
      console.error("Erro ao criar inscrição:", error);
      toast.error("Não foi possível concluir a inscrição. Tente novamente.");
    }
  };

  // Loading enquanto verifica autenticação
  if (configLoading || authLoading) {
    return (
      <PublicLayout>
        <div className="govbr-section bg-muted/30 flex items-center justify-center py-20">
          <Spinner className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }

  // Redirecionando para login
  if (requiresAuth && !isAuthenticated) {
    return (
      <PublicLayout>
        <div className="govbr-section bg-muted/30 flex items-center justify-center py-20">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Login Necessário</h2>
              <p className="text-muted-foreground">
                Para realizar uma inscrição, é necessário fazer login no sistema.
              </p>
              <Button onClick={() => navigate("/auth/login?contexto=responsavel", { state: { from: "/modulo/vagou/publico/inscricao" } })}>
                Fazer Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  // Inscrições fora do período ou bloqueadas
  if (!inscricoesAbertas) {
    return (
      <PublicLayout>
        <div className="govbr-section bg-muted/30 flex items-center justify-center py-20">
          <Card className="max-w-lg w-full mx-4">
            <CardContent className="pt-6 text-center space-y-4">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mx-auto",
                bloqueioAdministrativo ? "bg-destructive/10" : "bg-warning/10"
              )}>
                <Info className={cn(
                  "w-8 h-8",
                  bloqueioAdministrativo ? "text-destructive" : "text-warning"
                )} />
              </div>
              <h2 className="text-xl font-bold">
                {bloqueioAdministrativo ? "Inscrições Suspensas" : "Inscrições Encerradas"}
              </h2>
              <p className="text-muted-foreground">
                {bloqueioAdministrativo
                  ? (motivoBloqueio || `As inscrições para vagas em ${plural} estão temporariamente suspensas.`)
                  : dataInicio && hoje < dataInicio
                  ? `As inscrições abrirão em ${dataInicio.toLocaleDateString('pt-BR')}.`
                  : dataFim && hoje > dataFim
                  ? `O período de inscrições encerrou em ${dataFim.toLocaleDateString('pt-BR')}.`
                  : "As inscrições não estão abertas no momento."}
              </p>
              {!bloqueioAdministrativo && dataInicio && dataFim && (
                <div className="p-4 bg-muted rounded-lg text-sm">
                  <p className="font-medium">Período de inscrições:</p>
                  <p className="text-muted-foreground">
                    {dataInicio.toLocaleDateString('pt-BR')} a {dataFim.toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button variant="outline" onClick={() => navigate("/modulo/vagou/publico")}>
                  Voltar para Início
                </Button>
                <Button variant="outline" onClick={() => navigate("/modulo/vagou/publico/contato")}>
                  Entrar em Contato
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }
  
  if (showSuccess) {
    return (
      <PublicLayout>
        <div className="govbr-section bg-muted/30 flex items-center justify-center py-20">
          <Card className="max-w-2xl w-full mx-4">
            <CardContent className="pt-6 text-center space-y-6">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-success" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Inscrição Realizada com Sucesso!</h2>
                <p className="text-muted-foreground">
                  Sua inscrição foi registrada e está na fila de espera.
                </p>
              </div>

              <div className="mx-auto w-full max-w-lg space-y-3 pt-2">
                {protocolo && (
                  <div className="rounded-lg border bg-background p-4 text-left">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">Protocolo</div>
                        <div className="text-xs text-muted-foreground">Copie para consultar depois</div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        aria-label="Copiar protocolo"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(protocolo);
                            toast.success("Protocolo copiado!");
                          } catch {
                            toast.error("Não foi possível copiar. Selecione e copie manualmente.");
                          }
                        }}
                      >
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                    <div className="mt-3">
                      <Input value={protocolo} readOnly className="font-mono text-sm" />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleDownloadReceipt}
                    disabled={downloadingReceipt}
                  >
                    {downloadingReceipt ? (
                      <Spinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Baixar Comprovante
                  </Button>
                  <Button className="w-full" onClick={() => navigate("/modulo/vagou/publico/fila")}>
                    Ver Fila de Espera
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Guarde o comprovante para acompanhar sua inscrição.
              </p>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }
  
  return (
    <PublicLayout>
      <div className="govbr-section bg-muted/30">
        <div className="govbr-container max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Nova Inscrição</h1>
            <p className="text-muted-foreground">
              Preencha os dados para realizar a inscrição em uma {singular}
            </p>
          </div>

          {/* Stepper de Progresso */}
          <FormStepper 
            steps={steps}
            completedSteps={completedSteps} 
            activeStep={activeStep} 
            onStepClick={handleStepClick} 
          />

          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Etapa {activeStep} de {steps.length} — Todos os campos marcados com * são obrigatórios.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            <HCaptchaField
              ref={captchaRef}
              enabled={configExtras.captcha_habilitado === true && !isLocalDev}
              siteKey={(configExtras.captcha_site_key as string | null | undefined) ?? null}
              onError={(err) => toast.error(`Falha ao carregar a verificação de segurança (${err}). Verifique bloqueadores (adblock) e tente novamente.`)}
            />
            {/* Dados da Criança */}
            <StepContent isActive={activeStep === 1}>
              <Card className={cn(
                "transition-all duration-300",
                completedSteps.includes(1) && "border-primary/30"
              )}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                      completedSteps.includes(1) ? "bg-primary text-primary-foreground" : "bg-primary/10"
                    )}>
                      {completedSteps.includes(1) ? <Check className="h-4 w-4" /> : <Baby className="h-4 w-4 text-primary" />}
                    </div>
                    <div>
                      <CardTitle className="text-lg">Dados da Criança</CardTitle>
                      <CardDescription>Informações pessoais da criança</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cpf_crianca" className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        CPF da Criança{" "}
                        {cpfCriancaObrigatorio ? <span className="text-destructive">*</span> : "(opcional)"}
                        {buscandoCpfCrianca && <Spinner className="h-3 w-3 animate-spin ml-2" />}
                      </Label>
                      <Input 
                        id="cpf_crianca" 
                        placeholder="000.000.000-00"
                        {...register("cpf_crianca")}
                        onChange={(e) => {
                          const masked = maskCPF(e.target.value);
                          setValue("cpf_crianca", masked, { shouldValidate: true, shouldDirty: true });
                          const cpfLimpo = masked.replace(/\D/g, "");
                          if (cpfLimpo.length === 11) {
                            buscarCriancaPorCpf(cpfLimpo);
                          }
                        }}
                      />
                      {errors.cpf_crianca && (
                        <p className="text-sm text-destructive">{errors.cpf_crianca.message as string}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nome" className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Nome Completo <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="nome" 
                        placeholder="Nome completo da criança"
                        {...register("nome")}
                      />
                      {errors.nome && (
                        <p className="text-sm text-destructive">{errors.nome.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="data_nascimento" className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Data de Nascimento <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="data_nascimento" 
                        type="date"
                        max={maxDataNascimento}
                        {...register("data_nascimento")}
                        className={validacaoIdadeRealTime?.bloqueadoMaximo ? "border-destructive" : validacaoIdadeRealTime?.abaixoMinimo ? "border-yellow-500" : ""}
                      />
                      {turmaCompativel && !validacaoIdadeRealTime?.bloqueadoMaximo && (
                        <div className="mt-2">
                          <Badge variant="outline" className="bg-primary/10 border-primary/30">
                            Turma Compatível: {turmaCompativel}
                          </Badge>
                        </div>
                      )}
                      {errors.data_nascimento && (
                        <p className="text-sm text-destructive">{errors.data_nascimento.message}</p>
                      )}
                      {validacaoIdadeRealTime?.bloqueadoMaximo && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            {validacaoIdadeRealTime.mensagemMaximo}
                          </AlertDescription>
                        </Alert>
                      )}
                      {validacaoIdadeRealTime?.abaixoMinimo && !validacaoIdadeRealTime?.bloqueadoMaximo && (
                        <Alert className="mt-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                          <Info className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
                            A criança tem {validacaoIdadeRealTime.idadeMeses} meses. 
                            Falta{validacaoIdadeRealTime.mesesFaltando === 1 ? '' : 'm'} {validacaoIdadeRealTime.mesesFaltando} {validacaoIdadeRealTime.mesesFaltando === 1 ? 'mês' : 'meses'} para 
                            atingir a idade mínima de {validacaoIdadeRealTime.idadeMinimaMeses} meses para convocação.
                            A inscrição pode ser realizada, mas a criança ficará aguardando na fila.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sexo">
                        Sexo <span className="text-destructive">*</span>
                      </Label>
                      <input type="hidden" {...register("sexo")} />
                      <Select 
                        value={String(watchedFields.sexo || "")}
                        onValueChange={(value) =>
                          setValue("sexo", value as "Masculino" | "Feminino", { shouldDirty: true, shouldValidate: true })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Feminino">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.sexo && (
                        <p className="text-sm text-destructive">{errors.sexo.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label>
                        Cor/raça autodeclarada <span className="text-destructive">*</span>
                      </Label>
                      <input type="hidden" {...register("cor_raca_autodeclarada" as any)} />
                      <Select
                        value={String((watchedFields as any).cor_raca_autodeclarada || "")}
                        onValueChange={(value) =>
                          setValue("cor_raca_autodeclarada" as any, value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {OPCOES_COR_RACA.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(errors as any).cor_raca_autodeclarada && (
                        <p className="text-sm text-destructive">
                          {String((errors as any).cor_raca_autodeclarada.message)}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Cor/raça na certidão de nascimento <span className="text-destructive">*</span>
                      </Label>
                      <input type="hidden" {...register("cor_raca_certidao" as any)} />
                      <Select
                        value={String((watchedFields as any).cor_raca_certidao || "")}
                        onValueChange={(value) =>
                          setValue("cor_raca_certidao" as any, value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {OPCOES_COR_RACA.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(errors as any).cor_raca_certidao && (
                        <p className="text-sm text-destructive">
                          {String((errors as any).cor_raca_certidao.message)}
                        </p>
                      )}
                    </div>
                  </div>

                  {(String((watchedFields as any).cor_raca_autodeclarada || "") === "indigena" ||
                    String((watchedFields as any).cor_raca_certidao || "") === "indigena") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label>
                          Etnia indígena <span className="text-destructive">*</span>
                        </Label>
                        <input type="hidden" {...register("etnia_indigena" as any)} />
                        <Select
                          value={String((watchedFields as any).etnia_indigena || "")}
                          onValueChange={(value) =>
                            setValue("etnia_indigena" as any, value, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {OPCOES_ETNIA_INDIGENA.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {(errors as any).etnia_indigena && (
                          <p className="text-sm text-destructive">{String((errors as any).etnia_indigena.message)}</p>
                        )}
                      </div>

                      {String((watchedFields as any).etnia_indigena || "") === "outra" && (
                        <div className="space-y-2">
                          <Label htmlFor="etnia_indigena_outra">
                            Qual? <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="etnia_indigena_outra"
                            placeholder="Informe a etnia"
                            {...register("etnia_indigena_outra" as any)}
                          />
                          {(errors as any).etnia_indigena_outra && (
                            <p className="text-sm text-destructive">
                              {String((errors as any).etnia_indigena_outra.message)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label>
                        Nacionalidade <span className="text-destructive">*</span>
                      </Label>
                      <input type="hidden" {...register("nacionalidade" as any)} />
                      <Select
                        value={String((watchedFields as any).nacionalidade || "")}
                        onValueChange={(value) =>
                          setValue("nacionalidade" as any, value, { shouldDirty: true, shouldValidate: true })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {OPCOES_NACIONALIDADE.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(errors as any).nacionalidade && (
                        <p className="text-sm text-destructive">{String((errors as any).nacionalidade.message)}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nis">Código de Identificação Social (NIS)</Label>
                      <Input id="nis" placeholder="Apenas números" {...register("nis" as any)} />
                      {(errors as any).nis && (
                        <p className="text-sm text-destructive">{String((errors as any).nis.message)}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Não obrigatório</p>
                    </div>
                  </div>

                  {String((watchedFields as any).nacionalidade || "") === "estrangeira" && (
                    <div className="space-y-2 pt-2">
                      <Label>
                        Se estrangeiro, possui documentos? <span className="text-destructive">*</span>
                      </Label>
                      <input type="hidden" {...register("estrangeiro_possui_documentos" as any)} />
                      <RadioGroup
                        value={String((watchedFields as any).estrangeiro_possui_documentos || "")}
                        onValueChange={(value) =>
                          setValue("estrangeiro_possui_documentos" as any, value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                        className="flex flex-wrap gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sim" id="estrangeiro-documentos-sim" />
                          <Label htmlFor="estrangeiro-documentos-sim">Sim</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nao" id="estrangeiro-documentos-nao" />
                          <Label htmlFor="estrangeiro-documentos-nao">Não</Label>
                        </div>
                      </RadioGroup>
                      {(errors as any).estrangeiro_possui_documentos && (
                        <p className="text-sm text-destructive">
                          {String((errors as any).estrangeiro_possui_documentos.message)}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <Label>
                      Remanescente de Quilombo? <span className="text-destructive">*</span>
                    </Label>
                    <input type="hidden" {...register("quilombo_remanescente" as any)} />
                    <RadioGroup
                      value={String((watchedFields as any).quilombo_remanescente || "")}
                      onValueChange={(value) =>
                        setValue("quilombo_remanescente" as any, value, { shouldDirty: true, shouldValidate: true })
                      }
                      className="flex flex-wrap gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sim" id="quilombo-sim" />
                        <Label htmlFor="quilombo-sim">Sim</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="nao" id="quilombo-nao" />
                        <Label htmlFor="quilombo-nao">Não</Label>
                      </div>
                    </RadioGroup>
                    {(errors as any).quilombo_remanescente && (
                      <p className="text-sm text-destructive">{String((errors as any).quilombo_remanescente.message)}</p>
                    )}
                  </div>

                  {String((watchedFields as any).quilombo_remanescente || "") === "sim" && (
                    <div className="space-y-2">
                      <Label htmlFor="quilombo_nome">
                        Se sim, qual? <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="quilombo_nome"
                        placeholder="Informe qual quilombo"
                        {...register("quilombo_nome" as any)}
                      />
                      {(errors as any).quilombo_nome && (
                        <p className="text-sm text-destructive">{String((errors as any).quilombo_nome.message)}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Campos dinâmicos da seção Criança */}
                  {camposDinamicosCrianca.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {camposDinamicosCrianca.filter(campoVisivel).map((campo) => (
                        <DynamicFormField
                          key={campo.id}
                          campo={campo}
                          register={register}
                          setValue={setValue}
                          errors={errors}
                          value={watchedFields[campo.nome_campo as keyof typeof watchedFields]}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </StepContent>

            {/* Dados do Responsável */}
            <StepContent isActive={activeStep === 2}>
              <Card className={cn(
                "transition-all duration-300",
                completedSteps.includes(2) && "border-primary/30"
              )}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                      completedSteps.includes(2) ? "bg-primary text-primary-foreground" : "bg-primary/10"
                    )}>
                      {completedSteps.includes(2) ? <Check className="h-4 w-4" /> : <Users className="h-4 w-4 text-primary" />}
                    </div>
                    <div>
                      <CardTitle className="text-lg">Dados do Responsável</CardTitle>
                      <CardDescription>Informações do responsável legal</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cpfPreenchido && (
                    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                      <Lock className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800 dark:text-amber-200">
                        Dados do responsável já cadastrados. Para alterar, acesse sua área de responsável após o login.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="responsavel_cpf" className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        CPF <span className="text-destructive">*</span>
                        {buscandoCpf && <Spinner className="h-3 w-3 animate-spin ml-2" />}
                      </Label>
                      <Input 
                        id="responsavel_cpf" 
                        placeholder="000.000.000-00"
                        {...register("responsavel_cpf")}
                        onChange={(e) => {
                          const masked = maskCPF(e.target.value);
                          setValue("responsavel_cpf", masked);
                          const cpfLimpo = masked.replace(/\D/g, "");
                          if (cpfLimpo.length === 11) {
                            buscarResponsavelPorCpf(cpfLimpo);
                          } else {
                            setCpfPreenchido(false);
                          }
                        }}
                      />
                      {errors.responsavel_cpf && (
                        <p className="text-sm text-destructive">{errors.responsavel_cpf.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="responsavel_nome" className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Nome Completo <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="responsavel_nome" 
                        placeholder="Nome completo do responsável"
                        {...register("responsavel_nome")}
                        disabled={cpfPreenchido}
                        className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                      />
                      {errors.responsavel_nome && (
                        <p className="text-sm text-destructive">{errors.responsavel_nome.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        O responsável é o quê da criança? <span className="text-destructive">*</span>
                      </Label>
                      <input type="hidden" {...register("responsavel_parentesco" as any)} />
                      <Select
                        value={String((watchedFields as any).responsavel_parentesco || "")}
                        onValueChange={(value) =>
                          setValue("responsavel_parentesco" as any, value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {OPCOES_PARENTESCO.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(errors as any).responsavel_parentesco && (
                        <p className="text-sm text-destructive">
                          {String((errors as any).responsavel_parentesco.message)}
                        </p>
                      )}
                    </div>
                    {String((watchedFields as any).responsavel_parentesco || "") === "outro" ? (
                      <div className="space-y-2">
                        <Label htmlFor="responsavel_parentesco_outro">
                          Qual? <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="responsavel_parentesco_outro"
                          placeholder="Informe o parentesco"
                          {...register("responsavel_parentesco_outro" as any)}
                        />
                        {(errors as any).responsavel_parentesco_outro && (
                          <p className="text-sm text-destructive">
                            {String((errors as any).responsavel_parentesco_outro.message)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div />
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="responsavel_rg" className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        RG/RNE/RME
                      </Label>
                      <Input
                        id="responsavel_rg"
                        placeholder="Não obrigatório"
                        {...register("responsavel_rg")}
                        disabled={cpfPreenchido}
                        className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                      />
                      {errors.responsavel_rg && (
                        <p className="text-sm text-destructive">{String(errors.responsavel_rg.message)}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="responsavel_email" className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        E-mail
                      </Label>
                      <Input
                        id="responsavel_email"
                        type="email"
                        placeholder="Não obrigatório"
                        {...register("responsavel_email")}
                        disabled={cpfPreenchido}
                        className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                      />
                      {errors.responsavel_email && (
                        <p className="text-sm text-destructive">{errors.responsavel_email.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="responsavel_telefone" className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Telefone celular/WhatsApp <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="responsavel_telefone" 
                        placeholder="(00) 00000-0000"
                        {...register("responsavel_telefone")}
                        onChange={(e) => {
                          const masked = maskPhone(e.target.value);
                          setValue("responsavel_telefone", masked);
                        }}
                        disabled={cpfPreenchido}
                        className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                      />
                      {errors.responsavel_telefone && (
                        <p className="text-sm text-destructive">{errors.responsavel_telefone.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="responsavel_telefone_comercial" className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Telefone comercial
                      </Label>
                      <Input
                        id="responsavel_telefone_comercial"
                        placeholder="Não obrigatório"
                        {...register("responsavel_telefone_comercial")}
                        onChange={(e) => {
                          const masked = maskPhone(e.target.value);
                          setValue("responsavel_telefone_comercial", masked);
                        }}
                        disabled={cpfPreenchido}
                        className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                      />
                      {errors.responsavel_telefone_comercial && (
                        <p className="text-sm text-destructive">{String(errors.responsavel_telefone_comercial.message)}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="responsavel_celular" className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Telefone de contato 2
                      </Label>
                      <Input
                        id="responsavel_celular"
                        placeholder="Não obrigatório"
                        {...register("responsavel_celular")}
                        onChange={(e) => {
                          const masked = maskPhone(e.target.value);
                          setValue("responsavel_celular", masked);
                        }}
                        disabled={cpfPreenchido}
                        className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                      />
                      <p className="text-xs text-muted-foreground">Não obrigatório</p>
                    </div>
                  </div>

                  {canaisNotificacaoDisponiveis.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <Label>Como deseja receber notificações?</Label>
                      <RadioGroup
                        value={String((watchedFields as any).canal_notificacao_preferido || "")}
                        onValueChange={(value) =>
                          setValue("canal_notificacao_preferido" as any, value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        {canaisNotificacaoDisponiveis.map((opt) => {
                          const id = `canal_notificacao_${opt.value}`;
                          return (
                            <div key={opt.value} className="flex items-center space-x-2">
                              <RadioGroupItem id={id} value={opt.value} />
                              <Label htmlFor={id}>{opt.label}</Label>
                            </div>
                          );
                        })}
                      </RadioGroup>
                      {errors.canal_notificacao_preferido && (
                        <p className="text-sm text-destructive">{String(errors.canal_notificacao_preferido.message)}</p>
                      )}
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-semibold">Filiação 1</h4>
                    <div className="flex items-center space-x-2">
                      <input type="hidden" {...register("filiacao1_nao_declarada" as any)} />
                      <Checkbox
                        id="filiacao1_nao_declarada"
                        checked={Boolean((watchedFields as any).filiacao1_nao_declarada)}
                        onCheckedChange={(checked) => {
                          const val = checked === true;
                          setValue("filiacao1_nao_declarada" as any, val, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          if (val) {
                            setValue("filiacao1_nome" as any, "", { shouldDirty: true });
                            setValue("filiacao1_rg" as any, "", { shouldDirty: true });
                            setValue("filiacao1_cpf" as any, "", { shouldDirty: true });
                            setValue("filiacao1_email" as any, "", { shouldDirty: true });
                            setValue("filiacao1_celular" as any, "", { shouldDirty: true });
                            setValue("filiacao1_telefone_comercial" as any, "", { shouldDirty: true });
                            clearErrors([
                              "filiacao1_nome" as any,
                              "filiacao1_cpf" as any,
                              "filiacao1_celular" as any,
                              "filiacao1_rg" as any,
                              "filiacao1_email" as any,
                              "filiacao1_telefone_comercial" as any,
                            ]);
                          }
                        }}
                      />
                      <Label htmlFor="filiacao1_nao_declarada">Filiação 1 não declarada</Label>
                    </div>

                    {(watchedFields as any).filiacao1_nao_declarada === true ? (
                      <p className="text-xs text-muted-foreground">Você pode prosseguir sem preencher os dados da Filiação 1.</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="filiacao1_nome">
                              Nome do pai/mãe <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="filiacao1_nome"
                              placeholder="Informe o nome"
                              {...register("filiacao1_nome")}
                            />
                            {errors.filiacao1_nome && (
                              <p className="text-sm text-destructive">{String(errors.filiacao1_nome.message)}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="filiacao1_rg">RG/RNE/RME</Label>
                            <Input id="filiacao1_rg" placeholder="Não obrigatório" {...register("filiacao1_rg")} />
                            {errors.filiacao1_rg && (
                              <p className="text-sm text-destructive">{String(errors.filiacao1_rg.message)}</p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="filiacao1_cpf" className="flex items-center gap-1">
                              CPF <span className="text-destructive">*</span>
                              {buscandoCpfFiliacao1 && <Spinner className="h-3 w-3 animate-spin ml-2" />}
                            </Label>
                            <Input
                              id="filiacao1_cpf"
                              placeholder="000.000.000-00"
                              {...register("filiacao1_cpf")}
                              onChange={(e) => {
                                const masked = maskCPF(e.target.value);
                                setValue("filiacao1_cpf", masked);
                                const cpfLimpo = masked.replace(/\D/g, "");
                                if (cpfLimpo.length === 11) {
                                  buscarFiliacaoPorCpf(cpfLimpo, 1);
                                }
                              }}
                            />
                            {errors.filiacao1_cpf && (
                              <p className="text-sm text-destructive">{String(errors.filiacao1_cpf.message)}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="filiacao1_email">E-mail</Label>
                            <Input
                              id="filiacao1_email"
                              type="email"
                              placeholder="Não obrigatório"
                              {...register("filiacao1_email")}
                            />
                            {errors.filiacao1_email && (
                              <p className="text-sm text-destructive">{String(errors.filiacao1_email.message)}</p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="filiacao1_celular">
                              Telefone celular/WhatsApp <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="filiacao1_celular"
                              placeholder="(00) 00000-0000"
                              {...register("filiacao1_celular")}
                              onChange={(e) => {
                                const masked = maskPhone(e.target.value);
                                setValue("filiacao1_celular", masked);
                              }}
                            />
                            {errors.filiacao1_celular && (
                              <p className="text-sm text-destructive">{String(errors.filiacao1_celular.message)}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="filiacao1_telefone_comercial">Telefone comercial</Label>
                            <Input
                              id="filiacao1_telefone_comercial"
                              placeholder="Não obrigatório"
                              {...register("filiacao1_telefone_comercial")}
                              onChange={(e) => {
                                const masked = maskPhone(e.target.value);
                                setValue("filiacao1_telefone_comercial", masked);
                              }}
                            />
                            {errors.filiacao1_telefone_comercial && (
                              <p className="text-sm text-destructive">
                                {String(errors.filiacao1_telefone_comercial.message)}
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold">Filiação 2</h4>
                    <div className="flex items-center space-x-2">
                      <input type="hidden" {...register("filiacao2_nao_declarada" as any)} />
                      <Checkbox
                        id="filiacao2_nao_declarada"
                        checked={Boolean((watchedFields as any).filiacao2_nao_declarada)}
                        onCheckedChange={(checked) => {
                          const val = checked === true;
                          setValue("filiacao2_nao_declarada" as any, val, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          if (val) {
                            setValue("filiacao2_nome" as any, "", { shouldDirty: true });
                            setValue("filiacao2_rg" as any, "", { shouldDirty: true });
                            setValue("filiacao2_cpf" as any, "", { shouldDirty: true });
                            setValue("filiacao2_email" as any, "", { shouldDirty: true });
                            setValue("filiacao2_celular" as any, "", { shouldDirty: true });
                            setValue("filiacao2_telefone_comercial" as any, "", { shouldDirty: true });
                            clearErrors([
                              "filiacao2_nome" as any,
                              "filiacao2_cpf" as any,
                              "filiacao2_celular" as any,
                              "filiacao2_rg" as any,
                              "filiacao2_email" as any,
                              "filiacao2_telefone_comercial" as any,
                            ]);
                          }
                        }}
                      />
                      <Label htmlFor="filiacao2_nao_declarada">Filiação 2 não declarada</Label>
                    </div>

                    {(watchedFields as any).filiacao2_nao_declarada === true ? (
                      <p className="text-xs text-muted-foreground">Você pode prosseguir sem preencher os dados da Filiação 2.</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="filiacao2_nome">
                              Nome do pai/mãe <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="filiacao2_nome"
                              placeholder="Informe o nome"
                              {...register("filiacao2_nome")}
                            />
                            {errors.filiacao2_nome && (
                              <p className="text-sm text-destructive">{String(errors.filiacao2_nome.message)}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="filiacao2_rg">RG/RNE/RME</Label>
                            <Input id="filiacao2_rg" placeholder="Não obrigatório" {...register("filiacao2_rg")} />
                            {errors.filiacao2_rg && (
                              <p className="text-sm text-destructive">{String(errors.filiacao2_rg.message)}</p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="filiacao2_cpf" className="flex items-center gap-1">
                              CPF <span className="text-destructive">*</span>
                              {buscandoCpfFiliacao2 && <Spinner className="h-3 w-3 animate-spin ml-2" />}
                            </Label>
                            <Input
                              id="filiacao2_cpf"
                              placeholder="000.000.000-00"
                              {...register("filiacao2_cpf")}
                              onChange={(e) => {
                                const masked = maskCPF(e.target.value);
                                setValue("filiacao2_cpf", masked);
                                const cpfLimpo = masked.replace(/\D/g, "");
                                if (cpfLimpo.length === 11) {
                                  buscarFiliacaoPorCpf(cpfLimpo, 2);
                                }
                              }}
                            />
                            {errors.filiacao2_cpf && (
                              <p className="text-sm text-destructive">{String(errors.filiacao2_cpf.message)}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="filiacao2_email">E-mail</Label>
                            <Input
                              id="filiacao2_email"
                              type="email"
                              placeholder="Não obrigatório"
                              {...register("filiacao2_email")}
                            />
                            {errors.filiacao2_email && (
                              <p className="text-sm text-destructive">{String(errors.filiacao2_email.message)}</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    {!((watchedFields as any).filiacao2_nao_declarada === true) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="filiacao2_celular">
                            Telefone celular/WhatsApp <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="filiacao2_celular"
                            placeholder="(00) 00000-0000"
                            {...register("filiacao2_celular")}
                            onChange={(e) => {
                              const masked = maskPhone(e.target.value);
                              setValue("filiacao2_celular", masked);
                            }}
                          />
                          {errors.filiacao2_celular && (
                            <p className="text-sm text-destructive">{String(errors.filiacao2_celular.message)}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="filiacao2_telefone_comercial">Telefone comercial</Label>
                          <Input
                            id="filiacao2_telefone_comercial"
                            placeholder="Não obrigatório"
                            {...register("filiacao2_telefone_comercial")}
                            onChange={(e) => {
                              const masked = maskPhone(e.target.value);
                              setValue("filiacao2_telefone_comercial", masked);
                            }}
                          />
                          {errors.filiacao2_telefone_comercial && (
                            <p className="text-sm text-destructive">
                              {String(errors.filiacao2_telefone_comercial.message)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Campos dinâmicos da seção Responsável */}
                  {camposDinamicosResponsavel.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {camposDinamicosResponsavel.filter(campoVisivel).map((campo) => (
                        <DynamicFormField
                          key={campo.id}
                          campo={campo}
                          register={register}
                          setValue={setValue}
                          errors={errors}
                          value={watchedFields[campo.nome_campo as keyof typeof watchedFields]}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </StepContent>

            {/* Endereço */}
            <StepContent isActive={activeStep === 3}>
              <Card className={cn(
                "transition-all duration-300",
                completedSteps.includes(3) && "border-primary/30"
              )}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                      completedSteps.includes(3) ? "bg-primary text-primary-foreground" : "bg-primary/10"
                    )}>
                      {completedSteps.includes(3) ? <Check className="h-4 w-4" /> : <Home className="h-4 w-4 text-primary" />}
                    </div>
                    <div>
                      <CardTitle className="text-lg">Endereço</CardTitle>
                      <CardDescription>Endereço residencial</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {config?.validar_cep && (
                    <Alert className="border-primary/50 bg-primary/5">
                      <MapPin className="h-4 w-4" />
                      <AlertDescription>
                        As inscrições são restritas a determinadas regiões. Certifique-se de informar um CEP válido da área permitida.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cep">
                        CEP <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input 
                          id="cep" 
                          placeholder="00000-000"
                          {...register("cep")}
                          onChange={(e) => {
                            const masked = maskCEP(e.target.value);
                            setValue("cep", masked);
                            // Auto-busca quando CEP completo (9 chars com máscara)
                            if (masked.replace(/\D/g, "").length === 8) {
                              buscarCep(masked);
                            }
                          }}
                          className={cn(
                            config?.validar_cep ? "border-primary/50 flex-1" : "flex-1"
                          )}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => buscarCep(watch("cep") || "")}
                          disabled={buscandoCep}
                          title="Buscar endereço"
                        >
                          {buscandoCep ? (
                            <Spinner className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {errors.cep && (
                        <p className="text-sm text-destructive">{errors.cep.message}</p>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="logradouro">Logradouro</Label>
                      <Input 
                        id="logradouro" 
                        placeholder="Rua, Avenida, etc."
                        {...register("logradouro")}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="numero">Número</Label>
                      <Input 
                        id="numero" 
                        placeholder="Nº"
                        {...register("numero")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bairro">Bairro</Label>
                      <Input 
                        id="bairro" 
                        placeholder="Bairro"
                        {...register("bairro")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input 
                        id="cidade" 
                        placeholder="Cidade"
                        {...register("cidade")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado</Label>
                      <Input 
                        id="estado" 
                        placeholder="UF"
                        maxLength={2}
                        {...register("estado")}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="unidade_consumidora">
                        Unidade consumidora (talão de energia) <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="unidade_consumidora"
                        placeholder="Informe a unidade consumidora"
                        {...register("unidade_consumidora")}
                      />
                      {errors.unidade_consumidora && (
                        <p className="text-sm text-destructive">{String(errors.unidade_consumidora.message)}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Forma de ocupação da moradia <span className="text-destructive">*</span>
                      </Label>
                      <input type="hidden" {...register("forma_ocupacao_moradia")} />
                      <Select
                        value={String((watchedFields as any).forma_ocupacao_moradia || "")}
                        onValueChange={(value) =>
                          setValue("forma_ocupacao_moradia", value as any, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {OPCOES_FORMA_OCUPACAO.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.forma_ocupacao_moradia && (
                        <p className="text-sm text-destructive">{String(errors.forma_ocupacao_moradia.message)}</p>
                      )}
                    </div>
                  </div>

                  {String((watchedFields as any).forma_ocupacao_moradia || "") === "outro" && (
                    <div className="space-y-2">
                      <Label htmlFor="forma_ocupacao_moradia_outro">
                        Se outro, qual? <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="forma_ocupacao_moradia_outro"
                        placeholder="Informe qual"
                        {...register("forma_ocupacao_moradia_outro")}
                      />
                      {errors.forma_ocupacao_moradia_outro && (
                        <p className="text-sm text-destructive">
                          {String(errors.forma_ocupacao_moradia_outro.message)}
                        </p>
                      )}
                    </div>
                  )}

                  {zoneamentoConfig.habilitado && (prioridadeZonaBonusDentro > 0 || prioridadeZonaBonusFora > 0) && (
                    <p className="text-xs text-muted-foreground">
                      A zona de atendimento é identificada automaticamente pelo seu CEP/bairro; {plural} da sua zona recebem{" "}
                      {prioridadeZonaBonusDentro} ponto(s) a mais; fora da zona recebem {prioridadeZonaBonusFora} ponto(s).
                    </p>
                  )}
                  
                  {/* Campos dinâmicos da seção Endereço */}
                  {camposDinamicosEndereco.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {camposDinamicosEndereco.filter(campoVisivel).map((campo) => (
                        <DynamicFormField
                          key={campo.id}
                          campo={campo}
                          register={register}
                          setValue={setValue}
                          errors={errors}
                          value={watchedFields[campo.nome_campo as keyof typeof watchedFields]}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </StepContent>

            {/* Critérios de Prioridade */}
            <StepContent isActive={activeStep === 4}>
              <Card
                className={cn(
                  "transition-all duration-300",
                  completedSteps.includes(4) && "border-primary/30",
                )}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                        completedSteps.includes(4) ? "bg-primary text-primary-foreground" : "bg-primary/10",
                      )}
                    >
                      {completedSteps.includes(4) ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Star className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">Critérios de Prioridade</CardTitle>
                      <CardDescription>Selecione todos os critérios aplicáveis</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="bg-primary/5 border-primary/20">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Os critérios federais podem ser selecionados em conjunto. A comprovação pode ser exigida agora ou na convocação, conforme configuração do município.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      A criança ou responsável se enquadram em algum critério de prioridade?
                    </Label>
                    <RadioGroup
                      value={temPrioridade === undefined ? "" : temPrioridade ? "sim" : "nao"}
                      onValueChange={(value) => {
                        if (value === "sim") {
                          setTemPrioridadeResposta("sim");
                          setValue("tem_prioridade" as any, true, { shouldDirty: true });
                          return;
                        }

                        setTemPrioridadeResposta("nao");
                        setValue("tem_prioridade" as any, false, { shouldDirty: true });
                        setValue("prioridades_ids" as any, [], { shouldDirty: true });
                        setValue("programas_sociais", false, { shouldDirty: true });
                        setComprovantesPrioridade({});
                        setActiveStep(5);
                      }}
                      className="flex flex-wrap gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="nao" id="tem-prioridade-nao" />
                        <Label htmlFor="tem-prioridade-nao" className="font-normal cursor-pointer">
                          Não
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sim" id="tem-prioridade-sim" />
                        <Label htmlFor="tem-prioridade-sim" className="font-normal cursor-pointer">
                          Sim
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {temPrioridade === true && (
                    <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      Critérios de prioridade (selecione todos que se aplicam)
                      <Badge className="text-[10px] px-2 py-0.5 bg-amber-500 text-white hover:bg-amber-500">
                        {comprovacaoNaInscricao ? "Requer comprovação na inscrição" : "Comprovação na convocação"}
                      </Badge>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className="w-full justify-between">
                          <span className="truncate">
                            {prioridadeIds.length === 0
                              ? "Nenhum selecionado"
                              : `${prioridadeIds.length} critério(s) selecionado(s)`}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-60" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
                        <div className="max-h-64 overflow-auto">
                          {itensPrioridadeFederaisPorGrupo.map((grupo, idx) => (
                            <div key={grupo.key} className={cn("space-y-1", idx > 0 && "pt-2")}>
                              <div className="px-2 pt-1 pb-1">
                                <Badge
                                  variant={
                                    grupo.key === "economica"
                                      ? "warning"
                                      : grupo.key === "vulnerabilidade"
                                        ? "error"
                                        : "info"
                                  }
                                  className="text-[10px] px-2 py-0.5"
                                >
                                  {grupo.titulo}
                                </Badge>
                              </div>
                              <div className="space-y-1">
                                {grupo.itens.map((item) => {
                                  const tipoId = item.tipo?.id;
                                  const isDisabled = !tipoId;
                                  const isSelected = tipoId ? prioridadeIds.includes(tipoId) : false;
                                  return (
                                    <button
                                      key={item.seed.codigo}
                                      type="button"
                                      className={cn(
                                        "w-full flex items-start gap-2 px-2 py-2 rounded-md text-sm transition-colors",
                                        "hover:bg-muted",
                                        isSelected && "bg-muted",
                                        isDisabled && "opacity-60 cursor-not-allowed hover:bg-transparent",
                                      )}
                                      disabled={isDisabled}
                                      onClick={() => {
                                        if (!tipoId) return;
                                        const next = isSelected
                                          ? prioridadeIds.filter((id) => id !== tipoId)
                                          : [...prioridadeIds, tipoId];
                                        setValue("prioridades_ids" as any, next, { shouldDirty: true });
                                        const socialId = itensPrioridadeFederais.find((i) => i.seed.codigo === "social")?.tipo
                                          ?.id;
                                        const social = !!socialId && next.includes(socialId);
                                        setValue("programas_sociais", social, { shouldDirty: true });
                                      }}
                                    >
                                      <div
                                        className="mt-1 h-3 w-3 rounded-full shrink-0"
                                        style={{ backgroundColor: item.tipo?.cor || item.seed.cor || "#3b82f6" }}
                                      />
                                      <div className="flex-1 text-left">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{item.seed.nome}</span>
                                          <Badge className="text-[10px] px-2 py-0.5 bg-blue-600 text-white hover:bg-blue-600">
                                            {item.seed.lei}
                                          </Badge>
                                          {isDisabled && (
                                            <Badge className="text-[10px] px-2 py-0.5 bg-slate-600 text-white hover:bg-slate-600">
                                              Não configurado
                                            </Badge>
                                          )}
                                        </div>
                                        {item.seed.descricao && (
                                          <div className="text-xs text-muted-foreground mt-0.5">{item.seed.descricao}</div>
                                        )}
                                      </div>
                                      {isSelected && <Check className="h-4 w-4 text-primary mt-0.5" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>

                    {prioridadesFederaisSelecionadas.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {prioridadesFederaisSelecionadas.map((i) => (
                          <Badge key={i.seed.codigo} variant="outline" className="gap-1">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: i.tipo?.cor || i.seed.cor }}
                            />
                            {i.seed.nome}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {documentosObrigatoriosMatriculaTexto && (
                      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 mt-3">
                        <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <AlertDescription>
                          <strong>Documentos obrigatórios para matrícula (município + prioridades selecionadas):</strong>{" "}
                          {documentosObrigatoriosMatriculaTexto}
                        </AlertDescription>
                      </Alert>
                    )}

                    {comprovacaoNaInscricao &&
                      prioridadesFederaisSelecionadas.some((i) => i.seed.exige_documento) && (
                        <div className="pt-2 space-y-3">
                          {prioridadesFederaisSelecionadas
                            .filter((i) => i.seed.exige_documento)
                            .map((i) => {
                              const tipoId = i.tipo?.id;
                              if (!tipoId) return null;
                              const arquivo = comprovantesPrioridade[tipoId];
                              const docNome = i.tipo?.documento_tipo_id
                                ? docNomePorId.get(i.tipo.documento_tipo_id)
                                : null;
                              return (
                                <div key={i.seed.codigo} className="border rounded-lg p-3 bg-background space-y-2">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">{i.seed.nome}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {docNome ? `Documento: ${docNome}` : "Documento de comprovação obrigatório"}
                                      </p>
                                      <div className="pt-1">
                                        <Badge className="text-[10px] px-2 py-0.5 bg-blue-600 text-white hover:bg-blue-600">
                                          {i.seed.lei}
                                        </Badge>
                                      </div>
                                    </div>
                                    {arquivo ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => setComprovantesPrioridade((prev) => ({ ...prev, [tipoId]: null }))}
                                      >
                                        Remover
                                      </Button>
                                    ) : null}
                                  </div>

                                  {arquivo ? (
                                    <div className="text-xs text-muted-foreground">
                                      Arquivo selecionado: <span className="font-medium">{arquivo.name}</span>
                                    </div>
                                  ) : (
                                    <Label className="cursor-pointer">
                                      <div className="flex items-center justify-between gap-3 px-3 py-2 border rounded-md hover:bg-muted transition-colors text-sm">
                                        <span className="text-muted-foreground">Selecionar arquivo</span>
                                        <Upload className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                      <Input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0] || null;
                                          if (file) {
                                            setComprovantesPrioridade((prev) => ({ ...prev, [tipoId]: file }));
                                          }
                                        }}
                                      />
                                    </Label>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                  </div>
                  )}
                </CardContent>
              </Card>
            </StepContent>

            {/* Preferências de unidade */}
            <StepContent isActive={activeStep === 5}>
              <Card className={cn(
                "transition-all duration-300",
                completedSteps.includes(5) && "border-primary/30"
              )}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                      completedSteps.includes(5) ? "bg-primary text-primary-foreground" : "bg-primary/10"
                    )}>
                      {completedSteps.includes(5) ? <Check className="h-4 w-4" /> : <Building className="h-4 w-4 text-primary" />}
                    </div>
                    <div>
                      <CardTitle className="text-lg">Preferências de {singular}</CardTitle>
                      <CardDescription>
                        {(configExtras.preferencias_cmei_qtd ?? 2) === 3
                          ? `Escolha até 3 ${plural} de sua preferência`
                          : `Escolha até 2 ${plural} de sua preferência`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/50">
                    <Info className="h-4 w-4 text-primary" />
                    <span>
                      Com base na idade da criança, a turma identificada é: <strong>{turmaCompativel || "Não identificada"}</strong>. 
                      Abaixo você pode ver a disponibilidade de vagas para esta turma em cada {singular}.
                    </span>
                  </div>

                  {camposDinamicosPreferencias.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {camposDinamicosPreferencias.map((campo) => (
                        <DynamicFormField
                          key={campo.id}
                          campo={campo}
                          register={register}
                          setValue={setValue}
                          errors={errors}
                          value={watchedFields[campo.nome_campo]}
                        />
                      ))}
                    </div>
                  )}

                  {/* Mapa de unidades */}
                  {cmeisOrdenadosFiltrados && cmeisOrdenadosFiltrados.length > 0 && (
                    <CMEIsMapSelector
                      cmeis={cmeisOrdenadosFiltrados}
                      selectedCmei1={watchedFields.cmei1_preferencia || null}
                      selectedCmei2={watchedFields.cmei2_preferencia || null}
                      onSelectCmei1={(id) => setValue("cmei1_preferencia", id)}
                      onSelectCmei2={(id) => setValue("cmei2_preferencia", id)}
                      zonasDetectadas={zonasDetectadas}
                      highlightTrigger
                    />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cmei1_preferencia">1ª Opção de {singular}</Label>
                      <Select 
                        value={watchedFields.cmei1_preferencia || ""}
                        onValueChange={(value) => setValue("cmei1_preferencia", value)}
                        disabled={loadingCMEIs}
                      >
                        <SelectTrigger className="h-auto py-2">
                          <SelectValue placeholder={loadingCMEIs ? "Carregando..." : `Selecione a ${singular}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {!ocupacaoTurmas && (
                            <div className="flex items-center justify-center py-4">
                              <Spinner className="h-4 w-4 animate-spin text-muted-foreground" />
                              <span className="ml-2 text-xs text-muted-foreground">Carregando ocupação...</span>
                            </div>
                          )}
                          {cmeisOrdenadosFiltrados?.map((cmei) => {
                            const turmas = getOcupacaoCmeiTurmas(cmei.id);
                            return (
                              <SelectItem key={cmei.id} value={cmei.id} className="focus:bg-accent group">
                                <div className="flex flex-col gap-1 py-1 w-full">
                                  <div className="flex items-center justify-between w-full gap-4">
                                    <span className="font-medium group-focus:text-accent-foreground">{cmei.nome}</span>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <Badge
                                          variant={(cmei as any).tipo_gestao === "privado" ? "warning" : "info"}
                                          className="text-[10px] px-1.5 py-0 h-4 group-focus:bg-white/20 group-focus:text-white group-focus:border-white/30"
                                        >
                                          {(cmei as any).tipo_gestao === "privado" ? "Privado" : "Municipal"}
                                        </Badge>
                                        {zoneamentoConfig.habilitado && zonasDetectadas.length > 0 && cmeiEstaNaZona(cmei) && (
                                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-700 shrink-0 group-focus:bg-white/20 group-focus:text-white group-focus:border-white/30">
                                            Sua zona
                                          </Badge>
                                        )}
                                      </div>
                                  </div>
                                  
                                  {turmas && turmas.length > 0 ? (
                                    <div className="space-y-2 mt-1">
                                      {turmas.map(turma => (
                                        <div key={turma.id} className="space-y-1">
                                          <div className="flex items-center justify-between text-[10px] text-muted-foreground group-focus:text-accent-foreground/80">
                                            <span>{turma.nome} ({turma.turno})</span>
                                            <span className={cn(
                                              "font-medium",
                                              turma.temVagas ? "text-green-600 group-focus:text-white" : "text-destructive group-focus:text-white"
                                            )}>
                                              {turma.temVagas ? `${turma.vagas} vagas` : "Fila de espera"}
                                            </span>
                                          </div>
                                          <div className="w-full h-1 bg-muted rounded-full overflow-hidden border border-border/50 group-focus:border-white/20 group-focus:bg-white/10">
                                            <div 
                                              className={cn(
                                                "h-full transition-all duration-500",
                                                turma.percentual >= 90 ? "bg-destructive group-focus:bg-white" : 
                                                turma.percentual >= 70 ? "bg-amber-500 group-focus:bg-white" : "bg-green-500 group-focus:bg-white"
                                              )}
                                              style={{ width: `${Math.min(100, turma.percentual)}%` }}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-muted-foreground italic group-focus:text-accent-foreground/70">
                                      {isLoadingOcupacao ? "Carregando disponibilidade..." : "Sem informação de vagas para esta idade"}
                                    </div>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cmei2_preferencia">2ª Opção de {singular} (opcional)</Label>
                      <Select 
                        value={watchedFields.cmei2_preferencia || ""}
                        onValueChange={(value) => setValue("cmei2_preferencia", value)}
                        disabled={loadingCMEIs || !watchedFields.cmei1_preferencia}
                      >
                        <SelectTrigger className="h-auto py-2">
                          <SelectValue placeholder={
                            loadingCMEIs 
                              ? "Carregando..." 
                              : !watchedFields.cmei1_preferencia 
                                ? "Selecione a 1ª opção primeiro" 
                                : `Selecione a ${singular}`
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {!ocupacaoTurmas && (
                            <div className="flex items-center justify-center py-4">
                              <Spinner className="h-4 w-4 animate-spin text-muted-foreground" />
                              <span className="ml-2 text-xs text-muted-foreground">Carregando ocupação...</span>
                            </div>
                          )}
                          {cmeisOrdenadosFiltrados
                            ?.filter((cmei) => cmei.id !== watchedFields.cmei1_preferencia)
                            .map((cmei) => {
                              const turmas = getOcupacaoCmeiTurmas(cmei.id);
                              return (
                                <SelectItem key={cmei.id} value={cmei.id} className="focus:bg-accent group">
                                  <div className="flex flex-col gap-1 py-1 w-full">
                                    <div className="flex items-center justify-between w-full gap-4">
                                      <span className="font-medium group-focus:text-accent-foreground">{cmei.nome}</span>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <Badge
                                          variant={(cmei as any).tipo_gestao === "privado" ? "warning" : "info"}
                                          className="text-[10px] px-1.5 py-0 h-4 group-focus:bg-white/20 group-focus:text-white group-focus:border-white/30"
                                        >
                                          {(cmei as any).tipo_gestao === "privado" ? "Privado" : "Municipal"}
                                        </Badge>
                                        {zoneamentoConfig.habilitado && zonasDetectadas.length > 0 && cmeiEstaNaZona(cmei) && (
                                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-700 shrink-0 group-focus:bg-white/20 group-focus:text-white group-focus:border-white/30">
                                            Sua zona
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {turmas && turmas.length > 0 ? (
                                      <div className="space-y-2 mt-1">
                                        {turmas.map(turma => (
                                          <div key={turma.id} className="space-y-1">
                                            <div className="flex items-center justify-between text-[10px] text-muted-foreground group-focus:text-accent-foreground/80">
                                              <span>{turma.nome} ({turma.turno})</span>
                                              <span className={cn(
                                                "font-medium",
                                                turma.temVagas ? "text-green-600 group-focus:text-white" : "text-destructive group-focus:text-white"
                                              )}>
                                                {turma.temVagas ? `${turma.vagas} vagas` : "Fila de espera"}
                                              </span>
                                            </div>
                                            <div className="w-full h-1 bg-muted rounded-full overflow-hidden border border-border/50 group-focus:border-white/20 group-focus:bg-white/10">
                                              <div 
                                                className={cn(
                                                  "h-full transition-all duration-500",
                                                  turma.percentual >= 90 ? "bg-destructive group-focus:bg-white" : 
                                                  turma.percentual >= 70 ? "bg-amber-500 group-focus:bg-white" : "bg-green-500 group-focus:bg-white"
                                                )}
                                                style={{ width: `${Math.min(100, turma.percentual)}%` }}
                                              />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-[10px] text-muted-foreground italic group-focus:text-accent-foreground/70">
                                        {isLoadingOcupacao ? "Carregando disponibilidade..." : "Sem informação de vagas para esta idade"}
                                      </div>
                                    )}
                                  </div>
                                </SelectItem>
                              );
                            })}
                        </SelectContent>
                      </Select>
                    </div>

                    {(configExtras.preferencias_cmei_qtd ?? 2) === 3 && (
                      <div className="space-y-2">
                        <Label htmlFor="cmei3_preferencia">3ª Opção de {singular} (opcional)</Label>
                        <Select
                          value={(watchedFields as any).cmei3_preferencia || ""}
                          onValueChange={(value) => setValue("cmei3_preferencia" as any, value)}
                          disabled={loadingCMEIs || !watchedFields.cmei1_preferencia}
                        >
                          <SelectTrigger className="h-auto py-2">
                            <SelectValue placeholder={
                              loadingCMEIs
                                ? "Carregando..."
                                : !watchedFields.cmei1_preferencia
                                  ? "Selecione a 1ª opção primeiro"
                                  : `Selecione a ${singular}`
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {!ocupacaoTurmas && (
                              <div className="flex items-center justify-center py-4">
                                <Spinner className="h-4 w-4 animate-spin text-muted-foreground" />
                                <span className="ml-2 text-xs text-muted-foreground">Carregando ocupação...</span>
                              </div>
                            )}
                            {cmeisOrdenadosFiltrados
                              ?.filter((cmei) => cmei.id !== watchedFields.cmei1_preferencia && cmei.id !== watchedFields.cmei2_preferencia)
                              .map((cmei) => {
                                const turmas = getOcupacaoCmeiTurmas(cmei.id);
                                return (
                                  <SelectItem key={cmei.id} value={cmei.id} className="focus:bg-accent group">
                                    <div className="flex flex-col gap-1 py-1 w-full">
                                      <div className="flex items-center justify-between w-full gap-4">
                                        <span className="font-medium group-focus:text-accent-foreground">{cmei.nome}</span>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <Badge
                                            variant={(cmei as any).tipo_gestao === "privado" ? "warning" : "info"}
                                            className="text-[10px] px-1.5 py-0 h-4 group-focus:bg-white/20 group-focus:text-white group-focus:border-white/30"
                                          >
                                            {(cmei as any).tipo_gestao === "privado" ? "Privado" : "Municipal"}
                                          </Badge>
                                          {zoneamentoConfig.habilitado && zonasDetectadas.length > 0 && cmeiEstaNaZona(cmei) && (
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-700 shrink-0 group-focus:bg-white/20 group-focus:text-white group-focus:border-white/30">
                                              Sua zona
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      {turmas && turmas.length > 0 ? (
                                        <div className="space-y-2 mt-1">
                                          {turmas.map(turma => (
                                            <div key={turma.id} className="space-y-1">
                                              <div className="flex items-center justify-between text-[10px] text-muted-foreground group-focus:text-accent-foreground/80">
                                                <span>{turma.nome} ({turma.turno})</span>
                                                <span className={cn(
                                                  "font-medium",
                                                  turma.temVagas ? "text-green-600 group-focus:text-white" : "text-destructive group-focus:text-white"
                                                )}>
                                                  {turma.temVagas ? `${turma.vagas} vagas` : "Fila de espera"}
                                                </span>
                                              </div>
                                              <div className="w-full h-1 bg-muted rounded-full overflow-hidden border border-border/50 group-focus:border-white/20 group-focus:bg-white/10">
                                                <div 
                                                  className={cn(
                                                    "h-full transition-all duration-500",
                                                    turma.percentual >= 90 ? "bg-destructive group-focus:bg-white" : 
                                                    turma.percentual >= 70 ? "bg-amber-500 group-focus:bg-white" : "bg-green-500 group-focus:bg-white"
                                                  )}
                                                  style={{ width: `${Math.min(100, turma.percentual)}%` }}
                                                />
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-[10px] text-muted-foreground italic group-focus:text-accent-foreground/70">
                                          {isLoadingOcupacao ? "Carregando disponibilidade..." : "Sem informação de vagas para esta idade"}
                                        </div>
                                      )}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {zoneamentoConfig.habilitado && zonasDetectadas.length > 0 && (
                    <Alert className="border-green-200 bg-green-50">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        {zonasDetectadas.length === 1 ? (
                          <>
                            Detectamos sua zona de atendimento: <strong>{zonasDetectadas[0].nome}</strong>. {plural} desta zona
                            estão destacados e aparecem primeiro nas opções.
                          </>
                        ) : (
                          <>
                            Detectamos mais de uma zona possível:{" "}
                            <strong>{zonasDetectadas.map((z) => z.nome).join(", ")}</strong>. {plural} destas zonas estão
                            destacados e aparecem primeiro nas opções.
                          </>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="aceita_qualquer_cmei"
                        onCheckedChange={(checked) => 
                          setValue("aceita_qualquer_cmei", checked as boolean)
                        }
                      />
                      <label
                        htmlFor="aceita_qualquer_cmei"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Aceito qualquer {singular} disponível
                      </label>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="observacoes" className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Observações
                    </Label>
                    <Textarea 
                      id="observacoes"
                      {...register("observacoes")}
                      placeholder="Informações adicionais que julgar importantes (opcional, máx. 500 caracteres)"
                      className="resize-none"
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground">
                      {watchedFields.observacoes?.length || 0}/500 caracteres
                    </p>
                  </div>
                  
                  {/* Campos dinâmicos da seção Observações */}
                  {camposDinamicosObservacoes.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {camposDinamicosObservacoes.filter(campoVisivel).map((campo) => (
                        <DynamicFormField
                          key={campo.id}
                          campo={campo}
                          register={register}
                          setValue={setValue}
                          errors={errors}
                          value={watchedFields[campo.nome_campo as keyof typeof watchedFields]}
                        />
                      ))}
                    </div>
                  )}

                  <Separator />

                  {/* Upload de Documentos (Opcional) */}
                  <div className="space-y-3">
                    <Collapsible open={docsOpen} onOpenChange={setDocsOpen}>
                      <CollapsibleTrigger asChild>
                        <Button type="button" variant="outline" className="w-full justify-between">
                          <div className="flex items-center gap-2">
                            <Upload className="h-4 w-4 text-primary" />
                            <span className="font-medium">Documentos (Opcional)</span>
                          </div>
                          <ChevronDown className={cn("h-4 w-4 transition-transform", docsOpen && "rotate-180")} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pt-3">
                          <DocumentosUpload
                            requiredTipoIds={documentoTipoIdsObrigatoriosPorPrioridade}
                            onDocumentosChange={setPendingDocumentos}
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </CardContent>
              </Card>
            </StepContent>

            {/* Etapa 6: Revisão */}
            <StepContent isActive={activeStep === 6}>
              <Card className="border-primary/30">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <ClipboardCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Revisão dos Dados</CardTitle>
                      <CardDescription>Confira todas as informações antes de enviar</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Dados da Criança */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold flex items-center gap-2 text-primary">
                        <Baby className="h-4 w-4" />
                        Dados da Criança
                      </h4>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setActiveStep(1)}
                        className="h-7 text-xs"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 rounded-lg p-4">
                      <div>
                        <span className="text-muted-foreground">Nome:</span>
                        <p className="font-medium">{watchedFields.nome || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Data de Nascimento:</span>
                        <p className="font-medium">
                          {watchedFields.data_nascimento 
                            ? new Date(watchedFields.data_nascimento + "T00:00:00").toLocaleDateString("pt-BR")
                            : "-"}
                        </p>
                        {turmaCompativel && (
                          <Badge variant="outline" className="mt-1 bg-primary/5 text-[10px] h-5">
                            {turmaCompativel}
                          </Badge>
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sexo:</span>
                        <p className="font-medium">{watchedFields.sexo || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">CPF:</span>
                        <p className="font-medium">{watchedFields.cpf_crianca || "Não informado"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cor/raça autodeclarada:</span>
                        <p className="font-medium">
                          {OPCOES_COR_RACA.find((o) => o.value === (watchedFields as any).cor_raca_autodeclarada)
                            ?.label || "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cor/raça na certidão:</span>
                        <p className="font-medium">
                          {OPCOES_COR_RACA.find((o) => o.value === (watchedFields as any).cor_raca_certidao)?.label ||
                            "-"}
                        </p>
                      </div>
                      {(String((watchedFields as any).cor_raca_autodeclarada || "") === "indigena" ||
                        String((watchedFields as any).cor_raca_certidao || "") === "indigena") && (
                        <div>
                          <span className="text-muted-foreground">Etnia indígena:</span>
                          <p className="font-medium">
                            {String((watchedFields as any).etnia_indigena || "") === "outra"
                              ? (watchedFields as any).etnia_indigena_outra || "Outra"
                              : OPCOES_ETNIA_INDIGENA.find((o) => o.value === (watchedFields as any).etnia_indigena)
                                    ?.label || "-"}
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Remanescente de Quilombo:</span>
                        <p className="font-medium">
                          {String((watchedFields as any).quilombo_remanescente || "") === "sim"
                            ? "Sim"
                            : String((watchedFields as any).quilombo_remanescente || "") === "nao"
                              ? "Não"
                              : "-"}
                        </p>
                      </div>
                      {String((watchedFields as any).quilombo_remanescente || "") === "sim" && (
                        <div>
                          <span className="text-muted-foreground">Quilombo:</span>
                          <p className="font-medium">{(watchedFields as any).quilombo_nome || "-"}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Nacionalidade:</span>
                        <p className="font-medium">
                          {OPCOES_NACIONALIDADE.find((o) => o.value === (watchedFields as any).nacionalidade)?.label ||
                            "-"}
                        </p>
                      </div>
                      {String((watchedFields as any).nacionalidade || "") === "estrangeira" && (
                        <div>
                          <span className="text-muted-foreground">Possui documentos:</span>
                          <p className="font-medium">
                            {String((watchedFields as any).estrangeiro_possui_documentos || "") === "sim"
                              ? "Sim"
                              : String((watchedFields as any).estrangeiro_possui_documentos || "") === "nao"
                                ? "Não"
                                : "-"}
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">NIS:</span>
                        <p className="font-medium">{(watchedFields as any).nis || "Não informado"}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Dados do Responsável */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold flex items-center gap-2 text-primary">
                        <Users className="h-4 w-4" />
                        Dados do Responsável
                      </h4>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setActiveStep(2)}
                        className="h-7 text-xs"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 rounded-lg p-4">
                      <div>
                        <span className="text-muted-foreground">Nome:</span>
                        <p className="font-medium">{watchedFields.responsavel_nome || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">CPF:</span>
                        <p className="font-medium">{watchedFields.responsavel_cpf || "-"}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Parentesco:</span>
                        <p className="font-medium">
                          {String((watchedFields as any).responsavel_parentesco || "") === "outro"
                            ? (watchedFields as any).responsavel_parentesco_outro || "Outro"
                            : OPCOES_PARENTESCO.find((o) => o.value === (watchedFields as any).responsavel_parentesco)
                                ?.label || "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Telefone celular/WhatsApp:</span>
                        <p className="font-medium">{watchedFields.responsavel_telefone || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Telefone de contato 2:</span>
                        <p className="font-medium">{watchedFields.responsavel_celular || "Não informado"}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Telefone comercial:</span>
                        <p className="font-medium">{(watchedFields as any).responsavel_telefone_comercial || "Não informado"}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">RG/RNE/RME:</span>
                        <p className="font-medium">{(watchedFields as any).responsavel_rg || "Não informado"}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">E-mail:</span>
                        <p className="font-medium">{watchedFields.responsavel_email || "Não informado"}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Filiação 1:</span>
                        {(watchedFields as any).filiacao1_nao_declarada === true ? (
                          <p className="font-medium">Não declarada</p>
                        ) : (
                          <>
                            <p className="font-medium">
                              {(watchedFields as any).filiacao1_nome || "-"} — {(watchedFields as any).filiacao1_cpf || "-"}
                            </p>
                            <p className="text-muted-foreground">
                              {(watchedFields as any).filiacao1_celular || "-"}
                              {(watchedFields as any).filiacao1_telefone_comercial
                                ? ` • ${(watchedFields as any).filiacao1_telefone_comercial}`
                                : ""}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Filiação 2:</span>
                        {(watchedFields as any).filiacao2_nao_declarada === true ? (
                          <p className="font-medium">Não declarada</p>
                        ) : (
                          <>
                            <p className="font-medium">
                              {(watchedFields as any).filiacao2_nome || "-"} — {(watchedFields as any).filiacao2_cpf || "-"}
                            </p>
                            <p className="text-muted-foreground">
                              {(watchedFields as any).filiacao2_celular || "-"}
                              {(watchedFields as any).filiacao2_telefone_comercial
                                ? ` • ${(watchedFields as any).filiacao2_telefone_comercial}`
                                : ""}
                            </p>
                          </>
                        )}
                      </div>
                      {canaisNotificacaoDisponiveis.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Notificações:</span>
                          <p className="font-medium">
                            {(watchedFields as any).canal_notificacao_preferido === "whatsapp"
                              ? "WhatsApp"
                              : (watchedFields as any).canal_notificacao_preferido === "sms"
                                ? "SMS"
                                : (watchedFields as any).canal_notificacao_preferido === "email"
                                  ? "E-mail"
                                  : "-"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Endereço */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold flex items-center gap-2 text-primary">
                        <Home className="h-4 w-4" />
                        Endereço
                      </h4>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setActiveStep(3)}
                        className="h-7 text-xs"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </div>
                    <div className="text-sm bg-muted/50 rounded-lg p-4">
                      {watchedFields.logradouro || watchedFields.cep ? (
                        <div className="space-y-1">
                          <p className="font-medium">
                            {[
                              watchedFields.logradouro,
                              watchedFields.numero && `nº ${watchedFields.numero}`,
                            ].filter(Boolean).join(", ") || "-"}
                          </p>
                          <p className="text-muted-foreground">
                            {[
                              watchedFields.bairro,
                              watchedFields.cidade,
                              watchedFields.estado,
                            ].filter(Boolean).join(" - ") || "-"}
                          </p>
                          {watchedFields.cep && (
                            <p className="text-muted-foreground">CEP: {watchedFields.cep}</p>
                          )}
                          <p className="text-muted-foreground">
                            Unidade consumidora: {(watchedFields as any).unidade_consumidora || "-"}
                          </p>
                          <p className="text-muted-foreground">
                            Forma de ocupação:{" "}
                            {OPCOES_FORMA_OCUPACAO.find((o) => o.value === (watchedFields as any).forma_ocupacao_moradia)
                              ?.label || "-"}
                            {String((watchedFields as any).forma_ocupacao_moradia || "") === "outro" &&
                              (watchedFields as any).forma_ocupacao_moradia_outro
                              ? ` (${(watchedFields as any).forma_ocupacao_moradia_outro})`
                              : ""}
                          </p>
                          {zoneamentoConfig.habilitado && zonasDetectadas.length > 0 && (
                            <p className="text-muted-foreground">
                              Zona detectada:{" "}
                              {zonasDetectadas.length === 1
                                ? zonasDetectadas[0].nome
                                : zonasDetectadas.map((z) => z.nome).join(", ")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Endereço não informado</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Prioridades */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold flex items-center gap-2 text-primary">
                        <Star className="h-4 w-4" />
                        Critérios de Prioridade
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveStep(4)}
                        className="h-7 text-xs"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </div>
                    <div className="text-sm bg-muted/50 rounded-lg p-4 space-y-2">
                      {prioridadesFederaisSelecionadas.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {prioridadesFederaisSelecionadas.map((i) => (
                            <span
                              key={i.seed.codigo}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                            >
                              <Check className="h-3 w-3" />
                              {i.seed.nome}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Nenhum critério selecionado</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Preferências */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold flex items-center gap-2 text-primary">
                        <Building className="h-4 w-4" />
                        Preferências de {singular}
                      </h4>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setActiveStep(5)}
                        className="h-7 text-xs"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </div>
                    <div className="text-sm bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-muted-foreground">1ª Opção:</span>
                          <p className="font-medium">
                            {cmeisOrdenados?.find(c => c.id === watchedFields.cmei1_preferencia)?.nome || "Não selecionado"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">2ª Opção:</span>
                          <p className="font-medium">
                            {cmeisOrdenados?.find(c => c.id === watchedFields.cmei2_preferencia)?.nome || "Não selecionado"}
                          </p>
                        </div>
                        {(configExtras.preferencias_cmei_qtd ?? 2) === 3 && (
                          <div>
                            <span className="text-muted-foreground">3ª Opção:</span>
                            <p className="font-medium">
                              {cmeisOrdenados?.find(c => c.id === (watchedFields as any).cmei3_preferencia)?.nome || "Não selecionado"}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {watchedFields.aceita_qualquer_cmei && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            <Check className="h-3 w-3" />
                            Aceita qualquer {singular}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Observações */}
                  {watchedFields.observacoes && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2 text-primary">
                          <FileText className="h-4 w-4" />
                          Observações
                        </h4>
                        <div className="text-sm bg-muted/50 rounded-lg p-4">
                          <p className="whitespace-pre-wrap">{watchedFields.observacoes}</p>
                        </div>
                      </div>
                    </>
                  )}

                  <Alert className="bg-primary/5 border-primary/20">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Confira todos os dados antes de enviar. Após o envio, a inscrição será registrada na fila de espera.
                    </AlertDescription>
                  </Alert>

                  <div className="pt-4 border-t">
                    <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg border border-primary/20">
                      <Checkbox 
                        id="termos_uso" 
                        checked={aceitouTermos}
                        onCheckedChange={(checked) => setAceitouTermos(checked as boolean)}
                        className="mt-1"
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="termos_uso"
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          Li e concordo com os{" "}
                          <Link to="/modulo/vagou/publico/termos" target="_blank" className="text-primary hover:underline font-bold">
                            Termos de Uso
                          </Link>
                          {" "}e a{" "}
                          <Link to="/modulo/vagou/publico/privacidade" target="_blank" className="text-primary hover:underline font-bold">
                            Política de Privacidade (LGPD)
                          </Link>
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Você deve aceitar os termos para concluir sua inscrição.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StepContent>

            {/* Botões de Navegação */}
            <div className="flex gap-4 justify-between items-center pt-4">
              <div>
                {activeStep > 1 && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handlePrevStep}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="ghost"
                  onClick={() => navigate("/modulo/vagou/publico")}
                >
                  Cancelar
                </Button>
                
                {activeStep < steps.length ? (
                  <Button 
                    type="button"
                    onClick={handleNextStep}
                    className="gap-2"
                  >
                    {activeStep === steps.length - 1 ? "Revisar" : "Próximo"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <>
                    <Button 
                      type="submit"
                      disabled={createInscricao.isPending}
                      className="gap-2"
                    >
                      {createInscricao.isPending ? (
                        <>
                          <Spinner className="h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Confirmar Inscrição
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Inscricao;
