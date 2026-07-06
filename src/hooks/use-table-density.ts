import { useState, useEffect } from "react";

type TableDensity = "default" | "compact";

const STORAGE_KEY = "table-density";

export function useTableDensity() {
  const [density, setDensity] = useState<TableDensity>(() => {
    if (typeof window === "undefined") return "default";
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as TableDensity) || "default";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, density);
    
    // Apply density class to html element
    document.documentElement.classList.remove("table-density-default", "table-density-compact");
    document.documentElement.classList.add(`table-density-${density}`);
  }, [density]);

  const toggleDensity = () => {
    setDensity((prev) => (prev === "default" ? "compact" : "default"));
  };

  const isCompact = density === "compact";

  return {
    density,
    setDensity,
    toggleDensity,
    isCompact,
  };
}
