import { useEffect } from 'react';
import { useConfiguracoesPublicas } from '@/hooks/api/configuracoes-hooks';
import { getUnidadeLabels } from '@/utils/unidade-utils';

/**
 * Hook para atualizar dinamicamente os ícones e manifest do PWA
 * baseado nas configurações do sistema
 */
export function usePWAIcons() {
  const { data: config } = useConfiguracoesPublicas();

  useEffect(() => {
    if (!config) return;

    const pwaIconUrl = config.app_icone_url;
    const faviconUrl = config.favicon_url || config.app_icone_url;
    const appleTouchIconUrl = config.app_icone_url || config.favicon_url;
    const appName = config.app_nome || config.sistema_nome || 'VAGOU';
    const { plural } = getUnidadeLabels(config as any);

    // Atualiza favicon
    if (faviconUrl) {
      const favicon = document.getElementById('dynamic-favicon');
      if (favicon) {
        favicon.setAttribute('href', faviconUrl);
      }
    }

    // Atualiza apple-touch-icons
    if (appleTouchIconUrl) {
      const appleIcon192 = document.getElementById('apple-icon-192');
      const appleIcon512 = document.getElementById('apple-icon-512');
      if (appleIcon192) appleIcon192.setAttribute('href', appleTouchIconUrl);
      if (appleIcon512) appleIcon512.setAttribute('href', appleTouchIconUrl);
    }

    // Atualiza o nome do app no title
    if (appName && appName !== 'VAGOU') {
      const currentTitle = document.title;
      if (currentTitle.includes('VAGOU')) {
        document.title = currentTitle.replace('VAGOU', appName);
      }
    }

    // Gera e injeta manifest dinâmico
    const themeColor = config.tema_cor_primaria || '#1351B4';
    const backgroundColor = config.tema_cor_secundaria || '#071D41';
    
    const icons = pwaIconUrl ? [
      { src: pwaIconUrl, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: pwaIconUrl, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: pwaIconUrl, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: pwaIconUrl, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ] : [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ];

    const manifest = {
      name: `${appName} - Sistema de Gestão de Vagas em ${plural}`,
      short_name: appName.length > 12 ? appName.substring(0, 12) : appName,
      description: `Sistema de gestão de vagas em ${plural}`,
      start_url: '/',
      display: 'standalone',
      background_color: backgroundColor,
      theme_color: themeColor,
      orientation: 'portrait-primary',
      scope: '/',
      id: '/',
      icons,
      categories: ['education', 'government'],
      lang: 'pt-BR',
      dir: 'ltr',
      prefer_related_applications: false
    };

    // Cria blob URL para o manifest dinâmico
    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(manifestBlob);
    
    const manifestLink = document.getElementById('pwa-manifest');
    if (manifestLink) {
      const oldHref = manifestLink.getAttribute('href');
      manifestLink.setAttribute('href', manifestUrl);
      
      // Revoga URL antiga se era um blob
      if (oldHref && oldHref.startsWith('blob:')) {
        URL.revokeObjectURL(oldHref);
      }
    }

    // Atualiza meta theme-color
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', themeColor);
    }

    // Cleanup
    return () => {
      if (manifestUrl.startsWith('blob:')) {
        URL.revokeObjectURL(manifestUrl);
      }
    };
  }, [config]);
}

