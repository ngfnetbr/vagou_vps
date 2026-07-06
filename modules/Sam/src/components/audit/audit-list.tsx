// @ts-nocheck
import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { Label } from "@ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select"
import { Download, Printer } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ui/table"
import { Badge } from "@ui/badge"
import { Clock, User, Server } from "lucide-react"
import { format } from "date-fns"

export interface AuditLog {
  id: string
  created_at: string
  user_id?: string
  user_name?: string
  action: string
  resource: string
  details: any
  ip_address?: string
}

interface AuditListProps { logs: AuditLog[] }

export function AuditList({ logs }: AuditListProps) {
  const [searchParams, setSearchParams] = useSearchParams()

  const [filters, setFilters] = useState({
    action: searchParams.get("action") || "all",
    resource: searchParams.get("resource") || "all",
    startDate: searchParams.get("startDate") || "",
    endDate: searchParams.get("endDate") || "",
  })

  const handleFilterChange = (key: string, value: string) => {
    const nf = { ...filters, [key]: value }
    setFilters(nf)
    const params = new URLSearchParams(searchParams)
    params.set("tab", "auditoria")
    if (nf.action && nf.action !== "all") params.set("action", nf.action); else params.delete("action")
    if (nf.resource && nf.resource !== "all") params.set("resource", nf.resource); else params.delete("resource")
    if (nf.startDate) params.set("startDate", nf.startDate); else params.delete("startDate")
    if (nf.endDate) params.set("endDate", nf.endDate); else params.delete("endDate")
    setSearchParams(params)
  }

  const handleExportCSV = () => {
    const headers = ["Data/Hora", "Usuário", "Ação", "Recurso", "Detalhes", "IP"]
    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleString(), log.user_name || "N/A", log.action,
      log.resource, JSON.stringify(log.details).replace(/"/g, '""'), log.ip_address || ""
    ])
    const csvContent = [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `auditoria_export_${format(new Date(), "yyyyMMdd")}.csv`
    link.click()
  }

  function getActionColor(action: string) {
    switch (action) {
      case "CREATE": return "bg-green-100 text-green-700"
      case "UPDATE": return "bg-blue-100 text-blue-700"
      case "DELETE": return "bg-red-100 text-red-700"
      case "LOGIN": return "bg-purple-100 text-purple-700"
      default: return "bg-slate-100 text-slate-700"
    }
  }

  function formatDetails(details: any) {
    if (!details || Object.keys(details).length === 0) return "-"
    return <pre className="text-xs bg-slate-50 p-2 rounded border max-w-[300px] overflow-auto max-h-[100px]">{JSON.stringify(details, null, 2)}</pre>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100 print:hidden">
        <div className="space-y-2 min-w-[150px]">
          <Label className="text-xs font-semibold uppercase text-slate-500">Ação</Label>
          <Select value={filters.action} onValueChange={(val) => handleFilterChange("action", val)}>
            <SelectTrigger className="bg-white border-slate-300"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="CREATE">Criação</SelectItem>
              <SelectItem value="UPDATE">Edição</SelectItem>
              <SelectItem value="DELETE">Exclusão</SelectItem>
              <SelectItem value="LOGIN">Acesso</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 min-w-[150px]">
          <Label className="text-xs font-semibold uppercase text-slate-500">Módulo</Label>
          <Select value={filters.resource} onValueChange={(val) => handleFilterChange("resource", val)}>
            <SelectTrigger className="bg-white border-slate-300"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="users">Usuários</SelectItem>
              <SelectItem value="students">Alunos</SelectItem>
              <SelectItem value="appointments">Atendimentos</SelectItem>
              <SelectItem value="settings">Configurações</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-slate-500">Data Inicial</Label>
          <Input type="date" className="bg-white border-slate-300" value={filters.startDate} onChange={(e) => handleFilterChange("startDate", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-slate-500">Data Final</Label>
          <Input type="date" className="bg-white border-slate-300" value={filters.endDate} onChange={(e) => handleFilterChange("endDate", e.target.value)} />
        </div>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
          <Button variant="outline" onClick={handleExportCSV}><Download className="mr-2 h-4 w-4" />CSV</Button>
        </div>
      </div>

      <div className="rounded-lg border-none ring-1 ring-slate-200 bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[180px]">Data/Hora</TableHead>
              <TableHead className="w-[200px]">Usuário</TableHead>
              <TableHead className="w-[120px]">Ação</TableHead>
              <TableHead className="w-[150px]">Recurso</TableHead>
              <TableHead>Detalhes</TableHead>
              <TableHead className="w-[120px]">IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>
            ) : logs.map((log) => (
              <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium text-slate-600"><div className="flex items-center gap-2"><Clock className="h-3 w-3 text-slate-400" />{format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}</div></TableCell>
                <TableCell><div className="flex items-center gap-2"><User className="h-3 w-3 text-slate-400" /><span className="font-medium">{log.user_name}</span></div></TableCell>
                <TableCell><Badge className={`${getActionColor(log.action)} border-none shadow-none`}>{log.action}</Badge></TableCell>
                <TableCell className="capitalize">{log.resource}</TableCell>
                <TableCell>{formatDetails(log.details)}</TableCell>
                <TableCell className="text-xs text-muted-foreground"><div className="flex items-center gap-1"><Server className="h-3 w-3" />{log.ip_address || "N/A"}</div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

