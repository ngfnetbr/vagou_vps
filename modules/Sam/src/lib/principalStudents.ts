// @ts-nocheck
import { supabase } from "@sam/integrations/supabase/client";

export interface PrincipalStudent {
  id: string;
  nome: string;
  data_nascimento: string | null;
  nome_responsavel: string | null;
  responsavel_telefone: string | null;
  escola_nome: string | null;
  turma_nome: string | null;
  sam_school_id: string | null;
}

function normalize(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

async function getSamSchoolsMap() {
  const { data, error } = await supabase
    .from("schools")
    .select("id, name")
    .eq("active", true);

  if (error) throw error;
  return new Map<string, string>((data || []).map((item: any) => [normalize(item.name), item.id]));
}

export async function fetchPrincipalStudents(params?: {
  search?: string | null;
  schoolName?: string | null;
  className?: string | null;
  ids?: string[];
  limit?: number;
}) {
  let query = supabase
    .from("criancas")
    .select(`
      id,
      nome,
      data_nascimento,
      responsavel_nome,
      responsavel_telefone,
      cmei_atual:cmeis!criancas_cmei_atual_id_fkey(id, nome, tipo_unidade),
      turma_atual:turmas!criancas_turma_atual_id_fkey(id, nome)
    `)
    .order("nome");

  if (params?.ids?.length) {
    query = query.in("id", params.ids);
  }

  if (params?.search) {
    query = query.ilike("nome", `%${params.search}%`);
  }

  if (params?.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  const mapped = ((data || []) as any[])
    .filter((item) => (item.cmei_atual?.tipo_unidade || "cmei_creche") === "escola")
    .map((item) => ({
    id: item.id,
    nome: item.nome || "",
    data_nascimento: item.data_nascimento || null,
    nome_responsavel: item.responsavel_nome || null,
    responsavel_telefone: item.responsavel_telefone || null,
    escola_nome: item.cmei_atual?.nome || null,
    turma_nome: item.turma_atual?.nome || null,
    sam_school_id: null,
  })) as PrincipalStudent[];

  const schoolMap = await getSamSchoolsMap();
  const withSchool = mapped.map((student) => ({
    ...student,
    sam_school_id: schoolMap.get(normalize(student.escola_nome)) || null,
  }));

  return withSchool.filter((student) => {
    if (params?.schoolName && normalize(student.escola_nome) !== normalize(params.schoolName)) return false;
    if (params?.className && !normalize(student.turma_nome).includes(normalize(params.className))) return false;
    return true;
  });
}

export async function ensureSamStudentFromPrincipal(principalStudentId: string, options?: { schoolId?: string | null }) {
  const { data: existing, error: existingError } = await supabase
    .from("students")
    .select("id, full_name, birth_date, guardian_name, school_id, class_name, status")
    .eq("id", principalStudentId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  // Busca direta na tabela principal (sem filtrar por tipo de unidade: vale escola E cmei)
  const { data: crianca, error: criancaError } = await supabase
    .from("criancas")
    .select(`
      id,
      nome,
      data_nascimento,
      responsavel_nome,
      responsavel_telefone,
      cmei_atual:cmeis!criancas_cmei_atual_id_fkey(id, nome),
      turma_atual:turmas!criancas_turma_atual_id_fkey(id, nome)
    `)
    .eq("id", principalStudentId)
    .maybeSingle();

  if (criancaError) throw criancaError;
  if (!crianca) {
    throw new Error("Aluno não encontrado na tabela principal `criancas`.");
  }

  const principalStudent: PrincipalStudent = {
    id: (crianca as any).id,
    nome: (crianca as any).nome || "",
    data_nascimento: (crianca as any).data_nascimento || null,
    nome_responsavel: (crianca as any).responsavel_nome || null,
    responsavel_telefone: (crianca as any).responsavel_telefone || null,
    escola_nome: (crianca as any).cmei_atual?.nome || null,
    turma_nome: (crianca as any).turma_atual?.nome || null,
    sam_school_id: null,
  };

  const schoolMap = await getSamSchoolsMap();
  principalStudent.sam_school_id = schoolMap.get(normalize(principalStudent.escola_nome)) || null;

  const schoolId = options?.schoolId || principalStudent.sam_school_id || null;

  const { data: inserted, error: insertError } = await supabase
    .from("students")
    .upsert(
      {
        id: principalStudent.id,
        full_name: principalStudent.nome,
        birth_date: principalStudent.data_nascimento,
        guardian_name: principalStudent.nome_responsavel,
        guardian_phone: principalStudent.responsavel_telefone,
        school_id: schoolId,
        class_name: principalStudent.turma_nome,
        status: "active",
      },
      { onConflict: "id" }
    )
    .select("id, full_name, birth_date, guardian_name, school_id, class_name, status")
    .single();

  if (insertError) throw insertError;
  return inserted;
}
