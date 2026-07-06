import { AlertTriangle, Calendar, Bell } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

interface InscricoesClosedBannerProps {
  dataInicio?: string | null;
  dataFim?: string | null;
  status: "before" | "after" | "closed" | "blocked";
  motivoBloqueio?: string | null;
}

export const InscricoesClosedBanner = ({ dataInicio, dataFim, status, motivoBloqueio }: InscricoesClosedBannerProps) => {
  const { data: config } = useConfiguracoesPublicas();
  const { plural } = getUnidadeLabels(config as any);
  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  if (status === "before" && dataInicio) {
    // Inscrições ainda não abriram
    return (
      <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/30 mb-6">
        <Calendar className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-800 dark:text-blue-200 font-semibold">
          Inscrições em Breve
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          <p className="mb-2">
            As inscrições para vagas em {plural} iniciarão em{" "}
            <strong>{formatDate(dataInicio)}</strong>.
          </p>
          {dataFim && (
            <p className="text-sm">
              Período de inscrições: {formatDate(dataInicio)} a {formatDate(dataFim)}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="border-blue-500 text-blue-700 hover:bg-blue-100">
              <Bell className="w-4 h-4 mr-2" />
              Cadastre-se para ser notificado
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "after" && dataFim) {
    // Inscrições já encerraram
    return (
      <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 mb-6">
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
        <AlertTitle className="text-yellow-800 dark:text-yellow-200 font-semibold">
          Período de Inscrições Encerrado
        </AlertTitle>
        <AlertDescription className="text-yellow-700 dark:text-yellow-300">
          <p className="mb-2">
            O período de inscrições para vagas em CMEIs encerrou em{" "}
            <strong>{formatDate(dataFim)}</strong>.
          </p>
          <p className="text-sm">
            Aguarde a divulgação do próximo período de inscrições. Você ainda pode consultar
            sua posição na fila ou verificar a ocupação dos CMEIs.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild className="border-yellow-500 text-yellow-700 hover:bg-yellow-100">
              <a href="/modulo/vagou/publico/consulta">Consultar Inscrição</a>
            </Button>
            <Button variant="outline" size="sm" asChild className="border-yellow-500 text-yellow-700 hover:bg-yellow-100">
              <a href="/modulo/vagou/publico/fila">Ver Fila de Espera</a>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "blocked") {
    // Inscrições bloqueadas administrativamente
    return (
      <Alert className="border-red-500 bg-red-50 dark:bg-red-950/30 mb-6">
        <AlertTriangle className="h-5 w-5 text-red-600" />
        <AlertTitle className="text-red-800 dark:text-red-200 font-semibold">
          Inscrições Temporariamente Suspensas
        </AlertTitle>
        <AlertDescription className="text-red-700 dark:text-red-300">
          <p className="mb-2">
            {motivoBloqueio || `As inscrições para vagas em ${plural} estão temporariamente suspensas.`}
          </p>
          <p className="text-sm">
            Entre em contato com a secretaria para mais informações.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild className="border-red-500 text-red-700 hover:bg-red-100">
              <a href="/modulo/vagou/publico/contato">Entrar em Contato</a>
            </Button>
            <Button variant="outline" size="sm" asChild className="border-red-500 text-red-700 hover:bg-red-100">
              <a href="/modulo/vagou/publico/consulta">Consultar Inscrição</a>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "closed") {
    // Sem datas configuradas ou período indefinido
    return (
      <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/30 mb-6">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <AlertTitle className="text-orange-800 dark:text-orange-200 font-semibold">
          Inscrições Temporariamente Fechadas
        </AlertTitle>
        <AlertDescription className="text-orange-700 dark:text-orange-300">
          <p className="mb-2">
            As inscrições para vagas em {plural} estão temporariamente fechadas.
          </p>
          <p className="text-sm">
            Aguarde a divulgação do próximo período de inscrições ou entre em contato com a secretaria para mais informações.
          </p>
          <div className="mt-3">
            <Button variant="outline" size="sm" asChild className="border-orange-500 text-orange-700 hover:bg-orange-100">
              <a href="/modulo/vagou/publico/contato">Entrar em Contato</a>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
