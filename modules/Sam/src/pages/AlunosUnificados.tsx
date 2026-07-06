// @ts-nocheck
import { useState, useEffect } from "react"
import { Users, SearchX, Database, Cloud } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ui/table"
import { Badge } from "@ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/card"
import { Input } from "@ui/input"
import { Skeleton } from "@ui/skeleton"
import { Avatar, AvatarFallback } from "@ui/avatar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@ui/breadcrumb"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/tooltip"
import { supabase } from "@sam/integrations/supabase/client"

type UnifiedStudent = {
  id: string | null
  nome: string | null
  data_nascimento: string | null
  cmei_atual_nome: string | null
  turma_atual_nome: string | null
  nome_responsavel: string | null
  responsavel_telefone: string | null
  source: string | null
}

export default function AlunosUnificadosPage() {
  const [students, setStudents] = useState<UnifiedStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('students_unified')
        .select('*')
        .order('nome')
      setStudents((data || []) as UnifiedStudent[])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = students.filter(s =>
    !search || (s.nome || '').toLowerCase().includes(search.toLowerCase())
  )

  const localCount = students.filter(s => s.source === 'local').length
  const cacheCount = students.filter(s => s.source === 'cache').length

  if (loading) return <div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>

  return (
    <>
      <div className="space-y-6 pb-10">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Alunos Unificados</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Visão Unificada de Alunos</h1>
          <p className="text-muted-foreground">Dados consolidados de cadastros locais e cache sincronizado.</p>
        </div>
      </div>

      <div className="flex gap-4">
        <Card className="flex-1">
          <CardContent className="p-4 flex items-center gap-3">
            <Database className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{localCount}</p>
              <p className="text-xs text-muted-foreground">Cadastros Locais</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-4 flex items-center gap-3">
            <Cloud className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{cacheCount}</p>
              <p className="text-xs text-muted-foreground">Cache Sincronizado</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold">{students.length}</p>
              <p className="text-xs text-muted-foreground">Total Unificado</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Input
        placeholder="Buscar aluno por nome..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-md"
      />

      <Card className="border-none ring-1 ring-border shadow-sm">
        <CardHeader className="pb-4 border-b bg-muted/50">
          <CardTitle className="text-lg">Alunos</CardTitle>
          <CardDescription>{filtered.length} registro(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Instituição</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Origem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? filtered.map(s => (
                <TableRow key={`${s.source}-${s.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {(s.nome || '').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium text-sm">{s.nome}</span>
                        {s.data_nascimento && (
                          <p className="text-xs text-muted-foreground">{new Date(s.data_nascimento).toLocaleDateString('pt-BR')}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{s.cmei_atual_nome || '-'}</TableCell>
                  <TableCell className="text-sm">{s.turma_atual_nome || '-'}</TableCell>
                  <TableCell className="text-sm">{s.nome_responsavel || '-'}</TableCell>
                  <TableCell className="text-sm">{s.responsavel_telefone || '-'}</TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant={s.source === 'local' ? 'default' : 'secondary'} className="text-xs">
                          {s.source === 'local' ? (
                            <><Database className="h-3 w-3 mr-1" />Local</>
                          ) : (
                            <><Cloud className="h-3 w-3 mr-1" />Cache</>
                          )}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {s.source === 'local' ? 'Cadastro local do sistema' : 'Dados sincronizados do sistema externo'}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <SearchX className="h-8 w-8 opacity-50" />
                      <p>Nenhum aluno encontrado.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </>
  )
}

