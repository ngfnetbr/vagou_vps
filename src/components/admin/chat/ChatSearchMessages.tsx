import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/utils/utils";

interface ChatSearchMessagesProps {
  onSearch: (term: string) => void;
  resultsCount: number;
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export function ChatSearchMessages({
  onSearch,
  resultsCount,
  currentIndex,
  onNext,
  onPrev,
  onClose,
}: ChatSearchMessagesProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleChange = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 border-b animate-in slide-in-from-top-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Buscar na conversa..."
          className="pl-9 h-8"
          autoFocus
        />
      </div>

      {resultsCount > 0 && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className="whitespace-nowrap">
            {currentIndex + 1} de {resultsCount}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrev}>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNext}>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      {searchTerm && resultsCount === 0 && (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          Nenhum resultado
        </span>
      )}

      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

