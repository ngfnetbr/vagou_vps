import { useState } from "react";
import ResponsavelLayout from "@/components/responsavel/ResponsavelLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Search, Filter, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ITEMS_PER_PAGE = 10;

export default function HistoricoNotificacoesPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [busca, setBusca] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["historico-notificacoes-responsavel", user?.id, page, filtroTipo, busca],
    queryFn: async () => {
      if (!user?.id) return { notificacoes: [], total: 0 };

      // Buscar crianças do responsável
      const { data: criancas } = await supabase
        .from("criancas")
        .select("id")
        .eq("responsavel_user_id", user.id);

      if (!criancas || criancas.length === 0) {
        return { notificacoes: [], total: 0 };
      }

      const criancaIds = criancas.map((c) => c.id);

      // Query base
      let query = supabase
        .from("notificacoes_log")
        .select("*, criancas(nome)", { count: "exact" })
        .in("crianca_id", criancaIds);

      // Filtros
      if (filtroTipo !== "todos") {
        query = query.eq("tipo", filtroTipo);
      }
      if (busca) {
        query = query.or(`destinatario_nome.ilike.%${busca}%,tipo.ilike.%${busca}%`);
      }

      // Paginação
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data: notificacoes, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      return { notificacoes: notificacoes || [], total: count || 0 };
    },
    enabled: !!user?.id,
  });

  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sucesso":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Enviado</Badge>;
      case "falha":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
      case "pendente":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    const tipoConfig: Record<string, { label: string; className: string }> = {
      convocacao: { label: "Chamada para Vaga", className: "bg-blue-100 text-blue-800" },
      matricula: { label: "Confirmação de Matrícula", className: "bg-green-100 text-green-800" },
      lembrete: { label: "Lembrete", className: "bg-yellow-100 text-yellow-800" },
      prazo_expirado: { label: "Prazo Vencido", className: "bg-red-100 text-red-800" },
      remanejamento: { label: "Troca de Unidade", className: "bg-purple-100 text-purple-800" },
      documentacao_pendente: { label: "Documentos Necessários", className: "bg-orange-100 text-orange-800" },
      inscricao_realizada: { label: "Inscrição Confirmada", className: "bg-teal-100 text-teal-800" },
    };
    const config = tipoConfig[tipo] || { label: tipo, className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getCanalLabel = (canal: string) => {
    const canaisConfig: Record<string, string> = {
      sistema: "Pelo Sistema",
      whatsapp: "Por Mensagem",
      email: "Por E-mail",
      sms: "Por SMS",
    };
    return canaisConfig[canal?.toLowerCase()] || canal;
  };

  return (
    <ResponsavelLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            <span className="hidden sm:inline">Histórico de Notificações</span>
            <span className="sm:hidden">Notificações</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Veja todas as notificações sobre suas inscrições
          </p>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={busca}
                    onChange={(e) => {
                      setBusca(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={filtroTipo}
                onValueChange={(value) => {
                  setFiltroTipo(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Tipo de notificação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="convocacao">Chamada para Vaga</SelectItem>
                  <SelectItem value="matricula">Confirmação de Matrícula</SelectItem>
                  <SelectItem value="lembrete">Lembrete</SelectItem>
                  <SelectItem value="prazo_expirado">Prazo Vencido</SelectItem>
                  <SelectItem value="remanejamento">Troca de Unidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Notificações */}
        <Card>
          <CardHeader>
            <CardTitle>Notificações ({data?.total || 0})</CardTitle>
            <CardDescription>
              Lista completa de notificações recebidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-24" />
                  </div>
                ))}
              </div>
            ) : data?.notificacoes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma notificação encontrada</p>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {data?.notificacoes.map((notif: any) => (
                  <div key={notif.id} className="flex items-start gap-3 md:gap-4 p-3 md:p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bell className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 md:gap-2 flex-wrap mb-1">
                        {getTipoBadge(notif.tipo)}
                        {getStatusBadge(notif.status)}
                      </div>
                      <p className="font-medium text-sm md:text-base truncate">
                        {notif.criancas?.nome || "Criança"}
                      </p>
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                        {notif.payload?.mensagem || notif.tipo}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {notif.canal && (
                          <span className="text-xs text-muted-foreground">
                            {getCanalLabel(notif.canal)}
                          </span>
                        )}
                        <time className="text-xs text-muted-foreground md:hidden">
                          {format(new Date(notif.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </time>
                      </div>
                    </div>
                    <time className="text-xs text-muted-foreground whitespace-nowrap hidden md:block">
                      {format(new Date(notif.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </time>
                  </div>
                ))}

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Página {page} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Anterior</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        <span className="hidden sm:inline">Próxima</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ResponsavelLayout>
  );
}
