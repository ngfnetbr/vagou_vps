import { GenderMale, GenderFemale } from "react-bootstrap-icons";

export default function SexoIcon({ sexo }: { sexo?: string | null }) {
  if (sexo === "Masculino") {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900">
        <GenderMale size={16} />
      </span>
    );
  }

  if (sexo === "Feminino") {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-pink-100 text-pink-700 ring-1 ring-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:ring-pink-900">
        <GenderFemale size={16} />
      </span>
    );
  }

  return <span className="text-muted-foreground">-</span>;
}
