// @ts-nocheck
import { useSearchParams, useNavigate } from "react-router-dom"
import { Input } from "@ui/input"
import { Button } from "@ui/button"
import { Search, Filter, X } from "lucide-react"
import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select"

interface StudentFiltersProps { schoolNames: string[] }

export function StudentFilters({ schoolNames }: StudentFiltersProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [school, setSchool] = useState(searchParams.get("school") || "all")
  const [className, setClassName] = useState(searchParams.get("className") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "all")

  function handleSearch() {
    const params = new URLSearchParams(searchParams)
    if (search) params.set("search", search); else params.delete("search")
    if (school && school !== "all") params.set("school", school); else params.delete("school")
    if (className) params.set("className", className); else params.delete("className")
    if (status && status !== "all") params.set("status", status); else params.delete("status")
    navigate(`/modulo/sam/alunos?${params.toString()}`)
  }

  function clearFilters() {
    setSearch(""); setSchool("all"); setClassName(""); setStatus("all")
    navigate("/modulo/sam/alunos")
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-md border shadow-sm">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input type="search" placeholder="Buscar por nome do aluno..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 px-2"><Filter className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Filtros:</span></div>
        <div className="w-[200px]">
          <Select value={school} onValueChange={setSchool}>
            <SelectTrigger><SelectValue placeholder="Todas as Escolas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Escolas</SelectItem>
              {schoolNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[120px]"><Input placeholder="Turma" value={className} onChange={(e) => setClassName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /></div>
        <div className="w-[180px]">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Todos os Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="active">Em Acompanhamento</SelectItem><SelectItem value="waiting">Aguardando</SelectItem><SelectItem value="finished">Finalizado</SelectItem></SelectContent>
          </Select>
        </div>
        <Button variant="secondary" onClick={handleSearch}>Filtrar</Button>
        {(search || (school && school !== "all") || className || (status && status !== "all")) && (
          <Button variant="ghost" size="icon" onClick={clearFilters}><X className="h-4 w-4" /></Button>
        )}
      </div>
    </div>
  )
}

