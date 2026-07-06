import { useCallback, useEffect, useMemo, useState } from "react";

type DashboardLayoutState<TLayout> = {
  layouts: TLayout;
  hidden: Record<string, boolean>;
};

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function useDashboardLayout<TLayout extends Record<string, unknown>>(
  storageKey: string,
  defaults: DashboardLayoutState<TLayout>,
) {
  const [state, setState] = useState<DashboardLayoutState<TLayout>>(() => {
    if (typeof window === "undefined") return defaults;
    const parsed = safeParse<DashboardLayoutState<TLayout>>(localStorage.getItem(storageKey));
    if (!parsed) return defaults;
    return {
      layouts: (parsed.layouts ?? defaults.layouts) as TLayout,
      hidden: parsed.hidden ?? defaults.hidden,
    };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [storageKey, state]);

  const setLayouts = useCallback((layouts: TLayout) => {
    setState((prev) => ({ ...prev, layouts }));
  }, []);

  const setHidden = useCallback((hidden: Record<string, boolean>) => {
    setState((prev) => ({ ...prev, hidden }));
  }, []);

  const toggleHidden = useCallback((id: string) => {
    setState((prev) => ({ ...prev, hidden: { ...prev.hidden, [id]: !prev.hidden[id] } }));
  }, []);

  const reset = useCallback(() => {
    setState(defaults);
  }, [defaults]);

  const isHidden = useCallback((id: string) => {
    return Boolean(state.hidden[id]);
  }, [state.hidden]);

  const visibleIds = useMemo(() => {
    return Object.entries(state.hidden)
      .filter(([, hidden]) => !hidden)
      .map(([id]) => id);
  }, [state.hidden]);

  return { state, setLayouts, setHidden, toggleHidden, reset, isHidden, visibleIds };
}

