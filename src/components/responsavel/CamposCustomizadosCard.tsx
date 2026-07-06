import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";
import { useValoresCamposCustom, useCamposInscricao, SECOES_FORMULARIO, SecaoFormulario } from "@/hooks/api/campos-inscricao-hooks";

interface CamposCustomizadosCardProps {
  criancaId: string;
  criancaNome?: string;
}

export const CamposCustomizadosCard = ({ criancaId, criancaNome }: CamposCustomizadosCardProps) => {
  const { data: valores, isLoading: loadingValores } = useValoresCamposCustom(criancaId);
  const { data: todosCampos, isLoading: loadingCampos } = useCamposInscricao();

  const isLoading = loadingValores || loadingCampos;

  // Filtra apenas campos customizados (não-sistema) que são visíveis ao responsável
  const camposCustomizados = todosCampos?.filter(
    (campo) => !campo.campo_sistema && campo.visivel_responsavel && campo.ativo
  ) || [];

  // Agrupa campos por seção
  const camposPorSecao = camposCustomizados.reduce((acc, campo) => {
    const secao = campo.secao as SecaoFormulario;
    if (!acc[secao]) {
      acc[secao] = [];
    }
    acc[secao].push(campo);
    return acc;
  }, {} as Record<SecaoFormulario, typeof camposCustomizados>);

  // Busca valor de um campo
  const getValorCampo = (campoId: string) => {
    return valores?.find((v) => v.campo_id === campoId)?.valor || "-";
  };

  // Formata valor para exibição
  const formatarValor = (valor: string | null, tipo: string) => {
    if (!valor || valor === "-") return "-";
    
    if (tipo === "checkbox") {
      return valor === "true" ? "Sim" : "Não";
    }
    
    if (tipo === "date") {
      try {
        return new Date(valor).toLocaleDateString("pt-BR");
      } catch {
        return valor;
      }
    }
    
    return valor;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Não mostra o card se não houver campos customizados
  if (camposCustomizados.length === 0) {
    return null;
  }

  // Verifica se há pelo menos um valor preenchido
  const temValoresPreenchidos = valores && valores.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Informações Adicionais
          {criancaNome && <Badge variant="outline">{criancaNome}</Badge>}
        </CardTitle>
        <CardDescription>
          Campos personalizados preenchidos na inscrição
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(camposPorSecao).map(([secao, campos]) => (
          <div key={secao} className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">
              {SECOES_FORMULARIO[secao as SecaoFormulario]}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campos.map((campo) => {
                const valor = getValorCampo(campo.id);
                const valorFormatado = formatarValor(valor, campo.tipo);
                
                return (
                  <div key={campo.id} className="space-y-1">
                    <p className="text-sm font-medium">{campo.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {valorFormatado}
                    </p>
                    {campo.dica && (
                      <p className="text-xs text-muted-foreground/70">{campo.dica}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {!temValoresPreenchidos && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma informação adicional foi preenchida para esta inscrição.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CamposCustomizadosCard;

