import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Send,
  ArrowDown,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/utils/utils";
import {
  useMinhasMensagens,
  useEnviarMensagemResponsavel,
  useMarcarLidaResponsavel,
  useMinhasMensagensRealtime,
  type ChatMensagem,
} from "@/hooks/api/chat-hooks";
import { ChatMessageBubble } from "@/components/admin/chat/ChatMessageBubble";
import { ChatDateSeparator } from "@/components/admin/chat/ChatDateSeparator";
import { ChatReplyPreview } from "@/components/admin/chat/ChatReplyPreview";
import { ChatEmojiPicker } from "@/components/admin/chat/ChatEmojiPicker";
import { ChatMediaUpload } from "@/components/admin/ChatMediaUpload";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { toast } from "sonner";
import ResponsavelLayout from "@/components/responsavel/ResponsavelLayout";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { Link } from "react-router-dom";

export default function MensagensResponsavel() {
  const [mensagem, setMensagem] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMensagem | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMensagensCountRef = useRef(0);
  
  const { data: config, isLoading: loadingConfig } = useConfiguracoesPublicas();
  const mensagensHabilitadas = !!config && config.habilitar_mensagens !== false;

  const { data: mensagens = [], isLoading } = useMinhasMensagens(mensagensHabilitadas);
  const enviarMensagem = useEnviarMensagemResponsavel();
  const marcarLida = useMarcarLidaResponsavel();
  const { playSound } = useNotificationSound(0, true);
  
  // Realtime updates
  useMinhasMensagensRealtime(mensagensHabilitadas);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (!mensagensHabilitadas) return;
    if (mensagens.length > prevMensagensCountRef.current) {
      const lastMessage = mensagens[mensagens.length - 1];
      if (lastMessage?.direcao === 'admin') {
        playSound();
      }
      scrollToBottom();
    }
    prevMensagensCountRef.current = mensagens.length;
  }, [mensagensHabilitadas, mensagens, playSound]);
  
  // Mark messages as read when viewing
  useEffect(() => {
    if (!mensagensHabilitadas) return;
    const unreadCount = mensagens.filter(m => m.direcao === 'admin' && !m.lida_em).length;
    if (unreadCount > 0) {
      marcarLida.mutate();
    }
  }, [mensagensHabilitadas, mensagens, marcarLida]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };
  
  const handleSendMessage = async () => {
    if (!mensagem.trim()) return;
    
    try {
      await enviarMensagem.mutateAsync({
        mensagem: mensagem.trim(),
        reply_to_id: replyTo?.id,
      });
      
      setMensagem("");
      setReplyTo(null);
      scrollToBottom();
    } catch (error: unknown) {
      console.error('Erro ao enviar:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };
  
  const handleSendMedia = async (url: string, tipo: 'imagem' | 'documento', nomeArquivo: string) => {
    try {
      await enviarMensagem.mutateAsync({
        mensagem: tipo === 'imagem' ? '📷 Imagem' : `📎 ${nomeArquivo}`,
        tipo,
        arquivo_url: url,
        reply_to_id: replyTo?.id,
      });
      
      setReplyTo(null);
      scrollToBottom();
    } catch (error: unknown) {
      console.error('Erro ao enviar:', error);
      toast.error('Erro ao enviar arquivo');
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleEmojiSelect = (emoji: string) => {
    setMensagem(prev => prev + emoji);
    inputRef.current?.focus();
  };
  
  const handleReply = (msg: ChatMensagem) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  };
  
  const handleScrollToMessage = (messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-primary/10');
      setTimeout(() => element.classList.remove('bg-primary/10'), 2000);
    }
  };
  
  // Group messages by date
  const groupedMessages = mensagens.reduce((groups, msg) => {
    const date = format(new Date(msg.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(msg);
    return groups;
  }, {} as Record<string, ChatMensagem[]>);
  
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  // Adapt message direction for display (responsavel's messages appear on the right)
  const getAdaptedMessage = (msg: ChatMensagem): ChatMensagem => ({
    ...msg,
    direcao: msg.direcao === 'responsavel' ? 'admin' : 'responsavel',
  });
  
  return (
    <ResponsavelLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Mensagens</h1>
          <p className="text-sm text-muted-foreground">
            Converse com a secretaria sobre suas inscrições
          </p>
        </div>

        {loadingConfig ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Carregando configurações…
            </CardContent>
          </Card>
        ) : !mensagensHabilitadas ? (
          <Card>
            <CardHeader>
              <CardTitle>Mensagens indisponíveis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                O chat foi desabilitado nas configurações gerais do sistema.
              </p>
              <Button asChild variant="outline">
                <Link to="/modulo/vagou/publico/contato">Entrar em contato</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex flex-col h-[calc(100vh-14rem)] md:h-[calc(100vh-16rem)]">
            <CardHeader className="shrink-0 border-b py-3 md:py-4">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
                Chat com a Secretaria
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0 min-h-0 relative">
              <ScrollArea 
                ref={scrollAreaRef}
                className="flex-1 px-3 md:px-4"
                onScrollCapture={handleScroll}
              >
                {isLoading ? (
                  <div className="space-y-4 py-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                        <Skeleton className="h-16 w-48 md:w-64 rounded-2xl" />
                      </div>
                    ))}
                  </div>
                ) : mensagens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <MessageSquare className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="font-medium text-base md:text-lg">Nenhuma mensagem</h3>
                    <p className="text-xs md:text-sm text-muted-foreground max-w-xs mt-1">
                      Envie uma mensagem para iniciar uma conversa com a secretaria
                    </p>
                  </div>
                ) : (
                  <div className="py-4 space-y-1">
                    {Object.entries(groupedMessages).map(([date, msgs]) => (
                      <div key={date}>
                        <ChatDateSeparator date={new Date(date)} />
                        {msgs.map((msg, idx) => {
                          const isGroupStart = idx === 0 || msgs[idx - 1].direcao !== msg.direcao;
                          const replyToMessage = msg.reply_to_id 
                            ? mensagens.find(m => m.id === msg.reply_to_id) 
                            : null;
                          
                          return (
                            <ChatMessageBubble
                              key={msg.id}
                              message={getAdaptedMessage(msg)}
                              isGroupStart={isGroupStart}
                              replyToMessage={replyToMessage ? getAdaptedMessage(replyToMessage) : null}
                              onReply={() => handleReply(msg)}
                              onScrollToMessage={handleScrollToMessage}
                            />
                          );
                        })}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
              
              {showScrollButton && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-20 md:bottom-24 right-4 md:right-8 rounded-full shadow-lg z-10"
                  onClick={scrollToBottom}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              )}
              
              {replyTo && (
                <ChatReplyPreview
                  message={getAdaptedMessage(replyTo)}
                  onCancel={() => setReplyTo(null)}
                />
              )}
              
              <div className="shrink-0 p-3 md:p-4 border-t bg-background">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <ChatEmojiPicker onSelect={handleEmojiSelect} />
                  
                  <ChatMediaUpload onUpload={handleSendMedia} />
                  
                  <Input
                    ref={inputRef}
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 text-sm md:text-base"
                    disabled={enviarMensagem.isPending}
                  />
                  
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!mensagem.trim() || enviarMensagem.isPending}
                    className="h-9 w-9 shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ResponsavelLayout>
  );
}


