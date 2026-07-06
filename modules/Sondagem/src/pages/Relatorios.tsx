import { useState, useMemo, useEffect, useCallback } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useNavigate } from "react-router-dom";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@ui/select";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig,
} from "@ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/tabs";
import { Button } from "@ui/button";
import { Input } from "@ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ui/table";
import { Progress } from "@ui/progress";
import { BarChart3, PieChart as PieChartIcon, Users, TrendingUp, TrendingDown, Download, FileText, FileSpreadsheet, Eye, User, Search, ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useCMEIs, useTurmas, useNiveis, useAlunos, useSondagensRelatorio, usePeriodos, type NivelData, type ResultadoSondagem } from "@sondagem/hooks/useSupabaseData";
import { ESCRITA_COLORS, PRODUCAO_COLORS, getEscritaColor, getProducaoColor } from "@sondagem/lib/nivelColors";
import { useMetas } from "@sondagem/hooks/useMetas";
import { Badge } from "@ui/badge";
import { Target } from "lucide-react";
import { getPrincipalReportConfig, type ReportHeaderFooter } from "@sondagem/lib/reportConfig";
import { useCoordinatorSchoolId } from "@sondagem/lib/coordinatorScope";
import { useAuth } from "@root/contexts/AuthContext";
import { VagouReportShell } from "@root/components/common/VagouReportShell";

type AutoTableCellHookData = {
  section?: string;
  column: { index: number };
  row: { index: number };
  cell: { styles: { textColor?: string | number[]; fontStyle?: string } };
};

function getLastAutoTableFinalY(doc: jsPDF): number | null {
  const last = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return typeof last?.finalY === "number" ? last.finalY : null;
}

function addPdfHeaderFooter(doc: jsPDF, config: ReportHeaderFooter): number {
  let y = 14;
  const pageW = doc.internal.pageSize.width;
  const centerX = pageW / 2;
  if (config.brasaoBase64) {
    try { doc.addImage(config.brasaoBase64, "PNG", centerX - 10, y - 6, 20, 20); y += 16; } catch (e) { void e; }
  }
  if (config.headerLine1) { doc.setFontSize(12); doc.setTextColor(41, 98, 166); doc.text(config.headerLine1, centerX, y, { align: "center" }); y += 6; }
  if (config.headerLine2) { doc.setFontSize(10); doc.setTextColor(80); doc.text(config.headerLine2, centerX, y, { align: "center" }); y += 5; }
  if (config.headerLine3) { doc.setFontSize(9); doc.setTextColor(100); doc.text(config.headerLine3, centerX, y, { align: "center" }); y += 5; }
  if (config.headerLine1 || config.headerLine2 || config.headerLine3 || config.brasaoBase64) {
    doc.setDrawColor(200); doc.line(14, y + 1, pageW - 14, y + 1); y += 6;
  }
  return y;
}

function addFooterToAllPages(doc: jsPDF, config: ReportHeaderFooter) {
  if (!config.footerText) return;
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(140);
    doc.text(config.footerText, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: "center" });
  }
}

function buildChartConfig(niveis: NivelData[], colorMap: Record<string, string>): ChartConfig {
  const config: ChartConfig = {};
  niveis.forEach(n => {
    config[n.codigo] = { label: n.descricao, color: colorMap[n.codigo] || "hsl(215, 15%, 47%)" };
  });
  return config;
}

function getNivelDescricao(codigo: string, tipo: "escrita" | "producao", niveisEscrita: NivelData[], niveisProducaoTexto: NivelData[]): string {
  if (tipo === "escrita") return niveisEscrita.find(n => n.codigo === codigo)?.descricao || codigo;
  return niveisProducaoTexto.find(n => n.codigo === codigo)?.descricao || codigo;
}

function computeNaoAtingiramData(
  resultados: ResultadoSondagem[],
  niveis: NivelData[],
  tipo: "escrita" | "producao",
  total: number,
) {
  if (total === 0) return [];
  return niveis.map(nivel => {
    const naoAtingiram = resultados.filter(r => {
      const cod = tipo === "escrita" ? r.nivelEscritaCodigo : r.nivelProducaoCodigo;
      const alunoNivel = niveis.find(n => n.codigo === cod);
      return alunoNivel && alunoNivel.ordem < nivel.ordem;
    }).length;
    const pct = Math.round((naoAtingiram / total) * 100);
    return { nivel: nivel.descricao, codigo: nivel.codigo, naoAtingiram, pct };
  });
}

// Convert HSL string to RGB array for jsPDF
function hslToRgb(hslStr: string): [number, number, number] {
  const match = hslStr.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return [100, 100, 100];
  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

type RespostaNivel = {
  niveis_aprendizagem?: { tipo?: string | null; ordem?: number | string | null; codigo?: string | null } | null;
};

function extractNivel(respostas: RespostaNivel[], tipo: string): { ordem: number | null; codigo: string | null } {
  let best: { ordem: number; codigo: string } | null = null;
  for (const r of respostas || []) {
    const n = r?.niveis_aprendizagem;
    if (!n || n.tipo !== tipo) continue;
    const ordem = typeof n.ordem === "number" ? n.ordem : Number(n.ordem);
    if (!Number.isFinite(ordem)) continue;
    if (!best || ordem > best.ordem) best = { ordem, codigo: String(n.codigo || "") };
  }
  return best ? { ordem: best.ordem, codigo: best.codigo } : { ordem: null, codigo: null };
}

function nearestCodigoByOrdem(ordem: number | null, niveis: NivelData[]) {
  if (ordem === null || !Number.isFinite(ordem) || niveis.length === 0) return "";
  let best = niveis[0];
  let bestDiff = Math.abs(best.ordem - ordem);
  for (const n of niveis) {
    const d = Math.abs(n.ordem - ordem);
    if (d < bestDiff) {
      best = n;
      bestDiff = d;
    }
  }
  return best.codigo;
}

function ensurePdfSpace(doc: jsPDF, config: ReportHeaderFooter, y: number, needed: number) {
  const limit = doc.internal.pageSize.height - 18;
  if (y + needed <= limit) return y;
  doc.addPage();
  return addPdfHeaderFooter(doc, config);
}

function drawEvolutionChart(args: {
  doc: jsPDF;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  labels: string[];
  aluno: Array<{ ordem: number | null; codigo: string | null }>;
  media: Array<number | null>;
  niveis: NivelData[];
}) {
  const { doc, x, y, width, height, title, labels, aluno, media, niveis } = args;

  const minOrdem = Math.min(...niveis.map((n) => n.ordem));
  const maxOrdem = Math.max(...niveis.map((n) => n.ordem));
  const range = Math.max(1, maxOrdem - minOrdem);
  const padX = 10;
  const padY = 12;

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(title, x, y);

  const chartY = y + 6;
  const chartH = height - 18;
  const chartX = x;
  const chartW = width;

  doc.setDrawColor(220);
  doc.rect(chartX, chartY, chartW, chartH);

  const left = chartX + padX;
  const right = chartX + chartW - 6;
  const top = chartY + 6;
  const bottom = chartY + chartH - padY;

  doc.setDrawColor(200);
  doc.line(left, bottom, right, bottom);
  doc.line(left, top, left, bottom);

  const topLabel = niveis.find((n) => n.ordem === maxOrdem)?.codigo || String(maxOrdem);
  const bottomLabel = niveis.find((n) => n.ordem === minOrdem)?.codigo || String(minOrdem);
  doc.setFontSize(8);
  doc.setTextColor(90);
  doc.text(topLabel, left - 2, top + 2, { align: "right" });
  doc.text(bottomLabel, left - 2, bottom, { align: "right" });

  const count = Math.max(1, labels.length);
  const step = count === 1 ? 0 : (right - left) / (count - 1);
  labels.forEach((lbl, i) => {
    const px = left + step * i;
    doc.setDrawColor(230);
    doc.line(px, top, px, bottom);
    doc.setTextColor(120);
    doc.text(lbl, px, bottom + 8, { align: "center" });
  });

  const mapY = (ordem: number) => bottom - ((ordem - minOrdem) / range) * (bottom - top);

  const pointsAluno = aluno.map((p, i) => {
    if (p.ordem === null) return null;
    const px = left + step * i;
    const py = mapY(p.ordem);
    return { x: px, y: py, codigo: p.codigo || "" };
  });
  const pointsMedia = media.map((v, i) => {
    if (v === null || !Number.isFinite(v)) return null;
    const px = left + step * i;
    const py = mapY(v);
    return { x: px, y: py, codigo: nearestCodigoByOrdem(v, niveis) };
  });

  doc.setDrawColor(41, 98, 166);
  doc.setLineWidth(0.6);
  for (let i = 1; i < pointsAluno.length; i++) {
    const a = pointsAluno[i - 1];
    const b = pointsAluno[i];
    if (a && b) doc.line(a.x, a.y, b.x, b.y);
  }

  doc.setDrawColor(120);
  doc.setLineWidth(0.5);
  for (let i = 1; i < pointsMedia.length; i++) {
    const a = pointsMedia[i - 1];
    const b = pointsMedia[i];
    if (a && b) doc.line(a.x, a.y, b.x, b.y);
  }

  pointsAluno.forEach((p) => {
    if (!p) return;
    doc.setFillColor(41, 98, 166);
    doc.circle(p.x, p.y, 1.2, "F");
    if (p.codigo) {
      doc.setFontSize(7);
      doc.setTextColor(41, 98, 166);
      doc.text(p.codigo, p.x, p.y - 3, { align: "center" });
    }
  });

  pointsMedia.forEach((p) => {
    if (!p) return;
    doc.setFillColor(120, 120, 120);
    doc.circle(p.x, p.y, 1.0, "F");
  });

  doc.setFontSize(8);
  doc.setTextColor(60);
  const legendY = chartY + chartH + 14;
  doc.setDrawColor(41, 98, 166);
  doc.line(x, legendY - 2, x + 10, legendY - 2);
  doc.text("Aluno", x + 12, legendY, { align: "left" });
  doc.setDrawColor(120);
  doc.line(x + 40, legendY - 2, x + 50, legendY - 2);
  doc.text("Média da turma", x + 52, legendY, { align: "left" });
}

export default function Relatorios() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isCoordinator = role === "coordenador";
  const coordinatorCmeiId = useCoordinatorSchoolId() || "";
  const [cmeiId, setCmeiId] = useState<string>("all");
  const [turmaId, setTurmaId] = useState<string>("all");
  const [periodoId, setPeriodoId] = useState<string>("");
  const [periodoCompararId, setPeriodoCompararId] = useState<string>("");
  const [selectedAlunoId, setSelectedAlunoId] = useState<string | null>(null);
  const [searchAluno, setSearchAluno] = useState("");
  const [paginaAlunos, setPaginaAlunos] = useState(1);
  const ALUNOS_POR_PAGINA = 15;

  const { data: cmeisAll = [] } = useCMEIs(coordinatorCmeiId || undefined);
  const cmeis = useMemo(() => {
    if (!isCoordinator || !coordinatorCmeiId) return cmeisAll;
    return cmeisAll.filter((c) => c.id === coordinatorCmeiId);
  }, [cmeisAll, isCoordinator, coordinatorCmeiId]);

  useEffect(() => {
    if (!isCoordinator) return;
    if (!coordinatorCmeiId) return;
    if (cmeiId !== coordinatorCmeiId) {
      setCmeiId(coordinatorCmeiId);
      setTurmaId("all");
    }
  }, [isCoordinator, coordinatorCmeiId, cmeiId]);

  const effectiveCmeiId = isCoordinator ? coordinatorCmeiId : cmeiId === "all" ? undefined : cmeiId;
  const effectiveTurmaId = turmaId === "all" ? undefined : turmaId;

  const { data: turmasAll = [] } = useTurmas(effectiveCmeiId);
  const { data: niveis = [] } = useNiveis();
  const { data: allAlunos = [] } = useAlunos(effectiveCmeiId, effectiveTurmaId, true);
  const { data: resultados = [], isLoading: loadingResultados } = useSondagensRelatorio(periodoId);
  const { data: resultadosComparar = [], isLoading: loadingComparar } = useSondagensRelatorio(periodoCompararId);
  const { data: periodos = [] } = usePeriodos();
  const { data: metas = [] } = useMetas(periodoId);

  const [contagemPorPeriodo, setContagemPorPeriodo] = useState<Record<string, number>>({});

  // Auto-select most recent period with data + count sondagens per period
  useEffect(() => {
    if (periodos.length === 0) return;
    const fetchPeriodData = async () => {
      const { supabase } = await import("@sondagem/integrations/supabase/client");
      const { data } = await supabase
        .from("sondagens")
        .select("periodo")
        .eq("status", "finalizado");
      const contagem: Record<string, number> = {};
      (data || []).forEach(s => {
        contagem[s.periodo] = (contagem[s.periodo] || 0) + 1;
      });
      setContagemPorPeriodo(contagem);
      if (!periodoId) {
        const periodosOrdenados = [...periodos].sort((a, b) => b.codigo.localeCompare(a.codigo));
        const encontrado = periodosOrdenados.find(p => contagem[p.codigo] > 0);
        setPeriodoId(encontrado?.codigo || periodos[0]?.codigo || "");
      }
    };
    fetchPeriodData();
  }, [periodos, periodoId]);

  const niveisEscrita = useMemo(() => niveis.filter(n => n.tipo === "escrita"), [niveis]);
  const niveisProducaoTexto = useMemo(() => niveis.filter(n => n.tipo === "producao_texto"), [niveis]);

  const escritaChartConfig = useMemo(() => buildChartConfig(niveisEscrita, ESCRITA_COLORS), [niveisEscrita]);
  const producaoChartConfig = useMemo(() => buildChartConfig(niveisProducaoTexto, PRODUCAO_COLORS), [niveisProducaoTexto]);

  const turmasFiltradas = useMemo(
    () => (cmeiId === "all" ? turmasAll : turmasAll.filter(t => t.cmeiId === cmeiId)),
    [cmeiId, turmasAll]
  );

  const filterResultados = useCallback((res: ResultadoSondagem[]) => {
    return res.filter((r) => {
      const aluno = allAlunos.find((a) => a.id === r.alunoId);
      if (!aluno) return false;
      if (cmeiId !== "all" && aluno.cmei !== cmeiId) return false;
      if (turmaId !== "all" && aluno.turma !== turmaId) return false;
      return true;
    });
  }, [allAlunos, cmeiId, turmaId]);

  const resultadosFiltrados = useMemo(() => filterResultados(resultados), [filterResultados, resultados]);
  const resultadosCompararFiltrados = useMemo(() => filterResultados(resultadosComparar), [filterResultados, resultadosComparar]);

  const alunosComResultado = useMemo(() => {
    return resultadosFiltrados.map(r => {
      const aluno = allAlunos.find(a => a.id === r.alunoId);
      const cmei = cmeis.find(c => c.id === aluno?.cmei);
      const turma = turmasAll.find(t => t.id === aluno?.turma);
      return {
        ...r,
        nome: aluno?.nome || "Desconhecido",
        cmeiNome: cmei?.nome || aluno?.cmeiNome || "",
        turmaNome: turma?.nome || aluno?.turmaNome || "",
        dataNascimento: aluno?.dataNascimento || "",
      };
    });
  }, [resultadosFiltrados, allAlunos, cmeis, turmasAll]);

  const escritaBarData = useMemo(() => niveisEscrita.map(nivel => ({
    nivel: nivel.codigo,
    quantidade: resultadosFiltrados.filter(r => r.nivelEscritaCodigo === nivel.codigo).length,
  })), [resultadosFiltrados, niveisEscrita]);

  const producaoBarData = useMemo(() => niveisProducaoTexto.map(nivel => ({
    nivel: nivel.codigo,
    quantidade: resultadosFiltrados.filter(r => r.nivelProducaoCodigo === nivel.codigo).length,
  })), [resultadosFiltrados, niveisProducaoTexto]);

  const escritaPieData = useMemo(() => niveisEscrita.map(nivel => ({
    name: nivel.descricao, value: resultadosFiltrados.filter(r => r.nivelEscritaCodigo === nivel.codigo).length, codigo: nivel.codigo,
  })).filter(d => d.value > 0), [resultadosFiltrados, niveisEscrita]);

  const producaoPieData = useMemo(() => niveisProducaoTexto.map(nivel => ({
    name: nivel.descricao, value: resultadosFiltrados.filter(r => r.nivelProducaoCodigo === nivel.codigo).length, codigo: nivel.codigo,
  })).filter(d => d.value > 0), [resultadosFiltrados, niveisProducaoTexto]);

  const totalAvaliados = resultadosFiltrados.length;
  const totalAlfabetizados = resultadosFiltrados.filter(r => r.nivelEscritaCodigo === "ALF").length;
  const percentAlfabetizados = totalAvaliados > 0 ? Math.round((totalAlfabetizados / totalAvaliados) * 100) : 0;
  const naoAlfabetizados = totalAvaliados - totalAlfabetizados;
  const percentNaoAlfabetizados = totalAvaliados > 0 ? 100 - percentAlfabetizados : 0;
  const periodoNome = periodos.find(p => p.id === periodoId)?.nome || periodoId;
  const periodoCompararNome = periodos.find(p => p.id === periodoCompararId)?.nome || periodoCompararId;

  const escritaNaoAtingiramData = useMemo(() =>
    computeNaoAtingiramData(resultadosFiltrados, niveisEscrita, "escrita", totalAvaliados),
    [resultadosFiltrados, niveisEscrita, totalAvaliados]);

  const producaoNaoAtingiramData = useMemo(() =>
    computeNaoAtingiramData(resultadosFiltrados, niveisProducaoTexto, "producao", totalAvaliados),
    [resultadosFiltrados, niveisProducaoTexto, totalAvaliados]);

  // Comparison data
  const totalAvaliadosComparar = resultadosCompararFiltrados.length;
  const compEscritaNaoAtingiram = useMemo(() =>
    computeNaoAtingiramData(resultadosCompararFiltrados, niveisEscrita, "escrita", totalAvaliadosComparar),
    [resultadosCompararFiltrados, niveisEscrita, totalAvaliadosComparar]);
  const compProducaoNaoAtingiram = useMemo(() =>
    computeNaoAtingiramData(resultadosCompararFiltrados, niveisProducaoTexto, "producao", totalAvaliadosComparar),
    [resultadosCompararFiltrados, niveisProducaoTexto, totalAvaliadosComparar]);

  // Comparison bar data: side-by-side
  const compEscritaBarData = useMemo(() => niveisEscrita.map(nivel => ({
    nivel: nivel.codigo,
    [periodoId]: resultadosFiltrados.filter(r => r.nivelEscritaCodigo === nivel.codigo).length,
    [periodoCompararId]: resultadosCompararFiltrados.filter(r => r.nivelEscritaCodigo === nivel.codigo).length,
  })), [resultadosFiltrados, resultadosCompararFiltrados, niveisEscrita, periodoId, periodoCompararId]);

  const compProducaoBarData = useMemo(() => niveisProducaoTexto.map(nivel => ({
    nivel: nivel.codigo,
    [periodoId]: resultadosFiltrados.filter(r => r.nivelProducaoCodigo === nivel.codigo).length,
    [periodoCompararId]: resultadosCompararFiltrados.filter(r => r.nivelProducaoCodigo === nivel.codigo).length,
  })), [resultadosFiltrados, resultadosCompararFiltrados, niveisProducaoTexto, periodoId, periodoCompararId]);

  const desc = (codigo: string, tipo: "escrita" | "producao") => getNivelDescricao(codigo, tipo, niveisEscrita, niveisProducaoTexto);

  // ===== EXPORT =====
  const exportCSV = () => {
    if (alunosComResultado.length === 0) { toast.error("Nenhum dado para exportar."); return; }
    const header = "Nome,Instituição,Turma,Nível Escrita,Nível Produção de Texto,Período";
    const rows = alunosComResultado.map(a =>
      `"${a.nome}","${a.cmeiNome}","${a.turmaNome}","${desc(a.nivelEscritaCodigo, "escrita")}","${desc(a.nivelProducaoCodigo, "producao")}","${periodoNome}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `relatorio-sondagem-${periodoId}.csv`; link.click();
    URL.revokeObjectURL(url); toast.success("CSV exportado com sucesso!");
  };

  const exportPDF = async () => {
    if (alunosComResultado.length === 0) { toast.error("Nenhum dado para exportar."); return; }
    const doc = new jsPDF();
    const config = await getPrincipalReportConfig();
    let y = addPdfHeaderFooter(doc, config);
    doc.setFontSize(16); doc.setTextColor(0); doc.text("Relatório de Sondagem", 14, y); y += 8;
    doc.setFontSize(10); doc.setTextColor(100); doc.text(`Período: ${periodoNome}`, 14, y); y += 6;
    const cmeiNome = cmeiId === "all" ? "Todas" : cmeis.find(c => c.id === cmeiId)?.nome || "";
    const turmaNome = turmaId === "all" ? "Todas" : turmasFiltradas.find(t => t.id === turmaId)?.nome || "";
    doc.text(`Instituição: ${cmeiNome}  |  Turma: ${turmaNome}`, 14, y); y += 8;
    doc.setTextColor(0); doc.setFontSize(11);
    doc.text(`Total avaliados: ${totalAvaliados}  |  Alfabetizados: ${totalAlfabetizados} (${percentAlfabetizados}%)`, 14, y); y += 8;

    // Student table
    autoTable(doc, {
      startY: y,
      head: [["Aluno", "Instituição", "Turma", "Nível Escrita", "Produção de Texto"]],
      body: alunosComResultado.map(a => [a.nome, a.cmeiNome, a.turmaNome, desc(a.nivelEscritaCodigo, "escrita"), desc(a.nivelProducaoCodigo, "producao")]),
      styles: { fontSize: 9 }, headStyles: { fillColor: [41, 98, 166] },
    });

    // Summary by level - Escrita
    let summaryY = (getLastAutoTableFinalY(doc) ?? 108) + 12;
    if (summaryY > doc.internal.pageSize.height - 60) { doc.addPage(); summaryY = 20; }
    doc.setFontSize(11); doc.setTextColor(0); doc.text("Resumo por Nível – Escrita", 14, summaryY);
    autoTable(doc, {
      startY: summaryY + 4,
      head: [["Nível", "Quantidade", "%"]],
      body: niveisEscrita.map(n => {
        const count = resultadosFiltrados.filter(r => r.nivelEscritaCodigo === n.codigo).length;
        const rgb = hslToRgb(getEscritaColor(n.codigo));
        return [n.descricao, count.toString(), `${totalAvaliados > 0 ? Math.round((count / totalAvaliados) * 100) : 0}%`];
      }),
      styles: { fontSize: 9 }, headStyles: { fillColor: [41, 98, 166] }, tableWidth: 120,
      didParseCell: (data: AutoTableCellHookData) => {
        if (data.section === 'body' && data.column.index === 0) {
          const nivel = niveisEscrita[data.row.index];
          if (nivel) {
            const rgb = hslToRgb(getEscritaColor(nivel.codigo));
            data.cell.styles.textColor = rgb;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    // Summary by level - Produção de Texto
    let prodY = (getLastAutoTableFinalY(doc) ?? 190) + 10;
    if (prodY > doc.internal.pageSize.height - 60) { doc.addPage(); prodY = 20; }
    doc.setFontSize(11); doc.text("Resumo por Nível – Produção de Texto", 14, prodY);
    autoTable(doc, {
      startY: prodY + 4,
      head: [["Nível", "Quantidade", "%"]],
      body: niveisProducaoTexto.map(n => {
        const count = resultadosFiltrados.filter(r => r.nivelProducaoCodigo === n.codigo).length;
        return [n.descricao, count.toString(), `${totalAvaliados > 0 ? Math.round((count / totalAvaliados) * 100) : 0}%`];
      }),
      styles: { fontSize: 9 }, headStyles: { fillColor: [41, 98, 166] }, tableWidth: 120,
      didParseCell: (data: AutoTableCellHookData) => {
        if (data.section === 'body' && data.column.index === 0) {
          const nivel = niveisProducaoTexto[data.row.index];
          if (nivel) {
            const rgb = hslToRgb(getProducaoColor(nivel.codigo));
            data.cell.styles.textColor = rgb;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    // === NÃO ATINGIRAM section in PDF ===
    let naoY = (getLastAutoTableFinalY(doc) ?? 188) + 12;
    if (naoY > doc.internal.pageSize.height - 80) { doc.addPage(); naoY = 20; }

    doc.setFontSize(12); doc.setTextColor(0);
    doc.text("Alunos que Não Atingiram Cada Nível", 14, naoY); naoY += 8;

    // Escrita - Não Atingiram table
    doc.setFontSize(10); doc.text("Escrita", 14, naoY); naoY += 2;
    autoTable(doc, {
      startY: naoY + 2,
      head: [["Nível", "Não Atingiram", "% Não Atingiram"]],
      body: escritaNaoAtingiramData.map(item => [
        item.nivel, item.naoAtingiram.toString(), `${item.pct}%`
      ]),
      styles: { fontSize: 9 }, headStyles: { fillColor: [180, 60, 60] }, tableWidth: 120,
      didParseCell: (data: AutoTableCellHookData) => {
        if (data.section === 'body' && data.column.index === 0) {
          const item = escritaNaoAtingiramData[data.row.index];
          if (item) {
            const rgb = hslToRgb(getEscritaColor(item.codigo));
            data.cell.styles.textColor = rgb;
            data.cell.styles.fontStyle = 'bold';
          }
        }
        if (data.section === 'body' && data.column.index === 2) {
          const item = escritaNaoAtingiramData[data.row.index];
          if (item && item.pct > 50) {
            data.cell.styles.textColor = [180, 40, 40];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    // Produção - Não Atingiram table
    let naoY2 = (getLastAutoTableFinalY(doc) ?? 192) + 8;
    if (naoY2 > doc.internal.pageSize.height - 60) { doc.addPage(); naoY2 = 20; }
    doc.setFontSize(10); doc.text("Produção de Texto", 14, naoY2); naoY2 += 2;
    autoTable(doc, {
      startY: naoY2 + 2,
      head: [["Nível", "Não Atingiram", "% Não Atingiram"]],
      body: producaoNaoAtingiramData.map(item => [
        item.nivel, item.naoAtingiram.toString(), `${item.pct}%`
      ]),
      styles: { fontSize: 9 }, headStyles: { fillColor: [180, 60, 60] }, tableWidth: 120,
      didParseCell: (data: AutoTableCellHookData) => {
        if (data.section === 'body' && data.column.index === 0) {
          const item = producaoNaoAtingiramData[data.row.index];
          if (item) {
            const rgb = hslToRgb(getProducaoColor(item.codigo));
            data.cell.styles.textColor = rgb;
            data.cell.styles.fontStyle = 'bold';
          }
        }
        if (data.section === 'body' && data.column.index === 2) {
          const item = producaoNaoAtingiramData[data.row.index];
          if (item && item.pct > 50) {
            data.cell.styles.textColor = [180, 40, 40];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    addFooterToAllPages(doc, config);
    doc.save(`relatorio-sondagem-${periodoId}.pdf`); toast.success("PDF exportado com sucesso!");
  };

  const exportIndividualPDF = async (alunoId: string) => {
    const dados = alunosComResultado.find(a => a.alunoId === alunoId);
    if (!dados) return;
    const doc = new jsPDF();
    const config = await getPrincipalReportConfig();
    let y = addPdfHeaderFooter(doc, config);
    doc.setFontSize(16); doc.setTextColor(0); doc.text("Relatório Individual de Sondagem", 14, y); y += 8;
    doc.setFontSize(10); doc.setTextColor(100); doc.text(`Período: ${periodoNome}`, 14, y); y += 8;
    doc.setTextColor(0); doc.setFontSize(12); doc.text(`Aluno(a): ${dados.nome}`, 14, y); y += 7;
    doc.setFontSize(10); doc.text(`CMEI: ${dados.cmeiNome}`, 14, y); y += 6;
    doc.text(`Turma: ${dados.turmaNome}`, 14, y); y += 6;
    doc.text(`Data de Nascimento: ${dados.dataNascimento}`, 14, y); y += 10;
    doc.setFontSize(12); doc.text("Resultado da Avaliação", 14, y); y += 6;
    autoTable(doc, {
      startY: y,
      head: [["Dimensão", "Nível"]],
      body: [["Escrita", desc(dados.nivelEscritaCodigo, "escrita")], ["Produção de Texto", desc(dados.nivelProducaoCodigo, "producao")]],
      styles: { fontSize: 10, cellPadding: 6 }, headStyles: { fillColor: [41, 98, 166] }, tableWidth: 120,
    });

    let refY = (getLastAutoTableFinalY(doc) ?? 108) + 12;

    const turmaAlunoId = allAlunos.find((a) => a.id === alunoId)?.turma || "";
    const turmaAlunosIds = turmaAlunoId ? allAlunos.filter((a) => a.turma === turmaAlunoId).map((a) => a.id) : [];

    try {
      const { supabase } = await import("@sondagem/integrations/supabase/client");
      const ids = turmaAlunosIds.length > 0 ? turmaAlunosIds : [alunoId];
      const { data: hist, error } = await supabase
        .from("sondagens")
        .select(`
          crianca_id,
          periodo,
          created_at,
          respostas_sondagem(
            niveis_aprendizagem(codigo, tipo, ordem)
          )
        `)
        .eq("status", "finalizado")
        .in("crianca_id", ids)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const latestByPeriodoCrianca = new Map<
        string,
        {
          periodo: string;
          criancaId: string;
          escrita: { ordem: number | null; codigo: string | null };
          producao: { ordem: number | null; codigo: string | null };
        }
      >();

      type HistoricoRow = {
        crianca_id: string;
        periodo: string;
        created_at: string | null;
        respostas_sondagem: Array<{
          niveis_aprendizagem: { codigo: string; tipo: string; ordem: number } | null;
        }> | null;
      };

      (hist as HistoricoRow[] | null | undefined || []).forEach((s) => {
        const periodo = String(s.periodo || "");
        if (!periodo) return;
        const criancaId = String(s.crianca_id || "");
        if (!criancaId) return;
        const escrita = extractNivel(s.respostas_sondagem, "escrita");
        const producao = extractNivel(s.respostas_sondagem, "producao_texto");
        const key = `${periodo}|${criancaId}`;
        latestByPeriodoCrianca.set(key, { periodo, criancaId, escrita, producao });
      });

      const byPeriodo = new Map<
        string,
        {
          alunoEscrita: { ordem: number | null; codigo: string | null };
          alunoProducao: { ordem: number | null; codigo: string | null };
          sumEscrita: number;
          countEscrita: number;
          sumProducao: number;
          countProducao: number;
        }
      >();

      latestByPeriodoCrianca.forEach((entry) => {
        const st =
          byPeriodo.get(entry.periodo) || {
            alunoEscrita: { ordem: null, codigo: null },
            alunoProducao: { ordem: null, codigo: null },
            sumEscrita: 0,
            countEscrita: 0,
            sumProducao: 0,
            countProducao: 0,
          };

        if (entry.escrita.ordem !== null) {
          st.sumEscrita += entry.escrita.ordem;
          st.countEscrita += 1;
        }
        if (entry.producao.ordem !== null) {
          st.sumProducao += entry.producao.ordem;
          st.countProducao += 1;
        }
        if (entry.criancaId === alunoId) {
          st.alunoEscrita = entry.escrita;
          st.alunoProducao = entry.producao;
        }

        byPeriodo.set(entry.periodo, st);
      });

      const periodosOrdenados = Array.from(byPeriodo.keys()).sort((a, b) => a.localeCompare(b));
      if (periodosOrdenados.length > 0) {
        doc.addPage();
        refY = addPdfHeaderFooter(doc, config);
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Evolução (Aluno vs Média da Turma)", 14, refY);
        refY += 6;

        const pageW = doc.internal.pageSize.width;
        const chartW = pageW - 28;

        const alunoEscritaSeries = periodosOrdenados.map((p) => byPeriodo.get(p)?.alunoEscrita || { ordem: null, codigo: null });
        const alunoProducaoSeries = periodosOrdenados.map((p) => byPeriodo.get(p)?.alunoProducao || { ordem: null, codigo: null });

        const siglasEscrita = Array.from(
          new Set(alunoEscritaSeries.map((p) => p.codigo).filter((c): c is string => !!c)),
        );
        const siglasProducao = Array.from(
          new Set(alunoProducaoSeries.map((p) => p.codigo).filter((c): c is string => !!c)),
        );
        const itensEscrita = siglasEscrita.map((c) => `${c} = ${getNivelDescricao(c, "escrita", niveisEscrita, niveisProducaoTexto)}`);
        const itensProducao = siglasProducao.map((c) => `${c} = ${getNivelDescricao(c, "producao", niveisEscrita, niveisProducaoTexto)}`);
        const maxWidth = doc.internal.pageSize.width - 28;
        const linhas = [
          itensEscrita.length ? `Siglas (Escrita): ${itensEscrita.join("; ")}` : "",
          itensProducao.length ? `Siglas (Produção de Texto): ${itensProducao.join("; ")}` : "",
        ]
          .filter(Boolean)
          .flatMap((t) => doc.splitTextToSize(t, maxWidth) as string[]);

        const noteH = linhas.length ? 4 * linhas.length + 6 : 0;
        const bottomLimit = doc.internal.pageSize.height - 18;
        const available = bottomLimit - refY;
        const chartHeight = Math.max(45, Math.min(70, Math.floor((available - noteH - 24) / 2)));

        const mediaEscritaSeries = periodosOrdenados.map((p) => {
          const st = byPeriodo.get(p);
          if (!st || st.countEscrita === 0) return null;
          return st.sumEscrita / st.countEscrita;
        });
        drawEvolutionChart({
          doc,
          x: 14,
          y: refY,
          width: chartW,
          height: chartHeight,
          title: "Escrita",
          labels: periodosOrdenados,
          aluno: alunoEscritaSeries,
          media: mediaEscritaSeries,
          niveis: niveisEscrita,
        });
        refY += chartHeight + 12;

        const mediaProducaoSeries = periodosOrdenados.map((p) => {
          const st = byPeriodo.get(p);
          if (!st || st.countProducao === 0) return null;
          return st.sumProducao / st.countProducao;
        });
        drawEvolutionChart({
          doc,
          x: 14,
          y: refY,
          width: chartW,
          height: chartHeight,
          title: "Produção de Texto",
          labels: periodosOrdenados,
          aluno: alunoProducaoSeries,
          media: mediaProducaoSeries,
          niveis: niveisProducaoTexto,
        });
        refY += chartHeight + 14;

        if (linhas.length) {
          if (refY + noteH > bottomLimit) {
            doc.addPage();
            refY = addPdfHeaderFooter(doc, config);
          }
          doc.setFontSize(8);
          doc.setTextColor(90);
          doc.text(linhas, 14, refY);
          refY += noteH;
        }
      }
    } catch (_e) {
      refY = ensurePdfSpace(doc, config, refY, 10);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text("Não foi possível gerar a evolução (histórico/média da turma).", 14, refY);
      refY += 8;
    }
    addFooterToAllPages(doc, config);
    doc.save(`relatorio-individual-${dados.nome.replace(/\s+/g, "-").toLowerCase()}-${periodoId}.pdf`);
    toast.success(`PDF de ${dados.nome} exportado!`);
  };

  // ===== DEVOLUTIVA PARA ESCOLA =====
  const exportDevolutivaPDF = async () => {
    if (alunosComResultado.length === 0) { toast.error("Nenhum dado para exportar."); return; }
    const doc = new jsPDF();
    const config = await getPrincipalReportConfig();
    const cmeiNome = cmeiId === "all" ? "Todos os CMEIs" : cmeis.find(c => c.id === cmeiId)?.nome || "";

    // Page 1 - Cover
    let y = addPdfHeaderFooter(doc, config);
    doc.setFontSize(18); doc.setTextColor(41, 98, 166);
    doc.text("Devolutiva Pedagógica", doc.internal.pageSize.width / 2, y + 10, { align: "center" });
    doc.setFontSize(12); doc.setTextColor(80);
    doc.text(cmeiNome, doc.internal.pageSize.width / 2, y + 20, { align: "center" });
    doc.text(`Período: ${periodoNome}`, doc.internal.pageSize.width / 2, y + 28, { align: "center" });
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, doc.internal.pageSize.width / 2, y + 36, { align: "center" });

    // Page 2 - Resumo Geral
    doc.addPage();
    y = addPdfHeaderFooter(doc, config);
    doc.setFontSize(14); doc.setTextColor(41, 98, 166);
    doc.text("Resumo Geral", 14, y); y += 8;
    doc.setFontSize(10); doc.setTextColor(0);
    doc.text(`Total de alunos avaliados: ${totalAvaliados}`, 14, y); y += 5;
    doc.text(`Alfabetizados (Escrita ALF): ${totalAlfabetizados} (${percentAlfabetizados}%)`, 14, y); y += 5;
    doc.text(`CMEI: ${cmeiNome}`, 14, y); y += 8;

    // Escrita summary
    doc.setFontSize(11); doc.setTextColor(41, 98, 166);
    doc.text("Distribuição por Nível – Escrita", 14, y); y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Nível", "Qtd", "%"]],
      body: niveisEscrita.map(n => {
        const count = resultadosFiltrados.filter(r => r.nivelEscritaCodigo === n.codigo).length;
        return [n.descricao, count.toString(), `${totalAvaliados > 0 ? Math.round((count / totalAvaliados) * 100) : 0}%`];
      }),
      styles: { fontSize: 9 }, headStyles: { fillColor: [41, 98, 166] }, tableWidth: 130,
    });

    // Produção summary
    y = (getLastAutoTableFinalY(doc) ?? y) + 8;
    doc.setFontSize(11); doc.setTextColor(41, 98, 166);
    doc.text("Distribuição por Nível – Produção de Texto", 14, y); y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Nível", "Qtd", "%"]],
      body: niveisProducaoTexto.map(n => {
        const count = resultadosFiltrados.filter(r => r.nivelProducaoCodigo === n.codigo).length;
        return [n.descricao, count.toString(), `${totalAvaliados > 0 ? Math.round((count / totalAvaliados) * 100) : 0}%`];
      }),
      styles: { fontSize: 9 }, headStyles: { fillColor: [41, 98, 166] }, tableWidth: 130,
    });

    // Per-turma breakdown
    const turmasComDados = turmasFiltradas.filter(t => {
      return resultadosFiltrados.some(r => {
        const aluno = allAlunos.find(a => a.id === r.alunoId);
        return aluno?.turma === t.id;
      });
    });

    turmasComDados.forEach(turma => {
      doc.addPage();
      y = addPdfHeaderFooter(doc, config);
      doc.setFontSize(14); doc.setTextColor(41, 98, 166);
      doc.text(`Turma: ${turma.nome}`, 14, y); y += 8;

      const turmaResultados = resultadosFiltrados.filter(r => {
        const aluno = allAlunos.find(a => a.id === r.alunoId);
        return aluno?.turma === turma.id;
      });
      const turmaTotal = turmaResultados.length;
      const turmaAlf = turmaResultados.filter(r => r.nivelEscritaCodigo === "ALF").length;

      doc.setFontSize(10); doc.setTextColor(0);
      doc.text(`Avaliados: ${turmaTotal}  |  Alfabetizados: ${turmaAlf} (${turmaTotal > 0 ? Math.round((turmaAlf / turmaTotal) * 100) : 0}%)`, 14, y);
      y += 8;

      // Escrita by turma
      doc.setFontSize(10); doc.setTextColor(41, 98, 166);
      doc.text("Escrita", 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Nível", "Qtd", "%"]],
        body: niveisEscrita.map(n => {
          const count = turmaResultados.filter(r => r.nivelEscritaCodigo === n.codigo).length;
          return [n.descricao, count.toString(), `${turmaTotal > 0 ? Math.round((count / turmaTotal) * 100) : 0}%`];
        }),
        styles: { fontSize: 9 }, headStyles: { fillColor: [41, 98, 166] }, tableWidth: 120,
      });

      y = (getLastAutoTableFinalY(doc) ?? y) + 6;
      doc.setTextColor(41, 98, 166);
      doc.text("Produção de Texto", 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Nível", "Qtd", "%"]],
        body: niveisProducaoTexto.map(n => {
          const count = turmaResultados.filter(r => r.nivelProducaoCodigo === n.codigo).length;
          return [n.descricao, count.toString(), `${turmaTotal > 0 ? Math.round((count / turmaTotal) * 100) : 0}%`];
        }),
        styles: { fontSize: 9 }, headStyles: { fillColor: [41, 98, 166] }, tableWidth: 120,
      });

      // Student list for turma
      y = (getLastAutoTableFinalY(doc) ?? y) + 8;
      if (y > doc.internal.pageSize.height - 60) { doc.addPage(); y = addPdfHeaderFooter(doc, config); }
      doc.setFontSize(10); doc.setTextColor(0);
      doc.text("Alunos:", 14, y); y += 4;
      const turmaAlunos = turmaResultados.map(r => {
        const aluno = allAlunos.find(a => a.id === r.alunoId);
        return [
          aluno?.nome || "Desconhecido",
          desc(r.nivelEscritaCodigo, "escrita"),
          desc(r.nivelProducaoCodigo, "producao"),
        ];
      });
      autoTable(doc, {
        startY: y,
        head: [["Aluno", "Escrita", "Produção"]],
        body: turmaAlunos,
        styles: { fontSize: 8 }, headStyles: { fillColor: [100, 100, 100] },
      });
    });

    // Recommendations page
    doc.addPage();
    y = addPdfHeaderFooter(doc, config);
    doc.setFontSize(14); doc.setTextColor(41, 98, 166);
    doc.text("Recomendações e Observações", 14, y); y += 10;
    doc.setFontSize(10); doc.setTextColor(60);
    doc.text("Espaço reservado para anotações da equipe pedagógica:", 14, y); y += 8;

    // Draw lines for handwriting
    for (let i = 0; i < 20; i++) {
      doc.setDrawColor(200);
      doc.line(14, y, doc.internal.pageSize.width - 14, y);
      y += 8;
    }

    addFooterToAllPages(doc, config);
    doc.save(`devolutiva-${cmeiNome.replace(/\s+/g, "-").toLowerCase()}-${periodoId}.pdf`);
    toast.success("Devolutiva exportada com sucesso!");
  };

  const selectedAluno = useMemo(() => {
    if (!selectedAlunoId) return null;
    return alunosComResultado.find(a => a.alunoId === selectedAlunoId) || null;
  }, [selectedAlunoId, alunosComResultado]);

  const compChartConfig: ChartConfig = {
    [periodoId]: { label: periodoNome, color: "hsl(215, 80%, 55%)" },
    [periodoCompararId]: { label: periodoCompararNome, color: "hsl(35, 90%, 55%)" },
  };

  return (
    <VagouReportShell
      title="Relatórios"
      description="Acompanhe os resultados da sondagem por instituição, turma e período."
    >
      {/* Filtros + Export */}
      <Card className="border-l-4 border-l-primary/60 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Filtros</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> Exportar</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportPDF} className="gap-2"><FileText className="h-4 w-4" /> Exportar PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={exportCSV} className="gap-2"><FileSpreadsheet className="h-4 w-4" /> Exportar CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={exportDevolutivaPDF} className="gap-2"><FileText className="h-4 w-4" /> Devolutiva para Instituição</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0">
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Instituição</label>
              {isCoordinator ? (
                <Input
                  value={cmeis.find((c) => c.id === cmeiId)?.nome || ""}
                  readOnly
                  className="w-full"
                />
              ) : (
                <Select value={cmeiId} onValueChange={(v) => { setCmeiId(v); setTurmaId("all"); }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {cmeis.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="min-w-0">
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Turma</label>
              <Select value={turmaId} onValueChange={setTurmaId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {turmasFiltradas.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Período</label>
              <Select value={periodoId} onValueChange={setPeriodoId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {periodos.map(p => {
                    const count = contagemPorPeriodo[p.codigo] || 0;
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          {p.nome}
                          {p.isOpen ? (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">aberto</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-destructive/30 text-destructive">
                              fechado
                            </Badge>
                          )}
                          {count > 0 ? (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-[20px] justify-center">{count}</Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">sem dados</span>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Avaliados",
            value: loadingResultados ? "..." : String(totalAvaliados),
            icon: Users,
            accent: "border-l-primary",
            iconBg: "bg-primary/10",
            iconStyle: undefined as React.CSSProperties | undefined,
            iconColor: "text-primary",
            iconColorStyle: undefined as React.CSSProperties | undefined,
          },
          {
            label: "Alfabetizados",
            value: loadingResultados ? "..." : `${totalAlfabetizados} (${percentAlfabetizados}%)`,
            icon: TrendingUp,
            accent: "border-l-[hsl(142,71%,40%)]",
            iconBg: "",
            iconStyle: { backgroundColor: "hsla(142, 71%, 40%, 0.12)" },
            iconColor: "",
            iconColorStyle: { color: "hsl(142, 71%, 40%)" },
          },
          {
            label: "Não Atingiram",
            value: loadingResultados ? "..." : `${naoAlfabetizados} (${percentNaoAlfabetizados}%)`,
            icon: TrendingDown,
            accent: "border-l-[hsl(0,72%,51%)]",
            iconBg: "",
            iconStyle: { backgroundColor: "hsla(0, 72%, 51%, 0.12)" },
            iconColor: "",
            iconColorStyle: { color: "hsl(0, 72%, 51%)" },
          },
          {
            label: "Período",
            value: periodoNome,
            icon: BarChart3,
            accent: "border-l-primary",
            iconBg: "bg-primary/10",
            iconStyle: undefined,
            iconColor: "text-primary",
            iconColorStyle: undefined,
          },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.label}
              className={`animate-fade-up border border-l-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${kpi.accent}`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`rounded-xl p-3 ${kpi.iconBg}`} style={kpi.iconStyle}>
                  <Icon className={`h-5 w-5 ${kpi.iconColor}`} style={kpi.iconColorStyle} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground">{kpi.label}</p>
                  <p className="truncate text-xl font-bold text-foreground sm:text-2xl">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Metas indicator */}
      {metas.length > 0 && totalAvaliados > 0 && (
        <Card className="border-primary/20">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Indicadores de Meta – {periodoNome}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {metas.map(meta => {
                const tipoLabel = meta.tipo === "escrita" ? "Escrita" : "Produção";
                const nivelMeta = niveis.find(n => n.codigo === meta.nivel_codigo && n.tipo === (meta.tipo === "producao_texto" ? "producao_texto" : "escrita"));
                const nivelMetaOrdem = nivelMeta?.ordem ?? 0;
                const atingiram = resultadosFiltrados.filter(r => {
                  const codigo = meta.tipo === "escrita" ? r.nivelEscritaCodigo : r.nivelProducaoCodigo;
                  const nivelAluno = niveis.find(n => n.codigo === codigo && n.tipo === (meta.tipo === "producao_texto" ? "producao_texto" : "escrita"));
                  return (nivelAluno?.ordem ?? 0) >= nivelMetaOrdem;
                }).length;
                const pct = Math.round((atingiram / totalAvaliados) * 100);
                const turmaLabel = meta.turma_tipo
                  ? meta.turma_tipo.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())
                  : "Todas";
                return (
                  <div key={meta.id} className="rounded-xl border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">{tipoLabel} • {turmaLabel}</span>
                      <Badge variant={pct >= 70 ? "default" : "secondary"} className="text-xs">
                        {pct}%
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold text-foreground">
                        {atingiram}/{totalAvaliados}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        atingiram {nivelMeta?.descricao || meta.nivel_codigo} ou superior
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    {meta.descricao && (
                      <p className="text-xs text-muted-foreground italic">{meta.descricao}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {loadingResultados ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando dados...</span>
        </div>
      ) : (
        <Tabs defaultValue="escrita" className="space-y-4">
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="inline-flex w-max">
              <TabsTrigger value="escrita" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Escrita</TabsTrigger>
              <TabsTrigger value="producao" className="gap-1.5"><PieChartIcon className="h-4 w-4" /> Produção de Texto</TabsTrigger>
              <TabsTrigger value="nao-atingiram" className="gap-1.5"><TrendingDown className="h-4 w-4" /> Não Atingiram</TabsTrigger>
              <TabsTrigger value="comparar" className="gap-1.5"><ArrowLeftRight className="h-4 w-4" /> Comparar Períodos</TabsTrigger>
              <TabsTrigger value="individual" className="gap-1.5"><User className="h-4 w-4" /> Por Aluno</TabsTrigger>
            </TabsList>
          </div>

          {/* TAB ESCRITA */}
          <TabsContent value="escrita" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Distribuição por Nível – Escrita</CardTitle></CardHeader>
                <CardContent>
                  {totalAvaliados === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">Nenhum dado disponível.</p>
                  ) : (
                    <ChartContainer config={escritaChartConfig} className="h-[280px] w-full">
                      <BarChart data={escritaBarData} accessibilityLayer>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="nivel" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent nameKey="nivel" />} />
                        <Bar dataKey="quantidade" radius={[6, 6, 0, 0]}>
                          {escritaBarData.map(entry => (
                            <Cell key={entry.nivel} fill={getEscritaColor(entry.nivel)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Composição – Escrita</CardTitle></CardHeader>
                <CardContent>
                  {totalAvaliados === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">Nenhum dado disponível.</p>
                  ) : (
                    <ChartContainer config={escritaChartConfig} className="h-[280px] w-full">
                      <PieChart accessibilityLayer>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Pie data={escritaPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                          {escritaPieData.map(entry => (
                            <Cell key={entry.codigo} fill={getEscritaColor(entry.codigo)} />
                          ))}
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                      </PieChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {niveisEscrita.map(nivel => {
                const count = resultadosFiltrados.filter(r => r.nivelEscritaCodigo === nivel.codigo).length;
                const pct = totalAvaliados > 0 ? Math.round((count / totalAvaliados) * 100) : 0;
                const color = getEscritaColor(nivel.codigo);
                return (
                  <Card key={nivel.id} className="border-l-4" style={{ borderLeftColor: color }}>
                    <CardContent className="pt-4 pb-4 text-center">
                      <p className="text-xs font-semibold" style={{ color }}>{nivel.descricao}</p>
                      <p className="text-xl font-bold text-foreground">{count}</p>
                      <p className="text-xs text-muted-foreground">{pct}%</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB PRODUÇÃO */}
          <TabsContent value="producao" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Distribuição por Nível – Produção de Texto</CardTitle></CardHeader>
                <CardContent>
                  {totalAvaliados === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">Nenhum dado disponível.</p>
                  ) : (
                    <ChartContainer config={producaoChartConfig} className="h-[280px] w-full">
                      <BarChart data={producaoBarData} accessibilityLayer>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="nivel" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent nameKey="nivel" />} />
                        <Bar dataKey="quantidade" radius={[6, 6, 0, 0]}>
                          {producaoBarData.map(entry => (
                            <Cell key={entry.nivel} fill={getProducaoColor(entry.nivel)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Composição – Produção de Texto</CardTitle></CardHeader>
                <CardContent>
                  {totalAvaliados === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">Nenhum dado disponível.</p>
                  ) : (
                    <ChartContainer config={producaoChartConfig} className="h-[280px] w-full">
                      <PieChart accessibilityLayer>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Pie data={producaoPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                          {producaoPieData.map(entry => (
                            <Cell key={entry.codigo} fill={getProducaoColor(entry.codigo)} />
                          ))}
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                      </PieChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {niveisProducaoTexto.map(nivel => {
                const count = resultadosFiltrados.filter(r => r.nivelProducaoCodigo === nivel.codigo).length;
                const pct = totalAvaliados > 0 ? Math.round((count / totalAvaliados) * 100) : 0;
                const color = getProducaoColor(nivel.codigo);
                return (
                  <Card key={nivel.id} className="border-l-4" style={{ borderLeftColor: color }}>
                    <CardContent className="pt-4 pb-4 text-center">
                      <p className="text-xs font-semibold" style={{ color }}>{nivel.descricao}</p>
                      <p className="text-xl font-bold text-foreground">{count}</p>
                      <p className="text-xs text-muted-foreground">{pct}%</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB NÃO ATINGIRAM */}
          <TabsContent value="nao-atingiram" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">% de Alunos que Não Atingiram Cada Nível – Escrita</CardTitle>
              </CardHeader>
              <CardContent>
                {totalAvaliados === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">Nenhum dado disponível.</p>
                ) : (
                  <div className="space-y-3">
                    {escritaNaoAtingiramData.map(item => (
                      <div key={item.codigo} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium" style={{ color: getEscritaColor(item.codigo) }}>{item.nivel}</span>
                          <span className="text-muted-foreground">{item.naoAtingiram} alunos ({item.pct}%)</span>
                        </div>
                        <Progress value={item.pct} className="h-3" style={{ '--progress-color': getEscritaColor(item.codigo) } as React.CSSProperties} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">% de Alunos que Não Atingiram Cada Nível – Produção de Texto</CardTitle>
              </CardHeader>
              <CardContent>
                {totalAvaliados === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">Nenhum dado disponível.</p>
                ) : (
                  <div className="space-y-3">
                    {producaoNaoAtingiramData.map(item => (
                      <div key={item.codigo} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium" style={{ color: getProducaoColor(item.codigo) }}>{item.nivel}</span>
                          <span className="text-muted-foreground">{item.naoAtingiram} alunos ({item.pct}%)</span>
                        </div>
                        <Progress value={item.pct} className="h-3" style={{ '--progress-color': getProducaoColor(item.codigo) } as React.CSSProperties} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bar chart version */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Gráfico – Não Atingiram (Escrita)</CardTitle></CardHeader>
                <CardContent>
                  {totalAvaliados === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">Nenhum dado disponível.</p>
                  ) : (
                    <ChartContainer config={escritaChartConfig} className="h-[280px] w-full">
                      <BarChart data={escritaNaoAtingiramData} accessibilityLayer>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="codigo" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} unit="%" />
                        <ChartTooltip content={<ChartTooltipContent nameKey="nivel" />} />
                        <Bar dataKey="pct" name="% Não atingiram" radius={[6, 6, 0, 0]}>
                          {escritaNaoAtingiramData.map(entry => (
                            <Cell key={entry.codigo} fill={getEscritaColor(entry.codigo)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Gráfico – Não Atingiram (Produção)</CardTitle></CardHeader>
                <CardContent>
                  {totalAvaliados === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">Nenhum dado disponível.</p>
                  ) : (
                    <ChartContainer config={producaoChartConfig} className="h-[280px] w-full">
                      <BarChart data={producaoNaoAtingiramData} accessibilityLayer>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="codigo" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} unit="%" />
                        <ChartTooltip content={<ChartTooltipContent nameKey="nivel" />} />
                        <Bar dataKey="pct" name="% Não atingiram" radius={[6, 6, 0, 0]}>
                          {producaoNaoAtingiramData.map(entry => (
                            <Cell key={entry.codigo} fill={getProducaoColor(entry.codigo)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB COMPARAR PERÍODOS */}
          <TabsContent value="comparar" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Período Base</label>
                    <div className="px-3 py-2 rounded-md border bg-muted/50 text-sm font-medium">{periodoNome}</div>
                  </div>
                  <div className="flex items-center pt-5">
                    <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Comparar com</label>
                    <Select value={periodoCompararId} onValueChange={setPeriodoCompararId}>
                      <SelectTrigger><SelectValue placeholder="Selecione um período" /></SelectTrigger>
                      <SelectContent>
                        {periodos.filter(p => p.id !== periodoId).map(p => {
                          const count = contagemPorPeriodo[p.codigo] || 0;
                          return (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="flex items-center gap-2">
                                {p.nome}
                                {count > 0 ? (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-[20px] justify-center">{count}</Badge>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground italic">sem dados</span>
                                )}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!periodoCompararId ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ArrowLeftRight className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Selecione um segundo período para comparar os resultados lado a lado.</p>
                </CardContent>
              </Card>
            ) : loadingComparar ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Carregando dados do período...</span>
              </div>
            ) : (
              <>
                {/* KPIs side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-l-4 border-l-[hsl(215,80%,55%)]">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">{periodoNome}</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-3 gap-2 text-center">
                      <div><p className="text-xs text-muted-foreground">Avaliados</p><p className="text-lg font-bold">{totalAvaliados}</p></div>
                      <div><p className="text-xs text-muted-foreground">Alfabetizados</p><p className="text-lg font-bold">{totalAlfabetizados}</p></div>
                      <div><p className="text-xs text-muted-foreground">% Alf.</p><p className="text-lg font-bold">{percentAlfabetizados}%</p></div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-[hsl(35,90%,55%)]">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">{periodoCompararNome}</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-3 gap-2 text-center">
                      <div><p className="text-xs text-muted-foreground">Avaliados</p><p className="text-lg font-bold">{totalAvaliadosComparar}</p></div>
                      <div><p className="text-xs text-muted-foreground">Alfabetizados</p><p className="text-lg font-bold">{resultadosCompararFiltrados.filter(r => r.nivelEscritaCodigo === "ALF").length}</p></div>
                      <div><p className="text-xs text-muted-foreground">% Alf.</p><p className="text-lg font-bold">{totalAvaliadosComparar > 0 ? Math.round((resultadosCompararFiltrados.filter(r => r.nivelEscritaCodigo === "ALF").length / totalAvaliadosComparar) * 100) : 0}%</p></div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Escrita – Comparação por Nível</CardTitle></CardHeader>
                    <CardContent>
                      <ChartContainer config={compChartConfig} className="h-[300px] w-full">
                        <BarChart data={compEscritaBarData} accessibilityLayer>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="nivel" tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey={periodoId} name={periodoNome} fill="hsl(215, 80%, 55%)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey={periodoCompararId} name={periodoCompararNome} fill="hsl(35, 90%, 55%)" radius={[4, 4, 0, 0]} />
                          <ChartLegend content={<ChartLegendContent />} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Produção de Texto – Comparação por Nível</CardTitle></CardHeader>
                    <CardContent>
                      <ChartContainer config={compChartConfig} className="h-[300px] w-full">
                        <BarChart data={compProducaoBarData} accessibilityLayer>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="nivel" tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey={periodoId} name={periodoNome} fill="hsl(215, 80%, 55%)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey={periodoCompararId} name={periodoCompararNome} fill="hsl(35, 90%, 55%)" radius={[4, 4, 0, 0]} />
                          <ChartLegend content={<ChartLegendContent />} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Não Atingiram comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Não Atingiram – Escrita</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {niveisEscrita.map(nivel => {
                          const base = escritaNaoAtingiramData.find(d => d.codigo === nivel.codigo);
                          const comp = compEscritaNaoAtingiram.find(d => d.codigo === nivel.codigo);
                          const color = getEscritaColor(nivel.codigo);
                          return (
                            <div key={nivel.codigo} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium" style={{ color }}>{nivel.descricao}</span>
                                <div className="flex gap-3 text-xs text-muted-foreground">
                                  <span className="text-[hsl(215,80%,55%)]">{periodoNome}: {base?.pct ?? 0}%</span>
                                  <span className="text-[hsl(35,90%,55%)]">{periodoCompararNome}: {comp?.pct ?? 0}%</span>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${base?.pct ?? 0}%`, backgroundColor: "hsl(215, 80%, 55%)" }} />
                                </div>
                                <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${comp?.pct ?? 0}%`, backgroundColor: "hsl(35, 90%, 55%)" }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Não Atingiram – Produção de Texto</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {niveisProducaoTexto.map(nivel => {
                          const base = producaoNaoAtingiramData.find(d => d.codigo === nivel.codigo);
                          const comp = compProducaoNaoAtingiram.find(d => d.codigo === nivel.codigo);
                          const color = getProducaoColor(nivel.codigo);
                          return (
                            <div key={nivel.codigo} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium" style={{ color }}>{nivel.descricao}</span>
                                <div className="flex gap-3 text-xs text-muted-foreground">
                                  <span className="text-[hsl(215,80%,55%)]">{periodoNome}: {base?.pct ?? 0}%</span>
                                  <span className="text-[hsl(35,90%,55%)]">{periodoCompararNome}: {comp?.pct ?? 0}%</span>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${base?.pct ?? 0}%`, backgroundColor: "hsl(215, 80%, 55%)" }} />
                                </div>
                                <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${comp?.pct ?? 0}%`, backgroundColor: "hsl(35, 90%, 55%)" }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* TAB POR ALUNO */}
          <TabsContent value="individual" className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchAluno} onChange={(e) => { setSearchAluno(e.target.value); setPaginaAlunos(1); }} placeholder="Buscar aluno por nome..." className="pl-9" />
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Relatório Individual por Aluno</CardTitle></CardHeader>
              <CardContent>
                {alunosComResultado.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">Nenhum dado disponível.</p>
                ) : (() => {
                  const filtered = searchAluno.trim()
                    ? alunosComResultado.filter(a => a.nome.toLowerCase().includes(searchAluno.toLowerCase()))
                    : alunosComResultado;
                  const totalPaginas = Math.ceil(filtered.length / ALUNOS_POR_PAGINA);
                  const paginaAtual = Math.min(paginaAlunos, totalPaginas || 1);
                  const inicio = (paginaAtual - 1) * ALUNOS_POR_PAGINA;
                  const paginados = filtered.slice(inicio, inicio + ALUNOS_POR_PAGINA);
                  return filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">Nenhum aluno encontrado para "{searchAluno}".</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Aluno</TableHead>
                              <TableHead>CMEI</TableHead>
                              <TableHead>Turma</TableHead>
                              <TableHead>Escrita</TableHead>
                              <TableHead>Produção</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginados.map(a => (
                              <TableRow key={a.alunoId}>
                                <TableCell className="font-medium">{a.nome}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{a.cmeiNome}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{a.turmaNome}</TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center gap-1.5 text-sm px-2 py-0.5 rounded-full border" style={{ borderColor: getEscritaColor(a.nivelEscritaCodigo), color: getEscritaColor(a.nivelEscritaCodigo) }}>
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getEscritaColor(a.nivelEscritaCodigo) }} />
                                    {desc(a.nivelEscritaCodigo, "escrita")}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center gap-1.5 text-sm px-2 py-0.5 rounded-full border" style={{ borderColor: getProducaoColor(a.nivelProducaoCodigo), color: getProducaoColor(a.nivelProducaoCodigo) }}>
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getProducaoColor(a.nivelProducaoCodigo) }} />
                                    {desc(a.nivelProducaoCodigo, "producao")}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => navigate(`/modulo/sondar/aluno/${a.alunoId}`)} title="Ficha do Aluno"><User className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => setSelectedAlunoId(a.alunoId)} title="Visualizar"><Eye className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => exportIndividualPDF(a.alunoId)} title="Exportar PDF Individual"><FileText className="h-4 w-4" /></Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {totalPaginas > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t">
                          <p className="text-xs text-muted-foreground">
                            Mostrando {inicio + 1}–{Math.min(inicio + ALUNOS_POR_PAGINA, filtered.length)} de {filtered.length} alunos
                          </p>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              disabled={paginaAtual <= 1}
                              onClick={() => setPaginaAlunos(paginaAtual - 1)}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                              .filter(p => p === 1 || p === totalPaginas || Math.abs(p - paginaAtual) <= 1)
                              .map((p, idx, arr) => (
                                <span key={p}>
                                  {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-xs text-muted-foreground px-1">…</span>}
                                  <Button
                                    variant={p === paginaAtual ? "default" : "outline"}
                                    size="icon"
                                    className="h-8 w-8 text-xs"
                                    onClick={() => setPaginaAlunos(p)}
                                  >
                                    {p}
                                  </Button>
                                </span>
                              ))}
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              disabled={paginaAtual >= totalPaginas}
                              onClick={() => setPaginaAlunos(paginaAtual + 1)}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Dialog Individual */}
      <Dialog open={!!selectedAlunoId} onOpenChange={(open) => !open && setSelectedAlunoId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Relatório Individual</DialogTitle>
            <DialogDescription>Visualize os resultados do aluno no período selecionado e exporte o PDF.</DialogDescription>
          </DialogHeader>
          {selectedAluno && (
            <div className="space-y-5">
              <div className="rounded-xl bg-muted/50 p-4 space-y-1.5">
                <p className="text-lg font-semibold text-foreground">{selectedAluno.nome}</p>
                <p className="text-sm text-muted-foreground">CMEI: {selectedAluno.cmeiNome}</p>
                <p className="text-sm text-muted-foreground">Turma: {selectedAluno.turmaNome}</p>
                <p className="text-sm text-muted-foreground">Nascimento: {selectedAluno.dataNascimento}</p>
                <p className="text-sm text-muted-foreground">Período: {periodoNome}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-l-4" style={{ borderLeftColor: getEscritaColor(selectedAluno.nivelEscritaCodigo) }}>
                  <CardContent className="pt-4 pb-4 text-center">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Escrita</p>
                    <span className="text-base font-bold" style={{ color: getEscritaColor(selectedAluno.nivelEscritaCodigo) }}>
                      {desc(selectedAluno.nivelEscritaCodigo, "escrita")}
                    </span>
                  </CardContent>
                </Card>
                <Card className="border-l-4" style={{ borderLeftColor: getProducaoColor(selectedAluno.nivelProducaoCodigo) }}>
                  <CardContent className="pt-4 pb-4 text-center">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Produção de Texto</p>
                    <span className="text-base font-bold" style={{ color: getProducaoColor(selectedAluno.nivelProducaoCodigo) }}>
                      {desc(selectedAluno.nivelProducaoCodigo, "producao")}
                    </span>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Escala de Referência – Escrita</p>
                <div className="flex flex-wrap gap-1.5">
                  {niveisEscrita.map(n => {
                    const isActive = n.codigo === selectedAluno.nivelEscritaCodigo;
                    const color = getEscritaColor(n.codigo);
                    return (
                      <span key={n.id} className={`text-xs px-2 py-1 rounded-md border font-medium ${isActive ? "text-white" : ""}`}
                        style={isActive ? { backgroundColor: color, borderColor: color, color: "white" } : { borderColor: color, color }}>
                        {n.codigo} – {n.descricao}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Escala de Referência – Produção de Texto</p>
                <div className="flex flex-wrap gap-1.5">
                  {niveisProducaoTexto.map(n => {
                    const isActive = n.codigo === selectedAluno.nivelProducaoCodigo;
                    const color = getProducaoColor(n.codigo);
                    return (
                      <span key={n.id} className={`text-xs px-2 py-1 rounded-md border font-medium ${isActive ? "text-white" : ""}`}
                        style={isActive ? { backgroundColor: color, borderColor: color, color: "white" } : { borderColor: color, color }}>
                        {n.codigo} – {n.descricao}
                      </span>
                    );
                  })}
                </div>
              </div>
              <Button onClick={() => exportIndividualPDF(selectedAluno.alunoId)} className="w-full gap-2">
                <FileText className="h-4 w-4" /> Exportar PDF Individual
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </VagouReportShell>
  );
}
