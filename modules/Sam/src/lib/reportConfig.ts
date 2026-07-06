import { supabase } from "@sam/integrations/supabase/client";

export interface ReportHeaderFooter {
  headerLine1: string;
  headerLine2: string;
  headerLine3: string;
  footerText: string;
  brasaoBase64: string;
}

async function imageUrlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Falha ao converter imagem do cabeçalho."));
    reader.readAsDataURL(blob);
  });
}

export async function getPrincipalReportConfig(): Promise<ReportHeaderFooter> {
  const { data } = await supabase
    .from("configuracoes_sistema")
    .select("brasao_url, nome_municipio, nome_secretaria, email_contato, telefone_contato, sistema_nome")
    .single();

  const contato = [data?.email_contato, data?.telefone_contato].filter(Boolean).join(" | ");

  let brasaoBase64 = "";
  if (data?.brasao_url) {
    try {
      brasaoBase64 = await imageUrlToDataUrl(data.brasao_url);
    } catch {
      brasaoBase64 = "";
    }
  }

  return {
    headerLine1: data?.nome_municipio || "",
    headerLine2: data?.nome_secretaria || "",
    headerLine3: contato,
    footerText: data?.sistema_nome || "Sistema Principal",
    brasaoBase64,
  };
}
