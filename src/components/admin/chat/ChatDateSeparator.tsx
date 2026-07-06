import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChatDateSeparatorProps {
  date: Date;
}

export function ChatDateSeparator({ date }: ChatDateSeparatorProps) {
  const getDateLabel = () => {
    if (isToday(date)) return "Hoje";
    if (isYesterday(date)) return "Ontem";
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  return (
    <div className="flex items-center justify-center my-3">
      <div className="bg-background/80 backdrop-blur-sm text-muted-foreground text-[11px] px-3 py-1 rounded-full shadow-sm border border-border/30">
        {getDateLabel()}
      </div>
    </div>
  );
}
