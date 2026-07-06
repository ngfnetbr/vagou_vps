import { useDynamicTheme } from "@/hooks/use-dynamic-theme";

interface DynamicThemeProviderProps {
  children: React.ReactNode;
}

export const DynamicThemeProvider = ({ children }: DynamicThemeProviderProps) => {
  // Aplica o tema dinâmico globalmente
  useDynamicTheme();
  
  return <>{children}</>;
};
