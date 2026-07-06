import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, Filter, X } from "lucide-react";
import { cn } from "@/utils/utils";
import { useChatMarcadores, type ChatMarcador } from "@/hooks/api/chat-config-hooks";

interface ChatMarcadorFilterProps {
  selectedMarcadores: string[];
  onFilterChange: (marcadorIds: string[]) => void;
}

export function ChatMarcadorFilter({ selectedMarcadores, onFilterChange }: ChatMarcadorFilterProps) {
  const [open, setOpen] = useState(false);
  const { data: marcadores = [] } = useChatMarcadores();

  const handleToggle = (marcadorId: string) => {
    if (selectedMarcadores.includes(marcadorId)) {
      onFilterChange(selectedMarcadores.filter((id) => id !== marcadorId));
    } else {
      onFilterChange([...selectedMarcadores, marcadorId]);
    }
  };

  const handleClear = () => {
    onFilterChange([]);
  };

  const selectedCount = selectedMarcadores.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={selectedCount > 0 ? "secondary" : "ghost"}
          size="sm"
          className="h-8 gap-1.5"
        >
          <Filter className="h-3.5 w-3.5" />
          {selectedCount > 0 && (
            <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs rounded-md">
              {selectedCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-medium text-muted-foreground">
              Filtrar por marcador
            </span>
            {selectedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleClear}
              >
                Limpar
              </Button>
            )}
          </div>
          {marcadores.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-2">
              Nenhum marcador disponível
            </p>
          ) : (
            marcadores.map((marcador) => {
              const isSelected = selectedMarcadores.includes(marcador.id);
              return (
                <button
                  key={marcador.id}
                  onClick={() => handleToggle(marcador.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                    "hover:bg-muted",
                    isSelected && "bg-muted"
                  )}
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
  );
}

