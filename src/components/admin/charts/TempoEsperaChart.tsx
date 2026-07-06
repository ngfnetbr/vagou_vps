import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInDays } from "date-fns";
import { Clock } from "lucide-react";
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

function getColorVariations(primaryHex: string | null | undefined) {
  const hsl = primaryHex ? hexToHsl(primaryHex) : null;
  const h = hsl?.h ?? 212;
  const s = hsl?.s ?? 80;
  return {
    "0-30": `hsl(${h}, ${s}%, 45%)`,
    "31-60": `hsl(${h}, ${Math.max(s - 10, 30)}%, 50%)`,
    "61-90": `hsl(${h}, ${Math.max(s - 20, 30)}%, 55%)`,
    "91-120": `hsl(${h}, ${Math.max(s - 30, 30)}%, 65%)`,
    "121-180": `hsl(${h}, ${Math.max(s - 40, 20)}%, 72%)`,
    "180+": `hsl(${h}, ${Math.max(s - 50, 20)}%, 80%)`,
  };
}

interface FaixaTempo {
  faixa: string;
  quantidade: number;
  color: string;
}

export function TempoEsperaChart() {
  const { data: config } = useConfiguracoesPublicas();
  const COLORS = getColorVariations(config?.tema_cor_primaria);

  const { data: distribuicao, isLoading } = useQuery({
    queryKey: ["distribuicao-tempo-espera", config?.tema_cor_primaria],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("criancas")
        .select("id, created_at")
        .eq("status", "Fila de Espera");

      if (error) throw error;

      const hoje = new Date();
      const faixas: Record<string, number> = {
        "0-30": 0,
        "31-60": 0,
        "61-90": 0,
        "91-120": 0,
        "121-180": 0,
        "180+": 0,
      };

      data?.forEach((crianca) => {
        if (!crianca.created_at) return;
        const dias = differenceInDays(hoje, new Date(crianca.created_at));

        if (dias <= 30) faixas["0-30"]++;
        else if (dias <= 60) faixas["31-60"]++;
        else if (dias <= 90) faixas["61-90"]++;
        else if (dias <= 120) faixas["91-120"]++;
        else if (dias <= 180) faixas["121-180"]++;
        else faixas["180+"]++;
      });

      const colors = getColorVariations(config?.tema_cor_primaria);
      return Object.entries(faixas).map(([faixa, quantidade]) => ({
        faixa: faixa === "180+" ? "180+ dias" : `${faixa} dias`,
        faixaKey: faixa,
        quantidade,
        color: colors[faixa as keyof typeof colors],
      }));
    },
  });

  const total = distribuicao?.reduce((acc, item) => acc + item.quantidade, 0) || 0;

  return (
    <Card className="bg-card border-0 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Distribuição do Tempo de Espera</CardTitle>
            <CardDescription className="text-xs">
              {total} crianças na fila de espera
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[250px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={distribuicao} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="faixa" 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip 
                formatter={(value: number) => [`${value} criança(s)`, "Quantidade"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="quantidade" radius={[4, 4, 0, 0]}>
                {distribuicao?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        
        {/* Legenda */}
        <div className="flex flex-wrap gap-3 mt-4 justify-center">
          {[
            { label: "Até 30d", key: "0-30" },
            { label: "31-60d", key: "31-60" },
            { label: "61-90d", key: "61-90" },
            { label: "91-120d", key: "91-120" },
            { label: "121-180d", key: "121-180" },
            { label: "180+d", key: "180+" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: COLORS[item.key as keyof typeof COLORS] }}
              />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

