import { UseFormRegister, UseFormSetValue, FieldErrors, UseFormWatch } from "react-hook-form";
import { DynamicFormField, CAMPOS_ESPECIAIS, deveRenderizarDinamicamente } from "./DynamicFormField";
import { CampoInscricao, useCamposInscricao, SecaoFormulario, SECOES_FORMULARIO } from "@/hooks/api/campos-inscricao-hooks";
import { Skeleton } from "@/components/ui/skeleton";

interface FormularioInscricaoSectionProps {
  secao: SecaoFormulario;
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
  errors: FieldErrors;
  disabled?: boolean;
  showTitle?: boolean;
  // Renderiza campos especiais customizados (passados pelo parent)
  renderCampoEspecial?: (campo: CampoInscricao) => React.ReactNode;
  // Campos extras que não estão na tabela
  extraFields?: React.ReactNode;
  className?: string;
}

export const FormularioInscricaoSection = ({
  secao,
  register,
  setValue,
  watch,
  errors,
  disabled = false,
  showTitle = true,
  renderCampoEspecial,
  extraFields,
  className = "grid grid-cols-1 md:grid-cols-2 gap-4",
}: FormularioInscricaoSectionProps) => {
  const { data: campos, isLoading } = useCamposInscricao(secao);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {showTitle && <Skeleton className="h-6 w-32" />}
        <div className={className}>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  const camposAtivos = (campos || [])
    .filter((c) => c.ativo)
    .filter((campo) => {
      if (!campo.depende_de || !campo.depende_valor) return true;
      const depValue = watch(campo.depende_de as any) as unknown;
      if (depValue === null || depValue === undefined) return false;
      const esperado = String(campo.depende_valor).trim().toLowerCase();
      if (typeof depValue === "boolean") return String(depValue) === esperado;
      return String(depValue).trim().toLowerCase() === esperado;
    });
  
  // Separa campos dinâmicos dos especiais
  const camposDinamicos = camposAtivos.filter(c => deveRenderizarDinamicamente(c.nome_campo));
  const camposEspeciais = camposAtivos.filter(c => !deveRenderizarDinamicamente(c.nome_campo));

  if (camposAtivos.length === 0 && !extraFields) {
    return null;
  }

  return (
    <div className="space-y-4">
      {showTitle && (
        <h3 className="text-lg font-semibold">{SECOES_FORMULARIO[secao]}</h3>
      )}
      
      <div className={className}>
        {/* Renderiza campos especiais primeiro (se houver callback) */}
        {renderCampoEspecial && camposEspeciais.map(campo => (
          <div key={campo.id}>
            {renderCampoEspecial(campo)}
          </div>
        ))}

        {/* Renderiza campos dinâmicos */}
        {camposDinamicos.map(campo => (
          <DynamicFormField
            key={campo.id}
            campo={campo}
            register={register}
            setValue={setValue}
            errors={errors}
            value={watch(campo.nome_campo)}
            disabled={disabled}
          />
        ))}

        {/* Campos extras passados pelo parent */}
        {extraFields}
      </div>
    </div>
  );
};

// Hook para verificar se existem campos em uma seção
export const useHasCamposSecao = (secao: SecaoFormulario) => {
  const { data: campos, isLoading } = useCamposInscricao(secao);
  return {
    hasCampos: (campos?.filter(c => c.ativo).length ?? 0) > 0,
    isLoading,
  };
};

