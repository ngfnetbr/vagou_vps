import { Settings2, Moon, Type, TableProperties } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useAccessibility } from "@/hooks/use-accessibility";
import { useTableDensity } from "@/hooks/use-table-density";
import { cn } from "@/utils/utils";

interface AccessibilityButtonProps {
  variant?: "default" | "header";
}

export function AccessibilityButton({ variant = "default" }: AccessibilityButtonProps) {
  const { settings, toggleDarkMode, setFontSize } = useAccessibility();
  const { isCompact, toggleDensity } = useTableDensity();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0",
            variant === "header" 
              ? "text-primary-foreground dark:text-foreground hover:bg-white/10" 
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label="Configurações de Visualização"
          data-tour="accessibility"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-card border" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <div>
              <h4 className="font-medium">Preferências</h4>
              <p className="text-xs text-muted-foreground">
                Ajuste a visualização do sistema.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Modo Escuro */}
            <div className="flex items-center justify-between rounded-lg border p-3 bg-background">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Modo Escuro</span>
              </div>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={toggleDarkMode}
              />
            </div>

            {/* Modo Compacto de Tabelas */}
            <div className="flex items-center justify-between rounded-lg border p-3 bg-background">
              <div className="flex items-center gap-2">
                <TableProperties className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm">Tabelas Compactas</span>
                  <p className="text-[10px] text-muted-foreground">Mais dados por página</p>
                </div>
              </div>
              <Switch
                checked={isCompact}
                onCheckedChange={toggleDensity}
              />
            </div>

            {/* Tamanho da Fonte */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Type className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Tamanho da Fonte</span>
              </div>
              <div className="flex gap-1">
                {(["default", "medium", "large"] as const).map((size) => (
                  <Button
                    key={size}
                    variant={settings.fontSize === size ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFontSize(size)}
                    className={cn(
                      "flex-1 text-xs",
                      settings.fontSize === size && "bg-primary text-primary-foreground"
                    )}
                  >
                    {size === "default" ? "Pequeno" : size === "medium" ? "Médio" : "Grande"}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

