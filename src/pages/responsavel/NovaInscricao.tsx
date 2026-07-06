import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Spinner } from "@/components/common/Spinner";
import ResponsavelLayout from "@/components/responsavel/ResponsavelLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, ArrowLeft, ArrowRight, Baby, Users, Home, Building, ClipboardCheck, Check, Edit, Info, Download, FileText, Upload, AlertCircle, MapPin, Star, ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useCreateInscricao, useConfiguracoes } from "@/hooks/api/supabase-hooks";
import { useCMEIsComZonas, useZonasAtendimentoAtivas, useZoneamentoConfig, encontrarZonasEndereco, ordenarCMEIsPorZona, type CMEIComZonas } from "@/hooks/api/zonas-hooks";
import { Badge } from "@/components/ui/badge";
import { createInscricaoSchema, type InscricaoFormData, validarCEPPermitido } from "@/utils/validations/inscricao";
import { validarIdadeMaximaInscricao, validarIdadeMinimaInscricao } from "@/utils/validations/idade-inscricao";
import { CONFIG_PADRAO, determinarTurmaBaseComCorte } from "@/utils/turma-utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { maskCPF, maskPhone, maskCEP } from "@/utils/masks";
import { cn } from "@/utils/utils";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { DocumentosUpload, type DocumentoUpload } from "@/components/inscricao/DocumentosUpload";
import { useDebounce } from "@/hooks/use-debounce";
import { DynamicFormField, deveRenderizarDinamicamente } from "@/components/inscricao/DynamicFormField";
import { useCamposInscricao, useSaveValoresCamposCustom, type CampoInscricao } from "@/hooks/api/campos-inscricao-hooks";
import { CMEIsMapSelector } from "@/components/inscricao/CMEIsMapSelector";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PRIORIDADES_FEDERAIS_PADRAO } from "@/constants/prioridades-federais";
import { uploadDocumentoComprovantePrioridade, useTiposPrioridadeAtivos } from "@/hooks/api/prioridades-hooks";
import { useDocumentosTiposAtivos } from "@/hooks/api/documentos-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

// Steps do formulário
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
    <div className="w-full mb-6 md:mb-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-4 md:top-5 left-0 right-0 h-0.5 bg-border" />
        <div 
          className="absolute top-4 md:top-5 left-0 h-0.5 bg-primary transition-all duration-700 ease-out"
          style={{ width: `${((activeStep - 1) / (steps.length - 1)) * 100}%` }}
        />
        
        {steps.map((step) => {
          const isCompleted = completedSteps.includes(step.id);
          const isActive = activeStep === step.id;
          const isPast = step.id < activeStep;
          const Icon = step.icon;
          
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick(step.id)}
              className="flex flex-col items-center relative z-10 group touch-target"
            >
              <div
                className={cn(
                  "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ease-out",
                  isCompleted || isPast
                    ? "bg-primary border-primary text-primary-foreground scale-100"
                    : isActive
                    ? "bg-background border-primary text-primary scale-110 shadow-lg shadow-primary/20"
                    : "bg-background border-muted-foreground/30 text-muted-foreground group-hover:border-primary/50 group-hover:scale-105"
                )}
              >
                {isCompleted || isPast ? (
                  <Check className="w-4 h-4 md:w-5 md:h-5" />
                ) : (
                  <Icon className={cn("w-3.5 h-3.5 md:w-4 md:h-4 transition-transform duration-300", isActive && "scale-110")} />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] md:text-xs mt-1.5 md:mt-2 font-medium transition-all duration-300",
                  isCompleted || isPast || isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"
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

const StepContent = ({ children, isActive }: { children: React.ReactNode; isActive: boolean }) => {
  if (!isActive) return null;
  return <div className="animate-fade-in">{children}</div>;
};

const getTodayISODate = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const NovaInscricao = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const maxDataNascimento = getTodayISODate();
  const { data: cmeisComZonas, isLoading: loadingCMEIs } = useCMEIsComZonas();
  const { data: zonasAtivas } = useZonasAtendimentoAtivas();
  const zoneamentoConfig = useZoneamentoConfig();
  const { data: config } = useConfiguracoes();
  const { singular, plural } = getUnidadeLabels(config as any);
  const steps = useMemo(
    () => stepsBase.map((s) => (s.id === 5 ? { ...s, title: singular } : s)),
    [singular]
  );
  const configExtras = (config ?? {}) as unknown as Partial<{
    idade_maxima_anos: number;
    idade_minima_meses: number;
    data_corte_mes: number;
    data_corte_dia: number;
    mensagem_idade_fora_faixa: string;
    preferencias_cmei_qtd: number;
    prioridade_zona_habilitada: boolean;
    prioridade_zona_bonus_dentro: number;
    prioridade_zona_bonus_fora: number;
    cpfhub_habilitado: boolean;
    apicpf_habilitado: boolean;
    notificacao_whatsapp_webhook_habilitado: boolean;
    notificacao_sms_webhook_habilitado: boolean;
    notificacao_email_webhook_habilitado: boolean;
  }>;
  const consultaCpfHabilitada = configExtras.cpfhub_habilitado === true || configExtras.apicpf_habilitado === true;
  const preferenciasCmeiQtd = configExtras.preferencias_cmei_qtd ?? 2;
  const createInscricao = useCreateInscricao();
  const saveValoresCustom = useSaveValoresCamposCustom();
  const [success, setSuccess] = useState(false);
  const [criancaId, setCriancaId] = useState<string | null>(null);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [showErrorsByStep, setShowErrorsByStep] = useState<Record<number, boolean>>({});
  const lastFieldsToValidateRef = useRef<string[]>([]);
  const [temPrioridadeResposta, setTemPrioridadeResposta] = useState<"sim" | "nao" | null>(null);
  const [comprovantesPrioridade, setComprovantesPrioridade] = useState<Record<string, File | null>>({});
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [buscandoCpfCrianca, setBuscandoCpfCrianca] = useState(false);
  const [buscandoCpfResponsavel, setBuscandoCpfResponsavel] = useState(false);
  const [pendingDocumentos, setPendingDocumentos] = useState<DocumentoUpload[]>([]);

  const { data: tiposPrioridadeAtivos } = useTiposPrioridadeAtivos();
  const { data: documentosTiposAtivos } = useDocumentosTiposAtivos();
  const comprovacaoNaInscricao = (config as any)?.prioridades_comprovacao_na_inscricao ?? true;

  // Buscar campos dinâmicos por seção
  const { data: camposCrianca } = useCamposInscricao("crianca");
  const { data: camposResponsavel } = useCamposInscricao("responsavel");
  const { data: camposEndereco } = useCamposInscricao("endereco");
  const { data: camposPreferencias } = useCamposInscricao("preferencias");
  const { data: camposObservacoes } = useCamposInscricao("observacoes");

  // Filtrar campos dinâmicos
  const camposDinamicosCrianca = useMemo(() => 
    camposCrianca?.filter(c => deveRenderizarDinamicamente(c.nome_campo) && !c.campo_sistema && c.visivel_responsavel) || [],
    [camposCrianca]
  );
  const camposDinamicosResponsavel = useMemo(() => 
    camposResponsavel?.filter(c => deveRenderizarDinamicamente(c.nome_campo) && !c.campo_sistema && c.visivel_responsavel) || [],
    [camposResponsavel]
  );
  const camposDinamicosEndereco = useMemo(() => 
    camposEndereco?.filter(c => deveRenderizarDinamicamente(c.nome_campo) && !c.campo_sistema && c.visivel_responsavel) || [],
    [camposEndereco]
  );
  const camposDinamicosPreferencias = useMemo(() => 
    camposPreferencias?.filter(c => deveRenderizarDinamicamente(c.nome_campo) && !c.campo_sistema && c.visivel_responsavel) || [],
    [camposPreferencias]
  );
  const camposDinamicosObservacoes = useMemo(() => 
    camposObservacoes?.filter(c => !c.campo_sistema && c.visivel_responsavel) || [],
    [camposObservacoes]
  );

  const todosOsCamposCustom = useMemo(() => [
    ...camposDinamicosCrianca,
    ...camposDinamicosResponsavel,
    ...camposDinamicosEndereco,
    ...camposDinamicosPreferencias,
    ...camposDinamicosObservacoes,
  ], [camposDinamicosCrianca, camposDinamicosResponsavel, camposDinamicosEndereco, camposDinamicosPreferencias, camposDinamicosObservacoes]);

  const camposParaValidacao = useMemo(
    () => [
      ...(camposCrianca || []).filter((c) => c.campo_sistema || c.visivel_responsavel),
      ...(camposResponsavel || []).filter((c) => c.campo_sistema || c.visivel_responsavel),
      ...(camposEndereco || []).filter((c) => c.campo_sistema || c.visivel_responsavel),
      ...(camposPreferencias || []).filter((c) => c.campo_sistema || c.visivel_responsavel),
      ...(camposObservacoes || []).filter((c) => c.campo_sistema || c.visivel_responsavel),
    ],
    [camposCrianca, camposResponsavel, camposEndereco, camposPreferencias, camposObservacoes]
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

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
    getValues,
    setFocus,
    getFieldState,
    clearErrors,
    reset,
  } = useForm<InscricaoFormData & Record<string, unknown>>({
    resolver,
    defaultValues: {
      nome: "",
      data_nascimento: "",
      sexo: undefined,
      responsavel_nome: userProfile?.nome_completo || "",
      responsavel_cpf: userProfile?.cpf || "",
      responsavel_telefone: userProfile?.telefone || "",
      responsavel_email: user?.email || "",
      aceita_qualquer_cmei: false,
      programas_sociais: false,
      zona_atendimento_id: "",
      cmei3_preferencia: "",
      canal_notificacao_preferido: "" as "email" | "sms" | "whatsapp",
    },
  });

  const watchedFields = watch();

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

  // Sincronizar dados do responsável quando userProfile carregar
  useEffect(() => {
    if (userProfile) {
      if (userProfile.nome_completo && !watchedFields.responsavel_nome) {
        setValue("responsavel_nome", userProfile.nome_completo);
      }
      if (userProfile.cpf && !watchedFields.responsavel_cpf) {
        setValue("responsavel_cpf", userProfile.cpf);
      }
      if (userProfile.telefone && !watchedFields.responsavel_telefone) {
        setValue("responsavel_telefone", userProfile.telefone);
      }
    }
    if (user?.email && !watchedFields.responsavel_email) {
      setValue("responsavel_email", user.email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile, user, setValue]);

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

  const { data: turmasAtivasMin } = useQuery({
    queryKey: ["turmas-ativas-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turmas")
        .select("cmei_id, turma_base")
        .eq("ativo", true);

      if (error) throw error;
      return (data || []) as { cmei_id: string | null; turma_base: string }[];
    },
    staleTime: 300000,
  });

  const cmeiIdsCompativeis = useMemo(() => {
    if (!turmaBaseFiltro || !turmasAtivasMin) return null;
    const ids = new Set<string>();
    for (const t of turmasAtivasMin) {
      if (!t.cmei_id) continue;
      if (t.turma_base === turmaBaseFiltro) ids.add(t.cmei_id);
    }
    return ids;
  }, [turmaBaseFiltro, turmasAtivasMin]);

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

    const campoAtendeCondicao = (campo: CampoInscricao) => {
      if (!campo.depende_de || !campo.depende_valor) return true;
      const depValue = record[campo.depende_de];
      if (depValue === null || depValue === undefined) return false;
      const esperado = String(campo.depende_valor).trim().toLowerCase();
      const atual = typeof depValue === "boolean" ? String(depValue) : String(depValue).trim().toLowerCase();
      return atual === esperado;
    };

    const requiredFieldsFilled = (campos: CampoInscricao[] | undefined) => {
      return (campos || [])
        .filter((c) => c.obrigatorio && campoAtendeCondicao(c))
        .every((c) => isFilled(record[c.nome_campo]));
    };

    const step1Complete = !!(
      watchedFields.nome &&
      watchedFields.data_nascimento &&
      watchedFields.sexo &&
      (watchedFields as any).cor_raca_autodeclarada &&
      (watchedFields as any).cor_raca_certidao &&
      (watchedFields as any).nacionalidade &&
      (watchedFields as any).quilombo_remanescente &&
      requiredFieldsFilled(camposCrianca)
    );
    if (step1Complete) completed.push(1);

    const step2Complete = !!(
      watchedFields.responsavel_nome &&
      watchedFields.responsavel_cpf &&
      watchedFields.responsavel_telefone &&
      (watchedFields as any).responsavel_parentesco &&
      requiredFieldsFilled(camposResponsavel)
    );
    if (step2Complete) completed.push(2);

    const step3Complete = !!(watchedFields.cep && requiredFieldsFilled(camposEndereco));
    if (step3Complete) completed.push(3);

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

    const step5Complete = !!(
      (watchedFields.cmei1_preferencia || watchedFields.aceita_qualquer_cmei) &&
      watchedFields["periodo"] &&
      requiredFieldsFilled(camposPreferencias) &&
      requiredFieldsFilled(camposObservacoes)
    );
    if (step5Complete) completed.push(5);

    return completed;
  }, [
    watchedFields,
    camposCrianca,
    camposResponsavel,
    camposEndereco,
    camposPreferencias,
    camposObservacoes,
    temPrioridade,
    prioridadesFederaisSelecionadas,
    comprovacaoNaInscricao,
    comprovantesPrioridade,
  ]);

  // Detectar zona do endereço e ordenar CMEIs
  const { zonasDetectadas, cmeisOrdenados } = useMemo(() => {
    const bairro = watchedFields.bairro;
    const cep = watchedFields.cep;
    
    if (!zonasAtivas || !cmeisComZonas) {
      return { zonasDetectadas: [], cmeisOrdenados: cmeisComZonas || [] };
    }

    if (!zoneamentoConfig.habilitado) {
      return { zonasDetectadas: [], cmeisOrdenados: cmeisComZonas };
    }

    const zonas = encontrarZonasEndereco(bairro || null, cep || null, zonasAtivas);
    const ordenados = ordenarCMEIsPorZona(cmeisComZonas, zonas);
    
    return { zonasDetectadas: zonas, cmeisOrdenados: ordenados };
  }, [watchedFields.bairro, watchedFields.cep, zonasAtivas, cmeisComZonas, zoneamentoConfig.habilitado]);

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
      p_origem: "responsavel",
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
      return;
    }

    if (watchedFields.cmei2_preferencia && !cmeiIdsCompativeis.has(watchedFields.cmei2_preferencia)) {
      setValue("cmei2_preferencia", "");
    }
  }, [cmeiIdsCompativeis, watchedFields.cmei1_preferencia, watchedFields.cmei2_preferencia, setValue]);

  useEffect(() => {
    const campoPeriodo = (camposPreferencias || []).find((c) => c.nome_campo === "periodo");
    if (!campoPeriodo) return;
    const valorAtual = getValues("periodo" as any);
    if (typeof valorAtual === "string" && valorAtual.trim().length > 0) return;

    const opcoes = campoPeriodo.opcoes || [];
    const valorIntegral = opcoes.find((o) => String(o.value) === "Integral")?.value;
    const valorInicial = valorIntegral || opcoes[0]?.value;
    if (!valorInicial) return;

    setValue("periodo" as any, valorInicial, { shouldDirty: false, shouldValidate: true });
  }, [camposPreferencias, getValues, setValue]);

  useEffect(() => {
    const corAuto = String((watchedFields as any).cor_raca_autodeclarada || "");
    const corCert = String((watchedFields as any).cor_raca_certidao || "");
    if (corAuto === "indigena" || corCert === "indigena") return;
    setValue("etnia_indigena" as any, "", { shouldDirty: true });
    setValue("etnia_indigena_outra" as any, "", { shouldDirty: true });
    clearErrors(["etnia_indigena" as any, "etnia_indigena_outra" as any]);
  }, [(watchedFields as any).cor_raca_autodeclarada, (watchedFields as any).cor_raca_certidao, setValue, clearErrors]);

  useEffect(() => {
    if (String((watchedFields as any).etnia_indigena || "") === "outra") return;
    setValue("etnia_indigena_outra" as any, "", { shouldDirty: true });
    clearErrors(["etnia_indigena_outra" as any]);
  }, [(watchedFields as any).etnia_indigena, setValue, clearErrors]);

  useEffect(() => {
    if (String((watchedFields as any).quilombo_remanescente || "") === "sim") return;
    setValue("quilombo_nome" as any, "", { shouldDirty: true });
    clearErrors(["quilombo_nome" as any]);
  }, [(watchedFields as any).quilombo_remanescente, setValue, clearErrors]);

  useEffect(() => {
    if (String((watchedFields as any).nacionalidade || "") === "estrangeira") return;
    setValue("estrangeiro_possui_documentos" as any, "", { shouldDirty: true });
    clearErrors(["estrangeiro_possui_documentos" as any]);
  }, [(watchedFields as any).nacionalidade, setValue, clearErrors]);

  useEffect(() => {
    if (String((watchedFields as any).forma_ocupacao_moradia || "") === "outro") return;
    setValue("forma_ocupacao_moradia_outro" as any, "", { shouldDirty: true });
    clearErrors(["forma_ocupacao_moradia_outro" as any]);
  }, [(watchedFields as any).forma_ocupacao_moradia, setValue, clearErrors]);

  useEffect(() => {
    if (String((watchedFields as any).responsavel_parentesco || "") === "outro") return;
    setValue("responsavel_parentesco_outro" as any, "", { shouldDirty: true });
    clearErrors(["responsavel_parentesco_outro" as any]);
  }, [(watchedFields as any).responsavel_parentesco, setValue, clearErrors]);

  const campoVisivel = (campo: CampoInscricao) => {
    if (!campo.depende_de || !campo.depende_valor) return true;
    const depValue = (watchedFields as any)[campo.depende_de] as unknown;
    if (depValue === null || depValue === undefined) return false;
    const esperado = String(campo.depende_valor).trim().toLowerCase();
    const atual = typeof depValue === "boolean" ? String(depValue) : String(depValue).trim().toLowerCase();
    return atual === esperado;
  };

  const zonasDetectadasIds = useMemo(() => 
    new Set(zonasDetectadas.map(z => z.id)), 
    [zonasDetectadas]
  );

  const cmeiEstaNaZona = (cmei: CMEIComZonas) => {
    return cmei.zonas?.some(z => zonasDetectadasIds.has(z.zona_id)) || false;
  };

  const validateCurrentStep = async () => {
    const fieldsToValidate: string[] = [];

    const isBlankValue = (value: unknown) => {
      if (value === null || value === undefined) return true;
      if (typeof value === "string") return value.trim().length === 0;
      return false;
    };

    const campoAtendeCondicao = (campo: CampoInscricao) => {
      if (!campo.depende_de || !campo.depende_valor) return true;
      const depValue = (watchedFields as any)[campo.depende_de] as unknown;
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
          if (!missing) return;
          ok = false;
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
        const requiredOk = enforceRequired(camposCrianca);
        addObrigatorios(camposCrianca);
        lastFieldsToValidateRef.current = fieldsToValidate;
        if (fieldsToValidate.length === 0) return requiredOk;
        return (await trigger(fieldsToValidate)) && requiredOk;
      }
      case 2: {
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
        const requiredOk = enforceRequired(camposResponsavel);
        addObrigatorios(camposResponsavel);
        lastFieldsToValidateRef.current = fieldsToValidate;
        if (fieldsToValidate.length === 0) return requiredOk;
        return (await trigger(fieldsToValidate)) && requiredOk;
      }
      case 3: {
        fieldsToValidate.push("cep", "unidade_consumidora", "forma_ocupacao_moradia");
        if (getValues("forma_ocupacao_moradia" as any) === "outro") {
          fieldsToValidate.push("forma_ocupacao_moradia_outro");
        }
        const requiredOk = enforceRequired(camposEndereco);
        addObrigatorios(camposEndereco);
        lastFieldsToValidateRef.current = fieldsToValidate;
        if (fieldsToValidate.length === 0) return requiredOk;
        return (await trigger(fieldsToValidate)) && requiredOk;
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
        fieldsToValidate.push("periodo");
        const requiredOk = enforceRequired(camposPreferencias) && enforceRequired(camposObservacoes);
        addObrigatorios(camposPreferencias);
        addObrigatorios(camposObservacoes);
        lastFieldsToValidateRef.current = fieldsToValidate;
        if (fieldsToValidate.length === 0) return requiredOk;
        return (await trigger(fieldsToValidate)) && requiredOk;
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
      toast.error("Preencha os campos obrigatórios antes de continuar");
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleStepClick = (step: number) => {
    if (step < activeStep) {
      setActiveStep(step);
    } else if (step > activeStep && completedSteps.includes(activeStep)) {
      validateCurrentStep().then((ok) => {
        if (ok) setActiveStep(step);
        else {
          setShowErrorsByStep((prev) => ({ ...prev, [activeStep]: true }));
          toast.error("Preencha os campos obrigatórios antes de continuar");
        }
      });
    }
  };

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
      
      setValue("logradouro", data.logradouro || "");
      setValue("bairro", data.bairro || "");
      setValue("cidade", data.localidade || "");
      setValue("estado", data.uf || "");
      
      toast.success("Endereço preenchido automaticamente!");
    } catch (error) {
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

  const buscarResponsavelPorCpf = async (cpfValue: string) => {
    if (!consultaCpfHabilitada) return;
    const cpfLimpo = cpfValue.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) return;

    setBuscandoCpfResponsavel(true);
    try {
      const { data, error } = await supabase.functions.invoke("consultar-cpf", {
        body: { cpf: cpfLimpo, tipo: "responsavel" },
      });

      if (error) throw error;

      const nome = typeof data?.nome === "string" ? data.nome : "";
      if (nome) {
        setValue("responsavel_nome", nome, { shouldValidate: true, shouldDirty: true });
        toast.success("Nome do responsável preenchido automaticamente!");
      }
    } catch {
      toast.info("Consulta automática por CPF indisponível. Preencha manualmente.");
    } finally {
      setBuscandoCpfResponsavel(false);
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

      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const newWindow = window.open(url, '_blank');
      if (newWindow) {
        newWindow.onload = () => {
          newWindow.print();
        };
      }
      
      toast.success("Comprovante gerado com sucesso!");
    } catch (error: unknown) {
      toast.error("Erro ao gerar comprovante");
    } finally {
      setDownloadingReceipt(false);
    }
  };

  const campoEtapaPorNome = useMemo(() => {
    const map = new Map<string, number>();
    (camposCrianca || []).forEach((c) => map.set(c.nome_campo, 1));
    (camposResponsavel || []).forEach((c) => map.set(c.nome_campo, 2));
    (camposEndereco || []).forEach((c) => map.set(c.nome_campo, 3));
    (camposPreferencias || []).forEach((c) => map.set(c.nome_campo, 5));
    (camposObservacoes || []).forEach((c) => map.set(c.nome_campo, 5));
    return map;
  }, [camposCrianca, camposResponsavel, camposEndereco, camposPreferencias, camposObservacoes]);

  const getFirstErrorPath = (obj: unknown, prefix = ""): string | null => {
    if (!obj || typeof obj !== "object") return null;
    const entries = Object.entries(obj as Record<string, any>);
    for (const [key, value] of entries) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value?.message) return path;
      const nested = getFirstErrorPath(value, path);
      if (nested) return nested;
    }
    return null;
  };

  const resolveStepForField = (fieldPath: string | null) => {
    if (!fieldPath) return null;
    const field = fieldPath.split(".")[0];
    const m = campoEtapaPorNome.get(field);
    if (m) return m;
    if (
      [
        "nome",
        "data_nascimento",
        "sexo",
        "cpf_crianca",
        "certidao_nascimento",
        "cor_raca_autodeclarada",
        "cor_raca_certidao",
        "etnia_indigena",
        "etnia_indigena_outra",
        "quilombo_remanescente",
        "quilombo_nome",
        "nacionalidade",
        "estrangeiro_possui_documentos",
        "nis",
      ].includes(field)
    )
      return 1;
    if (
      [
        "responsavel_nome",
        "responsavel_cpf",
        "responsavel_rg",
        "responsavel_parentesco",
        "responsavel_parentesco_outro",
        "responsavel_email",
        "responsavel_telefone",
        "responsavel_celular",
        "responsavel_telefone_comercial",
        "canal_notificacao_preferido",
        "filiacao1_nao_declarada",
        "filiacao1_nome",
        "filiacao1_rg",
        "filiacao1_cpf",
        "filiacao1_email",
        "filiacao1_celular",
        "filiacao1_telefone_comercial",
        "filiacao2_nao_declarada",
        "filiacao2_nome",
        "filiacao2_rg",
        "filiacao2_cpf",
        "filiacao2_email",
        "filiacao2_celular",
        "filiacao2_telefone_comercial",
      ].includes(field)
    )
      return 2;
    if (
      [
        "cep",
        "logradouro",
        "numero",
        "complemento",
        "bairro",
        "cidade",
        "estado",
        "zona_atendimento_id",
        "unidade_consumidora",
        "forma_ocupacao_moradia",
        "forma_ocupacao_moradia_outro",
      ].includes(field)
    )
      return 3;
    if (
      [
        "periodo",
        "cmei1_preferencia",
        "cmei2_preferencia",
        "cmei3_preferencia",
        "aceita_qualquer_cmei",
        "observacoes",
      ].includes(field)
    )
      return 5;
    return null;
  };

  const onInvalid = (formErrors: any) => {
    const firstPath = getFirstErrorPath(formErrors);
    const step = resolveStepForField(firstPath);
    if (step) {
      setActiveStep(step);
      setShowErrorsByStep((prev) => ({ ...prev, [step]: true }));
    }
    if (firstPath) {
      const fieldName = firstPath.split(".")[0];
      const state = getFieldState(fieldName as any);
      const msg = state?.error?.message ? String(state.error.message) : "Há campos obrigatórios pendentes.";
      toast.error(msg);
      try {
        setFocus(fieldName as any);
      } catch {
        void 0;
      }
      return;
    }
    toast.error("Há campos obrigatórios pendentes.");
  };

  const onSubmit = async (data: InscricaoFormData) => {
    // Só permite submit se estiver no step de revisão
    if (activeStep !== 6) {
      return;
    }

    if (!aceitouTermos) {
      toast.error("Você deve ler e aceitar os Termos de Uso e Política de Privacidade para continuar.");
      return;
    }

    try {
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

      // Validar CEP se a configuração estiver ativa
      if (!data.cep) {
        toast.error("O CEP é obrigatório para realizar a inscrição.");
        return;
      }

      if (config?.validar_cep) {
        if (!validarCEPPermitido(data.cep, config.ceps_permitidos)) {
          toast.error(
            "CEP não permitido. As inscrições são restritas a determinadas regiões.",
            { duration: 5000 }
          );
          return;
        }
      }

      const cpfLimpo = data.responsavel_cpf.replace(/\D/g, "");

      const programasSociaisDerivado = prioridadesFederaisSelecionadas.some((i) => i.seed.codigo === "social");

      const { data: duplicidadeData, error: duplicidadeError } = await supabase.rpc(
        "verificar_duplicidade_inscricao",
        {
          p_nome: data.nome,
          p_data_nascimento: data.data_nascimento,
          p_responsavel_cpf: cpfLimpo,
        },
      );

      if (duplicidadeError) {
        toast.error("Erro ao verificar duplicidade de inscrição");
        return;
      }

      if (duplicidadeData?.duplicada) {
        toast.error(duplicidadeData.mensagem || "Já existe uma inscrição para esta criança com o mesmo responsável.", {
          duration: 7000,
        });
        return;
      }

      if (duplicidadeData?.limite_atingido) {
        toast.error(duplicidadeData.mensagem || "Limite de inscrições por CPF atingido.", { duration: 7000 });
        return;
      }

      const crianca = await createInscricao.mutateAsync({
        nome: data.nome,
        data_nascimento: data.data_nascimento,
        sexo: data.sexo,
        cpf_crianca: data.cpf_crianca,
        certidao_nascimento: data.certidao_nascimento,
        cor_raca_autodeclarada: data.cor_raca_autodeclarada,
        cor_raca_certidao: data.cor_raca_certidao,
        etnia_indigena: data.etnia_indigena,
        etnia_indigena_outra: data.etnia_indigena_outra,
        quilombo_remanescente: data.quilombo_remanescente === "sim",
        quilombo_nome: data.quilombo_nome,
        nacionalidade: data.nacionalidade,
        estrangeiro_possui_documentos:
          data.nacionalidade === "estrangeira"
            ? data.estrangeiro_possui_documentos === "sim"
            : undefined,
        nis: data.nis,
        responsavel_nome: data.responsavel_nome,
        responsavel_cpf: cpfLimpo,
        responsavel_rg: data.responsavel_rg,
        responsavel_parentesco: data.responsavel_parentesco,
        responsavel_parentesco_outro: data.responsavel_parentesco_outro,
        responsavel_telefone: data.responsavel_telefone,
        responsavel_email: data.responsavel_email,
        responsavel_celular: data.responsavel_celular,
        responsavel_telefone_comercial: data.responsavel_telefone_comercial,
        responsavel_user_id: user?.id,
        canal_notificacao_preferido: (data as any).canal_notificacao_preferido,
        filiacao1_nao_declarada: data.filiacao1_nao_declarada,
        filiacao1_nome: data.filiacao1_nome,
        filiacao1_rg: data.filiacao1_rg,
        filiacao1_cpf: data.filiacao1_cpf,
        filiacao1_email: data.filiacao1_email,
        filiacao1_celular: data.filiacao1_celular,
        filiacao1_telefone_comercial: data.filiacao1_telefone_comercial,
        filiacao2_nao_declarada: data.filiacao2_nao_declarada,
        filiacao2_nome: data.filiacao2_nome,
        filiacao2_rg: data.filiacao2_rg,
        filiacao2_cpf: data.filiacao2_cpf,
        filiacao2_email: data.filiacao2_email,
        filiacao2_celular: data.filiacao2_celular,
        filiacao2_telefone_comercial: data.filiacao2_telefone_comercial,
        cep: data.cep,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cidade: data.cidade,
        estado: data.estado,
        zona_atendimento_id: (data as any).zona_atendimento_id || null,
        unidade_consumidora: data.unidade_consumidora,
        forma_ocupacao_moradia: data.forma_ocupacao_moradia,
        forma_ocupacao_moradia_outro: data.forma_ocupacao_moradia_outro,
        cmei1_preferencia: data.cmei1_preferencia,
        cmei2_preferencia: data.cmei2_preferencia,
        cmei3_preferencia: (data as any).cmei3_preferencia || null,
        aceita_qualquer_cmei: data.aceita_qualquer_cmei,
        programas_sociais: programasSociaisDerivado,
        observacoes: data.observacoes,
      });
      
      setCriancaId(crianca.id);
      setProtocolo(crianca.protocolo || null);

      // Salvar valores dos campos customizados
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
          await saveValoresCustom.mutateAsync({ 
            criancaId: crianca.id, 
            valores: valoresCustom 
          });
        }
      }

      if (prioridadesFederaisSelecionadas.length > 0) {
        const tiposSelecionados = prioridadesFederaisSelecionadas
          .map((i) => i.tipo)
          .filter(Boolean) as NonNullable<(typeof prioridadesFederaisSelecionadas)[number]["tipo"]>[];

        const registrosPrioridade = await Promise.all(
          tiposSelecionados.map(async (tipo) => {
            let comprovanteUrl: string | null = null;
            let comprovanteNome: string | null = null;
            let comprovanteStatus = "pendente";

            const arquivo = comprovantesPrioridade[tipo.id];
            if (comprovacaoNaInscricao && tipo.exige_documento && arquivo) {
              const uploadUrl = await uploadDocumentoComprovantePrioridade({
                criancaId: crianca.id,
                prioridadeId: tipo.id,
                arquivo,
              });
              comprovanteUrl = uploadUrl;
              comprovanteNome = arquivo.name;
              comprovanteStatus = "pendente";
            }

            return {
              crianca_id: crianca.id,
              tipo_prioridade_id: tipo.id,
              comprovante_url: comprovanteUrl,
              comprovante_nome: comprovanteNome,
              comprovante_status: comprovanteStatus,
            };
          }),
        );

        const { error: prioridadesError } = await supabase
          .from("crianca_prioridades")
          .upsert(registrosPrioridade, { onConflict: "crianca_id,tipo_prioridade_id" });

        if (prioridadesError) {
          toast.error("Erro ao salvar prioridades. A inscrição foi criada, mas sem prioridades.", { duration: 7000 });
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

              const { data: urlData } = supabase.storage
                .from("documentos")
                .getPublicUrl(fileName);

              await supabase
                .from("documentos_crianca")
                .insert({
                  crianca_id: crianca.id,
                  tipo_documento_id: doc.tipoId,
                  arquivo_url: urlData.publicUrl,
                  arquivo_nome: doc.arquivo!.name,
                  status: "pendente",
                });

              return { success: true };
            } catch (err) {
              console.error(`Erro ao enviar documento:`, err);
              return { success: false };
            }
          });

        const results = await Promise.all(uploadPromises);
        const successCount = results.filter(r => r.success).length;
        
        if (successCount > 0) {
          toast.success(`${successCount} documento(s) enviado(s) com sucesso!`);
        }
      }
      
      setSuccess(true);
      toast.success("Inscrição realizada com sucesso!");
    } catch (error: unknown) {
      toast.error("Erro ao realizar inscrição");
    }
  };

  if (success) {
    return (
      <ResponsavelLayout>
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-[hsl(var(--chart-success))] mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Inscrição Realizada!</h2>
            <p className="text-muted-foreground mb-6">
              Sua inscrição foi realizada com sucesso. Você pode acompanhar o status na página "Minhas Inscrições".
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              {criancaId && (
                <Button variant="outline" onClick={handleDownloadReceipt} disabled={downloadingReceipt}>
                  {downloadingReceipt ? (
                    <Spinner className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Imprimir Comprovante
                </Button>
              )}
              <Button onClick={() => navigate("/modulo/vagou/responsavel")}>
                Ver Minhas Inscrições
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSuccess(false);
                  reset();
                  setActiveStep(1);
                  setCriancaId(null);
                  setProtocolo(null);
                  setAceitouTermos(false);
                  setTemPrioridadeResposta(null);
                  setComprovantesPrioridade({});
                  setPendingDocumentos([]);
                  setShowErrorsByStep({});
                }}
              >
                Nova Inscrição
              </Button>
            </div>
          </CardContent>
        </Card>
      </ResponsavelLayout>
    );
  }

  return (
    <ResponsavelLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/modulo/vagou/responsavel")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Nova Inscrição</h1>
            <p className="text-muted-foreground">
              Cadastre uma nova criança para a fila de espera
            </p>
          </div>
        </div>

        <FormStepper
          steps={steps}
          completedSteps={completedSteps} 
          activeStep={activeStep} 
          onStepClick={handleStepClick} 
        />

        <form 
          onSubmit={(e) => {
            // Previne qualquer submit automático do form
            e.preventDefault();
          }} 
          onKeyDown={(e) => {
            // Previne submit ao pressionar Enter em campos de texto
            if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
              e.preventDefault();
            }
          }}
          className="space-y-6"
        >
          {/* Step 1: Dados da Criança */}
          <StepContent isActive={activeStep === 1}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Baby className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Dados da Criança</CardTitle>
                    <CardDescription>Informações básicas da criança</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      CPF da Criança (opcional)
                      {buscandoCpfCrianca && <Spinner className="inline-block h-3 w-3 animate-spin ml-2" />}
                    </label>
                    <Input
                      {...register("cpf_crianca")}
                      placeholder="000.000.000-00"
                      onChange={(e) => {
                        const masked = maskCPF(e.target.value);
                        setValue("cpf_crianca", masked, { shouldValidate: true, shouldDirty: true });
                        const cpfLimpo = masked.replace(/\D/g, "");
                        if (cpfLimpo.length === 11) {
                          buscarCriancaPorCpf(cpfLimpo);
                        }
                      }}
                    />
                    {errors.cpf_crianca && <p className="text-sm text-destructive">{errors.cpf_crianca.message as string}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome Completo *</label>
                    <Input {...register("nome")} placeholder="Nome completo da criança" />
                    {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data de Nascimento *</label>
                    <Input
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
                    {errors.data_nascimento && <p className="text-sm text-destructive">{errors.data_nascimento.message}</p>}
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
                    <label className="text-sm font-medium">Sexo *</label>
                    <Select onValueChange={(value) => setValue("sexo", value as "Masculino" | "Feminino")} value={watchedFields.sexo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Feminino">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.sexo && <p className="text-sm text-destructive">{errors.sexo.message}</p>}
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

          {/* Step 2: Dados do Responsável */}
          <StepContent isActive={activeStep === 2}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Dados do Responsável</CardTitle>
                    <CardDescription>Informações do responsável legal</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      CPF *
                      {buscandoCpfResponsavel && <Spinner className="inline-block h-3 w-3 animate-spin ml-2" />}
                    </label>
                    <Input
                      {...register("responsavel_cpf")}
                      placeholder="000.000.000-00"
                      onChange={(e) => {
                        const masked = maskCPF(e.target.value);
                        setValue("responsavel_cpf", masked, { shouldValidate: true, shouldDirty: true });
                        const cpfLimpo = masked.replace(/\D/g, "");
                        if (cpfLimpo.length === 11) {
                          buscarResponsavelPorCpf(cpfLimpo);
                        }
                      }}
                    />
                    {errors.responsavel_cpf && <p className="text-sm text-destructive">{errors.responsavel_cpf.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome Completo *</label>
                    <Input {...register("responsavel_nome")} placeholder="Nome do responsável" />
                    {errors.responsavel_nome && <p className="text-sm text-destructive">{errors.responsavel_nome.message}</p>}
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
                      <p className="text-sm text-destructive">{String((errors as any).responsavel_parentesco.message)}</p>
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
                    <Label htmlFor="responsavel_rg">RG/RNE/RME</Label>
                    <Input id="responsavel_rg" placeholder="Não obrigatório" {...register("responsavel_rg")} />
                    {errors.responsavel_rg && <p className="text-sm text-destructive">{String(errors.responsavel_rg.message)}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responsavel_telefone_comercial">Telefone comercial</Label>
                    <Input
                      id="responsavel_telefone_comercial"
                      placeholder="Não obrigatório"
                      {...register("responsavel_telefone_comercial")}
                      onChange={(e) => setValue("responsavel_telefone_comercial", maskPhone(e.target.value))}
                    />
                    {errors.responsavel_telefone_comercial && (
                      <p className="text-sm text-destructive">{String(errors.responsavel_telefone_comercial.message)}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefone Principal *</label>
                    <Input 
                      {...register("responsavel_telefone")} 
                      placeholder="(00) 00000-0000"
                      onChange={(e) => setValue("responsavel_telefone", maskPhone(e.target.value))}
                    />
                    {errors.responsavel_telefone && <p className="text-sm text-destructive">{errors.responsavel_telefone.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefone Secundário</label>
                    <Input 
                      {...register("responsavel_celular")} 
                      placeholder="(00) 00000-0000"
                      onChange={(e) => setValue("responsavel_celular", maskPhone(e.target.value))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">E-mail</label>
                  <Input {...register("responsavel_email")} type="email" placeholder="email@exemplo.com" />
                  {errors.responsavel_email && <p className="text-sm text-destructive">{errors.responsavel_email.message}</p>}
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
                        setValue("filiacao1_nao_declarada" as any, val, { shouldDirty: true, shouldValidate: true });
                        if (val) {
                          setValue("filiacao1_nome" as any, "", { shouldDirty: true });
                          setValue("filiacao1_rg" as any, "", { shouldDirty: true });
                          setValue("filiacao1_cpf" as any, "", { shouldDirty: true });
                          setValue("filiacao1_email" as any, "", { shouldDirty: true });
                          setValue("filiacao1_celular" as any, "", { shouldDirty: true });
                          setValue("filiacao1_telefone_comercial" as any, "", { shouldDirty: true });
                          clearErrors([
                            "filiacao1_nome" as any,
                            "filiacao1_rg" as any,
                            "filiacao1_cpf" as any,
                            "filiacao1_email" as any,
                            "filiacao1_celular" as any,
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
                          <Input id="filiacao1_nome" placeholder="Informe o nome" {...register("filiacao1_nome")} />
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
                          <Label htmlFor="filiacao1_cpf">
                            CPF <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="filiacao1_cpf"
                            placeholder="000.000.000-00"
                            {...register("filiacao1_cpf")}
                            onChange={(e) => setValue("filiacao1_cpf", maskCPF(e.target.value))}
                          />
                          {errors.filiacao1_cpf && (
                            <p className="text-sm text-destructive">{String(errors.filiacao1_cpf.message)}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="filiacao1_email">E-mail</Label>
                          <Input id="filiacao1_email" type="email" placeholder="Não obrigatório" {...register("filiacao1_email")} />
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
                            onChange={(e) => setValue("filiacao1_celular", maskPhone(e.target.value))}
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
                            onChange={(e) => setValue("filiacao1_telefone_comercial", maskPhone(e.target.value))}
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

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-semibold">Filiação 2</h4>
                  <div className="flex items-center space-x-2">
                    <input type="hidden" {...register("filiacao2_nao_declarada" as any)} />
                    <Checkbox
                      id="filiacao2_nao_declarada"
                      checked={Boolean((watchedFields as any).filiacao2_nao_declarada)}
                      onCheckedChange={(checked) => {
                        const val = checked === true;
                        setValue("filiacao2_nao_declarada" as any, val, { shouldDirty: true, shouldValidate: true });
                        if (val) {
                          setValue("filiacao2_nome" as any, "", { shouldDirty: true });
                          setValue("filiacao2_rg" as any, "", { shouldDirty: true });
                          setValue("filiacao2_cpf" as any, "", { shouldDirty: true });
                          setValue("filiacao2_email" as any, "", { shouldDirty: true });
                          setValue("filiacao2_celular" as any, "", { shouldDirty: true });
                          setValue("filiacao2_telefone_comercial" as any, "", { shouldDirty: true });
                          clearErrors([
                            "filiacao2_nome" as any,
                            "filiacao2_rg" as any,
                            "filiacao2_cpf" as any,
                            "filiacao2_email" as any,
                            "filiacao2_celular" as any,
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
                          <Input id="filiacao2_nome" placeholder="Informe o nome" {...register("filiacao2_nome")} />
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
                          <Label htmlFor="filiacao2_cpf">
                            CPF <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="filiacao2_cpf"
                            placeholder="000.000.000-00"
                            {...register("filiacao2_cpf")}
                            onChange={(e) => setValue("filiacao2_cpf", maskCPF(e.target.value))}
                          />
                          {errors.filiacao2_cpf && (
                            <p className="text-sm text-destructive">{String(errors.filiacao2_cpf.message)}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="filiacao2_email">E-mail</Label>
                          <Input id="filiacao2_email" type="email" placeholder="Não obrigatório" {...register("filiacao2_email")} />
                          {errors.filiacao2_email && (
                            <p className="text-sm text-destructive">{String(errors.filiacao2_email.message)}</p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="filiacao2_celular">
                            Telefone celular/WhatsApp <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="filiacao2_celular"
                            placeholder="(00) 00000-0000"
                            {...register("filiacao2_celular")}
                            onChange={(e) => setValue("filiacao2_celular", maskPhone(e.target.value))}
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
                            onChange={(e) => setValue("filiacao2_telefone_comercial", maskPhone(e.target.value))}
                          />
                          {errors.filiacao2_telefone_comercial && (
                            <p className="text-sm text-destructive">
                              {String(errors.filiacao2_telefone_comercial.message)}
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

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

          {/* Step 3: Endereço */}
          <StepContent isActive={activeStep === 3}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Home className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Endereço</CardTitle>
                    <CardDescription>Endereço residencial da família</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">CEP *</label>
                    <div className="flex gap-2">
                      <Input 
                        {...register("cep")} 
                        placeholder="00000-000"
                        onChange={(e) => {
                          const masked = maskCEP(e.target.value);
                          setValue("cep", masked);
                          if (masked.replace(/\D/g, "").length === 8) {
                            buscarCep(masked);
                          }
                        }}
                      />
                      {buscandoCep && <Spinner className="h-4 w-4 animate-spin self-center" />}
                    </div>
                    {errors.cep && <p className="text-sm text-destructive">{errors.cep.message}</p>}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Logradouro</label>
                    <Input {...register("logradouro")} placeholder="Rua, Avenida, etc." />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Número</label>
                    <Input {...register("numero")} placeholder="Nº" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Complemento</label>
                    <Input {...register("complemento")} placeholder="Apto, Bloco" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Bairro</label>
                    <Input {...register("bairro")} placeholder="Bairro" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cidade</label>
                    <Input {...register("cidade")} placeholder="Cidade" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estado</label>
                    <Input {...register("estado")} placeholder="UF" maxLength={2} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unidade_consumidora">
                      Unidade consumidora <span className="text-destructive">*</span>
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
                    <input type="hidden" {...register("forma_ocupacao_moradia" as any)} />
                    <Select
                      value={String((watchedFields as any).forma_ocupacao_moradia || "")}
                      onValueChange={(value) =>
                        setValue("forma_ocupacao_moradia" as any, value, {
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
                      Qual? <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="forma_ocupacao_moradia_outro"
                      placeholder="Informe a forma de ocupação"
                      {...register("forma_ocupacao_moradia_outro" as any)}
                    />
                    {errors.forma_ocupacao_moradia_outro && (
                      <p className="text-sm text-destructive">{String(errors.forma_ocupacao_moradia_outro.message)}</p>
                    )}
                  </div>
                )}

                {zoneamentoConfig.habilitado &&
                  ((configExtras.prioridade_zona_bonus_dentro ?? 0) > 0 || (configExtras.prioridade_zona_bonus_fora ?? 0) > 0) && (
                    <p className="text-xs text-muted-foreground">
                      A zona de atendimento é identificada automaticamente pelo seu CEP/bairro; {plural} da sua zona recebem{" "}
                      {configExtras.prioridade_zona_bonus_dentro ?? 0} ponto(s) a mais; fora da zona recebem{" "}
                      {configExtras.prioridade_zona_bonus_fora ?? 0} ponto(s).
                    </p>
                  )}

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

          {/* Step 4: Critérios de Prioridade */}
          <StepContent isActive={activeStep === 4}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Star className="h-4 w-4" />
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

          {/* Step 5: Preferências */}
          <StepContent isActive={activeStep === 5}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Building className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Preferências de {singular}</CardTitle>
                    <CardDescription>Selecione as opções de {singular} de preferência</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {camposDinamicosPreferencias.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {camposDinamicosPreferencias.filter(campoVisivel).map((campo) => (
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

                {/* Mapa de CMEIs */}
                {cmeisOrdenadosFiltrados && cmeisOrdenadosFiltrados.length > 0 && (
                  <CMEIsMapSelector
                    cmeis={cmeisOrdenadosFiltrados}
                    selectedCmei1={watchedFields.cmei1_preferencia || null}
                    selectedCmei2={watchedFields.cmei2_preferencia || null}
                    onSelectCmei1={(id) => setValue("cmei1_preferencia", id)}
                    onSelectCmei2={(id) => setValue("cmei2_preferencia", id)}
                    zonasDetectadas={zonasDetectadas}
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">1ª Opção de {singular}</label>
                    <Select onValueChange={(value) => setValue("cmei1_preferencia", value)} value={watchedFields.cmei1_preferencia}>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingCMEIs ? "Carregando..." : `Selecione ${singular}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {cmeisOrdenadosFiltrados?.map((cmei) => (
                          <SelectItem key={cmei.id} value={cmei.id}>
                            <div className="flex items-center gap-2">
                              <span>{cmei.nome}</span>
                              {zoneamentoConfig.habilitado && cmeiEstaNaZona(cmei) && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                  Sua região
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">2ª Opção de {singular}</label>
                    <Select onValueChange={(value) => setValue("cmei2_preferencia", value)} value={watchedFields.cmei2_preferencia} disabled={!watchedFields.cmei1_preferencia}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={!watchedFields.cmei1_preferencia ? "Selecione a 1ª opção primeiro" : `Selecione ${singular}`}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {cmeisOrdenadosFiltrados?.filter(cmei => cmei.id !== watchedFields.cmei1_preferencia).map((cmei) => (
                          <SelectItem key={cmei.id} value={cmei.id}>
                            <div className="flex items-center gap-2">
                              <span>{cmei.nome}</span>
                              {zoneamentoConfig.habilitado && cmeiEstaNaZona(cmei) && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                  Sua região
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {preferenciasCmeiQtd === 3 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">3ª Opção de {singular}</label>
                      <Select
                        onValueChange={(value) => setValue("cmei3_preferencia" as any, value)}
                        value={(watchedFields as any).cmei3_preferencia}
                        disabled={!watchedFields.cmei1_preferencia}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={!watchedFields.cmei1_preferencia ? "Selecione a 1ª opção primeiro" : `Selecione ${singular}`}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {cmeisOrdenadosFiltrados
                            ?.filter(
                              (cmei) => cmei.id !== watchedFields.cmei1_preferencia && cmei.id !== watchedFields.cmei2_preferencia,
                            )
                            .map((cmei) => (
                              <SelectItem key={cmei.id} value={cmei.id}>
                                <div className="flex items-center gap-2">
                                  <span>{cmei.nome}</span>
                                  {zoneamentoConfig.habilitado && cmeiEstaNaZona(cmei) && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs px-1.5 py-0 h-5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    >
                                      Sua região
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="aceita_qualquer_cmei"
                      checked={watchedFields.aceita_qualquer_cmei}
                      onCheckedChange={(checked) => setValue("aceita_qualquer_cmei", checked as boolean)}
                    />
                    <label htmlFor="aceita_qualquer_cmei" className="text-sm font-medium leading-none">
                      Aceito vaga em qualquer {singular} disponível
                    </label>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Observações
                  </label>
                  <Textarea 
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

                {camposDinamicosObservacoes.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
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
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-primary" />
                    <span className="font-medium">Documentos (Opcional)</span>
                  </div>
                  <DocumentosUpload onDocumentosChange={setPendingDocumentos} />
                </div>
              </CardContent>
            </Card>
          </StepContent>

          {/* Step 6: Revisão */}
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
                    <Button type="button" variant="ghost" size="sm" onClick={() => setActiveStep(1)} className="h-7 text-xs">
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
                    <Button type="button" variant="ghost" size="sm" onClick={() => setActiveStep(2)} className="h-7 text-xs">
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
                    <div>
                      <span className="text-muted-foreground">Telefone Principal:</span>
                      <p className="font-medium">{watchedFields.responsavel_telefone || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Telefone Secundário:</span>
                      <p className="font-medium">{watchedFields.responsavel_celular || "Não informado"}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">E-mail:</span>
                      <p className="font-medium">{watchedFields.responsavel_email || "Não informado"}</p>
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
                    <Button type="button" variant="ghost" size="sm" onClick={() => setActiveStep(3)} className="h-7 text-xs">
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                  </div>
                  <div className="text-sm bg-muted/50 rounded-lg p-4">
                    {watchedFields.logradouro || watchedFields.cep ? (
                      <div className="space-y-1">
                        <p className="font-medium">
                          {[watchedFields.logradouro, watchedFields.numero && `nº ${watchedFields.numero}`].filter(Boolean).join(", ") || "-"}
                        </p>
                        <p className="text-muted-foreground">
                          {[watchedFields.bairro, watchedFields.cidade, watchedFields.estado].filter(Boolean).join(" - ") || "-"}
                        </p>
                        {watchedFields.cep && <p className="text-muted-foreground">CEP: {watchedFields.cep}</p>}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Endereço não informado</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Critérios de Prioridade */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold flex items-center gap-2 text-primary">
                      <Star className="h-4 w-4" />
                      Critérios de Prioridade
                    </h4>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setActiveStep(4)} className="h-7 text-xs">
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                  </div>
                  <div className="text-sm bg-muted/50 rounded-lg p-4 space-y-2">
                    {temPrioridade === false ? (
                      <p className="text-muted-foreground">Nenhum critério de prioridade informado.</p>
                    ) : prioridadesFederaisSelecionadas.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
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
                    ) : (
                      <p className="text-muted-foreground">Não informado</p>
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
                    <Button type="button" variant="ghost" size="sm" onClick={() => setActiveStep(5)} className="h-7 text-xs">
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
                      {preferenciasCmeiQtd === 3 && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">3ª Opção:</span>
                          <p className="font-medium">
                            {cmeisOrdenados?.find(c => c.id === (watchedFields as any).cmei3_preferencia)?.nome || "Não selecionado"}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="pt-1">
                      <span className="text-muted-foreground">Período:</span>
                      <p className="font-medium">{(watchedFields as any).periodo || "-"}</p>
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
                <Button type="button" variant="outline" onClick={handlePrevStep} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </Button>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => navigate("/modulo/vagou/responsavel")}>
                Cancelar
              </Button>
              
              {activeStep < 6 ? (
                <Button type="button" onClick={handleNextStep} className="gap-2">
                  {activeStep === 5 ? "Revisar" : "Próximo"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  type="button" 
                  onClick={handleSubmit(onSubmit, onInvalid)}
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
              )}
            </div>
          </div>
        </form>
      </div>
    </ResponsavelLayout>
  );
};

export default NovaInscricao;
