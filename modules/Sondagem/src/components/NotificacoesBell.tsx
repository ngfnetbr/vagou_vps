// @ts-nocheck
import { useState } from "react";
import { Bell } from "lucide-react";
import { Badge } from "@ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@ui/popover";
import { Button } from "@ui/button";
import { supabase } from "@sondagem/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@root/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import type { Tables, TablesUpdate } from "@sondagem/integrations/supabase/db";

type NotificacaoRow = Tables<"notificacoes">;
type NotificacaoUpdate = TablesUpdate<"notificacoes">;

export function NotificacoesBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: notificacoes = [] } = useQuery({
    queryKey: ["notificacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as NotificacaoRow[];
    },
    enabled: !!user,
    refetchInterval: 30000, // poll every 30s
  });

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  const marcarLida = async (notif: NotificacaoRow) => {
    const patch: NotificacaoUpdate = { lida: true };
    await supabase.from("notificacoes").update(patch).eq("id", notif.id);
    queryClient.invalidateQueries({ queryKey: ["notificacoes"] });

    // If it's a solicitação notification, navigate to lançamento
    if (notif.tipo === "solicitacao_sondagem" && notif.referencia_id) {
      setOpen(false);
      navigate(`/modulo/sondar/aplicar?solicitacao_id=${notif.referencia_id}`);
    }
  };

  const marcarTodasLidas = async () => {
    const ids = notificacoes.filter((n) => !n.lida).map((n) => n.id);
    if (ids.length === 0) return;
    for (const id of ids) {
      const patch: NotificacaoUpdate = { lida: true };
      await supabase.from("notificacoes").update(patch).eq("id", id);
    }
    queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Notificações</h4>
          {naoLidas > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={marcarTodasLidas}>
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notificacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma notificação.</p>
          ) : (
            notificacoes.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${!n.lida ? "bg-primary/5" : ""}`}
                onClick={() => marcarLida(n)}
              >
                <div className="flex items-start gap-2">
                  {!n.lida && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{n.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.mensagem}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.created_at || "").toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

