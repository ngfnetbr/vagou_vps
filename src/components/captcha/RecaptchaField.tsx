import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from "react";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";

declare global {
  interface Window {
    grecaptcha?: any;
    onRecaptchaLoad?: () => void;
  }
}

export interface RecaptchaFieldRef {
  execute: () => Promise<string | null>;
  reset: () => void;
}

interface RecaptchaFieldProps {
  onVerify?: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: string) => void;
}

export const RecaptchaField = forwardRef<RecaptchaFieldRef, RecaptchaFieldProps>(
  ({ onVerify, onExpire, onError }, ref) => {
    const { data: config } = useConfiguracoesPublicas();
    const isEnabled = !!(config?.captcha_habilitado && config?.captcha_site_key);
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<number | null>(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);

    useEffect(() => {
      if (!isEnabled) return;
      if (window.grecaptcha && window.grecaptcha.render) {
        setScriptLoaded(true);
        return;
      }
      const existing = document.querySelector('script[data-recaptcha="v2"]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", () => setScriptLoaded(true));
        return;
      }
      const s = document.createElement("script");
      s.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
      s.async = true;
      s.defer = true;
      s.setAttribute("data-recaptcha", "v2");
      window.onRecaptchaLoad = () => setScriptLoaded(true);
      document.body.appendChild(s);
    }, [isEnabled]);

    useEffect(() => {
      if (!isEnabled || !scriptLoaded || !containerRef.current) return;
      if (widgetIdRef.current !== null) return;
      if (!window.grecaptcha || !window.grecaptcha.render) return;
      const size = import.meta.env.DEV ? "normal" : "invisible";
      try {
        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: config!.captcha_site_key!,
          size,
          badge: "bottomright",
          callback: (token: string) => {
            onVerify?.(token);
          },
          "error-callback": () => {
            onError?.("erro");
          },
          "expired-callback": () => {
            onExpire?.();
          },
        });
      } catch (e) {
        onError?.("render");
      }
    }, [isEnabled, scriptLoaded, config, onVerify, onExpire, onError]);

    useImperativeHandle(ref, () => ({
      execute: async () => {
        if (!isEnabled) return null;
        if (widgetIdRef.current === null || !window.grecaptcha) return null;
        try {
          const token = await window.grecaptcha.execute(widgetIdRef.current);
          return token || null;
        } catch {
          return null;
        }
      },
      reset: () => {
        if (widgetIdRef.current !== null && window.grecaptcha) {
          window.grecaptcha.reset(widgetIdRef.current);
        }
      },
    }));

    if (!isEnabled) return null;

    return <div className="flex justify-center my-4"><div ref={containerRef} /></div>;
  }
);

RecaptchaField.displayName = "RecaptchaField";

