import { useEffect, useRef, useState } from "react";

type AnimatedCounterProps = {
  value: number;
  /** Animation duration in ms */
  duration?: number;
  /** Number of decimal places */
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Animated number that counts up from 0 (or the previous value) to `value`
 * using requestAnimationFrame. Respects prefers-reduced-motion.
 */
export function AnimatedCounter({
  value,
  duration = 900,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? value : 0));
  const fromRef = useRef(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }

    const from = fromRef.current;
    const start = performance.now();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const current = from + (value - from) * easeOut(progress);
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = value;
    };
  }, [value, duration]);

  const formatted = display.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export default AnimatedCounter;
