import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function RealtimeIndicator() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Verificar status da conexão
    const checkConnection = () => {
      const channels = supabase.getChannels();
      const hasActiveChannels = channels.some(
        channel => channel.state === 'joined'
      );
      setIsConnected(hasActiveChannels);
    };

    // Verificar imediatamente
    checkConnection();

    // Verificar periodicamente
    const interval = setInterval(checkConnection, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!isConnected) {
    return (
      <Badge 
        variant="outline" 
        className="gap-1 bg-muted/50"
        aria-label="Atualizações em tempo real desconectadas"
      >
        <WifiOff className="h-3 w-3" aria-hidden="true" />
        <span className="sr-only">Desconectado</span>
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className="gap-1 bg-green-50 text-green-700 border-green-200"
      aria-label="Atualizações em tempo real ativas"
    >
      <Wifi className="h-3 w-3 animate-pulse" aria-hidden="true" />
      <span className="text-xs">Tempo Real</span>
      <span className="sr-only">Conectado</span>
    </Badge>
  );
}