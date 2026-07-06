import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/common/Spinner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Users } from "lucide-react";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { useDistribuicaoSexo } from "@/hooks/api/dashboard-hooks";

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function getSexoColors(primaryHex: string | null | undefined): Record<string, string> {
  const hsl = primaryHex ? hexToHsl(primaryHex) : null;
  const h = hsl?.h ?? 212;
  const s = hsl?.s ?? 80;
  return {
    Masculino: `hsl(${h}, ${Math.min(s + 5, 100)}%, 42%)`,
    Feminino: `hsl(${h}, ${Math.max(s - 20, 30)}%, 62%)`,
  };
}

type TooltipPayloadEntry = {
  name?: string;
  value?: number;
  payload?: { fill?: string; percent?: number };
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const name = entry?.name ?? "";
  const value = entry?.value ?? 0;
  const fill = entry?.payload?.fill ?? "hsl(var(--muted))";
  const percent = entry?.payload?.percent ?? 0;

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: fill }} />
        <span className="font-semibold text-sm">{name}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        Quantidade: <span className="font-medium text-foreground">{value}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        Percentual:{" "}
        <span className="font-medium text-foreground">{(percent * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}

export function SexoChart({ compact }: { compact?: boolean }) {
  const { data, isLoading } = useDistribuicaoSexo();
  const { data: config } = useConfiguracoesPublicas();
  const COLORS = getSexoColors(config?.tema_cor_primaria);
  const chartHeight = compact ? 220 : 260;
  const outerRadius = compact ? 70 : 86;
  const innerRadius = compact ? 36 : 46;

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Distribuição por Sexo</CardTitle>
              <CardDescription className="text-xs">Masculino x feminino</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className={`flex items-center justify-center ${compact ? "h-[220px]" : "h-[260px]"}`}>
          <Spinner className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const total = data?.reduce((sum, item) => sum + item.quantidade, 0) || 0;
  const dataWithPercent =
    data?.map((item) => ({
      ...item,
      percent: total > 0 ? item.quantidade / total : 0,
    })) || [];

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Distribuição por Sexo</CardTitle>
            <CardDescription className="text-xs">{total} registros</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <PieChart>
            <Pie
              data={dataWithPercent}
              cx="50%"
              cy="45%"
              outerRadius={outerRadius}
              innerRadius={innerRadius}
              dataKey="quantidade"
              nameKey="sexo"
              paddingAngle={2}
              labelLine={false}
              isAnimationActive
              animationDuration={650}
            >
              {dataWithPercent.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.sexo] || "hsl(var(--muted))"}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
              formatter={(value) => <span className="text-muted-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

