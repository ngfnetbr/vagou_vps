import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DynamicFormField, CAMPOS_ESPECIAIS } from "@/components/inscricao/DynamicFormField";
import { SECOES_FORMULARIO, CampoInscricao, SecaoFormulario } from "@/hooks/api/campos-inscricao-hooks";
import { Eye, Info } from "lucide-react";

interface CamposInscricaoPreviewProps {
  campos: CampoInscricao[];
}

export const CamposInscricaoPreview = ({ campos }: CamposInscricaoPreviewProps) => {
  const { register, setValue, watch, formState: { errors } } = useForm();
  
  const campoVisivel = (campo: CampoInscricao) => {
    if (!campo.depende_de || !campo.depende_valor) return true;
    const depValue = watch(campo.depende_de as any) as unknown;
    if (depValue === null || depValue === undefined) return false;
    const esperado = String(campo.depende_valor).trim().toLowerCase();
    if (typeof depValue === "boolean") return String(depValue) === esperado;
    return String(depValue).trim().toLowerCase() === esperado;
  };

  // Agrupa campos por seção
  const camposPorSecao = campos
    .filter(c => c.ativo)
    .filter(campoVisivel)
    .reduce((acc, campo) => {
      const secao = campo.secao as SecaoFormulario;
      if (!acc[secao]) acc[secao] = [];
      acc[secao].push(campo);
      return acc;
    }, {} as Record<SecaoFormulario, CampoInscricao[]>);

  // Ordena campos dentro de cada seção
  Object.keys(camposPorSecao).forEach(secao => {
    camposPorSecao[secao as SecaoFormulario]?.sort((a, b) => a.ordem - b.ordem);
  });

  const renderSecao = (secao: SecaoFormulario, titulo: string) => {
    const camposSecao = camposPorSecao[secao] || [];
    if (camposSecao.length === 0) return null;

    return (
      <div key={secao} className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">{titulo}</h3>
          <Badge variant="secondary" className="text-xs">
            {camposSecao.length} campo{camposSecao.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {camposSecao.map(campo => {
            const isEspecial = CAMPOS_ESPECIAIS.includes(campo.nome_campo);
            
            return (
              <div key={campo.id} className="relative">
                {isEspecial && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <Badge variant="outline" className="text-xs bg-background">
                      <Info className="h-3 w-3 mr-1" />
                      Especial
                    </Badge>
                  </div>
                )}
                <div className={isEspecial ? "opacity-60" : ""}>
                  <DynamicFormField
                    campo={campo}
                    register={register}
                    setValue={setValue}
                    errors={errors}
                    value={watch(campo.nome_campo)}
                    disabled={isEspecial}
                  />
                </div>
              </div>
            );
          })}
        </div>
        
        <Separator className="my-6" />
      </div>
    );
  };

  return (
    <Card className="border-2 border-dashed">
      <CardHeader className="bg-muted/50">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Preview do Formulário</CardTitle>
        </div>
        <CardDescription>
          Visualização de como os campos aparecerão no formulário público de inscrição.
          Campos com badge "Especial" possuem lógica customizada no formulário real.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {Object.entries(SECOES_FORMULARIO).map(([secao, titulo]) => 
          renderSecao(secao as SecaoFormulario, titulo)
        )}
        
        {campos.filter(c => c.ativo).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum campo ativo para exibir no preview
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CamposInscricaoPreview;

