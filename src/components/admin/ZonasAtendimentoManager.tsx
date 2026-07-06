import { useState } from "react";
import { useZonasAtendimento, useCreateZona, useUpdateZona, useDeleteZona, ZonaAtendimento } from "@/hooks/api/zonas-hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Plus, Trash2, MapPin, Building } from "lucide-react";

const CORES_ZONA = [
  { value: "#ef4444", label: "Vermelho" },
  { value: "#f59e0b", label: "Laranja" },
  { value: "#22c55e", label: "Verde" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#8b5cf6", label: "Roxo" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#64748b", label: "Cinza" },
];

const normalizarTextoChave = (value: string): string => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
};

const parseListaTexto = (raw: string): string[] | null => {
  const lines = raw
    .split(/[,\n;]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\s+/g, " "));

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of lines) {
    const key = normalizarTextoChave(item);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result.length > 0 ? result : null;
};

const parseListaCeps = (raw: string): string[] | null => {
  const entries = raw
    .split(/[,\n;]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\D/g, ""))
    .filter(Boolean);

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of entries) {
    if (seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }

  return result.length > 0 ? result : null;
};

export const ZonasAtendimentoManager = () => {
  const { data: zonas, isLoading } = useZonasAtendimento();
  const createMutation = useCreateZona();
  const updateMutation = useUpdateZona();
  const deleteMutation = useDeleteZona();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingZona, setEditingZona] = useState<ZonaAtendimento | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    cor: "#3b82f6",
    bairros: "",
    ceps: "",
    ativo: true,
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      cor: "#3b82f6",
      bairros: "",
      ceps: "",
      ativo: true,
    });
    setEditingZona(null);
  };

  const handleEdit = (zona: ZonaAtendimento) => {
    setEditingZona(zona);
    setFormData({
      nome: zona.nome,
      descricao: zona.descricao || "",
      cor: zona.cor,
      bairros: zona.bairros?.join("\n") || "",
      ceps: zona.ceps?.join("\n") || "",
      ativo: zona.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome) return;

    const zonaData = {
      nome: formData.nome,
      descricao: formData.descricao || null,
      cor: formData.cor,
      bairros: parseListaTexto(formData.bairros),
      ceps: parseListaCeps(formData.ceps),
      ativo: formData.ativo,
    };

    try {
      if (editingZona) {
        await updateMutation.mutateAsync({ id: editingZona.id, ...zonaData });
      } else {
        await createMutation.mutateAsync(zonaData);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta zona?")) {
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
              <MapPin className="h-5 w-5" />
              Zonas de Atendimento
            </CardTitle>
            <CardDescription>
              Defina áreas de atendimento para priorização por proximidade
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Zona
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingZona ? "Editar Zona" : "Nova Zona"}</DialogTitle>
                <DialogDescription>
                  Zonas são usadas para priorizar crianças que moram próximas aos CMEIs
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Zona</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Zona Norte"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descrição opcional da zona"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex flex-wrap gap-2">
                    {CORES_ZONA.map((cor) => (
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
                <div className="space-y-2">
                  <Label>Bairros (um por linha)</Label>
                  <Textarea
                    value={formData.bairros}
                    onChange={(e) => setFormData(prev => ({ ...prev, bairros: e.target.value }))}
                    placeholder={"Centro\nVila Nova\nJardim das Flores"}
                    rows={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CEPs ou Prefixos (um por linha)</Label>
                  <Textarea
                    value={formData.ceps}
                    onChange={(e) => setFormData(prev => ({ ...prev, ceps: e.target.value }))}
                    placeholder={"12345000\n12346\n12347"}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use CEPs completos ou prefixos para abranger uma região
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.ativo}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, ativo: v }))}
                  />
                  <Label>Zona ativa</Label>
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
        {zonas && zonas.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {zonas.map((zona) => (
              <Card key={zona.id} className={!zona.ativo ? "opacity-50" : ""}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: zona.cor }}
                      />
                      <CardTitle className="text-base">{zona.nome}</CardTitle>
                      {!zona.ativo && <Badge variant="secondary">Inativa</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(zona)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(zona.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {zona.descricao && (
                    <CardDescription>{zona.descricao}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="py-2">
                  <div className="space-y-2 text-sm">
                    {zona.bairros && zona.bairros.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {zona.bairros.map((bairro, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {bairro}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {zona.ceps && zona.ceps.length > 0 && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="text-muted-foreground">
                          CEPs: {zona.ceps.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma zona de atendimento cadastrada
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ZonasAtendimentoManager;

