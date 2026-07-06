import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Share2, MoreVertical, Menu, Plus, ArrowUp, Globe, Laptop, Apple, Monitor, Smartphone, Lightbulb } from "lucide-react";

export type BrowserType = 
  | 'chrome-android' 
  | 'chrome-desktop' 
  | 'safari-ios' 
  | 'safari-mac' 
  | 'firefox-android'
  | 'firefox-desktop'
  | 'samsung'
  | 'edge'
  | 'unknown';

interface BrowserInstructionsProps {
  browser: BrowserType;
  onInstallClick?: () => void;
  canInstall?: boolean;
}

const instructions: Record<BrowserType, { title: string; steps: React.ReactNode[]; icon: React.ReactNode; note?: string }> = {
  'chrome-android': {
    title: 'Chrome para Android',
    icon: <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center"><Globe className="h-6 w-6 text-green-600" /></div>,
    steps: [
      <span key="1">Toque no menu <MoreVertical className="inline h-4 w-4 mx-1" /> no canto superior direito</span>,
      <span key="2">Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong></span>,
      <span key="3">Confirme tocando em <strong>"Instalar"</strong></span>,
    ],
  },
  'chrome-desktop': {
    title: 'Chrome para Desktop',
    icon: <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><Laptop className="h-6 w-6 text-blue-600" /></div>,
    steps: [
      <span key="1">Clique no ícone de instalação <Plus className="inline h-4 w-4 mx-1 border rounded" /> na barra de endereço</span>,
      <span key="2">Ou clique no menu <MoreVertical className="inline h-4 w-4 mx-1" /> → <strong>"Instalar VAGOU..."</strong></span>,
      <span key="3">Confirme clicando em <strong>"Instalar"</strong></span>,
    ],
    note: 'Atalho: Ctrl+Shift+A (Windows) ou Cmd+Shift+A (Mac)',
  },
  'safari-ios': {
    title: 'Safari para iPhone/iPad',
    icon: <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><Apple className="h-6 w-6 text-blue-600" /></div>,
    steps: [
      <span key="1">Toque no botão <strong>Compartilhar</strong> <Share2 className="inline h-4 w-4 mx-1" /> na barra inferior</span>,
      <span key="2">Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong> <Plus className="inline h-4 w-4 mx-1" /></span>,
      <span key="3">Toque em <strong>"Adicionar"</strong> no canto superior direito</span>,
    ],
    note: 'O ícone aparecerá na tela inicial como um app nativo',
  },
  'safari-mac': {
    title: 'Safari para Mac',
    icon: <div className="h-10 w-10 rounded-lg bg-gray-500/10 flex items-center justify-center"><Monitor className="h-6 w-6 text-gray-700" /></div>,
    steps: [
      <span key="1">Clique em <strong>Arquivo</strong> na barra de menu</span>,
      <span key="2">Selecione <strong>"Adicionar ao Dock"</strong></span>,
      <span key="3">O app aparecerá no seu Dock</span>,
    ],
    note: 'Disponível no macOS Sonoma (14) ou superior',
  },
  'firefox-android': {
    title: 'Firefox para Android',
    icon: <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center"><Globe className="h-6 w-6 text-orange-600" /></div>,
    steps: [
      <span key="1">Toque no menu <MoreVertical className="inline h-4 w-4 mx-1" /> no canto inferior direito</span>,
      <span key="2">Selecione <strong>"Instalar"</strong> ou <strong>"Adicionar à tela inicial"</strong></span>,
      <span key="3">Confirme a instalação</span>,
    ],
  },
  'firefox-desktop': {
    title: 'Firefox para Desktop',
    icon: <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center"><Monitor className="h-6 w-6 text-orange-600" /></div>,
    steps: [
      <span key="1">O Firefox Desktop não suporta instalação de PWAs nativamente</span>,
      <span key="2">Você pode criar um atalho: <strong>Menu → Mais ferramentas → Criar atalho</strong></span>,
      <span key="3">Ou acesse pelo navegador normalmente</span>,
    ],
    note: 'Recomendamos usar Chrome ou Edge para melhor experiência',
  },
  'samsung': {
    title: 'Samsung Internet',
    icon: <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center"><Smartphone className="h-6 w-6 text-purple-600" /></div>,
    steps: [
      <span key="1">Toque no menu <Menu className="inline h-4 w-4 mx-1" /> no canto inferior</span>,
      <span key="2">Selecione <strong>"Adicionar página a"</strong> → <strong>"Tela inicial"</strong></span>,
      <span key="3">Toque em <strong>"Adicionar"</strong> para confirmar</span>,
    ],
  },
  'edge': {
    title: 'Microsoft Edge',
    icon: <div className="h-10 w-10 rounded-lg bg-blue-600/10 flex items-center justify-center"><Globe className="h-6 w-6 text-blue-700" /></div>,
    steps: [
      <span key="1">Clique no menu <MoreVertical className="inline h-4 w-4 mx-1" /> no canto superior direito</span>,
      <span key="2">Vá em <strong>Aplicativos</strong> → <strong>"Instalar este site como aplicativo"</strong></span>,
      <span key="3">Confirme clicando em <strong>"Instalar"</strong></span>,
    ],
    note: 'Também funciona em dispositivos móveis',
  },
  'unknown': {
    title: 'Seu Navegador',
    icon: <div className="h-10 w-10 rounded-lg bg-gray-500/10 flex items-center justify-center"><Globe className="h-6 w-6 text-gray-700" /></div>,
    steps: [
      <span key="1">Procure por uma opção de <strong>"Instalar"</strong> ou <strong>"Adicionar à tela inicial"</strong> no menu do navegador</span>,
      <span key="2">Geralmente está no menu principal (três pontos ou linhas)</span>,
      <span key="3">Se não encontrar, tente usar Chrome, Edge ou Safari para melhor experiência</span>,
    ],
  },
};

export const BrowserInstructions = ({ browser, onInstallClick, canInstall }: BrowserInstructionsProps) => {
  const info = instructions[browser];
  
  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {info.icon}
          <div>
            <CardTitle className="text-lg">{info.title}</CardTitle>
            <CardDescription>Passo a passo para instalação</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="space-y-3">
          {info.steps.map((step, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                {index + 1}
              </span>
              <span className="text-sm pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        
        {info.note && (
          <p className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{info.note}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export const detectBrowser = (): BrowserType => {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isMac = /macintosh/.test(ua);
  const isAndroid = /android/.test(ua);
  const isSamsung = /samsungbrowser/.test(ua);
  const isFirefox = /firefox/.test(ua);
  const isEdge = /edg/.test(ua);
  const isChrome = /chrome/.test(ua) && !/edg/.test(ua) && !/samsungbrowser/.test(ua);
  const isSafari = /safari/.test(ua) && !/chrome/.test(ua);

  if (isSamsung) return 'samsung';
  if (isEdge) return 'edge';
  if (isFirefox && isAndroid) return 'firefox-android';
  if (isFirefox) return 'firefox-desktop';
  if (isChrome && isAndroid) return 'chrome-android';
  if (isChrome) return 'chrome-desktop';
  if (isSafari && isIOS) return 'safari-ios';
  if (isSafari && isMac) return 'safari-mac';
  
  return 'unknown';
};

export const getAllBrowsers = (): BrowserType[] => [
  'chrome-android',
  'chrome-desktop',
  'safari-ios',
  'safari-mac',
  'edge',
  'samsung',
  'firefox-android',
  'firefox-desktop',
];
