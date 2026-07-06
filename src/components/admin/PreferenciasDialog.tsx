import { useState, useEffect } from "react";
import { useUserPreferences, useUpdateUserPreferences, usePreferenciasEfetivas, TEMAS, DENSIDADES, getColunasFilaLabels } from "@/hooks/api/user-preferences-hooks";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Palette, Table, Bell, RotateCcw } from "lucide-react";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

interface PreferenciasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PreferenciasDialog = ({ open, onOpenChange }: PreferenciasDialogProps) => {
  const { data: userPrefs, isLoading } = useUserPreferences();
  const { preferencias, permitirTrocaTema } = usePreferenciasEfetivas();
  const { data: config } = useConfiguracoesSistema();
  const { singular } = getUnidadeLabels(config as any);
  const colunasFilaLabels = getColunasFilaLabels(singular);
  const updateMutation = useUpdateUserPreferences();

  const [formData, setFormData] = useState({
    tema: "system",
    densidade_tabela: "normal",
    itens_por_pagina: 25,
    notificacoes_som: true,
    notificacoes_toast: true,
    sidebar_collapsed: false,
    colunas_personalizadas: [] as string[],
  });

  useEffect(() => {
    if (userPrefs) {
      setFormData({
        tema: userPrefs.tema || "system",
        densidade_tabela: userPrefs.densidade_tabela || "normal",
        itens_por_pagina: userPrefs.itens_por_pagina || 25,
        notificacoes_som: userPrefs.notificacoes_som ?? true,
        notificacoes_toast: userPrefs.notificacoes_toast ?? true,
        sidebar_collapsed: userPrefs.sidebar_collapsed ?? false,
        colunas_personalizadas: userPrefs.colunas_personalizadas || [],
      });
    } else {
      setFormData({
        tema: preferencias.tema,
        densidade_tabela: preferencias.densidade_tabela,
        itens_por_pagina: preferencias.itens_por_pagina,
        notificacoes_som: true,
        notificacoes_toast: true,
        sidebar_collapsed: false,
        colunas_personalizadas: preferencias.colunas_fila,
      });
    }
  }, [userPrefs, preferencias]);

  const handleSave = async () => {
    await updateMutation.mutateAsync(formData);
    onOpenChange(false);
  };

  const handleReset = () => {
    setFormData({
      tema: "system",
      densidade_tabela: "normal",
      itens_por_pagina: 25,
      notificacoes_som: true,
      notificacoes_toast: true,
      sidebar_collapsed: false,
      colunas_personalizadas: [],
    });
  };

  const toggleColuna = (coluna: string) => {
    setFormData(prev => ({
      ...prev,
      colunas_personalizadas: prev.colunas_personalizadas.includes(coluna)
        ? prev.colunas_personalizadas.filter(c => c !== coluna)
        : [...prev.colunas_personalizadas, coluna],
    }));
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <Skeleton className="h-64 w-full" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Preferências
          </DialogTitle>
          <DialogDescription>
            Personalize sua experiência no sistema
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="aparencia" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="aparencia" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Aparência
            </TabsTrigger>
            <TabsTrigger value="tabelas" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              Tabelas
            </TabsTrigger>
            <TabsTrigger value="notificacoes" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="aparencia" className="space-y-4 mt-4">
            {permitirTrocaTema && (
              <div className="space-y-2">
                <Label>Tema</Label>
                <Select
                  value={formData.tema}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, tema: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMAS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>Menu lateral recolhido por padrão</Label>
              <Switch
                checked={formData.sidebar_collapsed}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, sidebar_collapsed: v }))}
              />
            </div>
          </TabsContent>

          <TabsContent value="tabelas" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Densidade da tabela</Label>
              <Select
                value={formData.densidade_tabela}
                onValueChange={(v) => setFormData(prev => ({ ...prev, densidade_tabela: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DENSIDADES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Itens por página</Label>
              <Select
                value={String(formData.itens_por_pagina)}
                onValueChange={(v) => setFormData(prev => ({ ...prev, itens_por_pagina: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} itens</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Colunas visíveis na fila</Label>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
                {Object.entries(colunasFilaLabels).map(([value, label]) => (
                  <div key={value} className="flex items-center gap-2">
                    <Checkbox
                      id={`col-${value}`}
                      checked={formData.colunas_personalizadas.length === 0 || formData.colunas_personalizadas.includes(value)}
                      onCheckedChange={() => toggleColuna(value)}
                    />
                    <Label htmlFor={`col-${value}`} className="text-sm font-normal">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notificacoes" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Som de notificações</Label>
                <p className="text-sm text-muted-foreground">
                  Tocar som ao receber novas mensagens
                </p>
              </div>
              <Switch
                checked={formData.notificacoes_som}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, notificacoes_som: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Notificações toast</Label>
                <p className="text-sm text-muted-foreground">
                  Exibir notificações no canto da tela
                </p>
              </div>
              <Switch
                checked={formData.notificacoes_toast}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, notificacoes_toast: v }))}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <Button variant="ghost" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Restaurar padrões
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreferenciasDialog;

