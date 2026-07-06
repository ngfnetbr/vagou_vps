import { useState } from "react";
import { useTiposPrioridade, useCreateTipoPrioridade, useUpdateTipoPrioridade, useDeleteTipoPrioridade, TipoPrioridade } from "@/hooks/api/prioridades-hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Plus, Trash2, Star, FileCheck, GripVertical } from "lucide-react";
import { useDocumentosTipos } from "@/hooks/api/documentos-hooks";

const CORES_PRIORIDADE = [
  { value: "#ef4444", label: "Vermelho" },
  { value: "#f59e0b", label: "Laranja" },
  { value: "#22c55e", label: "Verde" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#8b5cf6", label: "Roxo" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#64748b", label: "Cinza" },
];

export const TiposPrioridadeManager = () => {
  const { data: tipos, isLoading } = useTiposPrioridade();
  const createMutation = useCreateTipoPrioridade();
  const updateMutation = useUpdateTipoPrioridade();
  const deleteMutation = useDeleteTipoPrioridade();
  const { data: documentosTipos } = useDocumentosTipos();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoPrioridade | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    codigo: "",
    peso: 1,
    cor: "#3b82f6",
    icone: "star",
    exige_documento: false,
    documento_tipo_id: null as string | null,
    ativo: true,
    ordem: 0,
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      codigo: "",
      peso: 1,
      cor: "#3b82f6",
      icone: "star",
      exige_documento: false,
      documento_tipo_id: null,
      ativo: true,
      ordem: (tipos?.length || 0) + 1,
    });
    setEditingTipo(null);
  };

  const handleEdit = (tipo: TipoPrioridade) => {
    setEditingTipo(tipo);
    setFormData({
      nome: tipo.nome,
      descricao: tipo.descricao || "",
      codigo: tipo.codigo,
      peso: tipo.peso,
      cor: tipo.cor,
      icone: tipo.icone,
      exige_documento: tipo.exige_documento,
      documento_tipo_id: tipo.documento_tipo_id,
      ativo: tipo.ativo,
      ordem: tipo.ordem,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.codigo) return;

    try {
      const payload = {
        ...formData,
        documento_tipo_id: formData.exige_documento ? formData.documento_tipo_id : null,
      };
      if (editingTipo) {
        await updateMutation.mutateAsync({ id: editingTipo.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este tipo de prioridade?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Tipos de Prioridade
            </CardTitle>
            <CardDescription>
              Configure os tipos de prioridade e seus pesos na ordenação da fila
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Prioridade
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingTipo ? "Editar Prioridade" : "Nova Prioridade"}</DialogTitle>
                <DialogDescription>
                  Prioridades com peso maior têm preferência na fila de espera
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Ex: Prioridade Social"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Código (único)</Label>
                    <Input
                      value={formData.codigo}
                      onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value.toLowerCase().replace(/\s/g, "_") }))}
                      placeholder="Ex: social"
                      disabled={!!editingTipo}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descreva quando esta prioridade se aplica"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Peso (0-100)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.peso}
                      onChange={(e) => {
                        const parsed = parseInt(e.target.value, 10);
                        const v = Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0;
                        setFormData((prev) => ({ ...prev, peso: v }));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Maior peso = mais prioridade</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <div className="flex flex-wrap gap-2">
                      {CORES_PRIORIDADE.map((cor) => (
                        <button
                          key={cor.value}
                          type="button"
                          className={`w-6 h-6 rounded-full border-2 ${formData.cor === cor.value ? "border-foreground" : "border-transparent"}`}
                          style={{ backgroundColor: cor.value }}
                          onClick={() => setFormData(prev => ({ ...prev, cor: cor.value }))}
                          title={cor.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.exige_documento}
                      onCheckedChange={(v) => setFormData(prev => ({ ...prev, exige_documento: v }))}
                    />
                    <Label className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4" />
                      Exige documento comprobatório
                    </Label>
                  </div>
                  {formData.exige_documento && (
                    <div className="space-y-2">
                      <Label>Tipo de documento (para comprovação)</Label>
                      <Select
                        value={formData.documento_tipo_id ?? "none"}
                        onValueChange={(v) =>
                          setFormData((prev) => ({ ...prev, documento_tipo_id: v === "none" ? null : v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não definido</SelectItem>
                          {(documentosTipos || []).map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Quando definido, o formulário de inscrição pede o upload deste documento ao selecionar a prioridade.
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.ativo}
                      onCheckedChange={(v) => setFormData(prev => ({ ...prev, ativo: v }))}
                    />
                    <Label>Ativo</Label>
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
        </div>
      </CardHeader>
      <CardContent>
        {tipos && tipos.length > 0 ? (
          <div className="space-y-2">
            {tipos
              .sort((a, b) => b.peso - a.peso)
              .map((tipo) => (
                <div
                  key={tipo.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${!tipo.ativo ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tipo.cor }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tipo.nome}</span>
                        <Badge variant="outline">Peso: {tipo.peso}</Badge>
                        {tipo.exige_documento && (
                          <Badge variant="secondary" className="gap-1">
                            <FileCheck className="h-3 w-3" />
                            Doc. obrigatório
                          </Badge>
                        )}
                        {tipo.exige_documento && tipo.documento_tipo_id && (
                          <Badge variant="outline">
                            {(documentosTipos || []).find((d) => d.id === tipo.documento_tipo_id)?.nome || "Doc. definido"}
                          </Badge>
                        )}
                        {!tipo.ativo && <Badge variant="secondary">Inativo</Badge>}
                      </div>
                      {tipo.descricao && (
                        <p className="text-sm text-muted-foreground">{tipo.descricao}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(tipo)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(tipo.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum tipo de prioridade cadastrado
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TiposPrioridadeManager;

