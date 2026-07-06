import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Detect standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // Show banner for iOS after delay
    if (iOS) {
      setTimeout(() => setIsVisible(true), 3000);
      return;
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setIsVisible(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  if (!isVisible || isStandalone) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 bg-primary text-primary-foreground shadow-lg border-t border-primary-foreground/20 animate-in slide-in-from-bottom duration-300">
      <div className="container mx-auto flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center flex-shrink-0">
            <Smartphone className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-xs sm:text-sm truncate">Instale o VAGOU</p>
            <p className="text-[10px] sm:text-xs opacity-80 truncate hidden xs:block">
              {isIOS 
                ? "Acesse da tela inicial" 
                : "Acesso rápido e notificações"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {isIOS ? (
            <Button 
              size="sm" 
              variant="secondary"
              className="text-xs px-2 sm:px-3 h-8"
              asChild
            >
              <Link to="/modulo/vagou/publico/download">
                <span className="hidden sm:inline">Ver instruções</span>
                <span className="sm:hidden">Instalar</span>
              </Link>
            </Button>
          ) : deferredPrompt ? (
            <Button 
              size="sm" 
              variant="secondary"
              className="text-xs px-2 sm:px-3 h-8"
              onClick={handleInstall}
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">Instalar</span>
            </Button>
          ) : (
            <Button 
              size="sm" 
              variant="secondary"
              className="text-xs px-2 sm:px-3 h-8"
              asChild
            >
              <Link to="/modulo/vagou/publico/download">
                <span className="hidden sm:inline">Saiba mais</span>
                <span className="sm:hidden">Ver</span>
              </Link>
            </Button>
          )}
          
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 sm:h-8 sm:w-8 text-primary-foreground hover:bg-primary-foreground/10"
            onClick={handleDismiss}
            aria-label="Fechar banner"
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
