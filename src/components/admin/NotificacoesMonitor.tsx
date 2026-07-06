import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNotificacoesStats, useNotificacoesLogs } from "@/hooks/api/notificacoes-stats-hooks";
import { CheckCircle2, XCircle, Clock, TrendingUp, Search } from "lucide-react";
import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNotificacoesRealtimeUpdates } from "@/hooks/use-realtime-updates";

export const NotificacoesMonitor = () => {
  const [periodo, setPeriodo] = useState<'hoje' | '7dias' | '30dias' | 'tudo'>('30dias');
  const [tipoFiltro, setTipoFiltro] = useState('all');
  const [statusFiltro, setStatusFiltro] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: stats, isLoading: statsLoading } = useNotificacoesStats(periodo);
  const { data: logs, isLoading: logsLoading } = useNotificacoesLogs(page, 20, {
    canal: 'whatsapp',
    tipo: tipoFiltro,
    status: statusFiltro,
    search,
  });

  useNotificacoesRealtimeUpdates(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sucesso':
        return <Badge className="bg-green-500 text-[10px] px-1.5 py-0"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Sucesso</Badge>;
      case 'falha':
        return <Badge variant="destructive" className="text-[10px] px-1.5 py-0"><XCircle className="h-2.5 w-2.5 mr-0.5" />Falha</Badge>;
      case 'pendente':
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0"><Clock className="h-2.5 w-2.5 mr-0.5" />Pendente</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{status}</Badge>;
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
      <div className="flex items-center justify-center min-h-[300px]">
        <Spinner className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Enviadas', value: stats?.total || 0, icon: WhatsAppIcon, border: 'border-l-whatsapp', text: 'text-foreground', iconCls: 'fill-whatsapp text-whatsapp' },
    { label: 'Bem-Sucedidas', value: stats?.sucesso || 0, icon: CheckCircle2, border: 'border-l-green-500', text: 'text-green-600', iconCls: 'text-green-500' },
    { label: 'Falhas', value: stats?.falhas || 0, icon: XCircle, border: 'border-l-destructive', text: 'text-destructive', iconCls: 'text-destructive' },
    { label: 'Taxa de Sucesso', value: `${stats?.taxaSucesso || 0}%`, icon: TrendingUp, border: 'border-l-primary', text: 'text-foreground', iconCls: 'text-primary' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <WhatsAppIcon className="h-4 w-4 fill-whatsapp" />
          Envios via WhatsApp
        </div>
        <Select value={periodo} onValueChange={(v: any) => setPeriodo(v)}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
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

      {/* Stat cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, border, text, iconCls }) => (
          <Card key={label} className={`border-l-4 ${border}`}>
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-xl font-bold ${text}`}>{value}</p>
              </div>
              <Icon className={`h-4 w-4 ${iconCls}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Distribuição por tipo */}
      {stats?.porTipo && stats.porTipo.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Distribuição por Tipo</p>
            <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {stats.porTipo.map((tipo) => (
                <div key={tipo.tipo} className="rounded-md border bg-muted/30 px-2.5 py-1.5">
                  <p className="text-[11px] font-medium truncate" title={getTipoLabel(tipo.tipo)}>{getTipoLabel(tipo.tipo)}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold leading-none">{tipo.total}</span>
                    <span className="text-[10px] text-green-600">{tipo.sucesso} ok</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      <Card>
        <CardContent className="p-3 space-y-3">
          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou contato..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 text-xs pl-8"
              />
            </div>
            <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
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
              <SelectTrigger className="w-[130px] h-8 text-xs">
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
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 text-xs">Data/Hora</TableHead>
                  <TableHead className="h-9 text-xs">Tipo</TableHead>
                  <TableHead className="h-9 text-xs">Destinatário</TableHead>
                  <TableHead className="h-9 text-xs">Contato</TableHead>
                  <TableHead className="h-9 text-xs">Status</TableHead>
                  <TableHead className="h-9 text-xs text-center">Tent.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Spinner className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : logs?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                      Nenhuma notificação encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  logs?.data.map((log: any) => (
                    <TableRow key={log.id} className="text-xs">
                      <TableCell className="py-2 whitespace-nowrap text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">{getTipoLabel(log.tipo)}</Badge>
                      </TableCell>
                      <TableCell className="py-2 font-medium max-w-[160px] truncate" title={log.destinatario_nome}>{log.destinatario_nome}</TableCell>
                      <TableCell className="py-2 text-muted-foreground whitespace-nowrap">
                        {log.destinatario_contato}
                      </TableCell>
                      <TableCell className="py-2">{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="py-2 text-center text-muted-foreground">{log.tentativas}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          {logs && logs.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {((page - 1) * 20) + 1}–{Math.min(page * 20, logs.count)} de {logs.count}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
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
  );
};
