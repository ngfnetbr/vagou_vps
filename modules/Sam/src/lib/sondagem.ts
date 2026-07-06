// @ts-nocheck
import { supabase } from "@sam/integrations/supabase/client"

export type SondagemHistoricoItem = {
  id: string
  periodo: string
  status: string
  observacoes: string | null
  created_at: string | null
  respostas: {
    nivel_id: string
    codigo: string
    descricao: string
    tipo: string
    ordem: number
  }[]
}

export function isSondagemAplicavel(birthDate?: string | null) {
  if (!birthDate) return false
  const nascimento = new Date(birthDate)
  if (Number.isNaN(nascimento.getTime())) return false
  const hoje = new Date()
  const meses = Math.floor((hoje.getTime() - nascimento.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  return meses >= 36 && meses <= 107
}

export async function fetchHistoricoSondagens(criancaId: string) {
  const { data, error } = await supabase
    .from("sondagens")
    .select(`
      id, periodo, status, observacoes, created_at,
      respostas_sondagem(
        nivel_id,
        niveis_aprendizagem(id, codigo, descricao, tipo, ordem)
      )
    `)
    .eq("crianca_id", criancaId)
    .eq("status", "finalizado")
    .order("created_at", { ascending: true })

  if (error) throw error

  return (data || []).map((s: any) => ({
    id: s.id,
    periodo: s.periodo,
    status: s.status,
    observacoes: s.observacoes,
    created_at: s.created_at,
    respostas: (s.respostas_sondagem || []).map((r: any) => ({
      nivel_id: r.nivel_id,
      codigo: r.niveis_aprendizagem?.codigo || "",
      descricao: r.niveis_aprendizagem?.descricao || "",
      tipo: r.niveis_aprendizagem?.tipo || "",
      ordem: r.niveis_aprendizagem?.ordem || 0,
    })),
  })) as SondagemHistoricoItem[]
}

