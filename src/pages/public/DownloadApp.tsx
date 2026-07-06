import { useEffect, useState } from "react";
import appStoreBadge from "@/assets/app-store-badge.svg";
import googlePlayBadge from "@/assets/google-play-badge.svg";
import { Spinner } from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { Smartphone, Download, Monitor, CheckCircle2, Globe, Wifi, Bell, Zap, Shield, RefreshCw, HelpCircle } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { BrowserInstructions, detectBrowser, getAllBrowsers, type BrowserType } from "@/components/pwa/BrowserInstructions";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const benefits = [
  { icon: Zap, title: "Acesso Rápido", desc: "Direto da tela inicial, como um app nativo", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
  { icon: Bell, title: "Notificações", desc: "Receba alertas sobre convocações", color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-900/30" },
  { icon: Wifi, title: "Funciona Offline", desc: "Acesse informações mesmo sem internet", color: "text-sky-600", bg: "bg-sky-100 dark:bg-sky-900/30" },
  { icon: RefreshCw, title: "Sempre Atualizado", desc: "Atualizações automáticas sem app store", color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/30" },
  { icon: Shield, title: "Seguro", desc: "Conexão criptografada e dados protegidos", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  { icon: Monitor, title: "Multiplataforma", desc: "Funciona em celular, tablet e computador", color: "text-primary", bg: "bg-primary/10" },
];

const faqs = [
  {
    q: "O que é um PWA?",
    a: (
      <>PWA (Progressive Web App) é um aplicativo web que funciona como um app nativo. Ele pode ser instalado diretamente do navegador, sem precisar de loja de aplicativos, e oferece experiência similar a um app tradicional.</>
    ),
  },
  {
    q: "Preciso baixar da loja de apps?",
    a: (
      <>Não! O PWA é instalado diretamente pelo navegador. Basta seguir as instruções acima para o seu dispositivo. É mais rápido e não ocupa tanto espaço quanto um app tradicional.</>
    ),
  },
  {
    q: "O app ocupa muito espaço?",
    a: (
      <>Não. PWAs são muito leves, geralmente ocupando menos de 5MB. Muito menos que aplicativos tradicionais que podem ter centenas de megabytes.</>
    ),
  },
  {
    q: "Como desinstalar o app?",
    a: (
      <>
        <p className="mb-2">Você pode desinstalar como qualquer outro aplicativo:</p>
        <ul className="list-inside list-disc space-y-1 text-sm">
          <li><strong>Android:</strong> Segure o ícone → "Desinstalar"</li>
          <li><strong>iPhone/iPad:</strong> Segure o ícone → "Remover App"</li>
          <li><strong>Windows/Mac:</strong> Abra o app → Menu → "Desinstalar"</li>
        </ul>
      </>
    ),
  },
  {
    q: "Não aparece a opção de instalar",
    a: (
      <>
        <p className="mb-2">Isso pode acontecer por alguns motivos:</p>
        <ul className="list-inside list-disc space-y-1 text-sm">
          <li>O app já está instalado no dispositivo</li>
          <li>Você está usando um navegador que não suporta PWA</li>
          <li>Está acessando em modo anônimo/privado</li>
          <li>A conexão não é segura (precisa ser HTTPS)</li>
        </ul>
        <p className="mt-2 text-sm">Tente usar Chrome ou Safari para melhor compatibilidade.</p>
      </>
    ),
  },
];

const SectionHeader = ({ icon: Icon, title, align = "left" }: { icon: typeof Globe; title: string; align?: "left" | "center" }) => (
  <div
    className={
      align === "center"
        ? "flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center"
        : "flex items-center gap-3"
    }
  >
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
      <Icon className="h-5 w-5 text-primary" />
    </span>
    <h2 className="text-xl font-bold text-foreground">{title}</h2>
  </div>
);

const DownloadApp = () => {
  const { data: config, isLoading } = useConfiguracoesPublicas();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [currentBrowser, setCurrentBrowser] = useState<BrowserType>('unknown');

  useEffect(() => {
    setCurrentBrowser(detectBrowser());

    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const appName = (config as any)?.app_nome || config?.sistema_nome || "VAGOU";
  const appIconUrl = (config as any)?.app_icone_url || config?.sistema_icone_url;
  const [apkUrl, setApkUrl] = useState<string>("");

  useEffect(() => {
    const serverPath = `${window.location.origin}/vagou.apk`;
    const localPath = `file:///C:/Users/User/Desktop/backup%2000h42%2021-03Vagou/vagou.apk`;
    fetch(serverPath, { method: "HEAD" })
      .then((resp) => {
        if (resp.ok) {
          setApkUrl(serverPath);
        } else {
          setApkUrl(localPath);
        }
      })
      .catch(() => setApkUrl(localPath));
  }, []);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex flex-1 items-center justify-center py-12">
          <Spinner className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="bg-muted/40 py-8 md:py-12">
        <div className="mx-auto max-w-5xl space-y-10 px-4 md:space-y-12 md:px-8">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground shadow-2xl md:p-14">
            <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
            <div className="relative z-10 flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:gap-8 md:text-left">
              {appIconUrl && (
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/30 bg-white shadow-xl ring-4 ring-white/10">
                  <img src={appIconUrl} alt={appName} className="h-full w-full object-contain p-2" />
                </div>
              )}
              <div className="max-w-xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                  <Download className="h-3.5 w-3.5" />
                  Aplicativo oficial
                </div>
                <h1 className="mb-3 text-3xl font-extrabold tracking-tight md:text-5xl">Instalar {appName}</h1>
                <p className="text-lg font-light leading-relaxed text-primary-foreground/90">
                  Tenha acesso rápido ao sistema diretamente da tela inicial do seu celular.
                </p>

                <div className="mt-6">
                  {isStandalone ? (
                    <Badge className="gap-1 border-white/20 bg-white/15 px-4 py-2 text-base text-primary-foreground hover:bg-white/15">
                      <CheckCircle2 className="h-4 w-4" />
                      Aplicativo já instalado!
                    </Badge>
                  ) : isInstallable ? (
                    <Button
                      size="lg"
                      onClick={handleInstallPWA}
                      variant="secondary"
                      className="h-auto gap-3 px-8 py-6 text-lg shadow-lg"
                    >
                      <Download className="h-6 w-6" />
                      Instalar Aplicativo
                    </Button>
                  ) : (
                    <p className="text-sm text-primary-foreground/80">
                      Seu navegador não suporta instalação automática. Siga as instruções abaixo para instalar manualmente.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Browser Instructions */}
          {!isStandalone && (
            <div className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
              <SectionHeader icon={Globe} title="Instruções de Instalação" />
              <Tabs defaultValue={currentBrowser} className="w-full">
                <TabsList className="h-auto w-full flex-wrap gap-1 bg-muted/60 p-1">
                  <TabsTrigger value={currentBrowser} className="text-xs">Seu Navegador</TabsTrigger>
                  <TabsTrigger value="all" className="text-xs">Todos os Navegadores</TabsTrigger>
                </TabsList>
                <TabsContent value={currentBrowser} className="mt-4">
                  <BrowserInstructions browser={currentBrowser} canInstall={isInstallable} onInstallClick={handleInstallPWA} />
                </TabsContent>
                <TabsContent value="all" className="mt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {getAllBrowsers().map((browser) => (
                      <BrowserInstructions key={browser} browser={browser} />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* APK Download */}
          <div className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
            <SectionHeader icon={Download} title="Download APK (Android)" align="center" />
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
              <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 text-center">
                <Button size="lg" className="w-full justify-center gap-2 shadow-lg shadow-primary/20 sm:w-auto" asChild>
                  <a href={apkUrl || `file:///C:/Users/User/Desktop/backup%2000h42%2021-03Vagou/vagou.apk`} download>
                    <Download className="h-5 w-5" />
                    Baixar APK
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* App Stores - Em breve */}
          <div className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
            <SectionHeader icon={Smartphone} title="Baixar nas lojas" align="center" />
            <p className="text-center text-sm text-muted-foreground">
              Estamos trabalhando na versão para as lojas oficiais. Em breve você poderá baixar diretamente:
            </p>
            <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
              {/* App Store */}
              <div className="group relative flex flex-col items-center gap-3">
                <img
                  src={appStoreBadge}
                  alt="Download on the App Store"
                  className="pointer-events-none h-14 w-auto opacity-60 grayscale"
                  aria-disabled
                />
                <Badge variant="secondary" className="gap-1">
                  <Zap className="h-3 w-3" /> Em desenvolvimento — em breve
                </Badge>
              </div>

              {/* Google Play */}
              <div className="group relative flex flex-col items-center gap-3">
                <img
                  src={googlePlayBadge}
                  alt="Get it on Google Play"
                  className="pointer-events-none h-14 w-auto opacity-60 grayscale"
                  aria-disabled
                />
                <Badge variant="secondary" className="gap-1">
                  <Zap className="h-3 w-3" /> Em desenvolvimento — em breve
                </Badge>
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Enquanto isso, você pode instalar o aplicativo diretamente pelo navegador ou baixar o APK acima.
            </p>
          </div>


          {/* Benefits */}
          <div className="space-y-5">
            <SectionHeader icon={Smartphone} title="Vantagens do Aplicativo" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {benefits.map(({ icon: Icon, title, desc, color, bg }) => (
                <div
                  key={title}
                  className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${bg} transition-transform group-hover:scale-110`}>
                    <Icon className={`h-6 w-6 ${color}`} />
                  </div>
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
            <SectionHeader icon={HelpCircle} title="Perguntas Frequentes" />
            <Accordion type="single" collapsible className="w-full space-y-2">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="rounded-xl border border-border px-4">
                  <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default DownloadApp;
