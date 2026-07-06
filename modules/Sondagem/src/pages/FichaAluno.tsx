import { useState, useMemo } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card";
import { Button } from "@ui/button";
import { Textarea } from "@ui/textarea";
import { Badge } from "@ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ui/table";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { ArrowLeft, FileText, User, TrendingUp, StickyNote, Trash2, Plus, Calendar } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@sondagem/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNiveis } from "@sondagem/hooks/useSupabaseData";
import { useHistoricoSondagens } from "@sondagem/hooks/useHistoricoSondagens";
import { useAnotacoesAluno, useCreateAnotacao, useDeleteAnotacao } from "@sondagem/hooks/useAnotacoesAluno";
import { useAuth } from "@root/contexts/AuthContext";
import { getEscritaColor, getProducaoColor } from "@sondagem/lib/nivelColors";
import { fetchPrincipalCriancas } from "@sondagem/lib/principalData";
import { getPrincipalReportConfig, type ReportHeaderFooter } from "@sondagem/lib/reportConfig";

type AlunoFicha = {
  id: string;
  nome: string;
  data_nascimento: string | null;
  cmei_id: string;
  cmei_nome: string;
  turma_id: string;
  turma_nome: string;
  responsavel: string | null;
  telefone: string | null;
  fonte: "principal";
};

function normalizeAluno(data: Partial<AlunoFicha> & { id: string; nome: string }): AlunoFicha {
  return {
    id: data.id,
    nome: data.nome,
    data_nascimento: data.data_nascimento ?? null,
    cmei_id: data.cmei_id || "",
    cmei_nome: data.cmei_nome || "",
    turma_id: data.turma_id || "",
    turma_nome: data.turma_nome || "",
    responsavel: data.responsavel ?? null,
    telefone: data.telefone ?? null,
    fonte: "principal",
  };
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

function ensurePdfSpace(doc: jsPDF, config: ReportHeaderFooter, y: number, needed: number) {
  const limit = doc.internal.pageSize.height - 18;
  if (y + needed <= limit) return y;
  doc.addPage();
  return addPdfHeaderFooter(doc, config);
}

function getLastAutoTableFinalY(doc: jsPDF): number | null {
  const last = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return typeof last?.finalY === "number" ? last.finalY : null;
}

type RespostaSondagemNivelJoin = {
  niveis_aprendizagem: { codigo: string | null; tipo: string | null; ordem: number | string | null } | null;
};

function extractNivel(
  respostas: RespostaSondagemNivelJoin[] | null | undefined,
  tipo: string
): { ordem: number | null; codigo: string | null } {
  let best: { ordem: number; codigo: string } | null = null;
  for (const r of respostas || []) {
    const n = r.niveis_aprendizagem;
    if (!n || n.tipo !== tipo) continue;
    const ordem = typeof n.ordem === "number" ? n.ordem : Number(n.ordem);
    if (!Number.isFinite(ordem)) continue;
    if (!best || ordem > best.ordem) best = { ordem, codigo: String(n.codigo || "") };
  }
  return best ? { ordem: best.ordem, codigo: best.codigo } : { ordem: null, codigo: null };
}

function nearestCodigoByOrdem(ordem: number | null, niveis: Array<{ ordem: number; codigo: string }>) {
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
  niveis: Array<{ ordem: number; codigo: string }>;
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

export default function FichaAluno() {
  const { id: criancaId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useAuth();
  const [novaAnotacao, setNovaAnotacao] = useState("");
  const alunoFromState = (location.state as { aluno?: Partial<AlunoFicha> } | null)?.aluno;

  const canAnnotate = role === "admin" || role === "equipe_pedagogica";

  // Fetch student data
  const { data: aluno, isLoading: loadingAluno } = useQuery({
    queryKey: ["ficha-aluno", criancaId],
    queryFn: async () => {
      const [principalAluno, localAlunoResult] = await Promise.all([
        fetchPrincipalCriancas({ ids: [criancaId!] }),
        supabase
          .from("local_criancas")
          .select("id, nome, data_nascimento, cmei_id, cmei_nome, turma_id, turma_nome, responsavel, telefone")
          .eq("id", criancaId!)
          .maybeSingle(),
      ]);

      if (principalAluno[0]) {
        return principalAluno[0];
      }

      if (alunoFromState?.id === criancaId && alunoFromState.nome) {
        return normalizeAluno({
          id: alunoFromState.id,
          nome: alunoFromState.nome,
          data_nascimento: alunoFromState.data_nascimento ?? null,
          cmei_id: alunoFromState.cmei_id || "",
          cmei_nome: alunoFromState.cmei_nome || "",
          turma_id: alunoFromState.turma_id || "",
          turma_nome: alunoFromState.turma_nome || "",
          responsavel: alunoFromState.responsavel ?? null,
          telefone: alunoFromState.telefone ?? null,
        });
      }

      if (localAlunoResult.error) {
        throw localAlunoResult.error;
      }

      if (!localAlunoResult.data) {
        return null;
      }

      if (localAlunoResult.data) {
        return normalizeAluno({
          id: localAlunoResult.data.id,
          nome: localAlunoResult.data.nome,
          data_nascimento: localAlunoResult.data.data_nascimento ?? null,
          cmei_id: localAlunoResult.data.cmei_id || "",
          cmei_nome: localAlunoResult.data.cmei_nome || "",
          turma_id: localAlunoResult.data.turma_id || "",
          turma_nome: localAlunoResult.data.turma_nome || "",
          responsavel: localAlunoResult.data.responsavel ?? null,
          telefone: localAlunoResult.data.telefone ?? null,
        });
      }

      const visiblePrincipalAlunos = await fetchPrincipalCriancas();
      const fallbackAluno = visiblePrincipalAlunos.find((item) => item.id === criancaId);
      return fallbackAluno || null;
    },
    enabled: !!criancaId,
  });

  const { data: niveis = [] } = useNiveis();
  const { data: historico = [], isLoading: loadingHistorico } = useHistoricoSondagens(criancaId || "");
  const { data: anotacoes = [], isLoading: loadingAnotacoes } = useAnotacoesAluno(criancaId || "");
  const createAnotacao = useCreateAnotacao();
  const deleteAnotacao = useDeleteAnotacao();

  // Fetch profile name for current user
  const { data: profileData } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("nome").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const niveisEscrita = useMemo(() => niveis.filter(n => n.tipo === "escrita").sort((a, b) => a.ordem - b.ordem), [niveis]);
  const niveisProducao = useMemo(() => niveis.filter(n => n.tipo === "producao_texto").sort((a, b) => a.ordem - b.ordem), [niveis]);

  // Build evolution chart data
  const escritaChartData = useMemo(() => {
    return historico.map(s => {
      const escrita = s.respostas.find(r => r.tipo === "escrita");
      return {
        periodo: s.periodo,
        data: s.created_at ? new Date(s.created_at).toLocaleDateString("pt-BR") : s.periodo,
        nivel: escrita?.ordem ?? 0,
        codigo: escrita?.codigo ?? "-",
        descricao: escrita?.descricao ?? "-",
      };
    });
  }, [historico]);

  const producaoChartData = useMemo(() => {
    return historico.map(s => {
      const prod = s.respostas.find(r => r.tipo === "producao_texto");
      return {
        periodo: s.periodo,
        data: s.created_at ? new Date(s.created_at).toLocaleDateString("pt-BR") : s.periodo,
        nivel: prod?.ordem ?? 0,
        codigo: prod?.codigo ?? "-",
        descricao: prod?.descricao ?? "-",
      };
    });
  }, [historico]);

  const escritaChartConfig: ChartConfig = {
    nivel: { label: "Nível Escrita", color: "hsl(215, 80%, 55%)" },
  };
  const producaoChartConfig: ChartConfig = {
    nivel: { label: "Nível Produção", color: "hsl(142, 71%, 40%)" },
  };

  const handleAddAnotacao = async () => {
    if (!novaAnotacao.trim() || !criancaId) return;
    try {
      await createAnotacao.mutateAsync({
        criancaId,
        texto: novaAnotacao.trim(),
        userNome: profileData?.nome || user?.email || "Desconhecido",
      });
      setNovaAnotacao("");
      toast.success("Anotação salva!");
    } catch {
      toast.error("Erro ao salvar anotação.");
    }
  };

  const handleDeleteAnotacao = async (id: string) => {
    if (!criancaId) return;
    try {
      await deleteAnotacao.mutateAsync({ id, criancaId });
      toast.success("Anotação removida.");
    } catch {
      toast.error("Erro ao remover anotação.");
    }
  };

  const exportFichaPDF = async () => {
    if (!aluno) return;
    const config = await getPrincipalReportConfig();
    const doc = new jsPDF();
    let y = addPdfHeaderFooter(doc, config);

    doc.setFontSize(14); doc.setTextColor(41, 98, 166);
    doc.text("Ficha Individual do Aluno", 14, y); y += 8;

    doc.setFontSize(10); doc.setTextColor(60);
    doc.text(`Nome: ${aluno.nome}`, 14, y); y += 5;
    doc.text(`Instituição: ${aluno.cmei_nome || "-"}`, 14, y); y += 5;
    doc.text(`Turma: ${aluno.turma_nome || "-"}`, 14, y); y += 5;
    doc.text(`Data de Nascimento: ${aluno.data_nascimento || "-"}`, 14, y); y += 8;

    if (historico.length > 0) {
      const ultimo = historico[historico.length - 1];
      const escritaAtual = ultimo.respostas.find(r => r.tipo === "escrita");
      const prodAtual = ultimo.respostas.find(r => r.tipo === "producao_texto");

      y = ensurePdfSpace(doc, config, y, 30);
      doc.setFontSize(11); doc.setTextColor(41, 98, 166);
      doc.text("Evolução (Resumo)", 14, y); y += 4;

      doc.setFontSize(9); doc.setTextColor(60);
      doc.text(`Último Período: ${ultimo.periodo}${ultimo.created_at ? ` (${new Date(ultimo.created_at).toLocaleDateString("pt-BR")})` : ""}`, 14, y); y += 4;
      doc.text(`Escrita Atual: ${escritaAtual ? `${escritaAtual.codigo} - ${escritaAtual.descricao}` : "-"}`, 14, y); y += 4;
      doc.text(`Produção de Texto Atual: ${prodAtual ? `${prodAtual.codigo} - ${prodAtual.descricao}` : "-"}`, 14, y); y += 6;

      if (historico.length >= 2) {
        autoTable(doc, {
          startY: y,
          head: [["Período", "Data", "Escrita (código)", "Produção (código)"]],
          body: historico.map(s => {
            const escrita = s.respostas.find(r => r.tipo === "escrita");
            const prod = s.respostas.find(r => r.tipo === "producao_texto");
            return [
              s.periodo,
              s.created_at ? new Date(s.created_at).toLocaleDateString("pt-BR") : "-",
              escrita?.codigo || "-",
              prod?.codigo || "-",
            ];
          }),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [41, 98, 166] },
        });
        {
          const finalY = getLastAutoTableFinalY(doc);
          y = finalY !== null ? finalY + 10 : y + 20;
        }
      }
    }

    // Historico table
    doc.setFontSize(11); doc.setTextColor(41, 98, 166);
    doc.text("Histórico de Sondagens", 14, y); y += 4;

    if (historico.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Período", "Data", "Escrita", "Produção de Texto", "Observações"]],
        body: historico.map(s => {
          const escrita = s.respostas.find(r => r.tipo === "escrita");
          const prod = s.respostas.find(r => r.tipo === "producao_texto");
          return [
            s.periodo,
            s.created_at ? new Date(s.created_at).toLocaleDateString("pt-BR") : "-",
            escrita ? `${escrita.codigo} - ${escrita.descricao}` : "-",
            prod ? `${prod.codigo} - ${prod.descricao}` : "-",
            s.observacoes || "-",
          ];
        }),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 98, 166] },
      });
      {
        const finalY = getLastAutoTableFinalY(doc);
        y = finalY !== null ? finalY + 10 : y + 20;
      }
    } else {
      doc.setFontSize(9); doc.setTextColor(100);
      doc.text("Nenhuma sondagem registrada.", 14, y + 4); y += 12;
    }

    // Anotações
    if (anotacoes.length > 0) {
      doc.setFontSize(11); doc.setTextColor(41, 98, 166);
      doc.text("Anotações", 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Data", "Autor", "Anotação"]],
        body: anotacoes.map(a => [
          a.created_at ? new Date(a.created_at).toLocaleDateString("pt-BR") : "-",
          a.user_nome || "-",
          a.texto,
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [100, 100, 100] },
      });
      {
        const finalY = getLastAutoTableFinalY(doc);
        y = finalY !== null ? finalY + 10 : y + 20;
      }
    }

    try {
      const turmaAlunos = aluno.turma_id ? await fetchPrincipalCriancas({ turmaId: aluno.turma_id }) : [];
      const turmaAlunosIds = turmaAlunos.map((a) => a.id).filter(Boolean);
      const ids = turmaAlunosIds.length ? turmaAlunosIds : [aluno.id];
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

      type HistoricoTurmaRow = {
        crianca_id: string | null;
        periodo: string | null;
        created_at: string | null;
        respostas_sondagem: RespostaSondagemNivelJoin[] | null;
      };

      const latestByPeriodoCrianca = new Map<
        string,
        {
          periodo: string;
          criancaId: string;
          escrita: { ordem: number | null; codigo: string | null };
          producao: { ordem: number | null; codigo: string | null };
        }
      >();
      const histRows: HistoricoTurmaRow[] = Array.isArray(hist) ? (hist as HistoricoTurmaRow[]) : [];
      histRows.forEach((s) => {
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
        if (entry.criancaId === aluno.id) {
          st.alunoEscrita = entry.escrita;
          st.alunoProducao = entry.producao;
        }
        byPeriodo.set(entry.periodo, st);
      });

      const periodosOrdenados = Array.from(byPeriodo.keys()).sort((a, b) => a.localeCompare(b));
      if (periodosOrdenados.length && niveisEscrita.length && niveisProducao.length) {
        y = ensurePdfSpace(doc, config, y, 160);
        doc.setFontSize(11);
        doc.setTextColor(41, 98, 166);
        doc.text("Evolução (Aluno vs Média da Turma)", 14, y);
        y += 6;

        const pageW = doc.internal.pageSize.width;
        const chartW = pageW - 28;

        const alunoEscritaSeries = periodosOrdenados.map((p) => byPeriodo.get(p)?.alunoEscrita || { ordem: null, codigo: null });
        const mediaEscritaSeries = periodosOrdenados.map((p) => {
          const st = byPeriodo.get(p);
          if (!st || st.countEscrita === 0) return null;
          return st.sumEscrita / st.countEscrita;
        });
        drawEvolutionChart({
          doc,
          x: 14,
          y,
          width: chartW,
          height: 70,
          title: "Escrita",
          labels: periodosOrdenados,
          aluno: alunoEscritaSeries,
          media: mediaEscritaSeries,
          niveis: niveisEscrita,
        });
        y += 76;

        y = ensurePdfSpace(doc, config, y, 90);
        const alunoProducaoSeries = periodosOrdenados.map((p) => byPeriodo.get(p)?.alunoProducao || { ordem: null, codigo: null });
        const mediaProducaoSeries = periodosOrdenados.map((p) => {
          const st = byPeriodo.get(p);
          if (!st || st.countProducao === 0) return null;
          return st.sumProducao / st.countProducao;
        });
        drawEvolutionChart({
          doc,
          x: 14,
          y,
          width: chartW,
          height: 70,
          title: "Produção de Texto",
          labels: periodosOrdenados,
          aluno: alunoProducaoSeries,
          media: mediaProducaoSeries,
          niveis: niveisProducao,
        });
        y += 82;

        const siglasEscrita = Array.from(
          new Set(alunoEscritaSeries.map((p) => p.codigo).filter((c): c is string => !!c)),
        );
        const siglasProducao = Array.from(
          new Set(alunoProducaoSeries.map((p) => p.codigo).filter((c): c is string => !!c)),
        );
        const itensEscrita = siglasEscrita
          .map((c) => niveisEscrita.find((n) => n.codigo === c))
          .filter(Boolean)
          .map((n) => `${n!.codigo} = ${n!.descricao}`);
        const itensProducao = siglasProducao
          .map((c) => niveisProducao.find((n) => n.codigo === c))
          .filter(Boolean)
          .map((n) => `${n!.codigo} = ${n!.descricao}`);
        const maxWidth = doc.internal.pageSize.width - 28;
        const linhas = [
          itensEscrita.length ? `Siglas (Escrita): ${itensEscrita.join("; ")}` : "",
          itensProducao.length ? `Siglas (Produção de Texto): ${itensProducao.join("; ")}` : "",
        ]
          .filter(Boolean)
          .flatMap((t) => doc.splitTextToSize(t, maxWidth) as string[]);
        if (linhas.length) {
          y = ensurePdfSpace(doc, config, y, 4 * linhas.length + 8);
          doc.setFontSize(8);
          doc.setTextColor(90);
          doc.text(linhas, 14, y);
          y += 4 * linhas.length + 6;
        }
      }
    } catch {
      y = ensurePdfSpace(doc, config, y, 12);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text("Não foi possível gerar a evolução (histórico/média da turma).", 14, y);
      y += 10;
    }

    addFooterToAllPages(doc, config);
    doc.save(`ficha-${aluno.nome.replace(/\s+/g, "-").toLowerCase()}.pdf`);
    toast.success("PDF exportado!");
  };

  if (!criancaId) return <p className="text-muted-foreground p-6">ID do aluno não informado.</p>;

  if (loadingAluno) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <p className="text-muted-foreground">Aluno não encontrado.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              {aluno.nome}
            </h1>
            <p className="text-sm text-muted-foreground">
              {aluno.cmei_nome} • {aluno.turma_nome} • Nasc: {aluno.data_nascimento || "-"}
            </p>
          </div>
        </div>
        <Button onClick={exportFichaPDF} className="gap-2">
          <FileText className="h-4 w-4" /> Exportar PDF
        </Button>
      </div>

      {/* Current levels */}
      {historico.length > 0 && (() => {
        const ultimo = historico[historico.length - 1];
        const escrita = ultimo.respostas.find(r => r.tipo === "escrita");
        const prod = ultimo.respostas.find(r => r.tipo === "producao_texto");
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-xs font-medium text-muted-foreground mb-1">Último Período</p>
                <p className="text-lg font-bold text-foreground">{ultimo.periodo}</p>
                <p className="text-xs text-muted-foreground">
                  {ultimo.created_at ? new Date(ultimo.created_at).toLocaleDateString("pt-BR") : ""}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4" style={{ borderLeftColor: escrita ? getEscritaColor(escrita.codigo) : undefined }}>
              <CardContent className="pt-6 text-center">
                <p className="text-xs font-medium text-muted-foreground mb-1">Escrita Atual</p>
                <p className="text-lg font-bold" style={{ color: escrita ? getEscritaColor(escrita.codigo) : undefined }}>
                  {escrita ? `${escrita.codigo} – ${escrita.descricao}` : "–"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4" style={{ borderLeftColor: prod ? getProducaoColor(prod.codigo) : undefined }}>
              <CardContent className="pt-6 text-center">
                <p className="text-xs font-medium text-muted-foreground mb-1">Produção Atual</p>
                <p className="text-lg font-bold" style={{ color: prod ? getProducaoColor(prod.codigo) : undefined }}>
                  {prod ? `${prod.codigo} – ${prod.descricao}` : "–"}
                </p>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Evolution Charts */}
      {historico.length >= 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Evolução – Escrita
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={escritaChartConfig} className="h-[250px] w-full">
                <LineChart data={escritaChartData} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="periodo" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, Math.max(...niveisEscrita.map(n => n.ordem), 1)]}
                    tickFormatter={(v) => {
                      const n = niveisEscrita.find(n => n.ordem === v);
                      return n?.codigo || String(v);
                    }}
                    fontSize={10}
                  />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => {
                    const item = p?.[0]?.payload;
                    return item ? `${item.periodo} (${item.data}) – ${item.codigo}: ${item.descricao}` : "";
                  }} />} />
                  <Line type="monotone" dataKey="nivel" stroke="hsl(215, 80%, 55%)" strokeWidth={3} dot={{ r: 5, fill: "hsl(215, 80%, 55%)" }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" style={{ color: "hsl(142, 71%, 40%)" }} /> Evolução – Produção de Texto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={producaoChartConfig} className="h-[250px] w-full">
                <LineChart data={producaoChartData} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="periodo" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, Math.max(...niveisProducao.map(n => n.ordem), 1)]}
                    tickFormatter={(v) => {
                      const n = niveisProducao.find(n => n.ordem === v);
                      return n?.codigo || String(v);
                    }}
                    fontSize={10}
                  />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => {
                    const item = p?.[0]?.payload;
                    return item ? `${item.periodo} (${item.data}) – ${item.codigo}: ${item.descricao}` : "";
                  }} />} />
                  <Line type="monotone" dataKey="nivel" stroke="hsl(142, 71%, 40%)" strokeWidth={3} dot={{ r: 5, fill: "hsl(142, 71%, 40%)" }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Histórico de Sondagens
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistorico ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : historico.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma sondagem registrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Escrita</TableHead>
                  <TableHead>Produção</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.map(s => {
                  const escrita = s.respostas.find(r => r.tipo === "escrita");
                  const prod = s.respostas.find(r => r.tipo === "producao_texto");
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.periodo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.created_at ? new Date(s.created_at).toLocaleDateString("pt-BR") : "-"}
                      </TableCell>
                      <TableCell>
                        {escrita ? (
                          <Badge variant="outline" style={{ borderColor: getEscritaColor(escrita.codigo), color: getEscritaColor(escrita.codigo) }}>
                            {escrita.codigo} – {escrita.descricao}
                          </Badge>
                        ) : "–"}
                      </TableCell>
                      <TableCell>
                        {prod ? (
                          <Badge variant="outline" style={{ borderColor: getProducaoColor(prod.codigo), color: getProducaoColor(prod.codigo) }}>
                            {prod.codigo} – {prod.descricao}
                          </Badge>
                        ) : "–"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {s.observacoes || "–"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Anotações */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-primary" /> Anotações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canAnnotate && (
            <div className="flex gap-2">
              <Textarea
                value={novaAnotacao}
                onChange={(e) => setNovaAnotacao(e.target.value)}
                placeholder="Adicionar anotação..."
                className="min-h-[60px]"
              />
              <Button
                onClick={handleAddAnotacao}
                disabled={!novaAnotacao.trim() || createAnotacao.isPending}
                size="sm"
                className="gap-1 self-end"
              >
                <Plus className="h-4 w-4" /> Salvar
              </Button>
            </div>
          )}
          {loadingAnotacoes ? (
            <div className="flex items-center justify-center py-6">
              <Spinner className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : anotacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma anotação.</p>
          ) : (
            <div className="space-y-3">
              {anotacoes.map(a => (
                <div key={a.id} className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{a.user_nome || "Desconhecido"}</span>
                      <span className="text-xs text-muted-foreground">
                        {a.created_at ? new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                    {canAnnotate && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteAnotacao(a.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-foreground">{a.texto}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}
