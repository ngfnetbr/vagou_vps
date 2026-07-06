// @ts-nocheck
import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { Button } from "@ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ui/table"
import { Badge } from "@ui/badge"
import { Plus, User, Shield, Users, CheckCircle2, XCircle } from "lucide-react"
import { Skeleton } from "@ui/skeleton"
import { getUsers } from "@sam/lib/actions/usuarios"
import { UserActions } from "@sam/components/users/user-actions"
import { VagouListShell } from "@root/components/common/VagouListShell"

interface UsuariosPageProps {
  embedded?: boolean
}

export default function UsuariosPage({ embedded }: UsuariosPageProps = {}) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    getUsers().then(data => {
      setUsers(data || [])
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return users
    return users.filter((u: any) =>
      `${u.full_name || u.nome || ""} ${u.email || ""}`.toLowerCase().includes(s)
    )
  }, [users, search])

  const stats = useMemo(() => {
    const total = users.length
    const ativos = users.filter((u: any) => u.status === "active").length
    return { total, ativos, inativos: total - ativos }
  }, [users])

  const table = (
    <div className="rounded-md border bg-card text-card-foreground overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[300px]">Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Perfil</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-[200px]" /></TableCell>
                <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                <TableCell><Skeleton className="h-5 w-[60px]" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
              </TableRow>
            ))
          ) : filtered.length > 0 ? (
            filtered.map((user: any) => (
              <TableRow key={user.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{user.full_name || user.nome}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1 bg-background">
                    <Shield className="h-3 w-3" />
                    {user.role === 'admin' ? 'Administrador' : 'Profissional'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.status === 'active' ? 'success' : 'muted'}>
                    {user.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <UserActions user={user} onUpdate={() => getUsers().then(setUsers)} />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                Nenhum usuário encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )

  if (embedded) return <div className="space-y-6">{table}</div>

  return (
    <VagouListShell
      title="Gestão de Usuários"
      description="Gerencie os profissionais e administradores do sistema."
      actions={
        <Button asChild className="gap-2">
          <Link to="/modulo/sam/usuarios/novo"><Plus className="h-4 w-4" /> Novo Usuário</Link>
        </Button>
      }
      stats={[
        { title: "Total de usuários", value: stats.total, subtitle: "cadastrados", icon: Users, accent: "primary" },
        { title: "Ativos", value: stats.ativos, subtitle: "com acesso", icon: CheckCircle2, accent: "success" },
        { title: "Inativos", value: stats.inativos, subtitle: "sem acesso", icon: XCircle, accent: "muted" },
      ]}
      search={{
        value: search,
        onChange: setSearch,
        placeholder: "Buscar por nome ou email...",
      }}
      onClear={() => setSearch("")}
      showClear={!!search}
    >
      {table}
    </VagouListShell>
  )
}
