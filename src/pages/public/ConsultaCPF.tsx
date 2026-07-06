import { useMemo, useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, User, Calendar, MapPin, Clock, Baby, AlertCircle, CheckCircle2, Bell } from "lucide-react";
import { useConsultaCPF, useConsultaProtocolo } from "@/hooks/api/supabase-hooks";
import { maskCPF } from "@/utils/masks";
import { format, differenceInDays, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { validarCPF } from "@/utils/validations/inscricao";
import { getErrorMessage } from "@/utils/error-utils";
import { toast } from "sonner";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildVisibleFilaPositionMap } from "@/utils/fila-score";

type ConsultaPublicaResult = {
  id: string;
  protocolo: string | null;
  nome: string;
  data_nascimento: string;
  status: string;
  posicao_fila: number | null;
  convocacao_deadline: string | null;
  cmei_atual: { nome: string } | null;
  turma_atual: { nome: string } | null;
  cmei1: { nome: string } | null;
  cmei2: { nome: string } | null;
};

const ConsultaCPF = () => {
  const [buscaInput, setBuscaInput] = useState("");
  const [busca, setBusca] = useState("");
  const [tipoBusca, setTipoBusca] = useState<"cpf" | "protocolo" | null>(null);

  const { data: config } = useConfiguracoesPublicas();
  const { singular } = getUnidadeLabels(config as any);
  const { data: filaPublicaCompleta } = useQuery({
    queryKey: ["fila-publica-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_fila_publica");
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        status?: string | null;
        cmei_remanejamento_id?: string | null;
        posicao_fila?: number | null;
        posicao_fila_cmei2?: number | null;
        posicao_fila_cmei3?: number | null;
      }>;
    },
    staleTime: 60000,
    gcTime: 300000,
  });
  const posicaoMap = useMemo(
    () => buildVisibleFilaPositionMap(filaPublicaCompleta || []),
    [filaPublicaCompleta],
  );

  const consultaCpf = useConsultaCPF(busca, tipoBusca === "cpf" && busca.length > 0);
  const consultaProtocolo = useConsultaProtocolo(busca, tipoBusca === "protocolo" && busca.length > 0);

  const results = (tipoBusca === "protocolo"
    ? consultaProtocolo.data
    : consultaCpf.data) as ConsultaPublicaResult[] | undefined;
  const isLoading = tipoBusca === "protocolo" ? consultaProtocolo.isLoading : consultaCpf.isLoading;
  const error = tipoBusca === "protocolo" ? consultaProtocolo.error : consultaCpf.error;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const valor = buscaInput.trim();
    const cpfLimpo = valor.replace(/\D/g, "");
    const temLetras = /[a-zA-Z]/.test(valor);

    if (!temLetras && cpfLimpo.length === 11) {
      if (!validarCPF(cpfLimpo)) {
        toast.error("CPF inválido");
        return;
      }

      setTipoBusca("cpf");
      setBusca(cpfLimpo);
      return;
    }

    const valorUpper = valor.toUpperCase();
    const protocoloExtraido = valorUpper.match(/VAG-\d{8}-[A-Z0-9]{10}/)?.[0];
    const protocolo = protocoloExtraido || valorUpper.replace(/[^A-Z0-9-]/g, "").replace(/\s+/g, "");
    if (protocolo.length < 6) {
      toast.error("Informe um protocolo válido");
      return;
    }

    setTipoBusca("protocolo");
    setBusca(protocolo);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "Convocado":
      case "Aguardando Documentação":
      case "Aguardando Assinatura":
        return { 
          color: "bg-emerald-500 text-white", 
          icon: Bell,
          label: status === "Convocado" ? "Convocado" : status
        };
      case "Matriculado":
      case "Matriculada":
        return { 
          color: "bg-primary text-white", 
          icon: CheckCircle2,
          label: "Matriculado"
        };
      case "Fila de Espera":
        return { 
          color: "bg-amber-500 text-white", 
          icon: Clock,
          label: "Na Fila"
        };
      case "Desistente":
      case "Recusada":
        return { 
          color: "bg-destructive text-white", 
          icon: AlertCircle,
          label: status
        };
      default:
        return { 
          color: "bg-muted text-muted-foreground", 
          icon: FileText,
          label: status
        };
    }
  };

  const calcularIdade = (dataNascimento: string | null | undefined) => {
    if (!dataNascimento) return null;
    
    try {
      const nascimento = new Date(dataNascimento + 'T00:00:00');
      if (isNaN(nascimento.getTime())) return null;
      
      const hoje = new Date();
      
      let anos = hoje.getFullYear() - nascimento.getFullYear();
      let meses = hoje.getMonth() - nascimento.getMonth();
      
      // Ajuste se o mês atual for antes do mês de nascimento
      if (meses < 0 || (meses === 0 && hoje.getDate() < nascimento.getDate())) {
        anos--;
        meses += 12;
      }
      
      // Ajuste adicional para dias
      if (hoje.getDate() < nascimento.getDate()) {
        meses--;
        if (meses < 0) meses += 12;
      }
      
      const totalMeses = anos * 12 + meses;
      
      if (totalMeses < 12) {
        return `${totalMeses} ${totalMeses === 1 ? 'mês' : 'meses'}`;
      }
      
      return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
    } catch {
      return null;
    }
  };

  return (
    <PublicLayout>
      <div className="govbr-section bg-gradient-to-b from-muted/50 to-background min-h-[80vh]">
        <div className="govbr-container max-w-3xl">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Search className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">Consulta por CPF ou Protocolo</h1>
            </div>
            <p className="text-sm md:text-base text-muted-foreground ml-0 md:ml-14">
              Consulte a inscrição usando o CPF do responsável ou o protocolo
            </p>
          </div>

          {/* Card de Busca */}
          <Card className="mb-6 md:mb-8 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Buscar Inscrições
              </CardTitle>
              <CardDescription>
                Digite o CPF do responsável ou o protocolo para consultar o status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf" className="text-sm font-medium">
                    CPF do Responsável ou Protocolo
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00 ou VAG-YYYYMMDD-XXXXXXXXXX"
                        value={buscaInput}
                        onChange={(e) => {
                          const value = e.target.value;
                          const hasLetters = /[a-zA-Z]/.test(value);

                          if (!hasLetters && value.replace(/\D/g, "").length <= 11) {
                            setBuscaInput(maskCPF(value));
                            return;
                          }

                          setBuscaInput(value.toUpperCase());
                        }}
                        className="pl-10 h-12 text-lg"
                        maxLength={32}
                      />
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isLoading || buscaInput.trim().length === 0}
                      className="h-12 px-6"
                    >
                      {isLoading ? (
                        <Spinner className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4 mr-2" />
                      )}
                      Consultar
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Resultados */}
          {busca && (
            <div className="space-y-4 md:space-y-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <Spinner className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-muted-foreground">Buscando inscrições...</p>
                </div>
              ) : error ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-10 text-center gap-3">
                    <div className="p-4 bg-destructive/10 rounded-full">
                      <AlertCircle className="w-8 h-8 text-destructive" />
                    </div>
                    <h3 className="font-semibold text-lg">Erro ao consultar</h3>
                    <p className="text-muted-foreground text-sm max-w-md">
                      {getErrorMessage(error)}
                    </p>
                  </CardContent>
                </Card>
              ) : !results || results.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 bg-muted rounded-full mb-4">
                      <Search className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Nenhuma inscrição encontrada</h3>
                    <p className="text-muted-foreground text-sm max-w-xs">
                      Não encontramos inscrições vinculadas ao CPF informado. Verifique se o CPF está correto.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <h2 className="text-lg md:text-xl font-bold">Resultados</h2>
                    <Badge variant="secondary" className="w-fit">
                      {results.length} {results.length === 1 ? 'inscrição encontrada' : 'inscrições encontradas'}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {results.map((result) => {
                      const statusConfig = getStatusConfig(result.status);
                      const StatusIcon = statusConfig.icon;
                      const isConvocado = ["Convocado", "Aguardando Documentação", "Aguardando Assinatura"].includes(result.status);
                      const prazoVencido = result.convocacao_deadline && isPast(new Date(result.convocacao_deadline));
                      const diasRestantes = result.convocacao_deadline 
                        ? differenceInDays(new Date(result.convocacao_deadline), new Date())
                        : null;
                      const posicaoReal = posicaoMap.get(result.id) ?? result.posicao_fila;
                      
                      return (
                        <Card key={result.id} className="overflow-hidden hover:shadow-md transition-shadow">
                          {/* Header do Card com Status */}
                          <div className={`p-3 md:p-4 ${isConvocado ? 'bg-emerald-50 dark:bg-emerald-950/30' : ''}`}>
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                                  <Baby className="w-5 h-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="font-semibold text-base md:text-lg truncate">
                                    {result.nome}
                                  </h3>
                                  {calcularIdade(result.data_nascimento) && (
                                    <p className="text-xs md:text-sm text-muted-foreground">
                                      {calcularIdade(result.data_nascimento)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Badge className={`${statusConfig.color} gap-1 flex-shrink-0`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                              </Badge>
                            </div>
                          </div>

                          <CardContent className="p-3 md:p-4 pt-3">
                            {/* Grid de Informações */}
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                              {result.protocolo && (
                                <div className="space-y-1 col-span-2">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <FileText className="w-3 h-3" />
                                    Protocolo
                                  </div>
                                  <div className="font-semibold text-sm tracking-wide">
                                    {String(result.protocolo)}
                                  </div>
                                </div>
                              )}
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <MapPin className="w-3 h-3" />
                                  {result.cmei_atual?.nome ? `${singular} Atual` : `${singular} Preferência`}
                                </div>
                                <div className="font-medium text-sm">
                                  {result.cmei_atual?.nome || result.cmei1?.nome || "Não informado"}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <FileText className="w-3 h-3" />
                                  Turma
                                </div>
                                <div className="font-medium text-sm">
                                  {result.turma_atual?.nome || "-"}
                                </div>
                              </div>
                              
                              {result.status === "Fila de Espera" && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    Posição na Fila
                                  </div>
                                  <div className="font-bold text-lg text-primary">
                                    {posicaoReal ? `#${posicaoReal}` : (
                                      <span className="text-sm font-medium text-muted-foreground">
                                        Aguardando idade mínima
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {isConvocado && result.convocacao_deadline && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    Prazo de Resposta
                                  </div>
                                  <div className={`font-medium text-sm ${prazoVencido ? 'text-destructive' : ''}`}>
                                    {format(new Date(result.convocacao_deadline), "dd/MM/yyyy", { locale: ptBR })}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Alerta de Convocação */}
                            {isConvocado && result.convocacao_deadline && (
                              <div className={`mt-4 p-3 md:p-4 rounded-lg border ${
                                prazoVencido 
                                  ? 'bg-destructive/10 border-destructive/20' 
                                  : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
                              }`}>
                                <div className={`font-semibold text-sm mb-1 flex items-center gap-2 ${
                                  prazoVencido ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400'
                                }`}>
                                  {prazoVencido ? (
                                    <>
                                      <AlertCircle className="w-4 h-4" />
                                      Prazo Vencido
                                    </>
                                  ) : (
                                    <>
                                      <Bell className="w-4 h-4" />
                                      Convocado para Matrícula
                                    </>
                                  )}
                                </div>
                                <p className="text-xs md:text-sm text-muted-foreground">
                                  {prazoVencido ? (
                                    "O prazo para responder à convocação expirou. Entre em contato com a secretaria."
                                  ) : (
                                    <>
                                      Compareça em {singular} até{" "}
                                      <strong>{format(new Date(result.convocacao_deadline), "dd/MM/yyyy", { locale: ptBR })}</strong>
                                      {diasRestantes !== null && diasRestantes >= 0 && (
                                        <span className="text-emerald-600 dark:text-emerald-400">
                                          {" "}({diasRestantes === 0 ? "hoje" : `${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`})
                                        </span>
                                      )}
                                      {" "}para confirmar a matrícula.
                                    </>
                                  )}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Dica inicial */}
          {!busca && (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Como consultar?</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Digite o CPF do responsável (para ver todas as inscrições) ou o protocolo (para consultar uma inscrição específica).
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

export default ConsultaCPF;



