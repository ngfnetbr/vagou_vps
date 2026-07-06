import { useState, useEffect } from "react";

type FontSize = "default" | "medium" | "large";

interface AccessibilitySettings {
  darkMode: boolean;
  fontSize: FontSize;
}

const STORAGE_KEY = "accessibility-settings";

const defaultSettings: AccessibilitySettings = {
  darkMode: false,
  fontSize: "default",
};

export function useAccessibility() {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    if (typeof window === "undefined") return defaultSettings;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    
    // Aplicar modo escuro
    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }

    // Aplicar tamanho da fonte
    document.documentElement.classList.remove("font-size-default", "font-size-medium", "font-size-large");
    document.documentElement.classList.add(`font-size-${settings.fontSize}`);
  }, [settings]);

  const toggleDarkMode = () => {
    setSettings((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  };

  const setFontSize = (fontSize: FontSize) => {
    setSettings((prev) => ({ ...prev, fontSize }));
  };

  return {
    settings,
    toggleDarkMode,
    setFontSize,
  };
}
