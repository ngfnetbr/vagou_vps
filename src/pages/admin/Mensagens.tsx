import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  MessageSquare, 
  Send, 
  Search, 
  User, 
  ArrowLeft,
  Mail,
  BarChart3,
  Volume2,
  VolumeX,
  Pin,
  Archive,
  ArrowDown,
  Bell,
  BellOff,
} from "lucide-react";
import { ChatQuickTemplates } from "@/components/admin/ChatQuickTemplates";
import { ChatMediaUpload } from "@/components/admin/ChatMediaUpload";
import { ChatRelatorioDialog } from "@/components/admin/ChatRelatorioDialog";
import { 
  ChatMessageBubble, 
  ChatDateSeparator,
  ChatConversaActions,
  ChatNewMessagesBadge,
  ChatSearchMessages,
  ChatEmojiPicker,
  ChatReplyPreview,
  ChatResponsavelDetails,
  ChatMarcadoresSelector,
  ChatConfigDialog,
  ChatMarcadorFilter,
} from "@/components/admin/chat";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/utils/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import {
  useChatConversas,
  useChatConversasArquivadas,
  useChatMensagens,
  useEnviarMensagem,
  useMarcarLida,
  useArquivarConversa,
  useFixarConversa,
  useExcluirConversa,
  useChatRealtime,
  useChatGlobalRealtime,
  type Conversa,
  type ChatMensagem,
} from "@/hooks/api/chat-hooks";
import { useConversaMarcadores, useAllConversaMarcadores } from "@/hooks/api/chat-config-hooks";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { Link } from "react-router-dom";

// Componente de lista de conversas
function ConversasList({
  conversas,
  isLoading,
  selectedId,
  onSelect,
  searchTerm,
  onSearchChange,
  onArchive,
  onUnarchive,
  onPin,
  onUnpin,
  onDelete,
  showArchived = false,
  marcadorFilter,
  onMarcadorFilterChange,
  enabled = true,
}: {
  conversas: Conversa[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (conversa: Conversa) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onDelete: (id: string) => void;
  showArchived?: boolean;
  marcadorFilter: string[];
  onMarcadorFilterChange: (ids: string[]) => void;
  enabled?: boolean;
}) {
  const { data: allConversaMarcadores = {} } = useAllConversaMarcadores(enabled);
  
  const filteredConversas = conversas.filter((c) => {
    // Filter by search term
    const matchesSearch = 
      c.responsavel_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.responsavel_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.crianca_nome?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by marcador
    const matchesMarcador = 
      marcadorFilter.length === 0 || // No filter = show all
      marcadorFilter.some((marcadorId) => 
        allConversaMarcadores[c.responsavel_id]?.includes(marcadorId)
      );
    
    return matchesSearch && matchesMarcador;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Ontem";
    return format(date, "dd/MM/yy");
  };

  const getMediaPreview = (conversa: Conversa) => {
    if (conversa.tipo_ultima === 'imagem') return '📷 Foto';
    if (conversa.tipo_ultima === 'documento') return '📎 Documento';
    if (conversa.tipo_ultima === 'audio') return '🎵 Áudio';
    return conversa.ultima_mensagem;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <ChatMarcadorFilter 
            selectedMarcadores={marcadorFilter} 
            onFilterChange={onMarcadorFilterChange} 
          />
          {marcadorFilter.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {filteredConversas.length} conversa(s)
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversas.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{showArchived ? "Nenhuma conversa arquivada" : "Nenhuma conversa encontrada"}</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversas.map((conversa) => (
              <div
                key={conversa.responsavel_id}
                className={cn(
                  "relative group w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors cursor-pointer",
                  selectedId === conversa.responsavel_id && "bg-muted"
                )}
                onClick={() => onSelect(conversa)}
              >
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {conversa.responsavel_nome?.[0]?.toUpperCase() || <User className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 overflow-hidden pr-8">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                      {conversa.fixada && (
                        <Pin className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-medium truncate block">
                        {conversa.responsavel_nome || conversa.responsavel_email || "Responsável"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatDate(conversa.ultima_data)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {conversa.ultima_direcao === 'admin' && (
                      <span className="text-muted-foreground/70">Você: </span>
                    )}
                    {conversa.crianca_nome && conversa.ultima_direcao === 'responsavel' && (
                      <span className="text-primary font-medium">{conversa.crianca_nome}: </span>
                    )}
                    {getMediaPreview(conversa)}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <ChatMarcadoresSelector responsavelId={conversa.responsavel_id} showLabels={false} />
                    {conversa.arquivada && (
                      <Archive className="h-3 w-3 text-muted-foreground" />
                    )}
                    {conversa.nao_lidas > 0 && (
                      <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs">
                        {conversa.nao_lidas}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <ChatConversaActions
                    responsavelId={conversa.responsavel_id}
                    isArchived={conversa.arquivada}
                    isPinned={conversa.fixada}
                    onArchive={onArchive}
                    onUnarchive={onUnarchive}
                    onPin={onPin}
                    onUnpin={onUnpin}
                    onDelete={onDelete}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// Componente de janela de chat
function ChatWindow({
  conversa,
  mensagens,
  isLoading,
  onSend,
  onSendMedia,
  isSending,
  onBack,
  onArchive,
  onUnarchive,
  onPin,
  onUnpin,
  onDelete,
}: {
  conversa: Conversa | null;
  mensagens: ChatMensagem[];
  isLoading: boolean;
  onSend: (mensagem: string, replyToId?: string) => void;
  onSendMedia: (url: string, tipo: 'imagem' | 'documento', nomeArquivo: string, replyToId?: string) => void;
  isSending: boolean;
  onBack?: () => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [replyTo, setReplyTo] = useState<ChatMensagem | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMessagesLength = useRef(mensagens.length);
  const isMobile = useIsMobile();

  // Create message map for quick reply lookup
  const messageMap = useMemo(() => {
    const map = new Map<string, ChatMensagem>();
    mensagens.forEach(msg => map.set(msg.id, msg));
    return map;
  }, [mensagens]);

  const handleTemplateSelect = (mensagem: string) => {
    setInputValue(mensagem);
    inputRef.current?.focus();
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleReply = useCallback((message: ChatMensagem) => {
    setReplyTo(message);
    inputRef.current?.focus();
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  const handleScrollToMessage = useCallback((messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-yellow-500/20', 'rounded-lg');
      setTimeout(() => {
        element.classList.remove('bg-yellow-500/20', 'rounded-lg');
      }, 2000);
    }
  }, []);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: Date; messages: ChatMensagem[] }[] = [];
    let currentGroup: { date: Date; messages: ChatMensagem[] } | null = null;

    mensagens.forEach((msg) => {
      const msgDate = new Date(msg.created_at);
      
      if (!currentGroup || !isSameDay(currentGroup.date, msgDate)) {
        currentGroup = { date: msgDate, messages: [] };
        groups.push(currentGroup);
      }
      currentGroup.messages.push(msg);
    });

    return groups;
  }, [mensagens]);

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAtBottom(atBottom);
    if (atBottom) setNewMessagesCount(0);
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setNewMessagesCount(0);
    }
  }, []);

  // Auto scroll on new messages
  useEffect(() => {
    if (mensagens.length > prevMessagesLength.current) {
      if (isAtBottom) {
        scrollToBottom();
      } else {
        setNewMessagesCount(prev => prev + (mensagens.length - prevMessagesLength.current));
      }
    }
    prevMessagesLength.current = mensagens.length;
  }, [mensagens.length, isAtBottom, scrollToBottom]);

  // Initial scroll
  useEffect(() => {
    scrollToBottom();
  }, [conversa?.responsavel_id, scrollToBottom]);

  // Search in messages
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    if (!term) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const results: number[] = [];
    mensagens.forEach((msg, index) => {
      if (msg.conteudo.toLowerCase().includes(term.toLowerCase())) {
        results.push(index);
      }
    });
    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? results.length - 1 : 0);
  }, [mensagens]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isSending) {
      onSend(inputValue.trim(), replyTo?.id);
      setInputValue("");
      setReplyTo(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === "Escape" && replyTo) {
      setReplyTo(null);
    }
  };

  if (!conversa) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/20">
        <div className="text-center p-4">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Selecione uma conversa</p>
          <p className="text-sm">Escolha um contato para iniciar o chat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b bg-card flex items-center gap-3">
        {isMobile && onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <ChatResponsavelDetails conversa={conversa}>
          <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarFallback className="bg-primary/10 text-primary">
              {conversa.responsavel_nome?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </ChatResponsavelDetails>
        <div className="flex-1 min-w-0">
          <ChatResponsavelDetails conversa={conversa}>
            <div className="cursor-pointer hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-2">
                {conversa.fixada && <Pin className="h-3 w-3 text-muted-foreground" />}
                <h3 className="font-medium truncate">
                  {conversa.responsavel_nome || conversa.responsavel_email || "Responsável"}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {conversa.responsavel_email && (
                  <>
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{conversa.responsavel_email}</span>
                  </>
                )}
                {conversa.crianca_nome && (
                  <>
                    <span>•</span>
                    <span className="text-primary">{conversa.crianca_nome}</span>
                  </>
                )}
              </div>
            </div>
          </ChatResponsavelDetails>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowSearch(!showSearch)}
              >
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Buscar na conversa</TooltipContent>
          </Tooltip>
          <ChatConversaActions
            responsavelId={conversa.responsavel_id}
            isArchived={conversa.arquivada}
            isPinned={conversa.fixada}
            onArchive={onArchive}
            onUnarchive={onUnarchive}
            onPin={onPin}
            onUnpin={onUnpin}
            onDelete={onDelete}
            variant="header"
          />
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <ChatSearchMessages
          onSearch={handleSearch}
          resultsCount={searchResults.length}
          currentIndex={currentSearchIndex}
          onNext={() => setCurrentSearchIndex(prev => Math.min(prev + 1, searchResults.length - 1))}
          onPrev={() => setCurrentSearchIndex(prev => Math.max(prev - 1, 0))}
          onClose={() => {
            setShowSearch(false);
            setSearchTerm("");
            setSearchResults([]);
          }}
        />
      )}

      {/* Messages */}
      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-0.5 bg-muted/20 relative"
      >
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                <Skeleton className="h-12 w-48 rounded-xl" />
              </div>
            ))}
          </div>
        ) : mensagens.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p>Nenhuma mensagem ainda</p>
          </div>
        ) : (
          groupedMessages.map((group, groupIndex) => (
            <div key={groupIndex}>
              <ChatDateSeparator date={group.date} />
              <div className="space-y-0.5">
                {group.messages.map((msg, msgIndex) => {
                  const prevMsg = msgIndex > 0 ? group.messages[msgIndex - 1] : null;
                  const isGroupStart = !prevMsg || prevMsg.direcao !== msg.direcao;
                  const isHighlighted = searchTerm && msg.conteudo.toLowerCase().includes(searchTerm.toLowerCase());
                  const replyToMessage = msg.reply_to_id ? messageMap.get(msg.reply_to_id) : null;

                  return (
                    <div 
                      key={msg.id}
                      className={cn(isHighlighted && "bg-yellow-500/20 rounded-lg -mx-2 px-2 py-1", "transition-colors")}
                    >
                      <ChatMessageBubble 
                        message={msg} 
                        isGroupStart={isGroupStart}
                        replyToMessage={replyToMessage}
                        onReply={handleReply}
                        onScrollToMessage={handleScrollToMessage}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* New messages badge */}
        <ChatNewMessagesBadge count={newMessagesCount} onClick={scrollToBottom} />
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <ChatReplyPreview message={replyTo} onCancel={handleCancelReply} />
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t bg-card">
        <div className="flex items-center gap-2">
          <ChatMediaUpload 
            onUpload={(url, tipo, nome) => {
              onSendMedia(url, tipo, nome, replyTo?.id);
              setReplyTo(null);
            }} 
            disabled={isSending} 
          />
          <ChatEmojiPicker onSelect={handleEmojiSelect} disabled={isSending} />
          <ChatQuickTemplates onSelect={handleTemplateSelect} />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={replyTo ? "Digite sua resposta..." : "Digite sua mensagem..."}
            disabled={isSending}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!inputValue.trim() || isSending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

// Página principal
export default function MensagensPage() {
  const [selectedConversa, setSelectedConversa] = useState<Conversa | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "archived">("all");
  const [marcadorFilter, setMarcadorFilter] = useState<string[]>([]);
  const isMobile = useIsMobile();
  const { soundEnabled, setSoundEnabled } = useNotificationPreferences();
  const { playSound } = useNotificationSound(0, soundEnabled);
  const { isEnabled: pushEnabled, isSupported: pushSupported, requestPermission, showNotification } = usePushNotifications();

  const { data: config, isLoading: loadingConfig } = useConfiguracoesSistema();
  const mensagensHabilitadas = !!config && config.habilitar_mensagens !== false;

  const { data: conversas = [], isLoading: loadingConversas } = useChatConversas(false, mensagensHabilitadas);
  const { data: conversasArquivadas = [], isLoading: loadingArquivadas } = useChatConversasArquivadas(mensagensHabilitadas);
  const { data: mensagens = [], isLoading: loadingMensagens } = useChatMensagens(
    selectedConversa?.responsavel_id || null,
    mensagensHabilitadas
  );
  const { mutate: enviarMensagem, isPending: enviando } = useEnviarMensagem();
  const { mutate: marcarLida } = useMarcarLida();
  const { mutate: arquivarConversa } = useArquivarConversa();
  const { mutate: fixarConversa } = useFixarConversa();
  const { mutate: excluirConversa } = useExcluirConversa();

  const handleNewMessage = useCallback((message?: { nome?: string; conteudo?: string }) => {
    if (soundEnabled) {
      playSound();
    }
    // Show push notification if enabled and window is not focused
    if (pushEnabled && document.hidden && message) {
      showNotification(message.nome || "Nova mensagem", {
        body: message.conteudo || "Você recebeu uma nova mensagem",
        tag: "chat-message",
      });
    }
  }, [playSound, soundEnabled, pushEnabled, showNotification]);

  useChatRealtime(selectedConversa?.responsavel_id || null, mensagensHabilitadas);
  useChatGlobalRealtime(handleNewMessage, mensagensHabilitadas);

  useEffect(() => {
    if (selectedConversa?.responsavel_id && selectedConversa.nao_lidas > 0) {
      marcarLida(selectedConversa.responsavel_id);
    }
  }, [selectedConversa, marcarLida]);

  const handleSend = (mensagem: string, replyToId?: string) => {
    if (!selectedConversa) return;

    enviarMensagem({
      responsavel_id: selectedConversa.responsavel_id,
      mensagem,
      crianca_id: selectedConversa.crianca_id || undefined,
      responsavel_nome: selectedConversa.responsavel_nome || undefined,
      reply_to_id: replyToId,
    });
  };

  const handleSendMedia = (url: string, tipo: 'imagem' | 'documento', nomeArquivo: string, replyToId?: string) => {
    if (!selectedConversa) return;

    enviarMensagem({
      responsavel_id: selectedConversa.responsavel_id,
      mensagem: tipo === 'imagem' ? '📷 Imagem enviada' : `📎 ${nomeArquivo}`,
      crianca_id: selectedConversa.crianca_id || undefined,
      responsavel_nome: selectedConversa.responsavel_nome || undefined,
      tipo,
      arquivo_url: url,
      reply_to_id: replyToId,
    });
  };

  const handleSelectConversa = (conversa: Conversa) => {
    setSelectedConversa(conversa);
  };

  const handleBack = () => {
    setSelectedConversa(null);
  };

  const handleArchive = (responsavelId: string) => {
    arquivarConversa({ responsavelId, arquivar: true });
    if (selectedConversa?.responsavel_id === responsavelId) {
      setSelectedConversa(null);
    }
  };

  const handleUnarchive = (responsavelId: string) => {
    arquivarConversa({ responsavelId, arquivar: false });
  };

  const handlePin = (responsavelId: string) => {
    fixarConversa({ responsavelId, fixar: true });
  };

  const handleUnpin = (responsavelId: string) => {
    fixarConversa({ responsavelId, fixar: false });
  };

  const handleDelete = (responsavelId: string) => {
    excluirConversa(responsavelId);
    if (selectedConversa?.responsavel_id === responsavelId) {
      setSelectedConversa(null);
    }
  };

  const displayedConversas = activeTab === "archived" ? conversasArquivadas : conversas;
  const isLoadingConversas = activeTab === "archived" ? loadingArquivadas : loadingConversas;

  // Layout mobile
  if (isMobile) {
    return (
      <AdminLayout>
        {loadingConfig ? (
          <div className="flex items-center justify-center h-[calc(100dvh-180px)] text-muted-foreground">
            Carregando configurações…
          </div>
        ) : !mensagensHabilitadas ? (
          <div className="p-4">
            <Card>
              <CardHeader>
                <CardTitle>Mensagens desabilitadas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Esta funcionalidade está desativada nas configurações gerais do sistema.
                </p>
                <Button asChild>
                  <Link to="/modulo/vagou/admin/configuracoes">Ir para Configurações</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col h-[calc(100dvh-180px)] min-h-0">
            <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border-0 shadow-none rounded-none -mx-3 -mt-3">
              {selectedConversa ? (
                <ChatWindow
                  conversa={selectedConversa}
                  mensagens={mensagens}
                  isLoading={loadingMensagens}
                  onSend={handleSend}
                  onSendMedia={handleSendMedia}
                  isSending={enviando}
                  onBack={handleBack}
                  onArchive={handleArchive}
                  onUnarchive={handleUnarchive}
                  onPin={handlePin}
                  onUnpin={handleUnpin}
                  onDelete={handleDelete}
                />
              ) : (
                <>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Mensagens
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <ChatConfigDialog />
                        <ChatRelatorioDialog>
                          <Button variant="ghost" size="icon" title="Relatório">
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        </ChatRelatorioDialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setSoundEnabled(!soundEnabled)}
                              className={cn(!soundEnabled && "text-muted-foreground")}
                            >
                              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {soundEnabled ? "Som ativado" : "Som desativado"}
                          </TooltipContent>
                        </Tooltip>
                        {pushSupported && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={requestPermission}
                                className={cn(!pushEnabled && "text-muted-foreground")}
                              >
                                {pushEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {pushEnabled ? "Notificações ativadas" : "Ativar notificações"}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "archived")} className="mt-2">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="all">Conversas</TabsTrigger>
                        <TabsTrigger value="archived" className="gap-1">
                          <Archive className="h-3 w-3" />
                          Arquivadas
                          {conversasArquivadas.length > 0 && (
                            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                              {conversasArquivadas.length}
                            </Badge>
                          )}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                    <ConversasList
                      conversas={displayedConversas}
                      isLoading={isLoadingConversas}
                      selectedId={null}
                      onSelect={handleSelectConversa}
                      searchTerm={searchTerm}
                      onSearchChange={setSearchTerm}
                      onArchive={handleArchive}
                      onUnarchive={handleUnarchive}
                      onPin={handlePin}
                      onUnpin={handleUnpin}
                      onDelete={handleDelete}
                      showArchived={activeTab === "archived"}
                      marcadorFilter={marcadorFilter}
                      onMarcadorFilterChange={setMarcadorFilter}
                      enabled={mensagensHabilitadas}
                    />
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        )}
      </AdminLayout>
    );
  }

  // Layout desktop
  return (
    <AdminLayout>
      {loadingConfig ? (
        <div className="flex items-center justify-center h-[calc(100dvh-140px)] text-muted-foreground">
          Carregando configurações…
        </div>
      ) : !mensagensHabilitadas ? (
        <div className="max-w-2xl mx-auto pt-10">
          <Card>
            <CardHeader>
              <CardTitle>Mensagens desabilitadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Esta funcionalidade está desativada nas configurações gerais do sistema.
              </p>
              <Button asChild>
                <Link to="/modulo/vagou/admin/configuracoes">Ir para Configurações</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100dvh-140px)] min-h-0">
          <Card className="flex-1 min-h-0 overflow-hidden border-0 md:border shadow-none md:shadow-sm">
            <div className="grid grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr] xl:grid-cols-[400px_1fr] h-full">
              <div className="flex flex-col min-h-0 border-r">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Mensagens
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <ChatConfigDialog />
                      <ChatRelatorioDialog>
                        <Button variant="ghost" size="icon" title="Relatório">
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </ChatRelatorioDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={cn(!soundEnabled && "text-muted-foreground")}
                          >
                            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {soundEnabled ? "Som ativado" : "Som desativado"}
                        </TooltipContent>
                      </Tooltip>
                      {pushSupported && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={requestPermission}
                              className={cn(!pushEnabled && "text-muted-foreground")}
                            >
                              {pushEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {pushEnabled ? "Notificações ativadas" : "Ativar notificações"}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "archived")} className="mt-2">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="all">Conversas</TabsTrigger>
                      <TabsTrigger value="archived" className="gap-1">
                        <Archive className="h-3 w-3" />
                        Arquivadas
                        {conversasArquivadas.length > 0 && (
                          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                            {conversasArquivadas.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <div className="flex-1 overflow-hidden">
                  <ConversasList
                    conversas={displayedConversas}
                    isLoading={isLoadingConversas}
                    selectedId={selectedConversa?.responsavel_id || null}
                    onSelect={handleSelectConversa}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onArchive={handleArchive}
                    onUnarchive={handleUnarchive}
                    onPin={handlePin}
                    onUnpin={handleUnpin}
                    onDelete={handleDelete}
                    showArchived={activeTab === "archived"}
                    marcadorFilter={marcadorFilter}
                    onMarcadorFilterChange={setMarcadorFilter}
                    enabled={mensagensHabilitadas}
                  />
                </div>
              </div>

              <div className="flex flex-col min-h-0 overflow-hidden">
                <ChatWindow
                  conversa={selectedConversa}
                  mensagens={mensagens}
                  isLoading={loadingMensagens}
                  onSend={handleSend}
                  onSendMedia={handleSendMedia}
                  isSending={enviando}
                  onArchive={handleArchive}
                  onUnarchive={handleUnarchive}
                  onPin={handlePin}
                  onUnpin={handleUnpin}
                  onDelete={handleDelete}
                />
              </div>
            </div>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}


