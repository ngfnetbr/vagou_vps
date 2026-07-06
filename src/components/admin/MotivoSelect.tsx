import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMotivosPadrao, TipoMotivo } from "@/hooks/api/workflow-hooks";

interface MotivoSelectProps {
  tipo: TipoMotivo;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  rows?: number;
  disabled?: boolean;
}

export function MotivoSelect({
  tipo,
  value,
  onChange,
  label = "Justificativa",
  placeholder = "Selecione ou digite...",
  required = false,
  minLength,
  rows = 3,
  disabled = false,
}: MotivoSelectProps) {
  const { data: motivosPadrao, isLoading } = useMotivosPadrao(tipo);
  const [showCustom, setShowCustom] = useState(false);

  // Se não houver motivos padrão, mostrar textarea diretamente
  const hasMotivos = motivosPadrao && motivosPadrao.length > 0;

  // Verificar se o valor atual é um dos motivos padrão
  useEffect(() => {
    if (hasMotivos && value) {
      const isPresetMotivo = motivosPadrao?.some((m) => m.descricao === value);
      setShowCustom(!isPresetMotivo && value !== "");
    }
  }, []);

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === "__custom__") {
      setShowCustom(true);
      onChange("");
    } else {
      setShowCustom(false);
      onChange(selectedValue);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
        <div className="h-10 rounded-md border bg-muted animate-pulse" />
      </div>
    );
  }

  // Se não houver motivos padrão configurados, mostrar apenas textarea
  if (!hasMotivos) {
    return (
      <div className="space-y-2">
        <Label htmlFor="justificativa">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        <Textarea
          id="justificativa"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
        />
        {minLength && (
          <p className="text-xs text-muted-foreground">
            Mínimo {minLength} caracteres. {value.length}/{minLength}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="motivo-select">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        <Select
          value={showCustom ? "__custom__" : value}
          onValueChange={handleSelectChange}
          disabled={disabled}
        >
          <SelectTrigger id="motivo-select">
            <SelectValue placeholder="Selecione um motivo..." />
          </SelectTrigger>
          <SelectContent>
            {motivosPadrao?.map((motivo) => (
              <SelectItem key={motivo.id} value={motivo.descricao}>
                {motivo.descricao}
              </SelectItem>
            ))}
            <SelectItem value="__custom__" className="border-t mt-1 pt-1">
              ✏️ Outro motivo (digitar)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showCustom && (
        <div className="space-y-2">
          <Label htmlFor="justificativa-custom">Descreva o motivo</Label>
          <Textarea
            id="justificativa-custom"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
          />
          {minLength && (
            <p className="text-xs text-muted-foreground">
              Mínimo {minLength} caracteres. {value.length}/{minLength}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

