import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatNewMessagesBadgeProps {
  count: number;
  onClick: () => void;
}

export function ChatNewMessagesBadge({ count, onClick }: ChatNewMessagesBadgeProps) {
  if (count === 0) return null;

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onClick}
      className="absolute bottom-20 left-1/2 -translate-x-1/2 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 z-10 gap-1"
    >
      <ChevronDown className="h-4 w-4" />
      {count} {count === 1 ? "nova mensagem" : "novas mensagens"}
    </Button>
  );
}
