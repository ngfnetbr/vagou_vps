import { useEffect, useRef, useState } from "react";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";

declare global {
  interface Window {
    grecaptcha?: any;
    onRecaptchaBadgeLoad?: () => void;
    __recaptchaV3Ready?: boolean;
    __recaptchaSiteKey?: string;
  }
}

export const RecaptchaBadge = ({ show = true }: { show?: boolean }) => {
  const { data: config } = useConfiguracoesPublicas();
  const isEnabled = !!(config?.captcha_habilitado && config?.captcha_site_key);
  const isGoogle = !!config?.captcha_site_key && config.captcha_site_key.startsWith("6L");
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (!isEnabled || !isGoogle) return;
    if (window.grecaptcha && window.__recaptchaV3Ready) {
      setScriptLoaded(true);
      return;
    }
    const existing = document.querySelector('script[data-recaptcha="v3"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => setScriptLoaded(true));
      return;
    }
    const s = document.createElement("script");
    s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(config!.captcha_site_key!)}&hl=pt-BR`;
    s.async = true;
    s.defer = true;
    s.setAttribute("data-recaptcha", "v3");
    s.addEventListener("load", () => setScriptLoaded(true));
    document.body.appendChild(s);
    return () => {};
  }, [isEnabled, isGoogle]);

  useEffect(() => {
    if (!isEnabled || !isGoogle || !scriptLoaded) return;
    if (!window.grecaptcha) return;
    window.__recaptchaSiteKey = config!.captcha_site_key!;
    window.grecaptcha.ready(() => {
      window.__recaptchaV3Ready = true;
      // Executa uma vez para forçar a injeção do badge; token é descartado
      try {
        window.grecaptcha.execute(window.__recaptchaSiteKey!, { action: "preload" }).catch(() => {});
      } catch {
        // grecaptcha pode não estar pronto
      }
      try {
        const badge = document.querySelector<HTMLDivElement>(".grecaptcha-badge");
        if (badge) {
          if (show) {
            badge.style.opacity = "";
            badge.style.pointerEvents = "";
            badge.style.visibility = "";
          } else {
            badge.style.opacity = "0";
            badge.style.pointerEvents = "none";
            badge.style.visibility = "hidden";
          }
        }
      } catch {
        // badge pode não existir ainda
      }
    });
    return () => {
      try {
        const badge = document.querySelector<HTMLDivElement>(".grecaptcha-badge");
        badge?.remove();
      } catch {
        // ignorar erro ao remover badge
      }
    };
  }, [isEnabled, isGoogle, scriptLoaded, config]);

  if (!isEnabled || !isGoogle) return null;
  return <div aria-hidden style={{ position: "fixed", bottom: 0, right: 0, zIndex: 9999, pointerEvents: "none" }} />;
};

