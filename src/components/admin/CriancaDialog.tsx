import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Spinner } from "@/components/common/Spinner";
import { FieldErrors, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useCMEIs } from "@/hooks/api/supabase-hooks";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";
import { toast } from "sonner";
import { AlertCircle, Info, Search, Baby, Users, Home, Building, ChevronDown, Check, Upload, Sparkles } from "lucide-react";
import { maskCPF, maskPhone, maskCEP, unmask } from "@/utils/masks";
import { DynamicFormField, deveRenderizarDinamicamente } from "@/components/inscricao/DynamicFormField";
import { useCamposInscricao, useSaveValoresCamposCustom } from "@/hooks/api/campos-inscricao-hooks";
import { validarIdadeMaximaInscricao, validarIdadeMinimaInscricao } from "@/utils/validations/idade-inscricao";
import { CONFIG_PADRAO, determinarTurmaBaseComCorte, determinarTurmaBaseEscolarComCorte, encontrarTurmaSugerida } from "@/utils/turma-utils";
import { validarCPF } from "@/utils/validations/inscricao";
import { cn } from "@/utils/utils";
import { PRIORIDADES_FEDERAIS_PADRAO } from "@/constants/prioridades-federais";
import { useCriancaPrioridades, useTiposPrioridadeAtivos, uploadDocumentoComprovantePrioridade } from "@/hooks/api/prioridades-hooks";
import { useDocumentosTiposAtivos } from "@/hooks/api/documentos-hooks";
import { useZonasAtendimentoAtivas } from "@/hooks/api/zonas-hooks";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";

const parseISODateOnly = (value: string): Date | null => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const getTodayISODate = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isNotFutureDate = (value: string): boolean => {
  const date = parseISODateOnly(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() <= today.getTime();
};

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

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const gerarCpfValido = (): string => {
  const randomDigit = () => Math.floor(Math.random() * 10);
  const calcDigit = (digits: number[]) => {
    const fator = digits.length + 1;
    const soma = digits.reduce((acc, d, idx) => acc + d * (fator - idx), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  while (true) {
    const base = Array.from({ length: 9 }, randomDigit);
    if (base.every((d) => d === base[0])) continue;
    const d1 = calcDigit(base);
    const d2 = calcDigit([...base, d1]);
    const cpf = [...base, d1, d2].join("");
    if (validarCPF(cpf)) return cpf;
  }
};

const NOMES_CRIANCA = [
  "Ana", "Miguel", "Helena", "Theo", "Laura", "Davi", "Valentina", "Gael", "Alice", "Benicio",
  "Cecilia", "Arthur", "Maitê", "Heitor", "Liz", "Noah", "Sofia", "Samuel", "Antonella", "Ravi",
];

const SOBRENOMES = [
  "Silva", "Souza", "Oliveira", "Santos", "Lima", "Costa", "Pereira", "Ferreira", "Rodrigues", "Almeida",
];

const LOGRADOUROS = [
  "Rua das Flores", "Rua do Sol", "Rua Primavera", "Avenida Brasil", "Rua das Acacias", "Rua das Palmeiras",
  "Rua Esperanca", "Rua das Criancas", "Avenida Central", "Rua da Paz",
];

const BAIRROS = [
  "Centro", "Jardim Primavera", "Vila Nova", "Santa Luzia", "Bela Vista", "Jardim das Flores",
];

const CIDADES = ["Curitiba", "Pinhais", "Colombo", "Araucaria", "Sao Jose dos Pinhais"];
const UF_OPCOES = ["PR", "SC", "SP"];

const pickRandom = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const gerarNomeCompletoAleatorio = () =>
  `${pickRandom(NOMES_CRIANCA)} ${pickRandom(SOBRENOMES)} ${pickRandom(SOBRENOMES)}`;

const gerarEmailAleatorio = (nome: string) => {
  const slug = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .replace(/\s+/g, ".");

  return `${slug}${randomInt(10, 99)}@teste.local`;
};

const gerarDataNascimentoAleatoria = () => {
  const hoje = new Date();
  const mesesAtras = randomInt(6, 60);
  const data = new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras, randomInt(1, 28));
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
};

const gerarTelefoneAleatorio = () => {
  const ddd = pickRandom(["41", "42", "43", "44", "45", "46"]);
  const numero = `9${randomInt(1000, 9999)}${randomInt(1000, 9999)}`;
  return `${ddd}${numero}`;
};

const gerarCepAleatorio = () =>
  `${randomInt(80000, 89999)}${String(randomInt(0, 999)).padStart(3, "0")}`;

const gerarNisAleatorio = () =>
  Array.from({ length: 11 }, () => randomInt(0, 9)).join("");

const criancaSchemaCompleto = z.object({
  // Dados da criança
  nome: z.string().min(1, "Nome é obrigatório"),
  data_nascimento: z
    .string()
    .min(1, "Data de nascimento é obrigatória")
    .refine(isNotFutureDate, "Data de nascimento não pode ser futura"),
  sexo: z.enum(["Masculino", "Feminino"]),
  cpf_crianca: z.string().optional().refine((val) => !val || validarCPF(val), "CPF inválido"),
  certidao_nascimento: z.string().optional(),
  cor_raca_autodeclarada: z.preprocess(
    emptyToUndefined,
    z.enum(["amarela", "branca", "indigena", "parda", "preta", "nao_declarada"], {
      required_error: "Selecione a cor/raça autodeclarada",
    }),
  ),
  cor_raca_certidao: z.preprocess(
    emptyToUndefined,
    z.enum(["amarela", "branca", "indigena", "parda", "preta", "nao_declarada"], {
      required_error: "Selecione a cor/raça na certidão de nascimento",
    }),
  ),
  etnia_indigena: z.preprocess(
    emptyToUndefined,
    z.enum(["guarani", "kaingang", "xeta", "xokleng", "outra"]).optional(),
  ),
  etnia_indigena_outra: z.string().optional(),
  quilombo_remanescente: z.preprocess(
    emptyToUndefined,
    z.enum(["sim", "nao"], {
      required_error: "Informe se é remanescente de quilombo",
    }),
  ),
  quilombo_nome: z.string().optional(),
  nacionalidade: z.preprocess(
    emptyToUndefined,
    z.enum(["brasileira", "brasileira_naturalizado", "estrangeira"], {
      required_error: "Selecione a nacionalidade",
    }),
  ),
  estrangeiro_possui_documentos: z.preprocess(
    emptyToUndefined,
    z.enum(["sim", "nao"]).optional(),
  ),
  nis: z
    .string()
    .optional()
    .refine((val) => !val || val.replace(/\D/g, "").length === 11, "NIS inválido"),
  
  // Programas e preferências
  programas_sociais: z.boolean(),
  aceita_qualquer_cmei: z.boolean(),
  turma_atual_id: z.string().optional(),
  cmei1_preferencia: z.string().optional(),
  cmei2_preferencia: z.string().optional(),
  cmei3_preferencia: z.string().optional(),
  prioridades_ids: z.array(z.string()).optional().default([]),
  
  // Dados do responsável
  responsavel_cpf: z.string()
    .min(11, "CPF é obrigatório")
    .refine((cpf) => validarCPF(cpf), "CPF inválido"),
  responsavel_nome: z.string().min(1, "Nome do responsável é obrigatório"),
  responsavel_telefone: z.string().min(10, "Telefone é obrigatório"),
  responsavel_email: z.string().optional(),
  responsavel_celular: z.string().optional(),
  responsavel_rg: z.string().optional(),
  responsavel_parentesco: z.preprocess(
    emptyToUndefined,
    z.enum(
      [
        "pai",
        "mae",
        "avo",
        "avoa",
        "tio",
        "tia",
        "padrasto",
        "madrasta",
        "irmao",
        "irma",
        "tutor_legal",
        "guardiao",
        "outro",
      ],
      { required_error: "Selecione o parentesco do responsável com a criança" },
    ),
  ),
  responsavel_parentesco_outro: z.string().optional(),
  responsavel_telefone_comercial: z.string().optional(),
  filiacao1_nao_declarada: z.boolean().default(false),
  filiacao1_nome: z.string().optional(),
  filiacao1_rg: z.string().optional(),
  filiacao1_cpf: z.string().optional().refine((val) => !val || validarCPF(val), "CPF inválido"),
  filiacao1_email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  filiacao1_celular: z.string().optional(),
  filiacao1_telefone_comercial: z.string().optional(),
  filiacao2_nao_declarada: z.boolean().default(false),
  filiacao2_nome: z.string().optional(),
  filiacao2_rg: z.string().optional(),
  filiacao2_cpf: z.string().optional().refine((val) => !val || validarCPF(val), "CPF inválido"),
  filiacao2_email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  filiacao2_celular: z.string().optional(),
  filiacao2_telefone_comercial: z.string().optional(),
  
  // Endereço
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  zona_atendimento_id: z.string().optional(),
  unidade_consumidora: z.string().min(1, "Unidade consumidora é obrigatória"),
  forma_ocupacao_moradia: z.preprocess(
    emptyToUndefined,
    z.enum(
      [
        "optou_nao_informar",
        "propria",
        "alugada",
        "cedida",
        "pensionato",
        "casa_lar_abrigo",
        "outro",
      ],
      { required_error: "Selecione a forma de ocupação da moradia" },
    ),
  ),
  forma_ocupacao_moradia_outro: z.string().optional(),
  
  // Observações
  observacoes: z.string().optional(),
}).passthrough().superRefine((data, ctx) => {
  const isIndigena = data.cor_raca_autodeclarada === "indigena" || data.cor_raca_certidao === "indigena";
  if (isIndigena && !data.etnia_indigena) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["etnia_indigena"],
      message: "Selecione a etnia indígena",
    });
  }
  if (data.etnia_indigena === "outra" && !(data.etnia_indigena_outra || "").trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["etnia_indigena_outra"],
      message: "Informe qual etnia",
    });
  }

  if (data.quilombo_remanescente === "sim" && !(data.quilombo_nome || "").trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["quilombo_nome"],
      message: "Informe qual quilombo",
    });
  }

  if (data.nacionalidade === "estrangeira" && !data.estrangeiro_possui_documentos) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["estrangeiro_possui_documentos"],
      message: "Informe se possui documentos",
    });
  }

  if (data.forma_ocupacao_moradia === "outro" && !(data.forma_ocupacao_moradia_outro || "").trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["forma_ocupacao_moradia_outro"],
      message: "Informe qual forma de ocupação",
    });
  }

  if (data.responsavel_parentesco === "outro" && !(data.responsavel_parentesco_outro || "").trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["responsavel_parentesco_outro"],
      message: "Informe o parentesco",
    });
  }

  if (!data.filiacao1_nao_declarada) {
    if (!(data.filiacao1_nome || "").trim() || (data.filiacao1_nome || "").trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["filiacao1_nome"],
        message: "Filiação 1 é obrigatória",
      });
    }
    if (!(data.filiacao1_cpf || "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["filiacao1_cpf"],
        message: "CPF da Filiação 1 é obrigatório",
      });
    }
    if (!(data.filiacao1_celular || "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["filiacao1_celular"],
        message: "Telefone celular/WhatsApp da Filiação 1 é obrigatório",
      });
    }
  }

  if (!data.filiacao2_nao_declarada) {
    if (!(data.filiacao2_nome || "").trim() || (data.filiacao2_nome || "").trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["filiacao2_nome"],
        message: "Filiação 2 é obrigatória",
      });
    }
    if (!(data.filiacao2_cpf || "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["filiacao2_cpf"],
        message: "CPF da Filiação 2 é obrigatório",
      });
    }
    if (!(data.filiacao2_celular || "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["filiacao2_celular"],
        message: "Telefone celular/WhatsApp da Filiação 2 é obrigatório",
      });
    }
  }
});

const criancaSchemaParcial = z
  .object({
    nome: z.string().min(1, "Nome é obrigatório"),
    data_nascimento: z
      .string()
      .min(1, "Data de nascimento é obrigatória")
      .refine(isNotFutureDate, "Data de nascimento não pode ser futura"),
    sexo: z.enum(["Masculino", "Feminino"]),
    cpf_crianca: z
      .string()
      .optional()
      .refine((val) => !val || !val.trim() || validarCPF(val), "CPF inválido"),
    certidao_nascimento: z.string().optional(),
    cor_raca_autodeclarada: z.preprocess(emptyToUndefined, z.enum(OPCOES_COR_RACA.map((o) => o.value) as any).optional()),
    cor_raca_certidao: z.preprocess(emptyToUndefined, z.enum(OPCOES_COR_RACA.map((o) => o.value) as any).optional()),
    etnia_indigena: z.preprocess(emptyToUndefined, z.enum(OPCOES_ETNIA_INDIGENA.map((o) => o.value) as any).optional()),
    etnia_indigena_outra: z.string().optional(),
    quilombo_remanescente: z.preprocess(emptyToUndefined, z.enum(["sim", "nao"]).optional()),
    quilombo_nome: z.string().optional(),
    nacionalidade: z.preprocess(emptyToUndefined, z.enum(OPCOES_NACIONALIDADE.map((o) => o.value) as any).optional()),
    estrangeiro_possui_documentos: z.preprocess(emptyToUndefined, z.enum(["sim", "nao"]).optional()),
    nis: z
      .string()
      .optional()
      .refine((val) => !val || !val.trim() || val.replace(/\D/g, "").length === 11, "NIS inválido"),
    programas_sociais: z.boolean(),
    aceita_qualquer_cmei: z.boolean(),
    turma_atual_id: z.string().optional(),
    cmei1_preferencia: z.string().optional(),
    cmei2_preferencia: z.string().optional(),
    cmei3_preferencia: z.string().optional(),
    prioridades_ids: z.array(z.string()).optional().default([]),
    responsavel_cpf: z
      .string()
      .optional()
      .refine((val) => !val || !val.trim() || validarCPF(val), "CPF inválido"),
    responsavel_nome: z.string().optional(),
    responsavel_telefone: z
      .string()
      .optional()
      .refine((val) => !val || !val.trim() || unmask(val).length >= 10, "Telefone inválido"),
    responsavel_email: z.string().optional(),
    responsavel_celular: z.string().optional(),
    responsavel_rg: z.string().optional(),
    responsavel_parentesco: z.preprocess(emptyToUndefined, z.enum(OPCOES_PARENTESCO.map((o) => o.value) as any).optional()),
    responsavel_parentesco_outro: z.string().optional(),
    responsavel_telefone_comercial: z.string().optional(),
    filiacao1_nao_declarada: z.boolean().default(false),
    filiacao1_nome: z.string().optional(),
    filiacao1_rg: z.string().optional(),
    filiacao1_cpf: z
      .string()
      .optional()
      .refine((val) => !val || !val.trim() || validarCPF(val), "CPF inválido"),
    filiacao1_email: z.string().optional().or(z.literal("")),
    filiacao1_celular: z.string().optional(),
    filiacao1_telefone_comercial: z.string().optional(),
    filiacao2_nao_declarada: z.boolean().default(false),
    filiacao2_nome: z.string().optional(),
    filiacao2_rg: z.string().optional(),
    filiacao2_cpf: z
      .string()
      .optional()
      .refine((val) => !val || !val.trim() || validarCPF(val), "CPF inválido"),
    filiacao2_email: z.string().optional().or(z.literal("")),
    filiacao2_celular: z.string().optional(),
    filiacao2_telefone_comercial: z.string().optional(),
    cep: z.string().optional(),
    logradouro: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional(),
    zona_atendimento_id: z.string().optional(),
    unidade_consumidora: z.string().optional(),
    forma_ocupacao_moradia: z.preprocess(emptyToUndefined, z.enum(OPCOES_FORMA_OCUPACAO.map((o) => o.value) as any).optional()),
    forma_ocupacao_moradia_outro: z.string().optional(),
    observacoes: z.string().optional(),
  })
  .passthrough();

type CriancaFormDataCompleto = z.infer<typeof criancaSchemaCompleto>;
type CriancaFormDataParcial = z.infer<typeof criancaSchemaParcial>;
type CriancaFormDataAny = (CriancaFormDataCompleto | CriancaFormDataParcial) & Record<string, unknown>;

interface SchoolModeConfig {
  initialCmeiId?: string;
  allowedSchools?: Array<{ id: string; nome: string }>;
  initialTurmaId?: string;
  moduloOrigem: "sam" | "sondar";
}

interface CriancaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criancaId?: string;
  tipoUnidadeOverride?: "escola" | "cmei_creche";
  schoolMode?: SchoolModeConfig;
}

export function CriancaDialog({ open, onOpenChange, criancaId, tipoUnidadeOverride, schoolMode }: CriancaDialogProps) {
  const queryClient = useQueryClient();
  const maxDataNascimento = getTodayISODate();
  const [searchParams] = useSearchParams();
  const isSchoolMode = !!schoolMode;
  const tipoUnidade = tipoUnidadeOverride || (isSchoolMode || searchParams.get("tipo") === "escola" ? "escola" : "cmei_creche");
  const { data: cmeis } = useCMEIs({ tipoUnidade });
  const { data: config } = useConfiguracoesSistema();
  const { singular } = getUnidadeLabels(config as any);
  const configExtras = (config ?? {}) as unknown as Partial<{
    idade_maxima_anos: number | null;
    idade_minima_meses: number | null;
    data_corte_mes: number | null;
    data_corte_dia: number | null;
    mensagem_idade_fora_faixa: string | null;
    limite_inscricoes_responsavel: number | null;
    preferencias_cmei_qtd: number | null;
  }>;
  const comprovacaoNaInscricao = (config as any)?.prioridades_comprovacao_na_inscricao ?? true;
  const prioridadeZonaHabilitada = (config as any)?.prioridade_zona_habilitada ?? false;
  const { data: zonasAtivas } = useZonasAtendimentoAtivas();
  const saveValoresCustom = useSaveValoresCamposCustom();
  const { data: tiposPrioridadeAtivos } = useTiposPrioridadeAtivos();
  const { data: documentosTiposAtivos } = useDocumentosTiposAtivos();
  const { data: prioridadesExistentes } = useCriancaPrioridades(criancaId ?? "");
  const [comprovantesPrioridade, setComprovantesPrioridade] = useState<Record<string, File | null>>({});
  const { userRoles } = useAuth();
  const isSuperAdmin = userRoles.includes("superadmin");
  const [permitirDadosIncompletos, setPermitirDadosIncompletos] = useState(false);
  
  // Máscaras de campos
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [celular, setCelular] = useState("");
  const [cep, setCep] = useState("");
  
  // Estados de controle
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [buscandoCpf, setBuscandoCpf] = useState(false);
  const [buscandoCpfCrianca, setBuscandoCpfCrianca] = useState(false);
  const [cpfPreenchido, setCpfPreenchido] = useState(false);
  const [forcarDuplicado, setForcarDuplicado] = useState(false);
  const [forcarLimite, setForcarLimite] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<Array<{ path: string; message: string }>>([]);
  const isEditing = !!criancaId;

  // Buscar campos dinâmicos por seção
  const { data: camposCrianca } = useCamposInscricao("crianca");
  const { data: camposResponsavel } = useCamposInscricao("responsavel");
  const { data: camposEndereco } = useCamposInscricao("endereco");
  const { data: camposPreferencias } = useCamposInscricao("preferencias");
  const { data: camposObservacoes } = useCamposInscricao("observacoes");

  // Filtrar campos dinâmicos
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

  const todosOsCamposCustom = useMemo(() => [
    ...camposDinamicosCrianca,
    ...camposDinamicosResponsavel,
    ...camposDinamicosEndereco,
    ...camposDinamicosPreferencias,
    ...camposDinamicosObservacoes,
  ], [camposDinamicosCrianca, camposDinamicosResponsavel, camposDinamicosEndereco, camposDinamicosPreferencias, camposDinamicosObservacoes]);

  const schemaRef = useRef<z.ZodTypeAny>(criancaSchemaCompleto);
  const schemaAtual = useMemo(() => {
    if (isSuperAdmin && permitirDadosIncompletos) return criancaSchemaParcial;
    return criancaSchemaCompleto;
  }, [isSuperAdmin, permitirDadosIncompletos]);

  useEffect(() => {
    schemaRef.current = schemaAtual;
  }, [schemaAtual]);

  const resolver = useCallback(async (values: any, context: any, options: any) => {
    return zodResolver(schemaRef.current)(values, context, options);
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    watch,
    getValues,
    reset,
    unregister,
    clearErrors,
    formState: { errors },
  } = useForm<CriancaFormDataAny>({
    resolver,
    defaultValues: {
      sexo: "Masculino",
      programas_sociais: false,
      aceita_qualquer_cmei: false,
      cmei_atual_id: schoolMode?.initialCmeiId || "",
      turma_atual_id: schoolMode?.initialTurmaId || "",
      prioridades_ids: [],
      periodo: "Integral",
      cor_raca_autodeclarada: "" as any,
      cor_raca_certidao: "" as any,
      quilombo_remanescente: "" as any,
      nacionalidade: "" as any,
      unidade_consumidora: "",
      forma_ocupacao_moradia: "" as any,
      filiacao1_nao_declarada: false,
      filiacao2_nao_declarada: false,
    },
  });

  const dataNascimento = watch("data_nascimento");
  const cmeiAtualSelecionado = watch("cmei_atual_id");
  const turmaAtualSelecionada = watch("turma_atual_id");
  const cmei1Selecionado = watch("cmei1_preferencia");
  const cmei2Selecionado = watch("cmei2_preferencia");
  const cmei3Selecionado = watch("cmei3_preferencia");
  const watchedFields = watch();
  const corRacaAutodeclaradaAtual = String((watchedFields as any).cor_raca_autodeclarada || "");
  const corRacaCertidaoAtual = String((watchedFields as any).cor_raca_certidao || "");
  const nacionalidadeAtual = String((watchedFields as any).nacionalidade || "");
  const schoolSelectableCmeis = useMemo(
    () => (schoolMode?.allowedSchools?.length ? schoolMode.allowedSchools : (cmeis || [])).sort((a, b) => a.nome.localeCompare(b.nome)),
    [cmeis, schoolMode?.allowedSchools]
  );
  const { data: schoolTurmas } = useQuery({
    queryKey: ["school-form-turmas", cmeiAtualSelecionado || schoolMode?.initialCmeiId],
    enabled: isSchoolMode && !!(cmeiAtualSelecionado || schoolMode?.initialCmeiId),
    queryFn: async () => {
      const cmeiId = cmeiAtualSelecionado || schoolMode?.initialCmeiId;
      const { data, error } = await supabase
        .from("turmas")
        .select("id, nome")
        .eq("cmei_id", cmeiId!)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return (data || []) as Array<{ id: string; nome: string | null }>;
    },
  });

  const campoVisivel = (campo: (typeof todosOsCamposCustom)[number]) => {
    if (!campo.depende_de || !campo.depende_valor) return true;
    const depValue = (watchedFields as any)[campo.depende_de] as unknown;
    if (depValue === null || depValue === undefined) return false;
    const esperado = String(campo.depende_valor).trim().toLowerCase();
    const atual = typeof depValue === "boolean" ? String(depValue) : String(depValue).trim().toLowerCase();
    return atual === esperado;
  };

  useEffect(() => {
    if (!open) return;
    setSubmitErrors([]);
    (todosOsCamposCustom || []).forEach((campo) => {
      if (!campo.depende_de || !campo.depende_valor) return;
      if (campoVisivel(campo)) return;
      const current = (watchedFields as any)[campo.nome_campo];
      if (current !== undefined && current !== null && String(current).trim() !== "") {
        if (campo.tipo === "checkbox") {
          setValue(campo.nome_campo as any, false, { shouldDirty: true, shouldValidate: false });
        } else {
          setValue(campo.nome_campo as any, "", { shouldDirty: true, shouldValidate: false });
        }
      }
      clearErrors(campo.nome_campo as any);
      unregister(campo.nome_campo as any);
    });
  }, [open, todosOsCamposCustom, watchedFields, setValue, clearErrors, unregister]);

  useEffect(() => {
    if (!open) return;
    if (submitErrors.length === 0) return;
    setSubmitErrors([]);
  }, [open, submitErrors.length, corRacaAutodeclaradaAtual, corRacaCertidaoAtual, nacionalidadeAtual]);

  const prioridadeIdsRaw = (watchedFields as any).prioridades_ids as unknown;
  const prioridadeIds = Array.isArray(prioridadeIdsRaw) ? (prioridadeIdsRaw as string[]) : [];

  const permitirRetroativo = (config as any)?.permitir_cadastro_retroativo_admin === true;
  const isAdminUser = (userRoles || []).some((r) => ["admin", "superadmin"].includes(r));
  const podeRetroativo = permitirRetroativo && isAdminUser && !isEditing;
  const retroativoAtivo = watch("retroativo_ativo") as boolean | undefined;
  const retroativoData = watch("retroativo_data") as string | undefined;
  const retroativoJustificativa = watch("retroativo_justificativa") as string | undefined;

  const itensPrioridadeFederais = useMemo(() => {
    const tipos = tiposPrioridadeAtivos || [];
    return PRIORIDADES_FEDERAIS_PADRAO.map((seed) => ({
      seed,
      tipo: tipos.find((t) => t.codigo === seed.codigo),
    }));
  }, [tiposPrioridadeAtivos]);

  const prioridadesFederaisSelecionadas = useMemo(() => {
    return itensPrioridadeFederais.filter((i) => i.tipo?.id && prioridadeIds.includes(i.tipo.id));
  }, [itensPrioridadeFederais, prioridadeIds]);

  const docNomePorId = useMemo(() => {
    const map = new Map<string, string>();
    (documentosTiposAtivos || []).forEach((d) => map.set(d.id, d.nome));
    return map;
  }, [documentosTiposAtivos]);

  const prioridadeExistentePorId = useMemo(() => {
    const map = new Map<string, { url: string | null; status: string }>();
    (prioridadesExistentes || []).forEach((p) =>
      map.set(p.prioridade_id, { url: p.documento_comprovante_url ?? null, status: p.status }),
    );
    return map;
  }, [prioridadesExistentes]);

  useEffect(() => {
    if (!open || isEditing) return;

    const campoPeriodo = camposPreferencias?.find((c) => c.nome_campo === "periodo");
    if (!campoPeriodo) return;

    const valorAtual = getValues("periodo");
    if (typeof valorAtual === "string" && valorAtual.trim()) return;

    const hasIntegral = (campoPeriodo.opcoes || []).some((o) => o.value === "Integral");
    if (hasIntegral) {
      setValue("periodo", "Integral", { shouldValidate: true, shouldDirty: false });
      return;
    }

    const primeiraOpcao = campoPeriodo.opcoes?.[0]?.value;
    if (primeiraOpcao) {
      setValue("periodo", primeiraOpcao, { shouldValidate: true, shouldDirty: false });
    }
  }, [open, isEditing, camposPreferencias, getValues, setValue]);

  // Limpar cmei2 se conflitar com cmei1
  useEffect(() => {
    if (cmei1Selecionado && cmei1Selecionado === cmei2Selecionado) {
      setValue("cmei2_preferencia", "");
    }
  }, [cmei1Selecionado, cmei2Selecionado, setValue]);

  useEffect(() => {
    if (!cmei3Selecionado) return;
    if (cmei3Selecionado === cmei1Selecionado) setValue("cmei3_preferencia", "");
    if (cmei3Selecionado === cmei2Selecionado) setValue("cmei3_preferencia", "");
  }, [cmei1Selecionado, cmei2Selecionado, cmei3Selecionado, setValue]);

  // Validação em tempo real da idade
  const validacaoIdadeRealTime = useMemo(() => {
    if (!dataNascimento) return null;
    
    const configIdade = {
      idade_maxima_anos: configExtras.idade_maxima_anos,
      idade_minima_meses: configExtras.idade_minima_meses,
      data_corte_mes: configExtras.data_corte_mes,
      data_corte_dia: configExtras.data_corte_dia,
    };
    
    const validacaoMinima = validarIdadeMinimaInscricao(dataNascimento, configIdade);
    const validacaoMaxima = validarIdadeMaximaInscricao(dataNascimento, configIdade);
    const turmaEscolar = isSchoolMode ? determinarTurmaBaseEscolarComCorte(dataNascimento, configIdade) : null;
    
    return {
      bloqueadoMaximo: isSchoolMode ? turmaEscolar === "Fora da faixa etária" : !validacaoMaxima.valido,
      idadeNaCorte: validacaoMaxima.idadeNaCorte,
      idadeMaxima: isSchoolMode ? 10 : validacaoMaxima.idadeMaxima,
      mensagemMaximo: isSchoolMode
        ? "A criança está fora da faixa etária escolar permitida para cadastro."
        : configExtras.mensagem_idade_fora_faixa || "A criança está fora da faixa etária permitida para inscrição.",
      abaixoMinimo: validacaoMinima.abaixoMinimo,
      mesesFaltando: validacaoMinima.mesesFaltando,
      idadeMeses: validacaoMinima.idadeMeses,
      idadeMinimaMeses: validacaoMinima.idadeMinimaMeses,
    };
  }, [dataNascimento, configExtras, isSchoolMode]);

  // Determinar turma compatível usando configurações do sistema
  const turmaCompativel = useMemo(() => {
    if (!dataNascimento) return null;
    
    const configCorte = {
      data_corte_mes: configExtras.data_corte_mes ?? CONFIG_PADRAO.data_corte_mes,
      data_corte_dia: configExtras.data_corte_dia ?? CONFIG_PADRAO.data_corte_dia,
      idade_minima_meses: configExtras.idade_minima_meses ?? CONFIG_PADRAO.idade_minima_meses,
      idade_maxima_anos: configExtras.idade_maxima_anos ?? CONFIG_PADRAO.idade_maxima_anos,
    };
    
    return isSchoolMode
      ? determinarTurmaBaseEscolarComCorte(dataNascimento, configCorte)
      : determinarTurmaBaseComCorte(dataNascimento, configCorte);
  }, [dataNascimento, configExtras, isSchoolMode]);

  const turmaSugeridaEscolar = useMemo(() => {
    if (!isSchoolMode) return null;
    return encontrarTurmaSugerida(schoolTurmas || [], turmaCompativel);
  }, [isSchoolMode, schoolTurmas, turmaCompativel]);

  const turmaBaseFiltro = useMemo(() => {
    if (isSchoolMode || !turmaCompativel) return null;
    return /^Infantil\s+\d+$/.test(turmaCompativel) ? turmaCompativel : null;
  }, [isSchoolMode, turmaCompativel]);

  const { data: turmasAtivasMin } = useQuery({
    queryKey: ["turmas-ativas-min"],
    enabled: !isSchoolMode,
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

  const cmeisFiltrados = useMemo(() => {
    if (isSchoolMode) return schoolSelectableCmeis;
    if (!cmeis) return [];
    if (!cmeiIdsCompativeis) return cmeis;
    return cmeis.filter((c) => cmeiIdsCompativeis.has(c.id));
  }, [cmeis, cmeiIdsCompativeis, isSchoolMode, schoolSelectableCmeis]);

  useEffect(() => {
    if (!isSchoolMode || !open) return;
    if (!cmeiAtualSelecionado || turmaAtualSelecionada || !turmaSugeridaEscolar?.id) return;
    setValue("turma_atual_id", turmaSugeridaEscolar.id, { shouldDirty: true, shouldValidate: true });
  }, [cmeiAtualSelecionado, isSchoolMode, open, setValue, turmaAtualSelecionada, turmaSugeridaEscolar?.id]);

  useEffect(() => {
    if (!open) return;
    if (!cmeiIdsCompativeis) return;

    const cmei1 = getValues("cmei1_preferencia");
    const cmei2 = getValues("cmei2_preferencia");

    if (cmei1 && !cmeiIdsCompativeis.has(cmei1)) {
      setValue("cmei1_preferencia", "");
      setValue("cmei2_preferencia", "");
      return;
    }

    if (cmei2 && !cmeiIdsCompativeis.has(cmei2)) {
      setValue("cmei2_preferencia", "");
    }
  }, [open, cmeiIdsCompativeis, getValues, setValue]);

  // Busca automática de CEP via ViaCEP
  const buscarCep = async (cepValue: string) => {
    const cepLimpo = cepValue.replace(/\D/g, "");
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
      console.error("Erro ao buscar CEP:", error);
      toast.error("Erro ao buscar CEP. Preencha manualmente.");
    } finally {
      setBuscandoCep(false);
    }
  };

  // Busca automática de dados do responsável pelo CPF
  const buscarResponsavelPorCpf = async (cpfValue: string) => {
    const cpfLimpo = cpfValue.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) return;
    
    setBuscandoCpf(true);
    try {
      const { data: responsavelExistente } = await supabase
        .from("criancas")
        .select("responsavel_nome, responsavel_telefone, responsavel_celular, responsavel_email, cep, logradouro, numero, complemento, bairro, cidade, estado")
        .eq("responsavel_cpf", cpfLimpo)
        .limit(1)
        .maybeSingle();
      
      if (responsavelExistente) {
        setValue("responsavel_nome", responsavelExistente.responsavel_nome || "");
        setValue("responsavel_telefone", responsavelExistente.responsavel_telefone || "");
        setValue("responsavel_celular", responsavelExistente.responsavel_celular || "");
        setValue("responsavel_email", responsavelExistente.responsavel_email || "");
        setTelefone(responsavelExistente.responsavel_telefone ? maskPhone(responsavelExistente.responsavel_telefone) : "");
        setCelular(responsavelExistente.responsavel_celular ? maskPhone(responsavelExistente.responsavel_celular) : "");
        
        // Preencher endereço se existir
        if (responsavelExistente.cep) {
          setValue("cep", responsavelExistente.cep);
          setValue("logradouro", responsavelExistente.logradouro || "");
          setValue("numero", responsavelExistente.numero || "");
          setValue("complemento", responsavelExistente.complemento || "");
          setValue("bairro", responsavelExistente.bairro || "");
          setValue("cidade", responsavelExistente.cidade || "");
          setValue("estado", responsavelExistente.estado || "");
          setCep(maskCEP(responsavelExistente.cep));
        }
        
        setCpfPreenchido(true);
        toast.success("Dados do responsável preenchidos automaticamente!");
      } else {
        setCpfPreenchido(false);
        try {
          if ((config as any)?.cpfhub_habilitado === true || (config as any)?.apicpf_habilitado === true) {
            const { data } = await supabase.functions.invoke("consultar-cpf", {
              body: { cpf: cpfLimpo, tipo: "responsavel" },
            });
            const nome = typeof data?.nome === "string" ? data.nome : "";
            if (nome) {
              setValue("responsavel_nome", nome, { shouldValidate: true, shouldDirty: true });
              toast.success("Nome do responsável preenchido automaticamente!");
            }
          }
        } catch {
          /* silencioso */
        }
      }
    } catch (error) {
      console.error("Erro ao buscar responsável:", error);
    } finally {
      setBuscandoCpf(false);
    }
  };

  // Busca automática de dados da criança pelo CPF (nome e data)
  const buscarCriancaPorCpf = async (cpfValue: string) => {
    const cpfLimpo = cpfValue.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) return;
    if ((config as any)?.cpfhub_habilitado !== true && (config as any)?.apicpf_habilitado !== true) return;

    setBuscandoCpfCrianca(true);
    try {
      const { data } = await supabase.functions.invoke("consultar-cpf", {
        body: { cpf: cpfLimpo, tipo: "crianca" },
      });
      const nome = typeof data?.nome === "string" ? data.nome : "";
      const dataNascimento = typeof data?.data_nascimento === "string" ? data.data_nascimento : "";
      if (nome) setValue("nome", nome, { shouldValidate: true, shouldDirty: true });
      if (dataNascimento) setValue("data_nascimento", dataNascimento, { shouldValidate: true, shouldDirty: true });
      if (nome || dataNascimento) toast.success("Dados da criança preenchidos automaticamente!");
    } catch {
      /* silencioso */
    } finally {
      setBuscandoCpfCrianca(false);
    }
  };
  // Load existing data if editing, or reset form for new registration
  useEffect(() => {
    if (open && criancaId) {
      // Modo edição: carregar dados existentes
      const loadCrianca = async () => {
        const { data, error } = await supabase
          .from("criancas")
          .select("*")
          .eq("id", criancaId)
          .single();

        if (error) {
          toast.error("Erro ao carregar dados da criança");
          return;
        }

        if (data) {
          reset({
            nome: data.nome,
            data_nascimento: data.data_nascimento,
            sexo: data.sexo,
            cpf_crianca: data.cpf_crianca || "",
            certidao_nascimento: data.certidao_nascimento || "",
            cor_raca_autodeclarada: data.cor_raca_autodeclarada || "",
            cor_raca_certidao: data.cor_raca_certidao || "",
            etnia_indigena: data.etnia_indigena || "",
            etnia_indigena_outra: data.etnia_indigena_outra || "",
            quilombo_remanescente:
              (typeof data.quilombo_remanescente === "boolean" ? (data.quilombo_remanescente ? "sim" : "nao") : "") as any,
            quilombo_nome: data.quilombo_nome || "",
            nacionalidade: data.nacionalidade || "",
            estrangeiro_possui_documentos:
              (typeof data.estrangeiro_possui_documentos === "boolean"
                ? (data.estrangeiro_possui_documentos ? "sim" : "nao")
                : "") as any,
            nis: data.nis || "",
            programas_sociais: data.programas_sociais || false,
            aceita_qualquer_cmei: data.aceita_qualquer_cmei || false,
            cmei_atual_id: data.cmei_atual_id || "",
            turma_atual_id: data.turma_atual_id || "",
            cmei1_preferencia: data.cmei1_preferencia || "",
            cmei2_preferencia: data.cmei2_preferencia || "",
            prioridades_ids: [],
            responsavel_cpf: data.responsavel_cpf,
            responsavel_nome: data.responsavel_nome,
            responsavel_telefone: data.responsavel_telefone,
            responsavel_email: data.responsavel_email || "",
            responsavel_celular: data.responsavel_celular || "",
            responsavel_rg: data.responsavel_rg || "",
            responsavel_parentesco: data.responsavel_parentesco || "",
            responsavel_parentesco_outro: data.responsavel_parentesco_outro || "",
            responsavel_telefone_comercial: data.responsavel_telefone_comercial || "",
            filiacao1_nao_declarada: data.filiacao1_nao_declarada || false,
            filiacao1_nome: data.filiacao1_nome || "",
            filiacao1_rg: data.filiacao1_rg || "",
            filiacao1_cpf: data.filiacao1_cpf ? maskCPF(data.filiacao1_cpf) : "",
            filiacao1_email: data.filiacao1_email || "",
            filiacao1_celular: data.filiacao1_celular ? maskPhone(data.filiacao1_celular) : "",
            filiacao1_telefone_comercial: data.filiacao1_telefone_comercial
              ? maskPhone(data.filiacao1_telefone_comercial)
              : "",
            filiacao2_nao_declarada: data.filiacao2_nao_declarada || false,
            filiacao2_nome: data.filiacao2_nome || "",
            filiacao2_rg: data.filiacao2_rg || "",
            filiacao2_cpf: data.filiacao2_cpf ? maskCPF(data.filiacao2_cpf) : "",
            filiacao2_email: data.filiacao2_email || "",
            filiacao2_celular: data.filiacao2_celular ? maskPhone(data.filiacao2_celular) : "",
            filiacao2_telefone_comercial: data.filiacao2_telefone_comercial
              ? maskPhone(data.filiacao2_telefone_comercial)
              : "",
            cep: data.cep || "",
            logradouro: data.logradouro || "",
            numero: data.numero || "",
            complemento: data.complemento || "",
            bairro: data.bairro || "",
            cidade: data.cidade || "",
            estado: data.estado || "",
            unidade_consumidora: data.unidade_consumidora || "",
            forma_ocupacao_moradia: data.forma_ocupacao_moradia || "",
            forma_ocupacao_moradia_outro: data.forma_ocupacao_moradia_outro || "",
            observacoes: data.observacoes || "",
          });
          setCpf(maskCPF(data.responsavel_cpf));
          setTelefone(maskPhone(data.responsavel_telefone));
          setCelular(data.responsavel_celular ? maskPhone(data.responsavel_celular) : "");
          setCep(data.cep ? maskCEP(data.cep) : "");
        }
      };

      loadCrianca();
    } else if (open && !criancaId) {
      // Modo novo cadastro: limpar formulário
      reset({
        nome: "",
        data_nascimento: "",
        sexo: "Masculino",
        cpf_crianca: "",
        certidao_nascimento: "",
        cor_raca_autodeclarada: "",
        cor_raca_certidao: "",
        etnia_indigena: "",
        etnia_indigena_outra: "",
        quilombo_remanescente: "" as any,
        quilombo_nome: "",
        nacionalidade: "",
        estrangeiro_possui_documentos: "" as any,
        nis: "",
        programas_sociais: false,
        aceita_qualquer_cmei: false,
          cmei_atual_id: schoolMode?.initialCmeiId || "",
          turma_atual_id: schoolMode?.initialTurmaId || "",
        cmei1_preferencia: "",
        cmei2_preferencia: "",
        prioridades_ids: [],
        periodo: "Integral",
        responsavel_cpf: "",
        responsavel_nome: "",
        responsavel_telefone: "",
        responsavel_email: "",
        responsavel_celular: "",
        responsavel_rg: "",
        responsavel_parentesco: "",
        responsavel_parentesco_outro: "",
        responsavel_telefone_comercial: "",
        filiacao1_nao_declarada: false,
        filiacao1_nome: "",
        filiacao1_rg: "",
        filiacao1_cpf: "",
        filiacao1_email: "",
        filiacao1_celular: "",
        filiacao1_telefone_comercial: "",
        filiacao2_nao_declarada: false,
        filiacao2_nome: "",
        filiacao2_rg: "",
        filiacao2_cpf: "",
        filiacao2_email: "",
        filiacao2_celular: "",
        filiacao2_telefone_comercial: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        unidade_consumidora: "",
        forma_ocupacao_moradia: "",
        forma_ocupacao_moradia_outro: "",
        observacoes: "",
      });
      setCpf("");
      setTelefone("");
      setCelular("");
      setCep("");
      setCpfPreenchido(false);
      setForcarDuplicado(false);
      setForcarLimite(false);
      setPermitirDadosIncompletos(false);
    }
  }, [criancaId, open, reset]);

  useEffect(() => {
    if (!open || !criancaId) return;
    if (!prioridadesExistentes) return;
    const ids = prioridadesExistentes.map((p) => p.prioridade_id);
    setValue("prioridades_ids", ids, { shouldDirty: false, shouldValidate: false });
    const social = (tiposPrioridadeAtivos || []).some((t) => t.codigo === "social" && ids.includes(t.id));
    setValue("programas_sociais", social, { shouldDirty: false, shouldValidate: false });
  }, [open, criancaId, prioridadesExistentes, setValue, tiposPrioridadeAtivos]);

  const mutation = useMutation({
    mutationFn: async (data: CriancaFormDataAny) => {
      const dadosIncompletosAtivo = !isEditing && isSuperAdmin && permitirDadosIncompletos;

      const responsavelCpfRaw = String((data as any).responsavel_cpf || "");
      const responsavelNomeRaw = String((data as any).responsavel_nome || "");
      const responsavelTelefoneRaw = String((data as any).responsavel_telefone || "");

      const cpfLimpoInformado = responsavelCpfRaw ? unmask(responsavelCpfRaw) : "";
      const cpfLimpo = cpfLimpoInformado || (dadosIncompletosAtivo ? gerarCpfValido() : "");
      const responsavelNomeFinal = responsavelNomeRaw.trim() || (dadosIncompletosAtivo ? "Não informado" : "");
      const responsavelTelefoneFinal = responsavelTelefoneRaw.trim()
        ? unmask(responsavelTelefoneRaw)
        : dadosIncompletosAtivo
          ? "0000000000"
          : "";
      const cmeiAtualIdFinal = isSchoolMode ? String((data as any).cmei_atual_id || "").trim() : "";
      const turmaAtualIdFinal = isSchoolMode ? String((data as any).turma_atual_id || "").trim() : "";
      
      // Se não está editando, fazer verificações
      if (!isEditing) {
        // Verificar idade máxima
        if (validacaoIdadeRealTime?.bloqueadoMaximo) {
          throw new Error(validacaoIdadeRealTime.mensagemMaximo);
        }
        if (isSchoolMode && !cmeiAtualIdFinal) {
          throw new Error("Selecione a instituição.");
        }
        
        // Verificar duplicidade (se não forçado)
        // Condição: (nome + data nascimento) OU (nome responsável + nome criança)
        if (!dadosIncompletosAtivo && !forcarDuplicado) {
          const nomeNormalizado = data.nome.trim().toLowerCase();
          const nomeResponsavelNormalizado = String((data as any).responsavel_nome || "").trim().toLowerCase();
          
          // Buscar por data de nascimento OU nome do responsável
          const { data: possivelDuplicada } = await supabase
            .from("criancas")
            .select("id, nome, responsavel_nome, data_nascimento, status")
            .or(`data_nascimento.eq.${data.data_nascimento},responsavel_nome.ilike.%${String((data as any).responsavel_nome || "").trim()}%`)
            .limit(200);

          if (possivelDuplicada && possivelDuplicada.length > 0) {
            const duplicada = possivelDuplicada.find((c) => {
              const nomeMatch = c.nome.trim().toLowerCase() === nomeNormalizado;
              const dataMatch = c.data_nascimento === data.data_nascimento;
              const responsavelMatch = c.responsavel_nome.trim().toLowerCase() === nomeResponsavelNormalizado;
              
              // Duplicado se: (nome + data) OU (nome + responsável)
              return (nomeMatch && dataMatch) || (nomeMatch && responsavelMatch);
            });
            
            if (duplicada) {
              throw new Error(
                `Criança possivelmente duplicada! "${duplicada.nome}" já existe com status: ${duplicada.status}. ` +
                `Responsável: ${duplicada.responsavel_nome}. Marque a opção "Forçar cadastro" para continuar.`
              );
            }
          }
        }

        // Verificar limite de inscrições (se não forçado)
        const limiteInscricoes = configExtras.limite_inscricoes_responsavel;
        if (!isSchoolMode && !dadosIncompletosAtivo && !forcarLimite && limiteInscricoes && limiteInscricoes > 0) {
          const { count } = await supabase
            .from("criancas")
            .select("*", { count: "exact", head: true })
            .eq("responsavel_cpf", cpfLimpo);
          
          if (count !== null && count >= limiteInscricoes) {
            throw new Error(
              `Limite de ${limiteInscricoes} inscrição(ões) por CPF atingido. Marque "Forçar cadastro" para continuar.`
            );
          }
        }
      }

      const prioridadesIds = data.prioridades_ids || [];
      const tiposSelecionados = itensPrioridadeFederais
        .map((i) => i.tipo)
        .filter(Boolean)
        .filter((t) => prioridadesIds.includes(t.id));
      const faltandoComprovante = tiposSelecionados
        .filter((t) => t.exige_documento)
        .filter((t) => !comprovantesPrioridade[t.id] && !(prioridadeExistentePorId.get(t.id)?.url));

      if (!isSchoolMode && !dadosIncompletosAtivo && comprovacaoNaInscricao && faltandoComprovante.length > 0) {
        throw new Error(`Envie o documento de comprovação para: ${faltandoComprovante.map((t) => t.nome).join(", ")}`);
      }

      const programasSociaisDerivado = tiposSelecionados.some((t) => t.codigo === "social");

      const filiacao1NaoDeclarada = data.filiacao1_nao_declarada === true;
      const filiacao2NaoDeclarada = data.filiacao2_nao_declarada === true;

      const quilomboRaw = String((data as any).quilombo_remanescente || "").trim();
      const quilomboRemanescenteFinal =
        quilomboRaw === "sim" ? true : quilomboRaw === "nao" ? false : null;

      const nacionalidadeRaw = String((data as any).nacionalidade || "").trim();
      const estrangeiroDocsRaw = String((data as any).estrangeiro_possui_documentos || "").trim();

      const dadosIncompletosToSave = !isEditing && dadosIncompletosAtivo ? true : undefined;

      const criancaData = {
        nome: data.nome,
        data_nascimento: data.data_nascimento,
        sexo: (data as any).sexo,
        cpf_crianca: (data as any).cpf_crianca || null,
        certidao_nascimento: (data as any).certidao_nascimento || null,
        cor_raca_autodeclarada: (data as any).cor_raca_autodeclarada || null,
        cor_raca_certidao: (data as any).cor_raca_certidao || null,
        etnia_indigena: (data as any).etnia_indigena || null,
        etnia_indigena_outra: (data as any).etnia_indigena_outra || null,
        quilombo_remanescente: quilomboRemanescenteFinal,
        quilombo_nome: (data as any).quilombo_nome || null,
        nacionalidade: nacionalidadeRaw || null,
        estrangeiro_possui_documentos:
          nacionalidadeRaw === "estrangeira"
            ? estrangeiroDocsRaw === "sim"
            : null,
        nis: (data as any).nis ? String((data as any).nis).replace(/\D/g, "") : null,
        programas_sociais: programasSociaisDerivado,
        aceita_qualquer_cmei: isSchoolMode ? false : (data as any).aceita_qualquer_cmei,
        cmei1_preferencia: isSchoolMode ? null : ((data as any).cmei1_preferencia || null),
        cmei2_preferencia: isSchoolMode ? null : ((data as any).cmei2_preferencia || null),
        cmei3_preferencia: isSchoolMode ? null : ((data as any).cmei3_preferencia || null),
        cmei_atual_id: isSchoolMode ? (cmeiAtualIdFinal || null) : null,
        turma_atual_id: isSchoolMode ? (turmaAtualIdFinal || null) : null,
        responsavel_cpf: cpfLimpo,
        responsavel_nome: responsavelNomeFinal,
        responsavel_telefone: responsavelTelefoneFinal,
        responsavel_email: (data as any).responsavel_email || null,
        responsavel_celular: (data as any).responsavel_celular ? unmask(String((data as any).responsavel_celular)) : null,
        responsavel_rg: (data as any).responsavel_rg || null,
        responsavel_parentesco: (data as any).responsavel_parentesco || null,
        responsavel_parentesco_outro:
          (data as any).responsavel_parentesco === "outro" ? (data as any).responsavel_parentesco_outro || null : null,
        responsavel_telefone_comercial: (data as any).responsavel_telefone_comercial
          ? String((data as any).responsavel_telefone_comercial).replace(/\D/g, "")
          : null,
        filiacao1_nao_declarada: filiacao1NaoDeclarada,
        filiacao1_nome: filiacao1NaoDeclarada ? "Não declarada" : (data as any).filiacao1_nome || null,
        filiacao1_rg: filiacao1NaoDeclarada ? null : (data as any).filiacao1_rg || null,
        filiacao1_cpf: filiacao1NaoDeclarada ? null : ((data as any).filiacao1_cpf ? unmask(String((data as any).filiacao1_cpf)) : null),
        filiacao1_email: filiacao1NaoDeclarada ? null : (data as any).filiacao1_email || null,
        filiacao1_celular: filiacao1NaoDeclarada ? null : ((data as any).filiacao1_celular ? unmask(String((data as any).filiacao1_celular)) : null),
        filiacao1_telefone_comercial: filiacao1NaoDeclarada
          ? null
          : ((data as any).filiacao1_telefone_comercial ? unmask(String((data as any).filiacao1_telefone_comercial)) : null),
        filiacao2_nao_declarada: filiacao2NaoDeclarada,
        filiacao2_nome: filiacao2NaoDeclarada ? "Não declarada" : (data as any).filiacao2_nome || null,
        filiacao2_rg: filiacao2NaoDeclarada ? null : (data as any).filiacao2_rg || null,
        filiacao2_cpf: filiacao2NaoDeclarada ? null : ((data as any).filiacao2_cpf ? unmask(String((data as any).filiacao2_cpf)) : null),
        filiacao2_email: filiacao2NaoDeclarada ? null : (data as any).filiacao2_email || null,
        filiacao2_celular: filiacao2NaoDeclarada ? null : ((data as any).filiacao2_celular ? unmask(String((data as any).filiacao2_celular)) : null),
        filiacao2_telefone_comercial: filiacao2NaoDeclarada
          ? null
          : ((data as any).filiacao2_telefone_comercial ? unmask(String((data as any).filiacao2_telefone_comercial)) : null),
        cep: (data as any).cep ? unmask(String((data as any).cep)) : null,
        logradouro: (data as any).logradouro || null,
        numero: (data as any).numero || null,
        complemento: (data as any).complemento || null,
        bairro: (data as any).bairro || null,
        cidade: (data as any).cidade || null,
        estado: (data as any).estado || null,
        unidade_consumidora: (data as any).unidade_consumidora || null,
        forma_ocupacao_moradia: (data as any).forma_ocupacao_moradia || null,
        forma_ocupacao_moradia_outro:
          (data as any).forma_ocupacao_moradia === "outro" ? (data as any).forma_ocupacao_moradia_outro || null : null,
        zona_atendimento_id: prioridadeZonaHabilitada ? ((data as any).zona_atendimento_id || null) : null,
        observacoes: (data as any).observacoes || null,
        prioridade: (programasSociaisDerivado ? "Social" : "Geral") as "Social" | "Geral",
        status: isSchoolMode ? (((data as any).sexo === "Feminino") ? "Matriculada" : "Matriculado") : undefined,
        origem_cadastro: isSchoolMode ? schoolMode!.moduloOrigem : "vagou",
        modulo_gestor: isSchoolMode ? "sam_sondar" : "vagou",
        ignorar_automacoes_vagou: isSchoolMode ? true : undefined,
        ...(dadosIncompletosToSave !== undefined ? { dados_incompletos: dadosIncompletosToSave } : {}),
      };

      let criancaIdResult = criancaId;

      if (isEditing) {
        const { error } = await supabase
          .from("criancas")
          .update(criancaData)
          .eq("id", criancaId);

        if (error) throw error;
      } else {
        const { data: newCrianca, error } = await supabase
          .from("criancas")
          .insert([criancaData])
          .select()
          .single();

        if (error) throw error;
        criancaIdResult = newCrianca.id;

        if (podeRetroativo && retroativoAtivo && retroativoData && isNotFutureDate(retroativoData) && (retroativoJustificativa || "").trim().length > 5) {
          await supabase
            .from("criancas")
            .update({ created_at: new Date(retroativoData) })
            .eq("id", criancaIdResult);

          try {
            const { data: { session } } = await supabase.auth.getSession();
            await supabase.functions.invoke('registrar-auditoria', {
              headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
              body: {
                tabela: 'criancas',
                operacao: 'cadastro_retroativo',
                registro_id: criancaIdResult,
                dados_novos: { created_at_retroativa: retroativoData, justificativa: retroativoJustificativa },
              },
            });
          } catch (e) {
            console.error('Falha ao registrar auditoria do cadastro retroativo:', e);
          }
        }

        if (!isSchoolMode) {
          // Registrar no histórico
          await supabase.from("historico").insert({
            crianca_id: criancaIdResult,
            acao: "Inscrição Realizada (Admin)",
            descricao: retroativoAtivo && retroativoData
              ? `Inscrição realizada via painel administrativo (retroativa em ${retroativoData}). Justificativa: ${(retroativoJustificativa || "").trim()}`
              : `Inscrição realizada via painel administrativo`,
            status_novo: "Fila de Espera",
          });

          // Enviar notificação de inscrição para o webhook
          try {
            await supabase.functions.invoke('enviar-notificacao', {
              body: {
                crianca_id: criancaIdResult,
                tipo: 'inscricao_realizada',
                origem: 'frontend_admin',
                dados_adicionais: {
                  cmei1_preferencia: data.cmei1_preferencia || null,
                  cmei2_preferencia: data.cmei2_preferencia || null,
                  programas_sociais: programasSociaisDerivado,
                  origem: 'painel_administrativo'
                },
              },
            });
            console.log('Notificação de inscrição (admin) enviada com sucesso');
          } catch (notifError) {
            console.error('Erro ao enviar notificação:', notifError);
          }
        }
      }

      // Salvar valores dos campos customizados
      if (criancaIdResult && todosOsCamposCustom.length > 0) {
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
            criancaId: criancaIdResult, 
            valores: valoresCustom 
          });
        }
      }

      if (criancaIdResult) {
        if (isEditing) {
          const { error: delError } = await supabase.from("crianca_prioridades").delete().eq("crianca_id", criancaIdResult);
          if (delError) throw delError;
        }

        if (!isSchoolMode && tiposSelecionados.length > 0) {
          const inserts = [];
          for (const tipo of tiposSelecionados) {
            const arquivo = comprovantesPrioridade[tipo.id];
            const existente = prioridadeExistentePorId.get(tipo.id);
            let url = existente?.url ?? null;
            let status = existente?.status ?? null;

            if (arquivo) {
              url = await uploadDocumentoComprovantePrioridade({
                criancaId: criancaIdResult,
                prioridadeId: tipo.id,
                arquivo,
              });
              status = "pendente";
            }

            if (!status) status = tipo.exige_documento ? "pendente" : "aprovado";

            inserts.push({
              crianca_id: criancaIdResult,
              prioridade_id: tipo.id,
              documento_comprovante_url: url,
              status,
            });
          }

          const { error: prioError } = await supabase.from("crianca_prioridades").insert(inserts as any);
          if (prioError) throw prioError;
        }

        if (!isSchoolMode) {
          await supabase.rpc("recalcular_posicoes_fila");
        }
      }
    },
    onSuccess: () => {
      // Invalidar todas as queries relacionadas para atualização instantânea
      queryClient.invalidateQueries({ queryKey: ["admin-criancas"] });
      queryClient.invalidateQueries({ queryKey: ["criancas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-fila"] });
      queryClient.invalidateQueries({ queryKey: ["convocacoes-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["atividades-recentes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["unified-criancas"] });
      queryClient.invalidateQueries({ queryKey: ["unified-turmas"] });
      toast.success(isEditing ? "Criança atualizada com sucesso!" : (isSchoolMode ? "Aluno cadastrado com sucesso!" : "Criança cadastrada com sucesso!"));
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erro ao salvar criança";
      toast.error(message);
    },
  });

  const onSubmit = (data: CriancaFormDataAny) => {
    setSubmitErrors([]);
    mutation.mutate(data);
  };

  const preencherFormularioAleatoriamente = useCallback(() => {
    if (isEditing) return;

    const nomeCrianca = gerarNomeCompletoAleatorio();
    const nomeResponsavel = gerarNomeCompletoAleatorio();
    const nomeFiliacao1 = gerarNomeCompletoAleatorio();
    const nomeFiliacao2 = gerarNomeCompletoAleatorio();
    const sexo = pickRandom(["Masculino", "Feminino"] as const);
    const cpfCrianca = maskCPF(gerarCpfValido());
    const responsavelCpf = gerarCpfValido();
    const telefoneResponsavel = gerarTelefoneAleatorio();
    const celularResponsavel = gerarTelefoneAleatorio();
    const cepAleatorio = gerarCepAleatorio();
    const cmeisDisponiveis = (cmeis || []).slice(0, 3);

    reset({
      nome: nomeCrianca,
      data_nascimento: gerarDataNascimentoAleatoria(),
      sexo,
      cpf_crianca: cpfCrianca,
      certidao_nascimento: `${randomInt(100000, 999999)}-${randomInt(10, 99)}`,
      cor_raca_autodeclarada: pickRandom(["branca", "parda", "preta", "amarela", "nao_declarada"] as const),
      cor_raca_certidao: pickRandom(["branca", "parda", "preta", "amarela", "nao_declarada"] as const),
      etnia_indigena: "",
      etnia_indigena_outra: "",
      quilombo_remanescente: "nao" as const,
      quilombo_nome: "",
      nacionalidade: "brasileira" as const,
      estrangeiro_possui_documentos: "" as any,
      nis: gerarNisAleatorio(),
      programas_sociais: Math.random() > 0.5,
      aceita_qualquer_cmei: false,
      cmei1_preferencia: cmeisDisponiveis[0]?.id || "",
      cmei2_preferencia: cmeisDisponiveis[1]?.id || "",
      cmei3_preferencia: cmeisDisponiveis[2]?.id || "",
      prioridades_ids: [],
      periodo: "Integral",
      responsavel_cpf: responsavelCpf,
      responsavel_nome: nomeResponsavel,
      responsavel_telefone: telefoneResponsavel,
      responsavel_email: gerarEmailAleatorio(nomeResponsavel),
      responsavel_celular: celularResponsavel,
      responsavel_rg: `${randomInt(1000000, 9999999)}`,
      responsavel_parentesco: pickRandom(["mae", "pai", "tutor_legal"] as const),
      responsavel_parentesco_outro: "",
      responsavel_telefone_comercial: gerarTelefoneAleatorio(),
      filiacao1_nao_declarada: false,
      filiacao1_nome: nomeFiliacao1,
      filiacao1_rg: `${randomInt(1000000, 9999999)}`,
      filiacao1_cpf: maskCPF(gerarCpfValido()),
      filiacao1_email: gerarEmailAleatorio(nomeFiliacao1),
      filiacao1_celular: maskPhone(gerarTelefoneAleatorio()),
      filiacao1_telefone_comercial: maskPhone(gerarTelefoneAleatorio()),
      filiacao2_nao_declarada: false,
      filiacao2_nome: nomeFiliacao2,
      filiacao2_rg: `${randomInt(1000000, 9999999)}`,
      filiacao2_cpf: maskCPF(gerarCpfValido()),
      filiacao2_email: gerarEmailAleatorio(nomeFiliacao2),
      filiacao2_celular: maskPhone(gerarTelefoneAleatorio()),
      filiacao2_telefone_comercial: maskPhone(gerarTelefoneAleatorio()),
      cep: cepAleatorio,
      logradouro: pickRandom(LOGRADOUROS),
      numero: `${randomInt(10, 9999)}`,
      complemento: `Casa ${randomInt(1, 30)}`,
      bairro: pickRandom(BAIRROS),
      cidade: pickRandom(CIDADES),
      estado: pickRandom(UF_OPCOES),
      unidade_consumidora: `${randomInt(100000, 999999)}`,
      forma_ocupacao_moradia: pickRandom(["propria", "alugada", "cedida"] as const),
      forma_ocupacao_moradia_outro: "",
      observacoes: "Cadastro preenchido automaticamente para testes.",
    });

    setCpf(maskCPF(responsavelCpf));
    setTelefone(maskPhone(telefoneResponsavel));
    setCelular(maskPhone(celularResponsavel));
    setCep(maskCEP(cepAleatorio));
    setCpfPreenchido(false);
    setForcarDuplicado(false);
    setForcarLimite(false);
    setPermitirDadosIncompletos(false);
    setSubmitErrors([]);
    clearErrors();

    toast.success("Formulario preenchido com dados aleatorios.");
  }, [clearErrors, cmeis, isEditing, reset]);

  const scrollToField = (path: string) => {
    setFocus(path as any);
    const byDataField = document.querySelector(`[data-field="${CSS.escape(path)}"]`) as HTMLElement | null;
    if (byDataField) {
      byDataField.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const byName = document.querySelector(`[name="${CSS.escape(path)}"]`) as HTMLElement | null;
    byName?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const labelForError = (path: string, message: string) => {
    const labels: Record<string, string> = {
      nome: "Nome da criança",
      data_nascimento: "Data de nascimento",
      sexo: "Sexo",
      cor_raca_autodeclarada: "Cor/raça autodeclarada",
      cor_raca_certidao: "Cor/raça na certidão",
      etnia_indigena: "Etnia indígena (quando cor/raça é Indígena)",
      etnia_indigena_outra: "Etnia indígena (qual?)",
      quilombo_remanescente: "Remanescente de quilombo",
      quilombo_nome: "Quilombo (nome)",
      nacionalidade: "Nacionalidade",
      estrangeiro_possui_documentos: "Estrangeiro possui documentos? (quando nacionalidade é Estrangeira)",
      responsavel_cpf: "CPF do responsável",
      responsavel_nome: "Nome do responsável",
      responsavel_telefone: "Telefone do responsável",
      responsavel_parentesco: "Parentesco do responsável",
      responsavel_parentesco_outro: "Parentesco (qual?)",
      unidade_consumidora: "Unidade consumidora",
      forma_ocupacao_moradia: "Forma de ocupação da moradia",
      forma_ocupacao_moradia_outro: "Forma de ocupação (qual?)",
      cep: "CEP",
      bairro: "Bairro",
      cidade: "Cidade",
      estado: "Estado",
    };
    return labels[path] || message || path;
  };

  const onInvalid = (formErrors: FieldErrors<CriancaFormDataAny>) => {
    toast.error(permitirDadosIncompletos && isSuperAdmin ? "Preencha ao menos nome e data de nascimento." : "Preencha os campos obrigatórios antes de cadastrar.");

    const flattenErrors = (errs: unknown, prefix = ""): Array<{ path: string; message: string }> => {
      if (!errs || typeof errs !== "object") return [];
      const obj = errs as Record<string, any>;
      const out: Array<{ path: string; message: string }> = [];
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (!value) continue;
        const path = prefix ? `${prefix}.${key}` : key;
        if (typeof value === "object" && (("message" in value) || ("type" in value) || ("ref" in value))) {
          out.push({ path, message: typeof value?.message === "string" ? value.message : "" });
          continue;
        }
        out.push(...flattenErrors(value, path));
      }
      return out;
    };

    const flat = flattenErrors(formErrors)
      .filter((e, idx, arr) => arr.findIndex((x) => x.path === e.path) === idx);

    const finalErrors =
      flat.length > 0
        ? flat
        : Object.keys(formErrors || {}).map((k) => ({
            path: k,
            message: (formErrors as any)?.[k]?.message || "",
          }));

    setSubmitErrors(finalErrors);
    const first = finalErrors[0]?.path || Object.keys(formErrors || {})[0];
    if (first) scrollToField(first);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        aria-describedby="crianca-dialog-description"
      >
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Editar Criança: ${watch("nome")}` : "Registrar Nova Criança"}
          </DialogTitle>
          <DialogDescription id="crianca-dialog-description">
            {isEditing 
              ? "Atualize os dados cadastrais da criança."
              : "Preencha os dados para realizar a inscrição de uma nova criança no sistema."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">

          {submitErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold">Campos pendentes:</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {submitErrors.slice(0, 12).map((e) => (
                    <button
                      key={e.path}
                      type="button"
                      className="text-sm underline underline-offset-2"
                      onClick={() => scrollToField(e.path)}
                      title={e.message}
                    >
                      {labelForError(e.path, e.message)}
                    </button>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Alertas de Validação de Idade */}
          {validacaoIdadeRealTime?.bloqueadoMaximo && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Idade fora da faixa permitida!</strong> {validacaoIdadeRealTime.mensagemMaximo}
                <br />
                <span className="text-sm">
                  (Idade na data de corte: {validacaoIdadeRealTime.idadeNaCorte} anos | Máximo permitido: {validacaoIdadeRealTime.idadeMaxima} anos)
                </span>
              </AlertDescription>
            </Alert>
          )}
          
          {validacaoIdadeRealTime?.abaixoMinimo && !validacaoIdadeRealTime?.bloqueadoMaximo && (
            <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Idade abaixo do mínimo para convocação</strong>
                <br />
                A criança tem {validacaoIdadeRealTime.idadeMeses} meses. 
                Faltam <strong>{validacaoIdadeRealTime.mesesFaltando} meses</strong> para atingir a idade mínima de {validacaoIdadeRealTime.idadeMinimaMeses} meses.
                <br />
                <span className="text-sm">A inscrição pode ser realizada, mas a convocação só ocorrerá após atingir a idade mínima.</span>
              </AlertDescription>
            </Alert>
          )}

          {/* SEÇÃO: Dados da Criança */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Baby className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Dados da Criança</h3>
            </div>
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="cpf_crianca">CPF da Criança</Label>
                <Input
                  id="cpf_crianca"
                  {...register("cpf_crianca")}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  onChange={(e) => {
                    const masked = maskCPF(e.target.value);
                    setValue("cpf_crianca", masked, { shouldValidate: true, shouldDirty: true });
                    const cpfLimpo = masked.replace(/\D/g, "");
                    if (cpfLimpo.length === 11) {
                      buscarCriancaPorCpf(cpfLimpo);
                    }
                  }}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  {...register("nome")}
                  placeholder="Ex: Ana Maria da Silva"
                />
                {errors.nome && (
                  <p className="text-sm text-destructive mt-1">{errors.nome.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  max={maxDataNascimento}
                  {...register("data_nascimento")}
                />
                {errors.data_nascimento && (
                  <p className="text-sm text-destructive mt-1">{errors.data_nascimento.message}</p>
                )}
                {turmaCompativel && !validacaoIdadeRealTime?.bloqueadoMaximo && (
                  <div className="mt-2">
                    <Badge variant="outline" className="bg-primary/10 border-primary/30">
                      Turma Compatível: {turmaCompativel}
                    </Badge>
                  </div>
                )}
              </div>

              <div>
                <Label>Sexo *</Label>
                <input type="hidden" {...register("sexo")} />
                <RadioGroup
                  value={watch("sexo")}
                  onValueChange={(value) => setValue("sexo", value as "Masculino" | "Feminino")}
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Feminino" id="feminino" />
                    <Label htmlFor="feminino" className="font-normal cursor-pointer">Feminino</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Masculino" id="masculino" />
                    <Label htmlFor="masculino" className="font-normal cursor-pointer">Masculino</Label>
                  </div>
                </RadioGroup>
                {errors.sexo && (
                  <p className="text-sm text-destructive mt-1">{String(errors.sexo.message || "Selecione o sexo")}</p>
                )}
              </div>

              <div>
                <Label htmlFor="certidao_nascimento">Nº Certidão de Nascimento</Label>
                <Input
                  id="certidao_nascimento"
                  {...register("certidao_nascimento")}
                  placeholder="Número da certidão"
                />
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2" data-field="cor_raca_autodeclarada">
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
                    <SelectTrigger data-field="cor_raca_autodeclarada">
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
                    <p className="text-sm text-destructive">{String((errors as any).cor_raca_autodeclarada.message)}</p>
                  )}
                </div>

                <div className="space-y-2" data-field="cor_raca_certidao">
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
                    <SelectTrigger data-field="cor_raca_certidao">
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
                    <p className="text-sm text-destructive">{String((errors as any).cor_raca_certidao.message)}</p>
                  )}
                </div>
              </div>

              {(String((watchedFields as any).cor_raca_autodeclarada || "") === "indigena" ||
                String((watchedFields as any).cor_raca_certidao || "") === "indigena") && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2" data-field="etnia_indigena">
                    <Label>
                      Etnia indígena <span className="text-destructive">*</span>
                    </Label>
                    <input type="hidden" {...register("etnia_indigena" as any)} />
                    <Select
                      value={String((watchedFields as any).etnia_indigena || "")}
                      onValueChange={(value) =>
                        setValue("etnia_indigena" as any, value, { shouldDirty: true, shouldValidate: true })
                      }
                    >
                      <SelectTrigger data-field="etnia_indigena">
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

                  {String((watchedFields as any).etnia_indigena || "") === "outra" ? (
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
                  ) : (
                    <div />
                  )}
                </div>
              )}

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2" data-field="nacionalidade">
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
                    <SelectTrigger data-field="nacionalidade">
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
                  {(errors as any).nis && <p className="text-sm text-destructive">{String((errors as any).nis.message)}</p>}
                </div>
              </div>

              {String((watchedFields as any).nacionalidade || "") === "estrangeira" && (
                <div className="md:col-span-2 space-y-2" data-field="estrangeiro_possui_documentos">
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
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sim" id="estrangeiro-documentos-sim" />
                      <Label htmlFor="estrangeiro-documentos-sim" className="font-normal cursor-pointer">
                        Sim
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nao" id="estrangeiro-documentos-nao" />
                      <Label htmlFor="estrangeiro-documentos-nao" className="font-normal cursor-pointer">
                        Não
                      </Label>
                    </div>
                  </RadioGroup>
                  {(errors as any).estrangeiro_possui_documentos && (
                    <p className="text-sm text-destructive">
                      {String((errors as any).estrangeiro_possui_documentos.message)}
                    </p>
                  )}
                </div>
              )}

              <div className="md:col-span-2 space-y-2" data-field="quilombo_remanescente">
                <Label>
                  Remanescente de Quilombo? <span className="text-destructive">*</span>
                </Label>
                <input type="hidden" {...register("quilombo_remanescente" as any)} />
                <RadioGroup
                  value={String((watchedFields as any).quilombo_remanescente || "")}
                  onValueChange={(value) =>
                    setValue("quilombo_remanescente" as any, value, { shouldDirty: true, shouldValidate: true })
                  }
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sim" id="quilombo-sim" />
                    <Label htmlFor="quilombo-sim" className="font-normal cursor-pointer">
                      Sim
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nao" id="quilombo-nao" />
                    <Label htmlFor="quilombo-nao" className="font-normal cursor-pointer">
                      Não
                    </Label>
                  </div>
                </RadioGroup>
                {(errors as any).quilombo_remanescente && (
                  <p className="text-sm text-destructive">{String((errors as any).quilombo_remanescente.message)}</p>
                )}
              </div>

              {String((watchedFields as any).quilombo_remanescente || "") === "sim" && (
                <div className="md:col-span-2 space-y-2" data-field="quilombo_nome">
                  <Label htmlFor="quilombo_nome">
                    Se sim, qual? <span className="text-destructive">*</span>
                  </Label>
                  <Input id="quilombo_nome" placeholder="Informe qual quilombo" {...register("quilombo_nome" as any)} />
                  {(errors as any).quilombo_nome && (
                    <p className="text-sm text-destructive">{String((errors as any).quilombo_nome.message)}</p>
                  )}
                </div>
              )}

              <div className="md:col-span-2 space-y-2">
                <Label className="flex items-center gap-2">
                  Critérios de prioridade (múltipla seleção)
                  <Badge className="text-[10px] px-2 py-0.5 bg-amber-500 text-white hover:bg-amber-500">
                    {comprovacaoNaInscricao ? "Requer comprovação na inscrição" : "Comprovação na convocação"}
                  </Badge>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-between">
                      <span className="truncate">
                        {prioridadeIds.length === 0 ? "Nenhum selecionado" : `${prioridadeIds.length} selecionado(s)`}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
                    <div className="space-y-1 max-h-64 overflow-auto">
                      {itensPrioridadeFederais.map((item) => {
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
                              setValue("prioridades_ids", next, { shouldDirty: true });
                              const socialId = itensPrioridadeFederais.find((i) => i.seed.codigo === "social")?.tipo?.id;
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
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-primary mt-0.5" />}
                          </button>
                        );
                      })}
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

                {comprovacaoNaInscricao && prioridadesFederaisSelecionadas.some((i) => i.seed.exige_documento) && (
                  <div className="pt-2 space-y-3">
                    {prioridadesFederaisSelecionadas
                      .filter((i) => i.seed.exige_documento)
                      .map((i) => {
                        const tipoId = i.tipo?.id;
                        if (!tipoId) return null;
                        const arquivo = comprovantesPrioridade[tipoId];
                        const docNome = i.tipo?.documento_tipo_id ? docNomePorId.get(i.tipo.documento_tipo_id) : null;
                        const existeUrl = prioridadeExistentePorId.get(tipoId)?.url;
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
                                {existeUrl && !arquivo && (
                                  <p className="text-xs text-muted-foreground">Comprovante já anexado.</p>
                                )}
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

              {!isSchoolMode && (
                <div>
                  <Label>Aceita Qualquer {singular}? *</Label>
                  <RadioGroup
                    value={watch("aceita_qualquer_cmei") ? "sim" : "nao"}
                    onValueChange={(value) => setValue("aceita_qualquer_cmei", value === "sim")}
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sim" id="aceita-sim" />
                      <Label htmlFor="aceita-sim" className="font-normal cursor-pointer">Sim</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nao" id="aceita-nao" />
                      <Label htmlFor="aceita-nao" className="font-normal cursor-pointer">Não</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Campos dinâmicos da seção Criança */}
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
          </div>

          {/* SEÇÃO: Preferências / Dados Escolares */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">{isSchoolMode ? "Dados Escolares" : `Preferências de ${singular}`}</h3>
            </div>
            <Separator />

            {isSchoolMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Instituição</Label>
                  <Select
                    value={(cmeiAtualSelecionado as string) || ""}
                    onValueChange={(value) => {
                      setValue("cmei_atual_id", value, { shouldDirty: true, shouldValidate: true });
                      setValue("turma_atual_id", "", { shouldDirty: true, shouldValidate: true });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a instituição" />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolSelectableCmeis.map((cmei) => (
                        <SelectItem key={cmei.id} value={cmei.id}>
                          {cmei.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="turma_atual_id">Turma</Label>
                  <Select value={turmaAtualSelecionada || ""} onValueChange={(value) => setValue("turma_atual_id", value, { shouldDirty: true, shouldValidate: true })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {(schoolTurmas || []).map((turma) => (
                        <SelectItem key={turma.id} value={turma.id}>
                          {turma.nome || "-"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {turmaCompativel && !validacaoIdadeRealTime?.bloqueadoMaximo ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Turma base sugerida pelo corte etário: {turmaCompativel}.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cmei1">1ª Opção de {singular}</Label>
                    <Select
                      value={watch("cmei1_preferencia")}
                      onValueChange={(value) => setValue("cmei1_preferencia", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {cmeisFiltrados?.map((cmei) => (
                          <SelectItem key={cmei.id} value={cmei.id}>
                            {cmei.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="cmei2">2ª Opção de {singular}</Label>
                    <Select
                      value={watch("cmei2_preferencia")}
                      onValueChange={(value) => setValue("cmei2_preferencia", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {cmeisFiltrados
                          ?.filter((cmei) => cmei.id !== cmei1Selecionado)
                          .map((cmei) => (
                            <SelectItem key={cmei.id} value={cmei.id}>
                              {cmei.nome}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(configExtras.preferencias_cmei_qtd ?? 2) === 3 && (
                    <div>
                      <Label htmlFor="cmei3">3ª Opção de {singular}</Label>
                      <Select
                        value={watch("cmei3_preferencia" as any) as any}
                        onValueChange={(value) => setValue("cmei3_preferencia" as any, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {cmeisFiltrados
                            ?.filter((cmei) => cmei.id !== cmei1Selecionado && cmei.id !== cmei2Selecionado)
                            .map((cmei) => (
                              <SelectItem key={cmei.id} value={cmei.id}>
                                {cmei.nome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

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
              </>
            )}
          </div>

          {/* SEÇÃO: Dados do Responsável */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Dados do Responsável</h3>
            </div>
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div data-field="responsavel_cpf">
                <Label htmlFor="responsavel_cpf">CPF *</Label>
                <input type="hidden" {...register("responsavel_cpf")} />
                <div className="relative">
                  <Input
                    id="responsavel_cpf"
                    value={cpf}
                    onChange={(e) => {
                      const masked = maskCPF(e.target.value);
                      setCpf(masked);
                      const cpfLimpo = unmask(masked);
                      setValue("responsavel_cpf", cpfLimpo);
                      
                      // Buscar dados quando CPF estiver completo
                      if (cpfLimpo.length === 11) {
                        buscarResponsavelPorCpf(cpfLimpo);
                      }
                    }}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    disabled={buscandoCpf}
                  />
                  {buscandoCpf && (
                    <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {errors.responsavel_cpf && (
                  <p className="text-sm text-destructive mt-1">{errors.responsavel_cpf.message}</p>
                )}
              {cpfPreenchido && (
                  <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Dados vinculados a outro cadastro (bloqueados para edição)
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="responsavel_nome">Nome Completo *</Label>
                <Input
                  id="responsavel_nome"
                  {...register("responsavel_nome")}
                  placeholder="Nome do responsável"
                  disabled={cpfPreenchido}
                  className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                />
                {errors.responsavel_nome && (
                  <p className="text-sm text-destructive mt-1">{errors.responsavel_nome.message}</p>
                )}
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2" data-field="responsavel_parentesco">
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
                    disabled={cpfPreenchido}
                  >
                    <SelectTrigger
                      data-field="responsavel_parentesco"
                      className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                    >
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
                      disabled={cpfPreenchido}
                      className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
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

              <div>
                <Label htmlFor="responsavel_rg">RG/RNE/RME (não obrigatório)</Label>
                <Input
                  id="responsavel_rg"
                  {...register("responsavel_rg")}
                  placeholder="Documento do responsável"
                  disabled={cpfPreenchido}
                  className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                />
              </div>

              <div data-field="responsavel_telefone">
                <Label htmlFor="responsavel_telefone">Telefone celular/WhatsApp *</Label>
                <input type="hidden" {...register("responsavel_telefone")} />
                <Input
                  id="responsavel_telefone"
                  value={telefone}
                  onChange={(e) => {
                    const masked = maskPhone(e.target.value);
                    setTelefone(masked);
                    setValue("responsavel_telefone", unmask(masked));
                  }}
                  placeholder="(99) 99999-9999"
                  maxLength={15}
                  disabled={cpfPreenchido}
                  className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                />
                {errors.responsavel_telefone && (
                  <p className="text-sm text-destructive mt-1">{errors.responsavel_telefone.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="responsavel_telefone_comercial">Telefone comercial</Label>
                <Input
                  id="responsavel_telefone_comercial"
                  value={maskPhone(String((watchedFields as any).responsavel_telefone_comercial || ""))}
                  onChange={(e) => {
                    const masked = maskPhone(e.target.value);
                    setValue("responsavel_telefone_comercial" as any, unmask(masked), {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                  placeholder="(99) 99999-9999"
                  maxLength={15}
                  disabled={cpfPreenchido}
                  className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                />
              </div>

              <div>
                <Label htmlFor="responsavel_celular">Telefone de contato 2</Label>
                <Input
                  id="responsavel_celular"
                  value={celular}
                  onChange={(e) => {
                    const masked = maskPhone(e.target.value);
                    setCelular(masked);
                    setValue("responsavel_celular", unmask(masked));
                  }}
                  placeholder="(99) 99999-9999"
                  maxLength={15}
                  disabled={cpfPreenchido}
                  className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="responsavel_email">E-mail</Label>
                <Input
                  id="responsavel_email"
                  type="email"
                  {...register("responsavel_email")}
                  placeholder="email@exemplo.com"
                  disabled={cpfPreenchido}
                  className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                />
              </div>

              <div className="md:col-span-2">
                <Separator />
              </div>

              <div className="md:col-span-2 space-y-4">
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
                    disabled={cpfPreenchido}
                  />
                  <Label htmlFor="filiacao1_nao_declarada" className={cpfPreenchido ? "text-muted-foreground" : ""}>
                    Filiação 1 não declarada
                  </Label>
                </div>

                {!((watchedFields as any).filiacao1_nao_declarada === true) && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="filiacao1_nome">
                          Nome do pai/mãe <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="filiacao1_nome"
                          {...register("filiacao1_nome" as any)}
                          disabled={cpfPreenchido}
                          className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                        />
                        {(errors as any).filiacao1_nome && (
                          <p className="text-sm text-destructive">{String((errors as any).filiacao1_nome.message)}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filiacao1_rg">RG/RNE/RME</Label>
                        <Input
                          id="filiacao1_rg"
                          {...register("filiacao1_rg" as any)}
                          disabled={cpfPreenchido}
                          className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                        />
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
                          {...register("filiacao1_cpf" as any)}
                          onChange={(e) => {
                            const masked = maskCPF(e.target.value);
                            setValue("filiacao1_cpf" as any, masked, { shouldDirty: true, shouldValidate: true });
                          }}
                          disabled={cpfPreenchido}
                          className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                        />
                        {(errors as any).filiacao1_cpf && (
                          <p className="text-sm text-destructive">{String((errors as any).filiacao1_cpf.message)}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filiacao1_email">E-mail</Label>
                        <Input
                          id="filiacao1_email"
                          type="email"
                          placeholder="Não obrigatório"
                          {...register("filiacao1_email" as any)}
                          disabled={cpfPreenchido}
                          className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                        />
                        {(errors as any).filiacao1_email && (
                          <p className="text-sm text-destructive">{String((errors as any).filiacao1_email.message)}</p>
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
                          placeholder="(99) 99999-9999"
                          {...register("filiacao1_celular" as any)}
                          onChange={(e) => {
                            const masked = maskPhone(e.target.value);
                            setValue("filiacao1_celular" as any, masked, { shouldDirty: true, shouldValidate: true });
                          }}
                          disabled={cpfPreenchido}
                          className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                        />
                        {(errors as any).filiacao1_celular && (
                          <p className="text-sm text-destructive">{String((errors as any).filiacao1_celular.message)}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filiacao1_telefone_comercial">Telefone comercial</Label>
                        <Input
                          id="filiacao1_telefone_comercial"
                          placeholder="Não obrigatório"
                          {...register("filiacao1_telefone_comercial" as any)}
                          onChange={(e) => {
                            const masked = maskPhone(e.target.value);
                            setValue("filiacao1_telefone_comercial" as any, masked, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }}
                          disabled={cpfPreenchido}
                          className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="md:col-span-2 space-y-4 pt-2">
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
                    disabled={cpfPreenchido}
                  />
                  <Label htmlFor="filiacao2_nao_declarada" className={cpfPreenchido ? "text-muted-foreground" : ""}>
                    Filiação 2 não declarada
                  </Label>
                </div>

                {!((watchedFields as any).filiacao2_nao_declarada === true) && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="filiacao2_nome">
                          Nome do pai/mãe <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="filiacao2_nome"
                          {...register("filiacao2_nome" as any)}
                          disabled={cpfPreenchido}
                          className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                        />
                        {(errors as any).filiacao2_nome && (
                          <p className="text-sm text-destructive">{String((errors as any).filiacao2_nome.message)}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filiacao2_rg">RG/RNE/RME</Label>
                        <Input
                          id="filiacao2_rg"
                          {...register("filiacao2_rg" as any)}
                          disabled={cpfPreenchido}
                          className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                        />
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
                          {...register("filiacao2_cpf" as any)}
                          onChange={(e) => {
                            const masked = maskCPF(e.target.value);
                            setValue("filiacao2_cpf" as any, masked, { shouldDirty: true, shouldValidate: true });
                          }}
                          disabled={cpfPreenchido}
                          className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                        />
                        {(errors as any).filiacao2_cpf && (
                          <p className="text-sm text-destructive">{String((errors as any).filiacao2_cpf.message)}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filiacao2_email">E-mail</Label>
                        <Input
                          id="filiacao2_email"
                          type="email"
                          placeholder="Não obrigatório"
                          {...register("filiacao2_email" as any)}
                          disabled={cpfPreenchido}
                          className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                        />
                        {(errors as any).filiacao2_email && (
                          <p className="text-sm text-destructive">{String((errors as any).filiacao2_email.message)}</p>
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
                          placeholder="(99) 99999-9999"
                          {...register("filiacao2_celular" as any)}
                          onChange={(e) => {
                            const masked = maskPhone(e.target.value);
                            setValue("filiacao2_celular" as any, masked, { shouldDirty: true, shouldValidate: true });
                          }}
                          disabled={cpfPreenchido}
                          className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                        />
                        {(errors as any).filiacao2_celular && (
                          <p className="text-sm text-destructive">{String((errors as any).filiacao2_celular.message)}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filiacao2_telefone_comercial">Telefone comercial</Label>
                        <Input
                          id="filiacao2_telefone_comercial"
                          placeholder="Não obrigatório"
                          {...register("filiacao2_telefone_comercial" as any)}
                          onChange={(e) => {
                            const masked = maskPhone(e.target.value);
                            setValue("filiacao2_telefone_comercial" as any, masked, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }}
                          disabled={cpfPreenchido}
                          className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Campos dinâmicos da seção Responsável */}
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
          </div>

          {/* SEÇÃO: Endereço */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Endereço</h3>
            </div>
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div data-field="cep">
                <Label htmlFor="cep">CEP</Label>
                <input type="hidden" {...register("cep")} />
                <div className="flex gap-2">
                  <Input
                    id="cep"
                    value={cep}
                    onChange={(e) => {
                      const masked = maskCEP(e.target.value);
                      setCep(masked);
                      setValue("cep", unmask(masked));
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                    disabled={cpfPreenchido}
                    className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => buscarCep(cep)}
                    disabled={buscandoCep || cep.replace(/\D/g, "").length !== 8 || cpfPreenchido}
                  >
                    {buscandoCep ? <Spinner className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input
                  id="logradouro"
                  {...register("logradouro")}
                  placeholder="Rua, Avenida, etc."
                  disabled={cpfPreenchido}
                  className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                />
              </div>

              <div>
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  {...register("numero")}
                  placeholder="Nº"
                  disabled={cpfPreenchido}
                  className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                />
              </div>

              <div>
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  {...register("complemento")}
                  placeholder="Apto, Bloco, etc."
                  disabled={cpfPreenchido}
                  className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                />
              </div>

              <div>
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  {...register("bairro")}
                  placeholder="Bairro"
                  disabled={cpfPreenchido}
                  className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                />
              </div>

              <div>
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  {...register("cidade")}
                  placeholder="Cidade"
                  disabled={cpfPreenchido}
                  className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                />
              </div>

              <div>
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  {...register("estado")}
                  placeholder="UF"
                  maxLength={2}
                  disabled={cpfPreenchido}
                  className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                />
              </div>

              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unidade_consumidora">
                    Unidade consumidora (talão de energia) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="unidade_consumidora"
                    {...register("unidade_consumidora")}
                    placeholder="Informe a unidade consumidora"
                    disabled={cpfPreenchido}
                    className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                  />
                  {errors.unidade_consumidora && (
                    <p className="text-sm text-destructive">{String(errors.unidade_consumidora.message)}</p>
                  )}
                </div>

                <div className="space-y-2" data-field="forma_ocupacao_moradia">
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
                    disabled={cpfPreenchido}
                  >
                    <SelectTrigger
                      data-field="forma_ocupacao_moradia"
                      className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                    >
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
                <div className="md:col-span-3 space-y-2" data-field="forma_ocupacao_moradia_outro">
                  <Label htmlFor="forma_ocupacao_moradia_outro">
                    Se outro, qual? <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="forma_ocupacao_moradia_outro"
                    {...register("forma_ocupacao_moradia_outro" as any)}
                    placeholder="Informe qual"
                    disabled={cpfPreenchido}
                    className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                  />
                  {errors.forma_ocupacao_moradia_outro && (
                    <p className="text-sm text-destructive">{String(errors.forma_ocupacao_moradia_outro.message)}</p>
                  )}
                </div>
              )}

              {prioridadeZonaHabilitada && (
                <div className="md:col-span-2">
                  <Label>Zona de atendimento</Label>
                  <Select
                    value={(watch("zona_atendimento_id") as any) || ""}
                    onValueChange={(value) => setValue("zona_atendimento_id" as any, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a zona" />
                    </SelectTrigger>
                    <SelectContent>
                      {(zonasAtivas || []).map((z) => (
                        <SelectItem key={z.id} value={z.id}>
                          {z.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Campos dinâmicos da seção Endereço */}
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
          </div>

          {/* Cadastro retroativo (somente admin, se habilitado nas configurações) */}
          {podeRetroativo && (
            <>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Cadastro Retroativo</Label>
                  <p className="text-xs text-muted-foreground">
                    Define uma data de inscrição passada. Exige justificativa e será registrado em auditoria.
                  </p>
                </div>
                <Checkbox {...register("retroativo_ativo")} />
              </div>
              {retroativoAtivo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Inscrição (retroativa)</Label>
                    <Input type="date" max={getTodayISODate()} {...register("retroativo_data")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Justificativa</Label>
                    <Textarea rows={2} placeholder="Descreva o motivo do cadastro retroativo" {...register("retroativo_justificativa")} />
                  </div>
                </div>
              )}
              <Separator />
            </>
          )}

          {/* SEÇÃO: Observações */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Observações</h3>
            <Separator />
            
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                {...register("observacoes")}
                placeholder="Informações adicionais relevantes..."
                rows={3}
              />
            </div>

            {/* Campos dinâmicos da seção Observações */}
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

          {/* Opções de Forçar (apenas para novo cadastro) */}
          {!isEditing && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Opções Administrativas</p>
              <div className="flex flex-wrap gap-4">
                {isSuperAdmin && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="permitir-dados-incompletos"
                      checked={permitirDadosIncompletos}
                      onCheckedChange={(checked) => {
                        setPermitirDadosIncompletos(!!checked);
                        setSubmitErrors([]);
                        clearErrors();
                      }}
                    />
                    <Label htmlFor="permitir-dados-incompletos" className="text-sm font-normal cursor-pointer">
                      Permitir cadastro com dados incompletos
                    </Label>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="forcar-duplicado" 
                    checked={forcarDuplicado} 
                    onCheckedChange={(checked) => setForcarDuplicado(!!checked)}
                  />
                  <Label htmlFor="forcar-duplicado" className="text-sm font-normal cursor-pointer">
                    Forçar cadastro (ignorar verificação de duplicidade)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="forcar-limite" 
                    checked={forcarLimite} 
                    onCheckedChange={(checked) => setForcarLimite(!!checked)}
                  />
                  <Label htmlFor="forcar-limite" className="text-sm font-normal cursor-pointer">
                    Ignorar limite de inscrições por CPF
                  </Label>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-4">
            <div className="sm:mr-auto">
              {submitErrors.length > 0 && (
                <div className="text-sm text-destructive">
                  <span className="font-medium">Campos pendentes:</span>{" "}
                  {submitErrors
                    .slice(0, 3)
                    .map((e) => labelForError(e.path, e.message))
                    .join(", ")}
                  {submitErrors.length > 3 ? "..." : ""}
                  <button
                    type="button"
                    className="ml-2 underline underline-offset-2"
                    onClick={() => {
                      const first = submitErrors[0]?.path;
                      if (first) scrollToField(first);
                    }}
                  >
                    Ver
                  </button>
                </div>
              )}
              {validacaoIdadeRealTime?.bloqueadoMaximo && (
                <p className="text-sm text-destructive">{validacaoIdadeRealTime.mensagemMaximo}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              {isSuperAdmin && !isEditing && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={preencherFormularioAleatoriamente}
                  disabled={mutation.isPending}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Preencher Aleatoriamente
                </Button>
              )}
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending || validacaoIdadeRealTime?.bloqueadoMaximo}
              >
                {mutation.isPending && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salvar Alterações" : "Cadastrar Criança"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
