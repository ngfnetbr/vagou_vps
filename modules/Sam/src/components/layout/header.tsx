import { useState } from "react"
import { SidebarTrigger } from "@ui/sidebar"
import { School } from "lucide-react"
import { ModuleSwitcher } from "@root/components/common/ModuleSwitcher"
import { AccessibilityButton } from "@root/components/common/AccessibilityButton"
import { HeaderUserMenu } from "@root/components/common/HeaderUserMenu"
import { useConfiguracoesSistema } from "@root/hooks/api/configuracoes-hooks"

export function Header() {
  const { data: config } = useConfiguracoesSistema()
  const [brasaoError, setBrasaoError] = useState(false)

  return (
    <header className="border-b bg-card sticky top-0 z-30 shadow-sm print:hidden">
      <div className="flex items-center justify-between px-3 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-2 md:gap-4">
          <SidebarTrigger className="-ml-1 md:-ml-2 hidden md:flex" />
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {config?.brasao_url && !brasaoError ? (
              <div className="rounded-lg overflow-hidden bg-card border flex items-center justify-center h-8 w-8 md:h-10 md:w-10 shrink-0">
                <img
                  src={config.brasao_url}
                  alt="Brasão"
                  className="h-full w-full object-contain p-1"
                  onError={() => setBrasaoError(true)}
                />
              </div>
            ) : (
              <div className="rounded-lg bg-secondary flex items-center justify-center h-8 w-8 md:h-10 md:w-10 shrink-0">
                <School className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
            )}
            <div className="min-w-0 hidden sm:block">
              <h1 className="font-semibold text-foreground text-sm md:text-base md:text-lg truncate">
                {config?.nome_secretaria || "Secretaria de Educação"}
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">
                {config?.nome_municipio || "Município"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <ModuleSwitcher />
          <AccessibilityButton />
          <HeaderUserMenu />
        </div>
      </div>
    </header>
  )
}
