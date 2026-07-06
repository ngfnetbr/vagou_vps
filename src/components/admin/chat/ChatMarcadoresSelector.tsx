import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, Tag, X } from "lucide-react";
import { cn } from "@/utils/utils";
import {
  useChatMarcadores,
  useConversaMarcadores,
  useAddConversaMarcador,
  useRemoveConversaMarcador,
  type ChatMarcador,
} from "@/hooks/api/chat-config-hooks";

interface ChatMarcadoresSelectorProps {
  responsavelId: string;
  showLabels?: boolean;
}

export function ChatMarcadoresSelector({ responsavelId, showLabels = true }: ChatMarcadoresSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: marcadores = [] } = useChatMarcadores();
  const { data: conversaMarcadores = [] } = useConversaMarcadores(responsavelId);
  const { mutate: addMarcador, isPending: isAdding } = useAddConversaMarcador();
  const { mutate: removeMarcador, isPending: isRemoving } = useRemoveConversaMarcador();

  const selectedIds = conversaMarcadores.map((cm) => cm.marcador_id);

  const handleToggle = (marcador: ChatMarcador) => {
    if (selectedIds.includes(marcador.id)) {
      removeMarcador({ responsavelId, marcadorId: marcador.id });
    } else {
      addMarcador({ responsavelId, marcadorId: marcador.id });
    }
  };

  const handleRemove = (marcadorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeMarcador({ responsavelId, marcadorId });
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {showLabels && conversaMarcadores.map((cm) => (
        <Badge
          key={cm.id}
          variant="outline"
          className="text-xs px-1.5 py-0 h-5 gap-1 group"
          style={{
            backgroundColor: `${cm.marcador.cor}20`,
            borderColor: cm.marcador.cor,
            color: cm.marcador.cor,
          }}
        >
          {cm.marcador.nome}
          <X
            className="h-3 w-3 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
            onClick={(e) => handleRemove(cm.marcador_id, e)}
          />
        </Badge>
      ))}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={isAdding || isRemoving}
          >
            <Tag className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">
              Marcadores
            </p>
            {marcadores.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-2">
                Nenhum marcador disponível
              </p>
            ) : (
              marcadores.map((marcador) => {
                const isSelected = selectedIds.includes(marcador.id);
                return (
                  <button
                    key={marcador.id}
                    onClick={() => handleToggle(marcador)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                      "hover:bg-muted",
                      isSelected && "bg-muted"
                    )}
                    disabled={isAdding || isRemoving}
                  >
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: marcador.cor }}
                    />
                    <span className="flex-1 text-left truncate">{marcador.nome}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Componente apenas para exibir marcadores (sem edição)
export function ChatMarcadoresBadges({ responsavelId }: { responsavelId: string }) {
  const { data: conversaMarcadores = [] } = useConversaMarcadores(responsavelId);

  if (conversaMarcadores.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {conversaMarcadores.map((cm) => (
        <Badge
          key={cm.id}
          variant="outline"
          className="text-[10px] px-1 py-0 h-4"
          style={{
            backgroundColor: `${cm.marcador.cor}20`,
            borderColor: cm.marcador.cor,
            color: cm.marcador.cor,
          }}
        >
          {cm.marcador.nome}
        </Badge>
      ))}
    </div>
  );
}


