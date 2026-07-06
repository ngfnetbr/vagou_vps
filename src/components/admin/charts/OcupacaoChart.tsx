import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/common/Spinner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Building2, AlertTriangle } from "lucide-react";
import { useOcupacaoPorCMEI } from "@/hooks/api/dashboard-hooks";
import { Badge } from "@/components/ui/badge";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isCritical = data.percentual >= 90;
    return (
      <div className={`bg-card border rounded-lg shadow-lg p-3 max-w-[250px] ${isCritical ? 'border-destructive' : 'border-border'}`}>
        <div className="flex items-center gap-2 mb-2">
          {isCritical && <AlertTriangle className="h-4 w-4 text-destructive" />}
          <p className="font-semibold text-sm text-foreground break-words">{data.nome}</p>
        </div>
        {isCritical && (
          <div className="bg-destructive/10 text-destructive text-xs font-medium px-2 py-1 rounded mb-2">
            Lotação Crítica!
          </div>
        )}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: getBarColor(data.percentual) }}
            />
            <span className="text-xs text-muted-foreground">Ocupados:</span>
            <span className="text-xs font-medium">{data.ocupados}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary/30" />
            <span className="text-xs text-muted-foreground">Disponíveis:</span>
            <span className="text-xs font-medium">{data.vagas}</span>
          </div>
          <div className="border-t pt-1 mt-1">
            <span className="text-xs font-semibold" style={{ color: getBarColor(data.percentual) }}>
              {data.percentual.toFixed(1)}% ocupado
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const getBarColor = (percentual: number) => {
  if (percentual >= 90) return "hsl(var(--destructive))";
  if (percentual >= 70) return "hsl(var(--chart-warning))";
  return "hsl(var(--chart-success))";
};

const abbreviateName = (name: string) => {
  if (name.length <= 12) return name;
  const cleanName = name.replace(/^CMEI\s*/i, '');
  const words = cleanName.split(' ');
  let result = '';
  for (const word of words) {
    if ((result + word).length <= 10) {
      result += (result ? ' ' : '') + word;
    } else {
      break;
    }
  }
  return result || cleanName.substring(0, 10) + '...';
};

export function OcupacaoChart({ compact }: { compact?: boolean }) {
  const { data: config } = useConfiguracoesSistema();
  const { singular } = getUnidadeLabels(config as any);
  const { data, isLoading } = useOcupacaoPorCMEI();
  const chartHeight = compact ? 220 : 300;
  const loadingHeightClass = compact ? "h-[240px]" : "h-[320px]";

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Ocupação por {singular}</CardTitle>
              <CardDescription className="text-xs">Vagas ocupadas vs disponíveis</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className={`flex items-center justify-center ${loadingHeightClass}`}>
          <Spinner className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data?.map(item => ({
    ...item,
    nomeAbreviado: abbreviateName(item.nome),
  }));

  // Contagem de CMEIs críticos
  const criticalCount = data?.filter(item => item.percentual >= 90).length || 0;

  // Encontrar o valor máximo para a linha de referência
  const maxValue = Math.max(...(data?.map(d => d.ocupados + d.vagas) || [100]));

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Ocupação por {singular}</CardTitle>
              <CardDescription className="text-xs">Vagas ocupadas vs capacidade total</CardDescription>
            </div>
          </div>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Legenda de cores */}
        <div className="flex items-center justify-center gap-4 mb-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--chart-success))]" />
            <span className="text-muted-foreground">&lt;70%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--chart-warning))]" />
            <span className="text-muted-foreground">70-89%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
            <span className="text-muted-foreground">≥90%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary/30" />
            <span className="text-muted-foreground">Disponíveis</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={chartData} margin={{ top: 18, right: 10, left: -10, bottom: 0 }} barCategoryGap="22%">
            <defs>
              <linearGradient id="ocupacaoVagas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey="nomeAbreviado" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={0}
              height={28}
              angle={-25}
              textAnchor="end"
            />
            <YAxis 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.25 }} />
            {/* Capacidade total empilhada: ocupados + disponíveis */}
            <Bar 
              dataKey="ocupados" 
              name="Ocupados" 
              stackId="cap"
              radius={[0, 0, 4, 4]}
              maxBarSize={46}
              isAnimationActive
              animationDuration={650}
            >
              {chartData?.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry.percentual)}
                />
              ))}
            </Bar>
            <Bar 
              dataKey="vagas" 
              name="Disponíveis" 
              stackId="cap"
              fill="url(#ocupacaoVagas)"
              stroke="hsl(var(--primary))"
              strokeOpacity={0.25}
              radius={[4, 4, 0, 0]}
              maxBarSize={46}
              isAnimationActive
              animationDuration={650}
            >
              <LabelList
                dataKey="percentual"
                position="top"
                formatter={(v: number) => `${Math.round(v)}%`}
                style={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

      </CardContent>
    </Card>
  );
}

