import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react"
import { Button } from "@ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ui/table"
import { Badge } from "@ui/badge"
import { Skeleton } from "@ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@ui/dialog"
import { Input } from "@ui/input"
import { Label } from "@ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select"
import { Switch } from "@ui/switch"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@ui/breadcrumb"
import { useToast } from "@root/hooks/use-toast"
import { supabase } from "@sam/integrations/supabase/client"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@ui/alert-dialog"

type SchoolClass = {
  id: string; name: string; school_id: string | null; school_name: string | null; active: boolean; created_at: string; source: string
}

export default function CadastroTurmasPage() {
  const { toast } = useToast()
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<SchoolClass | null>(null)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [schoolId, setSchoolId] = useState("")
  const [active, setActive] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const [{ data: classData }, { data: schoolData }] = await Promise.all([
      supabase.from('classes_unified' as any).select('*').order('name'),
      supabase.from('schools').select('id, name').eq('active', true).order('name')
    ])
    setClasses((classData || []) as any)
    setSchools(schoolData || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const resetForm = () => { setName(""); setSchoolId(""); setActive(true); setEditing(null) }

  const openEdit = (cls: SchoolClass) => {
    setEditing(cls); setName(cls.name); setSchoolId(cls.school_id || ""); setActive(cls.active); setFormOpen(true)
  }

  const handleSave = async () => {
    if (!name || !schoolId) {
      toast({ title: "Preencha nome e instituição", variant: "destructive" }); return
    }
    setSaving(true)
    const payload = { name, school_id: schoolId, active }
    const { error } = editing
      ? await supabase.from('school_classes').update(payload).eq('id', editing.id)
      : await supabase.from('school_classes').insert(payload)

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" })
    } else {
      toast({ title: editing ? "Turma atualizada" : "Turma criada" })
      setFormOpen(false); resetForm(); loadData()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const { error } = await supabase.from('school_classes').delete().eq('id', deleteId)
    if (error) toast({ title: "Erro ao excluir", variant: "destructive" })
    else { toast({ title: "Turma excluída" }); loadData() }
    setDeleteId(null)
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>

  return (
    <>
      <div className="space-y-6 pb-10">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/cadastros">Cadastros</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Turmas</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Turmas</h1>
          <p className="text-muted-foreground">Gerencie as turmas vinculadas às instituições.</p>
        </div>
        <Button onClick={() => { resetForm(); setFormOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Nova Turma
        </Button>
      </div>

      <Card className="border-none ring-1 ring-border shadow-sm">
        <CardHeader className="pb-4 border-b bg-muted/50">
          <div className="flex items-center gap-2 text-primary">
            <BookOpen className="h-5 w-5" />
            <CardTitle className="text-lg">Turmas Cadastradas</CardTitle>
          </div>
          <CardDescription>{classes.length} turma(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Turma</TableHead>
                <TableHead>Instituição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.length > 0 ? classes.map(cls => (
                <TableRow key={cls.id}>
                  <TableCell className="font-medium">{cls.name}</TableCell>
                  <TableCell>{cls.school_name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={cls.active ? "default" : "secondary"}>{cls.active ? "Ativa" : "Inativa"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {cls.source === 'local' ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cls)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(cls.id)}><Trash2 className="h-4 w-4" /></Button>
                      </>
                    ) : (
                      <Badge variant="outline" className="text-xs">Cache</Badge>
                    )}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Nenhuma turma cadastrada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={o => { setFormOpen(o); if (!o) resetForm() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Turma" : "Nova Turma"}</DialogTitle>
            <DialogDescription>Preencha os dados da turma.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome da Turma *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Maternal I" />
            </div>
            <div className="space-y-2">
              <Label>Instituição *</Label>
              <Select value={schoolId} onValueChange={setSchoolId}>
                <SelectTrigger><SelectValue placeholder="Selecione a instituição" /></SelectTrigger>
                <SelectContent>
                  {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={active} onCheckedChange={setActive} />
              <Label>Ativa</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => { setFormOpen(false); resetForm() }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir turma?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  )
}

