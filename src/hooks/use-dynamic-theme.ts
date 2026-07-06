import { useEffect } from "react";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";

// Converte HEX para HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function useDynamicTheme() {
  const { data: config } = useConfiguracoesPublicas();

  useEffect(() => {
    if (!config) return;

    const root = document.documentElement;
    
    // Função para verificar se está no modo escuro
    const isDarkMode = () => root.classList.contains('dark');
    
    // Função para aplicar ou remover tema
    const applyTheme = () => {
      // No modo escuro, usar tema neutro padrão (não aplicar cores customizadas)
      if (isDarkMode()) {
        // Limpar variáveis customizadas para usar os valores do CSS .dark
        root.style.removeProperty("--govbr-blue-main");
        root.style.removeProperty("--govbr-blue-light");
        root.style.removeProperty("--govbr-blue-dark");
        root.style.removeProperty("--primary");
        root.style.removeProperty("--ring");
        root.style.removeProperty("--header-bg");
        root.style.removeProperty("--sidebar-background");
        root.style.removeProperty("--sidebar-accent");
        root.style.removeProperty("--sidebar-border");
        root.style.removeProperty("--sidebar-gradient-image");
        root.style.removeProperty("--foreground");
        root.style.removeProperty("--card-foreground");
        root.style.removeProperty("--popover-foreground");
        return;
      }

      // No modo claro, aplicar cores configuradas
      if (config.tema_cor_primaria) {
        const hsl = hexToHsl(config.tema_cor_primaria);
        if (hsl) {
          const hslValue = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
          
          root.style.setProperty("--govbr-blue-main", hslValue);
          root.style.setProperty("--govbr-blue-light", `${hsl.h} ${Math.max(0, hsl.s - 20)}% ${Math.min(95, hsl.l + 40)}%`);
          root.style.setProperty("--primary", hslValue);
          root.style.setProperty("--ring", hslValue);
          root.style.setProperty("--header-bg", hslValue);
          root.style.setProperty("--sidebar-background", hslValue);
          root.style.setProperty("--sidebar-accent", `${hsl.h} ${hsl.s}% ${Math.min(100, hsl.l + 7)}%`);
          root.style.setProperty("--sidebar-border", `${hsl.h} ${hsl.s}% ${Math.min(100, hsl.l + 7)}%`);
        }
      }

      const gradientEnabled = (config as any).tema_sidebar_gradiente_ativo;
      const gradientStart = (config as any).tema_sidebar_gradiente_inicio;
      const gradientEnd = (config as any).tema_sidebar_gradiente_fim;

      if (gradientEnabled && gradientStart && gradientEnd) {
        root.style.setProperty("--sidebar-gradient-image", `linear-gradient(180deg, ${gradientStart}, ${gradientEnd})`);
      } else {
        root.style.removeProperty("--sidebar-gradient-image");
      }

      // A cor secundária não deve alterar a cor da fonte/dados (que deve ser padrão #071d41)
      /* 
      if (config.tema_cor_secundaria) {
        const hsl = hexToHsl(config.tema_cor_secundaria);
        if (hsl) {
          const hslValue = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
          root.style.setProperty("--govbr-blue-dark", hslValue);
          root.style.setProperty("--foreground", hslValue);
          root.style.setProperty("--card-foreground", hslValue);
          root.style.setProperty("--popover-foreground", hslValue);
        }
      }
      */
    };

    // Aplicar tema inicialmente
    applyTheme();

    // Aplicar fonte (funciona em ambos os modos)
    if (config.tema_fonte) {
      root.style.setProperty("--font-family", config.tema_fonte);
      root.style.fontFamily = `${config.tema_fonte}, system-ui, sans-serif`;
    }

    // Aplicar favicon dinâmico
    const faviconUrl = (config as any).favicon_url;
    if (faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    }

    // Observer para mudanças de tema (light/dark)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          applyTheme();
        }
      });
    });

    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    // Cleanup
    return () => {
      observer.disconnect();
      root.style.removeProperty("--govbr-blue-main");
      root.style.removeProperty("--govbr-blue-light");
      root.style.removeProperty("--govbr-blue-dark");
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--header-bg");
      root.style.removeProperty("--sidebar-background");
      root.style.removeProperty("--sidebar-accent");
      root.style.removeProperty("--sidebar-border");
      root.style.removeProperty("--sidebar-gradient-image");
      root.style.removeProperty("--foreground");
      root.style.removeProperty("--card-foreground");
      root.style.removeProperty("--popover-foreground");
      root.style.removeProperty("--font-family");
      root.style.fontFamily = "";
    };
  }, [config]);
}
