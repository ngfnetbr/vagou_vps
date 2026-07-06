import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { HCaptchaField, type HCaptchaFieldRef } from "./HCaptchaField";
import { useRef } from "react";

export interface CaptchaFieldRef {
  execute: () => Promise<string | null>;
  reset: () => void;
}

interface CaptchaFieldProps {
  onVerify?: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: string) => void;
  action?: string;
  visible?: boolean;
}

export const CaptchaField = forwardRef<CaptchaFieldRef, CaptchaFieldProps>(
  ({ onVerify, onExpire, onError, action, visible }, ref) => {
    const { data: config } = useConfiguracoesPublicas();
    const isEnabled = !!(config?.captcha_habilitado && config?.captcha_site_key);
    const isGoogle = !!config?.captcha_site_key && config.captcha_site_key.startsWith("6L");

    const hRef = useRef<HCaptchaFieldRef>(null);
    const googleContainerRef = useRef<HTMLDivElement | null>(null);
    const googleWidgetIdRef = useRef<number | null>(null);

    useEffect(() => {
      if (!isEnabled || !isGoogle || !visible) return;
      const tryRender = () => {
        if (!window.grecaptcha || !googleContainerRef.current || googleWidgetIdRef.current !== null) return;
        try {
          window.grecaptcha.ready(() => {
            try {
              const siteKey = (window as any).__recaptchaSiteKey || config?.captcha_site_key;
              // Renderizar v2 checkbox
              googleWidgetIdRef.current = window.grecaptcha.render(googleContainerRef.current!, {
                sitekey: siteKey,
                callback: (token: string) => {
                  onVerify?.(token);
                },
                'expired-callback': () => onExpire?.(),
                'error-callback': () => onError?.('render'),
              } as any);
            } catch {
              // Falha silenciosa
            }
          });
        } catch {
          // silencioso
        }
      };
      tryRender();
    }, [isEnabled, isGoogle, visible, config, onVerify, onExpire, onError]);

    useImperativeHandle(ref, () => ({
      execute: async () => {
        if (!isEnabled) return null;
        if (isGoogle) {
          const waitForApi = async (tries = 50): Promise<boolean> => {
            if (window.grecaptcha) return true;
            if (tries <= 0) return false;
            await new Promise((res) => setTimeout(res, 100));
            return waitForApi(tries - 1);
          };
          const apiReady = await waitForApi();
          if (!apiReady || !window.grecaptcha) return null;
          const siteKey = (window as any).__recaptchaSiteKey || config?.captcha_site_key;
          if (!siteKey) return null;
          const tryExecute = () =>
            new Promise<string | null>((resolve) => {
              try {
                window.grecaptcha.ready(async () => {
                  try {
                    const t = await window.grecaptcha.execute(siteKey, { action: action || "inscricao" });
                    resolve(t || null);
                  } catch {
                    resolve(null);
                  }
                });
              } catch {
                resolve(null);
              }
            });
          let execToken = await tryExecute();
          if (!execToken) {
            await new Promise((r) => setTimeout(r, 400));
            execToken = await tryExecute();
          }
          if (execToken && onVerify) onVerify(execToken);
          return execToken;
        }
        return await hRef.current?.execute() ?? null;
      },
      reset: () => {
        if (isGoogle) {
          return; // v3 não expõe reset por widget
        }
        hRef.current?.reset();
      },
    }));

    if (!isEnabled) return null;

    if (isGoogle) {
      return (
        <div className="my-2 text-[11px] text-muted-foreground text-center">
          Este site é protegido pelo reCAPTCHA e se aplicam a{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline">
            Política de Privacidade
          </a>{" "}
          e os{" "}
          <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="underline">
            Termos de Serviço
          </a>{" "}
          da Google.
        </div>
      );
    }

    return (
      <HCaptchaField
        ref={hRef}
        onVerify={onVerify}
        onExpire={onExpire}
        onError={onError}
        {...({ visible } as any)}
      />
    );
  }
);

CaptchaField.displayName = "CaptchaField";

