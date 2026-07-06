import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Settings, Plus, Pencil, Trash2, Tag, MessageSquareText, ChevronDown, X } from "lucide-react";
import { cn } from "@/utils/utils";
import {
  useChatMarcadoresAdmin,
  useCreateMarcador,
  useUpdateMarcador,
  useDeleteMarcador,
  useChatRespostasRapidasAdmin,
  useCreateRespostaRapida,
  useUpdateRespostaRapida,
  useDeleteRespostaRapida,
  type ChatMarcador,
  type ChatRespostaRapida,
} from "@/hooks/api/chat-config-hooks";

interface ChatConfigDialogProps {
  children?: React.ReactNode;
}

export function ChatConfigDialog({ children }: ChatConfigDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[85vh] max-h-[700px] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Chat
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="marcadores" className="flex-1 min-h-0 flex flex-col px-6 pb-6">
          <TabsList className="grid w-full grid-cols-2 shrink-0">
            <TabsTrigger value="marcadores" className="gap-2">
              <Tag className="h-4 w-4" />
              Marcadores
            </TabsTrigger>
            <TabsTrigger value="respostas" className="gap-2">
              <MessageSquareText className="h-4 w-4" />
              Respostas Rápidas
            </TabsTrigger>
          </TabsList>
          <TabsContent value="marcadores" className="flex-1 min-h-0 mt-4 data-[state=inactive]:hidden">
            <MarcadoresTab />
          </TabsContent>
          <TabsContent value="respostas" className="flex-1 min-h-0 mt-4 data-[state=inactive]:hidden">
            <RespostasRapidasTab />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Tab de Marcadores
function MarcadoresTab() {
  const { data: marcadores = [], isLoading } = useChatMarcadoresAdmin();
  const { mutate: createMarcador, isPending: isCreating } = useCreateMarcador();
  const { mutate: updateMarcador, isPending: isUpdating } = useUpdateMarcador();
  const { mutate: deleteMarcador, isPending: isDeleting } = useDeleteMarcador();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    cor: "#3b82f6",
    descricao: "",
    ativo: true,
    ordem: 0,
  });

  const resetForm = () => {
    setFormData({ nome: "", cor: "#3b82f6", descricao: "", ativo: true, ordem: 0 });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (marcador: ChatMarcador) => {
    setEditingId(marcador.id);
    setFormData({
      nome: marcador.nome,
      cor: marcador.cor,
      descricao: marcador.descricao || "",
      ativo: marcador.ativo,
      ordem: marcador.ordem,
    });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formData.nome.trim()) return;

    if (editingId) {
      updateMarcador({ id: editingId, ...formData }, { onSuccess: resetForm });
    } else {
      createMarcador(formData, { onSuccess: resetForm });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Deseja excluir este marcador?")) {
      deleteMarcador(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Collapsible Form */}
      <Collapsible open={isFormOpen} onOpenChange={setIsFormOpen} className="shrink-0">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              {editingId ? "Editando marcador" : "Novo marcador"}
              <ChevronDown className={cn("h-4 w-4 transition-transform", isFormOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          {isFormOpen && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CollapsibleContent className="mt-3">
          <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Urgente"
                />
              </div>
              <div className="space-y-1">
                <Label>Cor</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descrição (opcional)</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do marcador"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
                <Label>Ativo</Label>
              </div>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!formData.nome.trim() || isCreating || isUpdating}
              >
                {editingId ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 pr-4">
          {marcadores.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum marcador cadastrado
            </p>
          ) : (
            marcadores.map((marcador) => (
              <div
                key={marcador.id}
                className={cn(
                  "flex items-center gap-3 p-3 border rounded-lg",
                  !marcador.ativo && "opacity-50"
                )}
              >
                <div
                  className="h-4 w-4 rounded-full shrink-0"
                  style={{ backgroundColor: marcador.cor }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{marcador.nome}</span>
                    {!marcador.ativo && (
                      <Badge variant="secondary" className="text-xs">Inativo</Badge>
                    )}
                  </div>
                  {marcador.descricao && (
                    <p className="text-xs text-muted-foreground truncate">
                      {marcador.descricao}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(marcador)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(marcador.id)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Tab de Respostas Rápidas
function RespostasRapidasTab() {
  const { data: respostas = [], isLoading } = useChatRespostasRapidasAdmin();
  const { mutate: createResposta, isPending: isCreating } = useCreateRespostaRapida();
  const { mutate: updateResposta, isPending: isUpdating } = useUpdateRespostaRapida();
  const { mutate: deleteResposta, isPending: isDeleting } = useDeleteRespostaRapida();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    titulo: "",
    mensagem: "",
    atalho: "",
    categoria: "",
    ativo: true,
    ordem: 0,
  });

  const resetForm = () => {
    setFormData({ titulo: "", mensagem: "", atalho: "", categoria: "", ativo: true, ordem: 0 });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (resposta: ChatRespostaRapida) => {
    setEditingId(resposta.id);
    setFormData({
      titulo: resposta.titulo,
      mensagem: resposta.mensagem,
      atalho: resposta.atalho || "",
      categoria: resposta.categoria || "",
      ativo: resposta.ativo,
      ordem: resposta.ordem,
    });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formData.titulo.trim() || !formData.mensagem.trim()) return;

    if (editingId) {
      updateResposta({ id: editingId, ...formData }, { onSuccess: resetForm });
    } else {
      createResposta(formData, { onSuccess: resetForm });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Deseja excluir esta resposta rápida?")) {
      deleteResposta(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Collapsible Form */}
      <Collapsible open={isFormOpen} onOpenChange={setIsFormOpen} className="shrink-0">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              {editingId ? "Editando resposta" : "Nova resposta"}
              <ChevronDown className={cn("h-4 w-4 transition-transform", isFormOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          {isFormOpen && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CollapsibleContent className="mt-3">
          <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Título</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Boas-vindas"
                />
              </div>
              <div className="space-y-1">
                <Label>Atalho (opcional)</Label>
                <Input
                  value={formData.atalho}
                  onChange={(e) => setFormData({ ...formData, atalho: e.target.value })}
                  placeholder="Ex: /ola"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Mensagem</Label>
              <Textarea
                value={formData.mensagem}
                onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                placeholder="Digite a mensagem..."
                rows={2}
              />
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[150px] space-y-1">
                <Label>Categoria (opcional)</Label>
                <Input
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  placeholder="Ex: Saudações"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
                <Label>Ativo</Label>
              </div>
              <Button
                size="sm"
                className="mt-auto"
                onClick={handleSave}
                disabled={!formData.titulo.trim() || !formData.mensagem.trim() || isCreating || isUpdating}
              >
                {editingId ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 pr-4">
          {respostas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma resposta rápida cadastrada
            </p>
          ) : (
            respostas.map((resposta) => (
              <div
                key={resposta.id}
                className={cn(
                  "p-3 border rounded-lg",
                  !resposta.ativo && "opacity-50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{resposta.titulo}</span>
                      {resposta.atalho && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {resposta.atalho}
                        </Badge>
                      )}
                      {resposta.categoria && (
                        <Badge variant="secondary" className="text-xs">
                          {resposta.categoria}
                        </Badge>
                      )}
                      {!resposta.ativo && (
                        <Badge variant="secondary" className="text-xs">Inativo</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {resposta.mensagem}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(resposta)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(resposta.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

