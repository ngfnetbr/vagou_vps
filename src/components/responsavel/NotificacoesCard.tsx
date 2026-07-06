import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/common/Spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bell, CheckCircle, AlertCircle, Mail, Smartphone, Clock, TrendingUp } from "lucide-react";
import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";
import { useNotificacoesResponsavel } from "@/hooks/api/responsavel-hooks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const getIconByTipo = (tipo: string) => {
  switch (tipo) {
    case "convocacao":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case "matricula":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "lembrete":
      return <Clock className="h-4 w-4 text-orange-500" />;
    case "posicao_fila":
      return <TrendingUp className="h-4 w-4 text-primary" />;
    default:
      return <Bell className="h-4 w-4 text-blue-500" />;
  }
};

const getIconByCanal = (canal: string) => {
  switch (canal) {
    case "email":
      return <Mail className="h-3 w-3" />;
    case "whatsapp":
      return <WhatsAppIcon className="h-3 w-3 fill-current" />;
    case "sms":
      return <Smartphone className="h-3 w-3" />;
    case "sistema":
      return <Bell className="h-3 w-3" />;
    default:
      return <Bell className="h-3 w-3" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "enviado":
      return <Badge variant="default" className="text-xs">Enviado</Badge>;
    case "erro":
      return <Badge variant="destructive" className="text-xs">Erro</Badge>;
    case "pendente":
      return <Badge variant="secondary" className="text-xs">Novo</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
};

const getTipoLabel = (tipo: string) => {
  switch (tipo) {
    case "convocacao":
      return "Chamada para Vaga";
    case "matricula":
      return "Matrícula";
    case "lembrete":
      return "Lembrete";
    case "remanejamento":
      return "Troca de Unidade";
    case "posicao_fila":
      return "Sua Posição na Fila";
    default:
      return tipo;
  }
};

interface NotificacaoItemProps {
  notificacao: {
    id: string;
    tipo: string;
    canal: string;
    status: string;
    created_at: string;
    destinatario_nome?: string | null;
    payload?: any;
  };
  compact?: boolean;
}

const NotificacaoItem = ({ notificacao, compact = false }: NotificacaoItemProps) => {
  const isPosicaoFila = notificacao.tipo === "posicao_fila";
  const payload = notificacao.payload as { mensagem?: string; posicao_antiga?: number; posicao_nova?: number } | null;
  const mensagem = payload?.mensagem;
  
  return (
    <div className={`flex items-start gap-3 ${compact ? 'py-2' : 'p-3 bg-muted/50 rounded-lg'} ${isPosicaoFila ? 'bg-primary/5' : ''}`}>
      <div className="mt-0.5">
        {getIconByTipo(notificacao.tipo)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{getTipoLabel(notificacao.tipo)}</span>
          {getStatusBadge(notificacao.status)}
        </div>
        {mensagem && (
          <p className="text-sm text-foreground mt-1">{mensagem}</p>
        )}
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {getIconByCanal(notificacao.canal)}
          <span className="capitalize">{notificacao.canal}</span>
          <span>•</span>
          <span>
            {format(new Date(notificacao.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
      </div>
    </div>
  );
};

export const NotificacoesCard = () => {
  const { data: notificacoes, isLoading } = useNotificacoesResponsavel();

  const notificacoesRecentes = notificacoes?.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Avisos e Comunicados
          </CardTitle>
          <CardDescription>
            Mensagens recentes sobre suas inscrições
          </CardDescription>
        </div>
        {notificacoes && notificacoes.length > 5 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Ver todas
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Histórico de Avisos</DialogTitle>
                <DialogDescription>
                  Todas as mensagens enviadas para você
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-2 pr-4">
                  {notificacoes.map((notif) => (
                    <NotificacaoItem key={notif.id} notificacao={notif} />
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notificacoesRecentes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma notificação ainda</p>
          </div>
        ) : (
          <div className="space-y-1 divide-y">
            {notificacoesRecentes.map((notif) => (
              <NotificacaoItem key={notif.id} notificacao={notif} compact />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};


