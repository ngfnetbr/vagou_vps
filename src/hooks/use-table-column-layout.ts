import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type TableColumnLayoutDef = {
  key: string;
  label: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  hideable?: boolean;
  resizable?: boolean;
  defaultHidden?: boolean;
};

type StoredLayout = {
  widths?: Record<string, number>;
  hidden?: Record<string, boolean>;
};

function clampWidth(value: number, min?: number, max?: number) {
  if (typeof min === "number" && value < min) return min;
  if (typeof max === "number" && value > max) return max;
  return value;
}

function safeParseStoredLayout(raw: string | null): StoredLayout {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as StoredLayout;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function useTableColumnLayout(tableId: string, columns: TableColumnLayoutDef[]) {
  const storageKey = `table-columns:${tableId}`;
  const [stored, setStored] = useState<StoredLayout>(() => {
    if (typeof window === "undefined") return {};
    return safeParseStoredLayout(localStorage.getItem(storageKey));
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(storageKey, JSON.stringify(stored));
  }, [storageKey, stored]);

  const merged = useMemo(() => {
    const widths = stored.widths ?? {};
    const hidden = stored.hidden ?? {};
    return columns.map((c) => {
      const widthRaw = widths[c.key];
      const width =
        typeof widthRaw === "number" && Number.isFinite(widthRaw)
          ? clampWidth(widthRaw, c.minWidth, c.maxWidth)
          : c.defaultWidth;
      const isHidden = Object.prototype.hasOwnProperty.call(hidden, c.key)
        ? !!hidden[c.key]
        : !!c.defaultHidden;
      return { ...c, width, hidden: c.hideable === false ? false : isHidden };
    });
  }, [columns, stored.hidden, stored.widths]);

  const visible = useMemo(() => merged.filter((c) => !c.hidden), [merged]);

  const setColumnWidth = useCallback((key: string, width: number) => {
    setStored((prev) => ({
      ...prev,
      widths: { ...(prev.widths ?? {}), [key]: width },
    }));
  }, []);

  const setColumnHidden = useCallback((key: string, hidden: boolean) => {
    setStored((prev) => ({
      ...prev,
      hidden: { ...(prev.hidden ?? {}), [key]: hidden },
    }));
  }, []);

  const resetLayout = useCallback(() => {
    setStored({});
  }, []);

  return {
    columns: merged,
    visibleColumns: visible,
    setColumnWidth,
    setColumnHidden,
    resetLayout,
  };
}

type ResizeState = {
  key: string;
  startX: number;
  startWidth: number;
};

export function useColumnResizer(params: {
  getWidth: (key: string) => number | undefined;
  getMinWidth?: (key: string) => number | undefined;
  getMaxWidth?: (key: string) => number | undefined;
  setWidth: (key: string, width: number) => void;
}) {
  const stateRef = useRef<ResizeState | null>(null);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const state = stateRef.current;
      if (!state) return;
      const delta = e.clientX - state.startX;
      const nextRaw = state.startWidth + delta;
      const min = params.getMinWidth?.(state.key);
      const max = params.getMaxWidth?.(state.key);
      const next = clampWidth(nextRaw, min, max);
      params.setWidth(state.key, next);
    },
    [params],
  );

  const onPointerUp = useCallback(() => {
    stateRef.current = null;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  const startResize = useCallback(
    (e: React.PointerEvent, key: string) => {
      if (e.pointerType === "mouse" && typeof (e as any).button === "number" && (e as any).button !== 0) return;
      e.preventDefault();
      const current = params.getWidth(key) ?? 120;
      stateRef.current = { key, startX: e.clientX, startWidth: current };
    },
    [params],
  );

  return { startResize };
}

