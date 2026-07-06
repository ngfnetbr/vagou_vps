import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/common/Spinner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { useConvocacoesMensais } from "@/hooks/api/dashboard-hooks";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="font-semibold text-sm text-foreground mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground">Convocações:</span>
          <span className="text-xs font-bold text-primary">{payload[0].value}</span>
        </div>
      </div>
    );
  }
  return null;
};

export function ConvocacoesChart() {
  const { data, isLoading } = useConvocacoesMensais();

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Convocações Mensais</CardTitle>
              <CardDescription className="text-xs">Últimos 12 meses</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <Spinner className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Calculate total and average
  const total = data?.reduce((sum, item) => sum + item.quantidade, 0) || 0;
  const avg = data && data.length > 0 ? Math.round(total / data.length) : 0;

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Convocações Mensais</CardTitle>
              <CardDescription className="text-xs">Quantidade de convocações realizadas</CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{total}</p>
            <p className="text-xs text-muted-foreground">Total (média: {avg}/mês)</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorConvocacoes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey="mes" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="quantidade" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2.5}
              fillOpacity={1} 
              fill="url(#colorConvocacoes)"
              name="Convocações"
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, stroke: "hsl(var(--background))", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

