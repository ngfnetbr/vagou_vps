import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const CHANNEL_PREFIX = "single-session:";
const CLAIM_EVENT = "session-claimed";

interface SessionClaimPayload {
  session_id: string;
  claimed_at: string;
}

function compareClaims(a: SessionClaimPayload, b: SessionClaimPayload) {
  const timeDiff = new Date(a.claimed_at).getTime() - new Date(b.claimed_at).getTime();
  if (timeDiff !== 0) return timeDiff;
  return a.session_id.localeCompare(b.session_id);
}

function getLatestClaim(state: Record<string, SessionClaimPayload[]>) {
  return Object.values(state)
    .flat()
    .reduce<SessionClaimPayload | null>((latest, claim) => {
      if (!latest) return claim;
      return compareClaims(claim, latest) > 0 ? claim : latest;
    }, null);
}

/**
 * Garante uma única sessão ativa por usuário.
 *
 * Ao logar, gera um identificador único para esta aba/dispositivo e anuncia a
 * posse da sessão em um canal Realtime exclusivo do usuário. Se outra aba ou
 * dispositivo anunciar uma sessão mais recente para a mesma conta, esta sessão
 * é encerrada.
 */
export function useSingleSession(
  userId: string | undefined,
  onKicked: () => void,
) {
  const localSessionIdRef = useRef<string>("");
  const onKickedRef = useRef(onKicked);
  onKickedRef.current = onKicked;

  useEffect(() => {
    if (!userId) return;

    let active = true;
    const localSessionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const localClaim: SessionClaimPayload = {
      session_id: localSessionId,
      claimed_at: new Date().toISOString(),
    };
    localSessionIdRef.current = localSessionId;

    const kick = () => {
      if (!active) return;
      active = false;
      onKickedRef.current();
    };

    const evaluate = (claim: SessionClaimPayload | null | undefined) => {
      if (!claim || claim.session_id === localSessionIdRef.current) {
        return;
      }

      // Se existe uma reivindicação mais nova (ou empatada com id maior),
      // esta aba deixou de ser a sessão ativa.
      if (compareClaims(claim, localClaim) > 0) {
        kick();
      }
    };

    const readLatestPresence = (channel: ReturnType<typeof supabase.channel>) => {
      if (!active) return;
      const latest = getLatestClaim(channel.presenceState<SessionClaimPayload>());
      evaluate(latest);
    };

    const channel = supabase
      .channel(`${CHANNEL_PREFIX}${userId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: localSessionId },
        },
      })
      .on("presence", { event: "sync" }, () => {
        readLatestPresence(channel);
      })
      .on(
        "broadcast",
        {
          event: CLAIM_EVENT,
        },
        (payload) => {
          evaluate(payload.payload as SessionClaimPayload | null);
        },
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const trackResult = await channel.track(localClaim);
          if (trackResult !== "ok") {
            console.error("[single-session] presence track error:", trackResult);
          }

          const broadcastResult = await channel.send({
            type: "broadcast",
            event: CLAIM_EVENT,
            payload: localClaim,
          });

          if (broadcastResult !== "ok") {
            console.error("[single-session] broadcast error:", broadcastResult);
          }

          readLatestPresence(channel);
        }
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
