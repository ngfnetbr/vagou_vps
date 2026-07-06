import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Shield, Users } from "lucide-react";

interface RoleSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoleSelectionDialog({ open, onOpenChange }: RoleSelectionDialogProps) {
  const navigate = useNavigate();
  const [rememberChoice, setRememberChoice] = useState(false);

  const handleSelect = (area: "admin" | "responsavel") => {
    if (rememberChoice) {
      localStorage.setItem("vagou_preferred_area", area);
    }
    onOpenChange(false);
    navigate(area === "admin" ? "/modulo/vagou/admin" : "/modulo/vagou/responsavel");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-xl md:max-w-2xl p-4 sm:p-6 overflow-visible">
        <DialogHeader className="space-y-2 sm:space-y-3">
          <DialogTitle className="text-center text-lg sm:text-xl font-semibold text-foreground">
            Escolha a área de acesso
          </DialogTitle>
          <DialogDescription className="text-center text-sm sm:text-base text-muted-foreground">
            Você possui acesso a múltiplas áreas. Selecione onde deseja entrar:
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:gap-4 py-4 sm:py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Área Administrativa */}
            <Button
              variant="outline"
              className="h-auto min-h-[160px] flex-col items-center justify-center gap-3 p-5 hover:bg-primary/10 hover:border-primary border-2 transition-all group overflow-hidden"
              onClick={() => handleSelect("admin")}
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <div className="text-center w-full overflow-hidden">
                <h3 className="font-semibold text-base text-foreground truncate">Área Administrativa</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  Gestão de CMEIs, turmas e matrículas
                </p>
              </div>
            </Button>

            {/* Área do Responsável */}
            <Button
              variant="outline"
              className="h-auto min-h-[160px] flex-col items-center justify-center gap-3 p-5 hover:bg-primary/10 hover:border-primary border-2 transition-all group overflow-hidden"
              onClick={() => handleSelect("responsavel")}
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <div className="text-center w-full overflow-hidden">
                <h3 className="font-semibold text-base text-foreground truncate">Área do Responsável</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  Acompanhe inscrições e documentos
                </p>
              </div>
            </Button>
          </div>

          {/* Lembrar escolha */}
          <div className="flex items-center justify-center gap-2 pt-2 sm:pt-3">
            <Checkbox
              id="remember"
              checked={rememberChoice}
              onCheckedChange={(checked) => setRememberChoice(checked === true)}
              className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <Label htmlFor="remember" className="text-xs sm:text-sm text-muted-foreground cursor-pointer">
              Lembrar minha escolha
            </Label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
