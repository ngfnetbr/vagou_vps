// @ts-nocheck
import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { School, Plus, MapPin, CheckCircle2, XCircle, Search } from "lucide-react"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@ui/table"
import { Badge } from "@ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/card"
import { Skeleton } from "@ui/skeleton"
import { supabase } from "@sam/integrations/supabase/client"
import { useCanAccess } from "@root/components/admin/PermissionGate"
import { StatCard } from "@sam/components/dashboard/stat-card"
import { ListEmptyState } from "@root/components/common/ListEmptyState"
import { ListPagination } from "@root/components/common/ListPagination"

const PAGE_SIZE = 10

export default function EscolasPage() {
  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const canView = useCanAccess(["modulos.sam.acessar", "sam.escolas.visualizar"])
  const canCreate = useCanAccess(["modulos.sam.acessar", "sam.escolas.criar"])
  const canEdit = useCanAccess(["modulos.sam.acessar", "sam.escolas.editar"])

  useEffect(() => {
    supabase
      .from("schools_unified" as any)
      .select("*")
      .order("name")
      .then(({ data }) => {
        setSchools(data || [])
        setLoading(false)
      })
  }, [])

  const stats = useMemo(() => {
    const ativas = schools.filter((s: any) => s.active).length
    return { total: schools.length, ativas, inativas: schools.length - ativas }
  }, [schools])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return schools
    return schools.filter((s: any) =>
      `${s.name || ""} ${s.address || ""}`.toLowerCase().includes(term)
    )
  }, [schools, search])

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  useEffect(() => {
    setPage(1)
  }, [search])


  if (loading) {
    return (
      <div className="space-y-6 pb-10">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <>
      {!canView ? (
        <div className="rounded-2xl border p-6 bg-muted/30 text-sm text-muted-foreground">
          Você não tem permissão para visualizar escolas.
        </div>
      ) : (
      <div className="space-y-6 pb-10 animate-fade-in">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Total de escolas" value={stats.total} subtitle="Unidades cadastradas" icon={School} accentColor="border-l-primary" iconClassName="text-primary" />
          <StatCard title="Ativas" value={stats.ativas} subtitle="Em funcionamento" icon={CheckCircle2} accentColor="border-l-success" iconClassName="text-success" />
          <StatCard title="Inativas" value={stats.inativas} subtitle="Desativadas" icon={XCircle} accentColor="border-l-muted-foreground" iconClassName="text-muted-foreground" />
        </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Escolas</h2>
          <p className="text-muted-foreground">Gerencie as unidades escolares cadastradas no sistema.</p>
        </div>
        <Link to="/modulo/sam/escolas/novo">
          <Button className="bg-primary hover:bg-primary/90" disabled={!canCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Escola
          </Button>
        </Link>
      </div>

      <Card className="border-none ring-1 ring-border shadow-sm">
        <CardHeader className="pb-4 border-b bg-muted/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <School className="h-5 w-5" />
                <CardTitle className="text-lg font-semibold">Unidades Escolares</CardTitle>
              </div>
              <CardDescription>Lista de todas as escolas e centros de ensino parceiros.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou endereço..."
                className="pl-9 bg-background"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[300px]">Nome da Escola</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length > 0 ? (
                paged.map((school: any, idx: number) => (
                  <TableRow
                    key={school.id}
                    className="hover:bg-muted/50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-md">
                          <School className="h-4 w-4" />
                        </div>
                        {school.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="text-sm">{school.address || "Endereço não informado"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={school.active ? "default" : "secondary"}>
                        {school.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/escolas/${school.id}/editar`}>
                        <Button variant="ghost" size="sm" className="h-8 text-primary hover:text-primary/80 hover:bg-primary/5" disabled={!canEdit}>
                          Editar
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="p-0">
                    <ListEmptyState
                      icon={School}
                      title={search ? "Nenhuma escola encontrada" : "Nenhuma escola cadastrada"}
                      description={search ? "Ajuste a busca para ver mais resultados." : "Cadastre a primeira unidade escolar."}
                      className="border-0 rounded-none bg-transparent"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filtered.length > 0 && (
        <ListPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
          itemLabel="escolas"
        />
      )}
    </div>
      )}
    </>
  )
}
