import { cn } from "@/utils/utils";
import { Clock, Check, CheckCheck, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatStatusIndicatorProps {
  status: string;
  erro?: string | null;
}

export function ChatStatusIndicator({ status, erro }: ChatStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "pendente":
        return {
          icon: Clock,
          className: "text-white/60",
          label: "Enviando...",
        };
      case "enviado":
        return {
          icon: Check,
          className: "text-white/70",
          label: "Enviado",
        };
      case "entregue":
        return {
          icon: CheckCheck,
          className: "text-white/70",
          label: "Entregue",
        };
      case "lido":
        return {
          icon: CheckCheck,
          className: "text-sky-300",
          label: "Lido",
        };
      case "erro":
        return {
          icon: AlertCircle,
          className: "text-red-400",
          label: erro ? `Erro: ${erro}` : "Erro ao enviar",
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex", config.className)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        {config.label}
      </TooltipContent>
    </Tooltip>
  );
}

