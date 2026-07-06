import { supabase } from "@sondagem/integrations/supabase/client";
import { chunkArray } from "@sondagem/lib/queryUtils";
import { alunos as mockAlunos, cmeis as mockCmeis, turmas as mockTurmas } from "@sondagem/data/mockData";

export interface PrincipalCmei {
  id: string;
  nome: string;
}

export interface PrincipalTurma {
  id: string;
  nome: string;
  cmei_id: string;
  cmei_nome: string;
}

interface PrincipalTurmaRow {
  id: string;
  nome: string | null;
  cmei_id: string | null;
  cmeis?: {
    nome?: string | null;
    tipo_unidade?: string | null;
  } | null;
}

export interface PrincipalCrianca {
  id: string;
  nome: string;
  data_nascimento: string | null;
  cmei_id: string;
  cmei_nome: string;
  turma_id: string;
  turma_nome: string;
  sexo: string | null;
  responsavel: string | null;
  responsavel_cpf: string | null;
  telefone: string | null;
  fonte: "principal";
}

interface PrincipalCriancaRow {
  id: string;
  nome: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  responsavel_nome: string | null;
  responsavel_cpf: string | null;
  responsavel_telefone: string | null;
  cmei_atual_id: string | null;
  turma_atual_id: string | null;
  cmei_atual?: {
    nome?: string | null;
    tipo_unidade?: string | null;
  } | null;
  turma_atual?: {
    nome?: string | null;
  } | null;
}

const mockCmeisData: PrincipalCmei[] = mockCmeis.map((item) => ({
  id: item.id,
  nome: item.nome,
}));

const mockTurmasData: PrincipalTurma[] = mockTurmas.map((item) => ({
  id: item.id,
  nome: item.nome,
  cmei_id: item.cmeiId,
  cmei_nome: mockCmeis.find((cmei) => cmei.id === item.cmeiId)?.nome || "",
}));

const mockCriancasData: PrincipalCrianca[] = mockAlunos.map((item, index) => ({
  id: item.id,
  nome: item.nome,
  data_nascimento: item.dataNascimento,
  cmei_id: item.cmei,
  cmei_nome: mockCmeis.find((cmei) => cmei.id === item.cmei)?.nome || "",
  turma_id: item.turma,
  turma_nome: mockTurmas.find((turma) => turma.id === item.turma)?.nome || "",
  sexo: index % 2 === 0 ? "Masculino" : "Feminino",
  responsavel: `Responsavel ${index + 1}`,
  responsavel_cpf: `0000000000${index}`,
  telefone: `(43) 9999${String(index).padStart(4, "0")}`,
  fonte: "principal",
}));

export async function fetchPrincipalCmeis() {
  const { data, error } = await supabase
    .from("cmeis")
    .select("id, nome")
    .eq("ativo", true)
    .eq("tipo_unidade", "escola")
    .order("nome");

  if (error) throw error;
  const rows = (data || []) as PrincipalCmei[];
  return rows.length > 0 ? rows : mockCmeisData;
}

export async function fetchPrincipalTurmas(cmeiId?: string) {
  let query = supabase
    .from("turmas")
    .select("id, nome, cmei_id, cmeis(nome, tipo_unidade)")
    .eq("ativo", true)
    .order("nome");

  if (cmeiId) {
    query = query.eq("cmei_id", cmeiId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data || []) as PrincipalTurmaRow[])
    .filter((item) => (item.cmeis?.tipo_unidade || "cmei_creche") === "escola")
    .map((item) => ({
      id: item.id,
      nome: item.nome || "",
      cmei_id: item.cmei_id || "",
      cmei_nome: item.cmeis?.nome || "",
    })) as PrincipalTurma[];

  if (rows.length > 0) {
    return rows;
  }

  return mockTurmasData.filter((item) => !cmeiId || item.cmei_id === cmeiId);
}

export async function fetchPrincipalCriancas(params?: {
  cmeiId?: string;
  turmaId?: string;
  ids?: string[];
}) {
  const uniqueIds = params?.ids ? [...new Set(params.ids)] : undefined;
  if (uniqueIds && uniqueIds.length > 500) {
    const chunkedResults = await Promise.all(
      chunkArray(uniqueIds, 500).map((idsChunk) =>
        fetchPrincipalCriancas({
          ...params,
          ids: idsChunk,
        }),
      ),
    );

    return chunkedResults.flat();
  }

  let query = supabase
    .from("criancas")
    .select(`
      id,
      nome,
      data_nascimento,
      sexo,
      responsavel_nome,
      responsavel_cpf,
      responsavel_telefone,
      cmei_atual_id,
      turma_atual_id,
      cmei_atual:cmeis!criancas_cmei_atual_id_fkey(id, nome, tipo_unidade),
      turma_atual:turmas!criancas_turma_atual_id_fkey(id, nome)
    `)
    .order("nome");

  if (uniqueIds?.length) {
    query = query.in("id", uniqueIds);
  }

  if (params?.cmeiId) {
    query = query.eq("cmei_atual_id", params.cmeiId);
  }

  if (params?.turmaId) {
    query = query.eq("turma_atual_id", params.turmaId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data || []) as PrincipalCriancaRow[])
    .filter((item) => (item.cmei_atual?.tipo_unidade || "cmei_creche") === "escola")
    .map((item) => ({
      id: item.id,
      nome: item.nome || "",
      data_nascimento: item.data_nascimento || null,
      cmei_id: item.cmei_atual_id || "",
      cmei_nome: item.cmei_atual?.nome || "",
      turma_id: item.turma_atual_id || "",
      turma_nome: item.turma_atual?.nome || "",
      sexo: item.sexo || null,
      responsavel: item.responsavel_nome || null,
      responsavel_cpf: item.responsavel_cpf || null,
      telefone: item.responsavel_telefone || null,
      fonte: "principal" as const,
    })) as PrincipalCrianca[];

  if (rows.length > 0) {
    return rows;
  }

  return mockCriancasData
    .filter((item) => !params?.ids?.length || params.ids.includes(item.id))
    .filter((item) => !params?.cmeiId || item.cmei_id === params.cmeiId)
    .filter((item) => !params?.turmaId || item.turma_id === params.turmaId);
}
