import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/common/Spinner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { UserCheck } from "lucide-react";
import { useUsuariosPorStatus } from "@/hooks/api/usuarios-stats-hooks";
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
    Ativos: `hsl(${h}, ${s}%, 45%)`,
    Inativos: `hsl(${h}, ${Math.max(s - 50, 20)}%, 75%)`,
  };
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border rounded-lg shadow-lg p-3">
        <p className="font-semibold text-sm text-foreground">{data.status}</p>
        <p className="text-xs text-muted-foreground">
          {data.quantidade} usuário{data.quantidade !== 1 ? "s" : ""}
        </p>
      </div>
    );
  }
  return null;
};

export function UsuariosPorStatusChart() {
  const { data, isLoading } = useUsuariosPorStatus();
  const { data: config } = useConfiguracoesPublicas();
  const statusColors = getStatusColors(config?.tema_cor_primaria);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Usuários por Status</CardTitle>
              <CardDescription className="text-xs">Ativos vs Inativos</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <Spinner className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const total = data?.reduce((acc, item) => acc + item.quantidade, 0) || 0;
  const ativos = data?.find(d => d.status === "Ativos")?.quantidade || 0;
  const percentualAtivos = total > 0 ? Math.round((ativos / total) * 100) : 0;

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <UserCheck className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Usuários por Status</CardTitle>
            <CardDescription className="text-xs">{percentualAtivos}% dos usuários ativos</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Legenda */}
        <div className="flex items-center justify-center gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors.Ativos }} />
            <span className="text-muted-foreground">Ativos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors.Inativos }} />
            <span className="text-muted-foreground">Inativos</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
            <XAxis 
              type="number" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="status" 
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
            <Bar 
              dataKey="quantidade" 
              radius={[0, 4, 4, 0]}
              maxBarSize={35}
            >
              {data?.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={statusColors[entry.status] || "hsl(var(--primary))"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

