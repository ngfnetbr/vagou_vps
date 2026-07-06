import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TooltipHelperProps {
  children: React.ReactNode;
  content: string;
  side?: "top" | "bottom" | "left" | "right";
  delayDuration?: number;
}

export function TooltipHelper({
  children,
  content,
  side = "top",
  delayDuration = 300,
}: TooltipHelperProps) {
  const lines = content.split("\n");
  const getGroupBadgeVariant = (line: string) => {
    const normalized = line.trim();
    if (normalized === "Situação Econômica:") return "warning" as const;
    if (normalized === "Situações de Vulnerabilidade:") return "error" as const;
    if (normalized === "Organização Familiar e Territorial:") return "info" as const;
    if (normalized === "Outras:") return "secondary" as const;
    return null;
  };

  // Separa o rótulo de uma pontuação "+N" no fim da linha
  const splitPontos = (line: string): { label: string; pontos: string | null } => {
    const match = line.match(/^(.*?)[:]?\s*(\+\d+)\s*$/);
    if (match) return { label: match[1].replace(/:\s*$/, ""), pontos: match[2] };
    return { label: line, pontos: null };
  };

  // Detecta o cabeçalho "Total: X/100"
  const totalLine = lines[0]?.trim().startsWith("Total:") ? lines[0].trim() : null;
  const totalMatch = totalLine?.match(/Total:\s*(\d+)\s*\/\s*(\d+)/);
  const totalValor = totalMatch ? Number(totalMatch[1]) : null;
  const totalMax = totalMatch ? Number(totalMatch[2]) : 100;

  const corpo = totalLine ? lines.slice(1) : lines;

  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className={cn(totalLine ? "w-72 p-0" : "max-w-xs")}>
        {totalLine ? (
          <div className="overflow-hidden rounded-md">
            {/* Cabeçalho com total e barra de progresso */}
            <div className="border-b bg-gradient-to-br from-primary/15 to-primary/5 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Pontuação total
                </span>
                <span className="font-mono text-base font-bold text-primary">
                  {totalValor}
                  <span className="text-[10px] font-normal text-muted-foreground">/{totalMax}</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all"
                  style={{ width: `${totalMax ? Math.min(100, ((totalValor ?? 0) / totalMax) * 100) : 0}%` }}
                />
              </div>
            </div>
            <div className="space-y-1 px-3 py-2.5">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                Como foi calculado
              </p>
              {(() => {
                const groupAccent: Record<string, string> = {
                  "Situação Econômica": "amber",
                  "Situações de Vulnerabilidade": "red",
                  "Organização Familiar e Territorial": "blue",
                  "Outras": "slate",
                };
                const accentClasses: Record<string, { border: string; dot: string; text: string }> = {
                  amber: { border: "border-amber-400/60", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
                  red: { border: "border-red-400/60", dot: "bg-red-500", text: "text-red-600 dark:text-red-400" },
                  blue: { border: "border-blue-400/60", dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
                  slate: { border: "border-slate-400/60", dot: "bg-slate-500", text: "text-slate-600 dark:text-slate-400" },
                };

                const nodes: React.ReactNode[] = [];
                let i = 0;
                while (i < corpo.length) {
                  const line = corpo[i];
                  const trimmed = line.trim();

                  // Cabeçalho da seção de prioridades
                  if (trimmed === "Prioridades:") {
                    nodes.push(
                      <div key={`pri-${i}`} className="mt-2 mb-0.5 border-t pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Prioridades (Lei Federal)
                      </div>
                    );
                    i++;
                    continue;
                  }

                  const groupTitle = trimmed.replace(/:\s*$/, "");
                  const accentKey = groupAccent[groupTitle];
                  if (accentKey) {
                    const a = accentClasses[accentKey];
                    // Coleta os subitens deste grupo
                    const items: { label: string; pontos: string | null }[] = [];
                    let j = i + 1;
                    while (j < corpo.length && corpo[j].trimStart().startsWith("- ")) {
                      items.push(splitPontos(corpo[j].trimStart().slice(2)));
                      j++;
                    }
                    nodes.push(
                      <div key={`g-${i}`} className={cn("mt-1.5 rounded-md border-l-2 bg-muted/40 py-1 pl-2 pr-1.5", a.border)}>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("h-1.5 w-1.5 rounded-full", a.dot)} />
                          <span className={cn("text-[11px] font-semibold", a.text)}>{groupTitle}</span>
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {items.map((it, k) => (
                            <div key={k} className="flex items-center justify-between gap-3 text-xs">
                              <span className="text-muted-foreground">{it.label}</span>
                              {it.pontos && (
                                <span className="shrink-0 rounded-full bg-green-500/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-green-600 dark:text-green-400">
                                  {it.pontos}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                    i = j;
                    continue;
                  }

                  // Linha simples (ex.: Inscrição na fila, Programas sociais)
                  const { label, pontos } = splitPontos(line);
                  nodes.push(
                    <div key={`r-${i}`} className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-2 py-1 text-xs font-medium">
                      <span>{label}</span>
                      {pontos && (
                        <span className="shrink-0 rounded-full bg-green-500/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-green-600 dark:text-green-400">
                          {pontos}
                        </span>
                      )}
                    </div>
                  );
                  i++;
                }
                return nodes;
              })()}
            </div>
          </div>
        ) : (
          <div className="space-y-0.5">
            {lines.map((line, idx) => {
              const variant = getGroupBadgeVariant(line);
              if (variant) {
                return (
                  <div key={idx} className="pt-1">
                    <Badge variant={variant} className="text-[10px] px-2 py-0.5">
                      {line.replace(/:\s*$/, "")}
                    </Badge>
                  </div>
                );
              }

              return (
                <div key={idx} className={idx === 0 ? "font-semibold" : undefined}>
                  {line}
                </div>
              );
            })}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
