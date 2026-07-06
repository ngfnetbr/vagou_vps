import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/common/Spinner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Users } from "lucide-react";
import { useUsuariosPorRole } from "@/hooks/api/usuarios-stats-hooks";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";

const roleLabels: Record<string, string> = {
  responsavel: "Responsável",
  gestor: "Gestor",
  admin: "Admin",
  superadmin: "Super Admin",
  diretor_cmei: "Diretor (VAGOU)",
  school_coord: "Portal da Escola",
};

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

function getRoleColors(primaryHex: string | null | undefined) {
  const hsl = primaryHex ? hexToHsl(primaryHex) : null;
  const h = hsl?.h ?? 212;
  const s = hsl?.s ?? 80;
  return [
    `hsl(${h}, ${s}%, 45%)`,
    `hsl(${h}, ${Math.max(s - 10, 30)}%, 50%)`,
    `hsl(${h}, ${Math.max(s - 20, 30)}%, 58%)`,
    `hsl(${h}, ${Math.max(s - 30, 30)}%, 66%)`,
    `hsl(${h}, ${Math.max(s - 40, 20)}%, 74%)`,
  ];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border rounded-lg shadow-lg p-3">
        <p className="font-semibold text-sm text-foreground">{data.label}</p>
        <p className="text-xs text-muted-foreground">
          {data.quantidade} usuário{data.quantidade !== 1 ? "s" : ""}
        </p>
      </div>
    );
  }
  return null;
};

export function UsuariosPorRoleChart() {
  const { data, isLoading } = useUsuariosPorRole();
  const { data: config } = useConfiguracoesPublicas();
  const COLORS = getRoleColors(config?.tema_cor_primaria);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Usuários por Papel</CardTitle>
              <CardDescription className="text-xs">Distribuição de papéis</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <Spinner className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data?.map((item, index) => ({
    ...item,
    label: roleLabels[item.role] || item.role,
    fill: COLORS[index % COLORS.length],
  }));

  const total = chartData?.reduce((acc, item) => acc + item.quantidade, 0) || 0;

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Usuários por Papel</CardTitle>
            <CardDescription className="text-xs">{total} usuários no total</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="quantidade"
              nameKey="label"
            >
              {chartData?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              formatter={(value) => (
                <span className="text-xs text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
