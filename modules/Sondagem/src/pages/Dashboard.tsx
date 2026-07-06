// @ts-nocheck
import { Users, Clock, BookOpen, TrendingDown, Trophy, Medal, Filter, ClipboardList, LayoutDashboard } from "lucide-react";
import { useDashboardStats, useNiveis, useCMEIs } from "@sondagem/hooks/useSupabaseData";
import { useDashboardRanking } from "@sondagem/hooks/useDashboardRanking";
import { Skeleton } from "@ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card";
import { Progress } from "@ui/progress";
import { Badge } from "@ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select";
import { StatCard } from "@root/components/common/StatCard";
import { PageHeader } from "@root/components/common/page-header";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@sondagem/integrations/supabase/client";
import { useAuth } from "@root/contexts/AuthContext";
import { useCoordinatorSchoolId } from "@sondagem/lib/coordinatorScope";
import { getEscritaColor, getProducaoColor } from "@sondagem/lib/nivelColors";
import { fetchPrincipalCriancas } from "@sondagem/lib/principalData";
import { chunkArray } from "@sondagem/lib/queryUtils";
import { pickLatestSondagemIds } from "@sondagem/lib/sondagemAnalytics";
import { isMockAlunoId, resultadosSondagemMock } from "@sondagem/data/mockData";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface DashboardSondagemRow {
  id: string;
  crianca_id: string;
  created_at: string | null;
}

interface DashboardRespostaRow {
  sondagem_id: string;
  nivel_id: string;
}

interface SolicitacaoChartRow {
  id: string;
  status: string | null;
  created_at: string;
}

interface SolicitacaoStatusChartItem {
  name: string;
  value: number;
  color: string;
}

export default function Dashboard() {
  const { role } = useAuth();
  const coordinatorSchoolId = useCoordinatorSchoolId();
  const isCoordinator = role === "coordenador";

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("vagou_preferred_module", "sondagem");
  }, []);

  const { data: stats, isLoading } = useDashboardStats(coordinatorSchoolId);
  const { data: niveis = [] } = useNiveis();
  const { data: ranking = [], isLoading: isLoadingRanking } = useDashboardRanking(coordinatorSchoolId);
  const { data: cmeis = [] } = useCMEIs(coordinatorSchoolId);
  const [cmeiFilterEscrita, setCmeiFilterEscrita] = useState<string>(coordinatorSchoolId || "all");
  const [cmeiFilterProducao, setCmeiFilterProducao] = useState<string>(coordinatorSchoolId || "all");

  useEffect(() => {
    if (!isCoordinator || !coordinatorSchoolId) return;
    setCmeiFilterEscrita(coordinatorSchoolId);
    setCmeiFilterProducao(coordinatorSchoolId);
  }, [coordinatorSchoolId, isCoordinator]);

  const { data: totalAlunos } = useQuery({
    queryKey: ["total-alunos"],
    queryFn: async () => {
      const query = supabase.from("criancas").select("id", { count: "exact", head: true });
      const { count } = await query;
      return count || 0;
    },
  });

  const { data: totalCmeis } = useQuery({
    queryKey: ["total-cmeis"],
    queryFn: async () => {
      const { data } = await supabase.from("cmeis").select("id").eq("ativo", true);
      return (data || []).length;
    },
  });

  const { data: distribuicaoRaw = [] } = useQuery({
    queryKey: ["dashboard-distribuicao-raw", coordinatorSchoolId],
    queryFn: async () => {
      const sondagensQ = supabase
        .from("sondagens")
        .select("id, crianca_id, created_at")
        .eq("status", "finalizado")
        .order("created_at", { ascending: false });
      const { data: sondagensData, error: sondagensError } = await sondagensQ;
      if (sondagensError) throw sondagensError;

      const sondagens = (sondagensData || []) as DashboardSondagemRow[];

      const criancaIds = [...new Set(sondagens.map(s => s.crianca_id))];

      const { data: niveisAll } = await supabase
        .from("niveis_aprendizagem")
        .select("id, codigo, tipo")
        .eq("ativo", true);
      if (!niveisAll?.length) return [];

      const criancas = await fetchPrincipalCriancas(
        coordinatorSchoolId
          ? { ids: criancaIds, cmeiId: coordinatorSchoolId }
          : { ids: criancaIds },
      );

      const criancaCmeiMap = new Map((criancas || []).map(c => [c.id, c.cmei_id]));
      const usingMockData = (criancas || []).length > 0 && (criancas || []).every((item) => isMockAlunoId(item.id));
      const nivelIdToInfo = new Map(niveisAll.map(n => [n.id, { codigo: n.codigo, tipo: n.tipo }]));

      if (!sondagens?.length && usingMockData) {
        return resultadosSondagemMock
          .filter((item) => {
            const cmeiId = criancaCmeiMap.get(item.alunoId);
            return !coordinatorSchoolId || cmeiId === coordinatorSchoolId;
          })
          .flatMap((item) => {
            const cmeiId = criancaCmeiMap.get(item.alunoId) || null;
            return [
              { codigo: item.nivelEscritaCodigo, tipo: "escrita", cmeiId },
              { codigo: item.nivelProducaoCodigo, tipo: "producao_texto", cmeiId },
            ];
          });
      }

      const sondagensFiltradas = sondagens.filter((item) => criancaCmeiMap.has(item.crianca_id));
      if (!sondagensFiltradas.length) return [];

      const sondagemIds = sondagensFiltradas.map(s => s.id);

      const respostasChunks = await Promise.all(
        chunkArray(sondagemIds, 500).map(async (idsChunk) => {
          const { data, error } = await supabase
            .from("respostas_sondagem")
            .select("sondagem_id, nivel_id")
            .in("sondagem_id", idsChunk)
            .in("nivel_id", niveisAll.map(n => n.id));

          if (error) throw error;
          return (data || []) as DashboardRespostaRow[];
        }),
      );
      const respostas = respostasChunks.flat();

      const latestSondagemIds = pickLatestSondagemIds(sondagensFiltradas);
      const sondagemToCrianca = new Map(sondagensFiltradas.map(s => [s.id, s.crianca_id]));

      // Return raw entries with cmei_id for client-side filtering
      const entries: { codigo: string; tipo: string; cmeiId: string | null }[] = [];
      (respostas || []).forEach(r => {
        if (!latestSondagemIds.has(r.sondagem_id)) return;
        const info = nivelIdToInfo.get(r.nivel_id);
        if (!info) return;
        const criancaId = sondagemToCrianca.get(r.sondagem_id);
        const cmeiId = criancaId ? criancaCmeiMap.get(criancaId) : null;
        entries.push({ codigo: info.codigo, tipo: info.tipo, cmeiId: cmeiId });
      });
      return entries;
    },
  });

  const { data: solicitacoesCharts } = useQuery({
    queryKey: ["dashboard-solicitacoes-charts", coordinatorSchoolId],
    queryFn: async () => {
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const today = new Date();
      const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString();

      let query = supabase
        .from("solicitacoes_sondagem")
        .select("id, status, created_at")
        .gte("created_at", sixMonthsAgo)
        .order("created_at", { ascending: true });
      if (coordinatorSchoolId) {
        query = query.eq("cmei_id", coordinatorSchoolId);
      }
      const { data, error } = await query;
      if (error) throw error;

      const statusMap: Record<string, number> = { pendente: 0, em_andamento: 0, concluida: 0 };
      const monthMap = new Map<string, { pendente: number; em_andamento: number; concluida: number }>();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
        monthMap.set(key, { pendente: 0, em_andamento: 0, concluida: 0 });
      }

      ((data || []) as SolicitacaoChartRow[]).forEach((s) => {
        const st = String(s.status || "").toLowerCase();
        const normalized = st === "em_andamento" || st === "concluida" || st === "pendente" ? st : "pendente";
        statusMap[normalized] = (statusMap[normalized] || 0) + 1;

        const d = new Date(s.created_at);
        const key = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
        const current = monthMap.get(key);
        if (current) current[normalized] = (current[normalized] || 0) + 1;
      });

      const byStatus = [
        { name: "Pendente", value: statusMap.pendente, color: "hsl(38, 92%, 50%)" },
        { name: "Em andamento", value: statusMap.em_andamento, color: "hsl(217, 71%, 45%)" },
        { name: "Concluída", value: statusMap.concluida, color: "hsl(142, 71%, 40%)" },
      ];

      const byMonth = Array.from(monthMap.entries()).map(([name, v]) => ({
        name,
        pendente: v.pendente,
        em_andamento: v.em_andamento,
        concluida: v.concluida,
        total: v.pendente + v.em_andamento + v.concluida,
      }));

      return { byStatus, byMonth };
    },
  });

  const distribuicaoData = useMemo(() => {
    const escrita: Record<string, number> = {};
    const producao: Record<string, number> = {};
    distribuicaoRaw.forEach(e => {
      if (e.tipo === "escrita") {
        if (cmeiFilterEscrita !== "all" && e.cmeiId !== cmeiFilterEscrita) return;
        escrita[e.codigo] = (escrita[e.codigo] || 0) + 1;
      }
      if (e.tipo === "producao_texto") {
        if (cmeiFilterProducao !== "all" && e.cmeiId !== cmeiFilterProducao) return;
        producao[e.codigo] = (producao[e.codigo] || 0) + 1;
      }
    });
    return { escrita, producao };
  }, [distribuicaoRaw, cmeiFilterEscrita, cmeiFilterProducao]);

  const niveisEscrita = useMemo(() => niveis.filter(n => n.tipo === "escrita"), [niveis]);
  const niveisProducao = useMemo(() => niveis.filter(n => n.tipo === "producao_texto"), [niveis]);
  const totalEscrita = useMemo(() => Object.values(distribuicaoData.escrita).reduce((a, b) => a + b, 0), [distribuicaoData]);
  const totalProducao = useMemo(() => Object.values(distribuicaoData.producao).reduce((a, b) => a + b, 0), [distribuicaoData]);

  const escritaPieData = useMemo(() => {
    return niveisEscrita
      .map((nivel) => ({
        name: nivel.codigo,
        label: nivel.descricao,
        value: distribuicaoData.escrita[nivel.codigo] || 0,
        color: getEscritaColor(nivel.codigo),
      }))
      .filter((d) => d.value > 0);
  }, [niveisEscrita, distribuicaoData]);

  const producaoPieData = useMemo(() => {
    return niveisProducao
      .map((nivel) => ({
        name: nivel.codigo,
        label: nivel.descricao,
        value: distribuicaoData.producao[nivel.codigo] || 0,
        color: getProducaoColor(nivel.codigo),
      }))
      .filter((d) => d.value > 0);
  }, [niveisProducao, distribuicaoData]);

  const naoAtingiram = stats?.avaliados ? 100 - (stats?.percentAlfabetizados ?? 0) : 0;
  const cards = [
    {
      title: "Total Avaliados",
      value: stats?.avaliados ?? 0,
      icon: Users,
      subtitle: `de ${stats?.totalCriancas ?? 0} crianças cadastradas`,
      accent: "info" as const,
    },
    {
      title: "Pendentes",
      value: stats?.pendentes ?? 0,
      icon: Clock,
      subtitle: "aguardando sondagem",
      accent: "warning" as const,
    },
    {
      title: "Alfabetizados",
      value: `${stats?.percentAlfabetizados ?? 0}%`,
      icon: BookOpen,
      subtitle: `${stats?.alfabetizados ?? 0} do total avaliado`,
      accent: "success" as const,
    },
    {
      title: "Não Atingiram",
      value: `${naoAtingiram}%`,
      icon: TrendingDown,
      subtitle: `${(stats?.avaliados ?? 0) - (stats?.alfabetizados ?? 0)} do total avaliado`,
      accent: "destructive" as const,
    },
  ];

  return (
    <>
      <div className="space-y-8">
      <PageHeader
        leading={
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LayoutDashboard className="h-6 w-6" />
          </div>
        }
        title="Painel da Sondagem"
        description="Acompanhe a evolução da alfabetização e das solicitações em tempo real."
      />
      <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-6">
        {cards.map((card, index) => (
          isLoading ? (
            <div key={card.title} className="rounded-lg border bg-card p-5 shadow-sm">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-9 w-20" />
            </div>
          ) : (
            <StatCard
              key={card.title}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              accent={card.accent}
              index={index}
            />
          )
        ))}
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Nível com cores */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold">Distribuição por Nível – Escrita</CardTitle>
              <Select value={cmeiFilterEscrita} onValueChange={setCmeiFilterEscrita} disabled={isCoordinator}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <Filter className="h-3 w-3 mr-1 flex-shrink-0" />
                  <SelectValue placeholder={isCoordinator ? "Sua instituição" : "Todas as instituições"} />
                </SelectTrigger>
                <SelectContent>
                  {!isCoordinator && <SelectItem value="all">Todas as instituições</SelectItem>}
                  {cmeis.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : niveisEscrita.length > 0 ? (
              <div className="space-y-3">
                {escritaPieData.length > 0 && (
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={escritaPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                          {escritaPieData.map((entry, i) => (
                            <Cell key={`escrita-${i}`} fill={entry.color} strokeWidth={0} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {niveisEscrita.map(nivel => {
                  const color = getEscritaColor(nivel.codigo);
                  const count = distribuicaoData.escrita[nivel.codigo] || 0;
                  const pct = totalEscrita > 0 ? Math.round((count / totalEscrita) * 100) : 0;
                  return (
                    <div key={nivel.id} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-sm font-medium min-w-[90px]" style={{ color }}>{nivel.descricao}</span>
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ backgroundColor: color, width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground min-w-[32px] text-right">{count}</span>
                    </div>
                  );
                })}
                {totalEscrita === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">Nenhuma sondagem finalizada ainda.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum nível cadastrado.</p>
            )}
          </CardContent>
        </Card>

        {/* Distribuição por Nível – Produção de Texto */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold">Distribuição por Nível – Produção de Texto</CardTitle>
              <Select value={cmeiFilterProducao} onValueChange={setCmeiFilterProducao} disabled={isCoordinator}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <Filter className="h-3 w-3 mr-1 flex-shrink-0" />
                  <SelectValue placeholder={isCoordinator ? "Sua instituição" : "Todas as instituições"} />
                </SelectTrigger>
                <SelectContent>
                  {!isCoordinator && <SelectItem value="all">Todas as instituições</SelectItem>}
                  {cmeis.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : niveisProducao.length > 0 ? (
              <div className="space-y-3">
                {producaoPieData.length > 0 && (
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={producaoPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                          {producaoPieData.map((entry, i) => (
                            <Cell key={`producao-${i}`} fill={entry.color} strokeWidth={0} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {niveisProducao.map(nivel => {
                  const color = getProducaoColor(nivel.codigo);
                  const count = distribuicaoData.producao[nivel.codigo] || 0;
                  const pct = totalProducao > 0 ? Math.round((count / totalProducao) * 100) : 0;
                  return (
                    <div key={nivel.id} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs font-medium min-w-[90px]" style={{ color }}>{nivel.descricao}</span>
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ backgroundColor: color, width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground min-w-[32px] text-right">{count}</span>
                    </div>
                  );
                })}
                {totalProducao === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">Nenhuma sondagem finalizada ainda.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum nível cadastrado.</p>
            )}
          </CardContent>
        </Card>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-semibold">Solicitações de Sondagem – Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {solicitacoesCharts?.byStatus?.some((s) => s.value > 0) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={solicitacoesCharts.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                        {solicitacoesCharts.byStatus.map((entry: SolicitacaoStatusChartItem, i: number) => (
                          <Cell key={`sol-${i}`} fill={entry.color} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {solicitacoesCharts.byStatus.map((s: SolicitacaoStatusChartItem) => (
                    <div key={s.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-muted-foreground">{s.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem solicitações nos últimos 6 meses.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Solicitações – Últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            {solicitacoesCharts?.byMonth?.length ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={solicitacoesCharts.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                    <XAxis dataKey="name" stroke="hsl(215, 15%, 47%)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(215, 15%, 47%)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="pendente" stackId="a" fill="hsl(38, 92%, 50%)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="em_andamento" stackId="a" fill="hsl(217, 71%, 45%)" />
                    <Bar dataKey="concluida" stackId="a" fill="hsl(142, 71%, 40%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Escolas por Meta */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm font-semibold">Ranking de Escolas – Atingimento de Meta</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingRanking ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : ranking.length > 0 ? (
            <div className="space-y-3">
              {ranking.map((item, index) => {
                const medalColor = index === 0 ? "hsl(45, 93%, 47%)" : index === 1 ? "hsl(0, 0%, 70%)" : index === 2 ? "hsl(30, 60%, 50%)" : undefined;
                return (
                  <div key={item.cmeiId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold text-sm text-muted-foreground flex-shrink-0">
                      {index < 3 ? (
                        <Medal className="h-5 w-5" style={{ color: medalColor }} />
                      ) : (
                        <span>{index + 1}°</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground truncate">{item.cmeiNome}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={item.percentual >= 70 ? "default" : item.percentual >= 40 ? "secondary" : "destructive"} className="text-xs">
                            {item.percentual}%
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={item.percentual} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {item.atingiramMeta}/{item.totalAvaliados}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground mt-2">
                Meta de referência: nível <span className="font-semibold">{ranking[0]?.metaNivel}</span> (Escrita)
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma meta cadastrada ou sondagem finalizada para gerar o ranking.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}
