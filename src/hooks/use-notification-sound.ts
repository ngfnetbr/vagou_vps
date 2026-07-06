import { useEffect, useRef, useCallback } from "react";

// Som de notificação original
const NOTIFICATION_SOUND_BASE64 = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleDoYOW3T4axuJxY3dNPqq24pCy6A3uSpajAEJ4nmwJxyPwcijPO3mXM/BimE8rCfbyoIKYPwuZFuNgori+24lXEvBSqM7seIcj0GI5bnwoFuPAYek+7GfnE4CSaO8sqAcDUNI5Pw0H5zOAcok/LPfG42DSuT8s96cDMJLJbvz3pwMw4tl+7Rf3MyCS2Y7tF/czMOLZnu0X9zMw4tme7Rf3MzDi2Z7tF/czMOLZnu0X9zMw4tme7Rf3MzDi2Z7tF/czMOLZnu0X9zMw4tme7Rf3MzDi2Z7dJ/cjQNLJjt0n9yNA0smO3Sf3I0DSyY7dJ/cjQNLJjt0n9yNA0smO3Sf3I0DSyY7dF/cjQNLJft0X9yNA0sl+3Rf3I0DSyX7dF/cjQNLJft0X9yNA0sl+3Rf3I0DSyX7dF/cjQNLJft0X9yNA0sl+3Rf3I0DSyX7dF/cjMNLZbt0X5yMw4tlu3RfnIzDi2W7dF+cjMOLZbt0X5yMw4tlu3RfnIzDi2W7dF+cjMOLZbt0X5yMw4tlu3RfnIzDi2W7dF+cjMOLZbt0X5yMw4tlu3RfnIzDi2W7dF+cjMOLZbt0X5yMw4tlu3RfnIzDi2W7dF+cjMOLZbt0X5yMw4tlu3RfnIzDi2W7dF+cjMOLZbt0X5yMw4tlu3RfnIzDi2W7dF+cjMOLZbt0X5yMw4tlu3RfnIzDi2W7dF+cjMOLZbt0X5yMw4=";

export const useNotificationSound = (pendentes: number, enabled: boolean = true) => {
  const previousPendentes = useRef<number>(pendentes);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isFirstRender = useRef(true);
  const lastPlayTime = useRef<number>(0);

  // Inicializar audio apenas uma vez
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(NOTIFICATION_SOUND_BASE64);
      audioRef.current.volume = 0.5;
    }
  }, []);

  useEffect(() => {
    // Na primeira renderização, apenas inicializar o valor sem tocar som
    if (isFirstRender.current) {
      previousPendentes.current = pendentes;
      isFirstRender.current = false;
      return;
    }

    // Só tocar som se aumentou o número de pendentes
    if (enabled && pendentes > previousPendentes.current && pendentes > 0) {
      const now = Date.now();
      
      // Evitar tocar som mais de uma vez a cada 3 segundos
      if (now - lastPlayTime.current > 3000) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
          lastPlayTime.current = now;
        }
      }
    }

    previousPendentes.current = pendentes;
  }, [pendentes, enabled]);

  const playSound = useCallback(() => {
    const now = Date.now();
    
    if (audioRef.current && enabled && now - lastPlayTime.current > 1000) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      lastPlayTime.current = now;
    }
  }, [enabled]);

  return { playSound };
};
