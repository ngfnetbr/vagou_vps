import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import DOMPurify from "dompurify";

interface RelatorioPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  htmlContent: string | null;
  loading: boolean;
  onExportPDF: () => void;
  onExportExcel: () => void;
  exporting: boolean;
}

export function RelatorioPreviewDialog({
  open,
  onOpenChange,
  titulo,
  htmlContent,
  loading,
  onExportPDF,
  onExportExcel,
  exporting,
}: RelatorioPreviewDialogProps) {
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow && htmlContent) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${titulo}</title>
          <style>
            @media print {
              body { margin: 0; padding: 15mm; }
              @page { margin: 10mm; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pré-visualização: {titulo}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-[400px] max-h-[60vh] border rounded-md bg-white overflow-y-auto overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Carregando relatório...</span>
            </div>
          ) : htmlContent ? (
            <div 
              className="p-4"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Erro ao carregar o relatório
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={loading || !htmlContent}
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button
            variant="outline"
            onClick={onExportExcel}
            disabled={loading || exporting}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {exporting ? "Exportando..." : "Exportar Excel"}
          </Button>
          <Button
            onClick={onExportPDF}
            disabled={loading || exporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Exportando..." : "Exportar PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
