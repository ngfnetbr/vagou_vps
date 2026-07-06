import { z } from "zod";
import type { CampoInscricao } from "@/hooks/api/campos-inscricao-hooks";

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

const isNotFutureDate = (value: string): boolean => {
  const date = parseISODateOnly(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() <= today.getTime();
};

const emptyToUndefined = (value: unknown) => {
  if (value === null || value === undefined) return value;
  if (typeof value !== "string") return value;
  if (value.trim().length === 0) return undefined;
  return value;
};

// Validação de CPF completa com dígitos verificadores
export const validarCPF = (cpf: string): boolean => {
  const cpfLimpo = cpf.replace(/\D/g, "");
  if (cpfLimpo.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;
  
  // Verifica CPFs com checksum válido mas conhecidos como inválidos/teste
  const blacklist = [
    "12345678909"
  ];
  if (blacklist.includes(cpfLimpo)) return false;

  // Validação dos dígitos verificadores
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.charAt(9))) return false;
  
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.charAt(10))) return false;
  
  return true;
};

// Validação de CEP
export const validarCEPPermitido = (cep: string, cepsPermitidos: string[] | null): boolean => {
  if (!cepsPermitidos || cepsPermitidos.length === 0) return true;
  
  const cepLimpo = cep.replace(/\D/g, "");
  return cepsPermitidos.some(cepPermitido => {
    const cepPermitidoLimpo = cepPermitido.replace(/\D/g, "");
    // Permite correspondência parcial (prefixo) ou exata
    return cepLimpo.startsWith(cepPermitidoLimpo) || cepPermitidoLimpo === cepLimpo;
  });
};

export const inscricaoSchema = z.object({
  // Dados da criança
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  data_nascimento: z
    .string()
    .min(1, "Data de nascimento é obrigatória")
    .refine(isNotFutureDate, "Data de nascimento não pode ser futura"),
  cpf_crianca: z.string().optional().refine((val) => !val || validarCPF(val), "CPF inválido"),
  sexo: z.preprocess(
    emptyToUndefined,
    z.enum(["Masculino", "Feminino"], {
      required_error: "Selecione o sexo",
    }),
  ),
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
  etnia_indigena: z.preprocess(emptyToUndefined, z.enum(["guarani", "kaingang", "xeta", "xokleng", "outra"]).optional()),
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
  estrangeiro_possui_documentos: z.preprocess(emptyToUndefined, z.enum(["sim", "nao"]).optional()),
  nis: z
    .string()
    .optional()
    .refine((val) => !val || val.replace(/\D/g, "").length === 11, "NIS inválido"),
  
  // Dados do responsável
  responsavel_nome: z.string().min(3, "Nome do responsável é obrigatório"),
  responsavel_cpf: z.string()
    .min(1, "CPF do responsável é obrigatório")
    .refine(validarCPF, "CPF inválido"),
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
  responsavel_email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  responsavel_telefone: z.string().min(10, "Telefone é obrigatório"),
  responsavel_celular: z.string().optional(),
  responsavel_telefone_comercial: z.string().optional(),
  canal_notificacao_preferido: z.preprocess(emptyToUndefined, z.enum(["whatsapp", "sms", "email"]).optional()),
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
  cep: z
    .string()
    .min(1, "CEP é obrigatório")
    .refine((val) => val.replace(/\D/g, "").length === 8, "CEP inválido"),
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
      ["optou_nao_informar", "propria", "alugada", "cedida", "pensionato", "casa_lar_abrigo", "outro"],
      { required_error: "Selecione a forma de ocupação da moradia" },
    ),
  ),
  forma_ocupacao_moradia_outro: z.string().optional(),
  
  // Preferências
  cmei1_preferencia: z.string().optional(),
  cmei2_preferencia: z.string().optional(),
  cmei3_preferencia: z.string().optional(),
  aceita_qualquer_cmei: z.boolean().default(false),
  programas_sociais: z.boolean().default(false),
  prioridades_ids: z.array(z.string()).optional().default([]),
  tem_prioridade: z.boolean().optional(),
  
  // Observações
  observacoes: z.string().max(500, "Observações devem ter no máximo 500 caracteres").optional(),
});

export type InscricaoFormData = z.infer<typeof inscricaoSchema>;

type CampoInscricaoValidacao = Pick<
  CampoInscricao,
  "nome_campo" | "label" | "tipo" | "obrigatorio" | "validacao" | "depende_de" | "depende_valor"
>;

const isBlank = (value: unknown) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  return false;
};

export const createInscricaoSchema = (campos: CampoInscricaoValidacao[] = []) => {
  const base = inscricaoSchema.passthrough();
  if (!campos || campos.length === 0) {
    return base.superRefine((data, ctx) => {
      const record = data as Record<string, unknown>;
      const canal = record.canal_notificacao_preferido;

      if (canal === "email") {
        const email = record.responsavel_email;
        if (isBlank(email)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["responsavel_email"],
            message: "Informe um e-mail para receber notificações por e-mail",
          });
        }
      }
    });
  }

  return base.superRefine((data, ctx) => {
    const record = data as Record<string, unknown>;

    for (const campo of campos) {
      if (campo.depende_de && campo.depende_valor) {
        const depValue = record[campo.depende_de];
        if (depValue === null || depValue === undefined) continue;
        const esperado = String(campo.depende_valor).trim().toLowerCase();
        const atual = typeof depValue === "boolean" ? String(depValue) : String(depValue).trim().toLowerCase();
        if (atual !== esperado) continue;
      }
      const value = record[campo.nome_campo];
      const mensagemObrigatorio =
        campo.validacao?.mensagem_erro || `${campo.label} é obrigatório`;

      if (campo.obrigatorio) {
        const ok = campo.tipo === "checkbox" ? value === true : !isBlank(value);
        if (!ok) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [campo.nome_campo],
            message: mensagemObrigatorio,
          });
          continue;
        }
      }

      if (isBlank(value)) continue;

      const strValue = typeof value === "string" ? value : String(value);

      if (campo.validacao) {
        if (campo.validacao.min !== undefined) {
          if (strValue.trim().length < campo.validacao.min) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [campo.nome_campo],
              message:
                campo.validacao.mensagem_erro ||
                `${campo.label} deve ter no mínimo ${campo.validacao.min} caracteres`,
            });
          }
        }

        if (campo.validacao.max !== undefined) {
          if (strValue.trim().length > campo.validacao.max) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [campo.nome_campo],
              message:
                campo.validacao.mensagem_erro ||
                `${campo.label} deve ter no máximo ${campo.validacao.max} caracteres`,
            });
          }
        }

        if (campo.validacao.pattern) {
          try {
            const regex = new RegExp(campo.validacao.pattern);
            if (!regex.test(strValue)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [campo.nome_campo],
                message:
                  campo.validacao.mensagem_erro ||
                  `${campo.label} está em formato inválido`,
              });
            }
          } catch {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [campo.nome_campo],
              message: "Regra de validação inválida",
            });
          }
        }
      }

      if (campo.tipo === "email") {
        const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
        if (!emailRegex.test(strValue)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [campo.nome_campo],
            message: "E-mail inválido",
          });
        }
      }

      if (campo.tipo === "cpf") {
        if (!validarCPF(strValue)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [campo.nome_campo],
            message: "CPF inválido",
          });
        }
      }

      if (campo.tipo === "phone") {
        const phoneRegex = /^\(\d{2}\) \d{4,5}-\d{4}$/;
        if (!phoneRegex.test(strValue)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [campo.nome_campo],
            message: "Telefone inválido (formato: (00) 00000-0000)",
          });
        }
      }

      if (campo.tipo === "cep") {
        const cepRegex = /^\d{5}-\d{3}$/;
        if (!cepRegex.test(strValue)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [campo.nome_campo],
            message: "CEP inválido (formato: 00000-000)",
          });
        }
      }

      if (campo.tipo === "number") {
        const asNumber = Number(strValue);
        if (!Number.isFinite(asNumber)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [campo.nome_campo],
            message: campo.validacao?.mensagem_erro || `${campo.label} deve ser um número`,
          });
        }
      }
    }

    const canal = record.canal_notificacao_preferido;
    if (canal === "email") {
      const email = record.responsavel_email;
      if (isBlank(email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["responsavel_email"],
          message: "Informe um e-mail para receber notificações por e-mail",
        });
      }
    }

    if (record.responsavel_parentesco === "outro") {
      if (isBlank(record.responsavel_parentesco_outro)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["responsavel_parentesco_outro"],
          message: "Informe o parentesco",
        });
      }
    }

    const isIndigena =
      record.cor_raca_autodeclarada === "indigena" || record.cor_raca_certidao === "indigena";
    if (isIndigena) {
      const etnia = record.etnia_indigena;
      if (isBlank(etnia)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["etnia_indigena"],
          message: "Selecione a etnia indígena",
        });
      }
    }

    if (record.etnia_indigena === "outra") {
      if (isBlank(record.etnia_indigena_outra)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["etnia_indigena_outra"],
          message: "Informe qual etnia",
        });
      }
    }

    if (record.quilombo_remanescente === "sim") {
      if (isBlank(record.quilombo_nome)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["quilombo_nome"],
          message: "Informe qual quilombo",
        });
      }
    }

    if (record.nacionalidade === "estrangeira") {
      if (isBlank(record.estrangeiro_possui_documentos)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["estrangeiro_possui_documentos"],
          message: "Informe se possui documentos",
        });
      }
    }

    if (record.forma_ocupacao_moradia === "outro") {
      if (isBlank(record.forma_ocupacao_moradia_outro)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["forma_ocupacao_moradia_outro"],
          message: "Informe qual forma de ocupação",
        });
      }
    }

    const filiacao1NaoDeclarada = record.filiacao1_nao_declarada === true;
    if (!filiacao1NaoDeclarada) {
      if (isBlank(record.filiacao1_nome)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["filiacao1_nome"],
          message: "Filiação 1 é obrigatória",
        });
      } else if (String(record.filiacao1_nome).trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["filiacao1_nome"],
          message: "Filiação 1 deve ter no mínimo 3 caracteres",
        });
      }

      if (isBlank(record.filiacao1_cpf)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["filiacao1_cpf"],
          message: "CPF da Filiação 1 é obrigatório",
        });
      } else if (!validarCPF(String(record.filiacao1_cpf))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["filiacao1_cpf"],
          message: "CPF inválido",
        });
      }

      if (isBlank(record.filiacao1_celular)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["filiacao1_celular"],
          message: "Telefone celular/WhatsApp da Filiação 1 é obrigatório",
        });
      } else if (String(record.filiacao1_celular).replace(/\D/g, "").length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["filiacao1_celular"],
          message: "Telefone inválido",
        });
      }
    }

    const filiacao2NaoDeclarada = record.filiacao2_nao_declarada === true;
    if (!filiacao2NaoDeclarada) {
      if (isBlank(record.filiacao2_nome)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["filiacao2_nome"],
          message: "Filiação 2 é obrigatória",
        });
      } else if (String(record.filiacao2_nome).trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["filiacao2_nome"],
          message: "Filiação 2 deve ter no mínimo 3 caracteres",
        });
      }

      if (isBlank(record.filiacao2_cpf)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["filiacao2_cpf"],
          message: "CPF da Filiação 2 é obrigatório",
        });
      } else if (!validarCPF(String(record.filiacao2_cpf))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["filiacao2_cpf"],
          message: "CPF inválido",
        });
      }

      if (isBlank(record.filiacao2_celular)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["filiacao2_celular"],
          message: "Telefone celular/WhatsApp da Filiação 2 é obrigatório",
        });
      } else if (String(record.filiacao2_celular).replace(/\D/g, "").length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["filiacao2_celular"],
          message: "Telefone inválido",
        });
      }
    }
  });
};
