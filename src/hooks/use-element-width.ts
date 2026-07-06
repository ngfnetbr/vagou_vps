import { useCallback, useEffect, useRef, useState } from "react";

export function useElementWidth<T extends HTMLElement>() {
  const observerRef = useRef<ResizeObserver | null>(null);
  const [width, setWidth] = useState(0);

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;

    if (!node) return;
    const update = () => {
      const next = Math.round(node.getBoundingClientRect().width);
      setWidth(next > 0 ? next : 0);
    };
    update();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => update());
      ro.observe(node);
      observerRef.current = ro;
    } else {
      window.addEventListener("resize", update);
    }
  }, []);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  return { ref, width };
}

