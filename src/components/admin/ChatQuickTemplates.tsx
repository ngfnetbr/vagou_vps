import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquareText, Search, Zap, Copy, Check } from "lucide-react";
import { cn } from "@/utils/utils";
import { useChatRespostasRapidas, type ChatRespostaRapida } from "@/hooks/api/chat-config-hooks";
import { toast } from "sonner";

interface ChatQuickTemplatesProps {
  onSelect: (mensagem: string) => void;
}

export function ChatQuickTemplates({ onSelect }: ChatQuickTemplatesProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { data: respostas = [], isLoading } = useChatRespostasRapidas();

  // Agrupar por categoria
  const categorias = useMemo(() => {
    return respostas.reduce((acc, resposta) => {
      const cat = resposta.categoria || "Geral";
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(resposta);
      return acc;
    }, {} as Record<string, ChatRespostaRapida[]>);
  }, [respostas]);

  // Filtrar por busca
  const filteredRespostas = useMemo(() => {
    if (!search.trim()) return respostas;
    const searchLower = search.toLowerCase();
    return respostas.filter(
      (r) =>
        r.titulo.toLowerCase().includes(searchLower) ||
        r.mensagem.toLowerCase().includes(searchLower) ||
        r.atalho?.toLowerCase().includes(searchLower)
    );
  }, [respostas, search]);

  // Categorias filtradas
  const filteredCategorias = useMemo(() => {
    return filteredRespostas.reduce((acc, resposta) => {
      const cat = resposta.categoria || "Geral";
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(resposta);
      return acc;
    }, {} as Record<string, ChatRespostaRapida[]>);
  }, [filteredRespostas]);

  const handleSelect = (mensagem: string) => {
    onSelect(mensagem);
    setOpen(false);
    setSearch("");
  };

  const handleCopy = (resposta: ChatRespostaRapida, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(resposta.mensagem);
    setCopiedId(resposta.id);
    toast.success("Copiado para a área de transferência");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const allCategories = Object.keys(categorias);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Respostas rápidas">
          <MessageSquareText className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg h-[80vh] max-h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Respostas Rápidas
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 pt-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, mensagem ou atalho..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : respostas.length === 0 ? (
            <div className="h-full flex items-center justify-center p-8 text-center">
              <div>
                <MessageSquareText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Nenhuma resposta rápida cadastrada.
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Configure no ícone de engrenagem (⚙️) do chat.
                </p>
              </div>
            </div>
          ) : search.trim() ? (
            // Search results view
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {filteredRespostas.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhum resultado para "{search}"
                  </div>
                ) : (
                  filteredRespostas.map((resposta) => (
                    <TemplateCard
                      key={resposta.id}
                      resposta={resposta}
                      onSelect={handleSelect}
                      onCopy={handleCopy}
                      isCopied={copiedId === resposta.id}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          ) : (
            // Category tabs view
            <Tabs defaultValue={allCategories[0] || "Geral"} className="h-full flex flex-col">
              <div className="px-4 shrink-0">
                <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
                  {allCategories.map((cat) => (
                    <TabsTrigger
                      key={cat}
                      value={cat}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1 text-xs"
                    >
                      {cat}
                      <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                        {categorias[cat].length}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {allCategories.map((cat) => (
                <TabsContent key={cat} value={cat} className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
                  <ScrollArea className="h-full">
                    <div className="px-4 pb-4 space-y-2">
                      {categorias[cat].map((resposta) => (
                        <TemplateCard
                          key={resposta.id}
                          resposta={resposta}
                          onSelect={handleSelect}
                          onCopy={handleCopy}
                          isCopied={copiedId === resposta.id}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Card de template
function TemplateCard({
  resposta,
  onSelect,
  onCopy,
  isCopied,
}: {
  resposta: ChatRespostaRapida;
  onSelect: (mensagem: string) => void;
  onCopy: (resposta: ChatRespostaRapida, e: React.MouseEvent) => void;
  isCopied: boolean;
}) {
  return (
    <div
      onClick={() => onSelect(resposta.mensagem)}
      className={cn(
        "group relative p-3 rounded-lg border bg-card cursor-pointer transition-all",
        "hover:border-primary/50 hover:shadow-sm hover:bg-accent/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-medium text-sm">{resposta.titulo}</span>
            {resposta.atalho && (
              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-5">
                {resposta.atalho}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {resposta.mensagem}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => onCopy(resposta, e)}
        >
          {isCopied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}


