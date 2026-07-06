import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CountdownTimerProps {
  deadline: Date;
}

export function CountdownTimer({ deadline }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(deadline));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(deadline));
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  function calculateTimeLeft(deadline: Date) {
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();

    if (diffMs <= 0) {
      return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return { expired: false, days, hours, minutes, seconds };
  }

  if (timeLeft.expired) {
    return (
      <div className="space-y-0.5">
        <Badge variant="destructive" className="animate-pulse w-full justify-center whitespace-nowrap px-2">
          <AlertCircle className="mr-1 h-3 w-3" />
          Prazo Expirado
        </Badge>
        <div className="text-[10px] text-muted-foreground whitespace-nowrap text-center">
          {format(deadline, "dd/MM/yyyy", { locale: ptBR })}
        </div>
      </div>
    );
  }

  if (timeLeft.days === 0) {
    return (
      <div className="space-y-0.5">
        <Badge variant="warning" className="font-mono w-full justify-center whitespace-nowrap px-2">
          <Clock className="mr-1 h-3 w-3 animate-pulse" />
          {String(timeLeft.hours).padStart(2, "0")}:
          {String(timeLeft.minutes).padStart(2, "0")}:
          {String(timeLeft.seconds).padStart(2, "0")}
        </Badge>
        <div className="text-[10px] text-muted-foreground whitespace-nowrap text-center">
          Final: {format(deadline, "dd/MM/yy", { locale: ptBR })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <Badge variant="success" className="w-full justify-center whitespace-nowrap px-2">
        <Calendar className="mr-1 h-3 w-3" />
        {timeLeft.days}d {String(timeLeft.hours).padStart(2, "0")}h
      </Badge>
      <div className="text-[10px] text-muted-foreground whitespace-nowrap text-center">
        Final: {format(deadline, "dd/MM/yy", { locale: ptBR })}
      </div>
    </div>
  );
}
