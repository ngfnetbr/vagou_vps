import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Baby, Building2, GraduationCap, Info, Calendar } from "lucide-react";
import { useCriancasResponsavel, type Conversa } from "@/hooks/api/chat-hooks";
import { format, differenceInYears, differenceInMonths } from "date-fns";

interface ChatResponsavelDetailsProps {
  conversa: Conversa;
  children?: React.ReactNode;
}

const statusColors: Record<string, string> = {
  "Fila de Espera": "bg-amber-500/10 text-amber-600 border-amber-500/30",
  "Convocado": "bg-blue-500/10 text-blue-600 border-blue-500/30",
  "Matriculado": "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  "Matriculada": "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  "Desistente": "bg-slate-500/10 text-slate-600 border-slate-500/30",
  "Recusada": "bg-red-500/10 text-red-600 border-red-500/30",
  "Remanejamento Solicitado": "bg-purple-500/10 text-purple-600 border-purple-500/30",
  "Aguardando Documentação": "bg-orange-500/10 text-orange-600 border-orange-500/30",
  "Concluinte": "bg-teal-500/10 text-teal-600 border-teal-500/30",
};

function calcularIdade(dataNascimento: string): string {
  const nascimento = new Date(dataNascimento);
  const hoje = new Date();
  const anos = differenceInYears(hoje, nascimento);
  
  if (anos < 1) {
    const meses = differenceInMonths(hoje, nascimento);
    return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  }
  
  return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
}

export function ChatResponsavelDetails({ conversa, children }: ChatResponsavelDetailsProps) {
  const { data: criancas = [], isLoading } = useCriancasResponsavel(conversa.responsavel_id);

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Info className="h-4 w-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-[340px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {conversa.responsavel_nome?.[0]?.toUpperCase() || <User className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="font-semibold">{conversa.responsavel_nome || "Responsável"}</p>
              {conversa.responsavel_email && (
                <p className="text-sm text-muted-foreground font-normal flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {conversa.responsavel_email}
                </p>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        <Separator className="my-4" />

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Baby className="h-4 w-4" />
              Filhos vinculados ({criancas.length})
            </h4>
            
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse bg-muted rounded-lg h-20" />
                ))}
              </div>
            ) : criancas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Baby className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma criança vinculada</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-3 pr-3">
                  {criancas.map((crianca: any) => (
                    <div
                      key={crianca.id}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-medium text-sm">{crianca.nome}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(crianca.data_nascimento), "dd/MM/yyyy")} • {calcularIdade(crianca.data_nascimento)}
                          </p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={statusColors[crianca.status] || ""}
                        >
                          {crianca.status}
                        </Badge>
                      </div>
                      
                      {(crianca.cmeis?.nome || crianca.turmas?.nome) && (
                        <div className="mt-2 pt-2 border-t space-y-1">
                          {crianca.cmeis?.nome && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Building2 className="h-3 w-3" />
                              {crianca.cmeis.nome}
                            </p>
                          )}
                          {crianca.turmas?.nome && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <GraduationCap className="h-3 w-3" />
                              {crianca.turmas.nome}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

