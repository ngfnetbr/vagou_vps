// @ts-nocheck
import { Link } from "react-router-dom"
import { Button } from "@ui/button"
import { Eye } from "lucide-react"
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@ui/alert-dialog"
import { Avatar, AvatarFallback } from "@ui/avatar"

interface StudentPreviewButtonProps {
  student: {
    id: string
    nome: string
    data_nascimento?: string | null
    cmei_atual_nome?: string | null
    turma_atual_nome?: string | null
    nome_responsavel?: string | null
    responsavel_telefone?: string | null
  }
  canViewProntuario: boolean
}

export function StudentPreviewButton({ student, canViewProntuario }: StudentPreviewButtonProps) {
  const initials = (student.nome || "").substring(0, 2).toUpperCase()
  const birthDate = student.data_nascimento ? new Date(student.data_nascimento) : null
  const birthLabel = birthDate ? birthDate.toLocaleDateString("pt-BR") : "Não informada"

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
          <Eye className="h-4 w-4" /><span className="sr-only">Pré-visualizar ficha</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ficha do aluno</AlertDialogTitle>
          <AlertDialogDescription>Visualize os dados básicos antes de acessar o prontuário completo.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-4 items-center mb-4">
          <Avatar className="h-12 w-12 border"><AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback></Avatar>
          <div className="space-y-1">
            <p className="font-semibold">{student.nome}</p>
            <p className="text-xs text-muted-foreground">Data de nascimento: {birthLabel}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm mb-2">
          <div><p className="text-xs text-muted-foreground uppercase font-semibold">Escola</p><p className="font-medium">{student.cmei_atual_nome || "-"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase font-semibold">Turma/Ano</p><p className="font-medium">{student.turma_atual_nome || "-"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase font-semibold">Responsável</p><p className="font-medium">{student.nome_responsavel || "-"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase font-semibold">Contato</p><p className="font-medium">{student.responsavel_telefone || "-"}</p></div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Fechar</AlertDialogCancel>
          {canViewProntuario ? (
            <Button asChild><Link to={`/modulo/sam/alunos/${student.id}/prontuario`}>Ver Prontuário</Link></Button>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <Button type="button" disabled>Ver Prontuário</Button>
              <p className="text-[11px] text-muted-foreground max-w-xs text-right">Você não tem permissão para acessar o prontuário completo deste aluno.</p>
            </div>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

