import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export type ExportSection = {
  id: string;
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
};

export type ExportFormat = "pdf" | "xlsx" | "csv";

const sanitize = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 28) || "secao";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportBIToPdfWithTitles(
  sections: ExportSection[],
  meta: { title: string; subtitle?: string; filters?: string[] },
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39);
  doc.text(meta.title, marginX, 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  let y = 66;
  if (meta.subtitle) {
    doc.text(meta.subtitle, marginX, y);
    y += 14;
  }
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, marginX, y);
  y += 14;
  if (meta.filters?.length) {
    const filtersText = `Filtros: ${meta.filters.join("  •  ")}`;
    const lines = doc.splitTextToSize(filtersText, pageWidth - marginX * 2);
    doc.setTextColor(80);
    doc.text(lines, marginX, y);
    y += lines.length * 12 + 6;
  }

  let cursorY = y + 10;

  sections.forEach((section) => {
    if (cursorY > pageHeight - 90) {
      doc.addPage();
      cursorY = 56;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(section.title, marginX, cursorY);
    cursorY += 8;

    autoTable(doc, {
      startY: cursorY + 4,
      head: [section.columns],
      body: section.rows.length
        ? section.rows.map((r) => r.map((c) => String(c)))
        : [["Sem dados no período", ...section.columns.slice(1).map(() => "")]],
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 9, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 26;
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - marginX, pageHeight - 20, { align: "right" });
  }

  doc.save(`${sanitize(meta.title)}.pdf`);
}

export function exportBIToXlsx(sections: ExportSection[], meta: { title: string }) {
  const wb = XLSX.utils.book_new();
  const usedNames = new Set<string>();
  sections.forEach((section) => {
    const aoa = [section.columns, ...section.rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    let name = sanitize(section.title).slice(0, 28) || "Secao";
    let suffix = 1;
    while (usedNames.has(name)) {
      name = `${name.slice(0, 26)}_${suffix++}`;
    }
    usedNames.add(name);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, `${sanitize(meta.title)}.xlsx`);
}

export function exportBIToCsv(sections: ExportSection[], meta: { title: string }) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blocks = sections.map((section) => {
    const header = section.columns.map(escape).join(";");
    const rows = section.rows.map((r) => r.map(escape).join(";"));
    return [`# ${section.title}`, header, ...rows].join("\n");
  });
  const csv = "\uFEFF" + blocks.join("\n\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${sanitize(meta.title)}.csv`);
}

export function runBIExport(
  format: ExportFormat,
  sections: ExportSection[],
  meta: { title: string; subtitle?: string; filters?: string[] },
) {
  if (format === "pdf") return exportBIToPdfWithTitles(sections, meta);
  if (format === "xlsx") return exportBIToXlsx(sections, meta);
  return exportBIToCsv(sections, meta);
}
