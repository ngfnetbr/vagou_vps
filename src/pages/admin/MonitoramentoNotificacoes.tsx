import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNotificacoesStats, useNotificacoesLogs } from "@/hooks/api/notificacoes-stats-hooks";
import { CheckCircle2, XCircle, Clock, MessageSquare, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNotificacoesRealtimeUpdates } from "@/hooks/use-realtime-updates";

const MonitoramentoNotificacoes = () => {
  const [periodo, setPeriodo] = useState<'hoje' | '7dias' | '30dias' | 'tudo'>('30dias');
  const [tipoFiltro, setTipoFiltro] = useState('all');
  const [statusFiltro, setStatusFiltro] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: stats, isLoading: statsLoading } = useNotificacoesStats(periodo);
  const { data: logs, isLoading: logsLoading } = useNotificacoesLogs(page, 20, {
    canal: 'whatsapp', // Sempre filtrar apenas WhatsApp
    tipo: tipoFiltro,
    status: statusFiltro,
    search,
  });

  // Habilitar atualizações em tempo real para notificações
  useNotificacoesRealtimeUpdates(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sucesso':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Sucesso</Badge>;
      case 'falha':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falha</Badge>;
      case 'pendente':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      inscricao_fila: 'Inscrição na Fila',
      inscricao_realizada: 'Inscrição Confirmada',
      convocacao: 'Convocação para Vaga',
      documento_recusado: 'Documento Não Aceito',
      documentos_aprovados: 'Documentos Aprovados',
      matricula: 'Confirmação de Matrícula',
      matricula_confirmada: 'Matrícula Efetivada',
      lembrete: 'Lembrete de Prazo',
      lembrete_prazo: 'Lembrete de Prazo',
      lembrete_assinatura: 'Lembrete para Assinar',
      remanejamento: 'Transferência entre unidades',
      remanejamento_solicitado: 'Pedido de Transferência',
      remanejamento_concluido: 'Transferência Concluída',
      fim_fila: 'Retorno ao Fim da Fila',
      desistencia: 'Desistência Registrada',
      recusa: 'Recusa de Vaga',
    };
    return labels[tipo] || tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (statsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notificações WhatsApp</h1>
            <p className="text-muted-foreground">
              Histórico e estatísticas de notificações enviadas via WhatsApp
            </p>
          </div>
          <Select value={periodo} onValueChange={(v: any) => setPeriodo(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="7dias">Últimos 7 dias</SelectItem>
              <SelectItem value="30dias">Últimos 30 dias</SelectItem>
              <SelectItem value="tudo">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Enviadas</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bem-Sucedidas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.sucesso || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Falhas</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats?.falhas || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.taxaSucesso || 0}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Estatísticas por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tipo</CardTitle>
            <CardDescription>Notificações enviadas por tipo de evento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {stats?.porTipo.map((tipo) => (
                <div key={tipo.tipo} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">{getTipoLabel(tipo.tipo)}</h3>
                  <p className="text-2xl font-bold">{tipo.total}</p>
                  <p className="text-sm text-muted-foreground">
                    {tipo.sucesso} bem-sucedidas
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Notificações</CardTitle>
            <CardDescription>Detalhes de todas as notificações enviadas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Buscar por nome ou contato..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="inscricao_fila">Inscrição na Fila</SelectItem>
                  <SelectItem value="convocacao">Convocação para Vaga</SelectItem>
                  <SelectItem value="documento_recusado">Documento Não Aceito</SelectItem>
                  <SelectItem value="documentos_aprovados">Documentos Aprovados</SelectItem>
                  <SelectItem value="matricula">Confirmação de Matrícula</SelectItem>
                  <SelectItem value="matricula_confirmada">Matrícula Efetivada</SelectItem>
                  <SelectItem value="lembrete">Lembrete de Prazo</SelectItem>
                  <SelectItem value="remanejamento">Transferência entre CMEIs</SelectItem>
                  <SelectItem value="fim_fila">Fim da Fila</SelectItem>
                  <SelectItem value="desistencia">Desistência</SelectItem>
                  <SelectItem value="recusa">Recusa de Vaga</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sucesso">Sucesso</SelectItem>
                  <SelectItem value="falha">Falha</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tabela */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tentativas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Spinner className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : logs?.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma notificação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs?.data.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTipoLabel(log.tipo)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            <span>WhatsApp</span>
                          </div>
                        </TableCell>
                        <TableCell>{log.destinatario_nome}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.destinatario_contato}
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="text-center">{log.tentativas}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginação */}
            {logs && logs.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((page - 1) * 20) + 1} a {Math.min(page * 20, logs.count)} de {logs.count} registros
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(logs.totalPages, p + 1))}
                    disabled={page === logs.totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default MonitoramentoNotificacoes;

