import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { gerarComprovantePDF } from "@/utils/pdf-utils";
import { toast } from "sonner";

interface ImprimirComprovanteButtonProps {
  criancaId: string;
  tipo: "inscricao" | "convocacao" | "matricula";
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ImprimirComprovanteButton({
  criancaId,
  tipo,
  variant = "outline",
  size = "sm",
}: ImprimirComprovanteButtonProps) {
  const [gerando, setGerando] = useState(false);

  const handleGerarComprovante = async () => {
    setGerando(true);
    try {
      await gerarComprovantePDF(criancaId, tipo);
    } catch (error) {
      console.error("Erro ao gerar comprovante:", error);
      toast.error("Erro ao gerar comprovante");
    } finally {
      setGerando(false);
    }
  };

  const getTipoLabel = () => {
    switch (tipo) {
      case "inscricao":
        return "Inscrição";
      case "convocacao":
        return "Convocação";
      case "matricula":
        return "Matrícula";
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleGerarComprovante}
      disabled={gerando}
    >
      {gerando ? (
        <>
          <Spinner className="mr-2 h-4 w-4 animate-spin" />
          Gerando...
        </>
      ) : (
        <>
          <Printer className="mr-2 h-4 w-4" />
          Comprovante de {getTipoLabel()}
        </>
      )}
    </Button>
  );
}

