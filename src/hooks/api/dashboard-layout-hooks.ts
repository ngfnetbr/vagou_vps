import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type LayoutState<TLayout> = {
  layouts: TLayout;
  hidden: Record<string, boolean>;
};

function safePlainObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function normalizeLayoutArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>) : null))
    .filter(Boolean)
    .map((item) => {
      const i = typeof item!.i === "string" ? item!.i : null;
      if (!i) return null;
      const w = toNumber(item!.w) ?? 1;
      const h = toNumber(item!.h) ?? 1;
      const x = toNumber(item!.x) ?? 0;
      const y = toNumber(item!.y) ?? 0;
      const out: Record<string, unknown> = { i, x, y, w, h };
      const minW = toNumber(item!.minW);
      const minH = toNumber(item!.minH);
      const maxW = toNumber(item!.maxW);
      const maxH = toNumber(item!.maxH);
      if (minW !== null) out.minW = minW;
      if (minH !== null) out.minH = minH;
      if (maxW !== null) out.maxW = maxW;
      if (maxH !== null) out.maxH = maxH;
      return out;
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
}

function mergeLayouts<TLayout extends Record<string, any>>(defaults: TLayout, saved: unknown): TLayout {
  const savedObj = safePlainObject(saved);
  if (!savedObj) return defaults;
  const out: Record<string, any> = { ...defaults };
  Object.keys(defaults).forEach((bp) => {
    const defArr = normalizeLayoutArray((defaults as any)[bp]);
    const savedArr = normalizeLayoutArray((savedObj as any)[bp]);
    const savedMap = new Map(savedArr.map((i: any) => [i?.i, i]));
    const merged = defArr.map((item: any) => savedMap.get(item?.i) ?? item);
    const mergedIds = new Set(merged.map((i: any) => i?.i));
    savedArr.forEach((item: any) => {
      if (item?.i && !mergedIds.has(item.i)) merged.push(item);
    });
    (out as any)[bp] = merged;
  });
  return out as TLayout;
}

export function useUserDashboardLayout<TLayout extends Record<string, unknown>>(
  dashboardKey: string,
  defaults: LayoutState<TLayout>,
  opts?: { saveDebounceMs?: number },
) {
  const saveDebounceMs = opts?.saveDebounceMs ?? 900;
  const [state, setState] = useState<LayoutState<TLayout>>(defaults);
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const lastSavedJsonRef = useRef<string>("");

  const query = useQuery({
    queryKey: ["user-dashboard-layout", dashboardKey],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_dashboard_layouts")
        .select("layouts, hidden")
        .eq("user_id", user.id)
        .eq("dashboard_key", dashboardKey)
        .maybeSingle();
      if (error) throw error;
      return data as { layouts: unknown; hidden: unknown } | null;
    },
  });

  const mergedFromServer = useMemo(() => {
    const server = query.data;
    if (!server) return null;
    const mergedLayouts = mergeLayouts(defaults.layouts as any, server.layouts) as TLayout;
    const hiddenObj = safePlainObject(server.hidden) as Record<string, any> | null;
    const mergedHidden: Record<string, boolean> = { ...defaults.hidden };
    if (hiddenObj) {
      Object.keys(hiddenObj).forEach((k) => {
        mergedHidden[k] = Boolean((hiddenObj as any)[k]);
      });
    }
    return { layouts: mergedLayouts, hidden: mergedHidden } as LayoutState<TLayout>;
  }, [defaults.hidden, defaults.layouts, query.data]);

  useEffect(() => {
    if (query.isLoading) return;
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    if (mergedFromServer) {
      setState(mergedFromServer);
      lastSavedJsonRef.current = JSON.stringify(mergedFromServer);
    } else {
      lastSavedJsonRef.current = JSON.stringify(defaults);
    }
  }, [defaults, mergedFromServer, query.isLoading]);

  const mutation = useMutation({
    mutationFn: async (next: LayoutState<TLayout>) => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return;
      const { error } = await supabase.from("user_dashboard_layouts").upsert(
        {
          user_id: user.id,
          dashboard_key: dashboardKey,
          layouts: next.layouts as any,
          hidden: next.hidden as any,
        },
        { onConflict: "user_id,dashboard_key" },
      );
      if (error) throw error;
    },
  });

  useEffect(() => {
    if (!hydratedRef.current) return;
    const json = JSON.stringify(state);
    if (json === lastSavedJsonRef.current) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      mutation.mutate(state);
      lastSavedJsonRef.current = json;
    }, saveDebounceMs);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [mutation, saveDebounceMs, state]);

  const api = useMemo(() => {
    return {
      state,
      isLoading: query.isLoading && !hydratedRef.current,
      isSaving: mutation.isPending,
      setLayouts: (layouts: TLayout) => setState((prev) => ({ ...prev, layouts })),
      setHidden: (hidden: Record<string, boolean>) => setState((prev) => ({ ...prev, hidden })),
      toggleHidden: (id: string) =>
        setState((prev) => ({ ...prev, hidden: { ...prev.hidden, [id]: !prev.hidden[id] } })),
      reset: () => {
        setState(defaults);
        lastSavedJsonRef.current = "";
      },
    };
  }, [defaults, mutation.isPending, query.isLoading, state]);

  return api;
}
