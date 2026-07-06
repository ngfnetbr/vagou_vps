import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCMEIsComZonas, useVincularCmeiZona, useDesvincularCmeiZona, useZonasAtendimento } from "@/hooks/api/zonas-hooks";
import { Building, Link2 } from "lucide-react";

export const CmeiZonasManager = () => {
  const { data: zonas, isLoading: loadingZonas } = useZonasAtendimento();
  const { data: cmeis, isLoading: loadingCmeis } = useCMEIsComZonas();
  const vincular = useVincularCmeiZona();
  const desvincular = useDesvincularCmeiZona();
  const [zonaId, setZonaId] = useState<string>("");
  const [prioridades, setPrioridades] = useState<Record<string, string>>({});

  const zonaSelecionada = useMemo(() => zonas?.find((z) => z.id === zonaId) ?? null, [zonas, zonaId]);

  const isLoading = loadingZonas || loadingCmeis;

  useEffect(() => {
    setPrioridades({});
  }, [zonaId]);

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Vínculo Zona x CMEI
        </CardTitle>
        <CardDescription>Defina quais CMEIs pertencem a cada zona</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Zona</Label>
          <Select value={zonaId} onValueChange={setZonaId}>
            <SelectTrigger className="h-auto py-2">
              <SelectValue placeholder="Selecione uma zona" />
            </SelectTrigger>
            <SelectContent>
              {(zonas || []).map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: z.cor }} />
                    <span>{z.nome}</span>
                    {!z.ativo && <Badge variant="secondary">Inativa</Badge>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {zonaSelecionada ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Building className="h-4 w-4 text-muted-foreground" />
              CMEIs da zona: {zonaSelecionada.nome}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(cmeis || []).map((cmei) => {
                const vinculo = (cmei as any).zonas?.find((z: any) => z.zona_id === zonaId) ?? null;
                const checked = !!vinculo;
                const disabled = vincular.isPending || desvincular.isPending;
                const prioridadeValue = prioridades[cmei.id] ?? String(vinculo?.prioridade ?? 1);

                return (
                  <div key={cmei.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={async (v) => {
                        const shouldCheck = v === true;
                        if (shouldCheck) {
                          const parsed = Number.parseInt(prioridadeValue, 10);
                          const prioridade = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
                          await vincular.mutateAsync({ cmei_id: cmei.id, zona_id: zonaId, prioridade });
                          setPrioridades((prev) => ({ ...prev, [cmei.id]: String(prioridade) }));
                          return;
                        }

                        setPrioridades((prev) => {
                          const next = { ...prev };
                          delete next[cmei.id];
                          return next;
                        });

                        if (vinculo?.id) {
                          await desvincular.mutateAsync({ id: vinculo.id, cmeiId: cmei.id, zonaId });
                          return;
                        }

                        await desvincular.mutateAsync({ cmeiId: cmei.id, zonaId });
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{cmei.nome}</span>
                        {checked && (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                            Vinculado
                          </Badge>
                        )}
                      </div>
                      {cmei.bairro && <div className="text-xs text-muted-foreground truncate">{cmei.bairro}</div>}
                      {checked && (
                        <div className="flex items-center gap-2 mt-2">
                          <Label htmlFor={`prioridade-${cmei.id}`} className="text-xs text-muted-foreground">
                            Prioridade
                          </Label>
                          <Input
                            id={`prioridade-${cmei.id}`}
                            type="number"
                            min={1}
                            step={1}
                            className="h-8 w-24"
                            disabled={disabled}
                            value={prioridadeValue}
                            onChange={(e) => setPrioridades((prev) => ({ ...prev, [cmei.id]: e.target.value }))}
                            onBlur={async () => {
                              const parsed = Number.parseInt(prioridadeValue, 10);
                              const prioridade = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
                              if ((vinculo?.prioridade ?? 1) === prioridade) {
                                setPrioridades((prev) => ({ ...prev, [cmei.id]: String(prioridade) }));
                                return;
                              }
                              await vincular.mutateAsync({ cmei_id: cmei.id, zona_id: zonaId, prioridade });
                              setPrioridades((prev) => ({ ...prev, [cmei.id]: String(prioridade) }));
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Selecione uma zona para vincular CMEIs.</div>
        )}
      </CardContent>
    </Card>
  );
};
