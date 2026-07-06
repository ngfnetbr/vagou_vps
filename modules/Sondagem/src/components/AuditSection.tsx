// @ts-nocheck
import { useState, useMemo, useEffect } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Button } from "@ui/button";
import { Input } from "@ui/input";
import { Badge } from "@ui/badge";
import { Shield, Download, FileText, Search, X } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@ui/select";
import {
  Table, TableBody, TableHead, TableHeader, TableRow,
} from "@ui/table";
import { useAuditLogs } from "@sondagem/hooks/useSupabaseData";
import AuditLogRow from "@sondagem/components/AuditLogRow";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ITEMS_PER_PAGE = 20;

function formatDateBR(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AuditSection() {
  const { data: auditLogs = [], isLoading: loadingAudit } = useAuditLogs(500);

  const [filtroAcao, setFiltroAcao] = useState("");
  const [filtroTabela, setFiltroTabela] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [page, setPage] = useState(1);

  // Unique values for dropdown filters
  const acoes = useMemo(() => [...new Set(auditLogs.map(l => l.acao))].sort(), [auditLogs]);
  const tabelas = useMemo(() => [...new Set(auditLogs.map(l => l.tabela))].sort(), [auditLogs]);

  const filtered = useMemo(() => {
    let result = auditLogs;
    if (filtroAcao) result = result.filter(l => l.acao === filtroAcao);
    if (filtroTabela) result = result.filter(l => l.tabela === filtroTabela);
    if (filtroUsuario) {
      const q = filtroUsuario.toLowerCase();
      result = result.filter(l => l.user_email?.toLowerCase().includes(q));
    }
    if (filtroDataInicio) {
      const start = new Date(filtroDataInicio);
      start.setHours(0, 0, 0, 0);
      result = result.filter(l => l.created_at && new Date(l.created_at) >= start);
    }
    if (filtroDataFim) {
      const end = new Date(filtroDataFim);
      end.setHours(23, 59, 59, 999);
      result = result.filter(l => l.created_at && new Date(l.created_at) <= end);
    }
    return result;
  }, [auditLogs, filtroAcao, filtroTabela, filtroUsuario, filtroDataInicio, filtroDataFim]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const hasFilters = filtroAcao || filtroTabela || filtroUsuario || filtroDataInicio || filtroDataFim;

  const clearFilters = () => {
    setFiltroAcao("");
    setFiltroTabela("");
    setFiltroUsuario("");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [filtroAcao, filtroTabela, filtroUsuario, filtroDataInicio, filtroDataFim]);

  const exportCSV = () => {
    const headers = ["Data", "Usuário", "Ação", "Tabela", "Detalhes", "Dados Anteriores", "Dados Posteriores"];
    const rows = filtered.map(l => [
      formatDateBR(l.created_at),
      l.user_email || "",
      l.acao,
      l.tabela,
      l.detalhes || "",
      l.dados_antes ? JSON.stringify(l.dados_antes) : "",
      l.dados_depois ? JSON.stringify(l.dados_depois) : "",
    ]);

    const bom = "\uFEFF";
    const csvContent = bom + [headers.join(";"), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Relatório de Auditoria do Sistema", 14, 15);
    doc.setFontSize(9);
    doc.text(`Gerado em: ${formatDateBR(new Date().toISOString())} — ${filtered.length} registro(s)`, 14, 22);

    const tableData = filtered.map(l => [
      formatDateBR(l.created_at),
      l.user_email || "—",
      l.acao,
      l.tabela,
      (l.detalhes || "—").substring(0, 80),
    ]);

    autoTable(doc, {
      startY: 28,
      head: [["Data", "Usuário", "Ação", "Tabela", "Detalhes"]],
      body: tableData,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [245, 245, 250] },
    });

    doc.save(`auditoria_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="rounded-2xl bg-card p-6 shadow-sm border space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Auditoria do Sistema</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportPDF} disabled={filtered.length === 0}>
            <FileText className="h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Registro de todas as ações realizadas no sistema pelos usuários.
      </p>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Ação</label>
          <Select value={filtroAcao || "__all__"} onValueChange={v => setFiltroAcao(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {acoes.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Tabela</label>
          <Select value={filtroTabela || "__all__"} onValueChange={v => setFiltroTabela(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {tabelas.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Usuário</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              className="h-8 text-xs pl-7"
              placeholder="Buscar e-mail..."
              value={filtroUsuario}
              onChange={e => setFiltroUsuario(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Data início</label>
          <Input
            type="date"
            className="h-8 text-xs"
            value={filtroDataInicio}
            onChange={e => setFiltroDataInicio(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Data fim</label>
          <Input
            type="date"
            className="h-8 text-xs"
            value={filtroDataFim}
            onChange={e => setFiltroDataFim(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground" onClick={clearFilters}>
              <X className="h-3 w-3" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {hasFilters && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} registro(s) encontrado(s)
        </p>
      )}

      {loadingAudit ? (
        <div className="flex items-center justify-center py-6">
          <Spinner className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro de auditoria encontrado.</p>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-8"></TableHead>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Usuário</TableHead>
                  <TableHead className="text-xs">Ação</TableHead>
                  <TableHead className="text-xs">Tabela</TableHead>
                  <TableHead className="text-xs">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(log => (
                  <AuditLogRow key={log.id} log={log} formatDate={formatDateBR} />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Mostrando {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} de {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
