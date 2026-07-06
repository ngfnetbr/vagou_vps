// @ts-nocheck
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
  AreaChart, Area
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card"
import { Badge } from "@ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/tabs"
import { BarChart3, PieChart as PieChartIcon, AlertTriangle, TrendingUp, Calendar } from "lucide-react"

const COLORS = [
  'hsl(217, 71%, 45%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(199, 89%, 48%)',
  'hsl(280, 65%, 55%)',
  'hsl(340, 75%, 55%)',
  'hsl(160, 60%, 45%)',
  'hsl(50, 90%, 50%)',
  'hsl(220, 60%, 60%)',
]

const tooltipStyle = {
  background: 'hsl(0, 0%, 100%)',
  border: '1px solid hsl(214, 32%, 91%)',
  borderRadius: '0.75rem',
  fontSize: '0.875rem',
}

interface ChartsProps {
  atendimentosPorDia: { name: string; total: number }[]
  atendimentosPorMes: { name: string; total: number }[]
  atendimentosPorEspecialidade: { name: string; value: number }[]
  dificuldadesData?: { name: string; value: number }[]
  tiposQueixaData?: { name: string; value: number }[]
}

export function DashboardCharts({ atendimentosPorDia, atendimentosPorMes, atendimentosPorEspecialidade, dificuldadesData, tiposQueixaData }: ChartsProps) {
  return (
    <div className="space-y-6">
      {/* Row 1: Atendimentos por dia/mês + por especialidade */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/50 pb-4 border-b">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
              <CardTitle className="text-sm font-semibold text-foreground">Atendimentos por Período</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs defaultValue="semana" className="space-y-4">
              <TabsList className="h-8">
                <TabsTrigger value="semana" className="text-xs px-3 h-7 gap-1"><Calendar className="h-3 w-3" /> Semana</TabsTrigger>
                <TabsTrigger value="mes" className="text-xs px-3 h-7 gap-1"><BarChart3 className="h-3 w-3" /> Meses</TabsTrigger>
              </TabsList>
              <TabsContent value="semana">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={atendimentosPorDia}>
                    <XAxis dataKey="name" stroke="hsl(215, 15%, 47%)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(215, 15%, 47%)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'hsl(210, 20%, 95%)' }} contentStyle={tooltipStyle} />
                    <Bar dataKey="total" name="Atendimentos" fill="hsl(217, 71%, 45%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="mes">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={atendimentosPorMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                    <XAxis dataKey="name" stroke="hsl(215, 15%, 47%)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(215, 15%, 47%)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="total" name="Atendimentos" stroke="hsl(217, 71%, 45%)" fill="hsl(217, 71%, 25%)" fillOpacity={0.15} strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="col-span-3 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/50 pb-4 border-b">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <PieChartIcon className="h-5 w-5" />
              </div>
              <CardTitle className="text-sm font-semibold text-foreground">Por Especialidade</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {atendimentosPorEspecialidade.length > 0 && atendimentosPorEspecialidade[0].value > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={atendimentosPorEspecialidade} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                      {atendimentosPorEspecialidade.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {atendimentosPorEspecialidade.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">Sem dados no período</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Transtornos / Dificuldades */}
      {((dificuldadesData && dificuldadesData.length > 0) || (tiposQueixaData && tiposQueixaData.length > 0)) && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-destructive/10 text-destructive rounded-lg">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground">Transtornos / Dificuldades</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Classificação baseada em queixas e laudos</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {dificuldadesData && dificuldadesData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={dificuldadesData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {dificuldadesData.map((_, i) => (
                          <Cell key={`diff-${i}`} fill={COLORS[i % COLORS.length]} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {dificuldadesData.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs font-semibold">{item.value}</Badge>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">Sem dados</div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground">Transtornos — Barras</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Visualização comparativa</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {dificuldadesData && dificuldadesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dificuldadesData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" horizontal={false} />
                    <XAxis type="number" stroke="hsl(215, 15%, 47%)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="hsl(215, 15%, 47%)" fontSize={11} tickLine={false} axisLine={false} width={100} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" name="Ocorrências" radius={[0, 6, 6, 0]}>
                      {dificuldadesData.map((_, i) => (
                        <Cell key={`bar-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">Sem dados</div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground">Tipos de Queixa</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Contagem por tipo informado</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {tiposQueixaData && tiposQueixaData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tiposQueixaData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" horizontal={false} />
                    <XAxis type="number" stroke="hsl(215, 15%, 47%)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="hsl(215, 15%, 47%)" fontSize={11} tickLine={false} axisLine={false} width={120} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" name="Queixas" fill="hsl(217, 71%, 45%)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">Sem dados</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

