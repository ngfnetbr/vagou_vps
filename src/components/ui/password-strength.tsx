import { useMemo } from "react";
import { cn } from "@/utils/utils";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "" };

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };

    if (password.length >= 6) score++;
    if (checks.length) score++;
    if (checks.lowercase && checks.uppercase) score++;
    if (checks.number) score++;
    if (checks.special) score++;

    if (score <= 1) return { score: 1, label: "Muito fraca", color: "bg-destructive" };
    if (score === 2) return { score: 2, label: "Fraca", color: "bg-orange-500" };
    if (score === 3) return { score: 3, label: "Média", color: "bg-yellow-500" };
    if (score === 4) return { score: 4, label: "Forte", color: "bg-green-500" };
    return { score: 5, label: "Muito forte", color: "bg-green-600" };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              level <= strength.score ? strength.color : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className={cn("text-xs", strength.score <= 2 ? "text-destructive" : "text-muted-foreground")}>
        Força da senha: <span className="font-medium">{strength.label}</span>
      </p>
    </div>
  );
}

