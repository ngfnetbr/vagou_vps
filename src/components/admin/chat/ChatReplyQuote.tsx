import { cn } from "@/utils/utils";
import type { ChatMensagem } from "@/hooks/api/chat-hooks";

interface ChatReplyQuoteProps {
  message: ChatMensagem;
  isOutgoing: boolean;
  onClick?: () => void;
}

export function ChatReplyQuote({ message, isOutgoing, onClick }: ChatReplyQuoteProps) {
  const isReplyOutgoing = message.direcao === "admin";
  
  const getContentPreview = () => {
    if (message.tipo === 'imagem') return '📷 Foto';
    if (message.tipo === 'documento') return '📎 Documento';
    if (message.tipo === 'audio') return '🎵 Áudio';
    return message.conteudo.length > 60 
      ? message.conteudo.substring(0, 60) + '...' 
      : message.conteudo;
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "mb-1.5 px-2 py-1.5 rounded cursor-pointer transition-colors border-l-2",
        isOutgoing 
          ? "bg-primary-foreground/10 hover:bg-primary-foreground/20 border-primary-foreground/50" 
          : "bg-muted/80 hover:bg-muted border-primary/50"
      )}
    >
      <p className={cn(
        "text-[11px] font-medium mb-0.5",
        isOutgoing ? "text-primary-foreground/80" : "text-primary"
      )}>
        {isReplyOutgoing ? "Você" : (message.responsavel_nome || "Responsável")}
      </p>
      <p className={cn(
        "text-xs line-clamp-2",
        isOutgoing ? "text-primary-foreground/60" : "text-muted-foreground"
      )}>
        {getContentPreview()}
      </p>
    </div>
  );
}


