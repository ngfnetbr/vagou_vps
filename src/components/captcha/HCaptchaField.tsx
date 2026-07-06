import { useRef, forwardRef, useImperativeHandle } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";

export interface HCaptchaFieldRef {
  execute: () => Promise<string | null>;
  reset: () => void;
}

interface HCaptchaFieldProps {
  enabled?: boolean;
  siteKey?: string | null;
  onVerify?: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: string) => void;
}

export const HCaptchaField = forwardRef<HCaptchaFieldRef, HCaptchaFieldProps>(
  ({ enabled, siteKey, onVerify, onExpire, onError }, ref) => {
    const { data: config } = useConfiguracoesPublicas();
    const captchaRef = useRef<HCaptcha>(null);
    const pendingResolveRef = useRef<((token: string | null) => void) | null>(null);
    const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resolvedEnabled = enabled ?? config?.captcha_habilitado;
    const resolvedSiteKey = siteKey ?? config?.captcha_site_key ?? null;
    const isEnabled = !!resolvedEnabled && !!resolvedSiteKey;

    useImperativeHandle(ref, () => ({
      execute: async () => {
        if (!isEnabled || !captchaRef.current) return null;

        if (pendingTimeoutRef.current) {
          clearTimeout(pendingTimeoutRef.current);
          pendingTimeoutRef.current = null;
        }
        if (pendingResolveRef.current) {
          pendingResolveRef.current(null);
          pendingResolveRef.current = null;
        }

        captchaRef.current.resetCaptcha();

        return await new Promise<string | null>((resolve) => {
          pendingResolveRef.current = resolve;
          pendingTimeoutRef.current = setTimeout(() => {
            pendingTimeoutRef.current = null;
            pendingResolveRef.current = null;
            resolve(null);
          }, 60000);

          try {
            captchaRef.current?.execute();
          } catch (error) {
            if (pendingTimeoutRef.current) {
              clearTimeout(pendingTimeoutRef.current);
              pendingTimeoutRef.current = null;
            }
            pendingResolveRef.current = null;
            console.error("Erro ao executar CAPTCHA:", error);
            onError?.(error instanceof Error ? error.message : String(error));
            resolve(null);
          }
        });
      },
      reset: () => {
        captchaRef.current?.resetCaptcha();
      },
    }));

    // Se CAPTCHA não está habilitado, não renderiza nada
    if (!isEnabled) {
      return null;
    }

    return (
      <div className="flex justify-center">
        <HCaptcha
          ref={captchaRef}
          sitekey={resolvedSiteKey!}
          size="invisible"
          onVerify={(token) => {
            onVerify?.(token);
            if (pendingTimeoutRef.current) {
              clearTimeout(pendingTimeoutRef.current);
              pendingTimeoutRef.current = null;
            }
            pendingResolveRef.current?.(token);
            pendingResolveRef.current = null;
          }}
          onExpire={() => {
            onExpire?.();
            if (pendingTimeoutRef.current) {
              clearTimeout(pendingTimeoutRef.current);
              pendingTimeoutRef.current = null;
            }
            pendingResolveRef.current?.(null);
            pendingResolveRef.current = null;
          }}
          onError={(err) => {
            onError?.(String(err));
            if (pendingTimeoutRef.current) {
              clearTimeout(pendingTimeoutRef.current);
              pendingTimeoutRef.current = null;
            }
            pendingResolveRef.current?.(null);
            pendingResolveRef.current = null;
          }}
          languageOverride="pt-BR"
        />
      </div>
    );
  }
);

HCaptchaField.displayName = "HCaptchaField";

