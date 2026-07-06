import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Search, Star, Clock, Users, GraduationCap, Calendar, ClipboardList,
  FileText, Settings, UserCog, Plus, ArrowRight, History
} from "lucide-react"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { Card, CardContent } from "@ui/card"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@ui/breadcrumb"
import { cn } from "@root/lib/utils"

type MenuItem = {
  id: string; title: string; description: string; icon: React.ElementType;
  href: string; category: "Pedagógico" | "Clínico" | "Administrativo"; roles: string[];
}

const menuItems: MenuItem[] = [
  { id: "gerenciar-alunos", title: "Gerenciar Alunos", description: "Visualizar e editar lista de alunos.", icon: Users, href: "/modulo/sam/cadastros/alunos", category: "Pedagógico", roles: ["admin", "professional", "school"] },
  { id: "cadastrar-aluno", title: "Cadastrar Aluno", description: "Incluir novo aluno no sistema.", icon: GraduationCap, href: "/modulo/sam/cadastros/alunos", category: "Pedagógico", roles: ["admin", "professional"] },
  { id: "novo-atendimento", title: "Novo Atendimento", description: "Registrar uma nova sessão ou evolução.", icon: ClipboardList, href: "/modulo/sam/atendimentos/novo", category: "Clínico", roles: ["professional"] },
  { id: "agendar-sessao", title: "Agendar Sessão", description: "Marcar novo horário na agenda.", icon: Calendar, href: "/modulo/sam/agenda/novo", category: "Clínico", roles: ["professional", "admin"] },
  { id: "agenda", title: "Minha Agenda", description: "Visualizar compromissos e horários.", icon: Clock, href: "/modulo/sam/agenda", category: "Clínico", roles: ["professional", "admin"] },
  { id: "cadastrar-profissionais", title: "Cadastrar Profissionais", description: "Incluir e gerenciar profissionais e acessos.", icon: UserCog, href: "/modulo/sam/usuarios", category: "Administrativo", roles: ["admin"] },
  { id: "especialidades", title: "Especialidades", description: "Configurar especialidades ativas.", icon: ClipboardList, href: "/modulo/sam/especialidades", category: "Administrativo", roles: ["admin"] },
  { id: "relatorios", title: "Relatórios", description: "Gerar relatórios de produtividade.", icon: FileText, href: "/modulo/sam/relatorios", category: "Administrativo", roles: ["admin", "manager"] },
  
  { id: "configuracoes", title: "Configurações", description: "Ajustar parâmetros do sistema.", icon: Settings, href: "/modulo/sam/configuracoes", category: "Administrativo", roles: ["admin"] },
]

export default function CadastrosPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [favorites, setFavorites] = useState<string[]>([])
  const [recentActions, setRecentActions] = useState<string[]>([])

  useEffect(() => {
    const f = localStorage.getItem("sam_menu_favorites")
    if (f) setFavorites(JSON.parse(f))
    const r = localStorage.getItem("sam_menu_recent")
    if (r) setRecentActions(JSON.parse(r))
  }, [])

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    const nf = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id]
    setFavorites(nf)
    localStorage.setItem("sam_menu_favorites", JSON.stringify(nf))
  }

  const handleItemClick = (id: string) => {
    const nr = [id, ...recentActions.filter(i => i !== id)].slice(0, 5)
    setRecentActions(nr)
    localStorage.setItem("sam_menu_recent", JSON.stringify(nr))
  }

  const filteredItems = menuItems.filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.description.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  )
  const categories = Array.from(new Set(filteredItems.map(i => i.category)))

  return (
    <>
      <div className="space-y-6 pb-10">
      <div className="space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/modulo/sam/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Cadastros</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-blue-700">Central de Cadastros</h1>
            <p className="text-muted-foreground mt-1">Acesso rápido a todas as funcionalidades.</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar funcionalidade..." className="pl-10 h-11 bg-background border-slate-300" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {favorites.length > 0 && !search && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-amber-500 font-medium"><Star className="h-5 w-5 fill-amber-500" /><h2>Favoritos</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {menuItems.filter(i => favorites.includes(i.id)).map(item => (
              <MenuCard key={item.id} item={item} isFavorite onToggleFavorite={toggleFavorite} onClick={() => handleItemClick(item.id)} />
            ))}
          </div>
        </section>
      )}

      {categories.length > 0 ? categories.map(category => (
        <section key={category} className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            {category === "Pedagógico" && <GraduationCap className="h-5 w-5 text-blue-600" />}
            {category === "Clínico" && <ActivityIcon className="h-5 w-5 text-emerald-600" />}
            {category === "Administrativo" && <Settings className="h-5 w-5 text-slate-600" />}
            <h2 className="text-xl font-semibold">{category}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.filter(i => i.category === category).map(item => (
              <MenuCard key={item.id} item={item} isFavorite={favorites.includes(item.id)} onToggleFavorite={toggleFavorite} onClick={() => handleItemClick(item.id)} />
            ))}
          </div>
        </section>
      )) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhuma funcionalidade encontrada para "{search}".</p>
          <Button variant="link" onClick={() => setSearch("")}>Limpar busca</Button>
        </div>
      )}

      {recentActions.length > 0 && !search && (
        <section className="pt-8 border-t">
          <div className="flex items-center gap-2 text-muted-foreground mb-4"><History className="h-4 w-4" /><h3 className="text-sm font-medium uppercase tracking-wider">Acessados Recentemente</h3></div>
          <div className="flex flex-wrap gap-2">
            {recentActions.map(id => {
              const item = menuItems.find(i => i.id === id)
              if (!item) return null
              return (
                <Link key={id} to={item.href} onClick={() => handleItemClick(id)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-sm transition-colors border">
                  <item.icon className="h-3 w-3" />{item.title}
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
    </>
  )
}

function MenuCard({ item, isFavorite, onToggleFavorite, onClick }: { item: MenuItem; isFavorite: boolean; onToggleFavorite: (id: string, e: React.MouseEvent) => void; onClick: () => void }) {
  const Icon = item.icon
  return (
    <Link to={item.href} onClick={onClick}>
      <Card className="h-full hover:shadow-md transition-all border-none ring-1 ring-slate-200 group relative overflow-hidden">
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div className={cn("p-2 rounded-lg transition-colors", item.category === "Pedagógico" ? "bg-blue-100 text-blue-700 group-hover:bg-blue-200" : item.category === "Clínico" ? "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200" : "bg-slate-100 text-slate-700 group-hover:bg-slate-200")}>
              <Icon className="h-6 w-6" />
            </div>
            <Button variant="ghost" size="icon" className={cn("h-8 w-8 transition-colors", isFavorite ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground/30 hover:text-amber-500")} onClick={(e) => onToggleFavorite(item.id, e)}>
              <Star className={cn("h-5 w-5", isFavorite && "fill-current")} />
            </Button>
          </div>
          <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors flex items-center gap-2">
            {item.title}
            <ArrowRight className="h-4 w-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function ActivityIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}


