import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, FileText, Users, BarChart3, Search, Download, Menu, LogIn, Settings2 } from "lucide-react";
import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { AccessibilityButton } from "@/components/common/AccessibilityButton";
import { PWAInstallBanner } from "@/components/pwa/PWAInstallBanner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { cn } from "@/utils/utils";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { InscricaoChoiceDialog } from "@/components/public/InscricaoChoiceDialog";
import hfLogo from "@/assets/hf-logo.png";

export const PublicHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showChoiceDialog, setShowChoiceDialog] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { data: config } = useConfiguracoesPublicas();
  
  const autenticacaoPublica = config?.autenticacao_publica;
  const logoUrl = config?.logo_empresa_url || hfLogo;
  const logoLink = "https://hfgestaopublica.com.br/";

  const navItems = [
    { to: "/modulo/vagou/publico", icon: Home, label: "Início", exact: true },
    { to: "/modulo/vagou/publico/inscricao", icon: FileText, label: "Inscrição" },
    { to: "/modulo/vagou/publico/fila", icon: Users, label: "Fila" },
    { to: "/modulo/vagou/publico/ocupacao", icon: BarChart3, label: "Ocupação" },
    { to: "/modulo/vagou/publico/consulta", icon: Search, label: "Consulta" },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const handleInscricaoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);

    // Se autenticação é obrigatória, vai direto para login
    if (autenticacaoPublica) {
      navigate("/auth/login", {
        state: {
          redirectTo: "/modulo/vagou/responsavel/inscricao"
        }
      });
    } else {
      // Se não é obrigatória, mostra diálogo de escolha
      setShowChoiceDialog(true);
    }
  };

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-primary via-primary/95 to-primary/90 text-primary-foreground shadow-sm dark:from-[#171717] dark:via-[#171717] dark:to-[#171717] dark:text-foreground dark:border-border"
        role="banner"
      >
        <div className="govbr-container">
          <div className="flex items-center justify-between py-2.5">
            {/* Logo/Home */}
            <Link to="/modulo/vagou/publico" className="flex items-center gap-2 text-primary-foreground dark:text-foreground hover:opacity-90 transition-opacity">
              <Home className="h-6 w-6" />
              <span className="font-semibold hidden sm:inline">Início</span>
            </Link>

            {/* Right side actions */}
            <div className="flex items-center gap-1">
              <AccessibilityButton variant="header" />
              
              {/* Hamburger Menu */}
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-primary-foreground dark:text-foreground hover:bg-white/10 dark:hover:bg-white/10">
                    <Menu className="w-5 h-5" />
                    <span className="sr-only">Abrir menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-72 border-l-0 bg-gradient-to-b from-primary to-primary/90 p-0 text-primary-foreground dark:from-[#171717] dark:to-[#171717] dark:text-foreground dark:border-l dark:border-border [&>button]:top-3 [&>button]:text-primary-foreground dark:[&>button]:text-foreground [&>button]:hover:bg-white/10"
                >
                  <div className="p-4 border-b border-white/10">
                    <span className="font-semibold">Menu</span>
                  </div>
                  <nav className="flex flex-col p-2">
                    {navItems.map((item) => {
                      if (item.label === "Inscrição") {
                        return (
                          <Button
                            key={item.to}
                            variant="ghost"
                            className={cn(
                              "justify-start text-white hover:bg-white/10 hover:text-white",
                              isActive(item.to, item.exact) && "bg-white/15"
                            )}
                            onClick={handleInscricaoClick}
                          >
                            <item.icon className="h-5 w-5 mr-3" />
                            {item.label}
                          </Button>
                        );
                      }
                      
                      return (
                        <Button
                          key={item.to}
                          variant="ghost"
                          asChild
                          className={cn(
                            "justify-start text-white hover:bg-white/10 hover:text-white",
                            isActive(item.to, item.exact) && "bg-white/15"
                          )}
                          onClick={() => setMenuOpen(false)}
                        >
                          <Link to={item.to}>
                            <item.icon className="h-5 w-5 mr-3" />
                            {item.label}
                          </Link>
                        </Button>
                      );
                    })}
                    <div className="border-t border-white/10 mt-2 pt-2">
                      <Button
                        variant="ghost"
                        asChild
                        className="justify-start text-white hover:bg-white/10 hover:text-white w-full"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Link to="/modulo/vagou/publico/contato">
                          <WhatsAppIcon className="h-5 w-5 mr-3 fill-current" />
                          Contato
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        asChild
                        className="justify-start text-white hover:bg-white/10 hover:text-white w-full"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Link to="/modulo/vagou/publico/download">
                          <Download className="h-5 w-5 mr-3" />
                          Baixar App
                        </Link>
                      </Button>

                      {/* Logo HF no Menu Mobile */}
                      <div className="mt-8 flex justify-start pb-4 pl-4 md:hidden">
                        <a 
                          href={logoLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:opacity-80 transition-opacity flex justify-start"
                        >
                          <img 
                            src={logoUrl} 
                            alt="Logo" 
                            className={cn(
                              "h-12 w-auto object-contain",
                              !config?.logo_empresa_url && "brightness-0 invert"
                            )}
                          />
                        </a>
                      </div>
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
      <PWAInstallBanner />
      <InscricaoChoiceDialog open={showChoiceDialog} onOpenChange={setShowChoiceDialog} />
    </>
  );
};
