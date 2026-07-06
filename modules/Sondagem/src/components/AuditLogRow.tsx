import { useState } from "react";
import { TableRow, TableCell } from "@ui/table";
import { Badge } from "@ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";

interface AuditLog {
  id: string;
  created_at: string | null;
  user_email: string | null;
  acao: string;
  tabela: string;
  detalhes: string | null;
  dados_antes: unknown;
  dados_depois: unknown;
}

function renderJsonData(label: string, data: unknown) {
  if (!data) return null;
  return (
    <div className="space-y-1">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <pre className="text-[11px] bg-muted/50 rounded-md p-2 overflow-x-auto whitespace-pre-wrap break-words max-h-60 overflow-y-auto font-mono text-foreground">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function AuditLogRow({ log, formatDate }: { log: AuditLog; formatDate: (d: string | null) => string }) {
  const [expanded, setExpanded] = useState(false);
  const hasData = log.dados_antes || log.dados_depois;

  return (
    <>
      <TableRow
        className={hasData ? "cursor-pointer hover:bg-muted/50" : ""}
        onClick={() => hasData && setExpanded(!expanded)}
      >
        <TableCell className="text-xs w-8 px-2">
          {hasData && (
            expanded
              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="text-xs whitespace-nowrap">{formatDate(log.created_at)}</TableCell>
        <TableCell className="text-xs">{log.user_email || "—"}</TableCell>
        <TableCell>
          <Badge
            variant={log.acao === "excluir" ? "destructive" : log.acao === "criar" ? "default" : "secondary"}
            className="text-xs"
          >
            {log.acao}
          </Badge>
        </TableCell>
        <TableCell className="text-xs">{log.tabela}</TableCell>
        <TableCell className="text-xs max-w-[250px]">
          <span className="line-clamp-2">{log.detalhes || "—"}</span>
        </TableCell>
      </TableRow>
      {expanded && hasData && (
        <TableRow>
          <TableCell colSpan={6} className="p-0">
            <div className="bg-muted/30 border-t px-4 py-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderJsonData("Dados Anteriores", log.dados_antes)}
                {renderJsonData("Dados Posteriores", log.dados_depois)}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
