import { supabase } from "@/integrations/supabase/client";

export type StatusDocumento = "pendente" | "aprovado" | "recusado";

export interface ResumoDocumentacaoObrigatoria {
  total: number;
  aprovados: number;
  pendentes: number;
  idsObrigatorios: string[];
  nomesPendentes: string[];
}

export const calcularResumoDocumentacaoObrigatoria = async (
  criancaId: string,
): Promise<ResumoDocumentacaoObrigatoria> => {
  const { data: tiposObrigatoriosData, error: tiposObrigatoriosError } = await supabase
    .from("documentos_tipos")
    .select("id,nome")
    .eq("obrigatorio", true)
    .eq("ativo", true);

  if (tiposObrigatoriosError) throw tiposObrigatoriosError;

  const { data: prioridadesData, error: prioridadesError } = await supabase
    .from("crianca_prioridades")
    .select(
      "status,documento_comprovante_url,prioridade:tipos_prioridade(exige_documento,ativo,documento_tipo_id)",
    )
    .eq("crianca_id", criancaId);

  if (prioridadesError) throw prioridadesError;

  const idsObrigatoriosSet = new Set<string>((tiposObrigatoriosData || []).map((t: any) => t.id));

  (prioridadesData || []).forEach((p: any) => {
    const prio = p?.prioridade;
    const tipoId = prio?.documento_tipo_id as string | null | undefined;
    const exige = !!prio?.exige_documento;
    const ativo = !!prio?.ativo;
    if (exige && ativo && tipoId) {
      idsObrigatoriosSet.add(tipoId);
    }
  });

  const idsObrigatorios = [...idsObrigatoriosSet];
  if (idsObrigatorios.length === 0) {
    return { total: 0, aprovados: 0, pendentes: 0, idsObrigatorios: [], nomesPendentes: [] };
  }

  const { data: documentosData, error: documentosError } = await supabase
    .from("documentos_crianca")
    .select("tipo_documento_id,status")
    .eq("crianca_id", criancaId)
    .in("tipo_documento_id", idsObrigatorios);

  if (documentosError) throw documentosError;

  const aprovadosViaDocumento = new Set<string>(
    (documentosData || [])
      .filter((d: any) => d.status === "aprovado")
      .map((d: any) => d.tipo_documento_id),
  );

  const aprovadosViaPrioridade = new Set<string>(
    (prioridadesData || [])
      .filter((p: any) => p.status === "aprovado" && !!p.documento_comprovante_url)
      .map((p: any) => p?.prioridade?.documento_tipo_id)
      .filter(Boolean),
  );

  let aprovados = 0;
  const idsPendentes: string[] = [];

  idsObrigatorios.forEach((tipoId) => {
    const ok = aprovadosViaDocumento.has(tipoId) || aprovadosViaPrioridade.has(tipoId);
    if (ok) aprovados += 1;
    else idsPendentes.push(tipoId);
  });

  let nomesPendentes: string[] = [];
  if (idsPendentes.length > 0) {
    const { data: nomesData } = await supabase
      .from("documentos_tipos")
      .select("id,nome")
      .in("id", idsPendentes);
    nomesPendentes = (nomesData || []).map((d: any) => d.nome).filter(Boolean);
  }

  return {
    total: idsObrigatorios.length,
    aprovados,
    pendentes: idsObrigatorios.length - aprovados,
    idsObrigatorios,
    nomesPendentes,
  };
};

export const exigirDocumentacaoObrigatoriaCompleta = async (
  criancaId: string,
  mensagemBase: string,
) => {
  const resumo = await calcularResumoDocumentacaoObrigatoria(criancaId);
  if (resumo.pendentes <= 0) return;

  const lista = resumo.nomesPendentes.length > 0 ? ` (${resumo.nomesPendentes.join(", ")})` : "";
  throw new Error(`${mensagemBase} Existem ${resumo.pendentes} documento(s) obrigatório(s) pendente(s) de aprovação.${lista}`);
};
