// @ts-nocheck
import { useEffect, useState } from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import { ArrowLeft, Calendar, FileText, User } from "lucide-react"
import { supabase } from "@sam/integrations/supabase/client"
import { useAuth } from "@root/contexts/AuthContext"
import { Button } from "@ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card"
import { PageHeader } from "@sam/components/common/page-header"

type CriancaRow = {
  id: string
  nome: string | null
  data_nascimento: string | null
  sexo: string | null
  responsavel_nome: string | null
  responsavel_telefone: string | null
  cmei_atual?: { nome: string | null; tipo_unidade?: string | null } | null
  turma_atual?: { nome: string | null } | null
}

export default function EscolaAlunoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const location = useLocation()
  const modulePrefix = location.pathname.startsWith("/modulo/sam") ? "/modulo/sam" : ""
  const base = `${modulePrefix}/escola`

  const [loading, setLoading] = useState(true)
  const [row, setRow] = useState<CriancaRow | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      const cmeiId = profile?.cmei_id || null

      let q: any = supabase
        .from("criancas")
        .select(
          `
          id,
          nome,
          data_nascimento,
          sexo,
          responsavel_nome,
          responsavel_telefone,
          cmei_atual:cmeis!criancas_cmei_atual_id_fkey(nome, tipo_unidade),
          turma_atual:turmas!criancas_turma_atual_id_fkey(nome)
        `
        )
        .eq("id", id)

      if (cmeiId) q = q.eq("cmei_atual_id", cmeiId)

      const { data } = await q.maybeSingle()
      setRow((data || null) as any)
      setLoading(false)
    }
    load()
  }, [id, profile])

  if (loading) {
    return <div className="text-center py-10 text-muted-foreground">Carregando...</div>
  }

  if (!row) {
    return <div className="text-center py-10 text-muted-foreground">Aluno não encontrado.</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <PageHeader
        leading={(
          <Button variant="outline" size="icon" className="rounded-full" asChild>
            <Link to={`${base}/alunos`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        )}
        title={row.nome || "Aluno"}
        description={row.cmei_atual?.nome || "Escola"}
        actions={(
          <Button asChild className="gap-2">
            <Link to={`${base}/queixas/nova?alunoId=${encodeURIComponent(row.id)}`}>
              <FileText className="h-4 w-4" />
              Nova queixa
            </Link>
          </Button>
        )}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="bg-muted/40 border-b border-border">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Dados do aluno
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Nome:</span>
              <div className="font-medium">{row.nome || "-"}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Data de nascimento:</span>
              <div className="font-medium">
                {row.data_nascimento ? new Date(row.data_nascimento).toLocaleDateString("pt-BR") : "-"}
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Sexo:</span>
              <div className="font-medium">{row.sexo || "-"}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Turma:</span>
              <div className="font-medium">{row.turma_atual?.nome || "-"}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-muted/40 border-b border-border">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Responsável
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Nome:</span>
              <div className="font-medium">{row.responsavel_nome || "-"}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Telefone:</span>
              <div className="font-medium">{row.responsavel_telefone || "-"}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

