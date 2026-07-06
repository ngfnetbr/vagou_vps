// @ts-nocheck
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Skeleton } from "@ui/skeleton"
import { getUserById } from "@sam/lib/actions/usuarios"
import { getSpecialties } from "@sam/lib/actions/especialidades"
import { UserForm } from "@sam/components/users/user-form"

export default function UsuarioEditarPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [specialties, setSpecialties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([getUserById(id), getSpecialties()]).then(([u, s]) => {
      if (!u) { navigate("/modulo/sam/usuarios"); return }
      setUser(u)
      setSpecialties(s || [])
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="max-w-4xl mx-auto space-y-8 pb-10"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 w-full" /></div>

  return (
    <>
      <div className="space-y-6 pb-10">
        <UserForm initialData={user} isEditing={true} specialties={specialties} />
      </div>
    </>
  )
}

