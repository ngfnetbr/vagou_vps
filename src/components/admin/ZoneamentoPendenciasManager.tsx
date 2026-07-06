import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateZona, useZonasAtendimento } from "@/hooks/api/zonas-hooks";
import { useZoneamentoBairrosPendentes, useResolverBairroPendente } from "@/hooks/api/zoneamento-pendencias-hooks";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, CheckCircle2, MapPin } from "lucide-react";

const normalizarTextoChave = (value: string): string => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
};

export const ZoneamentoPendenciasManager = () => {
  const { user } = useAuth();
  const { data: zonas } = useZonasAtendimento();
  const updateZona = useUpdateZona();
  const resolver = useResolverBairroPendente();
  const [search, setSearch] = useState("");
  const [zonaPorPendencia, setZonaPorPendencia] = useState<Record<string, string>>({});

  const { data: pendencias = [], isLoading } = useZoneamentoBairrosPendentes();

  const pendenciasFiltradas = useMemo(() => {
    const q = normalizarTextoChave(search);
    if (!q) return pendencias;
    return pendencias.filter((p) => {
      const key = normalizarTextoChave(
        [p.bairro, p.cidade, p.estado, p.cep, p.origem].filter(Boolean).join(" ")
      );
      return key.includes(q);
    });
  }, [pendencias, search]);

  const resolverComZona = async (pendenciaId: string, zonaId: string | null) => {
    if (!user?.id) return;
    await resolver.mutateAsync({
      id: pendenciaId,
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
      resolved_zona_id: zonaId,
    });
  };

  const adicionarBairroNaZonaEResolver = async (pendenciaId: string, bairro: string) => {
    const zonaId = zonaPorPendencia[pendenciaId] || "";
    const zona = (zonas || []).find((z) => z.id === zonaId) || null;
    if (!zona) return;

    const bairrosAtuais = zona.bairros || [];
    const seen = new Set(bairrosAtuais.map((b) => normalizarTextoChave(b)));
    const bairroLimpo = bairro.trim().replace(/\s+/g, " ");
    const bairroKey = normalizarTextoChave(bairroLimpo);
    const bairrosAtualizados = bairroKey && !seen.has(bairroKey) ? [...bairrosAtuais, bairroLimpo] : bairrosAtuais;

    await updateZona.mutateAsync({ id: zona.id, bairros: bairrosAtualizados } as any);
    await resolverComZona(pendenciaId, zona.id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Bairros não mapeados
        </CardTitle>
        <CardDescription>
          Bairros digitados na inscrição que não bateram com nenhuma zona. Use para completar o cadastro de zonas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="space-y-2 flex-1">
            <Label>Buscar</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Bairro, cidade, CEP, origem..." />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{pendenciasFiltradas.length} pendência(s)</Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : pendenciasFiltradas.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhuma pendência encontrada.</div>
        ) : (
          <div className="space-y-3">
            {pendenciasFiltradas.map((p) => {
              const zonaSelecionadaId = zonaPorPendencia[p.id] || "";
              const disabled = resolver.isPending || updateZona.isPending;
              return (
                <div key={p.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{p.bairro}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {p.vezes}x
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {p.origem}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[p.cidade, p.estado].filter(Boolean).join(" - ") || "Cidade/UF não informados"}
                        {p.cep ? ` • CEP ${p.cep}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Último registro: {new Date(p.last_seen_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <Select value={zonaSelecionadaId} onValueChange={(v) => setZonaPorPendencia((prev) => ({ ...prev, [p.id]: v }))}>
                        <SelectTrigger className="h-9 w-[220px]">
                          <SelectValue placeholder="Selecione uma zona" />
                        </SelectTrigger>
                        <SelectContent>
                          {(zonas || [])
                            .filter((z) => z.ativo)
                            .map((z) => (
                              <SelectItem key={z.id} value={z.id}>
                                <div className="flex items-center gap-2">
                                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: z.cor }} />
                                  <span>{z.nome}</span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-2">
                    <Button
                      disabled={disabled || !zonaSelecionadaId || !user?.id}
                      onClick={() => adicionarBairroNaZonaEResolver(p.id, p.bairro)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Adicionar bairro à zona e resolver
                    </Button>
                    <Button
                      variant="outline"
                      disabled={disabled || !user?.id}
                      onClick={() => resolverComZona(p.id, zonaSelecionadaId || null)}
                    >
                      Resolver sem adicionar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ZoneamentoPendenciasManager;

