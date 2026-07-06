import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported("Notification" in window);
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error("Seu navegador não suporta notificações");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        toast.success("Notificações ativadas!");
        return true;
      } else if (result === "denied") {
        toast.error("Notificações bloqueadas. Habilite nas configurações do navegador.");
        return false;
      }
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast.error("Erro ao solicitar permissão de notificações");
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== "granted") {
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error("Error showing notification:", error);
      return null;
    }
  }, [isSupported, permission]);

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    isEnabled: permission === "granted",
  };
}
