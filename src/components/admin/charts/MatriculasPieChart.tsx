import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/common/Spinner";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { PieChartIcon } from "lucide-react";
import { useMatriculasPorStatus } from "@/hooks/api/dashboard-hooks";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";

// Função para criar variações de cor a partir de HEX
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

function getStatusColors(primaryHex: string | null | undefined): Record<string, string> {
  const hsl = primaryHex ? hexToHsl(primaryHex) : null;
  const h = hsl?.h ?? 212;
  const s = hsl?.s ?? 80;
  return {
    "Fila de Espera": `hsl(${h}, ${Math.max(s - 10, 30)}%, 60%)`,
    "Convocado": `hsl(${h}, ${s}%, 45%)`,
    "Aguardando Documentação": `hsl(${h}, ${Math.max(s - 20, 30)}%, 70%)`,
    "Aguardando Assinatura": `hsl(${h}, ${Math.max(s - 15, 30)}%, 55%)`,
    "Matriculado": `hsl(${h}, ${Math.min(s + 10, 100)}%, 35%)`,
    "Matriculada": `hsl(${h}, ${Math.min(s + 10, 100)}%, 35%)`,
    "Desistente": `hsl(${h}, ${Math.max(s - 50, 20)}%, 75%)`,
    "Recusada": `hsl(${h}, ${Math.max(s - 40, 20)}%, 50%)`,
    "Remanejamento Solicitado": `hsl(${h}, ${s}%, 50%)`,
    "Concluinte": `hsl(${h}, ${Math.max(s - 30, 30)}%, 55%)`,
    "Transferido": `hsl(${h}, ${Math.max(s - 35, 25)}%, 62%)`,
    "Matrícula Trancada": `hsl(${h}, ${Math.max(s - 45, 20)}%, 68%)`,
  };
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: data.payload.fill }}
          />
          <span className="font-semibold text-sm">{data.name}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Quantidade: <span className="font-medium text-foreground">{data.value}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Percentual: <span className="font-medium text-foreground">{((data.payload.percent || 0) * 100).toFixed(1)}%</span>
        </div>
      </div>
    );
  }
  return null;
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor="middle" 
      dominantBaseline="central"
      className="text-xs font-semibold"
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function MatriculasPieChart({ compact }: { compact?: boolean }) {
  const { data, isLoading } = useMatriculasPorStatus();
  const { data: config } = useConfiguracoesPublicas();
  const COLORS = getStatusColors(config?.tema_cor_primaria);
  const chartHeight = compact ? 220 : 280;
  const outerRadius = compact ? 70 : 90;
  const innerRadius = compact ? 36 : 45;

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <PieChartIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Distribuição por Status</CardTitle>
              <CardDescription className="text-xs">Visão geral das crianças</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className={`flex items-center justify-center ${compact ? "h-[220px]" : "h-[280px]"}`}>
          <Spinner className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const total = data?.reduce((sum, item) => sum + item.quantidade, 0) || 0;
  const dataWithPercent = data?.map(item => ({
    ...item,
    percent: total > 0 ? item.quantidade / total : 0,
  }));

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <PieChartIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Distribuição por Status</CardTitle>
            <CardDescription className="text-xs">Proporção de crianças em cada status</CardDescription>
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
              labelLine={false}
              label={compact ? false : renderCustomizedLabel}
              outerRadius={outerRadius}
              innerRadius={innerRadius}
              fill="#8884d8"
              dataKey="quantidade"
              nameKey="status"
              paddingAngle={2}
              isAnimationActive
              animationDuration={650}
            >
              {dataWithPercent?.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[entry.status] || "hsl(var(--muted))"}
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
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              formatter={(value) => <span className="text-muted-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

