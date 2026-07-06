import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserCheck, UserX, FileText, Eye, Upload, Building2, ArrowRight, Info } from "lucide-react";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";
interface InscricaoChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export const InscricaoChoiceDialog = ({
  open,
  onOpenChange
}: InscricaoChoiceDialogProps) => {
  const navigate = useNavigate();
  const [hoveredOption, setHoveredOption] = useState<"login" | "sem-login" | null>(null);
  const { data: config } = useConfiguracoesPublicas();
  const { singular } = getUnidadeLabels(config as any);
  const handleSemLogin = () => {
    onOpenChange(false);
    navigate("/modulo/vagou/publico/inscricao");
  };
  const handleComLogin = () => {
    onOpenChange(false);
    navigate("/auth/login", {
      state: {
        redirectTo: "/modulo/vagou/responsavel/inscricao"
      }
    });
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Como deseja fazer a inscrição?
          </DialogTitle>
          <DialogDescription>
            Escolha a melhor opção para você
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {/* Opção SEM login */}
          <button onClick={handleSemLogin} onMouseEnter={() => setHoveredOption("sem-login")} onMouseLeave={() => setHoveredOption(null)} className={`relative flex flex-col p-5 rounded-xl border-2 text-left transition-all duration-200 ${hoveredOption === "sem-login" ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : "border-border hover:border-amber-300 bg-card"}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hoveredOption === "sem-login" ? "bg-amber-500 text-white" : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"}`}>
                <UserX className="h-5 w-5" />
              </div>
              <span className="font-semibold text-foreground">Sem criar conta</span>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Inscrição rápida, sem necessidade de login
            </p>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                <span>Documentos entregues <strong className="text-foreground">presencialmente</strong></span>
              </div>
              <div className="flex items-start gap-2 text-muted-foreground">
                <Eye className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                <span>Acompanhe por CPF na consulta pública</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Mais rápido</span>
              <ArrowRight className={`h-4 w-4 transition-transform ${hoveredOption === "sem-login" ? "translate-x-1 text-amber-500" : "text-muted-foreground"}`} />
            </div>
          </button>

          {/* Opção COM login */}
          <button onClick={handleComLogin} onMouseEnter={() => setHoveredOption("login")} onMouseLeave={() => setHoveredOption(null)} className={`relative flex flex-col p-5 rounded-xl border-2 text-left transition-all duration-200 ${hoveredOption === "login" ? "border-primary bg-primary/5 dark:bg-primary/10" : "border-border hover:border-primary/50 bg-card"}`}>
            {/* Badge recomendado */}
            <div className="absolute -top-2 right-3 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
              Recomendado
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hoveredOption === "login" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                <UserCheck className="h-5 w-5" />
              </div>
              <span className="font-semibold text-foreground">Criar conta / Login</span>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Acesse todas as funcionalidades do sistema
            </p>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 text-muted-foreground">
                <Upload className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Envie documentos <strong className="text-foreground">online</strong></span>
              </div>
              <div className="flex items-start gap-2 text-muted-foreground">
                <Eye className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Acompanhe em tempo real no painel</span>
              </div>
              <div className="flex items-start gap-2 text-muted-foreground">
                <FileText className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Receba notificações do sistema </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Mais recursos</span>
              <ArrowRight className={`h-4 w-4 transition-transform ${hoveredOption === "login" ? "translate-x-1 text-primary" : "text-muted-foreground"}`} />
            </div>
          </button>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-start gap-2 text-sm">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">Em ambos os casos, a confirmação da matrícula deve ser feita presencialmente quando você for convocado, em {singular}.
          </p>
        </div>
      </DialogContent>
    </Dialog>;
};
