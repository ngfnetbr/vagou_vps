import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const CHANNEL = "presence:online-users";
let sharedPresenceChannel: RealtimeChannel | null = null;
let sharedPresenceUserId: string | null = null;
let sharedPresenceEmail: string | null = null;

export interface PresenceEntry {
  user_id: string;
  email: string | null;
  online_at: string;
}

export interface OnlineUsersSnapshot {
  users: Record<string, PresenceEntry>;
  count: number;
  lastUpdatedAt: string;
}

function disposePresenceChannel() {
  if (sharedPresenceChannel) {
    supabase.removeChannel(sharedPresenceChannel);
    sharedPresenceChannel = null;
    sharedPresenceUserId = null;
  }
}

function ensurePresenceChannel(userId: string) {
  if (sharedPresenceChannel && sharedPresenceUserId === userId) {
    return sharedPresenceChannel;
  }

  disposePresenceChannel();

  sharedPresenceChannel = supabase.channel(CHANNEL, {
    config: { presence: { key: userId } },
  });
  sharedPresenceUserId = userId;
  return sharedPresenceChannel;
}

/**
 * Registra o usuário atual como "online" via Realtime Presence.
 * Deve ser chamado uma vez no topo da árvore (AuthContext).
 */
export function usePresenceTracker(userId?: string | null, email?: string | null) {
  useEffect(() => {
    if (!userId) {
      sharedPresenceEmail = null;
      disposePresenceChannel();
      return;
    }

    sharedPresenceEmail = email ?? null;

    const channel = ensurePresenceChannel(userId);
    let active = true;

    const trackPresence = async () => {
      if (!active) return;
      await channel.track({
        user_id: userId,
        email: email ?? null,
        online_at: new Date().toISOString(),
      } satisfies PresenceEntry);
    };

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await trackPresence();
      }
    });

    const heartbeat = setInterval(() => {
      void trackPresence();
    }, 15_000);

    return () => {
      active = false;
      clearInterval(heartbeat);
      if (sharedPresenceChannel === channel && sharedPresenceUserId === userId) {
        disposePresenceChannel();
      }
    };
  }, [userId, email]);
}

/**
 * Lê os usuários atualmente online. Retorna um mapa user_id -> última entrada.
 */
export function useOnlineUsers() {
  const [snapshot, setSnapshot] = useState<OnlineUsersSnapshot>({
    users: {},
    count: 0,
    lastUpdatedAt: new Date().toISOString(),
  });

  useEffect(() => {
    const read = () => {
      const next: Record<string, PresenceEntry> = {};

      const channel = sharedPresenceChannel;
      if (channel) {
        const state = channel.presenceState<PresenceEntry>();
        Object.values(state).forEach((entries) => {
          entries.forEach((entry) => {
            if (entry.user_id) next[entry.user_id] = entry;
          });
        });
      }

      // O próprio usuário logado está, por definição, online ao ver o painel.
      if (sharedPresenceUserId) {
        next[sharedPresenceUserId] = {
          user_id: sharedPresenceUserId,
          email: sharedPresenceEmail,
          online_at: next[sharedPresenceUserId]?.online_at ?? new Date().toISOString(),
        };
      }

      setSnapshot({
        users: next,
        count: Object.keys(next).length,
        lastUpdatedAt: new Date().toISOString(),
      });
    };

    read();
    const interval = setInterval(read, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);


  return snapshot;
}
