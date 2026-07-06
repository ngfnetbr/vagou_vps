import { useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { maskCPF, maskPhone, maskCEP } from "@/utils/masks";
import type { CampoInscricao } from "@/hooks/api/campos-inscricao-hooks";
import { UseFormRegister, UseFormSetValue, FieldErrors, RegisterOptions } from "react-hook-form";
import { User, Calendar, CreditCard, Phone, Mail, MapPin, FileText, Hash } from "lucide-react";

interface DynamicFormFieldProps {
  campo: CampoInscricao;
  register: UseFormRegister<Record<string, unknown>>;
  setValue: UseFormSetValue<Record<string, unknown>>;
  errors: FieldErrors;
  value?: unknown;
  disabled?: boolean;
}

// Mapeamento de campos para ícones
const FIELD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  nome: User,
  responsavel_nome: User,
  cpf: CreditCard,
  cpf_crianca: CreditCard,
  responsavel_cpf: CreditCard,
  telefone: Phone,
  responsavel_telefone: Phone,
  responsavel_celular: Phone,
  email: Mail,
  responsavel_email: Mail,
  data_nascimento: Calendar,
  cep: MapPin,
  logradouro: MapPin,
  bairro: MapPin,
  cidade: MapPin,
  estado: MapPin,
  numero: Hash,
  observacoes: FileText,
  certidao_nascimento: FileText,
};

// Gera opções de validação baseado no campo.validacao
export const buildValidationRules = (campo: CampoInscricao): RegisterOptions => {
  const rules: RegisterOptions = {};
  
  // Campo obrigatório
  if (campo.obrigatorio) {
    rules.required = campo.validacao?.mensagem_erro || `${campo.label} é obrigatório`;
  }
  
  // Validações customizadas do campo
  if (campo.validacao) {
    // Tamanho mínimo
    if (campo.validacao.min !== undefined) {
      rules.minLength = {
        value: campo.validacao.min,
        message: campo.validacao.mensagem_erro || `${campo.label} deve ter no mínimo ${campo.validacao.min} caracteres`,
      };
    }
    
    // Tamanho máximo
    if (campo.validacao.max !== undefined) {
      rules.maxLength = {
        value: campo.validacao.max,
        message: campo.validacao.mensagem_erro || `${campo.label} deve ter no máximo ${campo.validacao.max} caracteres`,
      };
    }
    
    // Padrão regex
    if (campo.validacao.pattern) {
      rules.pattern = {
        value: new RegExp(campo.validacao.pattern),
        message: campo.validacao.mensagem_erro || `${campo.label} está em formato inválido`,
      };
    }
  }
  
  // Validações por tipo de campo
  if (campo.tipo === "email") {
    rules.pattern = {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: "E-mail inválido",
    };
  }
  
  if (campo.tipo === "cpf") {
    rules.pattern = {
      value: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
      message: "CPF inválido (formato: 000.000.000-00)",
    };
  }
  
  if (campo.tipo === "phone") {
    rules.pattern = {
      value: /^\(\d{2}\) \d{4,5}-\d{4}$/,
      message: "Telefone inválido (formato: (00) 00000-0000)",
    };
  }
  
  if (campo.tipo === "cep") {
    rules.pattern = {
      value: /^\d{5}-\d{3}$/,
      message: "CEP inválido (formato: 00000-000)",
    };
  }
  
  return rules;
};

export const DynamicFormField = ({
  campo,
  register,
  setValue,
  errors,
  value,
  disabled = false,
}: DynamicFormFieldProps) => {
  const fieldName = campo.nome_campo;
  const error = errors[fieldName];
  const Icon = FIELD_ICONS[fieldName];
  const validationRules = useMemo(() => buildValidationRules(campo), [campo]);

  useEffect(() => {
    if (campo.tipo !== "checkbox") return;
    register(fieldName, validationRules);
  }, [campo.tipo, fieldName, register, validationRules]);

  const renderField = () => {
    switch (campo.tipo) {
      case "text":
      case "email":
      case "number":
        return (
          <Input
            id={fieldName}
            type={campo.tipo === "email" ? "email" : campo.tipo === "number" ? "number" : "text"}
            placeholder={campo.placeholder || ""}
            disabled={disabled}
            {...register(fieldName, validationRules)}
          />
        );

      case "cpf":
        return (
          <Input
            id={fieldName}
            placeholder={campo.placeholder || "000.000.000-00"}
            disabled={disabled}
            {...register(fieldName, validationRules)}
            onChange={(e) => {
              const masked = maskCPF(e.target.value);
              setValue(fieldName, masked);
            }}
          />
        );

      case "phone":
        return (
          <Input
            id={fieldName}
            placeholder={campo.placeholder || "(00) 00000-0000"}
            disabled={disabled}
            {...register(fieldName, validationRules)}
            onChange={(e) => {
              const masked = maskPhone(e.target.value);
              setValue(fieldName, masked);
            }}
          />
        );

      case "cep":
        return (
          <Input
            id={fieldName}
            placeholder={campo.placeholder || "00000-000"}
            disabled={disabled}
            {...register(fieldName, validationRules)}
            onChange={(e) => {
              const masked = maskCEP(e.target.value);
              setValue(fieldName, masked);
            }}
          />
        );

      case "date":
        return (
          <Input
            id={fieldName}
            type="date"
            disabled={disabled}
            {...register(fieldName, validationRules)}
          />
        );

      case "select":
        return (
          <>
            <input type="hidden" value={(value as string) || ""} {...register(fieldName, validationRules)} />
            <Select
              value={(value as string) || ""}
              onValueChange={(val) => setValue(fieldName, val, { shouldValidate: true, shouldDirty: true })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={campo.placeholder || "Selecione"} />
              </SelectTrigger>
              <SelectContent>
                {campo.opcoes?.map((opcao) => (
                  <SelectItem key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        );

      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={fieldName}
              checked={(value as boolean) || false}
              onCheckedChange={(checked) =>
                setValue(fieldName, checked === true, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              disabled={disabled}
            />
            <label
              htmlFor={fieldName}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {campo.label}
              {campo.obrigatorio && <span className="text-destructive">*</span>}
            </label>
          </div>
        );

      case "textarea":
        return (
          <Textarea
            id={fieldName}
            placeholder={campo.placeholder || ""}
            rows={4}
            disabled={disabled}
            {...register(fieldName, validationRules)}
          />
        );

      default:
        return (
          <Input
            id={fieldName}
            placeholder={campo.placeholder || ""}
            disabled={disabled}
            {...register(fieldName, validationRules)}
          />
        );
    }
  };

  // Checkbox já inclui o label
  if (campo.tipo === "checkbox") {
    return (
      <div className="space-y-2">
        {renderField()}
        {campo.dica && (
          <p className="text-xs text-muted-foreground">{campo.dica}</p>
        )}
        {error && (
          <p className="text-sm text-destructive">{error.message as string}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldName} className="flex items-center gap-1">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {campo.label}
        {campo.obrigatorio && <span className="text-destructive">*</span>}
      </Label>
      {renderField()}
      {campo.dica && (
        <p className="text-xs text-muted-foreground">{campo.dica}</p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error.message as string}</p>
      )}
    </div>
  );
};

// Campos que possuem lógica especial e não devem ser renderizados dinamicamente
export const CAMPOS_ESPECIAIS = [
  "data_nascimento", // Validação de idade em tempo real
  "sexo",            // Opções fixas M/F
  "cep",             // Busca ViaCEP
  "cmei1_preferencia", // Seleção com zonas
  "cmei2_preferencia", // Seleção com zonas
  "aceita_qualquer_cmei", // Lógica de preferência
];

// Verifica se um campo deve ser renderizado dinamicamente
export const deveRenderizarDinamicamente = (nomeCampo: string): boolean => {
  return !CAMPOS_ESPECIAIS.includes(nomeCampo);
};


