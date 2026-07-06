import { Card, CardContent } from "@ui/card"
import { cn } from "@sam/lib/utils"
import { LucideIcon } from "lucide-react"
import { AnimatedCounter } from "@root/components/common/AnimatedCounter"

interface StatCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: LucideIcon
  accentColor?: string
  iconClassName?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentColor = "border-l-primary",
  iconClassName = "text-primary",
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "rounded-lg border border-l-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md animate-fade-up",
        accentColor
      )}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">{title}</p>
            <h3 className="text-3xl font-bold text-foreground">
              {typeof value === "number" ? <AnimatedCounter value={value} /> : value}
            </h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <Icon className={cn("h-5 w-5", iconClassName)} />
        </div>
      </CardContent>
    </Card>
  )
}
