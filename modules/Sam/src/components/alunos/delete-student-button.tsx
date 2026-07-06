// @ts-nocheck
"use client"

import { useState } from "react"
import { Spinner } from "@/components/common/Spinner";
import { useNavigate } from "react-router-dom"
import { Button } from "@ui/button"
import { Trash2 } from "lucide-react"
import { deleteStudent } from "@sam/lib/actions/alunos"

interface DeleteStudentButtonProps {
  id: string
}

export function DeleteStudentButton({ id }: DeleteStudentButtonProps) {
  const [isPending, setIsPending] = useState(false)
  const navigate = useNavigate()

  async function handleDelete() {
    if (confirm("Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita.")) {
      setIsPending(true)
      const result = await deleteStudent(id)
      if (result?.success) {
        navigate("/modulo/sam/alunos")
      } else {
        alert(result?.error || "Erro ao excluir")
        setIsPending(false)
      }
    }
  }

  return (
    <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
      {isPending ? <Spinner className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
      {isPending ? "Excluindo..." : "Excluir Aluno"}
    </Button>
  )
}
