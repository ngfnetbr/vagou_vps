import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number = 300): { debouncedValue: T; isDebouncing: boolean } {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    if (value !== debouncedValue) {
      setIsDebouncing(true);
    }
    
    const timer = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return { debouncedValue, isDebouncing };
}
