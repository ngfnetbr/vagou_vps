import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Spinner } from "@/components/common/Spinner";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, LayoutGrid, MapPin, RotateCcw, School, TrendingUp, Users } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  PieChart,
  Pie,
  LabelList,
} from "recharts";

const CHART_COLORS = [
  "hsl(214, 73%, 45%)",
  "hsl(142, 71%, 42%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 72%, 55%)",
  "hsl(190, 80%, 42%)",
  "hsl(330, 70%, 55%)",
  "hsl(160, 60%, 40%)",
];
import { ResponsiveGridLayout, type Layout } from "react-grid-layout";

type Layouts = { [key: string]: Layout };
const RGL = ResponsiveGridLayout as unknown as React.ComponentType<any>;
import {
  type BIFiltros,
  type BIPeriodo,
  type BIStatusFiltro,
  type BIZonaFiltro,
  type BITurnoFiltro,
  useBIConvocadosPorCMEI,
  useBIMediaDiasNaFilaPorCMEI,
  useBINovasInscricoesMensal,
  useBIStatusDistribuicao,
  useBIDemandaPorBairro,
  useBIDemandaPorCMEI,
  useBIDemandaPorTurnoInteresse,
  useBIDemandaPorZona,
} from "@/hooks/api/dashboard-hooks";
import { useCMEIs, useOcupacaoCMEIs, useOcupacaoTurmasPublic } from "@/hooks/api/supabase-hooks";
import { useZonasAtendimentoAtivas } from "@/hooks/api/zonas-hooks";
import { useDebounce } from "@/hooks/use-debounce";
import { useElementWidth } from "@/hooks/use-element-width";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { useUserDashboardLayout } from "@/hooks/api/dashboard-layout-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";
import { getErrorMessage } from "@/utils/error-utils";
import { runBIExport, type ExportFormat, type ExportSection } from "@/utils/bi-export";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const periodos: Array<{ value: BIPeriodo; label: string }> = [
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "365d", label: "Últimos 12 meses" },
  { value: "all", label: "Tudo" },
];

const statusOptions: Array<{ value: BIStatusFiltro; label: string }> = [
  { value: "demanda", label: "Demanda (Fila + Convocado)" },
  { value: "todos", label: "Todos" },
  { value: "fila", label: "Fila de Espera" },
  { value: "convocado", label: "Convocado" },
  { value: "aguardando_documentacao", label: "Aguardando Documentação" },
  { value: "matriculado", label: "Matriculado" },
  { value: "desistente", label: "Desistente" },
  { value: "recusada", label: "Recusada" },
];

const turnoOptions: Array<{ value: BITurnoFiltro; label: string }> = [
  { value: "all", label: "Todos os turnos" },
  { value: "Matutino", label: "Matutino" },
  { value: "Vespertino", label: "Vespertino" },
  { value: "Integral", label: "Integral" },
  { value: "__sem_periodo__", label: "Não informado" },
];

const abbreviate = (name: string) => {
  if (name.length <= 14) return name;
  const words = name.replace(/^zona\s*/i, "").split(" ");
  let acc = "";
  for (const w of words) {
    const next = acc ? `${acc} ${w}` : w;
    if (next.length <= 12) acc = next;
    else break;
  }
  return acc || name.slice(0, 12) + "…";
};

const formatBairro = (value: string) => {
  if (value === "__sem_bairro__") return "Não informado";
  return value
    .split(" ")
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ");
};

const formatPeriodo = (value: string) => {
  if (value === "__sem_periodo__") return "Não informado";
  return value
    .split(" ")
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ");
};

const getOcupacaoVariant = (percentual: number) => {
  if (percentual >= 90) return "destructive";
  if (percentual >= 70) return "warning";
  return "success";
};

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number>();
  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    const safeTarget = Number.isFinite(target) ? target : 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (safeTarget - from) * eased;
      setValue(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = safeTarget;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);
  return value;
}

function AnimatedCount({ value }: { value: number }) {
  const animated = useCountUp(value);
  return <>{Math.round(animated).toLocaleString("pt-BR")}</>;
}

function ChartTooltip({ active, payload, total }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const value = p?.value ?? p?.payload?.value ?? 0;
  const pct = total ? Math.round((value / total) * 100) : null;
  return (
    <div className="bg-card border rounded-lg shadow-lg px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p?.payload?.fill || p?.color }} />
        <p className="font-semibold text-sm">{p?.name ?? p?.payload?.name}</p>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">
        <span className="font-medium text-foreground">{value}</span>
        {pct !== null ? <span> • {pct}%</span> : null}
      </p>
    </div>
  );
}

function BIDonut({ data }: { data: Array<{ name: string; value: number }> }) {
  const cleaned = (data || []).filter((d) => d.value > 0);
  const total = cleaned.reduce((acc, d) => acc + d.value, 0);
  if (!cleaned.length) {
    return <div className="text-sm text-muted-foreground py-6 text-center">Sem dados no período.</div>;
  }
  return (
    <div className="h-full w-full flex items-center gap-3 min-h-0">
      <div className="relative h-full flex-1 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={cleaned}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="hsl(var(--card))"
              strokeWidth={2}
              isAnimationActive
              animationDuration={900} animationEasing="ease-out"
            >
              {cleaned.map((_, idx) => (
                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={(props) => <ChartTooltip {...props} total={total} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold leading-none tabular-nums">{total.toLocaleString("pt-BR")}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</span>
        </div>
      </div>
      <div className="flex-1 min-w-0 max-h-full overflow-auto space-y-1.5 pr-1">
        {cleaned.map((d, idx) => {
          const pct = total ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
              />
              <span className="truncate flex-1 min-w-0">{d.name}</span>
              <span className="font-semibold tabular-nums">{d.value}</span>
              <span className="text-muted-foreground tabular-nums w-9 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function BIHorizontalBar({ data }: { data: Array<{ name: string; value: number }> }) {
  const cleaned = (data || []).filter((d) => d.value > 0);
  if (!cleaned.length) {
    return <div className="text-sm text-muted-foreground py-6 text-center">Sem dados no período.</div>;
  }
  const total = cleaned.reduce((acc, d) => acc + d.value, 0);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={cleaned} layout="vertical" margin={{ top: 4, right: 28, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.4)" }} content={(props) => <ChartTooltip {...props} total={total} />} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive animationDuration={900} animationEasing="ease-out">
          {cleaned.map((_, idx) => (
            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
          ))}
          <LabelList dataKey="value" position="right" className="fill-foreground" style={{ fontSize: 11, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface BIStatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBgClass: string;
  isLoading?: boolean;
}

function BIStatCard({ title, value, icon, iconBgClass, isLoading }: BIStatCardProps) {
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  const isNumeric = typeof value === "number" || (value !== "" && Number.isFinite(numeric));
  return (
    <Card className="group relative overflow-hidden bg-card border border-border/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1.5" />
            ) : (
              <p className="text-3xl font-bold tabular-nums mt-1 leading-none">
                {isNumeric ? <AnimatedCount value={numeric} /> : value}
              </p>
            )}
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${iconBgClass}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>

  );
}


function BIBlockSkeleton({ height }: { height: number }) {
  return (
    <Card className="bg-card border-0 shadow-md">
      <CardHeader className="pb-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-44 mb-1" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Skeleton className="w-full" style={{ height }} />
      </CardContent>
    </Card>
  );
}

function BIEmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-6 text-center text-sm text-muted-foreground">
        {label}
      </TableCell>
    </TableRow>
  );
}

function BIWidgetCard({
  title,
  description,
  icon,
  iconBgClass,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  iconBgClass: string;
  children: ReactNode;
}) {
  return (
    <Card className="border border-border/40 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col animate-fade-in">
      <CardHeader className="pb-1">
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${iconBgClass}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base truncate">{title}</CardTitle>
            <CardDescription className="text-xs truncate">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1 min-h-0">
        <div className="h-full min-h-0">{children}</div>
      </CardContent>
    </Card>
  );
}

export function BIContent() {
  const [periodo, setPeriodo] = useState<BIPeriodo>("90d");
  const [cmeiFocusId, setCmeiFocusId] = useState<string>("all");
  const [statusFiltro, setStatusFiltro] = useState<BIStatusFiltro>("demanda");
  const [zonaFiltro, setZonaFiltro] = useState<BIZonaFiltro>("all");
  const [turnoFiltro, setTurnoFiltro] = useState<BITurnoFiltro>("all");
  const [bairroFiltro, setBairroFiltro] = useState<string>("");
  const { debouncedValue: bairroDebounced, isDebouncing: debouncingBairro } = useDebounce(bairroFiltro, 350);
  const [turmasPage, setTurmasPage] = useState<number>(1);
  const [turmasPageSize, setTurmasPageSize] = useState<number>(10);
  const { data: configSistema } = useConfiguracoesSistema();
  const { singular, plural } = getUnidadeLabels(configSistema as any);

  const { data: cmeis, isLoading: loadingCmeis, error: errorCmeisList } = useCMEIs();
  const { data: zonasAtivas, isLoading: loadingZonasAtivas, error: errorZonasAtivas } = useZonasAtendimentoAtivas();

  const filtros: BIFiltros = useMemo(
    () => ({
      periodo,
      cmeiId: cmeiFocusId === "all" ? "all" : cmeiFocusId,
      status: statusFiltro,
      zonaId: zonaFiltro,
      bairro: bairroDebounced,
      turno: turnoFiltro,
    }),
    [periodo, cmeiFocusId, statusFiltro, zonaFiltro, bairroDebounced, turnoFiltro],
  );

  const { data: demandaZonas, isLoading: loadingZonas, error: errorZonas } = useBIDemandaPorZona(filtros);
  const { data: demandaCmeis, isLoading: loadingDemandaCmeis, error: errorCmeis } = useBIDemandaPorCMEI(filtros);
  const { data: demandaBairros, isLoading: loadingBairros, error: errorBairros } = useBIDemandaPorBairro(filtros);
  const { data: demandaPeriodos, isLoading: loadingPeriodos, error: errorPeriodos } = useBIDemandaPorTurnoInteresse(filtros);
  const { data: statusDistribuicao, isLoading: loadingStatus, error: errorStatus } = useBIStatusDistribuicao(filtros);
  const { data: inscricoesMensal, isLoading: loadingInscricoesMensal, error: errorInscricoesMensal } =
    useBINovasInscricoesMensal(filtros);
  const { data: mediaDiasFilaPorCmei, isLoading: loadingMediaFila, error: errorMediaFila } = useBIMediaDiasNaFilaPorCMEI(filtros);
  const { data: convocadosPorCmei, isLoading: loadingConvocados, error: errorConvocados } = useBIConvocadosPorCMEI(filtros);
  const { data: ocupacaoCmeis, isLoading: loadingOcupacao, error: errorOcupacao } = useOcupacaoCMEIs();
  const { data: ocupacaoTurmas, isLoading: loadingOcupacaoTurmas, error: errorOcupacaoTurmas } = useOcupacaoTurmasPublic();

  const isLoading =
    loadingCmeis ||
    loadingZonasAtivas ||
    loadingZonas ||
    loadingDemandaCmeis ||
    loadingBairros ||
    loadingPeriodos ||
    loadingStatus ||
    loadingInscricoesMensal ||
    loadingMediaFila ||
    loadingConvocados ||
    loadingOcupacao ||
    loadingOcupacaoTurmas;
  const hasError = !!(
    errorCmeisList ||
    errorZonasAtivas ||
    errorZonas ||
    errorCmeis ||
    errorBairros ||
    errorPeriodos ||
    errorStatus ||
    errorInscricoesMensal ||
    errorMediaFila ||
    errorConvocados ||
    errorOcupacao ||
    errorOcupacaoTurmas
  );

  const firstError =
    errorCmeisList ||
    errorZonasAtivas ||
    errorZonas ||
    errorCmeis ||
    errorBairros ||
    errorPeriodos ||
    errorStatus ||
    errorInscricoesMensal ||
    errorMediaFila ||
    errorConvocados ||
    errorOcupacao ||
    errorOcupacaoTurmas;
  const errorMessage = firstError ? getErrorMessage(firstError) : null;

  const cmeiNomeById = useMemo(() => {
    const map = new Map<string, string>();
    (cmeis || []).forEach((c) => map.set(c.id, c.nome));
    return map;
  }, [cmeis]);

  const cmeiTipoGestaoById = useMemo(() => {
    const map = new Map<string, "municipal" | "privado">();
    (cmeis || []).forEach((c: any) => map.set(c.id, (c.tipo_gestao || "municipal") as any));
    return map;
  }, [cmeis]);

  const renderTipoGestaoBadge = (cmeiId: string) => {
    const tipo = cmeiTipoGestaoById.get(cmeiId) || "municipal";
    return (
      <Badge variant={tipo === "privado" ? "warning" : "info"} className="text-[10px] px-1.5 py-0 h-4 shrink-0">
        {tipo === "privado" ? "Privado" : "Municipal"}
      </Badge>
    );
  };

  const topZonas = useMemo(() => {
    const items = demandaZonas || [];
    return items.slice(0, 10).map((z) => ({
      ...z,
      nomeAbreviado: abbreviate(z.nome),
    }));
  }, [demandaZonas]);

  const topBairros = useMemo(() => {
    const items = demandaBairros || [];
    return items.slice(0, 12);
  }, [demandaBairros]);

  const topPeriodos = useMemo(() => {
    const items = demandaPeriodos || [];
    return items.slice(0, 8);
  }, [demandaPeriodos]);

  const cmeisInsights = useMemo(() => {
    const demandaById = new Map<string, any>((demandaCmeis || []).map((d: any) => [d.cmeiId, d]));
    return (ocupacaoCmeis || [])
      .map((c) => {
        const d = demandaById.get(c.id);
        const capacidade = c.capacidade_total || 0;
        const ocupados = c.ocupados || 0;
        const vagas = Math.max(0, capacidade - ocupados);
        const score = d?.score || 0;
        const pressao = score / Math.max(vagas, 1);
        return {
          id: c.id,
          nome: c.nome,
          capacidade,
          ocupados,
          vagas,
          percentual: c.percentual || 0,
          pref1: d?.pref1 || 0,
          pref2: d?.pref2 || 0,
          pref3: d?.pref3 || 0,
          score,
          pressao,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [ocupacaoCmeis, demandaCmeis]);

  const cmeisPressao = useMemo(() => {
    return [...cmeisInsights].sort((a, b) => b.pressao - a.pressao);
  }, [cmeisInsights]);

  const cmeisPressaoTabela = useMemo(() => {
    return cmeiFocusId === "all" ? cmeisPressao : cmeisPressao.filter((c) => c.id === cmeiFocusId);
  }, [cmeisPressao, cmeiFocusId]);

  const cmeisInsightsTabela = useMemo(() => {
    return cmeiFocusId === "all" ? cmeisInsights : cmeisInsights.filter((c) => c.id === cmeiFocusId);
  }, [cmeisInsights, cmeiFocusId]);

  const turmasMaisLotadas = useMemo(() => {
    const all = (ocupacaoTurmas || []).map((t: any) => ({
      id: t.id,
      nome: t.nome,
      turma_base: t.turma_base,
      turno: t.turno,
      capacidade: t.capacidade || 0,
      ocupados: t.ocupados || 0,
      percentual: t.percentual || 0,
      vagas: Math.max(0, (t.capacidade || 0) - (t.ocupados || 0)),
      cmei_id: t.cmei_id,
      cmei_nome: t.cmei_nome || `Sem ${singular}`,
    }));

    const filtered = cmeiFocusId === "all" ? all : all.filter((t) => t.cmei_id === cmeiFocusId);
    return filtered.sort((a, b) => b.percentual - a.percentual);
  }, [ocupacaoTurmas, cmeiFocusId, singular]);

  const turmasTotalItems = turmasMaisLotadas.length;
  const turmasTotalPages = Math.max(1, Math.ceil(turmasTotalItems / turmasPageSize));
  const turmasHasPreviousPage = turmasPage > 1;
  const turmasHasNextPage = turmasPage < turmasTotalPages;
  const turmasPageClamped = Math.min(Math.max(turmasPage, 1), turmasTotalPages);
  const turmasStartIndex = (turmasPageClamped - 1) * turmasPageSize;
  const turmasMaisLotadasPaginadas = turmasMaisLotadas.slice(turmasStartIndex, turmasStartIndex + turmasPageSize);

  const filaMediaPorCmeiTabela = useMemo(() => {
    const all = (mediaDiasFilaPorCmei || []).map((i) => ({
      cmeiId: i.cmeiId,
      cmeiNome: cmeiNomeById.get(i.cmeiId) || `${singular} não encontrado`,
      quantidade: i.quantidade,
      mediaDias: i.mediaDias,
      maxDias: i.maxDias,
    }));
    return (cmeiFocusId === "all" ? all : all.filter((i) => i.cmeiId === cmeiFocusId)).slice(0, 15);
  }, [mediaDiasFilaPorCmei, cmeiNomeById, cmeiFocusId, singular]);

  const convocadosPorCmeiTabela = useMemo(() => {
    const all = (convocadosPorCmei || []).map((i) => ({
      cmeiId: i.cmeiId,
      cmeiNome: cmeiNomeById.get(i.cmeiId) || `${singular} não encontrado`,
      quantidade: i.quantidade,
    }));
    return (cmeiFocusId === "all" ? all : all.filter((i) => i.cmeiId === cmeiFocusId)).slice(0, 15);
  }, [convocadosPorCmei, cmeiNomeById, cmeiFocusId, singular]);

  const statusTop = useMemo(() => {
    return (statusDistribuicao || []).slice(0, 8);
  }, [statusDistribuicao]);

  const kpis = useMemo(() => {
    const totalDemanda = (demandaCmeis || []).reduce((acc, d) => acc + d.pref1 + d.pref2 + d.pref3, 0);
    const semZona = (demandaZonas || []).find((z) => z.zonaId === "__sem_zona__")?.quantidade || 0;
    const criticos = (ocupacaoCmeis || []).filter((c) => (c.percentual || 0) >= 90).length;
    return { totalDemanda, semZona, criticos };
  }, [demandaCmeis, demandaZonas, ocupacaoCmeis]);

  const periodoLabel = useMemo(() => periodos.find((p) => p.value === periodo)?.label || "Período", [periodo]);
  const statusLabel = useMemo(
    () => statusOptions.find((s) => s.value === statusFiltro)?.label || "Status",
    [statusFiltro],
  );
  const turnoLabel = useMemo(
    () => turnoOptions.find((t) => t.value === turnoFiltro)?.label || "Turno",
    [turnoFiltro],
  );
  const zonaLabel = useMemo(() => {
    if (zonaFiltro === "all") return "Todas as zonas";
    if (zonaFiltro === "__sem_zona__") return "Sem zona";
    return (zonasAtivas || []).find((z) => z.id === zonaFiltro)?.nome || "Zona";
  }, [zonaFiltro, zonasAtivas]);

  const activeFilters = useMemo(() => {
    const items: Array<{ key: string; label: string }> = [];
    if (periodo !== "90d") items.push({ key: "periodo", label: periodoLabel });
    if (cmeiFocusId !== "all") items.push({ key: "cmei", label: cmeiNomeById.get(cmeiFocusId) || singular });
    if (statusFiltro !== "demanda") items.push({ key: "status", label: statusLabel });
    if (zonaFiltro !== "all") items.push({ key: "zona", label: `Zona: ${zonaLabel}` });
    if (turnoFiltro !== "all") items.push({ key: "turno", label: `Turno: ${turnoLabel}` });
    if (bairroDebounced?.trim()) items.push({ key: "bairro", label: `Bairro: ${bairroDebounced.trim()}` });
    return items;
  }, [
    periodo,
    periodoLabel,
    cmeiFocusId,
    cmeiNomeById,
    singular,
    statusFiltro,
    statusLabel,
    zonaFiltro,
    zonaLabel,
    turnoFiltro,
    turnoLabel,
    bairroDebounced,
  ]);

  const canClearFilters =
    bairroFiltro ||
    zonaFiltro !== "all" ||
    turnoFiltro !== "all" ||
    statusFiltro !== "demanda" ||
    cmeiFocusId !== "all" ||
    periodo !== "90d";

  const exportSections = useMemo<ExportSection[]>(() => {
    return [
      {
        id: "kpis",
        title: "Indicadores principais",
        columns: ["Indicador", "Valor"],
        rows: [
          ["Procura (preferências)", kpis.totalDemanda],
          ["Sem zona detectada", kpis.semZona],
          [`${plural} críticos (≥90%)`, kpis.criticos],
          [`${plural} com demanda`, (demandaCmeis || []).length],
        ],
      },
      {
        id: "novas_inscricoes",
        title: "Novas inscrições (12 meses)",
        columns: ["Mês", "Novas inscrições"],
        rows: (inscricoesMensal || []).map((m: any) => [m.mes, m.quantidade]),
      },
      {
        id: "status_distribuicao",
        title: "Distribuição por status",
        columns: ["Status", "Quantidade"],
        rows: statusTop.map((s) => [s.status, s.quantidade]),
      },
      {
        id: "zonas_procura",
        title: "Zonas com maior procura",
        columns: ["Zona", "Procura"],
        rows: topZonas.map((z) => [z.nome, z.quantidade]),
      },
      {
        id: "bairros_procura",
        title: "Bairros com maior procura",
        columns: ["Bairro", "Procura"],
        rows: topBairros.map((b) => [formatBairro(b.bairro), b.quantidade]),
      },
      {
        id: "procura_turno",
        title: "Procura por turno",
        columns: ["Turno", "Procura"],
        rows: topPeriodos.map((p) => [formatPeriodo(p.periodoTurno), p.quantidade]),
      },
      {
        id: "cmeis_pressao",
        title: `${plural} com maior pressão`,
        columns: [singular, "Pressão", "Vagas", "Ocupação %"],
        rows: cmeisPressaoTabela.map((c) => [c.nome, c.pressao.toFixed(2), c.vagas, Math.round(c.percentual)]),
      },
      {
        id: "tempo_medio_fila",
        title: "Tempo médio na fila",
        columns: [singular, "Média (dias)", "Máx (dias)", "Qtd"],
        rows: filaMediaPorCmeiTabela.map((r) => [r.cmeiNome, r.mediaDias, r.maxDias, r.quantidade]),
      },
      {
        id: "convocados_por_cmei",
        title: `Convocados por ${singular}`,
        columns: [singular, "Convocados"],
        rows: convocadosPorCmeiTabela.map((r) => [r.cmeiNome, r.quantidade]),
      },
      {
        id: "turmas_mais_lotadas",
        title: "Turmas mais lotadas",
        columns: [singular, "Turma", "Turno", "Ocupação %", "Vagas"],
        rows: turmasMaisLotadas.map((t) => [
          t.cmei_nome,
          [t.turma_base, t.nome].filter(Boolean).join(" "),
          t.turno || "—",
          Math.round(t.percentual),
          t.vagas,
        ]),
      },
      {
        id: "cmeis_procura_ocupacao",
        title: `${plural} com maior procura x ocupação`,
        columns: [singular, "Procura", "Pref 1/2/3", "Ocupação %", "Vagas"],
        rows: cmeisInsightsTabela.map((c) => [
          c.nome,
          Math.round(c.score),
          `${c.pref1}/${c.pref2}/${c.pref3}`,
          Math.round(c.percentual),
          c.vagas,
        ]),
      },
    ];
  }, [
    kpis,
    plural,
    singular,
    demandaCmeis,
    inscricoesMensal,
    statusTop,
    topZonas,
    topBairros,
    topPeriodos,
    cmeisPressaoTabela,
    filaMediaPorCmeiTabela,
    convocadosPorCmeiTabela,
    turmasMaisLotadas,
    cmeisInsightsTabela,
  ]);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [exportSelected, setExportSelected] = useState<Record<string, boolean>>({});

  const effectiveExportSelected = useMemo(() => {
    const out: Record<string, boolean> = {};
    exportSections.forEach((s) => {
      out[s.id] = exportSelected[s.id] ?? true;
    });
    return out;
  }, [exportSections, exportSelected]);

  const selectedExportCount = useMemo(
    () => exportSections.filter((s) => effectiveExportSelected[s.id]).length,
    [exportSections, effectiveExportSelected],
  );

  const handleRunExport = useCallback(() => {
    const chosen = exportSections.filter((s) => effectiveExportSelected[s.id]);
    if (!chosen.length) return;
    runBIExport(exportFormat, chosen, {
      title: "BI VAGOU",
      subtitle: "Procura e ocupação para apoiar planejamento de vagas",
      filters: activeFilters.map((f) => f.label),
    });
    setExportOpen(false);
  }, [exportSections, effectiveExportSelected, exportFormat, activeFilters]);


  const [breakpoint, setBreakpoint] = useState<string>("lg");
  const [manageOpen, setManageOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const { ref: gridContainerRef, width: gridWidth } = useElementWidth<HTMLDivElement>();

  type Widget = {
    id: string;
    title: string;
    render: () => ReactNode;
  };

  const widgets = useMemo<Widget[]>(
    () => [
      {
        id: "kpi_total_demanda",
        title: "Procura (preferências)",
        render: () => (
          <BIStatCard
            title="Procura (preferências)"
            value={kpis.totalDemanda}
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            iconBgClass="bg-primary/10"
          />
        ),
      },
      {
        id: "kpi_sem_zona",
        title: "Sem zona detectada",
        render: () => (
          <BIStatCard
            title="Sem zona detectada"
            value={kpis.semZona}
            icon={<MapPin className="h-4 w-4 text-[hsl(142,76%,36%)]" />}
            iconBgClass="bg-[hsl(142,76%,36%)]/10"
          />
        ),
      },
      {
        id: "kpi_criticos",
        title: `${plural} críticos (≥90%)`,
        render: () => (
          <BIStatCard
            title={`${plural} críticos (≥90%)`}
            value={kpis.criticos}
            icon={<School className="h-4 w-4 text-destructive" />}
            iconBgClass="bg-destructive/10"
          />
        ),
      },
      {
        id: "kpi_cmeis_demanda",
        title: `${plural} com demanda`,
        render: () => (
          <BIStatCard
            title={`${plural} com demanda`}
            value={(demandaCmeis || []).length}
            icon={<Users className="h-4 w-4 text-[hsl(214,73%,38%)]" />}
            iconBgClass="bg-[hsl(214,73%,38%)]/10"
          />
        ),
      },
      {
        id: "novas_inscricoes",
        title: "Novas inscrições (12 meses)",
        render: () => (
          <BIWidgetCard
            title="Novas inscrições (12 meses)"
            description="Volume de entradas no sistema"
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            iconBgClass="bg-primary/10"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inscricoesMensal || []} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="biInscricoesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(214, 73%, 50%)" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="hsl(214, 73%, 50%)" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }} interval={0} height={35} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0]?.payload;
                    return (
                      <div className="bg-card border rounded-lg shadow-lg p-3">
                        <p className="font-semibold text-sm">{p.mes}</p>
                        <p className="text-xs text-muted-foreground">
                          Novas inscrições: <span className="font-medium text-foreground">{p.quantidade}</span>
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="quantidade" radius={[6, 6, 0, 0]} maxBarSize={34} fill="url(#biInscricoesGradient)" isAnimationActive animationDuration={900} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </BIWidgetCard>
        ),
      },
      {
        id: "status_distribuicao",
        title: "Distribuição por status",
        render: () => (
          <BIWidgetCard
            title="Distribuição por status"
            description="No período selecionado"
            icon={<Users className="h-4 w-4 text-[hsl(214,73%,38%)]" />}
            iconBgClass="bg-[hsl(214,73%,38%)]/10"
          >
            <BIDonut data={statusTop.map((s) => ({ name: s.status, value: s.quantidade }))} />

          </BIWidgetCard>
        ),
      },
      {
        id: "zonas_procura",
        title: "Zonas com maior procura",
        render: () => (
          <BIWidgetCard
            title="Zonas com maior procura"
            description="Fila/convocado por zona (bairro/CEP)"
            icon={<MapPin className="h-4 w-4 text-[hsl(142,76%,36%)]" />}
            iconBgClass="bg-[hsl(142,76%,36%)]/10"
          >
            {topZonas.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topZonas} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="nomeAbreviado" tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }} interval={0} height={45} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0]?.payload;
                      return (
                        <div className="bg-card border rounded-lg shadow-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.cor }} />
                            <p className="font-semibold text-sm">{p.nome}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Procura: <span className="font-medium text-foreground">{p.quantidade}</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="quantidade" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive animationDuration={900} animationEasing="ease-out">
                    {topZonas.map((z, idx) => (
                      <Cell key={idx} fill={z.cor || "hsl(var(--primary))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground py-6 text-center">Sem dados suficientes no período.</div>
            )}
          </BIWidgetCard>
        ),
      },
      {
        id: "bairros_procura",
        title: "Bairros com maior procura",
        render: () => (
          <BIWidgetCard
            title="Bairros com maior procura"
            description="Top bairros (fila/convocado)"
            icon={<Users className="h-4 w-4 text-[hsl(214,73%,38%)]" />}
            iconBgClass="bg-[hsl(214,73%,38%)]/10"
          >
            <BIHorizontalBar data={topBairros.map((b) => ({ name: formatBairro(b.bairro), value: b.quantidade }))} />

          </BIWidgetCard>
        ),
      },
      {
        id: "procura_turno",
        title: "Procura por turno",
        render: () => (
          <BIWidgetCard
            title="Procura por turno"
            description="Distribuição por período informado"
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            iconBgClass="bg-primary/10"
          >
            <BIDonut data={topPeriodos.map((p) => ({ name: formatPeriodo(p.periodoTurno), value: p.quantidade }))} />

          </BIWidgetCard>
        ),
      },
      {
        id: "cmeis_pressao",
        title: `${plural} com maior pressão`,
        render: () => (
          <BIWidgetCard
            title={`${plural} com maior pressão`}
            description="Procura ponderada por vaga disponível"
            icon={<School className="h-4 w-4 text-primary" />}
            iconBgClass="bg-primary/10"
          >
            <div className="h-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{singular}</TableHead>
                    <TableHead className="text-right">Pressão</TableHead>
                    <TableHead className="text-right">Vagas</TableHead>
                    <TableHead className="text-right">Ocupação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cmeisPressaoTabela.length ? (
                    cmeisPressaoTabela.slice(0, 10).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{c.nome}</span>
                            {renderTipoGestaoBadge(c.id)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{c.pressao.toFixed(2)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{c.vagas}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={getOcupacaoVariant(c.percentual) as any}>{Math.round(c.percentual)}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <BIEmptyRow colSpan={4} label="Sem dados suficientes no período." />
                  )}
                </TableBody>
              </Table>
            </div>
          </BIWidgetCard>
        ),
      },
      {
        id: "tempo_medio_fila",
        title: "Tempo médio na fila",
        render: () => (
          <BIWidgetCard
            title="Tempo médio na fila"
            description="Fila/convocado por 1ª preferência"
            icon={<TrendingUp className="h-4 w-4 text-[hsl(48,100%,40%)]" />}
            iconBgClass="bg-[hsl(48,100%,50%)]/20"
          >
            <div className="h-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{singular}</TableHead>
                    <TableHead className="text-right">Média (d)</TableHead>
                    <TableHead className="text-right">Máx (d)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filaMediaPorCmeiTabela.length ? (
                    filaMediaPorCmeiTabela.map((r) => (
                      <TableRow key={r.cmeiId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{r.cmeiNome}</span>
                            {renderTipoGestaoBadge(r.cmeiId)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{r.mediaDias}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-xs text-muted-foreground">{r.maxDias}</span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <BIEmptyRow colSpan={3} label="Sem dados suficientes no período." />
                  )}
                </TableBody>
              </Table>
            </div>
          </BIWidgetCard>
        ),
      },
      {
        id: "convocados_por_cmei",
        title: "Convocados por CMEI",
        render: () => (
          <BIWidgetCard
            title="Convocados por CMEI"
            description="No período selecionado"
            icon={<Users className="h-4 w-4 text-primary" />}
            iconBgClass="bg-primary/10"
          >
            <div className="h-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{singular}</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {convocadosPorCmeiTabela.length ? (
                    convocadosPorCmeiTabela.map((r) => (
                      <TableRow key={r.cmeiId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{r.cmeiNome}</span>
                            {renderTipoGestaoBadge(r.cmeiId)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{r.quantidade}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <BIEmptyRow colSpan={2} label="Sem dados suficientes no período." />
                  )}
                </TableBody>
              </Table>
            </div>
          </BIWidgetCard>
        ),
      },
      {
        id: "turmas_mais_lotadas",
        title: "Turmas mais lotadas",
        render: () => (
          <BIWidgetCard
            title="Turmas mais lotadas"
            description="Top por % de ocupação"
            icon={<School className="h-4 w-4 text-destructive" />}
            iconBgClass="bg-destructive/10"
          >
            <div className="h-full flex flex-col min-h-0">
              <div className="flex-1 min-h-0 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Turma</TableHead>
                      <TableHead className="text-right">Ocup.</TableHead>
                      <TableHead className="text-right">Vagas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {turmasMaisLotadasPaginadas.length ? (
                      turmasMaisLotadasPaginadas.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="truncate">{t.cmei_nome}</div>
                                {t.cmei_id ? renderTipoGestaoBadge(t.cmei_id) : null}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {t.turma_base} {t.turno ? `• ${t.turno}` : ""} {t.nome ? `• ${t.nome}` : ""}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={getOcupacaoVariant(t.percentual) as any}>{Math.round(t.percentual)}%</Badge>
                          </TableCell>
                          <TableCell className="text-right">{t.vagas}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <BIEmptyRow colSpan={3} label={`Sem dados de ocupação de turmas${cmeiFocusId === "all" ? "" : " para este filtro"}.`} />
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="pt-2">
                <PaginationControls
                  currentPage={turmasPageClamped}
                  totalPages={turmasTotalPages}
                  pageSize={turmasPageSize}
                  totalItems={turmasTotalItems}
                  onPageChange={(page) => setTurmasPage(page)}
                  onPageSizeChange={(size) => {
                    setTurmasPageSize(size);
                    setTurmasPage(1);
                  }}
                  hasNextPage={turmasHasNextPage}
                  hasPreviousPage={turmasHasPreviousPage}
                />
              </div>
            </div>
          </BIWidgetCard>
        ),
      },
      {
        id: "cmeis_procura_ocupacao",
        title: `${plural} com maior procura x ocupação`,
        render: () => (
          <BIWidgetCard
            title={`${plural} com maior procura x ocupação`}
            description="Procura ponderada (pref1/pref2/pref3) e ocupação atual"
            icon={<School className="h-4 w-4 text-primary" />}
            iconBgClass="bg-primary/10"
          >
            <div className="h-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{singular}</TableHead>
                    <TableHead className="text-right">Procura</TableHead>
                    <TableHead className="text-right">Preferências</TableHead>
                    <TableHead className="text-right">Ocupação</TableHead>
                    <TableHead className="text-right">Vagas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cmeisInsightsTabela.length ? (
                    cmeisInsightsTabela.slice(0, 15).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{c.nome}</span>
                            {renderTipoGestaoBadge(c.id)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{Math.round(c.score)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-xs text-muted-foreground">
                            {c.pref1}/{c.pref2}/{c.pref3}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={getOcupacaoVariant(c.percentual) as any}>{Math.round(c.percentual)}%</Badge>
                        </TableCell>
                        <TableCell className="text-right">{c.vagas}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <BIEmptyRow colSpan={5} label="Sem dados suficientes no período." />
                  )}
                </TableBody>
              </Table>
            </div>
          </BIWidgetCard>
        ),
      },
    ],
    [
      cmeiFocusId,
      cmeisInsightsTabela,
      cmeisPressaoTabela,
      demandaCmeis,
      editMode,
      filaMediaPorCmeiTabela,
      convocadosPorCmeiTabela,
      inscricoesMensal,
      kpis.criticos,
      kpis.semZona,
      kpis.totalDemanda,
      plural,
      renderTipoGestaoBadge,
      singular,
      statusTop,
      topBairros,
      topPeriodos,
      topZonas,
      turmasHasNextPage,
      turmasHasPreviousPage,
      turmasMaisLotadasPaginadas,
      turmasPageClamped,
      turmasPageSize,
      turmasTotalItems,
      turmasTotalPages,
    ],
  );

  const defaultLayouts = useMemo<Layouts>(() => {
    const lg: Layout = [
      { i: "kpi_total_demanda", x: 0, y: 0, w: 3, h: 5, minW: 2, minH: 4 },
      { i: "kpi_sem_zona", x: 3, y: 0, w: 3, h: 5, minW: 2, minH: 4 },
      { i: "kpi_criticos", x: 6, y: 0, w: 3, h: 5, minW: 2, minH: 4 },
      { i: "kpi_cmeis_demanda", x: 9, y: 0, w: 3, h: 5, minW: 2, minH: 4 },
      { i: "novas_inscricoes", x: 0, y: 5, w: 6, h: 15, minW: 4, minH: 10 },
      { i: "status_distribuicao", x: 6, y: 5, w: 6, h: 15, minW: 4, minH: 10 },
      { i: "zonas_procura", x: 0, y: 20, w: 6, h: 17, minW: 4, minH: 12 },
      { i: "bairros_procura", x: 6, y: 20, w: 6, h: 17, minW: 4, minH: 10 },
      { i: "cmeis_pressao", x: 0, y: 37, w: 6, h: 15, minW: 4, minH: 10 },
      { i: "procura_turno", x: 6, y: 37, w: 6, h: 15, minW: 4, minH: 10 },
      { i: "tempo_medio_fila", x: 0, y: 52, w: 4, h: 17, minW: 3, minH: 10 },
      { i: "convocados_por_cmei", x: 4, y: 52, w: 4, h: 17, minW: 3, minH: 10 },
      { i: "turmas_mais_lotadas", x: 8, y: 52, w: 4, h: 17, minW: 4, minH: 14 },
      { i: "cmeis_procura_ocupacao", x: 0, y: 69, w: 12, h: 20, minW: 6, minH: 14 },
    ];
    const md: Layout = [
      { i: "kpi_total_demanda", x: 0, y: 0, w: 4, h: 5, minW: 2, minH: 4 },
      { i: "kpi_sem_zona", x: 4, y: 0, w: 4, h: 5, minW: 2, minH: 4 },
      { i: "kpi_criticos", x: 0, y: 5, w: 4, h: 5, minW: 2, minH: 4 },
      { i: "kpi_cmeis_demanda", x: 4, y: 5, w: 4, h: 5, minW: 2, minH: 4 },
      { i: "novas_inscricoes", x: 0, y: 10, w: 8, h: 16, minW: 4, minH: 10 },
      { i: "status_distribuicao", x: 0, y: 26, w: 8, h: 12, minW: 4, minH: 8 },
      { i: "bairros_procura", x: 0, y: 38, w: 8, h: 16, minW: 4, minH: 10 },
      { i: "zonas_procura", x: 0, y: 54, w: 8, h: 18, minW: 4, minH: 12 },
      { i: "procura_turno", x: 0, y: 72, w: 8, h: 10, minW: 4, minH: 8 },
      { i: "cmeis_pressao", x: 0, y: 82, w: 8, h: 16, minW: 4, minH: 10 },
      { i: "tempo_medio_fila", x: 0, y: 98, w: 8, h: 14, minW: 4, minH: 10 },
      { i: "convocados_por_cmei", x: 0, y: 112, w: 8, h: 14, minW: 4, minH: 10 },
      { i: "turmas_mais_lotadas", x: 0, y: 126, w: 8, h: 22, minW: 4, minH: 14 },
      { i: "cmeis_procura_ocupacao", x: 0, y: 148, w: 8, h: 22, minW: 6, minH: 14 },
    ];
    const sm: Layout = [
      { i: "kpi_total_demanda", x: 0, y: 0, w: 4, h: 5, minW: 2, minH: 4 },
      { i: "kpi_sem_zona", x: 0, y: 5, w: 4, h: 5, minW: 2, minH: 4 },
      { i: "kpi_criticos", x: 0, y: 10, w: 4, h: 5, minW: 2, minH: 4 },
      { i: "kpi_cmeis_demanda", x: 0, y: 15, w: 4, h: 5, minW: 2, minH: 4 },
      { i: "novas_inscricoes", x: 0, y: 20, w: 4, h: 16, minW: 4, minH: 10 },
      { i: "status_distribuicao", x: 0, y: 36, w: 4, h: 12, minW: 4, minH: 8 },
      { i: "bairros_procura", x: 0, y: 48, w: 4, h: 18, minW: 4, minH: 10 },
      { i: "zonas_procura", x: 0, y: 66, w: 4, h: 18, minW: 4, minH: 12 },
      { i: "procura_turno", x: 0, y: 84, w: 4, h: 10, minW: 4, minH: 8 },
      { i: "cmeis_pressao", x: 0, y: 94, w: 4, h: 16, minW: 4, minH: 10 },
      { i: "tempo_medio_fila", x: 0, y: 110, w: 4, h: 14, minW: 4, minH: 10 },
      { i: "convocados_por_cmei", x: 0, y: 124, w: 4, h: 14, minW: 4, minH: 10 },
      { i: "turmas_mais_lotadas", x: 0, y: 138, w: 4, h: 22, minW: 4, minH: 14 },
      { i: "cmeis_procura_ocupacao", x: 0, y: 160, w: 4, h: 22, minW: 4, minH: 14 },
    ];
    return { lg, md, sm };
  }, []);

  const layoutDefaults = useMemo(() => {
    const hidden = Object.fromEntries(widgets.map((w) => [w.id, false]));
    return { layouts: defaultLayouts, hidden };
  }, [defaultLayouts, widgets]);

  const { state: dashboardLayout, setLayouts, toggleHidden, reset } = useUserDashboardLayout(
    "bi_v2",
    layoutDefaults as any,
  );

  const visibleWidgets = useMemo(() => {
    return widgets.filter((w) => !dashboardLayout.hidden[w.id]);
  }, [dashboardLayout.hidden, widgets]);

  const visibleLayouts = useMemo<Layouts>(() => {
    const ids = new Set(visibleWidgets.map((w) => w.id));
    const source = dashboardLayout.layouts as unknown as Layouts;
    const out: Layouts = {};
    Object.keys(source).forEach((bp) => {
      out[bp] = (source[bp] || []).filter((l) => ids.has(l.i));
    });
    return out;
  }, [dashboardLayout.layouts, visibleWidgets]);

  const mergeLayouts = useCallback((prev: Layouts, next: Layouts) => {
    const out: Layouts = { ...prev };
    Object.keys(next).forEach((bp) => {
      const prevItems = prev[bp] || [];
      const nextItems = next[bp] || [];
      const nextMap = new Map(nextItems.map((i) => [i.i, i]));
      const merged = prevItems.map((item) => nextMap.get(item.i) ?? item);
      const prevIds = new Set(prevItems.map((i) => i.i));
      nextItems.forEach((item) => {
        if (!prevIds.has(item.i)) merged.push(item);
      });
      out[bp] = merged;
    });
    return out;
  }, []);

  const handleLayoutsChange = useCallback(
    (_current: Layout, all: Layouts) => {
      const prev = dashboardLayout.layouts as unknown as Layouts;
      setLayouts(mergeLayouts(prev, all) as any);
    },
    [dashboardLayout.layouts, mergeLayouts, setLayouts],
  );

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Painel Analítico</h2>
            <p className="text-sm md:text-base text-muted-foreground">Procura e ocupação para apoiar planejamento de vagas</p>
          </div>
          {!isLoading && !hasError ? (
            <div className="flex items-center gap-2">
              <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" type="button">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Exportar BI</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Formato</div>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { value: "pdf", label: "PDF" },
                          { value: "xlsx", label: "Excel" },
                          { value: "csv", label: "CSV" },
                        ] as Array<{ value: ExportFormat; label: string }>).map((f) => (
                          <Button
                            key={f.value}
                            type="button"
                            variant={exportFormat === f.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => setExportFormat(f.value)}
                          >
                            {f.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          O que exportar
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto p-0"
                            onClick={() =>
                              setExportSelected(Object.fromEntries(exportSections.map((s) => [s.id, true])))
                            }
                          >
                            Todos
                          </Button>
                          <span className="text-muted-foreground">·</span>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto p-0"
                            onClick={() =>
                              setExportSelected(Object.fromEntries(exportSections.map((s) => [s.id, false])))
                            }
                          >
                            Nenhum
                          </Button>
                        </div>
                      </div>
                      <div className="max-h-72 overflow-auto space-y-2 pr-1">
                        {exportSections.map((s) => (
                          <label
                            key={s.id}
                            className="flex items-center justify-between gap-3 cursor-pointer rounded-md px-1 py-1 hover:bg-muted/50"
                          >
                            <span className="text-sm truncate">{s.title}</span>
                            <Checkbox
                              checked={effectiveExportSelected[s.id]}
                              onCheckedChange={(v) =>
                                setExportSelected((prev) => ({ ...prev, [s.id]: Boolean(v) }))
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t">
                      <span className="text-xs text-muted-foreground">{selectedExportCount} seção(ões) selecionada(s)</span>
                      <Button type="button" onClick={handleRunExport} disabled={selectedExportCount === 0}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={manageOpen} onOpenChange={setManageOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" type="button">
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Blocos
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Blocos do BI</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {widgets.map((w) => {
                        const checked = !dashboardLayout.hidden[w.id];
                        return (
                          <div key={w.id} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{w.title}</div>
                            </div>
                            <Checkbox checked={checked} onCheckedChange={() => toggleHidden(w.id)} />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          reset();
                        }}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restaurar padrão
                      </Button>
                      <Button type="button" onClick={() => setManageOpen(false)}>
                        Concluir
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                variant={editMode ? "default" : "outline"}
                size="sm"
                type="button"
                onClick={() => setEditMode((v) => !v)}
              >
                {editMode ? "Concluir" : "Ajustar tamanhos"}
              </Button>
            </div>
          ) : null}
        </div>

        <Card className="border-0 shadow-md">
          <CardContent className="p-3 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <Select
                value={periodo}
                onValueChange={(v) => {
                  setPeriodo(v as BIPeriodo);
                  setTurmasPage(1);
                }}
              >
                <SelectTrigger aria-label="Período">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  {periodos.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={cmeiFocusId}
                onValueChange={(value) => {
                  setCmeiFocusId(value);
                  setTurmasPage(1);
                }}
              >
                <SelectTrigger aria-label={singular}>
                  <SelectValue placeholder={singular} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{plural} (todas)</SelectItem>
                  {(cmeis || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={statusFiltro}
                onValueChange={(value) => {
                  setStatusFiltro(value as BIStatusFiltro);
                  setTurmasPage(1);
                }}
              >
                <SelectTrigger aria-label="Status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={zonaFiltro}
                onValueChange={(value) => {
                  setZonaFiltro(value as BIZonaFiltro);
                  setTurmasPage(1);
                }}
              >
                <SelectTrigger aria-label="Zona">
                  <SelectValue placeholder="Zona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as zonas</SelectItem>
                  <SelectItem value="__sem_zona__">Sem zona</SelectItem>
                  {(zonasAtivas || []).map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={turnoFiltro}
                onValueChange={(value) => {
                  setTurnoFiltro(value as BITurnoFiltro);
                  setTurmasPage(1);
                }}
              >
                <SelectTrigger aria-label="Turno">
                  <SelectValue placeholder="Turno" />
                </SelectTrigger>
                <SelectContent>
                  {turnoOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              <div className="lg:col-span-2">
                <Input value={bairroFiltro} onChange={(e) => setBairroFiltro(e.target.value)} placeholder="Filtrar por bairro (busca)" />
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-between gap-2">
                <span className="truncate inline-flex items-center gap-2">
                  {debouncingBairro ? <Spinner className="h-3.5 w-3.5 animate-spin" /> : null}
                  {debouncingBairro
                    ? "Aplicando filtro de bairro…"
                    : bairroDebounced?.trim()
                      ? "Filtro de bairro aplicado"
                      : "Sem filtro de bairro"}
                </span>
                {canClearFilters ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    onClick={() => {
                      setPeriodo("90d");
                      setCmeiFocusId("all");
                      setStatusFiltro("demanda");
                      setZonaFiltro("all");
                      setTurnoFiltro("all");
                      setBairroFiltro("");
                      setTurmasPage(1);
                    }}
                  >
                    Limpar filtros
                  </Button>
                ) : null}
              </div>
            </div>

            {activeFilters.length ? (
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((f) => (
                  <Badge key={f.key} variant="outline" className="max-w-full truncate">
                    {f.label}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {hasError ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-1">
              <CardTitle className="text-base">Não foi possível carregar o BI</CardTitle>
              <CardDescription>{errorMessage || "Verifique conexão/permissões e tente novamente."}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Recarregar
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
              <BIStatCard title="Procura (preferências)" value="0" icon={<TrendingUp className="h-4 w-4 text-primary" />} iconBgClass="bg-primary/10" isLoading />
              <BIStatCard title="Sem zona detectada" value="0" icon={<MapPin className="h-4 w-4 text-[hsl(142,76%,36%)]" />} iconBgClass="bg-[hsl(142,76%,36%)]/10" isLoading />
              <BIStatCard title={`${plural} críticos (≥90%)`} value="0" icon={<School className="h-4 w-4 text-destructive" />} iconBgClass="bg-destructive/10" isLoading />
              <BIStatCard title={`${plural} com demanda`} value="0" icon={<Users className="h-4 w-4 text-[hsl(214,73%,38%)]" />} iconBgClass="bg-[hsl(214,73%,38%)]/10" isLoading />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <BIBlockSkeleton height={240} />
              <BIBlockSkeleton height={220} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <BIBlockSkeleton height={260} />
              <BIBlockSkeleton height={220} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <BIBlockSkeleton height={220} />
              <BIBlockSkeleton height={220} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <BIBlockSkeleton height={220} />
              <BIBlockSkeleton height={220} />
              <BIBlockSkeleton height={260} />
            </div>
            <BIBlockSkeleton height={300} />
          </div>
        ) : (
          <>
            <div ref={gridContainerRef} className="w-full">
              {gridWidth > 0 ? (
                <RGL
                  width={gridWidth}
                  className="bi-grid"
                  layouts={visibleLayouts}
                  breakpoints={{ lg: 1024, md: 768, sm: 0 }}
                  cols={{ lg: 12, md: 8, sm: 4 }}
                  rowHeight={18}
                  margin={[16, 16]}
                  containerPadding={[0, 0]}
                  isDraggable={false}
                  isResizable={editMode}
                  allowOverlap={false}
                  preventCollision={true}
                  onLayoutChange={handleLayoutsChange}
                  onBreakpointChange={(bp) => setBreakpoint(bp)}
                  compactType="vertical"
                >
                  {visibleWidgets.map((w) => (
                    <div key={w.id} className="h-full">
                      {w.render()}
                    </div>
                  ))}
                </RGL>
              ) : (
                <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              )}
            </div>

            {editMode ? (
              <div className="text-xs text-muted-foreground">Redimensione os cards pelos cantos. Breakpoint atual: {breakpoint}.</div>
            ) : null}
          </>
        )}
    </div>
  );
}

export default function BIPage() {
  return (
    <AdminLayout>
      <BIContent />
    </AdminLayout>
  );
}
