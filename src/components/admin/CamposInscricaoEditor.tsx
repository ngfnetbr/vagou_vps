import { useState } from "react";
import { useCamposInscricaoAdmin, useCreateCampoInscricao, useUpdateCampoInscricao, useDeleteCampoInscricao, useReordenarCampos, SECOES_FORMULARIO, TIPOS_CAMPO, CampoInscricao, SecaoFormulario } from "@/hooks/api/campos-inscricao-hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit, Plus, Trash2, FormInput, Lock, Eye, EyeOff, List, ChevronUp, ChevronDown, MonitorPlay, Save, X, History } from "lucide-react";
import { toast } from "sonner";
import { CamposInscricaoPreview } from "./CamposInscricaoPreview";
import { CamposInscricaoHistoricoDialog } from "./CamposInscricaoHistoricoDialog";
import { cn } from "@/utils/utils";

interface SelectOption {
  value: string;
  label: string;
}

export const CamposInscricaoEditor = () => {
  const { data: campos, isLoading } = useCamposInscricaoAdmin();
  const createMutation = useCreateCampoInscricao();
  const updateMutation = useUpdateCampoInscricao();
  const deleteMutation = useDeleteCampoInscricao();
  const reordenarMutation = useReordenarCampos();

  const [selectedSecao, setSelectedSecao] = useState<SecaoFormulario>("crianca");
  const [showPreview, setShowPreview] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampo, setEditingCampo] = useState<CampoInscricao | null>(null);
  const [showHistorico, setShowHistorico] = useState(false);
  const [historicoSelectedCampo, setHistoricoSelectedCampo] = useState<CampoInscricao | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campoToDelete, setCampoToDelete] = useState<CampoInscricao | null>(null);
  const [formData, setFormData] = useState({
    secao: "crianca" as SecaoFormulario,
    nome_campo: "",
    label: "",
    tipo: "text",
    placeholder: "",
    depende_de: "",
    depende_valor: "",
    obrigatorio: false,
    ativo: true,
    dica: "",
    mascara: "",
    visivel_responsavel: true,
    editavel_apos_inscricao: true,
    opcoes: [] as SelectOption[],
    validacao: null as { min?: number; max?: number; pattern?: string; mensagem_erro?: string } | null,
  });

  // Estado para gerenciar opções de select
  const [novaOpcaoValue, setNovaOpcaoValue] = useState("");
  const [novaOpcaoLabel, setNovaOpcaoLabel] = useState("");

  const resetForm = () => {
    setFormData({
      secao: selectedSecao,
      nome_campo: "",
      label: "",
      tipo: "text",
      placeholder: "",
      depende_de: "",
      depende_valor: "",
      obrigatorio: false,
      ativo: true,
      dica: "",
      mascara: "",
      visivel_responsavel: true,
      editavel_apos_inscricao: true,
      opcoes: [],
      validacao: null,
    });
    setEditingCampo(null);
    setNovaOpcaoValue("");
    setNovaOpcaoLabel("");
  };

  const handleEdit = (campo: CampoInscricao) => {
    setEditingCampo(campo);
    setFormData({
      secao: campo.secao as SecaoFormulario,
      nome_campo: campo.nome_campo,
      label: campo.label,
      tipo: campo.tipo,
      placeholder: campo.placeholder || "",
      depende_de: campo.depende_de || "",
      depende_valor: campo.depende_valor || "",
      obrigatorio: campo.obrigatorio,
      ativo: campo.ativo,
      dica: campo.dica || "",
      mascara: campo.mascara || "",
      visivel_responsavel: campo.visivel_responsavel,
      editavel_apos_inscricao: campo.editavel_apos_inscricao,
      opcoes: campo.opcoes || [],
      validacao: campo.validacao || null,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome_campo || !formData.label) return;

    // Validar que campos select tenham opções
    if (formData.tipo === "select" && formData.opcoes.length === 0) {
      toast.error("Campos do tipo Seleção precisam ter pelo menos uma opção");
      return;
    }

    try {
      const dadosCampo = {
        ...formData,
        depende_de: formData.depende_de && formData.depende_de.trim().length > 0 ? formData.depende_de : null,
        depende_valor:
          formData.depende_de && formData.depende_de.trim().length > 0 && formData.depende_valor.trim().length > 0
            ? formData.depende_valor
            : null,
        opcoes: formData.tipo === "select" ? formData.opcoes : null,
        validacao: formData.validacao,
      };

      if (editingCampo) {
        await updateMutation.mutateAsync({ 
          id: editingCampo.id, 
          ...dadosCampo,
          nome_campo: editingCampo.campo_sistema ? editingCampo.nome_campo : formData.nome_campo,
        });
      } else {
        await createMutation.mutateAsync({
          ...dadosCampo,
          nome_campo: formData.nome_campo.toLowerCase().replace(/\s/g, "_"),
          ordem: (campos?.filter(c => c.secao === formData.secao).length || 0) + 1,
        });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleRequestDelete = (campo: CampoInscricao) => {
    if (campo.campo_sistema) return;
    setCampoToDelete(campo);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!campoToDelete) return;
    await deleteMutation.mutateAsync(campoToDelete.id);
    setDeleteDialogOpen(false);
    setCampoToDelete(null);
  };

  // Adicionar opção ao select
  const handleAddOpcao = () => {
    if (!novaOpcaoValue.trim() || !novaOpcaoLabel.trim()) {
      toast.error("Preencha o valor e o rótulo da opção");
      return;
    }
    
    if (formData.opcoes.some(o => o.value === novaOpcaoValue)) {
      toast.error("Já existe uma opção com esse valor");
      return;
    }

    setFormData(prev => ({
      ...prev,
      opcoes: [...prev.opcoes, { value: novaOpcaoValue.trim(), label: novaOpcaoLabel.trim() }]
    }));
    setNovaOpcaoValue("");
    setNovaOpcaoLabel("");
  };

  // Remover opção do select
  const handleRemoveOpcao = (value: string) => {
    setFormData(prev => ({
      ...prev,
      opcoes: prev.opcoes.filter(o => o.value !== value)
    }));
  };

  // Mover campo para cima/baixo
  // Estado local para pendências de reordenação
  const [pendingOrderChanges, setPendingOrderChanges] = useState<Map<string, number>>(new Map());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleMoveField = (campo: CampoInscricao, direction: 'up' | 'down') => {
    const camposSecao = campos?.filter(c => c.secao === campo.secao).sort((a, b) => {
      const aOrder = pendingOrderChanges.get(a.id) ?? a.ordem;
      const bOrder = pendingOrderChanges.get(b.id) ?? b.ordem;
      return aOrder - bOrder;
    }) || [];
    
    const currentIndex = camposSecao.findIndex(c => c.id === campo.id);
    
    if (direction === 'up' && currentIndex <= 0) return;
    if (direction === 'down' && currentIndex >= camposSecao.length - 1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const otherCampo = camposSecao[newIndex];

    const campoOrdem = pendingOrderChanges.get(campo.id) ?? campo.ordem;
    const otherOrdem = pendingOrderChanges.get(otherCampo.id) ?? otherCampo.ordem;

    // Guardar mudanças pendentes localmente
    setPendingOrderChanges(prev => {
      const newMap = new Map(prev);
      newMap.set(campo.id, otherOrdem);
      newMap.set(otherCampo.id, campoOrdem);
      return newMap;
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveOrderChanges = async () => {
    if (pendingOrderChanges.size === 0) return;
    
    const updates = Array.from(pendingOrderChanges.entries()).map(([id, ordem]) => ({
      id,
      ordem,
    }));

    try {
      await reordenarMutation.mutateAsync(updates);
      setPendingOrderChanges(new Map());
      setHasUnsavedChanges(false);
      toast.success("Ordem salva com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar ordem dos campos");
    }
  };

  const handleDiscardChanges = () => {
    setPendingOrderChanges(new Map());
    setHasUnsavedChanges(false);
  };

  const camposFiltrados = campos?.filter(c => c.secao === selectedSecao).sort((a, b) => {
    const aOrder = pendingOrderChanges.get(a.id) ?? a.ordem;
    const bOrder = pendingOrderChanges.get(b.id) ?? b.ordem;
    return aOrder - bOrder;
  }) || [];

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FormInput className="h-5 w-5" />
              Campos do Formulário
            </CardTitle>
            <CardDescription>
              Configure os campos do formulário de inscrição
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setHistoricoSelectedCampo(null);
                setShowHistorico(true);
              }}
              className="w-full sm:w-auto"
            >
              <History className="h-4 w-4 mr-2" />
              Histórico
            </Button>
            <Button
              variant={showPreview ? "default" : "outline"}
              onClick={() => setShowPreview(!showPreview)}
              className="w-full sm:w-auto"
            >
              <MonitorPlay className="h-4 w-4 mr-2" />
              {showPreview ? "Voltar ao Editor" : "Preview"}
            </Button>
            {!showPreview && (
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Campo
                  </Button>
                </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>{editingCampo ? "Editar Campo" : "Novo Campo"}</DialogTitle>
                <DialogDescription>
                  {editingCampo?.campo_sistema 
                    ? "Campos do sistema têm edição limitada"
                    : "Configure as propriedades do campo"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Seção</Label>
                    <Select
                      value={formData.secao}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, secao: v as SecaoFormulario }))}
                      disabled={!!editingCampo?.campo_sistema}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SECOES_FORMULARIO).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v, opcoes: v === "select" ? prev.opcoes : [] }))}
                      disabled={!!editingCampo?.campo_sistema}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TIPOS_CAMPO).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nome do Campo (identificador)</Label>
                  <Input
                    value={formData.nome_campo}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome_campo: e.target.value }))}
                    placeholder="ex: nome_mae"
                    disabled={!!editingCampo}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rótulo (label)</Label>
                  <Input
                    value={formData.label}
                    onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Ex: Nome da mãe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Placeholder</Label>
                  <Input
                    value={formData.placeholder}
                    onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
                    placeholder="Texto de exemplo no campo"
                  />
                </div>

                <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                  <Label>Exibir somente quando (opcional)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Campo</Label>
                      <Select
                        value={formData.depende_de || "__none__"}
                        onValueChange={(v) =>
                          setFormData((prev) => ({
                            ...prev,
                            depende_de: v === "__none__" ? "" : v,
                            depende_valor: v === "__none__" ? "" : prev.depende_valor,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sem condição" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem condição</SelectItem>
                          {(campos || [])
                            .filter((c) => c.ativo)
                            .filter((c) => c.secao === formData.secao)
                            .filter((c) => c.nome_campo !== formData.nome_campo)
                            .sort((a, b) => a.ordem - b.ordem)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.nome_campo}>
                                {c.label} ({c.nome_campo})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Valor</Label>
                      {(() => {
                        const campoDep = (campos || []).find((c) => c.nome_campo === formData.depende_de);
                        if (!formData.depende_de) {
                          return (
                            <Input value="" disabled placeholder="Selecione um campo" />
                          );
                        }
                        if (campoDep?.tipo === "select" && Array.isArray(campoDep.opcoes) && campoDep.opcoes.length > 0) {
                          return (
                            <Select
                              value={formData.depende_valor}
                              onValueChange={(v) => setFormData((prev) => ({ ...prev, depende_valor: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {campoDep.opcoes.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>
                                    {o.label} ({o.value})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          );
                        }
                        if (campoDep?.tipo === "checkbox") {
                          return (
                            <Select
                              value={formData.depende_valor}
                              onValueChange={(v) => setFormData((prev) => ({ ...prev, depende_valor: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Marcado (true)</SelectItem>
                                <SelectItem value="false">Desmarcado (false)</SelectItem>
                              </SelectContent>
                            </Select>
                          );
                        }
                        return (
                          <Input
                            value={formData.depende_valor}
                            onChange={(e) => setFormData((prev) => ({ ...prev, depende_valor: e.target.value }))}
                            placeholder="Ex: sim"
                          />
                        );
                      })()}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Exemplo: criar “Indígena?” (Sim/Não) e depois um campo “Etnia” que só aparece quando Indígena = Sim.
                  </p>
                </div>

                {/* Editor de opções para campos select */}
                {formData.tipo === "select" && (
                  <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
                    <Label className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      Opções do Campo
                    </Label>
                    
                    {/* Lista de opções existentes */}
                    {formData.opcoes.length > 0 && (
                      <div className="space-y-2">
                        {formData.opcoes.map((opcao, index) => (
                          <div key={opcao.value} className="flex items-center gap-2 text-sm bg-background p-2 rounded">
                            <span className="text-muted-foreground w-6">{index + 1}.</span>
                            <span className="flex-1 font-medium">{opcao.label}</span>
                            <span className="text-xs text-muted-foreground">({opcao.value})</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleRemoveOpcao(opcao.value)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Adicionar nova opção */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
                      <Input
                        placeholder="Valor (ex: sim)"
                        value={novaOpcaoValue}
                        onChange={(e) => setNovaOpcaoValue(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Rótulo (ex: Sim)"
                        value={novaOpcaoLabel}
                        onChange={(e) => setNovaOpcaoLabel(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddOpcao}
                        className="h-8 w-full sm:w-auto"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Adicione as opções que aparecerão no campo de seleção
                    </p>
                  </div>
                )}

                {/* Validação customizada */}
                {(formData.tipo === "text" || formData.tipo === "textarea") && (
                  <div className="space-y-3 p-3 border rounded-lg">
                    <Label>Validação (opcional)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Mín. caracteres</Label>
                        <Input
                          type="number"
                          placeholder="Ex: 3"
                          value={formData.validacao?.min || ""}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            validacao: { ...prev.validacao, min: e.target.value ? Number(e.target.value) : undefined }
                          }))}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Máx. caracteres</Label>
                        <Input
                          type="number"
                          placeholder="Ex: 100"
                          value={formData.validacao?.max || ""}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            validacao: { ...prev.validacao, max: e.target.value ? Number(e.target.value) : undefined }
                          }))}
                          className="h-8"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Mensagem de erro</Label>
                      <Input
                        placeholder="Ex: Campo deve ter entre 3 e 100 caracteres"
                        value={formData.validacao?.mensagem_erro || ""}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          validacao: { ...prev.validacao, mensagem_erro: e.target.value || undefined }
                        }))}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Dica de preenchimento</Label>
                  <Textarea
                    value={formData.dica}
                    onChange={(e) => setFormData(prev => ({ ...prev, dica: e.target.value }))}
                    placeholder="Texto de ajuda exibido abaixo do campo"
                    rows={2}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.obrigatorio}
                      onCheckedChange={(v) => setFormData(prev => ({ ...prev, obrigatorio: v }))}
                    />
                    <Label>Campo obrigatório</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.ativo}
                      onCheckedChange={(v) => setFormData(prev => ({ ...prev, ativo: v }))}
                    />
                    <Label>Campo ativo</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.visivel_responsavel}
                      onCheckedChange={(v) => setFormData(prev => ({ ...prev, visivel_responsavel: v }))}
                    />
                    <Label>Visível na área do responsável</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.editavel_apos_inscricao}
                      onCheckedChange={(v) => setFormData(prev => ({ ...prev, editavel_apos_inscricao: v }))}
                    />
                    <Label>Editável após inscrição</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showPreview ? (
          <CamposInscricaoPreview campos={campos || []} />
        ) : (
        <Tabs value={selectedSecao} onValueChange={(v) => setSelectedSecao(v as SecaoFormulario)}>
          <TabsList className="w-full justify-start overflow-x-auto flex flex-nowrap bg-muted/50 p-1">
            {Object.entries(SECOES_FORMULARIO).map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="flex-shrink-0 text-xs sm:text-sm">
                {label.split(" ")[0]}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Barra de alterações pendentes */}
          {hasUnsavedChanges && (
            <div className="flex flex-col gap-2 p-3 my-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                Você tem alterações de ordem não salvas
              </span>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" size="sm" onClick={handleDiscardChanges}>
                  <X className="h-4 w-4 mr-1" />
                  Descartar
                </Button>
                <Button size="sm" onClick={handleSaveOrderChanges} disabled={reordenarMutation.isPending}>
                  <Save className="h-4 w-4 mr-1" />
                  {reordenarMutation.isPending ? "Salvando..." : "Salvar Ordem"}
                </Button>
              </div>
            </div>
          )}

          {Object.keys(SECOES_FORMULARIO).map((secao) => (
            <TabsContent key={secao} value={secao} className="mt-4">
              {camposFiltrados.length > 0 ? (
                <div className="space-y-2">
                  {camposFiltrados.map((campo, index) => (
                    <div
                      key={campo.id}
                      className={cn(
                        "flex flex-col gap-3 p-3 border rounded-lg transition-colors sm:flex-row sm:items-center sm:justify-between",
                        !campo.ativo && "opacity-50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Botões de reordenação */}
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => handleMoveField(campo, 'up')}
                            disabled={index === 0 || reordenarMutation.isPending}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => handleMoveField(campo, 'down')}
                            disabled={index === camposFiltrados.length - 1 || reordenarMutation.isPending}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{campo.label}</span>
                            {campo.campo_sistema && (
                              <Badge variant="secondary" className="gap-1">
                                <Lock className="h-3 w-3" />
                                Sistema
                              </Badge>
                            )}
                            {campo.obrigatorio && (
                              <Badge variant="destructive">Obrigatório</Badge>
                            )}
                            <Badge variant="outline">
                              {TIPOS_CAMPO[campo.tipo as keyof typeof TIPOS_CAMPO] || campo.tipo}
                            </Badge>
                            {campo.tipo === "select" && campo.opcoes && (
                              <Badge variant="secondary" className="gap-1">
                                <List className="h-3 w-3" />
                                {campo.opcoes.length} opções
                              </Badge>
                            )}
                            {!campo.visivel_responsavel && (
                              <Badge variant="secondary" className="gap-1">
                                <EyeOff className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{campo.nome_campo}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:justify-end">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(campo)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!campo.campo_sistema && (
                          <Button variant="ghost" size="icon" onClick={() => handleRequestDelete(campo)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum campo nesta seção
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
        )}
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{campoToDelete?.label}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CamposInscricaoHistoricoDialog
        open={showHistorico}
        onOpenChange={setShowHistorico}
        campo={historicoSelectedCampo}
      />
    </Card>
  );
};

export default CamposInscricaoEditor;


