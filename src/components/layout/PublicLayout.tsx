import { ReactNode } from "react";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";
import { PublicMobileBottomNav } from "./PublicMobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { MaintenanceMode } from "@/components/common/MaintenanceMode";

interface PublicLayoutProps {
  children: ReactNode;
  showFooter?: boolean;
  bypassMaintenance?: boolean;
}

export const PublicLayout = ({ children, showFooter = true, bypassMaintenance = false }: PublicLayoutProps) => {
  const isMobile = useIsMobile();

  const content = (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      
      {showFooter && !isMobile && <PublicFooter />}
      
      {isMobile && <PublicMobileBottomNav />}
    </div>
  );

  // If bypass is enabled (e.g., for admin preview), skip maintenance check
  if (bypassMaintenance) {
    return content;
  }

  return <MaintenanceMode>{content}</MaintenanceMode>;
};

