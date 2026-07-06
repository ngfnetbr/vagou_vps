import { cn } from "@/utils/utils";
import { Button } from "@/components/ui/button";
import { ChatMediaPreview } from "../ChatMediaPreview";
import { ChatReplyQuote } from "./ChatReplyQuote";
import { format } from "date-fns";
import { Reply } from "lucide-react";
import type { ChatMensagem } from "@/hooks/api/chat-hooks";

interface ChatMessageBubbleProps {
  message: ChatMensagem;
  isGroupStart?: boolean;
  replyToMessage?: ChatMensagem | null;
  onReply?: (message: ChatMensagem) => void;
  onScrollToMessage?: (messageId: string) => void;
}

export function ChatMessageBubble({ 
  message, 
  isGroupStart = true,
  replyToMessage,
  onReply,
  onScrollToMessage,
}: ChatMessageBubbleProps) {
  const isOutgoing = message.direcao === "admin";
  const formatMessageDate = (dateStr: string) => format(new Date(dateStr), "HH:mm");

  return (
    <div
      id={`msg-${message.id}`}
      className={cn(
        "flex animate-in fade-in-0 slide-in-from-bottom-1 duration-200 group/msg px-2 py-0.5",
        isOutgoing ? "justify-end" : "justify-start"
      )}
    >
      {/* Reply button - left side for outgoing */}
      {isOutgoing && onReply && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover/msg:opacity-100 transition-opacity self-center mr-1 shrink-0 rounded-full hover:bg-muted"
          onClick={() => onReply(message)}
        >
          <Reply className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      )}

      <div className="relative max-w-[calc(100%-40px)] sm:max-w-[80%] md:max-w-[70%] lg:max-w-[60%] min-w-0">
        {/* Message bubble */}
        <div
          className={cn(
            "relative rounded-2xl px-3.5 py-2.5 transition-all",
            isOutgoing
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-card text-card-foreground border border-border shadow-sm",
            // Rounded corner adjustments for message tail effect
            isGroupStart && isOutgoing && "rounded-br-md",
            isGroupStart && !isOutgoing && "rounded-bl-md",
            // Hover effect
            "hover:shadow-lg"
          )}
        >
          {/* Reply Quote */}
          {replyToMessage && (
            <ChatReplyQuote 
              message={replyToMessage} 
              isOutgoing={isOutgoing}
              onClick={() => onScrollToMessage?.(replyToMessage.id)}
            />
          )}

          {/* Media Preview */}
          {message.arquivo_url && (message.tipo === 'imagem' || message.tipo === 'documento') && (
            <div className="mb-2">
              <ChatMediaPreview
                tipo={message.tipo}
                url={message.arquivo_url}
                isOutgoing={isOutgoing}
              />
            </div>
          )}

          {/* Text Content */}
          {message.conteudo && (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed overflow-hidden">
              {message.conteudo}
            </p>
          )}

          {/* Footer with time */}
          <div
            className={cn(
              "flex items-center justify-end gap-1.5 mt-1 text-[10px]",
              isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            <span className="font-medium">{formatMessageDate(message.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Reply button - right side for incoming */}
      {!isOutgoing && onReply && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover/msg:opacity-100 transition-opacity self-center ml-1 shrink-0 rounded-full hover:bg-muted"
          onClick={() => onReply(message)}
        >
          <Reply className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}


