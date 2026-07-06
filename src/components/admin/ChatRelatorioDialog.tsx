import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Download,
  MessageSquare,
  Send,
  Inbox,
  CheckCheck,
  Users,
  TrendingUp,
  Timer,
  Clock,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChatRelatorioDialogProps {
  children: React.ReactNode;
}

interface MensagemData {
  id: string;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  direcao: string;
  lida_em: string | null;
  created_at: string;
}

export function ChatRelatorioDialog({ children }: ChatRelatorioDialogProps) {
  const [open, setOpen] = useState(false);
  const [dataInicio, setDataInicio] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [dataFim, setDataFim] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );

  const { data: relatorio, isLoading } = useQuery({
    queryKey: ["chat-relatorio", dataInicio, dataFim],
    queryFn: async () => {
      const { data: mensagens, error } = await supabase
        .from("chat_mensagens")
        .select("id, responsavel_id, responsavel_nome, direcao, lida_em, created_at")
        .gte("created_at", `${dataInicio}T00:00:00`)
        .lte("created_at", `${dataFim}T23:59:59`)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const msgs = (mensagens || []) as MensagemData[];

      // Calcular estatísticas básicas
      const totalMensagens = msgs.length;
      const enviadas = msgs.filter((m) => m.direcao === "admin").length;
      const recebidas = msgs.filter((m) => m.direcao === "responsavel").length;
      const lidas = msgs.filter((m) => m.lida_em).length;

      // Calcular tempo médio de resposta
      const mensagensPorResponsavel = new Map<string, MensagemData[]>();
      msgs.forEach((msg) => {
        const id = msg.responsavel_id || 'unknown';
        if (!mensagensPorResponsavel.has(id)) {
          mensagensPorResponsavel.set(id, []);
        }
        mensagensPorResponsavel.get(id)!.push(msg);
      });

      let totalTempoResposta = 0;
      let contagemRespostas = 0;
      const temposResposta: number[] = [];

      mensagensPorResponsavel.forEach((mensagensContato) => {
        const ordenadas = [...mensagensContato].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        for (let i = 0; i < ordenadas.length - 1; i++) {
          const atual = ordenadas[i];
          const proxima = ordenadas[i + 1];

          if (atual.direcao === "responsavel" && proxima.direcao === "admin") {
            const tempoMinutos = differenceInMinutes(
              new Date(proxima.created_at),
              new Date(atual.created_at)
            );
            if (tempoMinutos > 0 && tempoMinutos < 1440) {
              totalTempoResposta += tempoMinutos;
              temposResposta.push(tempoMinutos);
              contagemRespostas++;
            }
          }
        }
      });

      const tempoMedioResposta = contagemRespostas > 0 
        ? Math.round(totalTempoResposta / contagemRespostas) 
        : 0;

      temposResposta.sort((a, b) => a - b);
      const medianaTempoResposta = temposResposta.length > 0
        ? temposResposta[Math.floor(temposResposta.length / 2)]
        : 0;

      const totalConversas = mensagensPorResponsavel.size;

      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      const conversasAtivas = Array.from(mensagensPorResponsavel.entries()).filter(([_, msgs]) => {
        const ultimaMensagem = msgs[msgs.length - 1];
        return new Date(ultimaMensagem.created_at) >= seteDiasAtras;
      }).length;

      let mensagensRespondidas = 0;
      mensagensPorResponsavel.forEach((mensagensContato) => {
        const ordenadas = [...mensagensContato].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        for (let i = 0; i < ordenadas.length - 1; i++) {
          if (ordenadas[i].direcao === "responsavel" && ordenadas[i + 1].direcao === "admin") {
            mensagensRespondidas++;
          }
        }
      });
      const taxaResposta = recebidas > 0 ? Math.round((mensagensRespondidas / recebidas) * 100) : 0;

      const porContato = new Map<string, { nome: string; enviadas: number; recebidas: number; ultimaMensagem: string }>();
      msgs.forEach((msg) => {
        const id = msg.responsavel_id || 'unknown';
        if (!porContato.has(id)) {
          porContato.set(id, { 
            nome: msg.responsavel_nome || 'Desconhecido', 
            enviadas: 0, 
            recebidas: 0,
            ultimaMensagem: msg.created_at
          });
        }
        const contato = porContato.get(id)!;
        if (msg.direcao === "admin") contato.enviadas++;
        else contato.recebidas++;
        if (new Date(msg.created_at) > new Date(contato.ultimaMensagem)) {
          contato.ultimaMensagem = msg.created_at;
        }
      });

      const porDia = new Map<string, { enviadas: number; recebidas: number; conversasNovas: Set<string> }>();
      const primeirasMensagens = new Map<string, string>();

      msgs.forEach((msg) => {
        const dia = format(new Date(msg.created_at), "yyyy-MM-dd");
        const id = msg.responsavel_id || 'unknown';

        if (!porDia.has(dia)) {
          porDia.set(dia, { enviadas: 0, recebidas: 0, conversasNovas: new Set() });
        }
        const d = porDia.get(dia)!;
        if (msg.direcao === "admin") d.enviadas++;
        else d.recebidas++;

        if (!primeirasMensagens.has(id)) {
          primeirasMensagens.set(id, dia);
          d.conversasNovas.add(id);
        }
      });

      const porHora = new Map<number, { enviadas: number; recebidas: number }>();
      for (let i = 0; i < 24; i++) {
        porHora.set(i, { enviadas: 0, recebidas: 0 });
      }
      msgs.forEach((msg) => {
        const hora = new Date(msg.created_at).getHours();
        const h = porHora.get(hora)!;
        if (msg.direcao === "admin") h.enviadas++;
        else h.recebidas++;
      });

      let horaPico = 0;
      let maxMensagensHora = 0;
      porHora.forEach((stats, hora) => {
        const total = stats.enviadas + stats.recebidas;
        if (total > maxMensagensHora) {
          maxMensagensHora = total;
          horaPico = hora;
        }
      });

      return {
        totalMensagens,
        enviadas,
        recebidas,
        lidas,
        totalConversas,
        conversasAtivas,
        tempoMedioResposta,
        medianaTempoResposta,
        taxaResposta,
        horaPico,
        porContato: Array.from(porContato.entries())
          .map(([id, stats]) => ({ responsavelId: id, ...stats }))
          .sort((a, b) => (b.enviadas + b.recebidas) - (a.enviadas + a.recebidas))
          .slice(0, 10),
        porDia: Array.from(porDia.entries())
          .map(([dia, stats]) => ({ 
            dia, 
            enviadas: stats.enviadas, 
            recebidas: stats.recebidas,
            conversasNovas: stats.conversasNovas.size
          }))
          .sort((a, b) => a.dia.localeCompare(b.dia)),
        porHora: Array.from(porHora.entries())
          .map(([hora, stats]) => ({ hora, ...stats }))
          .sort((a, b) => a.hora - b.hora),
      };
    },
    enabled: open,
  });

  const exportarCSV = () => {
    if (!relatorio) return;

    const headers = ["Nome", "Mensagens Admin", "Mensagens Responsável", "Total", "Última Mensagem"];
    const rows = relatorio.porContato.map((c) => [
      c.nome,
      c.enviadas,
      c.recebidas,
      c.enviadas + c.recebidas,
      format(new Date(c.ultimaMensagem), "dd/MM/yyyy HH:mm"),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-chat-${dataInicio}-${dataFim}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatarTempo = (minutos: number) => {
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}min`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] max-h-[800px] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatório de Mensagens
          </DialogTitle>
          <DialogDescription>
            Análise completa de mensagens e métricas do chat interno
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-4 px-6 py-4 shrink-0 border-b">
          <div className="flex-1">
            <Label>Data Início</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={exportarCSV} disabled={!relatorio}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
                <Skeleton className="h-64" />
              </div>
            ) : relatorio ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        Total Mensagens
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{relatorio.totalMensagens}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        Conversas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-blue-600">{relatorio.totalConversas}</p>
                      <p className="text-xs text-muted-foreground">{relatorio.conversasAtivas} ativas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Timer className="h-4 w-4 text-orange-500" />
                        Tempo Médio Resposta
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatarTempo(relatorio.tempoMedioResposta)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Mediana: {formatarTempo(relatorio.medianaTempoResposta)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        Taxa de Resposta
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-green-600">{relatorio.taxaResposta}%</p>
                      <p className="text-xs text-muted-foreground">das mensagens recebidas</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Send className="h-4 w-4 text-blue-500" />
                        Admin
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold text-blue-600">{relatorio.enviadas}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Inbox className="h-4 w-4 text-green-500" />
                        Responsáveis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold text-green-600">{relatorio.recebidas}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <CheckCheck className="h-4 w-4 text-purple-500" />
                        Lidas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold text-purple-600">{relatorio.lidas}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        Horário de Pico
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold text-amber-600">{relatorio.horaPico}:00</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Atividade por Hora do Dia</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-1 h-32">
                      {relatorio.porHora.map((h) => {
                        const total = h.enviadas + h.recebidas;
                        const maxHora = Math.max(...relatorio.porHora.map(x => x.enviadas + x.recebidas));
                        const height = maxHora > 0 ? (total / maxHora) * 100 : 0;
                        return (
                          <div
                            key={h.hora}
                            className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t relative group"
                            style={{ height: `${Math.max(height, 5)}%` }}
                            title={`${h.hora}:00 - ${total} mensagens`}
                          >
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap">
                              {total}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>0h</span>
                      <span>6h</span>
                      <span>12h</span>
                      <span>18h</span>
                      <span>23h</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top 10 Contatos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead className="text-center">Admin</TableHead>
                          <TableHead className="text-center">Responsável</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead>Última Mensagem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {relatorio.porContato.map((c, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{c.nome}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
                                {c.enviadas}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-green-500/10 text-green-600">
                                {c.recebidas}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {c.enviadas + c.recebidas}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(c.ultimaMensagem), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Atividade por Dia</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-64 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-center">Admin</TableHead>
                            <TableHead className="text-center">Responsável</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">Novas Conversas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {relatorio.porDia.map((d) => (
                            <TableRow key={d.dia}>
                              <TableCell>
                                {format(new Date(d.dia), "dd/MM/yyyy", { locale: ptBR })}
                              </TableCell>
                              <TableCell className="text-center">{d.enviadas}</TableCell>
                              <TableCell className="text-center">{d.recebidas}</TableCell>
                              <TableCell className="text-center font-medium">
                                {d.enviadas + d.recebidas}
                              </TableCell>
                              <TableCell className="text-center">
                                {d.conversasNovas > 0 && (
                                  <Badge variant="secondary">{d.conversasNovas}</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Selecione um período para gerar o relatório
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
