// @ts-nocheck
"use client"

import { useState, useEffect, useRef } from "react"
import { Spinner } from "@/components/common/Spinner";
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { Label } from "@ui/label"
import { Textarea } from "@ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@ui/card"
import { ArrowLeft, Save, User, School, FileText, AlertCircle, Trash2 } from "lucide-react"
import { createStudent, updateStudent, deleteStudent } from "@sam/lib/actions/alunos"
import { getSchoolClasses } from "@sam/lib/actions/escolas"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@ui/alert-dialog"

interface SchoolItem { id: string; name: string }
interface SchoolClass { id: string; name: string }

interface StudentFormProps {
  schools: SchoolItem[]
  student?: {
    id: string; full_name: string; birth_date: string | null; school_id: string | null;
    class_name: string | null; guardian_name: string | null; reason: string | null;
    observations: string | null; status: string
  }
  isEditing?: boolean
}

export function StudentForm({ schools, student, isEditing = false }: StudentFormProps) {
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [schoolId, setSchoolId] = useState(student?.school_id || "")
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [className, setClassName] = useState(student?.class_name || "")

  useEffect(() => {
    if (student?.school_id) {
      setLoadingClasses(true)
      getSchoolClasses(student.school_id).then(data => {
        setClasses(data)
        setLoadingClasses(false)
      })
    }
  }, [student?.school_id])

  const handleSchoolChange = async (value: string) => {
    setSchoolId(value)
    setClassName("")
    setLoadingClasses(true)
    const data = await getSchoolClasses(value)
    setClasses(data)
    setLoadingClasses(false)
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowSaveDialog(true)
  }

  const confirmSave = async () => {
    setShowSaveDialog(false)
    if (!formRef.current) return
    const formData = new FormData(formRef.current)
    
    setError(null)
    const birthDate = formData.get("birth_date") as string
    if (birthDate) {
      const selectedDate = new Date(birthDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate > today) {
        setError("A data de nascimento não pode ser futura.")
        return
      }
    }

    setIsPending(true)
    try {
      let result;
      if (isEditing && student) {
        result = await updateStudent(student.id, formData)
      } else {
        result = await createStudent(formData)
      }
      if (result?.error) {
        const msg = typeof result.error === "string" ? result.error : (result.error?.message ?? "Falha ao salvar dados do aluno")
        setError(msg)
      } else {
        navigate("/modulo/sam/alunos")
      }
    } finally {
      setIsPending(false)
    }
  }

  const handleDelete = async () => {
    if (!student?.id) return
    setIsPending(true)
    const result = await deleteStudent(student.id)
    if (result?.error) {
      const msg = typeof result.error === "string" ? result.error : (result.error?.message ?? "Falha ao excluir aluno")
      setError(msg)
      setShowDeleteDialog(false)
      setIsPending(false)
    } else {
      navigate("/modulo/sam/alunos")
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full shadow-sm" asChild>
            <Link to={isEditing && student ? `/modulo/sam/alunos/${student.id}` : "/modulo/sam/alunos"}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-primary">
              {isEditing ? "Editar Aluno" : "Cadastrar Novo Aluno"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEditing ? "Atualize as informações do aluno abaixo." : "Preencha os dados para registrar um novo aluno no sistema."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <>
              <span className="text-xs px-3 py-1 bg-muted rounded-full font-medium text-muted-foreground border mr-2">
                ID: {student?.id.slice(0, 8)}...
              </span>
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir aluno?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Essa ação não pode ser desfeita. O registro do aluno
                      <span className="font-semibold"> {student?.full_name} </span>
                      será permanentemente removido do sistema.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Sim, excluir aluno</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      <form ref={formRef} onSubmit={handleFormSubmit}>
        <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar operação</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja {isEditing ? "salvar as alterações" : "cadastrar este aluno"}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Revisar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmSave}>Confirmar e Salvar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="grid gap-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg flex items-start gap-3 shadow-sm">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{error}</div>
            </div>
          )}

          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-lg"><User className="h-5 w-5" /></div>
                <CardTitle className="text-lg font-semibold">Dados Pessoais</CardTitle>
              </div>
              <CardDescription>Informações básicas do aluno e responsável.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input id="full_name" name="full_name" placeholder="Ex: João da Silva" defaultValue={student?.full_name} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input id="birth_date" name="birth_date" type="date" defaultValue={student?.birth_date?.split('T')[0]} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardian_name">Nome do Responsável</Label>
                <Input id="guardian_name" name="guardian_name" placeholder="Ex: Maria da Silva (Mãe)" defaultValue={student?.guardian_name || ''} className="h-11" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-lg"><School className="h-5 w-5" /></div>
                <CardTitle className="text-lg font-semibold">Dados Escolares</CardTitle>
              </div>
              <CardDescription>Vínculo com a instituição de ensino.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="school_id">Escola *</Label>
                <Select name="school_id" value={schoolId} onValueChange={handleSchoolChange} required>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Selecione a escola..." /></SelectTrigger>
                  <SelectContent>{schools.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="class_name">Turma/Série *</Label>
                <Select name="class_name" value={className} onValueChange={setClassName} disabled={!schoolId || loadingClasses} required>
                  <SelectTrigger className="h-11">
                    <div className="flex items-center gap-2">
                      {loadingClasses && <Spinner className="h-4 w-4 animate-spin text-muted-foreground" />}
                      <SelectValue placeholder={!schoolId ? "Selecione a escola primeiro" : loadingClasses ? "Carregando turmas..." : "Selecione a turma..."} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (<SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>))}
                    {classes.length === 0 && !loadingClasses && schoolId && (
                      <div className="p-2 text-sm text-muted-foreground text-center">Nenhuma turma encontrada</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-lg"><FileText className="h-5 w-5" /></div>
                <CardTitle className="text-lg font-semibold">Detalhes do Atendimento</CardTitle>
              </div>
              <CardDescription>Motivo do encaminhamento e observações.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 grid gap-6">
              <div className="space-y-2">
                <Label htmlFor="status">Status Inicial</Label>
                <Select name="status" defaultValue={student?.status || "waiting"}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Selecione o status..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Em Acompanhamento</SelectItem>
                    <SelectItem value="waiting">Aguardando Avaliação</SelectItem>
                    <SelectItem value="finished">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo do Encaminhamento</Label>
                <Textarea id="reason" name="reason" placeholder="Descreva o motivo principal..." defaultValue={student?.reason || ''} className="min-h-[100px] resize-y" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observations">Outras Observações</Label>
                <Textarea id="observations" name="observations" placeholder="Informações adicionais relevantes..." defaultValue={student?.observations || ''} className="min-h-[80px] resize-y" />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 py-4 flex items-center justify-end gap-4 border-t">
              <Button variant="outline" type="button" className="h-11 px-6" asChild>
                <Link to="/modulo/sam/alunos">Cancelar</Link>
              </Button>
              <Button type="submit" className="h-11 px-6 font-semibold shadow-sm" disabled={isPending}>
                {isPending ? (<><Spinner className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) : (<><Save className="mr-2 h-4 w-4" />{isEditing ? "Salvar Alterações" : "Cadastrar Aluno"}</>)}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  )
}
