import { usePWAIcons } from '@/hooks/use-pwa-icons';

/**
 * Componente invisível que atualiza dinamicamente
 * os ícones do PWA baseado nas configurações do sistema
 */
export function PWAIconsUpdater() {
  usePWAIcons();
  return null;
}
