import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/utils/utils";
import { AnimatedCounter } from "@/components/common/AnimatedCounter";

type StatAccent = "primary" | "success" | "warning" | "info" | "destructive" | "muted";

const accentStyles: Record<StatAccent, { border: string; icon: string; iconBg: string; glow: string }> = {
  primary: { border: "border-l-primary", icon: "text-primary", iconBg: "bg-primary/10", glow: "from-primary/[0.07]" },
  success: { border: "border-l-success", icon: "text-success", iconBg: "bg-success/10", glow: "from-success/[0.07]" },
  warning: { border: "border-l-warning", icon: "text-warning", iconBg: "bg-warning/10", glow: "from-warning/[0.07]" },
  info: { border: "border-l-info", icon: "text-info", iconBg: "bg-info/10", glow: "from-info/[0.07]" },
  destructive: { border: "border-l-destructive", icon: "text-destructive", iconBg: "bg-destructive/10", glow: "from-destructive/[0.07]" },
  muted: { border: "border-l-muted-foreground", icon: "text-muted-foreground", iconBg: "bg-muted", glow: "from-muted/40" },
};

export type StatCardProps = {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: LucideIcon;
  accent?: StatAccent;
  /** When value is a number, animate it counting up */
  animate?: boolean;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Stagger index for entrance delay */
  index?: number;
  className?: string;
};

/**
 * Standardized stat/counter card used across all modules (VAGOU, SAM, Sondagem).
 * Animated count-up, accent colored left border, soft hover lift and fade-up entrance.
 */
export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "primary",
  animate = true,
  decimals = 0,
  prefix,
  suffix,
  index = 0,
  className,
}: StatCardProps) {
  const styles = accentStyles[accent];
  const isNumber = typeof value === "number";

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-l-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant animate-fade-up",
        styles.border,
        className
      )}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          styles.glow
        )}
      />
      <CardContent className="relative flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="text-3xl font-bold tracking-tight text-foreground">
            {isNumber && animate ? (
              <AnimatedCounter
                value={value as number}
                decimals={decimals}
                prefix={prefix}
                suffix={suffix}
              />
            ) : (
              <>
                {prefix}
                {value}
                {suffix}
              </>
            )}
          </div>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {Icon ? (
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110", styles.iconBg)}>
            <Icon className={cn("h-5 w-5", styles.icon)} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default StatCard;
