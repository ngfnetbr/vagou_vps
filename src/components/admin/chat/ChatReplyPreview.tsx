import { X, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMensagem } from "@/hooks/api/chat-hooks";

interface ChatReplyPreviewProps {
  message: ChatMensagem;
  onCancel: () => void;
}

export function ChatReplyPreview({ message, onCancel }: ChatReplyPreviewProps) {
  const isOutgoing = message.direcao === "admin";
  const getContentPreview = () => {
    if (message.tipo === 'imagem') return '📷 Foto';
    if (message.tipo === 'documento') return '📎 Documento';
    if (message.tipo === 'audio') return '🎵 Áudio';
    return message.conteudo.length > 80 
      ? message.conteudo.substring(0, 80) + '...' 
      : message.conteudo;
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-t animate-in slide-in-from-bottom-1 duration-150">
      <Reply className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
        <p className="text-xs font-medium text-primary">
          {isOutgoing ? "Você" : (message.responsavel_nome || "Responsável")}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {getContentPreview()}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={onCancel}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

