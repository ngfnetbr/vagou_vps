import { supabase } from "@/integrations/supabase/client";

export type ConsultaCpfResultado = {
  found: boolean;
  nome?: string;
  data_nascimento?: string;
};

/**
 * Consulta um CPF na API já configurada (edge function `consultar-cpf`) e
 * retorna nome completo e data de nascimento quando disponíveis.
 * Caso a API não retorne dados, os campos podem ser preenchidos manualmente.
 */
export async function consultarCpf(
  cpf: string,
  tipo: "crianca" | "responsavel" = "responsavel"
): Promise<ConsultaCpfResultado> {
  const cpfLimpo = (cpf || "").replace(/\D/g, "");
  if (cpfLimpo.length !== 11) return { found: false };

  try {
    const { data, error } = await supabase.functions.invoke("consultar-cpf", {
      body: { cpf: cpfLimpo, tipo },
    });
    if (error) return { found: false };

    const nome = typeof data?.nome === "string" ? data.nome : undefined;
    const data_nascimento =
      typeof data?.data_nascimento === "string" ? data.data_nascimento : undefined;

    return { found: Boolean(nome || data_nascimento), nome, data_nascimento };
  } catch {
    return { found: false };
  }
}
