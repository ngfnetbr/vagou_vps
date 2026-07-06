// @ts-nocheck
import { Link } from "react-router-dom"
import { useState } from "react"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@ui/dropdown-menu"
import { deleteUser } from "@sam/lib/actions/usuarios"

interface UserActionsProps { id: string }

export function UserActions({ id }: UserActionsProps) {
  const [isPending, setIsPending] = useState(false)

  async function handleDelete() {
    if (confirm("Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.")) {
      setIsPending(true)
      const result = await deleteUser(id)
      if (!result.success) {
        alert("Erro ao excluir: " + result.error)
        setIsPending(false)
      } else {
        window.location.reload()
      }
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" /><span className="sr-only">Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to={`/usuarios/${id}`} className="flex items-center cursor-pointer">
            <Pencil className="mr-2 h-4 w-4" />Editar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} disabled={isPending} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
          <Trash2 className="mr-2 h-4 w-4" />Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

