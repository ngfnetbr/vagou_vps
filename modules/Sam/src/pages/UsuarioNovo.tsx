import { useState, useEffect } from "react"
import { Skeleton } from "@ui/skeleton"
import { getSpecialties } from "@sam/lib/actions/especialidades"
import { UserForm } from "@sam/components/users/user-form"

export default function UsuarioNovoPage() {
  const [specialties, setSpecialties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSpecialties().then(data => {
      setSpecialties(data || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="max-w-4xl mx-auto space-y-8 pb-10"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 w-full" /></div>

  return (
    <>
      <div className="space-y-6 pb-10">
        <UserForm specialties={specialties} />
      </div>
    </>
  )
}

